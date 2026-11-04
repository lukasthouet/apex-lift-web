/* APEX Lift · Boxen, Companion & Gesundheit – gemeinsame Grundlagen (Nov 2026)
   Wird vor den übrigen apex-*-Modulen geladen (siehe tools/apply-skin.py) und stellt window.ApexBox bereit:
   Einstellungen (S.prefs), Beschwerden-Schweregrad, Übungs-Sicherheitsfilter, Sport-Häufigkeiten,
   Click-/Input-Router. Enthält bewusst KEINE persönlichen Daten (die öffentliche Web-Seite bekommt diese Datei mit).
   Alles defensiv: ein Fehler hier darf die App nie blockieren. */
(function(){
'use strict';
if(window.ApexBox)return;
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
if(typeof S==='undefined'||typeof VIEWS==='undefined'||typeof render!=='function'||typeof ui==='undefined'){console.warn('apex-box-core: App nicht gefunden');return}
const A=window.ApexBox={v:1,META:{},warn};

/* ------------------------------------------------------------------ kleine Helfer */
A.esc=(s)=>{try{return esc(s)}catch(_){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
A.today=()=>{try{return today()}catch(_){return new Date().toISOString().slice(0,10)}};
A.dd=(a,b)=>{try{return dayDiff(a,b)}catch(_){return Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5)}};
A.add=(d,n)=>{try{return addDays(d,n)}catch(_){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)}};
A.fmtD=(d)=>{try{return fmtD(d)}catch(_){return d||'–'}};
A.arr=(k)=>{if(!Array.isArray(S[k]))S[k]=[];return S[k]};
A.list=(k)=>Array.isArray(S[k])?S[k]:[];
A.uid=()=>{try{return uid()}catch(_){return Math.random().toString(36).slice(2,10)+Date.now().toString(36)}};
A.n=(v)=>{const x=parseFloat(String(v??'').replace(',','.'));return isFinite(x)?x:null};
A.de=(x,d=1)=>{const p=Math.pow(10,d);return String(Math.round(x*p)/p).replace('.',',')};
A.save=(msg)=>{try{commit(msg)}catch(e){try{save();render()}catch(_){}if(msg)try{toast(msg)}catch(_){}}};
A.toast=(m)=>{try{toast(m)}catch(_){}};
A.form=(name)=>{ui.apx=ui.apx||{};return ui.apx[name]=ui.apx[name]||{}};

/* ------------------------------------------------------------------ Einstellungen (S.prefs, geräteübergreifend synchronisiert) */
const DEF={
  'hints.sleep':{on:true,days:7,drop:5,dropMin:30,minNights:10},
  'hints.activity':{on:true,days:7,min:1},
  'hints.mob':{on:true,days:7,min:1}};
A.defaults=DEF;
A.pref=(path,fb)=>{const parts=path.split('.');let o=S.prefs;for(const p of parts){if(o==null||typeof o!=='object')return fb;o=o[p]}return o==null?fb:o};
A.hint=(name)=>({...DEF['hints.'+name],...(A.pref('hints.'+name,{})||{})});
A.setPref=(path,val)=>{S.prefs=S.prefs&&typeof S.prefs==='object'?S.prefs:{};const parts=path.split('.');let o=S.prefs;for(let i=0;i<parts.length-1;i++){const k=parts[i];if(o[k]==null||typeof o[k]!=='object')o[k]={};o=o[k]}o[parts[parts.length-1]]=val};
A.isHidden=(key)=>!!A.pref('hide.'+key,false);

/* ------------------------------------------------------------------ Körperregionen für Beschwerden & Übungen */
// [Name, hatSeiten, passende Mobility-Region der App]
A.REGS=[['Schulter',1,'Schulter'],['Nacken',0,'Nacken'],['Oberer Rücken',0,'Wirbelsäule'],['Unterer Rücken',0,'Wirbelsäule'],['Ellenbogen',1,'Handgelenk'],['Handgelenk / Hand',1,'Handgelenk'],['Rippen / Rumpf',1,'Wirbelsäule'],['Hüfte',1,'Hüfte'],['Knie',1,'Knie & Oberschenkel'],['Sprunggelenk / Fuß',1,'Sprunggelenk'],['Kopf',0,null]];
A.regMob=(r)=>{const x=A.REGS.find(q=>q[0]===r);return x?x[2]:null};
const MUSREG={vs:'Schulter',ss:'Schulter',hs:'Schulter',tr:'Nacken',or:'Oberer Rücken',ur:'Unterer Rücken',ua:'Handgelenk / Hand',hb:'Hüfte',ba:'Rippen / Rumpf',sc:'Rippen / Rumpf',wa:'Sprunggelenk / Fuß'};
A.sideTxt=(s)=>s==='L'?'links':s==='R'?'rechts':s==='B'?'beidseitig':'';
A.LVL=['keine','leicht','mäßig','stark'];

// Schweregrad 0–3 eines Eintrags: eigene Stufe > Zahl (0–10) > Hauptbeschwerde/„etwas“ aus eigenen Worten
A.sevOf=(r)=>{if(!r)return 0;if(typeof r.lvl==='number')return Math.max(0,Math.min(3,r.lvl));if(typeof r.nrs==='number')return r.nrs<=0?0:r.nrs<=3?1:r.nrs<=6?2:3;if(r.rel==='haupt')return 2;if(r.rel==='leicht')return 1;return 1};

// letzter Stand je Region/Seite aus dem Beschwerden-Verlauf
A.complaintsLatest=()=>{const by={};const L=A.list('complaints').slice().sort((a,b)=>(a.date+String(a.t||0).padStart(15,'0'))<(b.date+String(b.t||0).padStart(15,'0'))?-1:1);
  for(const c of L)for(const r of c.regs||[]){by[r.reg+'|'+(r.side||'M')]={reg:r.reg,side:r.side||'M',r,entry:c,sev:A.sevOf(r),date:c.date}}
  return Object.values(by)};
// aktive Beschwerden: letzter Stand > 0 und nicht älter als 28 Tage; dazu die Schmerz-Einträge der App (3D-Modell / Befinden)
A.activeComplaints=()=>{const t=A.today();const out=[];
  for(const x of A.complaintsLatest())if(x.sev>0&&A.dd(t,x.date)<=28)out.push({reg:x.reg,side:x.side,sev:x.sev,date:x.date,src:'log'});
  try{if(typeof activePains==='function'){for(const p of activePains()||[]){if(!(p.int>0)||p.resolved||A.dd(t,p.date)>21)continue;const reg=MUSREG[p.key];if(!reg)continue;out.push({reg,side:p.side||'M',sev:p.int>=7?3:p.int>=4?2:1,date:p.date,src:'app'})}}}catch(e){warn(e,'box-pains')}
  return out};
A.worstSev=(reg)=>A.activeComplaints().filter(c=>c.reg===reg).reduce((m,c)=>Math.max(m,c.sev),0);

/* ------------------------------------------------------------------ Sicherheitsfilter für Übungen
   META[id] = {cat,int:'gentle|moderate|intense',loads:[Mobility-Regionen],easier,why}. Ohne META: Region der Übung, sanft. */
const INT_FALLBACK={sleeper:'moderate',disloc:'moderate',door:'moderate',copen:'intense',pigeon:'moderate',couch:'moderate',lat:'moderate',frog:'moderate',wgs:'moderate',angel:'gentle'};
A.intOf=(id)=>{const m=A.META[id];if(m&&m.int)return m.int;return INT_FALLBACK[id]||'gentle'};
A.loadsOf=(id)=>{const m=A.META[id];if(m&&m.loads)return m.loads;try{const d=DR[id];return d?[d[2]]:[]}catch(_){return[]}};
// → {show, note}: show=false blendet die Übung aus; note = Hinweis, wenn sie nur mit Vorsicht gezeigt wird
A.safe=(id)=>{const loads=A.loadsOf(id);const it=A.intOf(id);let worst=0,which=null;
  for(const c of A.activeComplaints()){const m=A.regMob(c.reg);if(m&&loads.includes(m)&&c.sev>worst){worst=c.sev;which=c}}
  if(!worst)return{show:true,note:null};
  const where=which.reg+(which.side&&which.side!=='M'?' '+A.sideTxt(which.side):'');
  if(worst>=3)return{show:false,note:null,why:`Beschwerden: ${where} (stark)`};
  if(worst===2){if(it==='gentle')return{show:true,note:`Wegen deiner Beschwerden (${where}): nur schmerzfrei und mit kleinem Bewegungsumfang.`};return{show:false,note:null,why:`Beschwerden: ${where}`}}
  if(it==='intense')return{show:false,note:null,why:`Beschwerden: ${where}`};
  return{show:true,note:`Du hast leichte Beschwerden eingetragen (${where}) – nur im schmerzfreien Bereich, sonst die leichtere Variante.`}};
A.hiddenBySafety=(ids)=>ids.filter(i=>!A.safe(i).show);

/* ------------------------------------------------------------------ Sportarten & Häufigkeit */
A.SPORTS={kraft:'Krafttraining',lauf:'Laufen',rad:'Radfahren',swim:'Schwimmen',box:'Boxen',fuss:'Fußball',skate:'Skateboard',tanz:'Tanzen',klettern:'Klettern',hiit:'HIIT / Seilspringen',wandern:'Wandern',ski:'Ski',tennis:'Tennis & Co.'};
const SPORT_RE=[[/box/i,'box'],[/lauf|run|jog|sprint/i,'lauf'],[/rad|bike|cycl|spinning/i,'rad'],[/schwimm|swim/i,'swim'],[/fußball|fussball|soccer|futsal/i,'fuss'],[/skate/i,'skate'],[/tanz|danc/i,'tanz'],[/kletter|boulder/i,'klettern'],[/hiit|crossfit|seilspring|burpee/i,'hiit'],[/wander|hike|berg/i,'wandern'],[/ski|snowboard|langlauf/i,'ski'],[/tennis|padel|squash|badminton/i,'tennis']];
A.sportKey=(type)=>{const t=String(type||'');for(const[re,k]of SPORT_RE)if(re.test(t))return k;return null};
// → {sports:{key:{n,perWeek,last,daysAgo}}, total, days}  – nur tatsächlich erfasste Einheiten
A.sportStats=(days=28)=>{const t=A.today();const out={};const add=(k,date)=>{if(!k||!date)return;const d=A.dd(t,date);if(d<0||d>=days)return;const o=out[k]=out[k]||{n:0,dates:new Set(),last:null};o.dates.add(date);o.n=o.dates.size;if(!o.last||date>o.last)o.last=date};
  for(const a of A.list('activities')){if(!a||a.dup||a.excl)continue;try{if(typeof isDaily==='function'&&isDaily(a))continue}catch(_){}add(A.sportKey(a.type),a.date)}
  for(const s of A.list('sets'))add('kraft',s.date);
  for(const s of A.list('swims'))add('swim',s.date);
  for(const b of A.list('boxing'))add('box',b.date);
  let total=0;for(const k of Object.keys(out)){const o=out[k];o.perWeek=o.n/(days/7);o.daysAgo=A.dd(t,o.last);delete o.dates;total+=o.n}
  return{sports:out,total,days}};

/* ------------------------------------------------------------------ Boxen-Einheiten (eigene + importierte) */
A.boxSessions=()=>{const own=A.list('boxing').map(b=>({...b,ext:false}));
  const ext=A.list('activities').filter(a=>a&&!a.dup&&!a.excl&&a.source!=='box'&&/box/i.test(a.type||'')).map(a=>({id:a.id,date:a.date,min:a.min||null,ext:true,minSrc:'importiert'}));
  return[...own,...ext].sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0)};
A.stanceTxt=()=>{const f=S.body&&S.body.boxFront;return f==='L'?'vorderer Fuß links':f==='R'?'vorderer Fuß rechts':''};

/* ------------------------------------------------------------------ Registrierung von Bereichen (Mehr-Menü) */
A.registerModule=(key,name,desc,opts={})=>{try{if(!MODULES.some(m=>m[0]===key)){let i=MODULES.findIndex(m=>m[0]===(opts.after||'skate'));if(i<0)i=MODULES.length-1;MODULES.splice(i+1,0,[key,name,desc])}
  if(opts.sport!==false&&typeof SPORT_MODS!=='undefined'&&!SPORT_MODS.includes(key))SPORT_MODS.push(key)}catch(e){warn(e,'box-register')}};

/* ------------------------------------------------------------------ Event-Router (data-apx="aktion") */
const ACT={},INP={};
A.action=(name,fn)=>{ACT[name]=fn};
A.input=(group,fn)=>{INP[group]=fn};
document.addEventListener('click',(e)=>{const el=e.target.closest&&e.target.closest('[data-apx]');if(!el)return;const fn=ACT[el.dataset.apx];if(!fn)return;
  try{fn(el,e)}catch(err){warn(err,'apx:'+el.dataset.apx)}});
const onField=(e)=>{const el=e.target;if(!el||!el.dataset||el.dataset.apxf==null)return;const [g,k]=el.dataset.apxf.split(':');const fn=INP[g];if(!fn)return;
  try{fn(k,el.type==='checkbox'?el.checked:el.value,el,e)}catch(err){warn(err,'apxf:'+g)}};
document.addEventListener('input',onField);document.addEventListener('change',onField);

/* ------------------------------------------------------------------ kleine UI-Bausteine im Stil der App */
A.chips=(group,items,cur,attr='data-apx')=>`<div class="chips">${items.map(([k,l])=>`<button ${attr}="${group}" data-v="${A.esc(k)}" aria-pressed="${cur===k}">${A.esc(l)}</button>`).join('')}</div>`;
A.pill=(txt,cls='mute')=>`<span class="pill ${cls}">${A.esc(txt)}</span>`;
})();
