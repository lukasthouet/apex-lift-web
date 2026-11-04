/* APEX Lift · Erweiterungen (Nov 2026)
   Läuft nach der App und hängt sich über Wrapper ein. Wird von tools/apply-skin.py eingebunden
   und von tools/build-pages.py ins Web-Bundle eingebettet. Alles defensiv in try/catch:
   ein Fehler hier darf die App nie blockieren. */
(function(){
'use strict';
if(window.__apexFeatures)return;window.__apexFeatures=1;
const g=(n)=>{try{return (0,eval)(n)}catch(_){return undefined}};          // Zugriff auf Top-Level-const/let der App
const fn=(n)=>{const f=g(n);return typeof f==='function'?f:null};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const HAS=()=>typeof S!=='undefined'&&typeof VIEWS!=='undefined'&&typeof render==='function';
if(!HAS()){console.warn('apex-features: App nicht gefunden');return}

/* ------------------------------------------------------------------ CSS */
const css=document.createElement('style');css.id='apexFeaturesCss';css.textContent=`
/* Desktop: ganze Breite nutzen (Spalten wachsen mit dem Bildschirm, Seitenleiste bleibt rechts) */
@media (min-width:1100px){
  body.desk .wrap{max-width:none!important}
  body.desk main .wrap{padding-left:clamp(16px,2vw,40px)!important;padding-right:calc(372px + max(16px,env(safe-area-inset-right,0px)))!important}
  body.desk #view{columns:auto 440px!important;column-gap:18px!important}
  body.desk #deskSide{right:max(16px,env(safe-area-inset-right,0px))!important;width:340px!important}
  body.desk nav.tabs .wrap{justify-content:center}
}
/* Desktop: „Mehr“ und alle Untermenüs nutzen die volle Bildschirmbreite (keine Seitenleiste, keine Maximalbreite) */
body.desk.deskfull .wrap,body.desk.deskfull header.bar .wrap,body.desk.deskfull nav.tabs .wrap{max-width:none!important}
body.desk.deskfull main .wrap{padding-left:clamp(16px,2vw,40px)!important;padding-right:max(clamp(16px,2vw,40px),env(safe-area-inset-right,0px))!important}
body.desk.deskfull #deskSide{display:none!important}
body.desk.deskfull #view{columns:auto 520px!important;column-gap:18px!important}
body.desk.deskmore #view{columns:1!important}
body.desk.deskmore #view .tiles{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
/* Trainings-Hero entfernt */
.apex-photo-hero{display:none!important}
.row:has(#qkSharp),.row:has(#qkSharp)+p.small{display:none!important}
/* Athletik-Trend */
.abtrend{display:inline-flex;align-items:center;gap:3px;font:600 13px var(--f-mono);margin-left:8px;vertical-align:middle}
.abtrend.up{color:var(--ok)}.abtrend.down{color:var(--bad)}.abtrend.flat{color:var(--mute)}
.abnum b{display:inline-block}
/* Wochenstunden */
.wk-stack{display:flex;height:18px;border-radius:9px;overflow:hidden;background:var(--panel2);margin:6px 0}
.wk-stack i{display:block;height:100%}
.wk-leg{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12px;color:var(--mute)}
.wk-leg span{display:inline-flex;align-items:center;gap:5px}.wk-leg i{width:9px;height:9px;border-radius:50%;display:inline-block}
.wk-big{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.wk-big>div{border:1px solid var(--line);border-radius:var(--r);padding:10px 12px;background:var(--panel2)}
.wk-big b{display:block;font-family:var(--f-display);font-size:30px;line-height:1.05}
.wk-big small{color:var(--mute);font-size:12px}
/* Satz bearbeiten */
.apx-edit{border:0!important;background:none!important;padding:0 4px 0 6px!important;font-size:12px;cursor:pointer;color:var(--mute)}
.apx-edit:hover{color:var(--accent)}
dialog.apx-dlg{border:1px solid var(--line);border-radius:14px;background:var(--panel);color:var(--fg);padding:18px;max-width:min(420px,92vw);width:100%}
dialog.apx-dlg::backdrop{background:rgba(0,0,0,.55)}
dialog.apx-dlg h3{margin:0 0 10px}
dialog.apx-dlg .row{gap:8px;margin-top:12px}
.bwbadge{display:inline-flex;gap:6px;align-items:center;font-size:12px;color:var(--mute);margin:4px 0}
.bwbadge button{padding:2px 8px;font-size:12px}
/* Heatmap */
.hm-wrap{position:relative;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#0b1118}
.hm-wrap canvas{display:block;width:100%;height:auto}
.hm-leg{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mute);margin-top:6px}
.hm-leg i{display:block;height:8px;width:120px;border-radius:4px;background:linear-gradient(90deg,rgba(0,80,255,.2),#00d4ff,#7dff6b,#ffd400,#ff3b1f)}
/* Blutwerte */
.bl-flag{display:inline-block;min-width:44px;text-align:center}
.bl-range{position:relative;height:8px;border-radius:4px;background:linear-gradient(90deg,var(--bad),var(--warn) 18%,var(--ok) 30%,var(--ok) 70%,var(--warn) 82%,var(--bad));margin:6px 0 2px;min-width:90px}
.bl-range i{position:absolute;top:-4px;width:4px;height:16px;border-radius:2px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.5)}
.bl-drop{border:2px dashed var(--line);border-radius:var(--r);padding:16px;text-align:center}
.bl-drop.over{border-color:var(--accent)}
`;
document.head.appendChild(css);

/* ------------------------------------------------------------------ Helfer */
const num=(v)=>{const n=parseFloat(String(v??'').replace(',','.'));return isFinite(n)?n:null};
const round1=(x)=>Math.round(x*10)/10;
const fmtN1=(x)=>String(round1(x)).replace('.',',');
const isoDate=(d)=>{const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
const todayStr=()=>{try{return today()}catch(_){return isoDate(new Date())}};
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};

/* ================================================================== 1. Körpergewichtsübungen */
const BW_RE=/liegestütz|klimmz(?:ug|üg)|^dips|\bdips\b|ausfallschritt|bulgarian|plank|burpee|beinheben|ab wheel|crunch|toes to bar|muscle.?up|pull.?up|push.?up|chin.?up|sit.?up|hanging|hängen|australian|inverted row|pistol|hollow|dead hang/i;
const BW_NOT=/maschine|assist|assistiert|kabel|cable|latzug|hantel|kurzhantel|langhantel/i;
function exIsBw(e){if(!e)return false;if(e.bw===true)return true;if(e.bw===false)return false;return BW_RE.test(e.name||'')&&!BW_NOT.test(e.name||'')}
function bodyKg(date){try{const W=(S.weights||[]).filter(w=>w&&w.kg&&(!date||w.date<=date)).sort((a,b)=>a.date<b.date?-1:1);if(W.length)return W.at(-1).kg;const all=(S.weights||[]).filter(w=>w&&w.kg).sort((a,b)=>a.date<b.date?-1:1);if(all.length)return all[0].kg}catch(_){}return (S.body&&S.body.weight)||75}
window.apexBw={is:exIsBw,kg:bodyKg};

/* Wrapper um setTable: Eingabe = Zusatzgewicht, Umschalter "Körpergewichtsübung" */
function wrapSetTable(){
  const orig=g('setTable');if(typeof orig!=='function'||orig.__apx)return;
  const w=function(e,gy,mach){
    let html=orig.apply(this,arguments);
    try{
      const bw=exIsBw(e);
      if(bw){
        const kgNow=bodyKg(todayStr());
        // Eingabefelder: Gesamtlast -> Zusatzgewicht; Label anpassen
        html=html.replace(/(<input id="rw\d+" inputmode="decimal" value=")([^"]*)(" style="width:68px;padding:6px" aria-label=")Gewicht Satz (\d+) in kg("><span class="mute small">)kg ×/g,
          (m,a,val,b,i,c)=>{const tot=num(val);let ex=tot==null?0:Math.max(0,round1(tot-kgNow));
            return a+String(ex).replace('.',',')+b+'Zusatzgewicht Satz '+i+' in kg'+c+'+kg ×'});
        html=html.replace(/<th>Heute<\/th>/,'<th>Heute <small class="mute">(Zusatz)</small></th>');
        // Zielwerte (aus Gesamtlast) als Zusatz darstellen
        html=html.replace(/<span class="small(?: mute)?">(\d+(?:,\d+)?) kg × (\d+)<\/span>/g,(m,wt,r)=>{
          const tot=num(wt);if(tot==null||tot<kgNow*0.6)return m;const ex=Math.max(0,round1(tot-kgNow));
          return m.replace(/>[^<]*</,'>'+(ex>0?'KG + '+fmtN1(ex)+' kg':'KG')+' × '+r+'<')});
      }
      const badge=`<div class="bwbadge">${bw?`<span>Körpergewichtsübung · es zählt automatisch dein Körpergewicht (${fmtN1(bodyKg(todayStr()))} kg), das Feld ist nur Zusatzgewicht.</span>`:''}<button class="sm ghost" data-apx-bw="${Esc(e.id)}">${bw?'Ist keine Körpergewichtsübung':'Als Körpergewichtsübung markieren'}</button></div>`;
      html=badge+html;
    }catch(err){warn(err,'apex setTable')}
    return html};
  w.__apx=1;try{window.setTable=w}catch(_){}try{(0,eval)('setTable=window.setTable')}catch(_){}
}
/* gymLogger: Rad zeigt Zusatzgewicht (Startwert = letzter Zusatz) */
function lastExtraFor(e,kgNow){
  const L=S.sets.filter(s=>s.exerciseId===e.id).sort((a,b)=>(b.t||0)-(a.t||0)||(a.date<b.date?1:-1));
  const l=L[0];if(!l)return 0;
  if(l.extra!=null)return l.extra;
  return l.weight>=kgNow*.6?Math.max(0,round1(l.weight-kgNow)):0;
}
function wrapGymLogger(){
  const orig=g('gymLogger');if(typeof orig!=='function'||orig.__apx)return;
  const w=function(gy,todays){
    let bwEx=false;
    try{
      const e=ex(ui.exId);bwEx=!!e&&exIsBw(e);
      if(bwEx&&ui.gwEx!==e.id){ui.gwEx=e.id;ui.gw=lastExtraFor(e,bodyKg(todayStr()));ui.gr=null}
    }catch(err){warn(err,'apex gymLogger pre')}
    let html=orig.apply(this,arguments);
    try{
      if(!bwEx)return html;
      const e=ex(ui.exId);const kgNow=bodyKg(todayStr());
      html=html.replace('<span class="eyebrow">Gewicht kg</span>','<span class="eyebrow">Zusatz kg</span>');
      html=html.replace(/(Satz \d+[^<]*?)letztes Mal ([\d,]+) kg × (\d+)/,(m,a,b,r)=>{const tot=num(b);if(tot==null||tot<kgNow*.6)return m;const ex2=Math.max(0,round1(tot-kgNow));return a+'letztes Mal '+(ex2>0?'KG + '+fmtN1(ex2)+' kg':'KG')+' × '+r});
      html=html.replace('<h2 style="margin:10px 0 2px">','<div class="bwbadge"><span>Körpergewicht zählt automatisch · das Rad ist nur Zusatzgewicht</span><button class="sm ghost" data-apx-bw="'+Esc(e.id)+'">Keine Körpergewichtsübung</button></div><h2 style="margin:10px 0 2px">');
    }catch(err){warn(err,'apex gymLogger')}
    return html};
  w.__apx=1;try{window.gymLogger=w}catch(_){}try{(0,eval)('gymLogger=window.gymLogger')}catch(_){}
}
/* Satz speichern: bei Körpergewichtsübungen Gewicht = Körpergewicht + Zusatz */
document.addEventListener('click',function(ev){
  try{
    const btn=ev.target.closest&&ev.target.closest('[data-act="logSet"],[data-logrow]');
    if(!btn)return;
    const D=btn.dataset||{};if(D.act&&D.act!=='logSet')return;
    const e=ex(ui.exId);if(!e||!exIsBw(e))return;
    const i=D.logrow!=null?+D.logrow:ui.activeRow;
    const wEl=document.getElementById('rw'+i),rEl=document.getElementById('rr'+i);if(!wEl||!rEl)return;
    const extra=Math.max(0,num(wEl.value)??0),reps=parseInt(rEl.value);
    if(!(reps>0)){return}
    const kgNow=bodyKg(todayStr());
    ui.__apxPendingBw={bw:kgNow,extra:round1(extra)};
    // Die App verlangt Gewicht > 0: Gesamtlast einsetzen, Zusatz merken
    wEl.value=String(round1(kgNow+extra)).replace('.',',');
    setTimeout(()=>{try{const last=S.sets.filter(s=>s.exerciseId===e.id).sort((a,b)=>(b.t||0)-(a.t||0))[0];const p=ui.__apxPendingBw;
      if(last&&p&&!last.bw&&Date.now()-(last.t||0)<4000){last.bw=p.bw;last.extra=p.extra;save()}ui.__apxPendingBw=null;try{render()}catch(_){}}catch(err){warn(err,'apex bw')}},60);
  }catch(err){warn(err,'apex logSet')}
},true);

/* ================================================================== 2. Satz nachträglich ändern */
function openSetDialog(id){
  const s=S.sets.find(x=>x.id===id);if(!s)return;
  const e=ex(s.exerciseId);const bw=s.bw!=null;
  let d=document.getElementById('apxSetDlg');if(d)d.remove();
  d=document.createElement('dialog');d.id='apxSetDlg';d.className='apx-dlg';
  const cur=bw?(s.extra||0):s.weight;
  d.innerHTML=`<h3>${Esc(e?e.name:'Satz')} · ändern</h3>
   <p class="small mute">${bw?`Körpergewicht ${fmtN1(s.bw)} kg zählt automatisch. Hier nur das Zusatzgewicht ändern.`:'Gewicht und Wiederholungen dieses Satzes korrigieren.'}</p>
   <div class="row"><label class="f" style="flex:1 1 120px">${bw?'Zusatzgewicht (kg)':'Gewicht (kg)'}<input id="apxW" inputmode="decimal" value="${String(cur).replace('.',',')}"></label>
   <label class="f" style="flex:1 1 90px">${s.sec?'Sekunden':'Wiederholungen'}<input id="apxR" inputmode="numeric" value="${s.reps}"></label></div>
   ${!bw&&e?`<label class="row" style="gap:8px;margin-top:8px"><input type="checkbox" id="apxMkBw"> <span class="small">Ist eine Körpergewichtsübung (Wert als Zusatzgewicht behandeln)</span></label>`:''}
   <div class="row"><button class="primary" id="apxSave">Speichern</button><button id="apxCancel" class="ghost">Abbrechen</button></div>`;
  document.body.appendChild(d);
  d.querySelector('#apxCancel').onclick=()=>d.close();
  d.querySelector('#apxSave').onclick=()=>{
    try{
      const w=num(d.querySelector('#apxW').value),r=parseInt(d.querySelector('#apxR').value);
      if(w==null||w<0||!(r>0)){toast('Bitte gültige Werte eingeben');return}
      const before=JSON.stringify({w:s.weight,r:s.reps,ex:s.extra});
      if(bw){s.extra=round1(w);s.weight=round1(s.bw+s.extra)}
      else if(d.querySelector('#apxMkBw')&&d.querySelector('#apxMkBw').checked){const k=bodyKg(s.date);s.bw=k;s.extra=round1(w);s.weight=round1(k+w);if(e)e.bw=true}
      else{if(!(w>0)){toast('Gewicht muss größer als 0 sein');return}s.weight=round1(w)}
      s.reps=r;s.edited=Date.now();
      d.close();commit('Satz geändert');
    }catch(err){warn(err,'apex editSet');toast('Speichern fehlgeschlagen')}
  };
  d.addEventListener('close',()=>d.remove());
  d.showModal();
}
document.addEventListener('click',function(ev){
  const b=ev.target.closest&&ev.target.closest('[data-apx-edit]');
  if(b){ev.stopPropagation();ev.preventDefault();openSetDialog(b.dataset.apxEdit);return}
  const t=ev.target.closest&&ev.target.closest('[data-apx-bw]');
  if(t){ev.stopPropagation();ev.preventDefault();const e=S.exercises.find(x=>x.id===t.dataset.apxBw);if(e){e.bw=!exIsBw(e);commit(e.bw?`${e.name}: zählt jetzt mit Körpergewicht`:`${e.name}: normale Gewichtsübung`)}}
},true);
function decorateSets(){
  try{
    document.querySelectorAll('#view button[data-del]').forEach(btn=>{
      if(btn.dataset.apxDone)return;btn.dataset.apxDone='1';
      const id=btn.dataset.del;if(!S.sets.some(s=>s.id===id))return;
      const e=document.createElement('button');e.type='button';e.className='ghost apx-edit';e.dataset.apxEdit=id;e.title='Satz ändern';e.setAttribute('aria-label','Satz ändern');e.textContent='✎';
      btn.parentNode.insertBefore(e,btn);
    });
  }catch(err){warn(err,'apex decorate')}
}

/* ================================================================== 3. Athletik-Score: Trend */
function abSnapshot(total){
  try{
    if(total==null)return;
    const h=S.abHist=S.abHist||{};const t=todayStr();const v=round1(total);
    if(h[t]!==v){h[t]=v;const ks=Object.keys(h).sort();while(ks.length>400)delete h[ks.shift()];try{save()}catch(_){}}
  }catch(_){}
}
function abTrend(total){
  try{
    const h=S.abHist||{};const t=todayStr();const ks=Object.keys(h).filter(k=>k<t).sort();if(!ks.length||total==null)return null;
    const dd=(a,b)=>Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5);
    // Referenz: Messung ca. 14 Tage zurück (mind. 1 Tag alt)
    let ref=null,best=1e9;for(const k of ks){const age=dd(t,k);const diff=Math.abs(age-14);if(diff<best){best=diff;ref=k}}
    const delta=total-h[ref];return{delta,ref,days:dd(t,ref)};
  }catch(_){return null}
}
function wrapAbCard(){
  const orig=g('abCard');if(typeof orig!=='function'||orig.__apx)return;
  const w=function(){
    let html=orig.apply(this,arguments);
    try{
      const A=AB();if(A.total==null)return html;
      abSnapshot(A.total);const T=abTrend(A.total);
      let arrow;
      if(!T)arrow=`<span class="abtrend flat" title="Trend erscheint, sobald es einen früheren Wert gibt">–</span>`;
      else if(T.delta>=0.5)arrow=`<span class="abtrend up" title="Seit ${T.days} Tagen ${fmtN1(T.delta)} Punkte besser" aria-label="Trend steigend">▲ +${fmtN1(T.delta)}</span>`;
      else if(T.delta<=-0.5)arrow=`<span class="abtrend down" title="Seit ${T.days} Tagen ${fmtN1(-T.delta)} Punkte schlechter" aria-label="Trend fallend">▼ ${fmtN1(T.delta)}</span>`;
      else arrow=`<span class="abtrend flat" title="Stabil seit ${T.days} Tagen" aria-label="Trend stabil">►</span>`;
      html=html.replace(/(<div class="abnum"><span class="eyebrow">Athletik-Score<\/span><b>\d+<\/b>)/,'$1'+arrow);
    }catch(err){warn(err,'apex abTrend')}
    return html};
  w.__apx=1;try{window.abCard=w}catch(_){}try{(0,eval)('abCard=window.abCard')}catch(_){}
}

/* ================================================================== 4. Wochenstunden: Sport vs. Brainfree */
function weekDays(){const t=todayStr();const d=new Date(t+'T12:00:00');const wd=(d.getDay()+6)%7;const out=[];for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()-wd+i);out.push(isoDate(x))}return out}
function weekSport(){
  const days=weekDays();const t=todayStr();const set=new Set(days);const parts={Kraft:0,Ausdauer:0,Mobility:0};
  // Kraft: echte Dauer aus Gym-Sessions (ohne Pausen), sonst Sätze × 2,2 min
  const sessMin={};
  for(const s of (S.gymSessions||[])){if(!set.has(s.date)||!s.start)continue;let ms=0;try{ms=sessMs(s,s.start,s.end||Date.now())}catch(_){ms=Math.max(0,(s.end||Date.now())-s.start)}if(ms>0)sessMin[s.date]=(sessMin[s.date]||0)+ms/6e4}
  const setDays={};for(const x of S.sets)if(set.has(x.date))setDays[x.date]=(setDays[x.date]||0)+1;
  for(const d of Object.keys(setDays))parts.Kraft+=sessMin[d]>0?sessMin[d]:setDays[d]*2.2;
  let ta=[];try{ta=TA()}catch(_){ta=(S.activities||[])}
  const swimDays=new Set();
  for(const a of ta){if(!set.has(a.date)||a.dup||a.excl||!a.min)continue;
    if(/kraft|gym|weight|strength/i.test(a.type||'')&&setDays[a.date])continue;   // schon über die Sätze gezählt
    if(/schwimm|swim/i.test(a.type||''))swimDays.add(a.date);parts.Ausdauer+=a.min}
  for(const w of (S.swims||[]))if(set.has(w.date)&&w.min&&!swimDays.has(w.date))parts.Ausdauer+=w.min;
  for(const m of (S.mobSessions||[]))if(set.has(m.date))parts.Mobility+=m.min||0;
  const total=Object.values(parts).reduce((a,b)=>a+b,0);
  return{parts,total,days,until:t};
}
function weekBudget(){
  const W=weekSport();let C=null;try{C=bgCalc()}catch(_){}
  const b=C?C.b:{sleepH:8,commuteH:4,choreH:2,searchH:15,workH:40,status:'suche',sessMin:60,travelMin:20,overheadMin:25};
  const sleep=7*b.sleepH,busy=C?C.busy:(b.status==='job'?b.workH:b.searchH),wege=b.commuteH+7*b.choreH;
  const sportH=W.total/60;
  // Aufwand je Einheit (Fahrt + Umziehen) für bisher absolvierte Trainingstage
  const dayCount=new Set([...S.sets.filter(s=>W.days.includes(s.date)).map(s=>s.date)]).size;
  const overheadH=dayCount*((b.travelMin||0)+(b.overheadMin||0))/60;
  const spwH=C?C.sportH:0;
  const sportWeek=Math.max(sportH+overheadH,spwH);  // Prognose: nie weniger als bisher gemessen
  const free=Math.max(0,168-sleep-busy-wege);
  const brain=Math.max(0,free-sportWeek);
  return{W,sleep,busy,wege,sportH,overheadH,sportWeek,free,brain,b,job:C?C.job:false}
}
function weekCard(){
  const B=weekBudget();const p=B.W.parts;
  const seg=[['Schlaf',B.sleep,'var(--mute)'],[B.job?'Arbeit':'Jobsuche',B.busy,'var(--accent)'],['Wege & Alltag',B.wege,'var(--p5,#a78bfa)'],['Sport, Mobility & Co.',B.sportWeek,'var(--ok)'],['Brainfree',B.brain,'var(--hi,#4cc9f0)']];
  const tot=seg.reduce((a,s)=>a+s[1],0)||168;
  const parts=Object.entries(p).filter(([,v])=>v>=1).map(([k,v])=>`${k} ${fmtN1(v/60)} h`).join(' · ');
  return`<section class="panel" id="weekCard" data-nofold="1"><div class="row between"><h2>Diese Woche</h2><button class="sm ghost" data-tab="budget">Zeit &amp; Geld ›</button></div>
   <div class="wk-big"><div><b>${fmtN1(B.sportH)} h</b><small>Sport, Mobility &amp; Co. bisher${B.overheadH>0?` · mit Wegen ${fmtN1(B.sportH+B.overheadH)} h`:''}</small></div><div><b>${fmtN1(B.brain)} h</b><small>Brainfree Time: absolut frei, für alles Mögliche</small></div></div>
   <div class="wk-stack" role="img" aria-label="Wochenverteilung in Stunden">${seg.map(s=>`<i style="width:${(s[1]/tot*100).toFixed(2)}%;background:${s[2]}" title="${Esc(s[0])} ${fmtN1(s[1])} h"></i>`).join('')}</div>
   <div class="wk-leg">${seg.map(s=>`<span><i style="background:${s[2]}"></i>${Esc(s[0])} ${fmtN1(s[1])} h</span>`).join('')}</div>
   <p class="small mute">${parts?parts+'. ':''}Brainfree = 168 h − Schlaf − ${B.job?'Arbeit':'Jobsuche'} − Wege &amp; Alltag − Sport (mindestens dein 4-Wochen-Schnitt inkl. Fahrt und Umziehen). Annahmen änderst du unter Mehr → Zeit &amp; Geld.</p></section>`;
}
function wrapHome(){
  const orig=VIEWS.log;if(!orig||orig.__apxWk)return;
  const w=function(){
    const h=orig.apply(this,arguments);
    try{
      if(ui.gymMode)return h;
      let c=weekCard();try{c+=sharpCard()}catch(err){warn(err,'sharpCard')}
      const i=h.indexOf('id="abCard"');
      if(i>=0){const j=h.indexOf('</section>',i);if(j>=0)return h.slice(0,j+10)+c+h.slice(j+10)}
      const k=h.indexOf('</section>');return k<0?c+h:h.slice(0,k+10)+c+h.slice(k+10);
    }catch(err){warn(err,'apex weekCard');return h}
  };
  w.__apxWk=1;VIEWS.log=w;
}

/* ================================================================== 5. Kopf-Frische: Check-in + Sweet Spot auf der Startseite */
const SH_CH=[['benebelt',2],['träge',4],['okay',6],['klar',8],['glasklar',10]];
function todTag(){const h=new Date().getHours();return h<11?'morgens':h<17?'nachmittags':'abends'}
function sharpSummary(){
  const out={n:0,fit:null,cur:null,avg7:null,prev7:null,state:null};
  try{
    const L=(lst('sharp')||[]).filter(x=>shIndex(x)!=null);out.n=L.length;
    const t=todayStr();const inR=(x,a,b)=>x.date>=addDays(t,-a)&&x.date<=addDays(t,-b);
    const A=L.filter(x=>inR(x,6,0)).map(shIndex),B=L.filter(x=>inR(x,13,7)).map(shIndex);
    out.avg7=A.length?avgOf(A):null;out.prev7=B.length?avgOf(B):null;
    out.cur=shLoad(addDays(t,1),7)/60;
    const C=shCurve();out.fit=C.fit;
    if(C.fit&&C.fit.peak!=null){const pk=C.fit.peak;out.state=out.cur<pk-1.5?'low':out.cur>pk+1.5?'high':'ok'}
  }catch(e){warn(e,'sharpSummary')}
  return out}
function sharpCard(){
  const t=todayStr();const L=(lst('sharp')||[]);const today_=L.filter(x=>x.date===t);const Q=sharpSummary();
  const post=!!ui.apxShPost;const tod=todTag();
  const lastToday=today_.at(-1);
  let status;
  if(Q.fit&&Q.fit.peak!=null){
    const pk=round1(Q.fit.peak);
    status=`Sweet Spot bei ca. <strong>${fmtN1(pk)} h</strong> Bewegung pro Woche. Du liegst bei ${fmtN1(Q.cur)} h: `+(Q.state==='ok'?'<span class="pill ok">im Sweet Spot</span>':Q.state==='high'?'<span class="pill warn">darüber, Kopf könnte leiden</span>':'<span class="pill info">darunter, mehr Bewegung könnte dem Kopf helfen</span>');
  }else status=`Aus deinen Checks entsteht der Sweet Spot (Sport ↔ Kopf). Bisher <strong>${Q.n}</strong> von 8 nötigen Checks.`;
  const tr=Q.avg7!=null&&Q.prev7!=null?(Q.avg7-Q.prev7>=3?'▲':Q.avg7-Q.prev7<=-3?'▼':'►'):'';
  return`<section class="panel" id="sharpCard" data-nofold="1"><div class="row between"><h2>Kopf-Frische</h2><button class="sm ghost" data-tab="sharp">Mehr ›</button></div>
   <p class="small mute">Wie klar und spritzig fühlt sich dein Kopf gerade an? Ein Tipp genügt. Mehrmals am Tag, dann zeigt sich, ob mehr Sport dir Gehirnleistung gibt oder nimmt.</p>
   <div class="joyc" role="group" aria-label="Kopf-Frische jetzt">${SH_CH.map(([l,v])=>`<button data-apx="sharp|${v}" aria-pressed="${!!lastToday&&lastToday.self===v&&lastToday.tod===tod}">${l}</button>`).join('')}</div>
   <label class="row" style="gap:8px;margin-top:6px"><input type="checkbox" data-apx-shpost ${post?'checked':''}> <span class="small">Direkt nach dem Training</span></label>
   <p class="small">${today_.length?`Heute ${today_.length} Check${today_.length===1?'':'s'}${lastToday?` · zuletzt ${lastToday.self}/10${lastToday.tod?' ('+lastToday.tod+')':''}`:''}. `:'Heute noch kein Check. '}${Q.avg7!=null?`7-Tage-Schnitt ${Math.round(Q.avg7)}/100 ${tr}`:''}</p>
   <p class="small">${status}</p></section>`}
document.addEventListener('change',(e)=>{const el=e.target;if(el&&el.matches&&el.matches('[data-apx-shpost]')){ui.apxShPost=!!el.checked}},true);
document.addEventListener('click',(ev)=>{
  const b=ev.target.closest&&ev.target.closest('[data-apx]');if(!b)return;
  const [k,...r]=b.dataset.apx.split('|');
  if(k==='sharp'){ev.stopPropagation();ev.preventDefault();try{const v=+r[0];arr('sharp').push({id:uid(),date:todayStr(),self:v,rt:null,post:!!ui.apxShPost,quick:true,tod:todTag(),t:Date.now()});commit('Kopf-Check gespeichert')}catch(err){warn(err,'apex sharp')}}
},true);

/* ================================================================== Desktop-Vollbreite für „Mehr“ + Untermenüs */
function wrapLayout(){
  const o=window.applyLayout;if(typeof o!=='function'||o.__apxFull)return;
  const w=function(){
    const d=o.apply(this,arguments);
    try{
      const sub=tab==='more'||!TABS.some(t=>t[0]===tab);
      document.body.classList.toggle('deskfull',!!d&&sub);
      document.body.classList.toggle('deskmore',!!d&&tab==='more');
    }catch(e){warn(e,'deskfull')}
    return d;
  };
  w.__apxFull=1;window.applyLayout=w;
}

/* ================================================================== Registrierung / Start */
function boot(){
  try{wrapSetTable()}catch(e){warn(e,'wrapSetTable')}
  try{wrapGymLogger()}catch(e){warn(e,'wrapGymLogger')}
  try{wrapAbCard()}catch(e){warn(e,'wrapAbCard')}
  try{wrapHome()}catch(e){warn(e,'wrapHome')}
  try{wrapLayout()}catch(e){warn(e,'wrapLayout')}
  try{(window.__apexExtraBoot||[]).forEach(f=>{try{f()}catch(e){warn(e,'extraBoot')}})}catch(_){}
  try{new MutationObserver(()=>requestAnimationFrame(decorateSets)).observe(document.getElementById('view'),{childList:true,subtree:true});decorateSets()}catch(_){}
  try{render()}catch(e){warn(e,'apex render')}
}
window.__apexFeatureApi={num,round1,fmtN1,Esc,warn,g,fn,bodyKg,exIsBw,weekSport,weekBudget,boot};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
