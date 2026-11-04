/* APEX Lift · Beschwerden nach dem Training (Nov 2026)
   Persönliche Trainingsnotiz, keine Diagnose: Region, Seite, Stärke (eigene Stufe oder 0–10), Zeitpunkt, verknüpfte Einheit.
   Im Verlauf lässt sich vergleichen, ob sich etwas verändert. Aktive Beschwerden filtern die Übungsvorschläge (ApexBox.safe).
   Daten: S.complaints = [{id,date,t,ctx,phase,boxId,regs:[{reg,side,lvl|nrs|rel,main}],note}] – synchronisiert wie alle Listen mit id. */
(function(){
'use strict';
if(window.__apexBeschw)return;window.__apexBeschw=1;
const A=window.ApexBox;if(!A){console.warn('apex-beschwerden: Kern fehlt');return}
const E=A.esc;
A.registerModule('beschw','Beschwerden','Nach dem Training notieren, Verlauf vergleichen',{after:'prehab',sport:false});

const PHASES=[['während','Während'],['nach','Direkt nach dem Training'],['folgetag','Am Folgetag'],['später','Später / allgemein']];
const CTX=[['Boxen','Boxen'],['Krafttraining','Krafttraining'],['Laufen','Laufen'],['Sonstiges','Sonstiges']];
const FAST=['Schulter','Handgelenk / Hand','Nacken','Oberer Rücken','Rippen / Rumpf','Ellenbogen'];
const SEV_CLS=['ok','info','warn','bad'];
const keyOf=(reg,side)=>reg+'|'+(side||'M');
const regTxt=(reg,side)=>reg+(side&&side!=='M'?' '+A.sideTxt(side):'');
const descr=(r)=>typeof r.nrs==='number'?r.nrs+'/10':typeof r.lvl==='number'?A.LVL[r.lvl]:r.rel==='haupt'?'Hauptbeschwerde':r.rel==='leicht'?'etwas':'ohne Stärke';

/* ------------------------------------------------------------------ Formularzustand (Mini-Formular, auch im Boxen-Formular) */
function CF(){const f=A.form('cmpF');if(!f.sel)f.sel={};if(!f.phase)f.phase='nach';if(!f.date)f.date=A.today();if(!f.ctx)f.ctx='Boxen';return f}
A.action('cmptog',(el)=>{const f=CF();const k=el.dataset.v;if(f.sel[k])delete f.sel[k];else f.sel[k]={lvl:null,nrs:'',main:false};render()});
A.action('cmplvl',(el)=>{const f=CF();const [k,l]=el.dataset.v.split('#');if(f.sel[k]){f.sel[k].lvl=+l;f.sel[k].nrs=''}render()});
A.action('cmpmain',(el)=>{const f=CF();const k=el.dataset.v;if(f.sel[k])f.sel[k].main=!f.sel[k].main;render()});
A.action('cmpphase',(el)=>{CF().phase=el.dataset.v;render()});
A.action('cmpctx',(el)=>{const f=CF();f.ctx=el.dataset.v;f.link=undefined;render()});
A.input('cm',(k,v)=>{const f=CF();if(k.startsWith('nrs.')){const kk=k.slice(4);if(f.sel[kk]){f.sel[kk].nrs=v;const n=A.n(v);if(n!=null)f.sel[kk].lvl=n<=0?0:n<=3?1:n<=6?2:3}return}f[k]=v});

/* Fehlermeldung, falls die Eingabe unvollständig ist (Stärke fehlt) – sonst null */
A.complaintFormError=()=>{const f=CF();for(const k of Object.keys(f.sel)){if(f.sel[k].lvl==null){const [reg,side]=k.split('|');return`Stärke für „${regTxt(reg,side)}“ wählen`}}return null};

function buildEntry(o){const f=CF();const regs=Object.keys(f.sel).map(k=>{const [reg,side]=k.split('|');const v=f.sel[k];const r={reg,lvl:v.lvl};if(side!=='M')r.side=side;const n=A.n(v.nrs);if(n!=null&&n>=0&&n<=10)r.nrs=Math.round(n*10)/10;if(v.main)r.main=true;return r});
  const rec={id:A.uid(),date:o.date||f.date||A.today(),t:Date.now(),ctx:o.sport||f.ctx||'Boxen',phase:o.phase||f.phase||'nach',regs};
  const bid=o.boxId!==undefined?o.boxId:f.link;if(bid)rec.boxId=bid;const note=(f.note||'').trim();if(note)rec.note=note.slice(0,600);return rec}
A.saveComplaintFromForm=(o={})=>{const f=CF();if(!Object.keys(f.sel).length)return 0;if(A.complaintFormError())return 0;
  A.arr('complaints').push(buildEntry(o));ui.apx.cmpF={sel:{},phase:'nach',date:A.today(),ctx:'Boxen'};return 1};

/* ------------------------------------------------------------------ Auswahl-Bausteine */
function regionPicker(){const f=CF();const chip=(reg,side,hasSides)=>{const k=keyOf(reg,side);return`<button data-apx="cmptog" data-v="${E(k)}" aria-pressed="${!!f.sel[k]}">${E(regTxt(reg,side))}</button>`};
  const chipsFor=(reg)=>{const r=A.REGS.find(x=>x[0]===reg);return r[1]?chip(reg,'L')+chip(reg,'R'):chip(reg,'M')};
  const more=A.REGS.map(r=>r[0]).filter(r=>!FAST.includes(r));
  const sel=Object.keys(f.sel);
  return`<div class="chips" aria-label="Betroffene Stellen">${FAST.map(chipsFor).join('')}</div>
    <details data-keep="1" ${more.some(r=>sel.some(k=>k.startsWith(r+'|')))?'open':''}><summary>Weitere Stellen</summary><div class="chips">${more.map(chipsFor).join('')}</div></details>
    ${sel.length?`<div class="list">${sel.map(k=>{const [reg,side]=k.split('|');const v=f.sel[k];
      return`<div class="item" style="align-items:flex-start"><div class="main"><div class="t">${E(regTxt(reg,side))}</div>
        <div class="chips" aria-label="Stärke ${E(regTxt(reg,side))}">${A.LVL.map((l,i)=>`<button data-apx="cmplvl" data-v="${E(k)}#${i}" aria-pressed="${v.lvl===i}">${l}</button>`).join('')}</div>
        <div class="row" style="gap:8px;align-items:center"><label class="f" style="flex:0 0 110px">oder 0–10 <input inputmode="decimal" data-apxf="cm:nrs.${E(k)}" value="${E(v.nrs??'')}" placeholder="optional"></label>
        <button class="sm ghost" data-apx="cmpmain" data-v="${E(k)}" aria-pressed="${!!v.main}">${v.main?'★':'☆'} Hauptbeschwerde</button></div></div></div>`}).join('')}</div>`:'<p class="small mute">Tippe die Stellen an, an denen du etwas spürst.</p>'}`}

/* kompaktes Formular für das Boxen-Formular */
A.complaintMini=()=>{const f=CF();const has=Object.keys(f.sel).length>0;
  return`<details ${has?'open data-keep="1"':''}><summary>Beschwerden / Schmerzen <span class="small mute">optional</span></summary><div>
    <p class="small mute">Persönliche Notiz zu dieser Einheit – keine Diagnose.</p>
    <div class="chips" aria-label="Zeitpunkt">${PHASES.slice(0,3).map(([k,l])=>`<button data-apx="cmpphase" data-v="${k}" aria-pressed="${f.phase===k}">${l}</button>`).join('')}</div>
    ${regionPicker()}
    ${has?`<label class="f">Notiz<input data-apxf="cm:note" value="${E(f.note||'')}" placeholder="z. B. beim Schlagen auf den Sandsack"></label>`:''}</div></details>`};

/* ------------------------------------------------------------------ Auswertung: Verlauf je Stelle, Vergleich, Warnstufe */
function byRegion(){const L=A.list('complaints').slice().sort((a,b)=>(a.date+String(a.t||0).padStart(15,'0'))<(b.date+String(b.t||0).padStart(15,'0'))?-1:1);const m={};
  for(const c of L)for(const r of c.regs||[]){const k=keyOf(r.reg,r.side);(m[k]=m[k]||[]).push({date:c.date,r,c})}return m}
function verdict(prev,cur){const a=A.sevOf(prev),b=A.sevOf(cur);
  if(b===0)return{k:'frei',txt:'beschwerdefrei'};
  if(typeof prev.nrs==='number'&&typeof cur.nrs==='number'){const d=cur.nrs-prev.nrs;return Math.abs(d)<2?{k:'gleich',txt:'ähnlich'}:d<0?{k:'besser',txt:'besser'}:{k:'schlechter',txt:'stärker'}}
  return b<a?{k:'besser',txt:'besser'}:b>a?{k:'schlechter',txt:'stärker'}:{k:'gleich',txt:'ähnlich'}}
function analyse(){const out=[];const t=A.today();
  for(const[k,arr]of Object.entries(byRegion())){const [reg,side]=k.split('|');const cur=arr[arr.length-1],prev=arr.length>1?arr[arr.length-2]:null;const seq=arr.map(x=>A.sevOf(x.r));
    const last=seq[seq.length-1];let streak=arr.length-1;while(streak>0&&seq[streak-1]>0)streak--;const since=arr[streak].date;
    const rising=seq.length>=2&&last>=2&&last>seq[seq.length-2]||(seq.length>=3&&last>=2&&seq[seq.length-3]<=seq[seq.length-2]&&seq[seq.length-2]<=last&&last>seq[seq.length-3]);
    const persistent=last>=1&&A.dd(t,since)>=14&&arr.length>=2;
    out.push({key:k,reg,side,cur,prev,seq,last,since,rising,persistent,strong:last>=3,v:prev?verdict(prev.r,cur.r):null,n:arr.length})}
  return out.sort((a,b)=>b.last-a.last||(a.cur.date<b.cur.date?1:-1))}
A.complaintAnalysis=analyse;

function cautionHtml(an){const flag=an.filter(x=>x.last>0&&(x.strong||x.rising||x.persistent));if(!flag.length)return'';
  const why=flag.map(x=>`${regTxt(x.reg,x.side)}: ${x.strong?'stark':x.rising?'zunehmend':'seit '+A.dd(A.today(),x.since)+' Tagen anhaltend'}`).join(' · ');
  return`<div class="banner" role="note"><p><strong>Das ist ein Anlass, das Training anzupassen.</strong> ${E(why)}. Ein paar Ideen: weniger Schlagvolumen oder Sparring pausieren, Technikrunden mit halbem Tempo, belastende Übungen für diese Stelle auslassen – und bei Bedarf ärztlichen oder physiotherapeutischen Rat einholen. Die App kann die Ursache nicht bestimmen.</p></div>`}
const REDFLAG='Bitte zeitnah ärztlich abklären lassen: Taubheit oder Kribbeln, ausstrahlende Schmerzen, deutliche Schwellung oder Fehlstellung, plötzlicher Kraftverlust, Schmerzen in Ruhe oder nachts sowie Kopfschmerz, Schwindel oder Übelkeit nach Schlägen an den Kopf.';

/* ------------------------------------------------------------------ Ansichten */
const sevPill=(r)=>`<span class="pill ${SEV_CLS[A.sevOf(r)]}">${E(descr(r))}</span>`;
function statusList(an,limit){const rows=an.filter(x=>x.last>0||A.dd(A.today(),x.cur.date)<=14).slice(0,limit||99);
  if(!rows.length)return'<p class="small mute">Aktuell keine Beschwerden eingetragen.</p>';
  return`<div class="list">${rows.map(x=>`<div class="item" style="align-items:flex-start"><div class="main"><div class="t">${E(regTxt(x.reg,x.side))} ${sevPill(x.cur.r)}${x.cur.r.main&&x.cur.r.rel!=='haupt'?' <span class="small mute">★ Hauptbeschwerde</span>':''}</div>
    <div class="small mute">Stand ${A.fmtD(x.cur.date)}${x.cur.c.ctx?' · '+E(x.cur.c.ctx):''}${x.cur.c.first?' · nach dem ersten Training':''}${x.prev?` · vorher ${E(descr(x.prev.r))} (${A.fmtD(x.prev.date)}) → <strong>${x.v.txt}</strong>`:''}</div></div>
    ${typeof spark==='function'&&x.seq.length>1?spark(x.seq,64,22):''}</div>`).join('')}</div>`}

A.complaintPanel=()=>{const an=analyse();const act=an.filter(x=>x.last>0);
  return`<section class="panel"><div class="row between"><h2>Beschwerden</h2><button class="sm" data-tab="beschw">Eintragen &amp; Verlauf</button></div>
    ${statusList(an,4)}${cautionHtml(an)}
    <p class="small mute">Persönliche Trainingsnotiz, keine Diagnose.${act.length?' Übungen, die diese Stellen belasten, blendet der Companion aus oder entschärft er.':''}</p></section>`};

function formPanel(){const f=CF();const t=A.today();
  const own=A.list('boxing').filter(b=>A.dd(f.date,b.date)>=0&&A.dd(f.date,b.date)<=21).sort((a,b)=>a.date<b.date?1:-1);
  if(f.link===undefined){const near=own.find(b=>A.dd(f.date,b.date)<=2);f.link=f.ctx==='Boxen'&&near?near.id:''}
  return`<section class="panel" data-nofold="1"><h2>Beschwerden eintragen</h2>
    <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><label class="f">Datum<input type="date" data-apxf="cm:date" value="${E(f.date)}" max="${t}"></label>
      ${f.ctx==='Boxen'&&own.length?`<label class="f">Zur Einheit<select data-apxf="cm:link"><option value="">keine bestimmte</option>${own.map(b=>`<option value="${b.id}" ${f.link===b.id?'selected':''}>${A.fmtD(b.date)} · ${b.min||'?'} min</option>`).join('')}</select></label>`:''}</div>
    <span class="eyebrow">Nach welchem Training?</span><div class="chips">${CTX.map(([k,l])=>`<button data-apx="cmpctx" data-v="${k}" aria-pressed="${f.ctx===k}">${l}</button>`).join('')}</div>
    <span class="eyebrow">Zeitpunkt</span><div class="chips">${PHASES.map(([k,l])=>`<button data-apx="cmpphase" data-v="${k}" aria-pressed="${f.phase===k}">${l}</button>`).join('')}</div>
    <span class="eyebrow">Wo und wie stark?</span>${regionPicker()}
    <label class="f">Notiz<input data-apxf="cm:note" value="${E(f.note||'')}" placeholder="z. B. nach dem Pratzentraining, beim Heben über Kopf"></label>
    <p class="small mute">Gleiche Stelle später nochmal eintragen – dann zeigt der Verlauf, ob es besser oder stärker wird. „Keine“ als Stärke markiert eine Stelle als beschwerdefrei.</p>
    <button class="primary big" style="width:100%" data-apx="cmpsave">Eintrag speichern</button></section>`}
A.action('cmpsave',()=>{const f=CF();if(!Object.keys(f.sel).length){A.toast('Erst eine Stelle antippen');return}const er=A.complaintFormError();if(er){A.toast(er);return}
  const link=f.link||null;const n=A.saveComplaintFromForm({boxId:link});if(n)A.save('Beschwerden gespeichert')});
A.action('cmpdel',(el)=>{S.complaints=A.list('complaints').filter(c=>c.id!==el.dataset.v);A.save('Eintrag gelöscht')});

function historyPanel(){const L=A.list('complaints').slice().sort((a,b)=>(a.date+String(a.t||0))<(b.date+String(b.t||0))?1:-1).slice(0,40);
  return`<section class="panel"><h2>Verlauf</h2>${L.length?`<div class="list">${L.map(c=>`<div class="item" style="align-items:flex-start"><span class="num mute">${A.fmtD(c.date)}</span><div class="main">
    <div class="t">${(c.regs||[]).map(r=>`${E(regTxt(r.reg,r.side))} ${sevPill(r)}`).join(' · ')}</div>
    <div class="small mute">${E(c.ctx||'')}${c.phase?' · '+E((PHASES.find(p=>p[0]===c.phase)||[0,c.phase])[1]):''}${c.first?' · erstes Training':''}${c.boxId?' · mit Einheit verknüpft':''}</div>${c.note?`<div class="small">${E(c.note)}</div>`:''}</div>
    <button class="sm ghost" data-apx="cmpdel" data-v="${c.id}" aria-label="Eintrag löschen">✕</button></div>`).join('')}</div>`:'<p class="small mute">Noch keine Einträge.</p>'}</section>`}

VIEWS.beschw=function(){const an=analyse();
  return`<section class="panel"><h1>Beschwerden</h1><p class="small mute">Persönliche Trainingsnotiz – keine Diagnose. Die App kann Ursachen nicht bestimmen, sie zeigt nur, ob sich etwas verändert.</p>
    ${statusList(an)}${cautionHtml(an)}</section>`+formPanel()+historyPanel()+
   `<section class="panel"><h2>Wann ärztlichen Rat einholen?</h2><p class="small">${E(REDFLAG)}</p><p class="small mute">Bei starken, zunehmenden oder länger anhaltenden Beschwerden: Training anpassen und professionell abklären lassen, statt durchzuhalten.</p></section>`};
})();
