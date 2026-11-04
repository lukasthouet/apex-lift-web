/* APEX Lift · Health-Browser (Mehr → Health-Browser)
   1) Tageswerte: alles, was in der App liegt (Schlaf, HRV, Ruhepuls, Schritte …), mit Diagramm, Tabelle und Tagesdetail
   2) Rohdaten: jede einzelne Messung, die Google Health an den Server geliefert hat (nur eigene Zeilen, RLS) */
(function(){
'use strict';
if(window.__apexHBrowse)return;window.__apexHBrowse=1;
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const cloud=()=>{try{return typeof syncClient!=='undefined'&&syncClient&&typeof syncUser!=='undefined'&&syncUser?{c:syncClient,u:syncUser}:null}catch(_){return null}};
const de=(x,d=0)=>x==null||!isFinite(x)?'–':Number(x).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const hm=(m)=>m==null?'–':Math.floor(m/60)+':'+String(Math.round(m%60)).padStart(2,'0');
const dLong=(d)=>{try{return new Date(d+'T12:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}catch(_){return d}};

/* Kennzahlen der Tageswerte: [Schlüssel, Name, Einheit, Format, Farbe, höher ist besser?] */
const MET=[
 ['sleepMin','Schlaf','h',v=>hm(v),'#7c8cff',1],['deepMin','Tiefschlaf','min',v=>de(v),'#3f57c9',1],['remPct','REM','%',v=>de(v),'#9ec9ff',1],['awakeMin','Wach','min',v=>de(v),'#e98a3a',-1],
 ['sleepScore','Schlaf-Score','',v=>de(v),'#8b7cff',1],['hrv','HRV','ms',v=>de(v),'#3ddc97',1],['rhr','Ruhepuls','bpm',v=>de(v),'#ff4f7b',-1],['resp','Atemfrequenz','/min',v=>de(v,1),'#4fc3ff',0],
 ['spo2','SpO₂','%',v=>de(v,1),'#2ee6d6',1],['tempDev','Hauttemperatur Δ','°C',v=>(v>0?'+':'')+de(v,2),'#ffb03d',0],['steps','Schritte','',v=>de(v),'#c8f169',1],['km','Distanz','km',v=>de(v,1),'#85c442',1],
 ['azm','Aktivzonen-Min.','min',v=>de(v),'#ffd23f',1],['activeKcal','Aktive kcal','kcal',v=>de(v),'#ff9a3d',1],['sedMin','Sitzzeit','h',v=>hm(v),'#a99dc4',-1],['ready','Readiness','',v=>de(v),'#3ddc97',1],
 ['vo2','VO₂max','',v=>de(v,1),'#ff4fd8',1],['fbStress','Stress-Score','',v=>de(v),'#e2be3b',1]];
const metOf=k=>MET.find(m=>m[0]===k)||MET[0];
const HB={mode:'days',met:'sleepMin',range:'30',page:0,sort:{k:'d',dir:-1},q:'',sel:null,
  ov:null,ovBusy:false,ovErr:'',type:null,rows:null,rowsBusy:false,rowsErr:'',rpage:0,from:'',to:'',open:null,total:null};

/* ------------------------------------------------------------ Tageswerte */
function dayRows(){const V=S.vitals||{};return Object.entries(V).map(([d,v])=>({d,...v})).sort((a,b)=>a.d<b.d?-1:1)}
function rangeFilter(L){if(HB.range==='all')return L;const cut=addDays(today(),-(+HB.range)+1);return L.filter(x=>x.d>=cut)}
function chart(L,m){
  const pts=L.filter(x=>x[m[0]]!=null);if(pts.length<2)return`<p class="small mute">Zu wenig Werte für „${Esc(m[1])}“ im gewählten Zeitraum.</p>`;
  const W=720,H=220,Lp=46,R=10,T=12,B=26;const vs=pts.map(x=>+x[m[0]]);let lo=Math.min(...vs),hi=Math.max(...vs);if(hi===lo){hi+=1;lo-=1}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;
  const d0=new Date(pts[0].d+'T12:00').getTime(),d1=new Date(pts.at(-1).d+'T12:00').getTime();const X=d=>Lp+((new Date(d+'T12:00').getTime()-d0)/((d1-d0)||1))*(W-Lp-R);const Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const avg=vs.reduce((a,b)=>a+b,0)/vs.length;const bw=Math.max(2,Math.min(16,(W-Lp-R)/pts.length*.7));
  let g='';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;const y=Y(v);g+=`<line x1="${Lp}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${Lp-6}" y="${y+4}" text-anchor="end">${Esc(m[3](v))}</text>`}
  const step=Math.max(1,Math.ceil(pts.length/8));pts.forEach((p,i)=>{if(i%step===0||i===pts.length-1)g+=`<text x="${X(p.d)}" y="${H-8}" text-anchor="middle">${p.d.slice(8,10)}.${p.d.slice(5,7)}.</text>`});
  const bars=pts.map(p=>`<rect data-hbday="${p.d}" x="${(X(p.d)-bw/2).toFixed(1)}" y="${Y(+p[m[0]]).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1,H-B-Y(+p[m[0]])).toFixed(1)}" rx="${Math.min(4,bw/3).toFixed(1)}" fill="${m[4]}" opacity="${HB.sel===p.d?1:.78}" style="cursor:pointer"><title>${dLong(p.d)}: ${Esc(m[3](+p[m[0]]))} ${Esc(m[2])}</title></rect>`).join('');
  // 7-Tage-Mittel
  const ma=pts.map((p,i)=>{const w=pts.slice(Math.max(0,i-6),i+1).map(x=>+x[m[0]]);return[X(p.d),Y(w.reduce((a,b)=>a+b,0)/w.length)]});
  return`<svg class="hb-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${Esc(m[1])} Verlauf">${g}${bars}<path d="M${ma.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' L')}" fill="none" stroke="var(--fg)" stroke-width="2" opacity=".7"/><line x1="${Lp}" x2="${W-R}" y1="${Y(avg)}" y2="${Y(avg)}" stroke="var(--fg)" stroke-dasharray="4 4" opacity=".45"/></svg>
   <div class="legend small mute"><span>Balken: Tageswert · Linie: 7-Tage-Mittel · gestrichelt: Ø ${Esc(m[3](avg))} ${Esc(m[2])} (${pts.length} Tage) · Balken antippen für Details</span></div>`}
function dayDetail(d){
  const v=(S.vitals||{})[d];if(!v)return'';let hyp='';try{const st=typeof SLEEPST!=='undefined'&&SLEEPST&&SLEEPST[d];if(st&&typeof hypnogram==='function')hyp=hypnogram(st,{H:120})}catch(_){}
  const acts=[...(S.activities||[]).filter(a=>a.date===d).map(a=>`${Esc(a.type||a.name||'Aktivität')} · ${de(a.min)} min${a.km?' · '+de(a.km,1)+' km':''}${a.hr?' · Ø '+a.hr+' bpm':''}`),...(S.swims||[]).filter(s=>s.date===d).map(s=>`Schwimmen · ${s.laps} Bahnen`)];
  const w=(S.weights||[]).filter(x=>x.date===d).map(x=>`${de(x.kg,1)} kg${x.fat!=null?' · '+de(x.fat,1)+' % Fett':''}`);
  const cells=MET.filter(m=>v[m[0]]!=null).map(m=>`<div><span>${Esc(m[1])}</span><b>${Esc(m[3](+v[m[0]]))}<small> ${Esc(m[2])}</small></b></div>`).join('');
  return`<section class="panel hb-day" data-nofold="1"><div class="row between"><h2>${dLong(d)}</h2><span class="row" style="gap:6px"><button class="sm" data-hb="dayprev">‹</button><button class="sm" data-hb="daynext">›</button><button class="sm ghost" data-hb="dayclose">✕</button></span></div>
   <div class="apx-kv">${cells}${v.bed?`<div><span>Im Bett</span><b>${Esc(v.bed)}–${Esc(v.wake||'')}</b></div>`:''}</div>
   ${hyp}${acts.length?`<p class="small"><b>Aktivitäten:</b> ${acts.join(' · ')}</p>`:''}${w.length?`<p class="small"><b>Körper:</b> ${w.join(' · ')}</p>`:''}
   <p class="small mute">Quelle: ${Esc(v.source||'Google Health')}</p></section>`}
function daysView(){
  const all=dayRows();const L=rangeFilter(all);const m=metOf(HB.met);
  const cols=['d',...MET.map(x=>x[0]).filter(k=>L.some(r=>r[k]!=null))];
  let rows=L.slice();if(HB.q)rows=rows.filter(r=>r.d.includes(HB.q)||dLong(r.d).toLowerCase().includes(HB.q.toLowerCase()));
  const {k,dir}=HB.sort;rows.sort((a,b)=>{const x=a[k],y=b[k];if(x==null)return 1;if(y==null)return-1;return(x<y?-1:x>y?1:0)*dir});
  const P=40,pages=Math.max(1,Math.ceil(rows.length/P));HB.page=Math.min(HB.page,pages-1);const view=rows.slice(HB.page*P,HB.page*P+P);
  const nm=k=>k==='d'?'Datum':metOf(k)[1];
  return`${HB.sel?dayDetail(HB.sel):''}
  <section class="panel" data-nofold="1"><h2>Verlauf</h2>
   <div class="hb-mets" role="group" aria-label="Kennzahl">${MET.filter(x=>all.some(r=>r[x[0]]!=null)).map(x=>`<button data-hbmet="${x[0]}" aria-pressed="${x[0]===HB.met}" style="--c:${x[4]}"><i></i>${Esc(x[1])}</button>`).join('')}</div>
   <div class="chips" role="group" aria-label="Zeitraum">${[['7','7 T'],['30','30 T'],['90','3 M'],['365','12 M'],['all','Alles']].map(([v,l])=>`<button data-hbr="${v}" aria-pressed="${HB.range===v}">${l}</button>`).join('')}</div>
   ${chart(L,m)}</section>
  <section class="panel" data-nofold="1"><div class="row between"><h2>Alle Tage</h2><span class="small mute">${rows.length} Tage · ${cols.length-1} Kennzahlen</span></div>
   <div class="row"><input id="hbQ" placeholder="Datum suchen, z. B. 2026-10 oder Mo" value="${Esc(HB.q)}" style="flex:1 1 200px"><button class="sm" data-hb="csv">CSV</button></div>
   <div class="tscroll hb-table"><table><thead><tr>${cols.map(c=>`<th><button class="sm ghost" data-hbsort="${c}">${Esc(nm(c))}${k===c?(dir>0?' ▲':' ▼'):''}</button></th>`).join('')}</tr></thead>
   <tbody>${view.map(r=>`<tr data-hbday="${r.d}" class="${HB.sel===r.d?'sel':''}">${cols.map(c=>c==='d'?`<td class="num">${Esc(r.d.slice(8,10)+'.'+r.d.slice(5,7)+'.'+r.d.slice(2,4))}</td>`:`<td class="n">${r[c]==null?'<span class="mute">–</span>':Esc(metOf(c)[3](+r[c]))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
   ${pages>1?`<div class="row"><button class="sm" data-hb="pprev" ${HB.page?'':'disabled'}>‹ zurück</button><span class="small mute">Seite ${HB.page+1} / ${pages}</span><button class="sm" data-hb="pnext" ${HB.page<pages-1?'':'disabled'}>weiter ›</button></div>`:''}</section>`}

/* ------------------------------------------------------------ Rohdaten */
const TYPE_DE={'sleep':'Schlaf','steps':'Schritte','heart-rate':'Herzfrequenz','heart-rate-variability':'HRV (Einzelmessungen)','daily-heart-rate-variability':'HRV täglich','daily-resting-heart-rate':'Ruhepuls täglich',
 'daily-respiratory-rate':'Atemfrequenz täglich','daily-oxygen-saturation':'SpO₂ täglich','oxygen-saturation':'SpO₂ Einzelmessungen','daily-sleep-temperature-derivations':'Hauttemperatur nachts','exercise':'Trainings',
 'exercise-route':'GPS-Routen (TCX)','weight':'Gewicht','body-fat':'Körperfett','height':'Größe','distance':'Distanz','active-energy-burned':'Aktive Energie','active-minutes':'Aktive Minuten','active-zone-minutes':'Aktivzonen-Minuten',
 'activity-level':'Aktivitätsstufe','sedentary-period':'Sitzphasen','swim-lengths-data':'Schwimmbahnen','time-in-heart-rate-zone':'Zeit in HF-Zone','daily-heart-rate-zones':'HF-Zonen täglich','floors':'Stockwerke',
 'respiratory-rate-sleep-summary':'Atmung im Schlaf','total-calories':'Gesamtkalorien','vo2-max':'VO₂max','daily-vo2-max':'VO₂max täglich','run-vo2-max':'VO₂max Laufen','user/profile':'Profil','user/settings':'Einstellungen'};
const tName=t=>TYPE_DE[t]||t;
function inner(p){if(!p||typeof p!=='object')return{};const k=Object.keys(p).find(k=>!['name','dataPointName','dataSource','createTime','updateTime'].includes(k)&&p[k]&&typeof p[k]==='object');return k?p[k]:{}}
function valueOf(type,p){const o=inner(p);try{
  if(type==='sleep'){const s=o.summary||{};return`${hm(+s.minutesAsleep)} h Schlaf · ${s.minutesAwake||0} min wach${o.metadata&&o.metadata.mainSleep?' · Hauptschlaf':''}`}
  if(type==='exercise'){const m=o.metricsSummary||{};return`${o.displayName||o.exerciseType} · ${de(parseFloat(o.activeDuration)/60)} min${m.distanceMillimeters?' · '+de(m.distanceMillimeters/1e6,2)+' km':''}${m.averageHeartRateBeatsPerMinute?' · Ø '+m.averageHeartRateBeatsPerMinute+' bpm':''}${m.caloriesKcal?' · '+de(m.caloriesKcal)+' kcal':''}`}
  if(type==='exercise-route')return`TCX · ${de((p.routeTcx||'').length/1024)} KB`;
  if(type==='weight')return de(o.weightGrams/1000,1)+' kg';if(type==='height')return de(o.heightMillimeters/10)+' cm';
  if(type==='heart-rate')return o.beatsPerMinute+' bpm';if(type==='steps')return o.count+' Schritte';if(type==='distance')return de(o.millimeters/1000)+' m';
  if(type==='daily-heart-rate-zones')return(o.heartRateZones||[]).map(z=>`${z.heartRateZoneType}: ${z.minBeatsPerMinute}–${z.maxBeatsPerMinute}`).join(' · ');
  if(type==='activity-level')return o.activityLevelType;if(type==='time-in-heart-rate-zone')return o.heartRateZoneType;
  if(type==='active-zone-minutes')return`${o.activeZoneMinutes} min · ${o.heartRateZone||''}`;
  if(type==='active-minutes')return(o.activeMinutesByActivityLevel||[]).map(x=>`${x.activeMinutes} ${x.activityLevel}`).join(', ');
  if(type==='sedentary-period'&&o.interval)return de((new Date(o.interval.endTime)-new Date(o.interval.startTime))/6e4)+' min';
  const nums=Object.entries(o).filter(([k,v])=>!['date','interval','sampleTime'].includes(k)&&(typeof v==='number'||(typeof v==='string'&&/^-?[\d.]+$/.test(v))));
  if(nums.length)return nums.slice(0,3).map(([k,v])=>`${k.replace(/([A-Z])/g,' $1').toLowerCase()}: ${de(+v,Math.abs(+v)<20&&+v%1?2:0)}`).join(' · ');
  return Object.keys(o).slice(0,4).join(', ')||'–'}catch(_){return'–'}}
async function loadOverview(){
  const k=cloud();if(!k){HB.ovErr='Bitte anmelden – Rohdaten liegen in deinem Konto auf dem Server.';paint();return}
  HB.ovBusy=true;HB.ovErr='';paint();
  try{const {data,error}=await k.c.rpc('gh_overview');if(error)throw error;
    const by={};for(const x of data||[]){const best=by[x.type];const rank=s=>({reconciled:0,wearable_reconciled:1,raw:2}[s]??3);if(!best||rank(x.stream)<rank(best.stream))by[x.type]=x}
    HB.ov=Object.values(by).sort((a,b)=>tName(a.type).localeCompare(tName(b.type),'de'))}
  catch(e){HB.ovErr=e.message||String(e)}HB.ovBusy=false;paint()}
async function loadRows(){
  const k=cloud();const T=HB.ov&&HB.ov.find(x=>x.type===HB.type);if(!k||!T)return;
  HB.rowsBusy=true;HB.rowsErr='';paint();
  try{const P=50;let q=k.c.from('google_health_data').select('external_id,start_time,end_time,payload,observed_at',{count:'exact'}).eq('data_type',T.type).eq('stream',T.stream);
    if(HB.from)q=q.gte('start_time',HB.from+'T00:00:00');if(HB.to)q=q.lte('start_time',HB.to+'T23:59:59');
    q=q.order('start_time',{ascending:false,nullsFirst:false}).range(HB.rpage*P,HB.rpage*P+P-1);
    const {data,error,count}=await q;if(error)throw error;HB.rows=data||[];HB.total=count}
  catch(e){HB.rowsErr=e.message||String(e)}HB.rowsBusy=false;paint()}
const fmtTs=(t)=>t?new Date(t).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}):'–';
function rawView(){
  if(!cloud())return`<section class="panel" data-nofold="1"><p class="small mute">Melde dich an (Konto oben), dann siehst du hier jede einzelne Messung, die Google Health geliefert hat.</p></section>`;
  if(!HB.ov&&!HB.ovBusy&&!HB.ovErr)setTimeout(loadOverview,0);
  const list=HB.ov||[];const T=list.find(x=>x.type===HB.type);
  return`<section class="panel" data-nofold="1"><div class="row between"><h2>Datentypen auf dem Server</h2><button class="sm" data-hb="reload">Aktualisieren</button></div>
   ${HB.ovErr?`<p class="small" style="color:var(--bad)">${Esc(HB.ovErr)}</p>`:''}${HB.ovBusy?'<p class="small mute">Lade Übersicht …</p>':''}
   <div class="hb-types">${list.map(x=>`<button data-hbtype="${Esc(x.type)}" aria-pressed="${x.type===HB.type}"><b>${Esc(tName(x.type))}</b><span>${Number(x.n).toLocaleString('de-DE')} Werte</span><small>${x.first?fmtTs(x.first).slice(0,8):'–'} – ${x.last?fmtTs(x.last).slice(0,8):'–'}</small></button>`).join('')}</div>
   ${list.length?`<p class="small mute">Hochfrequente Minutenwerte (Herzfrequenz, Aktivitätsstufe …) speichert der Server nur für die letzten Tage; Tagessummen, Schlaf, Trainings und Körperwerte vollständig.</p>`:''}</section>
  ${T?`<section class="panel" data-nofold="1"><div class="row between"><h2>${Esc(tName(T.type))}</h2><span class="small mute">${HB.total!=null?Number(HB.total).toLocaleString('de-DE')+' Treffer':''}</span></div>
   <div class="row"><label class="f" style="flex:1 1 130px;margin:0">von<input type="date" id="hbFrom" value="${Esc(HB.from)}"></label><label class="f" style="flex:1 1 130px;margin:0">bis<input type="date" id="hbTo" value="${Esc(HB.to)}"></label><button class="sm" data-hb="filter">Filtern</button><button class="sm ghost" data-hb="clear">Zurücksetzen</button></div>
   ${HB.rowsErr?`<p class="small" style="color:var(--bad)">${Esc(HB.rowsErr)}</p>`:''}${HB.rowsBusy?'<p class="small mute">Lade …</p>':''}
   <div class="list hb-raw">${(HB.rows||[]).map((r,i)=>`<div class="item" data-hbopen="${i}"><div class="main"><div class="t">${Esc(valueOf(T.type,r.payload))}</div><div class="small mute">${fmtTs(r.start_time)}${r.end_time?' – '+fmtTs(r.end_time).slice(-5):''}</div>
     ${HB.open===i?`<pre class="hb-json">${Esc(JSON.stringify(r.payload,null,2).slice(0,6000))}</pre>`:''}</div><span class="small mute">${HB.open===i?'▲':'▼'}</span></div>`).join('')||(HB.rowsBusy?'':'<p class="small mute">Keine Werte im Zeitraum.</p>')}</div>
   <div class="row"><button class="sm" data-hb="rprev" ${HB.rpage?'':'disabled'}>‹ neuer</button><span class="small mute">Seite ${HB.rpage+1}${HB.total?' / '+Math.max(1,Math.ceil(HB.total/50)):''}</span><button class="sm" data-hb="rnext" ${HB.total!=null&&(HB.rpage+1)*50<HB.total?'':'disabled'}>älter ›</button></div></section>`:''}`}

/* ------------------------------------------------------------ View */
function view(){
  const n=Object.keys(S.vitals||{}).length;
  return`<section class="panel" data-nofold="1"><div class="row between"><h1>Health-Browser</h1><button class="sm" data-tab="sync">Sync</button></div>
   <p class="small mute">Alle Gesundheits- und Aktivitätsdaten zum Durchblättern: Tageswerte in der App (${n} Tage) und die einzelnen Rohmessungen aus Google Health.</p>
   <div class="chips" role="tablist"><button data-hbmode="days" aria-pressed="${HB.mode==='days'}">Tageswerte</button><button data-hbmode="raw" aria-pressed="${HB.mode==='raw'}">Rohdaten (Google Health)</button></div></section>
  ${HB.mode==='raw'?rawView():daysView()}`}
let painting=false;
function paint(){if(painting)return;painting=true;requestAnimationFrame(()=>{painting=false;try{if(typeof tab!=='undefined'&&tab==='hbrowse')render()}catch(e){warn(e,'hb paint')}})}
function csv(){const L=rangeFilter(dayRows());const cols=['d',...MET.map(x=>x[0]).filter(k=>L.some(r=>r[k]!=null))];
  const txt=[cols.map(c=>c==='d'?'Datum':metOf(c)[1]+(metOf(c)[2]?' ('+metOf(c)[2]+')':'')).join(';'),...L.map(r=>cols.map(c=>c==='d'?r.d:r[c]==null?'':String(r[c]).replace('.',',')).join(';'))].join('\n');
  const b=new Blob(['﻿'+txt],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='apex-tageswerte-'+today()+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
document.addEventListener('click',ev=>{
  if(typeof tab==='undefined'||tab!=='hbrowse')return;const t=ev.target;
  const g=s=>t.closest&&t.closest(s);let b;
  if((b=g('[data-hbmode]'))){HB.mode=b.dataset.hbmode;paint();return}
  if((b=g('[data-hbmet]'))){HB.met=b.dataset.hbmet;paint();return}
  if((b=g('[data-hbr]'))){HB.range=b.dataset.hbr;HB.page=0;paint();return}
  if((b=g('[data-hbsort]'))){const k=b.dataset.hbsort;HB.sort=HB.sort.k===k?{k,dir:-HB.sort.dir}:{k,dir:-1};paint();return}
  if((b=g('[data-hbday]'))){HB.sel=HB.sel===b.dataset.hbday?null:b.dataset.hbday;paint();if(HB.sel)setTimeout(()=>{const p=document.querySelector('.hb-day');if(p)p.scrollIntoView({behavior:'smooth',block:'nearest'})},60);return}
  if((b=g('[data-hbtype]'))){HB.type=b.dataset.hbtype;HB.rpage=0;HB.open=null;HB.rows=null;HB.total=null;loadRows();return}
  if((b=g('[data-hbopen]'))){const i=+b.dataset.hbopen;HB.open=HB.open===i?null:i;paint();return}
  if((b=g('[data-hb]'))){const a=b.dataset.hb;ev.preventDefault();
    const days=dayRows().map(x=>x.d);
    if(a==='pprev'){HB.page=Math.max(0,HB.page-1);paint()}else if(a==='pnext'){HB.page++;paint()}
    else if(a==='dayclose'){HB.sel=null;paint()}
    else if(a==='dayprev'||a==='daynext'){const i=days.indexOf(HB.sel);const j=i+(a==='dayprev'?-1:1);if(days[j]){HB.sel=days[j];paint()}}
    else if(a==='csv')csv();
    else if(a==='reload'){HB.ov=null;loadOverview()}
    else if(a==='filter'){HB.from=(document.getElementById('hbFrom')||{}).value||'';HB.to=(document.getElementById('hbTo')||{}).value||'';HB.rpage=0;loadRows()}
    else if(a==='clear'){HB.from=HB.to='';HB.rpage=0;loadRows()}
    else if(a==='rprev'){HB.rpage=Math.max(0,HB.rpage-1);HB.open=null;loadRows()}else if(a==='rnext'){HB.rpage++;HB.open=null;loadRows()}}
},true);
document.addEventListener('input',ev=>{if(ev.target&&ev.target.id==='hbQ'){HB.q=ev.target.value.trim();HB.page=0;clearTimeout(HB._qt);HB._qt=setTimeout(()=>{paint();setTimeout(()=>{const i=document.getElementById('hbQ');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},40)},350)}});

const css=document.createElement('style');css.textContent=`
.hb-chart{width:100%;height:auto;display:block;font:11px var(--f-mono,monospace);fill:var(--mute)}
.hb-mets{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;margin:6px 0 10px}
.hb-mets button{display:flex;align-items:center;gap:7px;justify-content:flex-start;text-align:left;padding:8px 10px;border-radius:12px;font-size:13px}
.hb-mets button i{width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}
.hb-mets button[aria-pressed="true"]{background:color-mix(in srgb,var(--c) 22%,var(--panel2));border-color:var(--c)}
.hb-table table{font-size:13px}.hb-table td.n{text-align:right;white-space:nowrap}.hb-table tr{cursor:pointer}.hb-table tr.sel td{background:color-mix(in srgb,var(--accent) 16%,transparent)}
.hb-types{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.hb-types button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:10px 12px;border-radius:14px}
.hb-types button b{font-size:14px}.hb-types button span{font-size:12px;color:var(--fg)}.hb-types button small{font-size:11px;color:var(--mute)}
.hb-types button[aria-pressed="true"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--panel2))}
.hb-raw .item{cursor:pointer;align-items:flex-start}.hb-json{white-space:pre-wrap;word-break:break-all;font-size:11px;max-height:320px;overflow:auto;background:var(--panel2);padding:8px;border-radius:8px;margin:6px 0 0}
.apx-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0}
.apx-kv>div{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--panel2);display:flex;flex-direction:column;gap:2px;min-width:0}
.apx-kv span{font-size:11.5px;color:var(--mute)}.apx-kv b{font-size:14px;overflow-wrap:anywhere}.apx-kv b small{font-weight:400;color:var(--mute)}
`;document.head.appendChild(css);

(window.__apexExtraBoot=window.__apexExtraBoot||[]).push(function(){
  VIEWS.hbrowse=function(){try{return view()}catch(e){warn(e,'hbrowse');return'<section class="panel"><p>Health-Browser konnte nicht geladen werden.</p></section>'}};
  if(!MODULES.some(m=>m[0]==='hbrowse')){const i=MODULES.findIndex(m=>m[0]==='data');MODULES.splice(i<0?0:i+1,0,['hbrowse','Health-Browser','Schlaf, HRV, Puls, Schritte & alle Rohdaten durchblättern'])}
  // Im Daten-Tab einen Einstieg anbieten
  try{const od=VIEWS.data;if(od&&!od.__hb){const w=function(){return`<div class="banner" style="border-style:solid"><p><strong>Gesundheitsdaten?</strong> Schlaf, HRV, Ruhepuls, Schritte und alle Google-Health-Rohdaten findest du im Health-Browser.</p><button class="sm" data-tab="hbrowse">Öffnen</button></div>`+od.apply(this,arguments)};w.__hb=1;VIEWS.data=w}}catch(e){warn(e,'wrap data')}
});
})();
