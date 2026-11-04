/* APEX Lift · Cloud-Erweiterungen (nur mit Supabase-Konto):
   1) Kalender-Abo-Feed für Google Kalender (Fitness-Tests, Trainingsplan, Laufplan)
   2) Google Health: eine einzige Synchronisation unter Mehr → Sync (ersetzt Kopfzeilen-Knopf + Client-ID-Variante) */
(function(){
'use strict';
if(window.__apexCloud)return;window.__apexCloud=1;
const cfg=window.APEX_SUPABASE_CONFIG||{};
if(!window.supabase||!cfg.url||!cfg.anonKey)return;
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'')}};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const cloud=()=>{try{return typeof syncClient!=='undefined'&&syncClient&&typeof syncUser!=='undefined'&&syncUser?{c:syncClient,u:syncUser}:null}catch(_){return null}};
const FEED_BASE=cfg.url.replace(/\/+$/,'')+'/functions/v1/calendar-feed';

/* =============================================================== 1. Kalender-Feed */
const CF={busy:false,msg:'',timer:null};
const randToken=()=>{const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(b=>b.toString(16).padStart(2,'0')).join('')};
function icsText(){
  let ics=buildIcs();const t=today();const cut=addDays(t,-120).replace(/-/g,'');
  // Alte "Training erledigt"-Einträge weglassen, Kopfzeilen für Google ergänzen
  ics=ics.replace(/BEGIN:VEVENT\r\n(?:(?!END:VEVENT)[\s\S])*?UID:apexlift-done-(\d{8})@local[\s\S]*?END:VEVENT\r\n?/g,(m,d)=>d<cut?'':m);
  ics=ics.replace('CALSCALE:GREGORIAN','CALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:APEX Lift\r\nX-WR-TIMEZONE:Europe/Berlin\r\nREFRESH-INTERVAL;VALUE=DURATION:PT1H\r\nX-PUBLISHED-TTL:PT1H');
  return ics}
async function feedRow(){const k=cloud();if(!k)return null;const {data,error}=await k.c.from('calendar_feeds').select('token,updated_at').eq('user_id',k.u.id).maybeSingle();if(error)throw error;return data}
async function pushFeed(force){
  const k=cloud();if(!k||!(S.calFeed&&S.calFeed.on))return;
  try{
    const ics=icsText();const sig=ics.length+':'+ics.replace(/DTSTAMP:\d+T\d+Z/g,'').length;
    if(!force&&S.calFeed.sig===sig)return;
    let token=S.calFeed.token;if(!token||token.length<32){token=randToken();S.calFeed.token=token}
    const {error}=await k.c.from('calendar_feeds').upsert({user_id:k.u.id,token,ics,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(error)throw error;S.calFeed.sig=sig;S.calFeed.at=Date.now();S.calFeed.err=null;try{save()}catch(_){}
  }catch(e){S.calFeed.err=String(e.message||e);warn(e,'calendar feed')}
}
function pushSoon(){clearTimeout(CF.timer);CF.timer=setTimeout(()=>pushFeed(false),4000)}
function feedUrl(){return S.calFeed&&S.calFeed.token?FEED_BASE+'?t='+S.calFeed.token:''}
function calPanel(){
  const k=cloud();const F=S.calFeed||{};const url=feedUrl();
  if(!k)return`<section class="panel" id="calFeed"><h2>Google Kalender abonnieren</h2><p class="small mute">Melde dich an (Konto oben), dann kannst du Fitness-Tests, Trainingsplan und Laufplan automatisch in Google Kalender anzeigen lassen.</p></section>`;
  const gcal=url?'https://calendar.google.com/calendar/r?cid='+encodeURIComponent(url.replace(/^https:/,'webcal:')):'';
  return`<section class="panel" id="calFeed"><div class="row between"><h2>Google Kalender abonnieren</h2><span class="pill ${F.on?(F.err?'bad':'ok'):'mute'}">${F.on?(F.err?'Fehler':'aktiv'):'aus'}</span></div>
   <p class="small mute">Dein Fitness-Test-Termin, der Trainingsplan der nächsten 4 Wochen und geplante Läufe erscheinen als eigener Kalender „APEX Lift“. Die App aktualisiert den Feed nach jeder Änderung; Google holt ihn selbst ab (meist alle paar Stunden, bis zu 24 h). Die Richtung ist App → Google.</p>
   ${F.on?`<label class="f">Dein privater Feed-Link<input id="calFeedUrl" readonly value="${Esc(url)}" onclick="this.select()"></label>
    <div class="row"><a class="sm primary" style="text-decoration:none;padding:8px 12px;border-radius:8px" href="${Esc(gcal)}" target="_blank" rel="noopener">Zu Google Kalender hinzufügen</a><button class="sm" data-cf="copy">Link kopieren</button><button class="sm" data-cf="push">Jetzt aktualisieren</button></div>
    <p class="small mute">${F.at?'Zuletzt hochgeladen: '+new Date(F.at).toLocaleString('de-DE'):'Noch nicht hochgeladen'}${F.err?' · Fehler: '+Esc(F.err):''}. Der Link ist geheim: Wer ihn kennt, sieht diese Termine. „Link erneuern“ macht den alten ungültig.</p>
    <div class="row"><button class="sm ghost" data-cf="rotate">Link erneuern</button><button class="sm ghost" data-cf="off">Abo beenden</button></div>`
   :`<div class="row"><button class="primary" data-cf="on" ${CF.busy?'disabled':''}>Kalender-Abo einschalten</button></div>`}
   <p class="small" id="cfMsg">${Esc(CF.msg)}</p></section>`}
document.addEventListener('click',async(ev)=>{
  const b=ev.target.closest&&ev.target.closest('[data-cf]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  const k=cloud();if(!k){toast('Bitte zuerst anmelden');return}
  S.calFeed=S.calFeed||{};const a=b.dataset.cf;
  try{
    if(a==='on'){CF.busy=true;S.calFeed={on:true,token:randToken()};await pushFeed(true);CF.busy=false;CF.msg='Feed ist aktiv.';save();render();return}
    if(a==='push'){await pushFeed(true);CF.msg=S.calFeed.err?'Fehler beim Hochladen':'Aktualisiert.';render();return}
    if(a==='copy'){try{await navigator.clipboard.writeText(feedUrl());toast('Link kopiert')}catch(_){const i=document.getElementById('calFeedUrl');if(i){i.select();toast('Markiert – jetzt kopieren')}}return}
    if(a==='rotate'){if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Wirklich? Altes Abo hört auf';return}S.calFeed.token=randToken();await pushFeed(true);CF.msg='Neuer Link erzeugt. In Google Kalender neu hinzufügen.';render();return}
    if(a==='off'){if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Wirklich beenden?';return}
      await k.c.from('calendar_feeds').delete().eq('user_id',k.u.id);S.calFeed={on:false};save();CF.msg='Abo beendet. In Google Kalender den Kalender „APEX Lift“ entfernen.';render();return}
  }catch(e){CF.busy=false;CF.msg='Fehler: '+(e.message||e);warn(e,'cal feed click');try{render()}catch(_){}}
},true);

/* =============================================================== 2. Google Health (einheitlich) */
// Ablauf: Server holt Daten von Google (Edge Function „google-health“, auch alle 15 min per Zeitplan)
// → App übernimmt ALLE gespeicherten Werte über die RPC gh_export (Schlaf inkl. Phasen, HRV, Ruhepuls,
// Atemfrequenz, SpO₂, Schritte, Aktivzonen-Minuten, Sitzzeit, Gewicht, Körperfett, Trainings).
const GH={busy:false,msg:'',connected:null,status:null,last:null,pulledAt:null,pullMsg:'',err:null};
const fnUrl=cfg.url.replace(/\/+$/,'')+'/functions/v1/google-health';
const when=(t)=>{try{return apxWhen(t)}catch(_){return t?new Date(t).toLocaleString('de-DE'):'nie'}};
const full=(t)=>t?new Date(t).toLocaleString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+' Uhr':'noch nie';
async function ghInvoke(action){
  const k=cloud();if(!k)throw new Error('Bitte zuerst bei Apex Lift anmelden.');
  const {data:{session}}=await k.c.auth.getSession();if(!session)throw new Error('Bitte zuerst bei Apex Lift anmelden.');
  const r=await fetch(fnUrl,{method:'POST',headers:{apikey:cfg.anonKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Google-Health-Anfrage fehlgeschlagen ('+r.status+').');return j}

/* Daten aus Supabase in die App übernehmen */
const EXTRA=['km','activeKcal','floors','vo2'];const SUMS=['steps','azm','sedMin','km','activeKcal','floors'];
async function ghPull(fullPull){
  const k=cloud();if(!k)return null;
  const since=!fullPull&&S.ghPull&&S.ghPull.at?addDays(S.ghPull.at.slice(0,10),-7):null;
  const {data:D,error}=await k.c.rpc('gh_export',{p_since:since});if(error)throw new Error(error.message||String(error));
  if(!D||!D.vitals)return null;
  const V=D.vitals;const days=Object.keys(V).sort();const t=today();
  // Summenwerte des ersten (angeschnittenen) Tages und des laufenden Tages nicht als Tagessumme übernehmen
  for(const key of SUMS){const first=days.find(d=>V[d][key]!=null);if(first&&(!since||first<since))delete V[first][key]}
  // Schlafphasen → Hypnogramm
  let stages=0;try{const st=(typeof SLEEPST!=='undefined'&&SLEEPST)||await sleepStages()||{};for(const d of days){const x=V[d]._st;if(x&&x.st&&x.st.length){st[d]={bed:V[d].bed,bedMin:x.bedMin,len:x.len,st:x.st};stages++}delete V[d]._st}
    if(stages){try{SLEEPST=st}catch(_){}await IDB.set('sleepStages',JSON.stringify(st))}}catch(e){warn(e,'gh stages')}
  const before=JSON.stringify(S.vitals||{}).length;
  const m=(typeof ghMerge==='function')?ghMerge(D):{v:0,w:0,a:0,s:0};
  // Werte, die der Takeout-Import nicht kennt, direkt ergänzen
  let extra=0;for(const d of days){const x=V[d];const T=S.vitals[d]||(S.vitals[d]={});for(const key of EXTRA){if(x[key]==null||(key!=='vo2'&&d===t))continue;if(T[key]!==x[key]){T[key]=x[key];extra++}}if(!T.source&&Object.keys(T).length)T.source='Google Health'}
  S.ghPull={at:new Date().toISOString(),days:days.length,counts:D.counts||{},res:m};
  S.lastSync=S.lastSync||{};S.lastSync.gh=t;(S.lastSyncAt=S.lastSyncAt||{}).gh=Date.now();
  const n=m.v+m.w+m.a+m.s;
  GH.pullMsg=`In die App übernommen: ${m.v} Tage Vitalwerte${stages?` (${stages} Nächte mit Schlafphasen)`:''}, ${m.w} Gewichts-/Fettwerte, ${m.a} Aktivitäten, ${m.s} Schwimmeinheiten`;
  if(n||extra||stages)commit(n?'Google Health: '+GH.pullMsg.replace('In die App übernommen: ',''):null);else{try{save()}catch(_){}}
  return m}
async function ghStatus(){
  try{const d=await ghInvoke('status');GH.status=d;GH.connected=!!d.connected;GH.last=d.connection&&d.connection.last_synced_at||null;GH.err=d.connection&&d.connection.last_error||null}
  catch(e){GH.connected=GH.connected??null;GH.err=e.message||String(e)}
  ghPaint()}
async function ghSyncNow(auto,fullPull){
  if(GH.busy)return;GH.busy=true;GH.err=null;
  try{
    if(!GH.connected){await ghStatus();if(!GH.connected){if(auto){GH.busy=false;return}const s=await ghInvoke('connect');GH.msg='Google Health wird geöffnet …';ghPaint();const br=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Browser;if(br&&br.open)await br.open({url:s.url});else location.assign(s.url);GH.busy=false;return}}
    GH.msg=auto?'Synchronisiere im Hintergrund …':'Hole neue Daten von Google …';ghPaint();
    let r=null,round=0,stored=0,errs=[];
    try{do{r=await ghInvoke('sync');round++;stored+=r.stored||0;errs=r.errors||[];GH.msg=`Google → Server: ${stored} Werte · ${r.completed}/${r.total} Datentypen vollständig`;ghPaint()}while(!r.done&&round<(auto?2:6))}
    catch(e){GH.err=e.message||String(e)} // auch bei Fehlern: bereits gespeicherte Daten übernehmen
    GH.msg=(GH.msg||'')+' · übernehme in die App …';ghPaint();
    await ghPull(fullPull);
    await ghStatus();
    GH.msg=(r?`Google → Server: ${stored} Werte${r.done?'':` · Erstimport läuft noch (${r.completed}/${r.total})`}${errs.length?` · ${errs.length} Datentyp(en) mit Fehler`:''}`:'Server nicht erreichbar')+(GH.pullMsg?' · '+GH.pullMsg:'');
  }catch(e){GH.err=e.message||String(e);warn(e,'gh sync')}
  GH.busy=false;ghPaint();try{if(typeof tab!=='undefined'&&tab==='sync')render()}catch(_){}}
async function ghDisconnect(){
  if(GH.busy||!confirm('Google Health trennen und importierte Gesundheitsdaten aus Supabase löschen? Bereits in die App übernommene Werte bleiben erhalten.'))return;GH.busy=true;GH.msg='Verbindung wird getrennt …';ghPaint();
  try{await ghInvoke('disconnect');GH.connected=false;GH.last=null;GH.status=null;GH.msg='Google Health getrennt und Serverdaten gelöscht.'}catch(e){GH.err=e.message||String(e)}
  GH.busy=false;try{render()}catch(_){}}
function ghPill(p){p.className='pill '+(GH.busy?'info':GH.err&&GH.connected?'bad':GH.connected?'ok':'warn');
  p.textContent=GH.busy?'synchronisiert …':GH.connected?(GH.last?'zuletzt '+when(GH.last):'verbunden · noch kein Abgleich'):(GH.connected===false?'nicht verbunden':'prüfe …')}
function ghStateHtml(){
  const st=GH.status||{};const c=st.connection||{};const pr=st.progress||{};const P=S.ghPull||{};
  const errTypes=(st.types||[]).filter(x=>x.last_error);
  return`<div class="apx-kv">
    <div><span>Google → Server</span><b>${Esc(full(GH.last))}</b></div>
    <div><span>Server → App</span><b>${Esc(full(P.at))}</b></div>
    <div><span>Letzter Versuch</span><b>${Esc(full(c.last_attempt_at))}</b></div>
    <div><span>Erstimport</span><b>${pr.total?`${pr.done} / ${pr.total} Datentypen`:'–'}</b></div>
   </div>
   ${GH.err?`<p class="small" style="color:var(--bad)">Fehler: ${Esc(GH.err)}</p>`:''}
   ${errTypes.length?`<details><summary class="small">${errTypes.length} Datentyp(en) mit Hinweis</summary><div>${errTypes.map(x=>`<div class="small mute"><b>${Esc(x.data_type)}</b>: ${Esc(x.last_error)}</div>`).join('')}</div></details>`:''}`}
function ghPaint(){const el=document.getElementById('ghxMsg');if(el)el.textContent=GH.msg||'';const p=document.getElementById('ghxPill');if(p)ghPill(p);const s=document.getElementById('ghxState');if(s)s.innerHTML=ghStateHtml();
  const b=document.querySelector('[data-ghx="sync"]');if(b){b.disabled=GH.busy;b.textContent=GH.busy?'Läuft …':GH.connected===false?'Mit Google Health verbinden':'Jetzt synchronisieren'}}
function ghPanelMerged(){
  const sv=Object.keys(S.vitals||{}).length;const P=S.ghPull||{};
  return`<section class="panel" id="ghaPanel" data-nofold="1"><div class="row between"><h2>Google Health · Sync</h2><span id="ghxPill" class="pill warn">prüfe …</span></div>
   <p class="small mute">Schlaf mit Phasen, HRV, Ruhepuls, Atemfrequenz, SpO₂, Schritte, Aktivzonen-Minuten, Sitzzeit, Gewicht, Körperfett und Trainings aus Google Health (Fitbit Air, Handy, Wear OS). Der Server holt die Daten alle 15 Minuten, die App übernimmt sie beim Öffnen automatisch.</p>
   <div id="ghxState">${ghStateHtml()}</div>
   <div class="row"><button class="primary" data-ghx="sync" ${GH.busy?'disabled':''}>${GH.connected===false?'Mit Google Health verbinden':'Jetzt synchronisieren'}</button><button data-ghx="full" ${GH.busy?'disabled':''}>Alles neu übernehmen</button><button data-tab="hbrowse">Daten-Browser</button>${GH.connected?'<button class="ghost" data-ghx="off">Trennen</button>':''}</div>
   <p class="small" id="ghxMsg" role="status">${Esc(GH.msg||'')}</p>
   <p class="small mute">${sv?sv+' Tage mit Vitalwerten in der App. ':''}${P.counts?Object.values(P.counts).reduce((a,b)=>a+b,0).toLocaleString('de-DE')+' Datenpunkte auf dem Server. ':''}Takeout-ZIP und Fitbit-Export funktionieren weiter über das Feld darunter.</p></section>`}
function wrapGha(){
  try{window.__noAutoSync=true}catch(_){}
  const orig=typeof ghaPanel==='function'?ghaPanel:null;if(!orig||orig.__apx)return;
  const w=function(){try{return ghPanelMerged()}catch(e){warn(e,'ghPanelMerged');return orig.apply(this,arguments)}};w.__apx=1;
  try{window.ghaPanel=w}catch(_){}try{(0,eval)('ghaPanel=window.ghaPanel')}catch(_){}
  setTimeout(ghPaint,0)}
document.addEventListener('click',(ev)=>{
  const b=ev.target.closest&&ev.target.closest('[data-ghx]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  if(b.dataset.ghx==='sync')ghSyncNow(false,false);else if(b.dataset.ghx==='full')ghSyncNow(false,true);else if(b.dataset.ghx==='off')ghDisconnect()},true);
// alten Kopfzeilen-Knopf entfernen (Funktion lebt jetzt unter Mehr → Sync)
function hideLegacyHeader(){['googleHealthImport','googleHealthDisconnect','googleHealthStatus'].forEach(id=>{const e=document.getElementById(id);if(e)e.remove()})}
let legacyObs=null;

/* =============================================================== 3. Sync-Übersicht (oben in Mehr → Sync) */
function syncOverview(){
  const LS=S.lastSync||{},LA=S.lastSyncAt||{};let cl=['–','mute'];try{cl=syncLabel()}catch(_){}
  const cloudLast=(()=>{try{return CL.last}catch(_){return null}})();
  const row=(name,val,cls,sub)=>`<div class="item"><div class="main"><div class="t">${name}</div>${sub?`<div class="small mute">${sub}</div>`:''}</div><span class="pill ${cls}">${val}</span></div>`;
  const src=(k,n)=>LS[k]?row(n,'zuletzt '+(LA[k]?when(LA[k]):fmtD(LS[k])),'ok',LA[k]?full(LA[k]):'nur Datum bekannt'):'';
  return`<section class="panel" id="syncOverview" data-nofold="1"><h2>Sync-Status</h2><div class="list">
    ${row('Konto-Sync (alle Geräte)',Esc(cl[0]),cl[1],cloudLast?'Letzter erfolgreicher Abgleich: '+full(cloudLast):'Seit dem Start noch kein Abgleich bestätigt')}
    ${row('Google Health · Server',GH.connected?(GH.last?'zuletzt '+when(GH.last):'noch kein Abgleich'):(GH.connected===false?'nicht verbunden':'prüfe …'),GH.err&&GH.connected?'bad':GH.connected?'ok':'warn',GH.last?full(GH.last):'')}
    ${row('Google Health · in der App',S.ghPull&&S.ghPull.at?'zuletzt '+when(S.ghPull.at):'noch nie',S.ghPull&&S.ghPull.at?'ok':'warn',S.ghPull&&S.ghPull.at?full(S.ghPull.at):'')}
    ${S.calFeed&&S.calFeed.on?row('Kalender-Feed',S.calFeed.at?'zuletzt '+when(S.calFeed.at):'aktiv',S.calFeed.err?'bad':'ok',S.calFeed.at?full(S.calFeed.at):''):''}
    ${src('oura','Oura')}${src('strava','Strava')}${src('garmin','Garmin')}${src('hc','Health Connect')}
  </div></section>`}
window.apxSyncTime=(k)=>{const LA=S.lastSyncAt||{};return LA[k]?when(LA[k]):fmtD((S.lastSync||{})[k])};

/* =============================================================== Einhängen */
(window.__apexExtraBoot=window.__apexExtraBoot||[]).push(function(){
  try{wrapGha()}catch(e){warn(e,'wrapGha')}
  try{const os=VIEWS.sync;if(os&&!os.__apxOv){const w=function(){const h=os.apply(this,arguments);try{return syncOverview()+h}catch(e){warn(e,'syncOverview');return h}};w.__apxOv=1;VIEWS.sync=w}}catch(e){warn(e,'wrap sync')}
  // Zeitstempel (Datum + Uhrzeit) für jede Quelle merken, sobald sich S.lastSync ändert
  try{const oc=window.commit;if(typeof oc==='function'&&!oc.__apxLs){const w=function(){const b=JSON.stringify(S.lastSync||{});const r=oc.apply(this,arguments);try{const L=S.lastSync||{};const B=JSON.parse(b);S.lastSyncAt=S.lastSyncAt||{};for(const k of Object.keys(L))if(L[k]!==B[k]&&!(S.lastSyncAt[k]>Date.now()-5000))S.lastSyncAt[k]=Date.now()}catch(_){}return r};w.__apxLs=1;window.commit=w;try{(0,eval)('commit=window.commit')}catch(_){}}}catch(e){warn(e,'wrap commit ls')}
  // Kalender-Panel unter dem Kalender-Tab
  try{const o=VIEWS.cal;if(o&&!o.__apxCal){const w=function(){const h=o.apply(this,arguments);try{return h+calPanel()}catch(e){warn(e,'calPanel');return h}};w.__apxCal=1;VIEWS.cal=w}}catch(e){warn(e,'wrap cal')}
  // Feed nach Änderungen aktualisieren
  try{const oc=window.commit;if(typeof oc==='function'&&!oc.__apxCf){const w=function(){const r=oc.apply(this,arguments);if(S.calFeed&&S.calFeed.on)pushSoon();return r};w.__apxCf=1;window.commit=w;try{(0,eval)('commit=window.commit')}catch(_){}}}catch(e){warn(e,'wrap commit')}
  hideLegacyHeader();legacyObs=new MutationObserver(hideLegacyHeader);legacyObs.observe(document.documentElement,{childList:true,subtree:true});
  // Status + automatischer Abgleich: beim Start und beim Zurückkehren in die App
  // Beim Start und beim Zurückkehren: Status holen; Server-Abgleich höchstens alle 15 min, Übernahme in die App immer, wenn der Server Neues hat
  const auto=async()=>{if(GH.busy||!cloud())return;await ghStatus();if(!GH.connected)return;const last=GH.last?new Date(GH.last).getTime():0;const pulled=S.ghPull&&S.ghPull.at?new Date(S.ghPull.at).getTime():0;
    if(Date.now()-last>15*60*1000)ghSyncNow(true,!pulled);else if(last>pulled||Date.now()-pulled>30*60*1000){GH.busy=true;try{await ghPull(!pulled)}catch(e){GH.err=e.message||String(e)}GH.busy=false;ghPaint()}};
  window.addEventListener('focus',auto);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')auto()});
  setTimeout(auto,2500);setInterval(()=>{if(document.visibilityState==='visible')auto()},15*60*1000);
  if(S.calFeed&&S.calFeed.on)setTimeout(()=>pushFeed(false),6000);
});
})();
