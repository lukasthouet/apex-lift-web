/* APEX Lift · Boxen als Sportart (Nov 2026)
   Eigener Bereich unter Mehr → Sportarten, Kurzkarte in der Trainingsübersicht, Runden-Timer.
   Daten: S.boxing (Einheiten mit id → werden geräteübergreifend synchronisiert) + gespiegelte Aktivität in S.activities
   (damit Kalender, Belastung und Erholung wie bei Skateboard & Co. mitrechnen).
   Grundsatz: nur eingetragene oder vom Timer gemessene Werte. Berechnetes und Geschätztes ist als solches markiert. */
(function(){
'use strict';
if(window.__apexBoxen)return;window.__apexBoxen=1;
const A=window.ApexBox;if(!A){console.warn('apex-boxen: Kern fehlt');return}
const E=A.esc;

/* ------------------------------------------------------------------ Modell-Einbindung (Farben, Belastung) */
try{if(typeof SPORTCOL!=='undefined')SPORTCOL.Boxen=SPORTCOL.Boxen||'#d9483b'}catch(_){}
try{if(typeof IMPACT!=='undefined'&&IMPACT.Boxen==null)IMPACT.Boxen=.4}catch(_){}                       // Sprung-/Stoßbelastung der Füße: gering bis mittel
try{if(typeof CARDIO_MUS!=='undefined'&&!CARDIO_MUS.Boxen)CARDIO_MUS.Boxen={vs:.55,ss:.5,tz:.4,ba:.5,sc:.55,wa:.35,qu:.3,ge:.25,br:.25}}catch(_){}
try{if(typeof CTYPES!=='undefined'&&!CTYPES.includes('Boxen')){const i=CTYPES.indexOf('Skateboard');CTYPES.splice(i<0?CTYPES.length:i+1,0,'Boxen')}}catch(_){}
A.registerModule('boxen','Boxen','Einheiten, Runden, Anstrengung, Beschwerden, Companion',{after:'skate'});

const SEC=[['warm','Aufwärmen'],['tech','Technik'],['bag','Sandsack'],['mitts','Pratzen'],['spar','Sparring'],['cool','Cooldown']];
const SECL=Object.fromEntries(SEC);
const RPE_TXT=['','sehr leicht','leicht','leicht','moderat','moderat','anstrengend','anstrengend','sehr anstrengend','nahe am Limit','Maximum'];
const mmss=(s)=>{s=Math.round(s);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};

/* ------------------------------------------------------------------ Formularzustand */
function F(){const f=A.form('boxF');if(!f.date)f.date=A.today();if(f.tn==null){f.tn=3;f.ts=180;f.tr=60}f.secs=f.secs||{};return f}
A.action('bxrpe',(el)=>{const f=F();const v=+el.dataset.v;f.rpe=f.rpe===v?null:v;render()});
A.action('bxmin',(el)=>{const f=F();f.min=el.dataset.v;render()});
A.action('bxfront',(el)=>{S.body.boxFront=el.dataset.v;A.save('Vorderer Fuß gespeichert')});
A.action('bxstep',(el)=>{const f=F();const [k,d]=el.dataset.v.split('|');const lim={tn:[1,20],ts:[30,600],tr:[0,300]}[k];const st=k==='tn'?1:k==='ts'?15:10;f[k]=Math.max(lim[0],Math.min(lim[1],(+f[k]||0)+(+d)*st));render()});
A.input('bx',(k,v)=>{const f=F();if(k.startsWith('sec.')){f.secs[k.slice(4)]=v;return}if(k.startsWith('n_')){f.notes=f.notes||{};f.notes[k.slice(2)]=v;return}f[k]=v});

/* ------------------------------------------------------------------ Auswertung */
function stats(){const t=A.today();const all=A.boxSessions();const in30=all.filter(s=>A.dd(t,s.date)<30&&A.dd(t,s.date)>=0);
  const withMin=in30.filter(s=>s.min);const rp=in30.filter(s=>s.rpe);const rounds=in30.filter(s=>s.rounds&&s.rounds.n);
  const weeks=[];for(let w=9;w>=0;w--)weeks.push(all.filter(s=>{const d=A.dd(t,s.date);return d>=w*7&&d<(w+1)*7}).reduce((a,s)=>a+(s.min||0),0));
  const secMin={};for(const s of in30)for(const x of s.secs||[])secMin[x.k]=(secMin[x.k]||0)+(x.min||0);
  return{all,n30:in30.length,min30:withMin.reduce((a,s)=>a+s.min,0),missingMin:in30.length-withMin.length,
    rpeAvg:rp.length?rp.reduce((a,s)=>a+s.rpe,0)/rp.length:null,rpeN:rp.length,
    roundsTot:rounds.reduce((a,s)=>a+s.rounds.n,0),roundsN:rounds.length,last:all[0]||null,weeks,secMin,
    est:in30.filter(s=>s.minSrc==='geschätzt').length}}
A.boxStats=stats;

/* ------------------------------------------------------------------ Speichern / Löschen */
A.action('bxsave',()=>{const f=F();const t=A.today();const date=f.date||t;
  if(date>t){A.toast('Das Datum liegt in der Zukunft');return}
  try{const ce=A.complaintFormError&&A.complaintFormError();if(ce){A.toast(ce);return}}catch(_){}
  const secs=SEC.map(([k])=>({k,min:A.n(f.secs[k])})).filter(s=>s.min!=null&&s.min>0).map(s=>({k:s.k,min:Math.round(s.min)}));
  const rn=Math.round(A.n(f.rn)||0),rs=Math.round(A.n(f.rs)||0),rr=Math.round(A.n(f.rr)||0);
  const rounds=rn>0&&rs>0?{n:Math.min(rn,60),sec:Math.min(rs,900),rest:Math.min(rr,600),src:f.rSrc||'eingegeben'}:null;
  let min=A.n(f.min),minSrc=f.minEst?'geschätzt':'eingegeben';
  if(!(min>0)){min=null;if(secs.length){min=secs.reduce((a,s)=>a+s.min,0);minSrc='berechnet (Abschnitte)'}else if(rounds){min=Math.round((rounds.n*rounds.sec+Math.max(0,rounds.n-1)*rounds.rest)/60);minSrc='berechnet (Runden)'}}
  if(!(min>0)||min>480){A.toast('Dauer eingeben (1–480 min) – oder Abschnitte bzw. Runden');return}
  const notes={};for(const k of ['tech','cond','mood','body']){const v=(f.notes&&f.notes[k]||'').trim();if(v)notes[k]=v.slice(0,600)}
  const rec={id:A.uid(),date,t:Date.now(),min:Math.round(min),minSrc};
  if(f.rpe)rec.rpe=f.rpe;if(secs.length)rec.secs=secs;if(rounds)rec.rounds=rounds;
  const combos=(f.combos||'').trim();if(combos)rec.combos=combos.slice(0,300);if(Object.keys(notes).length)rec.notes=notes;
  if(S.body&&S.body.boxFront)rec.front=S.body.boxFront;
  A.arr('boxing').push(rec);
  A.arr('activities').push({id:A.uid(),date,type:'Boxen',min:rec.min,source:'box',boxId:rec.id});
  let cmp=0;try{if(A.saveComplaintFromForm)cmp=A.saveComplaintFromForm({boxId:rec.id,date,sport:'Boxen',phase:'nach'})}catch(e){A.warn(e,'box-cmp')}
  ui.apx.boxF={date:t,tn:f.tn,ts:f.ts,tr:f.tr,secs:{}};
  A.save(`Boxen gespeichert · ${rec.min} min${cmp?' · Beschwerden notiert':''}`)});
A.action('bxdel',(el)=>{const id=el.dataset.v;S.boxing=A.list('boxing').filter(b=>b.id!==id);S.activities=A.list('activities').filter(a=>a.boxId!==id);
  for(const c of A.list('complaints'))if(c.boxId===id)c.boxId=null;A.save('Einheit gelöscht – Beschwerden bleiben im Verlauf')});

/* ------------------------------------------------------------------ Runden-Timer */
const RT={on:false,phase:'',i:0,end:0,done:0,cfg:null,iv:0};
const beepSafe=()=>{try{beep()}catch(_){}try{navigator.vibrate&&navigator.vibrate(120)}catch(_){}};
function rtFinish(msg){clearInterval(RT.iv);RT.iv=0;RT.on=false;const f=F();
  if(RT.done>0){f.rn=RT.done;f.rs=RT.cfg.sec;f.rr=RT.cfg.rest;f.rSrc='Timer';if(!f.min){f.min=String(Math.max(1,Math.round((RT.done*RT.cfg.sec+Math.max(0,RT.done-1)*RT.cfg.rest)/60)));f.minEst=true}}
  A.toast(msg||(RT.done?`${RT.done} Runden gemessen`:'Timer beendet'));render()}
function rtTick(){if(!RT.on)return;const rem=Math.ceil((RT.end-Date.now())/1000);
  if(rem<=0){beepSafe();const c=RT.cfg;
    if(RT.phase==='ready'){RT.phase='work';RT.end=Date.now()+c.sec*1000}
    else if(RT.phase==='work'){RT.done=RT.i;if(RT.i>=c.n){beepSafe();rtFinish('Fertig – '+c.n+' Runden');return}if(c.rest>0){RT.phase='rest';RT.end=Date.now()+c.rest*1000}else{RT.i++;RT.phase='work';RT.end=Date.now()+c.sec*1000}}
    else{RT.i++;RT.phase='work';RT.end=Date.now()+c.sec*1000}
    render();return}
  if(RT.phase==='work'&&rem===10)beepSafe();
  const tx=document.getElementById('bxtTime');if(tx)tx.textContent=mmss(rem)}
A.action('bxtstart',()=>{const f=F();const n=Math.max(1,Math.min(20,+f.tn||3)),sec=Math.max(30,Math.min(600,+f.ts||180)),rest=Math.max(0,Math.min(300,+f.tr||0));
  RT.cfg={n,sec,rest};RT.on=true;RT.i=1;RT.done=0;RT.phase='ready';RT.end=Date.now()+5000;clearInterval(RT.iv);RT.iv=setInterval(rtTick,250);beepSafe();render()});
A.action('bxtstop',()=>{rtFinish()});
function timerPanel(){const f=F();
  if(RT.on){const c=RT.cfg;const rem=Math.max(0,Math.ceil((RT.end-Date.now())/1000));
    const lab=RT.phase==='ready'?'Gleich geht’s los':RT.phase==='work'?`Runde ${RT.i} von ${c.n}`:`Pause · danach Runde ${RT.i+1}`;
    return`<section class="panel" data-nofold="1" style="border-color:var(--accent)"><span class="eyebrow">Runden-Timer</span><h2>${lab}</h2>
      <div class="timer" id="bxtTime" aria-live="off">${mmss(rem)}</div>
      <p class="small mute" style="text-align:center">${c.n} × ${mmss(c.sec)}${c.rest?` · Pause ${mmss(c.rest)}`:''} · gemessen: ${RT.done} Runden</p>
      <div class="row" style="justify-content:center"><button class="danger" data-apx="bxtstop">Beenden</button></div></section>`}
  const st=(k,l,val)=>`<div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap"><span style="flex:1">${l}</span><button class="sm" data-apx="bxstep" data-v="${k}|-1" aria-label="${l} weniger">−</button><b class="num" style="min-width:56px;text-align:center">${val}</b><button class="sm" data-apx="bxstep" data-v="${k}|1" aria-label="${l} mehr">+</button></div>`;
  return`<section class="panel"><h2>Runden-Timer</h2>
    <p class="small mute">Misst Runden mit Glocke und Pause. Nach dem Training landen die tatsächlich gelaufenen Runden automatisch im Formular – als „Timer“ markiert.</p>
    ${st('tn','Runden',f.tn)}${st('ts','Rundendauer',mmss(f.ts))}${st('tr','Pause',mmss(f.tr))}
    <div class="row"><button class="primary" data-apx="bxtstart">Timer starten</button></div></section>`}

/* ------------------------------------------------------------------ Ansicht */
const row=(a,b)=>`<div class="item"><div class="main">${a}</div>${b||''}</div>`;
function formPanel(){const f=F();const t=A.today();
  const mins=[30,45,60,75,90];const secTot=SEC.reduce((a,[k])=>a+(A.n(f.secs[k])||0),0);
  const roundsMin=(+f.rn>0&&+f.rs>0)?Math.round((f.rn*f.rs+Math.max(0,f.rn-1)*(+f.rr||0))/60):0;
  const derived=!(A.n(f.min)>0)?(secTot>0?`${Math.round(secTot)} min (aus Abschnitten)`:roundsMin?`${roundsMin} min (aus Runden)`:''):'';
  return`<section class="panel" data-nofold="1"><h2>Einheit erfassen</h2>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
      <label class="f">Datum<input type="date" data-apxf="bx:date" value="${E(f.date||t)}" max="${t}"></label>
      <label class="f">Dauer gesamt (min)<input inputmode="numeric" data-apxf="bx:min" value="${E(f.min??'')}" placeholder="${derived?E(derived):'z. B. 60'}"></label></div>
    <div class="chips" aria-label="Schnellwahl Dauer">${mins.map(m=>`<button data-apx="bxmin" data-v="${m}" aria-pressed="${String(f.min)===String(m)}">${m}</button>`).join('')}</div>
    <label class="row small" style="gap:6px"><input type="checkbox" data-apxf="bx:minEst" ${f.minEst?'checked':''}> Dauer ist geschätzt</label>
    <span class="eyebrow">Anstrengung (optional) ${f.rpe?`· ${f.rpe}/10 ${RPE_TXT[f.rpe]}`:''}</span>
    <div class="chips" aria-label="Subjektive Anstrengung">${[1,2,3,4,5,6,7,8,9,10].map(v=>`<button data-apx="bxrpe" data-v="${v}" aria-pressed="${f.rpe===v}">${v}</button>`).join('')}</div>
    <details ${f.secs&&Object.values(f.secs).some(v=>v)||f.rn?'open data-keep="1"':''}><summary>Abschnitte &amp; Runden <span class="small mute">optional</span></summary><div>
      <p class="small mute">Nur ausfüllen, was du wirklich weißt – leere Felder bleiben leer und werden nicht geschätzt.</p>
      <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">${SEC.map(([k,l])=>`<label class="f">${l} (min)<input inputmode="numeric" data-apxf="bx:sec.${k}" value="${E(f.secs[k]??'')}"></label>`).join('')}</div>
      <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">
        <label class="f">Runden<input inputmode="numeric" data-apxf="bx:rn" value="${E(f.rn??'')}"></label>
        <label class="f">Rundendauer (s)<input inputmode="numeric" data-apxf="bx:rs" value="${E(f.rs??'')}" placeholder="180"></label>
        <label class="f">Pause (s)<input inputmode="numeric" data-apxf="bx:rr" value="${E(f.rr??'')}" placeholder="60"></label></div>
      ${f.rSrc==='Timer'?`<p class="small">${A.pill('gemessen mit Timer','ok')}</p>`:''}
      <label class="f">Kombinationen / geübte Schläge (Notiz)<input data-apxf="bx:combos" value="${E(f.combos??'')}" placeholder="z. B. 1-2, 1-2-3-2, Doppel-Jab"></label>
      <p class="small mute">Schläge werden nicht gezählt – die App hat dafür keine Messung, deshalb nur als Notiz.</p></div></details>
    <details ${f.notes&&Object.values(f.notes).some(v=>v)?'open data-keep="1"':''}><summary>Notizen <span class="small mute">Technik · Kondition · Stimmung · Befinden</span></summary><div>
      ${[['tech','Technik'],['cond','Kondition'],['mood','Stimmung'],['body','Körperliches Befinden']].map(([k,l])=>`<label class="f">${l}<input data-apxf="bx:n_${k}" value="${E((f.notes&&f.notes[k])||'')}"></label>`).join('')}</div></details>
    ${A.complaintMini?A.complaintMini('box'):''}
    <button class="primary big" data-apx="bxsave" style="width:100%;margin-top:10px">Einheit speichern</button></section>`}

function kpiPanel(){const K=stats();const front=S.body&&S.body.boxFront;
  const rpeKpi=K.rpeAvg!=null?kpi('Ø Anstrengung',A.de(K.rpeAvg),'/ 10',`<span class="d mute">${K.rpeN} von ${K.n30} Einheiten mit Angabe</span>`):kpi('Ø Anstrengung','–','',`<span class="d mute">noch keine Angabe</span>`);
  return`<section class="panel"><h1>Boxen</h1>
    <div class="kpis">${kpi('Einheiten 30 T',K.n30)}${kpi('Minuten 30 T',K.min30,'min',K.missingMin?`<span class="d mute">${K.missingMin} Einheit${K.missingMin>1?'en':''} ohne Dauer</span>`:K.est?`<span class="d mute">${K.est} davon geschätzt</span>`:'')}${rpeKpi}${kpi('Runden 30 T',K.roundsN?K.roundsTot:'–','',`<span class="d mute">${K.roundsN?`nur erfasste, aus ${K.roundsN} Einheiten`:'noch keine erfasst'}</span>`)}</div>
    ${K.weeks.some(x=>x>0)?`<span class="eyebrow">Minuten pro Woche · 10 Wochen</span>${typeof spark==='function'?spark(K.weeks,220,36):''}`:''}
    ${K.last?`<p class="small mute">Letzte Einheit: ${A.fmtD(K.last.date)}${K.last.min?` · ${K.last.min} min`:''}${K.last.ext?' (importiert)':''}</p>`:'<p class="small mute">Noch keine Einheit erfasst.</p>'}
    <span class="eyebrow">Auslage</span>
    <div class="chips" aria-label="Vorderer Fuß">${[['L','Vorderer Fuß links'],['R','Vorderer Fuß rechts'],['','Keine Angabe']].map(([k,l])=>`<button data-apx="bxfront" data-v="${k}" aria-pressed="${(front||'')===k}">${l}</button>`).join('')}</div>
    <p class="small mute">Wird nur für Hinweise im Companion genutzt (z. B. welche Seite die Führhand-Seite ist).</p></section>`}

function secSummary(K){const e=SEC.filter(([k])=>K.secMin[k]);if(!e.length)return'';
  return`<section class="panel"><h2>Abschnitte · 30 Tage</h2><p class="small mute">Summe der eingetragenen Minuten – nur Einheiten, in denen du Abschnitte erfasst hast.</p>
    <div class="list">${e.map(([k,l])=>`<div class="item"><div class="main"><div class="t">${l}</div></div><span class="num">${K.secMin[k]} min</span></div>`).join('')}</div></section>`}

function historyPanel(){const L=A.boxSessions().slice(0,40);const cmp=A.list('complaints');
  return`<section class="panel"><h2>Verlauf</h2>${L.length?`<div class="list">${L.map(s=>{
    const pills=[];if(s.ext)pills.push(A.pill('importiert'));else{if(s.minSrc&&s.minSrc!=='eingegeben')pills.push(A.pill(s.minSrc,'warn'));if(s.rounds&&s.rounds.src==='Timer')pills.push(A.pill('Timer','ok'))}
    if(s.rpe)pills.push(A.pill(`Anstrengung ${s.rpe}/10`,s.rpe>=9?'warn':'info'));
    const lines=[];if(s.secs&&s.secs.length)lines.push(s.secs.map(x=>`${SECL[x.k]} ${x.min}′`).join(' · '));
    if(s.rounds)lines.push(`${s.rounds.n} Runden × ${mmss(s.rounds.sec)}${s.rounds.rest?`, Pause ${mmss(s.rounds.rest)}`:''}`);
    if(s.combos)lines.push('Kombis: '+E(s.combos));
    const nt=s.notes||{};const nl=[['tech','Technik'],['cond','Kondition'],['mood','Stimmung'],['body','Befinden']].filter(([k])=>nt[k]).map(([k,l])=>`${l}: ${E(nt[k])}`);
    const cps=cmp.filter(c=>c.boxId===s.id).flatMap(c=>(c.regs||[]).map(r=>`${r.reg}${r.side&&r.side!=='M'?' '+A.sideTxt(r.side):''}`));
    return`<div class="item" style="align-items:flex-start"><span class="num mute">${A.fmtD(s.date)}</span><div class="main"><div class="t">${s.min?s.min+' min':'Dauer offen'} ${pills.join(' ')}</div>
      ${lines.length?`<div class="small mute">${lines.join(' · ')}</div>`:''}${nl.length?`<div class="small mute">${nl.join(' · ')}</div>`:''}${cps.length?`<div class="small">${A.pill('Beschwerden: '+[...new Set(cps)].join(', '),'warn')}</div>`:''}</div>
      ${s.ext?'':`<button class="sm ghost" data-apx="bxdel" data-v="${s.id}" aria-label="Einheit löschen">✕</button>`}</div>`}).join('')}</div>`:'<p class="small mute">Noch keine Einheiten.</p>'}</section>`}

VIEWS.boxen=function(){const K=stats();
  let comp='',bes='';try{if(A.companionPanel)comp=A.companionPanel('box')}catch(e){A.warn(e,'box-companion')}
  try{if(A.complaintPanel)bes=A.complaintPanel('box')}catch(e){A.warn(e,'box-complaints')}
  return kpiPanel()+formPanel()+timerPanel()+bes+comp+secSummary(K)+historyPanel()};

/* ------------------------------------------------------------------ Kurzkarte in der Trainingsübersicht */
function quickCard(){if(A.isHidden('boxen'))return'';const K=stats();
  const ago=K.last?A.dd(A.today(),K.last.date):null;
  return`<section class="panel" id="apxBoxCard"><div class="row between"><div><span class="eyebrow">Boxen</span><div class="t">${K.last?`Letzte Einheit ${ago===0?'heute':ago===1?'gestern':'vor '+ago+' Tagen'}${K.last.min?` · ${K.last.min} min`:''}`:'Noch keine Einheit erfasst'}</div>
    <div class="small mute">${K.n30} Einheit${K.n30===1?'':'en'} in 30 Tagen</div></div><div class="row"><button class="primary" data-tab="boxen" data-sub="sport">Einheit erfassen</button></div></div></section>`}
{const _lg=VIEWS.log;VIEWS.log=function(){const h=_lg.apply(this,arguments);if(ui.gymMode)return h;let c='';try{c=quickCard()}catch(e){A.warn(e,'box-card')}
  if(!c)return h;const i=h.indexOf('<section class="panel');if(i<0)return h;const j=h.indexOf('</section>',i);return j<0?h:h.slice(0,j+10)+c+h.slice(j+10)}}
})();
