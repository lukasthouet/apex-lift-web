/* APEX Lift · Pulsverlauf zu importierten Einheiten (Nov 2026)
   Holt die von Google Health synchronisierten Herzfrequenz-Werte (RPC gh_hr_series, gemittelt je 30 s) für Einheiten mit Startzeit
   und zeigt sie als Verlauf. Es wird nichts erfunden: Fehlen Werte (z. B. noch nicht synchronisiert), steht das so da und wird später nachgeholt. */
(function(){
'use strict';
if(window.__apexHr)return;window.__apexHr=1;
const A=window.ApexBox;if(!A){console.warn('apex-hrverlauf: Kern fehlt');return}
const E=A.esc;
const cloud=()=>{try{return typeof syncClient!=='undefined'&&syncClient&&typeof syncUser!=='undefined'&&syncUser?syncClient:null}catch(_){return null}};
const isGh=(a)=>!!a&&a.source==='Google Health'&&a.date&&a.time&&a.min>=5;
const winOf=(a)=>{const st=new Date(a.date+'T'+a.time+':00');return isNaN(st)?null:{st,en:new Date(st.getTime()+a.min*60000)}};
let busy=false;const failed=new Set();
async function fetchOne(c,a){const w=winOf(a);if(!w)return false;const bucket=a.min>180?60:30;
  const {data,error}=await c.rpc('gh_hr_series',{p_start:w.st.toISOString(),p_end:w.en.toISOString(),p_bucket:bucket});
  if(error||!data)throw new Error(error&&error.message||'leer');
  const pts=data.pts||[];const cov=pts.length*bucket/(a.min*60);
  a.hrs={b:bucket,p:pts,at:Date.now(),part:cov<0.7};
  if(pts.length){const mx=Math.max(...pts.map(x=>x[2]));if(!a.hrMax||a.hrMax<mx)a.hrMax=mx;if(!a.hr){a.hr=Math.round(pts.reduce((s,x)=>s+x[1],0)/pts.length)}}
  return true}
// Welche Einheiten brauchen Werte? Neu (14 Tage) und noch ohne Verlauf, oder Verlauf lückenhaft und älter als 3 h.
const need=(a)=>{if(!isGh(a)||failed.has(a.id))return false;const age=A.dd(A.today(),a.date);if(age<0||age>14)return false;if(!a.hrs)return true;return a.hrs.part&&Date.now()-a.hrs.at>3*36e5};
A.hrBackfill=async(force)=>{if(busy)return 0;const c=cloud();if(!c)return 0;const L=A.list('activities').filter(need).sort((x,y)=>x.date<y.date?1:-1).slice(0,12);if(!L.length)return 0;
  busy=true;let n=0;try{for(const a of L){try{if(await fetchOne(c,a))n++}catch(e){failed.add(a.id)}}}finally{busy=false}
  if(n){try{A.save()}catch(_){}}return n};

/* Diagramm: Linie = Ø je Zeitfenster, Band bis Maximum */
A.hrChart=(a)=>{const h=a&&a.hrs;if(!h)return'';
  if(!h.p.length)return`<div class="small mute">Pulsverlauf: für diese Einheit liegen noch keine Herzfrequenz-Werte vor${isGh(a)?' (wird beim nächsten Sync nachgeholt)':''}.</div>`;
  const W=300,H=84,L=26,dur=a.min*60,mx=Math.max(...h.p.map(x=>x[2])),mn=Math.min(...h.p.map(x=>x[1]));const hi=Math.ceil((mx+5)/10)*10,lo=Math.floor((mn-5)/10)*10;
  const X=s=>L+(Math.min(s,dur)/dur)*(W-L-4),Y=v=>H-14-((v-lo)/(hi-lo||1))*(H-22);
  const line=h.p.map((x,i)=>(i?'L':'M')+X(x[0]).toFixed(1)+' '+Y(x[1]).toFixed(1)).join('');
  const area=h.p.map((x,i)=>(i?'L':'M')+X(x[0]).toFixed(1)+' '+Y(x[2]).toFixed(1)).join('')+h.p.slice().reverse().map(x=>'L'+X(x[0]).toFixed(1)+' '+Y(x[1]).toFixed(1)).join('')+'Z';
  const avg=Math.round(h.p.reduce((s,x)=>s+x[1],0)/h.p.length);
  return`<div class="hrchart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pulsverlauf, Durchschnitt ${avg}, Maximum ${mx}" style="width:100%;max-width:520px;height:auto">
    <path d="${area}" fill="var(--accent)" opacity=".18"/><path d="${line}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round"/>
    <text x="2" y="${Y(hi).toFixed(0)+4}" font-size="9" fill="currentColor" opacity=".6">${hi}</text><text x="2" y="${Y(lo)}" font-size="9" fill="currentColor" opacity=".6">${lo}</text>
    <text x="${L}" y="${H-2}" font-size="9" fill="currentColor" opacity=".6">0</text><text x="${W-4}" y="${H-2}" font-size="9" text-anchor="end" fill="currentColor" opacity=".6">${a.min} min</text></svg>
    <div class="small mute">Ø ${avg} · max ${mx} bpm${h.part?' · Verlauf lückenhaft (Werte noch nicht vollständig synchronisiert)':''}</div></div>`};

/* Einbindung in Boxen: Verlauf im Einheiten-Eintrag und Nachholen beim Öffnen */
A.boxExtra=(s)=>{const g=s&&s.gh;if(!g)return'';const bits=[];if(g.hr)bits.push(`Ø Puls ${g.hr}`);if(g.hrMax)bits.push(`max ${g.hrMax}`);if(g.kcal)bits.push(`${g.kcal} kcal`);
  return`<div class="small mute">${bits.length?'Google Health: '+bits.join(' · '):''}</div>${A.hrChart(g)}`};
if(typeof VIEWS.boxen==='function'){const _b=VIEWS.boxen;VIEWS.boxen=function(){const h=_b.apply(this,arguments);setTimeout(()=>{A.hrBackfill().then(n=>{if(n&&tab==='boxen')try{render()}catch(_){}})},50);return h}}
setTimeout(()=>{A.hrBackfill().catch(()=>{})},9000);
setInterval(()=>{A.hrBackfill().catch(()=>{})},30*60*1000);
})();
