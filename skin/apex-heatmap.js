/* APEX Lift · Sport-Heatmap: wo trainierst du? Studios (geocodiert) + echte GPS-Strecken */
(function(){
'use strict';
if(window.__apexHeat)return;window.__apexHeat=1;
const A=()=>window.__apexFeatureApi||{};
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'')}};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const f1=(x)=>String(Math.round(x*10)/10).replace('.',',');

const HM={W:1000,H:560,busy:false,msg:'',pts:null,view:null,v:null};
{const c=document.createElement('style');c.textContent='#hmHost{touch-action:none;cursor:grab;user-select:none}#hmHost:active{cursor:grabbing}#hmHost img{pointer-events:none}.hm-zoom{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;gap:6px;align-items:center;z-index:3}.hm-zoom button{width:38px;height:38px;border-radius:12px;font-size:20px;font-weight:700;padding:0;background:rgba(10,14,20,.78);color:#fff;border:1px solid rgba(255,255,255,.2)}.hm-zoom span{font:600 10px var(--f-mono,monospace);color:#ddd;background:rgba(0,0,0,.55);padding:1px 5px;border-radius:4px}';document.head.appendChild(c)}

/* ------------------------------------------------------------ Datenquellen */
function rangeCut(){const t=today();const r=(ui.hmRange||'365');return r==='all'?'0000-00-00':addDays(t,-(+r))}
function gymVisitDays(cut){
  const by={};const add=(gid,d)=>{if(!gid||d<cut)return;(by[gid]=by[gid]||new Set()).add(d)};
  for(const s of S.sets)add(s.gymId,s.date);
  for(const w of (S.wellpass||[]))add(w.gymId,w.date);
  for(const g of (S.gymSessions||[]))add(g.gymId,g.date);
  return by}
function gymPoints(cut){
  const geo=S.gymGeo||{};const by=gymVisitDays(cut);const out=[];
  for(const g of S.gyms){const p=geo[g.id];if(!p||p.lat==null)continue;const n=by[g.id]?by[g.id].size:0;if(!n)continue;out.push({kind:'gym',id:g.id,name:g.name,lat:p.lat,lon:p.lon,n})}
  return out}
async function trackPoints(cut){
  const out=[];const T=S.tracks||{};let events=0;
  for(const [id,m] of Object.entries(T)){
    if(!m||(m.date&&m.date<cut))continue;
    let pts=null;try{pts=await trkLoad(id)}catch(_){}
    if(!pts||!pts.length){if(m.bbox){out.push({kind:'trk',lat:(m.bbox[0]+m.bbox[2])/2,lon:(m.bbox[1]+m.bbox[3])/2,w:1});events++}continue}
    events++;const step=Math.max(1,Math.floor(pts.length/400));
    for(let i=0;i<pts.length;i+=step){const p=pts[i];out.push({kind:'trk',lat:p[0]/1e5,lon:p[1]/1e5,w:1})}
  }
  return{pts:out,events}}

/* ------------------------------------------------------------ Geocoding (OpenStreetMap Nominatim) */
async function geocode(q){
  const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=de&q='+encodeURIComponent(q),{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error('Geocoding HTTP '+r.status);
  const j=await r.json();return j&&j[0]?{lat:+j[0].lat,lon:+j[0].lon,label:j[0].display_name}:null}
async function locateGyms(only){
  if(HM.busy)return;HM.busy=true;S.gymGeo=S.gymGeo||{};let ok=0,miss=[];
  try{
    const city=(S.heatCity||'München').trim();
    const list=S.gyms.filter(g=>g.id!=='gf-gym'&&(only?g.id===only:!S.gymGeo[g.id]));
    for(const g of list){
      HM.msg=`Suche ${g.name} …`;paint();
      let r=null;const q=(S.gymQuery&&S.gymQuery[g.id])||g.name;
      try{r=await geocode(q+' '+city);if(!r)r=await geocode(q)}catch(e){HM.msg='Geocoding nicht erreichbar: '+(e.message||e);break}
      if(r){S.gymGeo[g.id]={lat:r.lat,lon:r.lon,label:r.label,src:'osm'};ok++}else miss.push(g.name);
      await new Promise(res=>setTimeout(res,1100)); // Nutzungsrichtlinie: max. 1 Anfrage/s
    }
    save();HM.msg=ok?`${ok} Studio(s) verortet.`+(miss.length?` Nicht gefunden: ${miss.join(', ')}. Gib dafür unten eine genauere Adresse an.`:''):(miss.length?`Nicht gefunden: ${miss.join(', ')}. Gib unten eine genauere Adresse an.`:HM.msg||'Alle Studios sind bereits verortet.');
  }catch(e){warn(e,'locateGyms')}
  HM.busy=false;HM.pts=null;try{render()}catch(_){}}

/* ------------------------------------------------------------ Rendering */
const PAL=(()=>{const c=document.createElement('canvas');c.width=1;c.height=256;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,256);
  g.addColorStop(.0,'rgba(0,0,0,0)');g.addColorStop(.12,'rgba(0,70,255,.35)');g.addColorStop(.35,'rgba(0,212,255,.65)');g.addColorStop(.55,'rgba(125,255,107,.8)');g.addColorStop(.78,'rgba(255,212,0,.9)');g.addColorStop(1,'rgba(255,59,31,1)');
  x.fillStyle=g;x.fillRect(0,0,1,256);return x.getImageData(0,0,1,256).data})();
function fitView(P,W,H){
  if(!P.length)return null;
  let la0=90,la1=-90,lo0=180,lo1=-180;for(const p of P){la0=Math.min(la0,p.lat);la1=Math.max(la1,p.lat);lo0=Math.min(lo0,p.lon);lo1=Math.max(lo1,p.lon)}
  let z=16;while(z>3){const w=mercX(lo1,z)-mercX(lo0,z),h=mercY(la0,z)-mercY(la1,z);if(w<W*.8&&h<H*.8)break;z--}
  const cx=(mercX(lo0,z)+mercX(lo1,z))/2,cy=(mercY(la0,z)+mercY(la1,z))/2;
  return{z,ox:cx-W/2,oy:cy-H/2}}
function draw(host,G,T){
  const W=HM.W,H=HM.H;const P=[...G,...T];HM.lastG=G;HM.lastT=T;
  if(!HM.v){const f=fitView(P,W,H);if(!f){host.innerHTML='';return}HM.v={z:f.z,cx:f.ox+W/2,cy:f.oy+H/2};HM.fit={...HM.v}}
  const z=HM.v.z,ox=HM.v.cx-W/2,oy=HM.v.cy-H/2;
  let tiles='';const t0x=Math.floor(ox/256),t1x=Math.floor((ox+W)/256),t0y=Math.floor(oy/256),t1y=Math.floor((oy+H)/256);
  for(let tx=t0x;tx<=t1x;tx++)for(let ty=t0y;ty<=t1y;ty++){if(ty<0||ty>=2**z)continue;const tw=((tx%(2**z))+2**z)%(2**z);
    tiles+=`<img alt="" src="https://tile.openstreetmap.org/${z}/${tw}/${ty}.png" style="position:absolute;left:${(tx*256-ox)/W*100}%;top:${(ty*256-oy)/H*100}%;width:${256/W*100}%;height:${256/H*100}%;filter:grayscale(1) invert(1) brightness(.75) contrast(1.1)" onerror="this.remove()" loading="lazy" crossorigin="anonymous">`}
  host.innerHTML=`<div class="hm-stage" style="position:relative;width:100%;aspect-ratio:${W}/${H};transform-origin:0 0">${tiles}<canvas id="hmCv" width="${W}" height="${H}" style="position:absolute;inset:0;width:100%;height:100%"></canvas><canvas id="hmLb" width="${W}" height="${H}" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas><a class="small" style="position:absolute;right:6px;bottom:4px;background:rgba(0,0,0,.55);padding:1px 6px;border-radius:4px;color:#ddd" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a></div>
   <div class="hm-zoom"><button type="button" data-hmz="in" aria-label="Hineinzoomen">+</button><button type="button" data-hmz="out" aria-label="Herauszoomen">−</button><button type="button" data-hmz="fit" aria-label="Alles zeigen">⤢</button><span>Z ${z}</span></div>`;
  bindZoom(host);
  const cv=host.querySelector('#hmCv'),ctx=cv.getContext('2d');
  const sh=document.createElement('canvas');sh.width=W;sh.height=H;const sx=sh.getContext('2d');
  const maxN=Math.max(1,...G.map(p=>p.n));
  const blob=(x,y,r,a)=>{const gr=sx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(0,0,0,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');sx.fillStyle=gr;sx.beginPath();sx.arc(x,y,r,0,7);sx.fill()};
  for(const p of T)blob(mercX(p.lon,z)-ox,mercY(p.lat,z)-oy,13,.07);
  for(const p of G)blob(mercX(p.lon,z)-ox,mercY(p.lat,z)-oy,Math.max(26,Math.min(70,26+p.n*1.4)),Math.min(1,.45+p.n/maxN*.55));
  const img=sx.getImageData(0,0,W,H),d=img.data;
  for(let i=0;i<d.length;i+=4){const a=d[i+3];if(!a)continue;const j=Math.min(255,a)*4;d[i]=PAL[j];d[i+1]=PAL[j+1];d[i+2]=PAL[j+2];d[i+3]=PAL[j+3]}
  ctx.putImageData(img,0,0);
  const lb=host.querySelector('#hmLb').getContext('2d');lb.font='600 22px system-ui,sans-serif';lb.textBaseline='middle';
  for(const p of G){const x=mercX(p.lon,z)-ox,y=mercY(p.lat,z)-oy;lb.fillStyle='#fff';lb.strokeStyle='rgba(0,0,0,.85)';lb.lineWidth=4;lb.beginPath();lb.arc(x,y,5,0,7);lb.fill();lb.stroke();
    const txt=`${p.name} · ${p.n}×`;lb.strokeText(txt,x+12,y);lb.fillText(txt,x+12,y)}
}

/* ------------------------------------------------------------ Zoom & Verschieben (Mausrad, Ziehen, Zwei-Finger-Pinch, Doppeltipp, Knöpfe) */
function zoomAt(dz,fx,fy){ // fx,fy: Punkt im Kartenbild (0..W, 0..H), der fest stehen bleibt
  const v=HM.v;if(!v)return;const nz=clamp(v.z+dz,3,18);if(nz===v.z)return;const k=Math.pow(2,nz-v.z);
  const wx=v.cx-HM.W/2+fx,wy=v.cy-HM.H/2+fy;v.cx=(wx*k)-fx+HM.W/2;v.cy=(wy*k)-fy+HM.H/2;v.z=nz;redraw()}
function redraw(){const host=document.getElementById('hmHost');if(host&&HM.lastG)draw(host,HM.lastG,HM.lastT||[])}
function bindZoom(host){
  if(host.__hmz)return;host.__hmz=1;
  const local=(e)=>{const r=host.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*HM.W,y:(e.clientY-r.top)/r.height*HM.H,s:HM.W/r.width}};
  host.addEventListener('wheel',e=>{if(!HM.v)return;e.preventDefault();const p=local(e);clearTimeout(HM._wt);HM._wacc=(HM._wacc||0)+e.deltaY;
    HM._wt=setTimeout(()=>{const d=HM._wacc<0?1:-1;HM._wacc=0;zoomAt(d,p.x,p.y)},60)},{passive:false});
  const ptr=new Map();let start=null;
  const stage=()=>host.querySelector('.hm-stage');
  host.addEventListener('pointerdown',e=>{if(e.target.closest('.hm-zoom')||e.target.closest('a'))return;host.setPointerCapture(e.pointerId);ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(ptr.size===1)start={x:e.clientX,y:e.clientY,t:Date.now(),d:null};if(ptr.size===2){const [a,b]=[...ptr.values()];start={...start,d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2}}});
  host.addEventListener('pointermove',e=>{if(!ptr.has(e.pointerId)||!start)return;ptr.set(e.pointerId,{x:e.clientX,y:e.clientY});const st=stage();if(!st)return;
    if(ptr.size>=2&&start.d){const [a,b]=[...ptr.values()];const sc=Math.hypot(a.x-b.x,a.y-b.y)/start.d;const r=host.getBoundingClientRect();const ox=start.mx-r.left,oy=start.my-r.top;
      st.style.transform=`translate(${ox}px,${oy}px) scale(${sc}) translate(${-ox}px,${-oy}px)`;start.sc=sc}
    else if(ptr.size===1){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)>3){start.moved=true;st.style.transform=`translate(${dx}px,${dy}px)`;start.dx=dx;start.dy=dy}}});
  const end=e=>{if(!ptr.has(e.pointerId))return;ptr.delete(e.pointerId);if(!start||!HM.v)return;
    if(start.sc){if(ptr.size)return;const r=host.getBoundingClientRect();const p={x:(start.mx-r.left)/r.width*HM.W,y:(start.my-r.top)/r.height*HM.H};const dz=Math.round(Math.log2(start.sc));start=null;if(dz)zoomAt(dz,p.x,p.y);else redraw();return}
    if(start.moved){const s=HM.W/host.getBoundingClientRect().width;HM.v.cx-=start.dx*s;HM.v.cy-=start.dy*s;start=null;redraw();return}
    const now=Date.now();if(HM._tap&&now-HM._tap.t<320&&Math.hypot(HM._tap.x-e.clientX,HM._tap.y-e.clientY)<30){const p=local(e);HM._tap=null;start=null;zoomAt(1,p.x,p.y);return}
    HM._tap={t:now,x:e.clientX,y:e.clientY};start=null};
  host.addEventListener('pointerup',end);host.addEventListener('pointercancel',end);
  host.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-hmz]');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.hmz;
    if(a==='in')zoomAt(1,HM.W/2,HM.H/2);else if(a==='out')zoomAt(-1,HM.W/2,HM.H/2);else{HM.v=HM.fit?{...HM.fit}:null;redraw()}});
}
async function paint(){
  const host=document.getElementById('hmHost');const msg=document.getElementById('hmMsg');if(msg)msg.textContent=HM.msg||'';if(!host)return;
  try{
    const cut=rangeCut();const mode=ui.hmMode||'all';
    const G=mode==='trk'?[]:gymPoints(cut);
    let T=[],ev=0;if(mode!=='gym'){if(!HM.pts||HM.cut!==cut){const r=await trackPoints(cut);HM.pts=r.pts;HM.ev=r.events;HM.cut=cut}T=HM.pts;ev=HM.ev}
    if(!document.getElementById('hmHost'))return;
    if(!G.length&&!T.length){host.innerHTML=`<p class="small mute" style="padding:16px">Noch keine Orte. Tippe auf „Studios verorten“ oder importiere GPS-Strecken (Mehr → Karte / Daten).</p>`;return}
    draw(host,G,T);
    const st=document.getElementById('hmStat');if(st)st.textContent=`${G.length} Studio${G.length===1?'':'s'} · ${ev} GPS-Aktivität${ev===1?'':'en'}`;
  }catch(e){warn(e,'heat paint');if(host)host.innerHTML='<p class="small mute" style="padding:16px">Karte konnte nicht gezeichnet werden.</p>'}
}

/* ------------------------------------------------------------ View */
function gymRows(){
  const geo=S.gymGeo||{};const by=gymVisitDays('0000-00-00');
  return S.gyms.filter(g=>g.id!=='gf-gym').map(g=>{const p=geo[g.id];const n=by[g.id]?by[g.id].size:0;
    return`<div class="item" style="flex-direction:column;align-items:stretch;gap:6px"><div class="row between"><strong>${Esc(g.name)}</strong><span class="small mute">${n} Trainingstag${n===1?'':'e'} · ${p?`<span class="pill ok">verortet</span>`:`<span class="pill warn">ohne Ort</span>`}</span></div>
     <div class="row" style="gap:6px;flex-wrap:nowrap"><input data-hmq="${Esc(g.id)}" value="${Esc((S.gymQuery&&S.gymQuery[g.id])||'')}" placeholder="Adresse oder Suchbegriff (optional)" style="flex:1;min-width:0"><button class="sm" data-hm="locate|${Esc(g.id)}">Orten</button></div>
     ${p&&p.label?`<span class="small mute" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Esc(p.label)}</span>`:''}</div>`}).join('')}
VIEWS.heat=function(){
  const mode=ui.hmMode||'all',rg=ui.hmRange||'365';
  const nGeo=Object.keys(S.gymGeo||{}).length,nTrk=Object.keys(S.tracks||{}).length;
  setTimeout(paint,30);
  const chip=(k,v,l,cur)=>`<button data-hm="${k}|${v}" aria-pressed="${cur===v}">${l}</button>`;
  return`<section class="panel"><h1>Sport-Heatmap</h1><p class="small mute">Wo du wirklich trainierst: Studios nach Anzahl der Trainingstage, dazu die echten GPS-Spuren aus importierten Läufen, Radfahrten, Wanderungen und Touren. Rot = sehr häufig.</p>
   <div class="chips" role="group" aria-label="Quelle">${chip('mode','all','Alles',mode)}${chip('mode','gym','Studios',mode)}${chip('mode','trk','GPS-Strecken',mode)}</div>
   <div class="chips" role="group" aria-label="Zeitraum">${chip('range','90','3 Monate',rg)}${chip('range','365','12 Monate',rg)}${chip('range','all','Alles',rg)}</div>
   <div class="hm-wrap" id="hmHost"><p class="small mute" style="padding:16px">Karte wird geladen …</p></div>
   <p class="small mute" style="margin:4px 0 0">Zoomen: Mausrad, zwei Finger oder Doppeltipp · Verschieben: ziehen · ⤢ zeigt wieder alles.</p><div class="hm-leg"><span>selten</span><i></i><span>häufig</span><span style="margin-left:auto" id="hmStat"></span></div>
   <p class="small" id="hmMsg">${Esc(HM.msg||'')}</p>
   <div class="row"><button class="primary" data-hm="locate|" ${HM.busy?'disabled':''}>Studios verorten${nGeo?` (${S.gyms.filter(g=>g.id!=='gf-gym'&&!(S.gymGeo||{})[g.id]).length} fehlen)`:''}</button><label class="f" style="flex:1 1 140px;margin:0">Stadt/Region für die Suche<input id="hmCity" value="${Esc(S.heatCity||'München')}"></label></div></section>
  <section class="panel"><h2>GPS-Daten</h2><p class="small">${nTrk?`${nTrk} Strecken sind gespeichert und fließen in die Heatmap ein.`:'Es sind noch keine GPS-Strecken gespeichert, deshalb zeigt die Karte vorerst nur Studios.'}</p>
   <p class="small mute">Echte Orte kommen aus GPX-, TCX- oder FIT-Dateien. Am schnellsten: den kompletten Strava-Export (ZIP) oder einzelne Aktivitätsdateien importieren (Mehr → Karte bzw. Cardio → Import). Die Punkte werden auf dem Gerät verarbeitet und mit deinem Konto synchronisiert.</p></section>
  <section class="panel"><h2>Studios</h2><div class="list">${gymRows()}</div><p class="small mute">Die Position kommt aus OpenStreetMap-Suche. Stimmt ein Treffer nicht, trage eine genauere Adresse ein und tippe „Orten“.</p></section>`};
document.addEventListener('click',(ev)=>{
  const b=ev.target.closest&&ev.target.closest('[data-hm]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  const [k,...r]=b.dataset.hm.split('|');const v=r.join('|');
  try{
    if(k==='mode'){ui.hmMode=v;HM.pts=null;HM.v=null;render();return}
    if(k==='range'){ui.hmRange=v;HM.pts=null;HM.v=null;render();return}
    if(k==='locate'){const c=document.getElementById('hmCity');if(c&&c.value.trim())S.heatCity=c.value.trim();
      if(v){const q=document.querySelector('[data-hmq="'+v+'"]');S.gymQuery=S.gymQuery||{};if(q)S.gymQuery[v]=q.value.trim();delete (S.gymGeo||{})[v]}
      save();locateGyms(v||null);return}
  }catch(e){warn(e,'heat click')}
},true);

/* ------------------------------------------------------------ Registrierung */
(window.__apexExtraBoot=window.__apexExtraBoot||[]).push(function(){
  if(!MODULES.some(m=>m[0]==='heat')){const i=MODULES.findIndex(m=>m[0]==='berg');MODULES.splice(i<0?MODULES.length:i+1,0,['heat','Sport-Heatmap','Wo du trainierst: Studios und echte GPS-Strecken auf der Karte'])}
});
})();
