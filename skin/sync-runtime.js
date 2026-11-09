/* APEX_SYNC_RUNTIME_START */
/* Helfer aus dem ursprünglichen APEX-Sync, die der Rest der App weiter braucht (Start, Import, Merge). */
function strHash(s){let h=5381;for(let i=0;i<s.length;i++)h=(h*33^s.charCodeAt(i))>>>0;return h.toString(36)+':'+s.length}
function dedupeState(st){if(!st||!Array.isArray(st.gyms)||!Array.isArray(st.exercises))return 0;const sets=st.sets||[];let removed=0;
  const pick=(group,field)=>{const cnt={};sets.forEach(s=>cnt[s[field]]=(cnt[s[field]]||0)+1);return group.slice().sort((a,b)=>(cnt[b.id]||0)-(cnt[a.id]||0)||(a.id<b.id?-1:1))[0]};
  const collapse=(arr,keyf,field)=>{const groups=new Map();arr.forEach(x=>{const k=keyf(x);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)});const map={};const out=[];
    for(const g of groups.values()){if(g.length===1){out.push(g[0]);continue}const c=pick(g,field);for(const x of g)if(x!==c){map[x.id]=c.id;for(const[k,v]of Object.entries(x))if(c[k]==null||c[k]==='')c[k]=v}out.push(c);removed+=g.length-1}
    return{out:arr.filter(x=>out.includes(x)),map}};
  const norm=s=>String(s||'').trim().toLowerCase();
  const G=collapse(st.gyms,g=>norm(g.name),'gymId');const E=collapse(st.exercises,e=>norm(e.name)+'|'+norm(e.cat),'exerciseId');
  const gm=G.map,em=E.map;const anyMap=Object.keys(gm).length||Object.keys(em).length;
  if(anyMap){st.gyms=G.out;st.exercises=E.out;if(gm[st.currentGym])st.currentGym=gm[st.currentGym];
    const walk=o=>{if(Array.isArray(o)){o.forEach(walk);return}if(!o||typeof o!=='object')return;for(const k of Object.keys(o)){const v=o[k];
      if((k==='exId'||k==='exerciseId')&&typeof v==='string'&&em[v])o[k]=em[v];else if(k==='gymId'&&typeof v==='string'&&gm[v])o[k]=gm[v];else if(v&&typeof v==='object')walk(v)}};
    for(const k of Object.keys(st))if(k!=='gyms'&&k!=='exercises')walk(st[k]);
    if(st.stdOverride)for(const[k,v]of Object.entries(st.stdOverride))if(em[k]){if(st.stdOverride[em[k]]==null)st.stdOverride[em[k]]=v;delete st.stdOverride[k]}}
  // Maschinen: eine pro Gym + Übung (die mit den meisten Angaben)
  if(Array.isArray(st.machines)){const mm=new Map();for(const m of st.machines){const k=m.gymId+'|'+m.exerciseId;const o=mm.get(k);if(!o)mm.set(k,m);else{removed++;const score=x=>Object.values(x).filter(v=>v!=null&&v!=='').length;if(score(m)>score(o))mm.set(k,m)}}st.machines=[...mm.values()]}
  // Sätze: gleicher Tag, Übung, Gym, Gewicht, Wdh. UND gleicher Zeitstempel = derselbe Satz
  const seen=new Set();st.sets=sets.filter(s=>{const k=[s.date,s.exerciseId,s.gymId,s.weight,s.reps,s.rom??'',s.t].join('|');if(seen.has(k)){removed++;return false}seen.add(k);return true});
  if(Array.isArray(st.activities)){const sa=new Set();st.activities=st.activities.filter(a=>{if(!a.stravaId)return true;if(sa.has(a.stravaId)){removed++;return false}sa.add(a.stravaId);return true})}
  return removed}
function mergeStates(a,b){const o={...a};const tomb={...(b.tomb||{}),...(a.tomb||{})};o.tomb=tomb;for(const k of Object.keys(b)){if(k==='tomb')continue;const x=a[k],y=b[k];
    if(Array.isArray(x)&&Array.isArray(y)){const key=r=>r&&typeof r==='object'&&r.id?'#'+r.id:JSON.stringify(r);const ids=new Set(x.map(key));o[k]=[...x,...y.filter(r=>!ids.has(key(r)))].filter(r=>!(r&&r.id&&tomb[r.id]))}
    else if(x&&y&&typeof x==='object'&&typeof y==='object'&&!Array.isArray(x)){o[k]={...y,...x};if(['vitals','daily'].includes(k))for(const d of Object.keys(y)){const X=x[d]||{},Y=y[d];const r={...Y,...X};if(k==='daily'){if(X.times||Y.times)r.times={...(Y.times||{}),...(X.times||{})};if(X.checkins||Y.checkins){const seen=new Set();r.checkins=[...(X.checkins||[]),...(Y.checkins||[])].filter(c=>{const kk=c.t+'|'+c.note;if(seen.has(kk))return false;seen.add(kk);return true}).sort((a,b)=>a.t-b.t)}}o[k][d]=r}}
    else if(x==null)o[k]=y}
  o.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);return o}
const CL={db:null,status:'start',last:(()=>{try{return +localStorage.getItem('apx-cloud-last')||null}catch(_){return null}})(),err:null,dirty:false,busy:false,baseVersion:0,timer:null,channel:null,lastSaved:null,pullAgain:false};
const NOSYNC=new Set(['tokens']);
const AUTH_CONFIG_KEY='apex-supabase-config';
const LOCAL_USER_KEY='apex-sync-local-user';
const LEGACY_STATE_KEY='apex-sync-legacy-state';
const LEGACY_CLAIMED_KEY='apex-sync-legacy-claimed';
let activeLocalUserId=localStorage.getItem(LOCAL_USER_KEY)||null;
let authInitialized=false, startupDialogShown=false, authSessionQueue=Promise.resolve();
let accountMode='welcome';
let syncClient=null, syncUser=null, authSubscription=null, syncStartedFor=null;

function syncConfig(){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(AUTH_CONFIG_KEY)||'null')}catch(_){}
  return {...(window.APEX_SUPABASE_CONFIG||{}),...(saved||{})}
}
function isNativeSyncApp(){return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())}
function authRedirectUrl(){return isNativeSyncApp()?'de.lukasthouet.apexlift://auth/callback':location.href.split('#')[0]}
async function ownerMatches(user){
  if(!syncClient||!user?.id)return false;
  const {data,error}=await syncClient.rpc('is_legacy_owner');
  return !error&&data===true
}
function trackStorageKey(id,userId=syncUser?.id){return userId?'trk:'+userId+':'+id:'trk:'+id}
function clearTrackMemory(){try{for(const id of Object.keys(TRK||{}))delete TRK[id]}catch(_){}}
async function writeActiveState(state){
  S=state||blank();ID_CACHE=null;CC={};clearTrackMemory();ensureLibrary();
  await IDB.set('state',JSON.stringify(S));render()
}
async function cacheAccountState(userId){
  if(userId)await IDB.set('state:user:'+userId,JSON.stringify(S||blank()))
}
async function activateLocalAccount(user){
  const userId=user?.id;if(!userId)return;
  if(activeLocalUserId===userId)return;
  if(activeLocalUserId)await cacheAccountState(activeLocalUserId);
  else if(!localStorage.getItem(LEGACY_CLAIMED_KEY)){
    const legacy=await IDB.get(LEGACY_STATE_KEY);
    if(!legacy)await IDB.set(LEGACY_STATE_KEY,JSON.stringify(S||blank()));
  }
  let next=null;
  const saved=await IDB.get('state:user:'+userId);
  if(saved){try{next=JSON.parse(saved)}catch(_){}}
  const canImportLegacy=!next&&!localStorage.getItem(LEGACY_CLAIMED_KEY)&&await ownerMatches(user);
  if(canImportLegacy){
    const legacy=await IDB.get(LEGACY_STATE_KEY);
    if(legacy){try{next=JSON.parse(legacy);localStorage.setItem(LEGACY_CLAIMED_KEY,userId)}catch(_){}}
  }
  await writeActiveState(next||blank());
  activeLocalUserId=userId;localStorage.setItem(LOCAL_USER_KEY,userId)
}
async function clearLocalAccount(){
  if(activeLocalUserId)await cacheAccountState(activeLocalUserId);
  else if(!localStorage.getItem(LEGACY_CLAIMED_KEY)){
    const legacy=await IDB.get(LEGACY_STATE_KEY);
    if(!legacy)await IDB.set(LEGACY_STATE_KEY,JSON.stringify(S||blank()))
  }
  activeLocalUserId=null;localStorage.removeItem(LOCAL_USER_KEY);
  await writeActiveState(blank())
}
async function applyAuthSession(session){
  const nextUser=session?.user||null;
  const previousId=syncUser?.id||activeLocalUserId;
  if(previousId!==(nextUser?.id||null)){
    if(CL.channel&&syncClient){await syncClient.removeChannel(CL.channel);CL.channel=null}
    syncStartedFor=null;CL.baseVersion=0;CL.dirty=false;CL.lastSaved=null
  }
  if(nextUser)await activateLocalAccount(nextUser);else await clearLocalAccount();
  const justSignedIn=!!nextUser&&!syncUser;
  syncUser=nextUser;CL.db=syncUser?syncClient:null;authInitialized=true;syncUI();
  if(justSignedIn)closeAccountDialogAfterLogin();
  if(!syncUser){syncStartedFor=null;CL.status='login';return}
  if(syncStartedFor!==syncUser.id){syncStartedFor=syncUser.id;await initialSync()}
}
function queueAuthSession(session){
  authSessionQueue=authSessionQueue.then(()=>applyAuthSession(session)).catch(setSyncError);
  return authSessionQueue
}
function apxStampCloud(){try{localStorage.setItem('apx-cloud-last',String(CL.last))}catch(_){}}
// „heute 12:45“, „gestern 22:10“, sonst „Mo., 03.11. 22:10“
function apxWhen(t){if(!t)return'nie';const d=new Date(t);if(isNaN(d))return'–';const hm=d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});const day=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();const diff=Math.round((day(new Date())-day(d))/864e5);
  if(diff===0)return'heute '+hm;if(diff===1)return'gestern '+hm;return d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',...(d.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})})+' '+hm}
window.apxWhen=apxWhen;
function syncReady(){const c=syncConfig();return !!(c.url&&c.anonKey&&window.supabase&&window.supabase.createClient)}
function syncLabel(){
  if(!syncReady())return['Sync einrichten','warn'];
  if(!syncUser)return['Anmelden zum Synchronisieren','warn'];
  if(CL.status==='ok')return[`Synchronisiert${CL.last?' · '+apxWhen(CL.last):''}`,'ok'];
  if(CL.status==='fehler')return[`Sync fehlgeschlagen${CL.last?' · zuletzt ok '+apxWhen(CL.last):''}`,'bad'];
  if(CL.status==='offline')return[`Offline${CL.last?' · zuletzt '+apxWhen(CL.last):' · lokal gesichert'}`,'warn'];
  return[{start:'Prüfe Sync …',verbinde:'Verbinde …',speichert:'Synchronisiert …',lädt:'Lädt andere Geräte …','erstes Hochladen':'Erster Upload …'}[CL.status]||CL.status,'info'];
}
function syncUI(){
  const [label,color]=syncLabel();
  for(const id of ['syncState','syncState2']){const el=document.getElementById(id);if(el){el.className='pill '+color;el.textContent=label}}
  const b=document.getElementById('accountBtn');if(b){b.textContent=syncUser?(syncUser.email||'Konto'):'Konto';b.title=syncUser?'Konto und Synchronisierung':'Anmeldung und Synchronisierung'}
  renderAccountDialog();
}
function accountMarkup(){
  if(!document.getElementById('accountDialog')){
    const style=document.createElement('style');
    style.textContent='#accountDialog{width:min(440px,calc(100vw - 28px));max-height:88vh;overflow:auto;border:1px solid var(--line);border-radius:16px;background:var(--panel);color:var(--fg);padding:20px}#accountDialog::backdrop{background:rgba(0,0,0,.65);backdrop-filter:blur(3px)}#accountDialog .acct-stack{display:flex;flex-direction:column;gap:12px}#accountDialog .acct-actions{display:flex;gap:8px;flex-wrap:wrap}#accountDialog .acct-error{color:var(--bad);min-height:1.3em}#accountDialog .acct-hidden{display:none!important}#accountBtn{max-width:150px;overflow:hidden;text-overflow:ellipsis}';
    document.head.appendChild(style);
    const d=document.createElement('dialog');d.id='accountDialog';d.innerHTML=`<div class="acct-stack">
      <div class="row between"><h2 id="acctTitle">Apex Lift Konto</h2><button type="button" class="sm ghost" id="acctClose" aria-label="Schließen">✕</button></div>
      <p class="small mute" id="acctIntro">Deine Daten bleiben auf diesem Gerät und werden nach der Anmeldung mit deinen anderen Geräten abgeglichen.</p>
      <div id="acctSetup" class="acct-stack acct-hidden">
        <p class="small">Für die Cloud-Verbindung brauchst du die Supabase-Projekt-URL und den öffentlichen Publishable Key. Füge hier nur den öffentlichen Key ein, niemals den Service-Role-Key.</p>
        <label class="f">Projekt-URL<input id="acctUrl" type="url" placeholder="https://projekt.supabase.co" autocomplete="url"></label>
        <label class="f">Publishable Key<input id="acctKey" type="text" placeholder="sb_publishable_…" autocomplete="off"></label>
        <button type="button" class="primary" id="acctSaveConfig">Verbindung speichern</button>
      </div>
      <div id="acctSignup" class="acct-stack acct-hidden">
        <label class="f">E-Mail<input id="acctEmail" type="email" autocomplete="email"></label>
        <label class="f">Passwort<input id="acctPassword" type="password" autocomplete="new-password" minlength="8"></label>
        <div class="acct-stack"><button type="button" class="primary" id="acctGoogle">Mit Google fortfahren</button><button type="button" class="primary" id="acctSignUp">Konto erstellen</button><button type="button" id="acctSignIn">Ich habe schon ein Konto</button></div>
      </div>
      <div id="acctLogin" class="acct-stack acct-hidden">
        <label class="f">E-Mail<input id="acctLoginEmail" type="email" autocomplete="username"></label>
        <label class="f">Passwort<input id="acctLoginPassword" type="password" autocomplete="current-password"></label>
        <button type="button" class="primary" id="acctSignInSubmit">Anmelden</button>
        <button type="button" class="ghost" id="acctReset">Passwort zurücksetzen</button>
        <button type="button" class="ghost" id="acctLoginBack">Zurück zur Registrierung</button>
      </div>
      <div id="acctUser" class="acct-stack acct-hidden">
        <p class="small">Angemeldet als <strong id="acctUserEmail"></strong></p>
        <label class="f">Neue E-Mail<input id="acctNewEmail" type="email" autocomplete="email"></label>
        <button type="button" id="acctUpdateEmail">E-Mail ändern</button>
        <label class="f">Neues Passwort<input id="acctNewPassword" type="password" autocomplete="new-password" minlength="8"></label>
        <div class="acct-actions"><button type="button" id="acctUpdatePassword">Passwort ändern</button><button type="button" id="acctSignOut">Auf diesem Gerät abmelden</button><button type="button" class="ghost" id="acctSignOutAll">Auf allen Geräten abmelden</button></div>
        <button type="button" class="danger" id="acctDelete">Konto und Cloud-Daten löschen</button>
      </div>
      <p id="acctMessage" class="small acct-error" role="status" aria-live="polite"></p>
      <p class="small mute" id="acctSyncStatus"></p>
      <button type="button" class="ghost" id="acctDone">Fertig</button>
    </div>`;
    document.body.appendChild(d);
    const open=document.createElement('button');open.id='accountBtn';open.type='button';open.className='sm ghost';open.textContent='Konto';open.setAttribute('aria-haspopup','dialog');
    const undo=document.getElementById('undoBtn');if(undo&&undo.parentNode)undo.after(open);else document.querySelector('header.bar .wrap')?.appendChild(open);
    open.addEventListener('click',()=>{d.showModal();renderAccountDialog()});
    d.querySelectorAll('#acctClose,#acctDone').forEach(x=>x.addEventListener('click',()=>{if(syncUser)d.close()}));
    d.addEventListener('cancel',e=>{if(!syncUser)e.preventDefault()});
    d.addEventListener('click',e=>{if(e.target===d&&syncUser)d.close()});
    document.getElementById('acctSaveConfig').addEventListener('click',saveSyncConfig);
    document.getElementById('acctSignIn').addEventListener('click',()=>showAccountMode('login'));
    document.getElementById('acctSignInSubmit').addEventListener('click',signIn);
    document.getElementById('acctLoginBack').addEventListener('click',()=>showAccountMode('welcome'));
    document.getElementById('acctSignUp').addEventListener('click',signUp);
    document.getElementById('acctGoogle').addEventListener('click',signInWithGoogle);
    document.getElementById('acctReset').addEventListener('click',resetPassword);
    document.getElementById('acctSignOut').addEventListener('click',()=>signOut('local'));
    document.getElementById('acctSignOutAll').addEventListener('click',()=>signOut('global'));
    document.getElementById('acctUpdatePassword').addEventListener('click',updatePassword);
    document.getElementById('acctUpdateEmail').addEventListener('click',updateEmail);
    document.getElementById('acctDelete').addEventListener('click',deleteAccount);
  }
}
function setAccountMessage(message,error=false){const el=document.getElementById('acctMessage');if(el){el.textContent=message||'';el.style.color=error?'var(--bad)':''}}
function renderAccountDialog(){
  const d=document.getElementById('accountDialog');if(!d)return;
  const ready=syncReady();
  document.getElementById('acctSetup').classList.toggle('acct-hidden',ready);
  document.getElementById('acctSignup').classList.toggle('acct-hidden',!ready||!!syncUser||accountMode!=='welcome');
  document.getElementById('acctLogin').classList.toggle('acct-hidden',!ready||!!syncUser||accountMode!=='login');
  document.getElementById('acctUser').classList.toggle('acct-hidden',!ready||!syncUser);
  document.getElementById('acctIntro').textContent=ready
    ?(syncUser?'Dein Konto und der Sync-Status für deine Geräte.':'Melde dich an oder erstelle ein Konto. Deine lokalen Daten bleiben erhalten.')
    :'Die App braucht noch die Supabase-Projektverbindung. Dafür nur URL und öffentlichen Publishable Key verwenden.';
  const u=document.getElementById('acctUserEmail');if(u)u.textContent=syncUser?.email||'';
  const st=document.getElementById('acctSyncStatus');if(st)st.textContent=syncLabel()[0];
  const p=document.getElementById('acctPassword');if(p)p.autocomplete=syncUser?'new-password':'current-password';
  const config=syncConfig();const url=document.getElementById('acctUrl');const key=document.getElementById('acctKey');
  if(url&&!url.value)url.value=config.url||'';if(key&&!key.value)key.value=config.anonKey||'';
  const closeButtons=d.querySelectorAll('#acctClose,#acctDone');
  closeButtons.forEach(button=>button.classList.toggle('acct-hidden',!syncUser));
  if(authInitialized&&!startupDialogShown&&!syncUser&&!d.open){startupDialogShown=true;d.showModal()}
}
/* Nach erfolgreicher Anmeldung (Passwort, Google, Bestätigungs-Link) schließt das Konto-Fenster von selbst. */
function closeAccountDialogAfterLogin(){
  try{
    accountMode='welcome';
    for(const id of['acctPassword','acctLoginPassword'])try{const el=document.getElementById(id);if(el)el.value=''}catch(_){}
    const d=document.getElementById('accountDialog');
    if(d&&d.open)d.close();
    setAccountMessage('');
    try{const b=window.Capacitor?.Plugins?.Browser;if(b?.close)Promise.resolve(b.close()).catch(()=>{})}catch(_){}
  }catch(e){try{console.warn('Konto-Fenster konnte nicht geschlossen werden',e)}catch(_){}}
}
function saveSyncConfig(){
  const url=document.getElementById('acctUrl').value.trim().replace(/\/+$/,'');
  const anonKey=document.getElementById('acctKey').value.trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!anonKey){setAccountMessage('Bitte gültige Supabase-URL und Publishable Key eingeben.',true);return}
  try{localStorage.setItem(AUTH_CONFIG_KEY,JSON.stringify({url,anonKey}));location.reload()}catch(e){setAccountMessage('Einstellungen konnten nicht gespeichert werden: '+e.message,true)}
}
function accountInput(mode='signup'){const login=mode==='login';return{email:document.getElementById(login?'acctLoginEmail':'acctEmail').value.trim(),password:document.getElementById(login?'acctLoginPassword':'acctPassword').value}}
function showAccountMode(mode){accountMode=mode==='login'?'login':'welcome';setAccountMessage('');renderAccountDialog()}
function showAuthError(error){setAccountMessage(error?.message||String(error)||'Unbekannter Fehler',true)}
async function signIn(){setAccountMessage('');const {email,password}=accountInput('login');if(!syncClient||!email||!password){setAccountMessage('E-Mail und Passwort eingeben.',true);return}
  const {error}=await syncClient.auth.signInWithPassword({email,password});if(error)showAuthError(error);else setAccountMessage('Angemeldet. Sync wird vorbereitet.')}
async function signInWithGoogle(){
  setAccountMessage('');
  if(!syncClient){setAccountMessage('Die Supabase-Verbindung ist nicht bereit.',true);return}
  const {data,error}=await syncClient.auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirectUrl(),skipBrowserRedirect:true}});
  if(error){showAuthError(error);return}
  if(!data?.url){setAccountMessage('Google-Anmeldung konnte nicht gestartet werden.',true);return}
  if(isNativeSyncApp()){
    const browser=window.Capacitor?.Plugins?.Browser;
    if(!browser?.open){setAccountMessage('Der Android-Browser für die Google-Anmeldung ist nicht verfügbar.',true);return}
    try{await browser.open({url:data.url})}catch(e){showAuthError(e)}
  }else location.assign(data.url)
}
async function signUp(){setAccountMessage('');const {email,password}=accountInput();if(!syncClient||!email||password.length<8){setAccountMessage('E-Mail eingeben und ein Passwort mit mindestens 8 Zeichen wählen.',true);return}
  const {data,error}=await syncClient.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl()}});if(error){showAuthError(error);return}
  if(data.session)setAccountMessage('Konto erstellt. Deine Trainingsdaten werden abgeglichen.');
  else setAccountMessage('Konto erstellt. Bitte bestätige deine E-Mail; danach kannst du dich anmelden.')}
async function resetPassword(){setAccountMessage('');if(!syncClient){setAccountMessage('Die Supabase-Verbindung ist nicht bereit. Bitte Internet prüfen und die App neu öffnen.',true);return}const email=accountInput('login').email||accountInput('signup').email;if(!email){setAccountMessage('Zuerst deine E-Mail-Adresse eingeben.',true);return}
  const {error}=await syncClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()});if(error)showAuthError(error);else setAccountMessage('Wenn das Konto existiert, erhältst du eine E-Mail zum Zurücksetzen des Passworts.')}
async function updatePassword(){setAccountMessage('');if(!syncClient){setAccountMessage('Die Supabase-Verbindung ist nicht bereit. Bitte Internet prüfen und die App neu öffnen.',true);return}const password=document.getElementById('acctNewPassword').value;if(password.length<8){setAccountMessage('Das neue Passwort muss mindestens 8 Zeichen haben.',true);return}
  const {error}=await syncClient.auth.updateUser({password});if(error)showAuthError(error);else{document.getElementById('acctNewPassword').value='';setAccountMessage('Passwort aktualisiert.')}}
async function updateEmail(){setAccountMessage('');if(!syncClient){setAccountMessage('Die Supabase-Verbindung ist nicht bereit. Bitte Internet prüfen und die App neu öffnen.',true);return}const email=document.getElementById('acctNewEmail').value.trim();if(!email){setAccountMessage('Neue E-Mail-Adresse eingeben.',true);return}
  const {error}=await syncClient.auth.updateUser({email});if(error)showAuthError(error);else{document.getElementById('acctNewEmail').value='';setAccountMessage('Bitte bestätige die Änderung über den Link in deiner E-Mail.')}}
async function signOut(scope){if(!syncClient)return;const {error}=await syncClient.auth.signOut({scope});if(error)showAuthError(error);else setAccountMessage(scope==='global'?'Auf allen Geräten abgemeldet.':'Abgemeldet.')}
async function deleteAccount(){
  if(!syncClient||!syncUser)return;
  if(!confirm('Konto und alle synchronisierten Trainingsdaten dauerhaft löschen? Lokale Daten auf anderen Geräten bleiben dort bis zur Abmeldung gespeichert.'))return;
  setAccountMessage('Konto wird gelöscht …');
  const {error}=await syncClient.functions.invoke('delete-account');
  if(error){showAuthError(error);return}
  await syncClient.auth.signOut({scope:'local'});syncUser=null;CL.db=null;CL.baseVersion=0;CL.status='start';syncUI();setAccountMessage('Konto und Cloud-Daten wurden gelöscht.')
}
async function localSnapshot(){const copy=JSON.parse(JSON.stringify(S||{}));delete copy.tokens;return copy}
const handledAuthUrls=new Set();
async function handleAuthRedirect(url){
  try{
    if(!url||handledAuthUrls.has(url))return;   // ein Code gilt nur einmal (Launch-URL und appUrlOpen liefern dieselbe Adresse)
    handledAuthUrls.add(url);
    if(!syncClient)await cloudInit();
    const callback=new URL(url);
    const error=callback.searchParams.get('error_description')||callback.searchParams.get('error');
    if(error)throw new Error(decodeURIComponent(error.replace(/\+/g,' ')));
    const code=callback.searchParams.get('code');
    if(code){const result=await syncClient.auth.exchangeCodeForSession(code);if(result.error)throw result.error}
    else{
      const hash=new URLSearchParams(callback.hash.replace(/^#/,''));
      const access_token=hash.get('access_token'),refresh_token=hash.get('refresh_token');
      if(access_token&&refresh_token){const result=await syncClient.auth.setSession({access_token,refresh_token});if(result.error)throw result.error}
    }
    const browser=window.Capacitor?.Plugins?.Browser;if(browser?.close)try{await browser.close()}catch(_){}
  }catch(e){
    const d=document.getElementById('accountDialog');if(d&&!d.open&&!syncUser)try{d.showModal()}catch(_){}
    showAuthError(e)
  }
}
window.ApexLiftAuth={handleRedirect:handleAuthRedirect,backToWelcome:()=>{if(accountMode==='login'){showAccountMode('welcome');return true}return false},get requiresAccount(){return authInitialized&&!syncUser}};
async function saveMergedState(remoteState,remoteVersion){
  const local=S;const localTokens=local.tokens;
  let next={...blank(),...(remoteState||{}),body:{...blank().body,...((remoteState||{}).body||{})}};
  next=(local.updatedAt||0)>=(next.updatedAt||0)?mergeStates(local,next):mergeStates(next,local);
  for(const k of NOSYNC)next[k]=local[k];
  const removed=dedupeState(next);
  S=next;ID_CACHE=null;try{trackDeletes()}catch(_){}
  if(selfHeal())CL.dirty=true;if(gfGymFix())CL.dirty=true;if(musMigrate()+gfBwFix()+romMigrate())CL.dirty=true;
  ensureLibrary();CC={};CL.baseVersion=remoteVersion;CL.fresh=false;
  const merged=await localSnapshot();CL.lastSaved=stateJSON();await IDB.set('state',JSON.stringify(S));render();
  const stableJSON=value=>JSON.stringify(value,(key,val)=>val&&typeof val==='object'&&!Array.isArray(val)?Object.keys(val).sort().reduce((o,k)=>(o[k]=val[k],o),{}):val);
  const expected=stableJSON(remoteState||{});
  const canonical=stableJSON(merged);
  if(removed||canonical!==expected){CL.dirty=true;syncSoon()}else{CL.dirty=false;CL.status='ok';CL.last=Date.now();apxStampCloud();syncUI()}
}
async function getRemoteDocument(){
  const {data,error}=await syncClient.rpc('get_sync_document');
  if(error)throw error;return data||{state:null,version:0};
}
async function cloudInit(){
  accountMarkup();
  if(!syncReady()){CL.status='einrichtung';authInitialized=true;syncUI();return}
  if(!syncClient){const c=syncConfig();syncClient=window.supabase.createClient(c.url,c.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}})}
  if(!authSubscription){
    const {data}=syncClient.auth.onAuthStateChange((_event,session)=>queueAuthSession(session));
    authSubscription=data.subscription;
  }
  const {data,error}=await syncClient.auth.getSession();
  if(error){await queueAuthSession(null);showAuthError(error);return}
  await queueAuthSession(data.session)
}
async function initialSync(){
  if(!syncUser||!syncClient)return;
  CL.status='verbinde';syncUI();await localBackup('vor-cloud-abgleich');
  const remote=await getRemoteDocument();
  if(!remote.state){
    CL.baseVersion=Number(remote.version)||0;CL.status='erstes Hochladen';CL.dirty=true;await cloudPush();
  }else await saveMergedState(remote.state,Number(remote.version)||0);
  await syncExistingTracks();
  if(CL.channel){await syncClient.removeChannel(CL.channel);CL.channel=null}
  CL.channel=syncClient.channel('apex-sync-'+syncUser.id)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'sync_documents',filter:'user_id=eq.'+syncUser.id},()=>cloudPull())
    .subscribe();
  syncUI();
}
function syncSoon(){if(!syncUser||!syncClient)return;CL.dirty=true;clearTimeout(CL.timer);CL.timer=setTimeout(()=>cloudPush(),1800)}
function setSyncError(error){CL.status=navigator.onLine?'fehler':'offline';CL.err=error?.message||String(error);syncUI();if(navigator.onLine)setTimeout(()=>{if(CL.dirty)cloudPush()},15000)}
async function cloudPush(){
  if(!syncUser||!syncClient||CL.busy||!CL.dirty)return;
  CL.busy=true;CL.status='speichert';syncUI();
  try{
    const snapshot=await localSnapshot();
    const {data,error}=await syncClient.rpc('push_sync_document',{p_state:snapshot,p_base_version:CL.baseVersion,p_mutation_id:crypto.randomUUID()});
    if(error)throw error;
    if(data?.status==='conflict'){
      CL.busy=false;await localBackup('vor-cloud-konflikt');
      await saveMergedState(data.state,Number(data.version)||0);
      if(CL.dirty)syncSoon();return;
    }
    if(data?.status!=='applied')throw new Error('Unerwartete Antwort vom Sync-Server');
    CL.baseVersion=Number(data.version)||CL.baseVersion+1;
    const current=await localSnapshot();
    CL.dirty=JSON.stringify(current)!==JSON.stringify(snapshot);
    CL.status='ok';CL.last=Date.now();CL.err=null;apxStampCloud();
    if(CL.dirty)syncSoon();
  }catch(e){setSyncError(e)}
  finally{CL.busy=false;syncUI();if(CL.pullAgain){CL.pullAgain=false;cloudPull()}}
}
async function cloudPull(){
  if(!syncUser||!syncClient)return;
  if(CL.busy){CL.pullAgain=true;return}
  CL.busy=true;
  try{
    const remote=await getRemoteDocument();const version=Number(remote.version)||0;
    if(remote.state&&version>CL.baseVersion){
      await localBackup('vor-cloud-abgleich');await saveMergedState(remote.state,version);
    }
  }catch(e){setSyncError(e)}
  finally{CL.busy=false;syncUI();if(CL.pullAgain){CL.pullAgain=false;cloudPull()}else if(CL.dirty)syncSoon()}
}
function syncRealtimeRefresh(){if(syncUser&&CL.dirty)syncSoon();else if(syncUser)cloudPull()}
window.addEventListener('online',syncRealtimeRefresh);
window.addEventListener('focus',syncRealtimeRefresh);
setInterval(()=>{if(syncUser&&document.visibilityState==='visible')cloudPull()},30000);

async function syncExistingTracks(){
  if(!CL.db||!S.tracks)return;
  let changed=false;
  for(const id of Object.keys(S.tracks)){
    let raw=await IDB.get(trackStorageKey(id));
    if(!raw&&await ownerMatches(syncUser))raw=await IDB.get('trk:'+id);
    if(!raw)continue;
    if(raw)await IDB.set(trackStorageKey(id),raw);
    let points;try{points=JSON.parse(raw)}catch(_){continue}
    const {error}=await CL.db.rpc('put_sync_track',{p_track_id:id,p_content:points});
    if(error)throw error;
    if(S.tracks[id]&&!S.tracks[id].parts){S.tracks[id].parts=1;changed=true}
  }
  if(changed){CL.lastSaved=null;save()}
}
trkStore=async function(id,points){
  const json=JSON.stringify(points);TRK[id]=points;await IDB.set(trackStorageKey(id),json);
  if(!CL.db)return 0;
  const {error}=await CL.db.rpc('put_sync_track',{p_track_id:id,p_content:points});
  if(error){setSyncError(error);return 0}return 1
};
trkLoad=async function(id){
  if(TRK[id])return TRK[id];
  let raw=await IDB.get(trackStorageKey(id));
  if(!raw&&syncUser&&await ownerMatches(syncUser))raw=await IDB.get('trk:'+id);
  if(raw){try{const points=JSON.parse(raw);await IDB.set(trackStorageKey(id),raw);return TRK[id]=points}catch(_){}}
  const meta=S.tracks&&S.tracks[id];
  if(CL.db&&meta&&meta.parts){
    try{const {data,error}=await CL.db.rpc('get_sync_track',{p_track_id:id});if(error||!data)return null;
      await IDB.set(trackStorageKey(id),JSON.stringify(data));return TRK[id]=data
    }catch(_){return null}
  }
  return null
};
restoreCloudBackup=async function(){toast('Für ältere lokale Stände nutze bitte die Sicherungskopien auf diesem Gerät.')};

accountMarkup();
/* APEX_SYNC_RUNTIME_END */