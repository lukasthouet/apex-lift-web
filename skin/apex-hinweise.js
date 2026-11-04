/* APEX Lift · Hinweise zu Schlaf, Aktivität und Mobility (Nov 2026)
   Drei einstellbare Hinweise. Grundsatz: Es wird nur gewarnt, wenn genug erfasste Daten da sind – sonst erklärt die App,
   wie viele Einträge noch fehlen. Neutrale Sprache, keine Schuldzuweisung; jeder Hinweis lässt sich vertagen oder abschalten.
   Einstellungen: S.prefs.hints.* (Einstellungen → Hinweise). */
(function(){
'use strict';
if(window.__apexHinweise)return;window.__apexHinweise=1;
const A=window.ApexBox;if(!A){console.warn('apex-hinweise: Kern fehlt');return}
const E=A.esc;

/* ------------------------------------------------------------------ Prüfungen: → {state:'off'|'snoozed'|'few'|'ok'|'warn', ...} */
const snoozed=(name)=>{const u=A.pref('hints.snooze.'+name,null);return!!u&&u>=A.today()};
const masterOn=()=>A.pref('hints.on',true)!==false;
const avg=(a)=>a.reduce((x,y)=>x+y,0)/a.length;

function sleepCheck(){const h=A.hint('sleep');if(!masterOn()||!h.on)return{state:'off'};const t=A.today();const V=S.vitals||{};
  const R={sc:[],sm:[]},B={sc:[],sm:[]};
  for(const d of Object.keys(V)){const age=A.dd(t,d);if(age<0||age>=h.days+21)continue;const x=V[d]||{};const tgt=age<h.days?R:B;if(x.sleepScore!=null)tgt.sc.push(x.sleepScore);if(x.sleepMin!=null)tgt.sm.push(x.sleepMin)}
  const ok=(m)=>R[m].length>=4&&B[m].length>=6&&R[m].length+B[m].length>=h.minNights;
  const metric=ok('sc')?'sc':ok('sm')?'sm':null;
  const have=Math.max(R.sc.length+B.sc.length,R.sm.length+B.sm.length);
  if(!metric)return{state:'few',have,need:h.minNights,detail:`${have} von ${h.minNights} nötigen Nächten erfasst (je mindestens 4 im letzten und 6 im davor liegenden Zeitraum)`};
  const r=avg(R[metric]),b=avg(B[metric]);const drop=b-r;const thr=metric==='sc'?h.drop:h.dropMin;
  const base={metric,recent:r,base:b,drop,days:h.days,have};
  if(snoozed('sleep'))return{state:'snoozed',...base};
  return drop>=thr?{state:'warn',...base}:{state:'ok',...base}}

function history(){const st=A.sportStats(120);let first=null;
  for(const d of [...A.list('sets').map(s=>s.date),...A.list('activities').filter(a=>!a.dup&&!a.excl).map(a=>a.date),...A.list('swims').map(s=>s.date),...A.list('boxing').map(b=>b.date)])if(d&&(!first||d<first))first=d;
  return{n:st.total,ageDays:first?A.dd(A.today(),first):0}}
function sick(){try{return typeof sickFlag==='function'?sickFlag():null}catch(_){return null}}

function activityCheck(){const h=A.hint('activity');if(!masterOn()||!h.on)return{state:'off'};const H=history();
  if(H.n<6||H.ageDays<h.days)return{state:'few',detail:`${Math.min(H.n,6)} von 6 Einheiten erfasst${H.ageDays<h.days?`, der erste Eintrag ist erst ${H.ageDays} Tage alt (nötig: ${h.days})`:''}`,have:H.n,need:6};
  const n=A.sportStats(h.days).total;const base={n,days:h.days,min:h.min};
  if(snoozed('activity'))return{state:'snoozed',...base};if(sick())return{state:'ok',...base,sick:true};
  return n<h.min?{state:'warn',...base}:{state:'ok',...base}}

function mobCount(days){const t=A.today();const dates=new Set();for(const s of A.list('mobSessions'))if(A.dd(t,s.date)<days&&A.dd(t,s.date)>=0)dates.add(s.id||s.date+s.routine);
  for(const f of A.list('mobSug'))if(f.act==='done'&&A.dd(t,f.date)<days&&A.dd(t,f.date)>=0)dates.add(f.id);return dates.size}
function mobCheck(){const h=A.hint('mob');if(!masterOn()||!h.on)return{state:'off'};const H=history();
  if(H.n<6||H.ageDays<h.days)return{state:'few',detail:`${Math.min(H.n,6)} von 6 Trainingseinheiten erfasst${H.ageDays<h.days?`, der erste Eintrag ist erst ${H.ageDays} Tage alt (nötig: ${h.days})`:''}`,have:H.n,need:6};
  const n=mobCount(h.days);const base={n,days:h.days,min:h.min};
  if(snoozed('mob'))return{state:'snoozed',...base};return n<h.min?{state:'warn',...base}:{state:'ok',...base}}
A.hintChecks=()=>({sleep:sleepCheck(),activity:activityCheck(),mob:mobCheck()});

/* ------------------------------------------------------------------ Texte */
const sleepTxt=(c)=>c.metric==='sc'?`Deine erfasste Schlafqualität (Score) lag in den letzten ${c.days} Tagen im Schnitt bei ${Math.round(c.recent)}, davor bei ${Math.round(c.base)}.`:`Deine erfasste Schlafdauer lag in den letzten ${c.days} Tagen im Schnitt bei ${A.de(c.recent/60,1)} h, davor bei ${A.de(c.base/60,1)} h.`;
const CARDS={
 sleep:(c)=>({t:'Schlaf: leichte Verschlechterung',x:`${sleepTxt(c)} Das ist nur ein Hinweis, keine Bewertung – ein ruhigerer Abend, feste Zeiten oder etwas weniger Intensität am späten Tag können helfen.`,b:[['Schlaf ansehen','data-tab="sleep"']]}),
 activity:(c)=>({t:'Wenig Bewegung erfasst',x:`In den letzten ${c.days} Tagen ${c.n===0?'ist keine Einheit':'sind '+c.n+' Einheit'+(c.n>1?'en':'')} erfasst. Pausen gehören dazu – das ist nur eine Erinnerung, falls du wieder reinkommen möchtest. Schon eine kurze, lockere Einheit zählt. Falls du trainiert, aber nichts eingetragen hast: gern kurz nachtragen.`,b:[['Einheit eintragen','data-tab="cardio"']]}),
 mob:(c)=>({t:'Mobility war zuletzt selten',x:`In den letzten ${c.days} Tagen ${c.n===0?'ist keine Mobility-Einheit':'sind '+c.n+' Mobility-Einheit'+(c.n>1?'en':'')} erfasst. Schon 5 Minuten reichen zum Dranbleiben – zum Beispiel die Morgen-Routine.`,b:[['Morgen-Routine starten','data-mobstart="morning"'],['Vorschläge ansehen','data-tab="mob"']]})};
A.action('hnsnooze',(el)=>{A.setPref('hints.snooze.'+el.dataset.v,A.add(A.today(),7));A.save('Erinnerung in 7 Tagen wieder')});
A.action('hnoff',(el)=>{A.setPref('hints.'+el.dataset.v+'.on',false);A.save('Hinweis ausgeschaltet – in den Einstellungen wieder einschaltbar')});

function cardFor(name,c){const d=CARDS[name](c);
  return`<div class="item" style="align-items:flex-start;flex-wrap:wrap"><div class="main" style="flex:1 1 240px"><div class="t">${E(d.t)}</div><div class="small">${E(d.x)}</div></div>
    <div class="row" style="gap:6px">${d.b.map(([l,a])=>`<button class="sm" ${a}>${E(l)}</button>`).join('')}<button class="sm ghost" data-apx="hnsnooze" data-v="${name}">In 7 Tagen erinnern</button><button class="sm ghost" data-apx="hnoff" data-v="${name}" title="Diesen Hinweis ausschalten">Ausschalten</button></div></div>`}
function hintsCard(names){const C=A.hintChecks();const act=names.filter(n=>C[n].state==='warn');if(!act.length)return'';
  return`<section class="panel" data-nofold="1" id="apxHints"><span class="eyebrow">Hinweis</span><div class="list">${act.map(n=>cardFor(n,C[n])).join('')}</div>
    <p class="small mute">Aus deinen erfassten Daten berechnet. Schwellen und Zeiträume stellst du unter <button class="sm ghost" data-tab="set">Einstellungen</button> ein.</p></section>`}
function fewLine(name){const c=A.hintChecks()[name];if(!c||c.state!=='few')return'';const lbl={sleep:'Schlaf-Hinweis',activity:'Aktivitäts-Hinweis',mob:'Mobility-Hinweis'}[name];
  return`<p class="small mute" style="margin:6px 0">${lbl}: noch zu wenig Daten – ${E(c.detail)}. Sobald genug Einträge da sind, kann die App Veränderungen erkennen.</p>`}

/* ------------------------------------------------------------------ Einbindung in die Ansichten */
{const _lg=VIEWS.log;VIEWS.log=function(){const h=_lg.apply(this,arguments);if(ui.gymMode)return h;let c='';try{c=hintsCard(['sleep','activity','mob'])}catch(e){A.warn(e,'hints-log')}
  if(!c)return h;const i=h.indexOf('<section class="panel');if(i<0)return h;const j=h.indexOf('</section>',i);return j<0?h:h.slice(0,j+10)+c+h.slice(j+10)}}
{const _m=VIEWS.mob;VIEWS.mob=function(){const h=_m.apply(this,arguments);let c='';try{c=hintsCard(['mob'])+fewLine('mob')}catch(e){A.warn(e,'hints-mob')}return c?c+h:h}}
if(typeof VIEWS.sleep==='function'){const _s=VIEWS.sleep;VIEWS.sleep=function(){const h=_s.apply(this,arguments);let c='';try{c=hintsCard(['sleep'])+fewLine('sleep')}catch(e){A.warn(e,'hints-sleep')}return c?c+h:h}}

/* ------------------------------------------------------------------ Einstellungen */
const opt=(list,cur,fmt)=>list.map(v=>`<option value="${v}" ${+v===+cur?'selected':''}>${fmt?fmt(v):v}</option>`).join('');
const stateTxt=(c)=>({off:'ausgeschaltet',snoozed:'vertagt',few:'noch zu wenig Daten – '+(c.detail||''),ok:c.sick?'in Ordnung (du bist laut Befinden-Notiz krank, deshalb kein Hinweis)':'in Ordnung – kein Hinweis',warn:'Hinweis aktiv'})[c.state]||'';
A.action('hnreset',()=>{if(S.prefs&&S.prefs.hints)delete S.prefs.hints;A.save('Hinweis-Einstellungen zurückgesetzt')});
A.input('hn',(k,v,el)=>{const n=el.type==='checkbox'?!!v:+v;if(!(el.type==='checkbox')&&!isFinite(n))return;A.setPref(k==='on'?'hints.on':'hints.'+k,n);A.save()});
function settingsPanel(){const C=A.hintChecks();const s=A.hint('sleep'),a=A.hint('activity'),m=A.hint('mob');const on=masterOn();const days=[3,5,7,10,14,21,28];
  const blk=(name,title,body,c)=>`<div class="item" style="align-items:flex-start;flex-wrap:wrap"><div class="main" style="flex:1 1 260px"><div class="t">${title}</div><div class="small mute">Status: ${E(stateTxt(c))}</div>${body}</div></div>`;
  return`<section class="panel" id="apxHintSet"><h2>Hinweise</h2>
    <p class="small mute">Hinweise erscheinen in der App (Training, Mobility, Schlaf) und stützen sich nur auf erfasste Daten. Ohne genug Einträge zeigt die App keinen Hinweis und sagt dir, was noch fehlt.</p>
    <label class="row small" style="gap:6px"><input type="checkbox" data-apxf="hn:on" ${on?'checked':''}> Hinweise insgesamt anzeigen</label>
    <div class="list">
    ${blk('sleep',`<label class="row" style="gap:6px"><input type="checkbox" data-apxf="hn:sleep.on" ${s.on?'checked':''}> Schlaf-Hinweis</label>`,`<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <label class="f">Vergleichszeitraum<select data-apxf="hn:sleep.days">${opt([5,7,10,14],s.days,v=>v+' Tage')}</select></label>
      <label class="f">Score fällt um mindestens<select data-apxf="hn:sleep.drop">${opt([3,5,8,10],s.drop,v=>v+' Punkte')}</select></label>
      <label class="f">oder Dauer fällt um<select data-apxf="hn:sleep.dropMin">${opt([20,30,45,60],s.dropMin,v=>v+' min')}</select></label>
      <label class="f">Mindestens erfasste Nächte<select data-apxf="hn:sleep.minNights">${opt([8,10,14,18],s.minNights)}</select></label></div>
      <p class="small mute">Verglichen wird der Schnitt der letzten Tage mit den 21 Tagen davor – bevorzugt der Schlaf-Score, sonst die Schlafdauer.</p>`,C.sleep)}
    ${blk('activity',`<label class="row" style="gap:6px"><input type="checkbox" data-apxf="hn:activity.on" ${a.on?'checked':''}> Hinweis bei wenig Sport</label>`,`<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <label class="f">Zeitraum<select data-apxf="hn:activity.days">${opt(days,a.days,v=>v+' Tage')}</select></label>
      <label class="f">Hinweis bei weniger als<select data-apxf="hn:activity.min">${opt([1,2,3,4,5],a.min,v=>v+(v==1?' Einheit':' Einheiten'))}</select></label></div>`,C.activity)}
    ${blk('mob',`<label class="row" style="gap:6px"><input type="checkbox" data-apxf="hn:mob.on" ${m.on?'checked':''}> Hinweis bei wenig Mobility</label>`,`<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <label class="f">Zeitraum<select data-apxf="hn:mob.days">${opt(days,m.days,v=>v+' Tage')}</select></label>
      <label class="f">Hinweis bei weniger als<select data-apxf="hn:mob.min">${opt([1,2,3,4,5],m.min,v=>v+(v==1?' Einheit':' Einheiten'))}</select></label></div>`,C.mob)}
    </div><div class="row"><button class="sm" data-apx="hnreset">Auf Standard zurücksetzen</button></div></section>`}
A.hintsSettingsPanel=settingsPanel;
{const _set=VIEWS.set;VIEWS.set=function(){const h=_set.apply(this,arguments);let p='';try{p=settingsPanel()}catch(e){A.warn(e,'hints-set')}
  const i=h.indexOf('<section class="panel"><h2>Daten &amp; Backup</h2>');return p?(i>=0?h.slice(0,i)+p+h.slice(i):h+p):h}}
})();
