/* APEX Lift · Karten frei anordnen und in der Größe ändern (Nov 2026)
   Bedienung: „⠿“-Knopf unten links → Layout-Modus. Karte am Griff oben ziehen (oder ▲▼ nutzen), an der Ecke unten rechts ziehen = Größe.
   Desktop: 12-Spalten-Raster (Breite 3–12 Spalten, Höhe 80–1200 px). Mobil: eine Spalte – dort sind Reihenfolge und Höhe sinnvoll, die Breite nicht.
   Gespeichert pro Ansicht und pro Geräteklasse (Desktop/Mobil) in diesem Browser; „Zurücksetzen“ stellt das Standardlayout wieder her.
   Es wird nichts im DOM umgehängt (nur CSS-order/-Spanne), daher bleiben alle Funktionen der Karten unverändert. */
(function(){
'use strict';
if(window.__apexLayout)return;window.__apexLayout=1;
const A=window.ApexBox;if(!A){console.warn('apex-layout: Kern fehlt');return}
const KEY='apex-layout-v1';
const MINC=3,MAXC=12,DEFC=6,MINH=80,MAXH=1200;
let mem=null;
const desk=()=>document.body.classList.contains('desk');
const cls=()=>desk()?'desk':'mob';
const load=()=>{if(mem)return mem;try{mem=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){mem={}}return mem};
const store=()=>{try{localStorage.setItem(KEY,JSON.stringify(mem))}catch(_){}};
const cfg=(create)=>{const m=load();const k=cls()+':'+tab;if(!m[k]&&create)m[k]={order:[],w:{},h:{}};return m[k]};
const hasCfg=()=>{const c=cfg(false);return !!c&&(c.order.length||Object.keys(c.w).length||Object.keys(c.h).length)};
const edit=()=>!!ui.apxEdit;

const items=()=>[...document.querySelectorAll('#view>*')].filter(e=>!e.classList.contains('back')&&!e.classList.contains('apxbar')&&!e.classList.contains('apxfab'));
function keysFor(list){const seen={};return list.map((e,i)=>{const h=e.querySelector('h1,h2,h3,.eyebrow,summary');let k=(h?h.textContent:'').trim().toLowerCase().replace(/[^a-z0-9äöüß]+/g,'-').slice(0,40)||('p'+i);seen[k]=(seen[k]||0)+1;if(seen[k]>1)k+='-'+seen[k];return k})}

function apply(){
  const v=document.getElementById('view');if(!v)return;
  v.querySelectorAll('.apxbar,.apxrz,.apxfab').forEach(e=>e.remove());
  const list=items();const keys=keysFor(list);const c=cfg(false);
  const active=edit()||hasCfg();
  v.classList.toggle('apxgrid',active&&desk());v.classList.toggle('apxedit',edit());
  if(document.body.classList.contains('gym')){v.classList.remove('apxgrid','apxedit');return}
  // Reihenfolge: gespeicherte zuerst (in gespeicherter Reihenfolge), neue Karten behalten ihre Standardposition dahinter
  const ord=c?c.order:[];const rank=(k,i)=>{const j=ord.indexOf(k);return j>=0?j:ord.length+i};
  list.forEach((e,i)=>{const k=keys[i];e.dataset.lk=k;
    if(c&&ord.length)e.style.order=String(rank(k,i));else e.style.removeProperty('order');
    if(active&&desk()){const w=c&&c.w[k]||DEFC;e.style.gridColumn='span '+Math.min(MAXC,Math.max(MINC,w))}else e.style.removeProperty('grid-column');
    const h=c&&c.h[k];if(h)e.style.minHeight=Math.min(MAXH,Math.max(MINH,h))+'px';else e.style.removeProperty('min-height');
    if(edit()){e.classList.add('apxitem');
      e.insertAdjacentHTML('afterbegin',`<div class="apxbar" data-lk="${A.esc(k)}"><span class="apxgrip" role="button" tabindex="0" aria-label="Karte verschieben (ziehen)">⠿ verschieben</span><button type="button" class="sm ghost" data-apx="lyup" data-v="${A.esc(k)}" aria-label="Nach oben">▲</button><button type="button" class="sm ghost" data-apx="lydn" data-v="${A.esc(k)}" aria-label="Nach unten">▼</button><span class="apxsz small mute"></span></div><span class="apxrz" data-lk="${A.esc(k)}" role="slider" aria-label="Größe ändern (ziehen)" tabindex="0"></span>`);
      sizeLabel(e)}
    else e.classList.remove('apxitem')});
  if(edit()){v.insertAdjacentHTML('afterbegin',`<div class="apxbar apxtop" style="grid-column:1/-1;order:-1"><b>Layout-Modus</b><span class="small mute">Karten am Griff ziehen · Ecke unten rechts = Größe${desk()?'':' (mobil: Höhe)'}</span><span style="flex:1"></span><button type="button" class="sm" data-apx="lyreset">Diese Ansicht zurücksetzen</button><button type="button" class="sm ghost" data-apx="lyresetall">Alles zurücksetzen</button><button type="button" class="sm primary" data-apx="lydone">Fertig</button></div>`)}
  else if(!document.getElementById('apxFab')){const f=document.createElement('button');f.id='apxFab';f.type='button';f.className='apxfab';f.textContent='⠿';f.title='Layout anpassen';f.setAttribute('aria-label','Layout anpassen: Karten verschieben und Größe ändern');f.dataset.apx='lyedit';document.body.appendChild(f)}
  if(edit()){const f=document.getElementById('apxFab');if(f)f.remove()}
}
function sizeLabel(e){const s=e.querySelector(':scope>.apxbar .apxsz');if(!s)return;const w=desk()?(parseInt((e.style.gridColumn||'').replace(/\D/g,''))||DEFC)+' Sp. · ':'';s.textContent=w+Math.round(e.getBoundingClientRect().height)+' px'}

/* ---------------------------------------------------------------- speichern */
function curOrder(){const list=items();const keys=keysFor(list);return list.map((e,i)=>[parseInt(e.style.order||i),i,keys[i]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]).map(x=>x[2])}
function setOrder(arr){const c=cfg(true);c.order=arr;store();apply()}
function move(k,d){const o=curOrder();const i=o.indexOf(k);const j=i+d;if(i<0||j<0||j>=o.length)return;o.splice(j,0,o.splice(i,1)[0]);setOrder(o);const el=document.querySelector(`#view>[data-lk="${CSS.escape(k)}"]`);if(el)el.scrollIntoView({block:'nearest',behavior:'smooth'})}
A.action('lyedit',()=>{ui.apxEdit=true;render()});
A.action('lydone',()=>{ui.apxEdit=false;render();A.toast('Layout gespeichert')});
A.action('lyup',(el)=>move(el.dataset.v,-1));
A.action('lydn',(el)=>move(el.dataset.v,1));
A.action('lyreset',()=>{const m=load();delete m[cls()+':'+tab];store();A.toast('Ansicht auf Standard zurückgesetzt');render()});
A.action('lyresetall',()=>{if(!confirm('Alle gespeicherten Layouts (Anordnung und Größen) auf Standard zurücksetzen? Deine Daten bleiben unberührt.'))return;mem={};store();A.toast('Alle Layouts zurückgesetzt');render()});

/* ---------------------------------------------------------------- Ziehen und Größe (Pointer-Events: Maus, Stift, Touch) */
let drag=null;
function colW(v){const st=getComputedStyle(v);const gap=parseFloat(st.columnGap)||16;const w=v.clientWidth-parseFloat(st.paddingLeft||0)-parseFloat(st.paddingRight||0);return{w:(w-gap*(MAXC-1))/MAXC,gap}}
document.addEventListener('pointerdown',(e)=>{if(!edit())return;const grip=e.target.closest&&e.target.closest('.apxgrip'),rz=e.target.closest&&e.target.closest('.apxrz');if(!grip&&!rz)return;
  const el=(grip||rz).closest('.apxitem');if(!el)return;e.preventDefault();
  const r=el.getBoundingClientRect();drag={type:grip?'move':'size',el,k:el.dataset.lk,x:e.clientX,y:e.clientY,w:r.width,h:r.height,id:e.pointerId,over:null};
  try{(grip||rz).setPointerCapture(e.pointerId)}catch(_){}
  el.classList.add(grip?'apxdragging':'apxsizing')});
document.addEventListener('pointermove',(e)=>{if(!drag||e.pointerId!==drag.id)return;const el=drag.el;
  if(drag.type==='size'){
    if(desk()){const v=document.getElementById('view');const {w,gap}=colW(v);const target=drag.w+(e.clientX-drag.x);const cols=Math.min(MAXC,Math.max(MINC,Math.round((target+gap)/(w+gap))));el.style.gridColumn='span '+cols;drag.cols=cols}
    const hh=Math.min(MAXH,Math.max(MINH,Math.round(drag.h+(e.clientY-drag.y))));el.style.minHeight=hh+'px';drag.hh=hh;sizeLabel(el)}
  else{const t=document.elementFromPoint(e.clientX,e.clientY);const over=t&&t.closest&&t.closest('#view>.apxitem');
    document.querySelectorAll('.apxdrop').forEach(x=>x.classList.remove('apxdrop'));
    if(over&&over!==el){over.classList.add('apxdrop');drag.over=over;const r=over.getBoundingClientRect();drag.after=desk()?(e.clientX>r.left+r.width/2&&e.clientY>r.top):(e.clientY>r.top+r.height/2)}
    else drag.over=null;
    el.style.transform=`translate(${e.clientX-drag.x}px,${e.clientY-drag.y}px)`;
    // Rand-Scroll auf kleinen Bildschirmen
    if(e.clientY<70)scrollBy(0,-14);else if(e.clientY>innerHeight-70)scrollBy(0,14)}});
function end(e){if(!drag||(e&&e.pointerId!==drag.id))return;const d=drag;drag=null;d.el.classList.remove('apxdragging','apxsizing');d.el.style.transform='';
  document.querySelectorAll('.apxdrop').forEach(x=>x.classList.remove('apxdrop'));
  if(d.type==='move'&&d.over){const o=curOrder();const a=d.k,b=d.over.dataset.lk;const i=o.indexOf(a);o.splice(i,1);let j=o.indexOf(b);if(d.after)j++;o.splice(j,0,a);setOrder(o)}
  else if(d.type==='size'){const c=cfg(true);if(d.cols)c.w[d.k]=d.cols;if(d.hh)c.h[d.k]=d.hh;if(!c.order.length)c.order=curOrder();store();apply()}}
document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);
// Tastatur: Griff mit Pfeiltasten, Ecke mit Pfeiltasten (Breite/Höhe)
document.addEventListener('keydown',(e)=>{if(!edit())return;const g=e.target.closest&&e.target.closest('.apxgrip'),r=e.target.closest&&e.target.closest('.apxrz');if(!g&&!r)return;
  const k=(g||r).closest('.apxitem').dataset.lk;const c=(()=>{return cfg(true)})();
  if(g&&(e.key==='ArrowUp'||e.key==='ArrowLeft')){e.preventDefault();move(k,-1)}
  else if(g&&(e.key==='ArrowDown'||e.key==='ArrowRight')){e.preventDefault();move(k,1)}
  else if(r){const el=document.querySelector(`#view>[data-lk="${CSS.escape(k)}"]`);const cw=c.w[k]||DEFC,ch=c.h[k]||Math.round(el.getBoundingClientRect().height);
    if(e.key==='ArrowRight'&&desk())c.w[k]=Math.min(MAXC,cw+1);else if(e.key==='ArrowLeft'&&desk())c.w[k]=Math.max(MINC,cw-1);else if(e.key==='ArrowDown')c.h[k]=Math.min(MAXH,ch+40);else if(e.key==='ArrowUp')c.h[k]=Math.max(MINH,ch-40);else return;
    e.preventDefault();if(!c.order.length)c.order=curOrder();store();apply()}});

/* ---------------------------------------------------------------- Einbindung */
{const _r=render;render=function(){_r.apply(this,arguments);try{apply()}catch(e){A.warn(e,'layout')}}}
window.addEventListener('resize',()=>{clearTimeout(window.__apxLyT);window.__apxLyT=setTimeout(()=>{try{apply()}catch(_){}},200)});

/* Einstellungen */
function panel(){const m=load();const n=Object.keys(m).length;
  return`<section class="panel" id="apxLy"><h2>Layout</h2>
    <p class="small mute">Karten verschieben und in der Größe ändern: Im Layout-Modus lassen sich Karten am Griff ziehen (oder mit ▲▼ verschieben) und an der Ecke unten rechts vergrößern oder verkleinern. Am Desktop gilt ein 12-Spalten-Raster (Breite 3–12 Spalten), mobil eine Spalte mit anpassbarer Höhe. Das Layout wird pro Ansicht und pro Geräteklasse in diesem Browser gespeichert.</p>
    <div class="row"><button class="sm primary" data-apx="lyedit2">Layout-Modus für diese Ansicht</button><button class="sm" data-apx="lyresetall" ${n?'':'disabled'}>Alle Layouts zurücksetzen${n?` (${n})`:''}</button></div></section>`}
A.action('lyedit2',()=>{ui.apxEdit=true;tab='log';render()});
{const _set=VIEWS.set;VIEWS.set=function(){const h=_set.apply(this,arguments);let p='';try{p=panel()}catch(e){A.warn(e,'layout-set')}
  const i=h.indexOf('<section class="panel"><h2>Daten &amp; Backup</h2>');return p?(i>=0?h.slice(0,i)+p+h.slice(i):h+p):h}}

/* Stil */
const st=document.createElement('style');st.textContent=`
body.desk #view.apxgrid{display:grid;columns:auto;grid-template-columns:repeat(12,minmax(0,1fr));gap:16px;align-items:start}
body.desk #view.apxgrid>*{margin-bottom:0;break-inside:auto}
#view.apxedit .apxitem{position:relative;outline:2px dashed color-mix(in srgb,var(--accent) 70%,transparent);outline-offset:3px;touch-action:pan-y}
#view.apxedit .apxitem>*:not(.apxbar):not(.apxrz){pointer-events:none;user-select:none}
.apxbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 6px;border-radius:8px;background:color-mix(in srgb,var(--accent) 16%,var(--panel))}
.apxbar.apxtop{position:sticky;top:0;z-index:20;margin-bottom:8px}
.apxgrip{cursor:grab;font-weight:700;padding:6px 10px;border-radius:6px;touch-action:none;user-select:none;min-height:36px;display:inline-flex;align-items:center}
.apxgrip:focus-visible,.apxrz:focus-visible{outline:2px solid var(--accent)}
.apxrz{position:absolute;right:-2px;bottom:-2px;width:34px;height:34px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 52%,var(--accent) 52% 62%,transparent 62% 72%,var(--accent) 72% 82%,transparent 82%);border-bottom-right-radius:var(--r);z-index:5}
.apxdragging{z-index:30;opacity:.88;box-shadow:0 18px 40px rgba(0,0,0,.35);cursor:grabbing}
.apxsizing{outline-style:solid!important}
.apxdrop{outline:3px solid var(--accent)!important}
.apxfab{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(76px + env(safe-area-inset-bottom,0px));width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--text,inherit);opacity:.7;z-index:40;font-size:18px;cursor:pointer}
.apxfab:hover,.apxfab:focus-visible{opacity:1}
body.gym .apxfab{display:none}
@media (prefers-reduced-motion:no-preference){.apxitem{transition:outline-color .15s}}`;
document.head.appendChild(st);
try{apply()}catch(_){}
})();
