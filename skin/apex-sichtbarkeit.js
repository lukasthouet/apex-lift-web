/* APEX Lift · Sportarten und Bereiche ausblenden (Nov 2026)
   Ausblenden ≠ Löschen: Die Kachel verschwindet aus „Mehr“/„Sportarten“. Alle Daten bleiben gespeichert, werden weiter
   synchronisiert und fließen weiter in Belastung und Erholung ein. Einstellung: S.prefs.hide.<bereich> (Einstellungen → Sichtbarkeit). */
(function(){
'use strict';
if(window.__apexSicht)return;window.__apexSicht=1;
const A=window.ApexBox;if(!A){console.warn('apex-sichtbarkeit: Kern fehlt');return}
const E=A.esc;
const KEEP=new Set(['set','data','sync','more']);               // Diese Bereiche lassen sich nicht ausblenden (sonst wären Einstellungen unerreichbar)
const hidden=(k)=>!KEEP.has(k)&&A.isHidden(k);
const sports=()=>MODULES.filter(m=>SPORT_MODS.includes(m[0])&&!KEEP.has(m[0]));
const areas=()=>MODULES.filter(m=>!SPORT_MODS.includes(m[0])&&!KEEP.has(m[0]));
const nHidden=()=>MODULES.filter(m=>hidden(m[0])).length;
A.hiddenModules=()=>MODULES.filter(m=>hidden(m[0])).map(m=>m[0]);

/* Mehr-Menü: ausgeblendete Kacheln für die Dauer des Renderns herausnehmen, danach exakt wiederherstellen */
{const _more=VIEWS.more;VIEWS.more=function(){const orig=MODULES.slice();let out;
  try{const keep=orig.filter(m=>!hidden(m[0]));MODULES.length=0;keep.forEach(m=>MODULES.push(m));out=_more.apply(this,arguments)}
  finally{MODULES.length=0;orig.forEach(m=>MODULES.push(m))}
  const n=orig.length-orig.filter(m=>!hidden(m[0])).length;
  if(n&&typeof out==='string'&&ui.moreSub!=='sport')out+=`<p class="small mute" style="margin:8px 4px">${n} Bereich${n>1?'e':''} ausgeblendet – Daten bleiben erhalten. <button class="sm ghost" data-tab="set">Einstellungen → Sichtbarkeit</button></p>`;
  return out}}

A.action('vistog',(el)=>{const k=el.dataset.v;if(KEEP.has(k))return;const now=hidden(k);A.setPref('hide.'+k,!now);A.save(now?'Wieder sichtbar':'Ausgeblendet – Daten bleiben erhalten')});
A.action('visall',()=>{if(S.prefs&&S.prefs.hide)S.prefs.hide={};A.save('Alles wieder sichtbar')});

function row(m){const k=m[0],h=hidden(k);
  return`<div class="item"><div class="main"><div class="t">${E(m[1])} ${h?A.pill('ausgeblendet','warn'):''}</div><div class="small mute">${E(m[2])}</div></div>
    <button class="sm ${h?'':'ghost'}" data-apx="vistog" data-v="${E(k)}" aria-pressed="${h}" aria-label="${E(m[1])} ${h?'wieder anzeigen':'ausblenden'}">${h?'Anzeigen':'Ausblenden'}</button></div>`}
function panel(){const n=nHidden();
  return`<section class="panel" id="apxVis"><h2>Sichtbarkeit</h2>
    <div class="banner"><b>Ausblenden ist nicht Löschen.</b> Ausgeblendete Sportarten und Bereiche verschwinden nur aus dem Menü. Deine Einträge bleiben gespeichert und synchronisiert, und Training, Belastung und Erholung rechnen sie weiter mit. Du kannst alles jederzeit wieder einblenden. Gelöscht wird nur über „Daten“.</div>
    <h3 style="margin:12px 0 4px">Sportarten</h3><div class="list">${sports().map(row).join('')}</div>
    <h3 style="margin:12px 0 4px">Bereiche (z. B. Atem, Gesang)</h3><div class="list">${areas().map(row).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="sm" data-apx="visall" ${n?'':'disabled'}>Alles einblenden${n?` (${n})`:''}</button></div></section>`}
A.visibilityPanel=panel;
{const _set=VIEWS.set;VIEWS.set=function(){const h=_set.apply(this,arguments);let p='';try{p=panel()}catch(e){A.warn(e,'sicht-set')}
  const m='<section class="panel" id="apxHintSet"';let i=h.indexOf(m);if(i<0)i=h.indexOf('<section class="panel"><h2>Daten &amp; Backup</h2>');return p?(i>=0?h.slice(0,i)+p+h.slice(i):h+p):h}}
})();
