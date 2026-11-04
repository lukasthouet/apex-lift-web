/* APEX Lift · 3D-Modell & Analyse-Fenster
   - „Regeneration & Muskeln“: Menü als übersichtliches Raster statt Mini-Scrollleiste
   - Größe S / M / L / XL, freies Ziehen am Griff unten und Vollbild – auch für alle anderen Fenster unter Analyse
   - Mehrere Ansichten nebeneinander (Regeneration, Entwicklung, Balance … gleichzeitig)
   - Ein Knopf pausiert alle Animationen (3D, Mehrfachansicht, CSS/SVG) und spart Akku */
(function(){
'use strict';
if(window.__apexB3Plus)return;window.__apexB3Plus=1;
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const has=(n)=>{try{return typeof (0,eval)(n)!=='undefined'}catch(_){return false}};
if(!has('B3')||!has('mount3d')){console.warn('apex-b3plus: 3D-Modell nicht gefunden');return}
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(_){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};

const MODES=[['rec','Regeneration','♻','#34b268'],['dev','Entwicklung','📈','#c8f169'],['ex','Nächste Übungen','▶','#ffd23f'],['bal','Balance','⚖','#6aa7f0'],['pot','Potenzial','🎯','#ff9a3d'],
  ['pain','Schmerz','⚡','#ff4d5e'],['tendon','Sehnen','🧵','#ff8a8a'],['care','Baustellen','🩹','#ffb03d'],['mob','Mobilität','🤸','#2ee6d6'],['goal','Zielkörper','🏁','#b44dff']];
const SIZES={S:320,M:460,L:640,XL:'max'};
const P={size:LS.get('apx-b3size','M'),paused:LS.get('apx-anim-paused',false),multi:LS.get('apx-b3multi',false),mm:LS.get('apx-b3modes',['rec','dev','bal','pain']),free:LS.get('apx-b3h',null),full:false};
const heightFor=()=>{if(P.full)return Math.max(320,innerHeight-(P.multi?120:150));if(P.free)return P.free;const s=SIZES[P.size];return s==='max'?Math.max(380,Math.round(innerHeight*.8)):s};

/* ------------------------------------------------------------ Pause für alle Animationen */
function applyPause(){
  document.documentElement.classList.toggle('apx-paused',!!P.paused);
  try{document.querySelectorAll('svg').forEach(s=>{try{P.paused?s.pauseAnimations():s.unpauseAnimations()}catch(_){}})}catch(_){}
  document.querySelectorAll('[data-apxpause]').forEach(b=>{b.textContent=P.paused?'▶ Animationen fortsetzen':'⏸ Animationen pausieren';b.setAttribute('aria-pressed',String(!!P.paused))});
  if(!P.paused){if(mvOn())mvStart();else if(!B3.running&&B3.r&&B3.r.domElement&&B3.r.domElement.isConnected){B3.running=true;b3Loop()}}
  else stillFrame()}
function setPaused(v){P.paused=!!v;cancelAnimationFrame(MV.raf);MV.raf=0;LS.set('apx-anim-paused',P.paused);applyPause()}
function stillFrame(){try{if(B3.r&&B3.scene&&B3.cam&&B3.state==='ready'&&!mvOn())B3.r.render(B3.scene,B3.cam)}catch(_){}}
// Schleife des Modells umhüllen: pausiert oder in der Mehrfachansicht → nicht zeichnen
const mvOn=()=>MV.active&&!!document.getElementById('b3multi');
{const inner=b3Loop;b3Loop=function(){if(P.paused||mvOn()){B3.running=false;return}return inner.apply(this,arguments)}}
{const inner=mount3d;mount3d=function(){
  const host=document.getElementById('body3d');
  if(host&&!host.dataset.mini&&!host.dataset.pick&&host.closest('.b3-panel'))host.dataset.h=String(heightFor());
  if(mvOn()&&host&&host.closest('.b3-panel')){mvLayout();return}
  if(MV.w){MV.w=0;MV.h=0}
  const r=inner.apply(this,arguments);if(P.paused)setTimeout(stillFrame,0);return r}}

/* ------------------------------------------------------------ Mehrfachansicht */
const MV={active:false,snaps:{},snapAt:0,raf:0,last:0,idx:0,cells:[],w:0,h:0,drag:null};
function mvSnap(){
  if(B3.state!=='ready'||!B3.meshes||!B3.meshes.muscle)return false;
  const col=B3.meshes.muscle.g.attributes.color;const keep=B3.mode;MV.snaps={};
  for(const m of P.mm){if(m==='ex')continue;try{B3.mode=m;try{CC={}}catch(_){}b3Update();MV.snaps[m]=new Float32Array(col.array)}catch(e){warn(e,'mv snap '+m)}}
  B3.mode=keep==='ex'?'rec':keep;try{b3Update()}catch(_){}MV.snapAt=Date.now();return true}
function mvLayout(){
  const grid=document.getElementById('b3multi');if(!grid)return;
  const modes=P.mm.filter(m=>m!=='ex');
  if(!modes.length){grid.innerHTML='<p class="small mute" style="padding:12px">Wähle oben mindestens eine Ansicht.</p>';return}
  if(grid.dataset.k!==modes.join(',')+'|'+P.size+'|'+P.full){grid.dataset.k=modes.join(',')+'|'+P.size+'|'+P.full;
    grid.innerHTML=modes.map(m=>{const d=MODES.find(x=>x[0]===m)||[m,m,'','#888'];return`<figure class="b3-cell" style="--c:${d[3]}"><canvas data-mvmode="${m}"></canvas><figcaption><i></i>${d[1]}</figcaption></figure>`}).join('')}
  // gemeinsame Zeichengröße für alle Zellen
  const c0=grid.querySelector('canvas');if(!c0)return;const w=Math.max(120,Math.round(c0.getBoundingClientRect().width||200));
  const h=Math.round(Math.min(P.full?(innerHeight-190)/Math.ceil(modes.length/Math.max(1,Math.floor(grid.clientWidth/w))):w*1.35,w*1.6));
  const dpr=Math.min(1.5,devicePixelRatio||1);MV.cells=[...grid.querySelectorAll('canvas')];
  for(const c of MV.cells){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);c.style.height=h+'px'}
  if(!b3Init())return;if(MV.w!==w||MV.h!==h){MV.w=w;MV.h=h;B3.r.setSize(w,h,false);B3.cam.aspect=w/h;B3.cam.updateProjectionMatrix()}
  if(B3.state!=='ready'){setTimeout(mvLayout,400);return}
  if(!Object.keys(MV.snaps).length||Date.now()-MV.snapAt>60000||modes.some(m=>!MV.snaps[m]))mvSnap();
  bindCellDrag(grid);mvFrameAll();if(!P.paused)mvStart()}
function mvPose(now){try{const t=.5-.5*Math.cos(now/4*2*Math.PI);if(typeof b3Pose==='function'&&typeof MOT!=='undefined')b3Pose(MOT.idle,t);if(typeof b3Mood==='function')b3Mood(now)}catch(_){}}
function mvCam(){const z=B3.zoom||1;const d=4.1*z;const f={x:0,y:.86,z:0};B3.cam.position.set(f.x+Math.sin(B3.rotY)*Math.cos(B3.rotX)*d,f.y+.02+Math.sin(B3.rotX)*d,f.z+Math.cos(B3.rotY)*Math.cos(B3.rotX)*d);B3.cam.lookAt(f.x,f.y,f.z)}
function mvDraw(c){const m=c.dataset.mvmode;const snap=MV.snaps[m];if(!snap)return;const col=B3.meshes.muscle.g.attributes.color;col.array.set(snap);col.needsUpdate=true;
  B3.r.render(B3.scene,B3.cam);const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(B3.r.domElement,0,0,c.width,c.height)}
function mvFrameAll(){if(B3.state!=='ready'||!MV.cells.length)return;mvPose(performance.now()/1000);mvCam();for(const c of MV.cells)if(c.isConnected)mvDraw(c)}
function mvStart(){if(MV.raf||!MV.active||P.paused)return;const tick=(ts)=>{MV.raf=0;if(!MV.active||P.paused)return;
  if(!MV.cells.length||!MV.cells[0].isConnected){return}
  if(ts-MV.last>=1000/24){MV.last=ts;if(B3.auto)B3.rotY+=.012;mvPose(ts/1000);mvCam();// pro Bild ein bis zwei Zellen neu zeichnen (reihum) – hält die GPU-Last klein
    const n=MV.cells.length,k=n<=2?n:2;for(let i=0;i<k;i++){MV.idx=(MV.idx+1)%n;mvDraw(MV.cells[MV.idx])}}
  MV.raf=requestAnimationFrame(tick)};MV.raf=requestAnimationFrame(tick)}
function bindCellDrag(grid){if(grid.__drag)return;grid.__drag=1;
  grid.addEventListener('pointerdown',e=>{const c=e.target.closest('canvas');if(!c)return;MV.drag={x:e.clientX,y:e.clientY};c.setPointerCapture(e.pointerId)});
  grid.addEventListener('pointermove',e=>{if(!MV.drag)return;const dx=e.clientX-MV.drag.x,dy=e.clientY-MV.drag.y;if(Math.abs(dx)+Math.abs(dy)>4)B3.auto=false;B3.rotY+=dx*.012;B3.rotX=Math.max(-.4,Math.min(.7,B3.rotX+dy*.005));MV.drag={x:e.clientX,y:e.clientY};if(P.paused)mvFrameAll()});
  const up=()=>{MV.drag=null};grid.addEventListener('pointerup',up);grid.addEventListener('pointercancel',up)}
function setMulti(on){P.multi=!!on;B3.running=false;LS.set('apx-b3multi',P.multi);MV.active=P.multi;cancelAnimationFrame(MV.raf);MV.raf=0;MV.w=0;MV.h=0;
  if(!P.multi){try{b3Update()}catch(_){}}try{render()}catch(_){}}

/* ------------------------------------------------------------ Dekoration des Panels */
function toolbar(){return`<div class="b3-tools" role="toolbar" aria-label="Ansicht">
  <div class="seg" role="group" aria-label="Größe">${Object.keys(SIZES).map(k=>`<button data-b3size="${k}" aria-pressed="${!P.free&&P.size===k}">${k}</button>`).join('')}</div>
  <button data-b3full aria-pressed="${P.full}">${P.full?'✕ Vollbild beenden':'⛶ Vollbild'}</button>
  <button data-b3multi aria-pressed="${P.multi}">${P.multi?'◻ Einzelansicht':'▦ Mehrere Ansichten'}</button>
  <button data-apxpause aria-pressed="${!!P.paused}">${P.paused?'▶ Animationen fortsetzen':'⏸ Animationen pausieren'}</button></div>`}
function decorate(){
  const host=document.getElementById('body3d');if(!host||host.dataset.mini||host.dataset.pick)return;
  const panel=host.closest('section.panel');if(!panel||panel.dataset.b3plus)return;panel.dataset.b3plus='1';panel.classList.add('b3-panel');if(P.full)panel.classList.add('b3-full');
  const head=panel.querySelector(':scope > .row.between');const chips=head&&head.querySelector('.chips');
  if(chips){chips.classList.add('b3-menu');chips.removeAttribute('style');chips.querySelectorAll('[data-b3mode]').forEach(b=>{const d=MODES.find(x=>x[0]===b.dataset.b3mode);if(d){b.style.setProperty('--c',d[3]);b.innerHTML=`<span aria-hidden="true">${d[2]}</span>${d[1]}`}});head.after(chips)}
  const b3=panel.querySelector('.b3');if(!b3)return;
  b3.insertAdjacentHTML('beforebegin',toolbar());
  b3.insertAdjacentHTML('beforeend','<div class="b3-grip" title="Ziehen zum Vergrößern" aria-hidden="true"></div>');
  if(P.multi){MV.active=true;MV.w=0;b3.classList.add('b3-hidden');b3.insertAdjacentHTML('afterend',`<div class="b3-pick">${MODES.filter(m=>m[0]!=='ex').map(m=>`<label style="--c:${m[3]}"><input type="checkbox" data-mvpick="${m[0]}" ${P.mm.includes(m[0])?'checked':''}> ${m[1]}</label>`).join('')}</div><div id="b3multi" class="b3-multi s-${P.size}"></div>`);setTimeout(mvLayout,30)}
  bindGrip(b3);if(!P.multi)setTimeout(()=>mount3d(),0)}
function bindGrip(b3){const g=b3.querySelector('.b3-grip');if(!g)return;let y0=null,h0=0;
  g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();g.setPointerCapture(e.pointerId);y0=e.clientY;h0=b3.getBoundingClientRect().height});
  g.addEventListener('pointermove',e=>{if(y0==null)return;const h=Math.max(260,Math.min(innerHeight*1.2,h0+e.clientY-y0));const c=b3.querySelector('canvas');if(c)c.style.height=h+'px'});
  const up=e=>{if(y0==null)return;const h=Math.max(260,Math.min(innerHeight*1.2,h0+e.clientY-y0));y0=null;P.free=Math.round(h);LS.set('apx-b3h',P.free);mount3d()};
  g.addEventListener('pointerup',up);g.addEventListener('pointercancel',up)}

/* Andere Fenster unter Analyse: Vollbild / breit */
function decorateAna(){
  let cur='';try{cur=tab}catch(_){}if(cur!=='ana')return;
  document.querySelectorAll('#view > section.panel').forEach(p=>{if(p.dataset.apxwin||p.classList.contains('b3-panel')||!p.querySelector('h2'))return;p.dataset.apxwin='1';
    const b=document.createElement('button');b.className='sm ghost apx-winbtn';b.type='button';b.title='Fenster vergrößern';b.setAttribute('aria-label','Fenster vergrößern');b.textContent='⛶';b.dataset.apxwin='1';
    const head=p.querySelector(':scope > .fhd')||p.querySelector(':scope > .row');const fb=head&&head.querySelector('.foldbtn');
    if(fb)fb.before(b);else if(head)head.appendChild(b);else{p.style.position='relative';b.classList.add('abs');p.prepend(b)}})}

/* ------------------------------------------------------------ Ereignisse */
document.addEventListener('click',ev=>{const t=ev.target;const g=s=>t.closest&&t.closest(s);let b;
  if((b=g('[data-apxpause]'))){ev.preventDefault();ev.stopPropagation();setPaused(!P.paused);return}
  if((b=g('[data-b3size]'))){ev.preventDefault();ev.stopPropagation();P.size=b.dataset.b3size;P.free=null;LS.set('apx-b3size',P.size);LS.set('apx-b3h',null);MV.w=0;
    document.querySelectorAll('[data-b3size]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.b3size===P.size)));const m=document.getElementById('b3multi');if(m){m.className='b3-multi s-'+P.size;m.dataset.k=''}mount3d();return}
  if((b=g('[data-b3full]'))){ev.preventDefault();ev.stopPropagation();P.full=!P.full;document.body.classList.toggle('apx-noscroll',P.full);const p=document.querySelector('.b3-panel');if(p)p.classList.toggle('b3-full',P.full);
    b.textContent=P.full?'✕ Vollbild beenden':'⛶ Vollbild';b.setAttribute('aria-pressed',String(P.full));MV.w=0;const m=document.getElementById('b3multi');if(m)m.dataset.k='';setTimeout(mount3d,30);return}
  if((b=g('[data-b3multi]'))){ev.preventDefault();ev.stopPropagation();setMulti(!P.multi);return}
  if((b=g('[data-apxwin]'))&&b.tagName==='BUTTON'){ev.preventDefault();ev.stopPropagation();const p=b.closest('section.panel');const on=!p.classList.contains('apx-max');if(on&&p.classList.contains('folded'))p.classList.remove('folded');
    document.querySelectorAll('.apx-max').forEach(x=>x.classList.remove('apx-max'));p.classList.toggle('apx-max',on);document.body.classList.toggle('apx-noscroll',on);b.textContent=on?'✕':'⛶';
    p.querySelectorAll('details').forEach(d=>{if(on)d.open=true});return}
  if(g('[data-b3mode]')&&MV.active){/* Modus wechseln schließt die Mehrfachansicht nicht – nur die Einzelansicht folgt */}
},true);
document.addEventListener('change',ev=>{const t=ev.target;if(!t||!t.dataset||!t.dataset.mvpick)return;const m=t.dataset.mvpick;P.mm=P.mm.filter(x=>x!==m);if(t.checked)P.mm.push(m);
  P.mm=MODES.map(x=>x[0]).filter(k=>P.mm.includes(k));LS.set('apx-b3modes',P.mm);MV.snaps={};const g=document.getElementById('b3multi');if(g)g.dataset.k='';mvLayout()});
document.addEventListener('keydown',ev=>{if(ev.key!=='Escape')return;if(P.full){const b=document.querySelector('[data-b3full]');if(b)b.click()}const mx=document.querySelector('.apx-max .apx-winbtn');if(mx)mx.click()});
addEventListener('resize',()=>{clearTimeout(MV._rt);MV._rt=setTimeout(()=>{if(MV.active){MV.w=0;const g=document.getElementById('b3multi');if(g)g.dataset.k='';mvLayout()}},200)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(MV.raf);MV.raf=0}else if(mvOn())mvStart()});

/* ------------------------------------------------------------ Start */
const css=document.createElement('style');css.textContent=`
.b3-menu{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px!important;overflow:visible!important;padding:0!important;margin:10px 0 8px;cursor:default!important}
.b3-menu button{display:flex;align-items:center;gap:7px;justify-content:flex-start;min-height:42px;padding:8px 10px;border-radius:12px;font-size:13.5px;text-align:left;white-space:normal;line-height:1.15;border-left:4px solid var(--c,var(--line))}
.b3-menu button span{font-size:16px;flex:none}
.b3-menu button[aria-pressed="true"]{background:color-mix(in srgb,var(--c) 24%,var(--panel2));border-color:var(--c);color:var(--fg);box-shadow:0 0 0 1px var(--c) inset}
.b3-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}
.b3-tools button{font-size:13px;padding:7px 11px;border-radius:10px}
.b3-tools .seg{display:inline-flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.b3-tools .seg button{border:0;border-radius:0;padding:7px 12px;min-width:38px;background:var(--panel2)}
.b3-tools .seg button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink,#000);font-weight:700}
.b3-tools [aria-pressed="true"]:not(.seg button){border-color:var(--accent)}
.b3-panel .b3{min-height:0!important}
.b3-grip{position:absolute;left:50%;bottom:4px;width:64px;height:16px;margin-left:-32px;border-radius:8px;cursor:ns-resize;z-index:3;touch-action:none;background:repeating-linear-gradient(0deg,transparent 0 4px,color-mix(in srgb,var(--fg) 40%,transparent) 4px 6px);opacity:.55}
.b3-grip:hover{opacity:1}
.b3-hidden{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}
.b3-pick{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}
.b3-pick label{display:inline-flex;align-items:center;gap:6px;font-size:13px;border:1px solid var(--line);border-left:4px solid var(--c);border-radius:10px;padding:6px 10px;background:var(--panel2);cursor:pointer}
.b3-multi{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr))}
.b3-multi.s-S{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.b3-multi.s-L{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}.b3-multi.s-XL{grid-template-columns:repeat(auto-fill,minmax(360px,1fr))}
.b3-cell{margin:0;position:relative;border:1px solid var(--line);border-top:3px solid var(--c);border-radius:14px;overflow:hidden;background:radial-gradient(ellipse at 50% 38%,color-mix(in srgb,var(--c) 14%,var(--panel2)),var(--panel2) 72%)}
.b3-cell canvas{display:block;width:100%;cursor:grab;touch-action:pan-y}
.b3-cell figcaption{position:absolute;left:8px;top:6px;font:700 12.5px var(--f-body,system-ui);display:flex;gap:6px;align-items:center;background:color-mix(in srgb,var(--panel) 80%,transparent);padding:3px 8px;border-radius:8px}
.b3-cell figcaption i{width:9px;height:9px;border-radius:50%;background:var(--c)}
.b3-full{position:fixed!important;inset:0!important;z-index:900!important;margin:0!important;border-radius:0!important;overflow:auto!important;background:var(--bg)!important;padding:max(12px,env(safe-area-inset-top)) 14px 24px!important;column-span:all}
.apx-noscroll{overflow:hidden!important}
.apx-winbtn{margin-left:auto;font-size:15px!important;padding:3px 9px!important;line-height:1.3;flex:none}.apx-winbtn.abs{position:absolute;right:12px;top:12px;z-index:2}.fhd:has(.apx-winbtn) .foldbtn{margin-left:4px}
section.panel.apx-max{position:fixed!important;inset:0!important;z-index:900!important;margin:0!important;border-radius:0!important;overflow:auto!important;background:var(--bg)!important;padding:max(14px,env(safe-area-inset-top)) 16px 28px!important;column-span:all}
section.panel.apx-max svg{max-height:none}
section.panel.apx-max .tscroll{max-height:none}
html.apx-paused *,html.apx-paused *::before,html.apx-paused *::after{animation-play-state:paused!important}
`;document.head.appendChild(css);
function start(){const view=document.getElementById('view');if(!view)return setTimeout(start,60);
  new MutationObserver(()=>{requestAnimationFrame(()=>{try{decorate();decorateAna();if(P.paused)applyPause()}catch(e){warn(e,'b3plus')}})}).observe(view,{childList:true});
  try{decorate();decorateAna()}catch(_){}applyPause()}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
window.ApexB3Plus={P,MV,setPaused,setMulti};
})();
