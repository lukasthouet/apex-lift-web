/* APEX Lift · Modelle (Mehr → Modelle)
   Legt die mathematischen Modelle hinter Prognosen und Zuständen offen. Jedes Modell: Erklärung, Formel,
   Beispieldaten mit Reglern – das Ergebnis rechnet live mit denselben Formeln wie die App. */
(function(){
'use strict';
if(window.__apexModels)return;window.__apexModels=1;
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
const de=(x,d=0)=>x==null||!isFinite(x)?'–':Number(x).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const G=(n,f)=>{try{const v=(0,eval)(n);return v===undefined?f:v}catch(_){return f}};

/* Gemeinsame Mini-Diagramme ------------------------------------------------- */
function lines(series,{W=640,H=200,xlab='',ylab='',ymin=null,ymax=null,marks=[],bands=[],xfmt=x=>de(x)}={}){
  const all=series.flatMap(s=>s.pts);if(!all.length)return'';const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]);
  const x0=Math.min(...xs),x1=Math.max(...xs);let y0=ymin??Math.min(...ys),y1=ymax??Math.max(...ys);if(y1===y0){y1+=1;y0-=1}
  const L=48,R=12,T=10,B=28;const X=x=>L+(x-x0)/((x1-x0)||1)*(W-L-R),Y=y=>T+(1-(y-y0)/(y1-y0))*(H-T-B);
  let g='';for(const b of bands)g+=`<rect x="${X(b.from)}" y="${T}" width="${Math.max(0,X(b.to)-X(b.from))}" height="${H-T-B}" fill="${b.c}" opacity=".16"/>${b.l?`<text x="${(X(b.from)+X(b.to))/2}" y="${T+12}" text-anchor="middle" fill="${b.c}">${Esc(b.l)}</text>`:''}`;
  for(let i=0;i<=4;i++){const v=y0+(y1-y0)*i/4,y=Y(v);g+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${L-6}" y="${y+4}" text-anchor="end">${de(v,Math.abs(y1-y0)<5?1:0)}</text>`}
  for(let i=0;i<=5;i++){const v=x0+(x1-x0)*i/5;g+=`<text x="${X(v)}" y="${H-8}" text-anchor="middle">${Esc(xfmt(v))}</text>`}
  const path=s=>`<path d="M${s.pts.map(p=>X(p[0]).toFixed(1)+','+Y(cl(p[1],y0,y1)).toFixed(1)).join(' L')}" fill="none" stroke="${s.c}" stroke-width="${s.w||2.4}" ${s.dash?'stroke-dasharray="5 4"':''}/>`;
  const mk=marks.map(m=>`<line x1="${X(m.x)}" x2="${X(m.x)}" y1="${T}" y2="${H-B}" stroke="${m.c||'var(--fg)'}" stroke-width="1.5" stroke-dasharray="3 3"/>${m.y!=null?`<circle cx="${X(m.x)}" cy="${Y(cl(m.y,y0,y1))}" r="5" fill="${m.c||'var(--fg)'}" stroke="var(--panel)" stroke-width="2"/>`:''}${m.l?`<text x="${X(m.x)+5}" y="${T+24}" fill="${m.c||'var(--fg)'}">${Esc(m.l)}</text>`:''}`).join('');
  const leg=series.filter(s=>s.n).map(s=>`<span><i style="background:${s.c}"></i>${Esc(s.n)}</span>`).join('');
  return`<svg class="md-chart" viewBox="0 0 ${W} ${H}" role="img">${g}${series.map(path).join('')}${mk}${xlab?`<text x="${W-R}" y="${H-B-6}" text-anchor="end" opacity=".7">${Esc(xlab)}</text>`:''}${ylab?`<text x="${L+4}" y="${T+10}" opacity=".7">${Esc(ylab)}</text>`:''}</svg>${leg?`<div class="md-leg">${leg}</div>`:''}`}
const kv=(l,v,cls='')=>`<div class="${cls}"><span>${l}</span><b>${v}</b></div>`;

/* Modelle -------------------------------------------------------------------- */
const MUSN=()=>G('MUS',{qu:'Quadrizeps',br:'Brust'});const RB=()=>G('REC_BASE',{qu:60,br:54});
const M=[];
// 1 Muskel-Erholung
M.push({id:'rec',t:'Muskel-Erholung',tag:'Regeneration & Muskeln',
 why:'Bestimmt die Farbe jedes Muskels im 3D-Modell (rot → orange → grün → grau) und welche Übungen als nächstes vorgeschlagen werden.',
 f:`<var>R</var> = <var>R</var><sub>Basis,Muskel</sub> · (0,7 + 0,075 · min(<var>Sätze</var>, 8)) · (1,15 bei exzentrischer Übung)<br>Zustand nach <var>h</var> Stunden: <var>h</var> &lt; 0,45·<var>R</var> „gerade trainiert“ · <var>h</var> &lt; <var>R</var> „in Erholung“ · <var>h</var> &lt; <var>R</var>+72 „bereit“ · bis 14 Tage „fällig“ · danach „lange pausiert“`,
 note:'Sätze zählen am letzten Trainingstag des Muskels: Hauptmuskel 1, Hilfsmuskel 0,5. Cardio liefert „Satz-Äquivalente“ (10 min moderat ≈ 1 harter Satz).',
 inp:[{k:'m',l:'Muskel',type:'sel',opts:()=>Object.keys(RB()).filter(k=>MUSN()[k]).map(k=>[k,MUSN()[k]+' ('+RB()[k]+' h)']),v:'qu'},{k:'s',l:'Sätze am Trainingstag',min:0,max:12,step:.5,v:4},{k:'ecc',l:'Exzentrisch (Kniebeuge, RDL …)',type:'chk',v:1},{k:'h',l:'Stunden seit Training',min:0,max:240,step:1,v:30}],
 run(p){const base=RB()[p.m]||40;const R=Math.round(base*(.7+.075*Math.min(p.s,8))*(p.ecc?1.15:1));const h=p.h;
  const st=h<R*.45?['Gerade trainiert','bad']:h<R?['In Erholung','warn']:h<R+72?['Bereit – jetzt trainieren','ok']:h<336?['Erholt – fällig','ok']:['Lange pausiert','mute'];
  const pts=[];const xmax=Math.max(R+96,h+24);for(let x=0;x<=xmax;x+=2)pts.push([x,cl(x/R,0,1.6)*100]);
  return{kv:kv('Erholungszeit R',de(R)+' h')+kv('Basis '+Esc(MUSN()[p.m]||p.m),de(base)+' h')+kv('Fortschritt',de(cl(h/R*100,0,999))+' %')+kv('Zustand',`<span class="pill ${st[1]}">${st[0]}</span>`),
   chart:lines([{pts,c:'var(--accent)',n:'Erholung in % von R'}],{ymin:0,ymax:160,xlab:'Stunden',bands:[{from:0,to:R*.45,c:'#d63031',l:'gerade'},{from:R*.45,to:R,c:'#e98a3a',l:'Erholung'},{from:R,to:R+72,c:'#34b268',l:'bereit'},{from:R+72,to:xmax,c:'#78ba8c',l:'fällig'}],marks:[{x:h,y:cl(h/R,0,1.6)*100,l:'jetzt'}]})}}});
// 2 Muskelentwicklung
M.push({id:'dev',t:'Muskelentwicklung & Größe im Modell',tag:'Regeneration & Muskeln → Entwicklung',
 why:'Steuert, wie dick jeder Muskel im 3D-Modell dargestellt wird und die Farbe im Modus „Entwicklung“.',
 f:`Trainingsreiz <var>D</var>(t) = Σ <var>w</var><sub>Satz</sub> · e<sup>−Δt / 120 Tage</sup> &nbsp; (<var>w</var> = 1 Hauptmuskel, 0,5 Hilfsmuskel)<br>Größenfaktor <var>g</var> = 0,85 + 0,4 · (1 − e<sup>−<var>D</var> / 60</sup>) &nbsp;→ begrenzt auf 0,8 … 1,4`,
 note:'Jeder Satz wirkt also mit einer Halbwertszeit von rund 83 Tagen (120 · ln 2) nach. Liegt eine Umfangsmessung vor, wird der Faktor auf deine echten Maße kalibriert: g = (1 + (cm/Referenz − 1) · 1,6) · g(heute)/g(Messtag).',
 inp:[{k:'w',l:'Harte Sätze pro Woche',min:0,max:30,step:1,v:10},{k:'n',l:'Trainingswochen',min:1,max:104,step:1,v:26},{k:'p',l:'danach Pause (Wochen)',min:0,max:52,step:1,v:8}],
 run(p){const days=(p.n+p.p)*7;const pts=[];let D=0;const per=p.w/3;
  for(let d=0;d<=days;d++){D*=Math.exp(-1/120);if(d<p.n*7&&[0,2,4].includes(d%7))D+=per;pts.push([d/7,0.85+0.4*(1-Math.exp(-D/60))])}
  const peak=pts[Math.min(pts.length-1,p.n*7)][1],end=pts.at(-1)[1];
  return{kv:kv('Faktor nach Aufbau',de(peak,3))+kv('nach Pause',de(end,3))+kv('Verlust in der Pause',de((peak-end)/(peak-.85||1)*100)+' % des Zuwachses')+kv('Reiz D (Ende)',de(-60*Math.log(1-(end-.85)/.4),1)),
   chart:lines([{pts,c:'#3ddc97',n:'Größenfaktor g'}],{xlab:'Wochen',ymin:.8,ymax:1.3,marks:[{x:p.n,l:'Pause'}]})}}});
// 3 1RM
M.push({id:'e1rm',t:'Geschätztes Maximalgewicht (1RM)',tag:'Analyse → Kraftlevel, Trends',
 why:'Macht Sätze mit unterschiedlichen Wiederholungen vergleichbar; Grundlage für Kraftlevel, Perzentile und Trendlinien.',
 f:`1RM = <var>Gewicht</var> · (1 + min(<var>Wdh</var>, 20) / 30) &nbsp; (Epley-Formel)<br>Umgekehrt: Gewicht für <var>n</var> Wdh = 1RM / (1 + <var>n</var>/30)`,
 note:'Bei mehr als ~12 Wiederholungen wird die Schätzung ungenauer. An Maschinen rechnet die App vorher ROM-Stufen und Studio-Unterschiede um.',
 inp:[{k:'w',l:'Gewicht (kg)',min:2.5,max:250,step:2.5,v:80},{k:'r',l:'Wiederholungen',min:1,max:20,step:1,v:8}],
 run(p){const m=p.w*(1+Math.min(p.r,20)/30);const pts=[];for(let n=1;n<=20;n++)pts.push([n,m/(1+n/30)]);
  return{kv:kv('1RM geschätzt',de(m,1)+' kg')+[1,3,5,10,12].map(n=>kv(n+' Wdh',de(m/(1+n/30),1)+' kg')).join(''),
   chart:lines([{pts,c:'#ffb03d',n:'mögliches Gewicht je Wiederholungszahl'}],{xlab:'Wiederholungen',ymin:0,marks:[{x:p.r,y:p.w,l:'dein Satz'}]})}}});
// 4 Detraining
M.push({id:'det',t:'Kraftverlust durch Pausen',tag:'Analyse → Kraftverlust',
 why:'Schätzt, wie viel Maximalkraft nach einer Übungspause heute noch da ist („≈ heute“ im Kraftlevel).',
 f:`erste 14 Tage: kein Verlust<br>Muskel: <var>v</var><sub>M</sub> = (0,30 − 0,08·<var>x</var>) · (1 − e<sup>−(<var>t</var><sub>M</sub>−14)/120</sup>) &nbsp; <var>x</var> = min(1, Sätze dieser Übung / 150)<br>Technik: <var>v</var><sub>T</sub> = 0,06 · (1 − e<sup>−(<var>t</var>−14)/45</sup>)<br>Gesamt: <var>v</var> = 1 − (1 − <var>v</var><sub>M</sub>) · (1 − <var>v</var><sub>T</sub>)`,
 note:'t = Tage seit dieser Übung; t_M = Tage seit der Muskel irgendwie trainiert wurde (andere Übungen erhalten die Muskelmasse, aber nicht die Technik). Erfahrung (x) bremst den Abbau.',
 inp:[{k:'m',l:'1RM zuletzt (kg)',min:10,max:250,step:2.5,v:100},{k:'t',l:'Tage seit der Übung',min:0,max:365,step:1,v:60},{k:'tm',l:'Tage seit der Muskel trainiert wurde',min:0,max:365,step:1,v:60},{k:'n',l:'Sätze dieser Übung bisher',min:0,max:300,step:5,v:60}],
 run(p){const f=(t,tm)=>{if(t<=14)return 0;const md=Math.min(t,tm);const xp=Math.min(1,p.n/150);const ml=md>14?(.30-.08*xp)*(1-Math.exp(-(md-14)/120)):0;const sk=.06*(1-Math.exp(-(t-14)/45));return 1-(1-ml)*(1-sk)};
  const loss=f(p.t,p.tm);const pts=[],pts2=[];for(let d=0;d<=365;d+=3){pts.push([d,p.m*(1-f(d,d))]);pts2.push([d,p.m*(1-f(d,Math.min(d,p.tm)))])}
  return{kv:kv('Verlust',de(loss*100,1)+' %')+kv('1RM heute ca.',de(p.m*(1-loss),1)+' kg')+kv('Nach 2 Monaten Komplettpause',de(f(60,60)*100,1)+' %')+kv('Nach 6 Monaten',de(f(182,182)*100,1)+' %'),
   chart:lines([{pts,c:'#ff4d5e',n:'Komplettpause'},{pts:pts2,c:'#4fc3ff',n:'Muskel anders trainiert',dash:1}],{xlab:'Tage Pause',marks:[{x:p.t,y:p.m*(1-loss),l:'jetzt'}]})}}});
// 5 Readiness
M.push({id:'ready',t:'Readiness (Trainingsbereitschaft)',tag:'Training → Readiness, Frische, Plan',
 why:'Die Zahl 0–100 morgens im Training-Tab. Sie entscheidet über die Empfehlung „volle Intensität“, „planmäßig“, „leicht/Deload“ oder „Pause“.',
 f:`Start 60 &nbsp;+ (Tagesform − 5) · 4<br>+ HRV: clamp(8 · <var>z</var><sub>HRV</sub>, −15, +12) &nbsp; <var>z</var> = (heute − Ø30T) / σ, σ ≥ 12 % von Ø<br>− Ruhepuls: clamp(6 · <var>z</var><sub>RHR</sub>, −8, +12) &nbsp; σ ≥ max(2, 4 % von Ø)<br>+ Schlaf-Score: clamp((Score − 75) · 0,5, −15, +10) &nbsp;<i>oder</i> Schlafdauer: clamp((h − 7) · 6, −18, +8)<br>− Belastung 7 T / 4 Wo. &gt; 1,3: min(20, (ACWR − 1,3) · 40) &nbsp;− 3 bei Training gestern<br>− Sehnenschmerz &gt; 3: (P − 3) · 3 &nbsp;− Schmerz ≥ 4: (P − 3) · 2 &nbsp;− 5 je offener Verletzung &nbsp;− 18 bei Krankheitszeichen`,
 note:'Ergebnis auf 0–100 begrenzt. ≥ 75 bereit · ≥ 55 normal · ≥ 40 müde · darunter erschöpft. Ohne jeden Messwert gilt 62.',
 inp:[{k:'form',l:'Tagesform (0 = nicht eingetragen)',min:0,max:10,step:1,v:6},{k:'hrv',l:'HRV heute (ms)',min:10,max:120,step:1,v:32},{k:'hrvb',l:'HRV Ø 30 Tage (ms)',min:10,max:120,step:1,v:30},{k:'rhr',l:'Ruhepuls heute',min:35,max:100,step:1,v:62},{k:'rhrb',l:'Ruhepuls Ø 30 Tage',min:35,max:100,step:1,v:64},
  {k:'sl',l:'Schlaf (h)',min:3,max:11,step:.25,v:7.25},{k:'acwr',l:'Belastung 7 T / 4 Wo. (ACWR)',min:.3,max:2.5,step:.05,v:1.1},{k:'yest',l:'Gestern trainiert',type:'chk',v:1},{k:'pain',l:'Schmerz (0–10)',min:0,max:10,step:1,v:0},{k:'sick',l:'Krankheitszeichen',type:'chk',v:0}],
 run(p){let s=60;const f=[];if(p.form){const d=(p.form-5)*4;s+=d;f.push(['Tagesform',d])}
  {const sd=Math.max(p.hrvb*.12,1);const d=Math.round(cl((p.hrv-p.hrvb)/sd*8,-15,12));s+=d;f.push(['HRV',d])}
  {const sd=Math.max(2,p.rhrb*.04);const d=Math.round(-cl((p.rhr-p.rhrb)/sd*6,-8,12));s+=d;f.push(['Ruhepuls',d])}
  {const d=Math.round(cl((p.sl-7)*6,-18,8));s+=d;f.push(['Schlaf',d])}
  if(p.acwr>1.3){const d=-Math.min(20,Math.round((p.acwr-1.3)*40));s+=d;f.push(['Belastung',d])}
  if(p.yest){s-=3;f.push(['Training gestern',-3])}if(p.pain>=4){const d=-(p.pain-3)*2;s+=d;f.push(['Schmerz',d])}if(p.sick){s-=18;f.push(['Krank',-18])}
  s=Math.round(cl(s,0,100));const lab=s>=75?['Bereit – volle Intensität','ok']:s>=55?['Normal – planmäßig','info']:s>=40?['Müde – leicht/Deload','warn']:['Erschöpft – Pause','bad'];
  const mx=Math.max(20,...f.map(x=>Math.abs(x[1])));
  const bars=`<div class="md-bars">${f.map(([n,d])=>`<div><span>${n}</span><em><i style="${d>=0?'left:50%':'right:50%'};width:${Math.abs(d)/mx*50}%;background:${d>=0?'var(--ok)':'var(--bad)'}"></i></em><b>${d>=0?'+':''}${d}</b></div>`).join('')}</div>`;
  return{kv:kv('Readiness',`<span style="font-size:26px">${s}</span>`)+kv('Empfehlung',`<span class="pill ${lab[1]}">${lab[0]}</span>`)+kv('Start','60'),chart:bars}}});
// 6 Fitness / Ermüdung / Form
M.push({id:'pmc',t:'Fitness, Ermüdung, Form (Banister)',tag:'Cardio → Diagnostik',
 why:'CTL („Fitness“), ATL („Ermüdung“) und TSB („Form“) im Cardio-Bereich – zeigt, ob du gerade aufbaust, überziehst oder frisch bist.',
 f:`Belastung je Einheit (TRIMP): <var>min</var> · <var>HRR</var> · 0,64 · e<sup>1,92 · <var>HRR</var></sup> &nbsp; <var>HRR</var> = (Ø HF − HF<sub>Ruhe</sub>) / (HF<sub>max</sub> − HF<sub>Ruhe</sub>)<br>täglich: CTL += (TRIMP − CTL) / 42 &nbsp; ATL += (TRIMP − ATL) / 7 &nbsp; TSB = CTL − ATL`,
 note:'Ohne Pulsdaten schätzt die App HRR je Sportart (z. B. Laufen 0,65, Radfahren 0,55, HIIT 0,78). TSB < −30 Überlastung droht · −30…−10 produktiv · −10…+5 neutral · > +5 frisch.',
 inp:[{k:'min',l:'Dauer je Einheit (min)',min:10,max:180,step:5,v:50},{k:'hr',l:'Ø Puls',min:90,max:190,step:1,v:145},{k:'rest',l:'Ruhepuls',min:40,max:90,step:1,v:60},{k:'max',l:'HF max',min:160,max:215,step:1,v:190},{k:'n',l:'Einheiten pro Woche',min:0,max:10,step:1,v:4},{k:'wk',l:'Wochen Aufbau',min:1,max:20,step:1,v:8},{k:'tap',l:'danach lockere Woche (−60 %)',type:'chk',v:1}],
 run(p){const hrr=cl((p.hr-p.rest)/(p.max-p.rest),0,1);const tr=p.min*hrr*.64*Math.exp(1.92*hrr);const days=(p.wk+(p.tap?1:0))*7+14;let c=0,a=0;const C=[],A=[],T=[];
  const pat=[[],[0],[0,3],[0,2,4],[0,2,4,6],[0,1,3,5,6],[0,1,2,4,5,6],[0,1,2,3,4,5,6]];
  for(let d=0;d<days;d++){const wk=Math.floor(d/7);const dow=d%7;const days_=pat[Math.min(7,p.n)]||[];let L=tr*((days_.includes(dow)?1:0)+(p.n>7&&dow<p.n-7?1:0));
   if(wk>=p.wk){L*=p.tap&&wk===p.wk?.4:0}c+=(L-c)/42;a+=(L-a)/7;C.push([d,c]);A.push([d,a]);T.push([d,c-a])}
  const tsb=T.at(-15)?T[p.wk*7-1][1]:0;
  return{kv:kv('HRR',de(hrr,2))+kv('TRIMP je Einheit',de(tr))+kv('CTL Ende Aufbau',de(C[p.wk*7-1][1]))+kv('TSB Ende Aufbau',de(tsb))+kv('TSB nach Entlastung',de(T[Math.min(T.length-1,(p.wk+1)*7)][1])),
   chart:lines([{pts:C,c:'#4fc3ff',n:'CTL Fitness'},{pts:A,c:'#ff4d5e',n:'ATL Ermüdung'},{pts:T,c:'#3ddc97',n:'TSB Form'}],{xlab:'Tage',marks:[{x:p.wk*7,l:'Ende Aufbau'}]})}}});
// 7 HF-Zonen
M.push({id:'hr',t:'Herzfrequenz-Zonen & HF max',tag:'Cardio → Zonen',
 why:'Zonen für Training, Intensitätsverteilung (80/20) und TRIMP.',
 f:`HF<sub>max</sub> (ohne Test) = 208 − 0,7 · Alter &nbsp; (Tanaka)<br>Zone = HF<sub>Ruhe</sub> + Anteil · (HF<sub>max</sub> − HF<sub>Ruhe</sub>) &nbsp; (Karvonen) · Z1 50–60 % · Z2 60–70 % · Z3 70–80 % · Z4 80–90 % · Z5 90–100 %`,
 note:'Ein gemessener HF-max-Test oder LTHR-Test ersetzt die Schätzung. Der Ruhepuls ist der Median der letzten 3 Wochen.',
 inp:[{k:'age',l:'Alter',min:16,max:80,step:1,v:31},{k:'rest',l:'Ruhepuls',min:38,max:90,step:1,v:62},{k:'tmax',l:'gemessene HF max (0 = schätzen)',min:0,max:215,step:1,v:0}],
 run(p){const mx=p.tmax||Math.round(208-.7*p.age);const R=mx-p.rest;const k=f=>Math.round(p.rest+f*R);const Z=[['Z1 Regeneration',.5,.6,'#7fd8ff'],['Z2 Grundlage',.6,.7,'#3ddc97'],['Z3 Tempo',.7,.8,'#ffd23f'],['Z4 Schwelle',.8,.9,'#ff9a3d'],['Z5 VO₂max',.9,1,'#ff4d5e']];
  return{kv:kv('HF max',de(mx)+(p.tmax?' (gemessen)':' (Tanaka)'))+kv('Reserve',de(R)+' bpm'),
   chart:`<div class="md-zones">${Z.map(z=>`<div style="--c:${z[3]};flex:${(z[2]-z[1])*10}"><b>${z[0]}</b><span>${k(z[1])}–${k(z[2])} bpm</span></div>`).join('')}</div>`}}});
// 8 VO2max
M.push({id:'vo2',t:'VO₂max-Schätzungen',tag:'Cardio → Diagnostik, Fitness-Tests',
 why:'Die VO₂max ist ein Mittelwert aus allen vorhandenen Schätzungen (ohne die grobe Ruhepuls-Formel, wenn bessere da sind).',
 f:`Cooper-Test (12 min): (<var>Strecke</var> m − 504,9) / 44,73<br>Daniels-VDOT: <var>v</var> = m/min · VO₂ = −4,6 + 0,182258·<var>v</var> + 0,000104·<var>v</var>² · Anteil = 0,8 + 0,1894·e<sup>−0,01278·t</sup> + 0,2990·e<sup>−0,1933·t</sup> · VDOT = VO₂ / Anteil<br>Uth: 15,3 · HF<sub>max</sub> / HF<sub>Ruhe</sub>`,
 note:'Bewertung nach Altersbändern (z. B. unter 30: < 38 sehr schwach … ≥ 56 hervorragend).',
 inp:[{k:'coop',l:'Cooper-Strecke (m)',min:1200,max:3800,step:10,v:2600},{k:'km',l:'Laufstrecke (km)',min:1,max:42.2,step:.1,v:5},{k:'t',l:'Zeit (min)',min:10,max:300,step:.5,v:25},{k:'mx',l:'HF max',min:150,max:215,step:1,v:188},{k:'rs',l:'Ruhepuls',min:38,max:90,step:1,v:62}],
 run(p){const coop=(p.coop-504.9)/44.73;const v=p.km*1000/p.t;const vo=-4.6+.182258*v+.000104*v*v;const pct=.8+.1894393*Math.exp(-.012778*p.t)+.2989558*Math.exp(-.1932605*p.t);const vd=vo/pct;const uth=15.3*p.mx/p.rs;
  const pace=p.t/p.km;return{kv:kv('Cooper',de(coop,1))+kv('VDOT',de(vd,1))+kv('Uth',de(uth,1))+kv('Mittel (ohne Uth)',de((coop+vd)/2,1))+kv('Pace',Math.floor(pace)+':'+String(Math.round(pace%1*60)).padStart(2,'0')+' min/km'),
   chart:(()=>{const pts=[];for(let km=1;km<=21;km+=.5){const tt=p.t*Math.pow(km/p.km,1.06);pts.push([km,tt/km])}return lines([{pts,c:'#ff4fd8',n:'Prognose-Pace für andere Strecken (Riegel, Exponent 1,06)'}],{xlab:'km',ylab:'min/km'})})()}}});
// 9 Schlafschuld
M.push({id:'sleep',t:'Schlafschuld',tag:'Schlaf',
 why:'Zeigt, wie viel Schlaf dir in der letzten Woche gegenüber deinem Ziel fehlt.',
 f:`Schuld = Σ<sub>7 Nächte</sub> (<var>Ziel</var> − <var>Schlaf</var>) &nbsp; (Überschüsse zählen gegen)`,
 note:'≤ 1 h ausgeglichen · ≤ 4 h etwas aufholen · darüber deutlich zu wenig.',
 inp:[{k:'goal',l:'Schlafziel (h)',min:6,max:10,step:.25,v:8},...[1,2,3,4,5,6,7].map(i=>({k:'n'+i,l:'Nacht '+i+' (h)',min:3,max:11,step:.25,v:[7,6.5,7.5,6,8,7,6.75][i-1]}))],
 run(p){let acc=0;const pts=[[0,0]];for(let i=1;i<=7;i++){acc+=p.goal-p['n'+i];pts.push([i,acc])}const cls=acc<=1?'ok':acc<=4?'warn':'bad';
  return{kv:kv('Schlafschuld',`<span class="pill ${cls}">${acc>=0?'':'−'}${Math.floor(Math.abs(acc))} h ${String(Math.round(Math.abs(acc)%1*60)).padStart(2,'0')} min</span>`)+kv('Ø Schlaf',de([1,2,3,4,5,6,7].reduce((a,i)=>a+p['n'+i],0)/7,2)+' h'),
   chart:lines([{pts,c:'#7c8cff',n:'aufsummierte Schuld (h)'}],{xlab:'Nacht',ymin:Math.min(-2,...pts.map(x=>x[1])),bands:[{from:0,to:7,c:'transparent'}]})}}});
// 10 Frische
M.push({id:'fresh',t:'Frische & Abwechslung',tag:'Ideen, Wochenplan',
 why:'Bestimmt, ob die App eher lockere oder intensive Ideen vorschlägt und ob sie zu mehr Abwechslung rät.',
 f:`Frische = clamp(0,6 · Readiness + 0,4 · (Ø Tagesform der letzten 7 Tage · 10), 0, 100) &nbsp; (ohne Tagesform: 60)<br>Monotonie = 1 bei nur einer Sportart in 4 Wochen · 0,5 bei zwei · 0 bei drei und mehr`,
 note:'',
 inp:[{k:'r',l:'Readiness',min:0,max:100,step:1,v:68},{k:'f',l:'Ø Tagesform 7 Tage (0 = keine)',min:0,max:10,step:.5,v:6.5},{k:'k',l:'Sportarten in 4 Wochen',min:1,max:6,step:1,v:2}],
 run(p){const s=Math.round(cl(p.r*.6+(p.f?p.f*10:60)*.4,0,100));const mono=p.k<=1?1:p.k===2?.5:0;
  return{kv:kv('Frische',`<span style="font-size:24px">${s}</span>`)+kv('Monotonie',de(mono,1))+kv('Einordnung',s>=70?'topfit':s>=50?'normal':'ausgelaugt'),chart:''}}});

/* Zustand & Rendern --------------------------------------------------------- */
const ST={};const OPEN=new Set(['rec']);
function par(m){if(!ST[m.id]){ST[m.id]={};for(const i of m.inp)ST[m.id][i.k]=i.v}return ST[m.id]}
function inputs(m){const p=par(m);return m.inp.map(i=>{
  if(i.type==='sel')return`<label class="f md-in">${Esc(i.l)}<select data-md="${m.id}|${i.k}">${i.opts().map(([v,l])=>`<option value="${Esc(v)}" ${p[i.k]===v?'selected':''}>${Esc(l)}</option>`).join('')}</select></label>`;
  if(i.type==='chk')return`<label class="md-chk"><input type="checkbox" data-md="${m.id}|${i.k}" ${p[i.k]?'checked':''}> ${Esc(i.l)}</label>`;
  return`<label class="f md-in"><span class="row between"><span>${Esc(i.l)}</span><output id="mdo-${m.id}-${i.k}">${de(p[i.k],i.step<1?2:0)}</output></span><input type="range" min="${i.min}" max="${i.max}" step="${i.step}" value="${p[i.k]}" data-md="${m.id}|${i.k}"></label>`}).join('')}
function result(m){try{const r=m.run(par(m));return`<div class="apx-kv">${r.kv}</div>${r.chart||''}`}catch(e){warn(e,'model '+m.id);return'<p class="small mute">Berechnung nicht möglich.</p>'}}
function card(m){const o=OPEN.has(m.id);return`<section class="panel md-card" id="md-${m.id}" data-nofold="1"><details ${o?'open':''} data-mdcard="${m.id}"><summary><div><h2>${Esc(m.t)}</h2><span class="small mute">wirkt in: ${Esc(m.tag)}</span></div></summary><div>
  <p class="small">${m.why}</p><div class="md-f">${m.f}</div>${m.note?`<p class="small mute">${m.note}</p>`:''}
  <div class="md-play"><div class="md-ins"><div class="row between"><b class="small">Beispieldaten – verschieben zum Ausprobieren</b><button class="sm ghost" data-mdreset="${m.id}">zurücksetzen</button></div>${inputs(m)}</div><div class="md-out" id="mdr-${m.id}">${o?result(m):''}</div></div></div></details></section>`}
function view(){return`<section class="panel" data-nofold="1"><h1>Modelle</h1>
  <p class="small mute">Alle Prognosen und Zustände der App sind einfache, nachvollziehbare Formeln – keine Blackbox. Jedes Modell lässt sich unten mit Beispielwerten durchspielen; die Ergebnisse rechnen mit genau den Formeln der App.</p>
  <div class="chips">${M.map(m=>`<button data-mdjump="${m.id}">${Esc(m.t.split(' (')[0])}</button>`).join('')}</div></section>${M.map(card).join('')}`}
function update(id){const m=M.find(x=>x.id===id);const el=document.getElementById('mdr-'+id);if(m&&el)el.innerHTML=result(m)}
document.addEventListener('input',ev=>{const t=ev.target;if(!t||!t.dataset||!t.dataset.md)return;const[id,k]=t.dataset.md.split('|');const m=M.find(x=>x.id===id);if(!m)return;const i=m.inp.find(x=>x.k===k);
  par(m)[k]=i.type==='chk'?(t.checked?1:0):i.type==='sel'?t.value:+t.value;const o=document.getElementById(`mdo-${id}-${k}`);if(o)o.textContent=de(+t.value,i.step<1?2:0);update(id)});
document.addEventListener('change',ev=>{const t=ev.target;if(t&&t.dataset&&t.dataset.md&&(t.type==='checkbox'||t.tagName==='SELECT'))t.dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('toggle',ev=>{const d=ev.target;if(!d||!d.dataset||!d.dataset.mdcard)return;const id=d.dataset.mdcard;if(d.open){OPEN.add(id);update(id)}else OPEN.delete(id)},true);
document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('[data-mdreset],[data-mdjump]');if(!b)return;ev.preventDefault();
  if(b.dataset.mdreset){const id=b.dataset.mdreset;delete ST[id];const m=M.find(x=>x.id===id);const s=document.getElementById('md-'+id);if(m&&s){s.outerHTML=card(m)}return}
  const id=b.dataset.mdjump;OPEN.add(id);const m=M.find(x=>x.id===id);const s=document.getElementById('md-'+id);if(m&&s){s.outerHTML=card(m);setTimeout(()=>{const n=document.getElementById('md-'+id);if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},30)}},true);

const css=document.createElement('style');css.textContent=`
.md-card summary{display:flex;align-items:center;justify-content:space-between;cursor:pointer;list-style:none}.md-card summary::-webkit-details-marker{display:none}
.md-card summary h2{margin:0}.md-card summary::after{content:"▾";color:var(--mute);font-size:18px}.md-card details[open] summary::after{content:"▴"}
.md-f{font:13px/1.7 var(--f-mono,ui-monospace,monospace);background:var(--panel2);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;padding:10px 12px;margin:8px 0;overflow-x:auto}
.md-f var{font-style:italic;color:var(--hi)}
.md-play{display:grid;grid-template-columns:minmax(220px,340px) 1fr;gap:16px;align-items:start;margin-top:10px}
@media(max-width:720px){.md-play{grid-template-columns:1fr}}
.md-ins{display:flex;flex-direction:column;gap:8px;background:var(--panel2);border-radius:14px;padding:10px 12px;border:1px solid var(--line)}
.md-in{margin:0}.md-in input[type=range]{width:100%;accent-color:var(--accent)}.md-in output{font:600 13px var(--f-mono,monospace);color:var(--accent)}
.md-chk{display:flex;gap:8px;align-items:center;font-size:13px}
.md-chart{width:100%;height:auto;display:block;font:11px var(--f-mono,monospace);fill:var(--mute)}
.md-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12px;color:var(--mute)}.md-leg span{display:inline-flex;gap:6px;align-items:center}.md-leg i{width:14px;height:3px;border-radius:2px;display:inline-block}
.md-bars{display:flex;flex-direction:column;gap:6px;margin-top:8px}.md-bars>div{display:grid;grid-template-columns:110px 1fr 40px;align-items:center;gap:8px;font-size:13px}
.md-bars em{position:relative;height:14px;display:block;background:linear-gradient(90deg,transparent calc(50% - .5px),var(--line) calc(50% - .5px),var(--line) calc(50% + .5px),transparent calc(50% + .5px))}
.md-bars em i{position:absolute;top:1px;bottom:1px;border-radius:6px}.md-bars b{text-align:right;font-family:var(--f-mono,monospace)}
.md-zones{display:flex;gap:4px;margin-top:8px}.md-zones>div{background:var(--c);color:#111;border-radius:10px;padding:8px;min-width:0;display:flex;flex-direction:column}
.md-zones b{font-size:12px}.md-zones span{font-size:12px;font-family:var(--f-mono,monospace)}
@media(max-width:560px){.md-zones{flex-direction:column}.md-zones>div{flex:none!important}}
`;document.head.appendChild(css);

(window.__apexExtraBoot=window.__apexExtraBoot||[]).push(function(){
  VIEWS.models=function(){try{return view()}catch(e){warn(e,'models');return'<section class="panel"><p>Modelle konnten nicht geladen werden.</p></section>'}};
  if(!MODULES.some(m=>m[0]==='models')){const i=MODULES.findIndex(m=>m[0]==='pot');MODULES.splice(i<0?MODULES.length:i+1,0,['models','Modelle','Die Formeln hinter Erholung, Readiness, Prognosen – zum Ausprobieren'])}
});
})();
