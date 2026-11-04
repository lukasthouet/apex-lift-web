/* APEX Lift · Blutwerte: Befunde hochladen (PDF/CSV/Foto), Werte erkennen, Verlauf & Einordnung */
(function(){
'use strict';
if(window.__apexBlood)return;window.__apexBlood=1;
const Esc=(s)=>{try{return esc(s)}catch(_){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}};
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const num=(v)=>{const n=parseFloat(String(v??'').replace(',','.'));return isFinite(n)?n:null};
const f=(x)=>{if(x==null)return'–';const a=Math.abs(x);const d=a>=100?0:a>=10?1:2;return String(Math.round(x*10**d)/10**d).replace('.',',')};

/* id, Name, Einheit, untere, obere Grenze (Erwachsene Männer, typische Laborwerte), Gruppe, Aliase, Hinweis */
const CAT=[
['hb','Hämoglobin','g/dl',13.5,17.5,'Blutbild','h[äa]moglobin|h(?:ae)?moglobin|hb\\b','Sauerstofftransport; niedrig = Müdigkeit, schwächere Ausdauer.'],
['hkt','Hämatokrit','%',40,52,'Blutbild','h[äa]matokrit|hkt\\b|hct\\b',''],
['ery','Erythrozyten','Mio/µl',4.3,5.7,'Blutbild','erythrozyten|rbc\\b',''],
['leu','Leukozyten','Tsd/µl',4,10,'Blutbild','leukozyten|wbc\\b','Hoch bei Infekt oder Entzündung.'],
['thr','Thrombozyten','Tsd/µl',150,400,'Blutbild','thrombozyten|plt\\b',''],
['mcv','MCV','fl',80,100,'Blutbild','mcv\\b',''],
['ferr','Ferritin','ng/ml',30,300,'Eisen','ferritin','Eisenspeicher. Ausdauersportler sollten eher über 50 liegen.'],
['fe','Eisen','µg/dl',60,180,'Eisen','eisen(?!\\s*bindung)|iron\\b','Schwankt stark im Tagesverlauf.'],
['tsat','Transferrinsättigung','%',20,50,'Eisen','transferrins[äa]ttigung|tsat','' ],
['vitd','Vitamin D (25-OH)','ng/ml',30,100,'Vitamine & Mineralstoffe','(?:25[\\s-]*\\(?oh\\)?[\\s-]*)?vitamin[\\s-]*d3?(?:[\\s-]*\\(?25[\\s-]*(?:oh|hydroxy)\\)?)?','Im Winter oft niedrig; wichtig für Knochen und Muskelfunktion.'],
['b12','Vitamin B12','pg/ml',200,900,'Vitamine & Mineralstoffe','vitamin\\s*b\\s*-?12|cobalamin|b12\\b','Bei veganer Ernährung regelmäßig prüfen.'],
['fol','Folsäure','ng/ml',4,20,'Vitamine & Mineralstoffe','fols[äa]ure|folat','' ],
['zn','Zink','µg/dl',70,120,'Vitamine & Mineralstoffe','zink\\b|zinc\\b',''],
['mg','Magnesium','mmol/l',0.75,1.05,'Vitamine & Mineralstoffe','magnesium',''],
['k','Kalium','mmol/l',3.5,5.1,'Vitamine & Mineralstoffe','kalium|potassium',''],
['na','Natrium','mmol/l',135,145,'Vitamine & Mineralstoffe','natrium|sodium',''],
['ca','Calcium','mmol/l',2.2,2.65,'Vitamine & Mineralstoffe','calcium|kalzium',''],
['tsh','TSH','mU/l',0.4,4,'Schilddrüse','tsh\\b','Steuert die Schilddrüse; beeinflusst Energie und Regeneration.'],
['ft3','fT3','pg/ml',2,4.4,'Schilddrüse','ft3\\b|freies\\s*t3|t3\\s*frei',''],
['ft4','fT4','ng/dl',0.8,1.8,'Schilddrüse','ft4\\b|freies\\s*t4|t4\\s*frei',''],
['hba1c','HbA1c','%',4,5.6,'Zucker','hba1c|h[äa]moglobin\\s*a1c','Langzeit-Blutzucker.'],
['glu','Nüchternglukose','mg/dl',70,99,'Zucker','gluk?ose|glucose|blutzucker',''],
['ins','Insulin','µU/ml',2,25,'Zucker','insulin\\b',''],
['chol','Gesamtcholesterin','mg/dl',0,200,'Blutfette','gesamt[\\s-]*cholesterin|cholesterin\\s*gesamt|cholesterin\\b|cholesterol','' ],
['ldl','LDL-Cholesterin','mg/dl',0,130,'Blutfette','ldl[\\s-]*cholesterin|ldl\\b','' ],
['hdl','HDL-Cholesterin','mg/dl',40,200,'Blutfette','hdl[\\s-]*cholesterin|hdl\\b','Höher ist hier günstiger.'],
['tg','Triglyceride','mg/dl',0,150,'Blutfette','triglyc?z?e?rid(?:e|en)?','' ],
['got','GOT (AST)','U/l',10,50,'Leber & Niere','got\\b|ast\\b|aspartat','Kann nach hartem Training erhöht sein (Muskel).'],
['gpt','GPT (ALT)','U/l',10,50,'Leber & Niere','gpt\\b|alt\\b|alanin',''],
['ggt','GGT','U/l',8,60,'Leber & Niere','ggt\\b|gamma[\\s-]*gt|γ-?gt',''],
['krea','Kreatinin','mg/dl',0.7,1.2,'Leber & Niere','kreatinin(?!kinase)|creatinine','Bei viel Muskelmasse und Kreatin-Einnahme eher höher.'],
['harn','Harnstoff','mg/dl',17,49,'Leber & Niere','harnstoff|urea\\b',''],
['ur','Harnsäure','mg/dl',3.5,7.2,'Leber & Niere','harns[äa]ure|uric',''],
['egfr','eGFR','ml/min',90,200,'Leber & Niere','egfr|gfr\\b','' ],
['ck','Kreatinkinase (CK)','U/l',20,200,'Muskel','kreatinkinase|\\bck\\b|\\bck-?nac','Nach hartem Training oft deutlich erhöht, bei Ruhe zählt der Wert.'],
['crp','CRP','mg/l',0,5,'Entzündung','c[\\s-]*reaktives|crp\\b|hs[\\s-]*crp','Unter 1 mg/l ist ideal.'],
['homo','Homocystein','µmol/l',5,15,'Entzündung','homocystein',''],
['testo','Testosteron (gesamt)','ng/ml',2.5,8.4,'Hormone','testosteron\\b|testosterone','Morgens messen.'],
['shbg','SHBG','nmol/l',18,54,'Hormone','shbg\\b',''],
['cort','Cortisol','µg/dl',6,19,'Hormone','cortisol|kortisol','Morgenwert; hoch bei Dauerstress.'],
['e2','Östradiol','pg/ml',10,40,'Hormone','[öo]stradiol|estradiol']
];
const BY=Object.fromEntries(CAT.map(c=>[c[0],{id:c[0],name:c[1],unit:c[2],lo:c[3],hi:c[4],cat:c[5],re:new RegExp('^(?:'+c[6]+')','i'),note:c[7]||''}]));
const CATS=[...new Set(CAT.map(c=>c[5]))];
const BL={rev:null,msg:'',busy:false};

function marks(){return (S.blood=S.blood||[])}
function reports(){return (S.bloodReports=S.bloodReports||[])}
function flag(m,v,lo,hi){if(v==null)return['–','mute'];if(lo!=null&&hi!=null&&hi>lo){const span=hi-lo;if(v<lo)return[v<lo-span*.2?'zu niedrig':'niedrig',v<lo-span*.2?'bad':'warn'];if(v>hi)return[v>hi+span*.2?'zu hoch':'hoch',v>hi+span*.2?'bad':'warn']}return['im Bereich','ok']}
function latestBy(){const o={};for(const x of marks().slice().sort((a,b)=>a.date<b.date?-1:1)){(o[x.marker]=o[x.marker]||[]).push(x)}return o}

/* ---------------------------------------------------------------- Parser */
function normalizeNum(s){return num(String(s).replace(/\s/g,''))}
const DATE_RES=[[/(\d{1,2})\.(\d{1,2})\.(\d{4})/g,m=>`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`],[/(\d{1,2})\.(\d{1,2})\.(\d{2})(?!\d)/g,m=>`20${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`],[/(\d{4})-(\d{2})-(\d{2})/g,m=>m[0]]];
function findDate(text){
  const key=/(entnahme|abnahme|probendatum|eingang|befund(?:datum)?|auftrag|datum)/i;
  const lines=text.split(/\n/);let any=null;
  for(const l of lines){for(const [re,fm] of DATE_RES){re.lastIndex=0;const m=re.exec(l);if(m){const d=fm(m);if(d>='2000-01-01'&&d<=addDays(today(),1)){if(key.test(l))return d;if(!any)any=d}}}}
  return any}
function parseText(text){
  const out=[];const seen=new Set();
  for(let raw of text.split(/\n/)){
    let l=raw.replace(/[ \t]+/g,' ').replace(/^[\s*•·\-–]+/,'').trim();if(l.length<3)continue;
    let best=null;for(const m of Object.values(BY)){const r=m.re.exec(l);if(r&&(!best||r[0].length>best.len))best={m,len:r[0].length}}
    if(!best)continue;
    const rest=l.slice(best.len);
    const vm=/^(?:\s*\([^)]{0,30}\))?(?:\s+[A-Za-zäöüÄÖÜß\-]{2,14}(?=\s+[<>≤≥]?\s*\d))?[\s:.*\-–]*([<>≤≥]?\s*-?\d+(?:[.,]\d+)?)/.exec(rest);if(!vm)continue;
    const v=normalizeNum(vm[1].replace(/[<>≤≥]/,''));if(v==null)continue;
    const tail=rest.slice(vm[0].length);
    const um=/^\s*([a-zA-Zµμ%\/·]+(?:\/[a-zA-Zµμ0-9]+)?)/.exec(tail);let unit=um?um[1]:best.m.unit;
    let lo=null,hi=null;const rg=/(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)/.exec(tail);
    if(rg){lo=normalizeNum(rg[1]);hi=normalizeNum(rg[2])}
    else{const lt=/[<≤]\s*(\d+(?:[.,]\d+)?)/.exec(tail);const gt=/[>≥]\s*(\d+(?:[.,]\d+)?)/.exec(tail);if(lt){lo=0;hi=normalizeNum(lt[1])}else if(gt){lo=normalizeNum(gt[1]);hi=null}}
    if(seen.has(best.m.id))continue;seen.add(best.m.id);
    out.push({marker:best.m.id,v,unit:unit||best.m.unit,lo:lo??best.m.lo,hi:hi??best.m.hi,keep:true,line:l.slice(0,90)});
  }
  return out}
function splitCsv(text){
  const first=text.split(/\r?\n/,1)[0]||'';const cnt=c=>(first.match(new RegExp(c==='\t'?'\t':'\\'+c,'g'))||[]).length;
  const d=cnt(';')>=cnt('\t')&&cnt(';')>=cnt(',')&&cnt(';')>0?';':cnt('\t')>cnt(',')?'\t':',';
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
    else if(c==='"')q=true;else if(c===d){row.push(cur);cur=''}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(x=>x!==''))rows.push(row);row=[]}
    else cur+=c}
  row.push(cur);if(row.some(x=>x!==''))rows.push(row);return rows}
function parseCsvText(text){
  const rows=splitCsv(text);
  if(!rows||rows.length<2)return{items:[],date:null};
  const h=rows[0].map(x=>String(x).toLowerCase());const idx=re=>h.findIndex(x=>re.test(x));
  const iM=idx(/marker|parameter|analyt|test|name|bezeichnung/),iV=idx(/wert|value|result|ergebnis/),iU=idx(/einheit|unit/),iR=idx(/referenz|ref|normal/),iD=idx(/datum|date/);
  if(iM<0||iV<0)return{items:[],date:null};
  const items=[];let date=null;
  for(const r of rows.slice(1)){const name=String(r[iM]||'').trim();if(!name)continue;let hit=null;for(const m of Object.values(BY))if(m.re.test(name)&&(!hit||m.name.length>hit.name.length))hit=m;
    if(!hit)continue;const v=normalizeNum(String(r[iV]).replace(/[<>]/,''));if(v==null)continue;let lo=hit.lo,hi=hit.hi;
    if(iR>=0){const rg=/(-?\d+(?:[.,]\d+)?)\s*[-–]\s*(-?\d+(?:[.,]\d+)?)/.exec(String(r[iR]||''));if(rg){lo=normalizeNum(rg[1]);hi=normalizeNum(rg[2])}}
    if(iD>=0&&!date){const d=findDate(String(r[iD]||''));if(d)date=d}
    items.push({marker:hit.id,v,unit:(iU>=0&&r[iU])||hit.unit,lo,hi,keep:true,line:name})}
  return{items,date}}
let pdfLoading=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  if(pdfLoading)return pdfLoading;
  pdfLoading=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=()=>{try{window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';res(window.pdfjsLib)}catch(e){rej(e)}};
    s.onerror=()=>rej(new Error('PDF-Bibliothek konnte nicht geladen werden (offline?)'));document.head.appendChild(s)});
  return pdfLoading}
async function pdfText(file){
  const lib=await loadPdfJs();const buf=await file.arrayBuffer();const doc=await lib.getDocument({data:buf}).promise;let all='';
  for(let p=1;p<=doc.numPages;p++){const pg=await doc.getPage(p);const tc=await pg.getTextContent();const rows=new Map();
    for(const it of tc.items){if(!it.str||!it.str.trim())continue;const y=Math.round(it.transform[5]/3);(rows.get(y)||rows.set(y,[]).get(y)).push({x:it.transform[4],s:it.str})}
    for(const y of [...rows.keys()].sort((a,b)=>b-a))all+=rows.get(y).sort((a,b)=>a.x-b.x).map(o=>o.s).join(' ')+'\n'}
  return all}

/* ---------------------------------------------------------------- Dateiablage (Cloud oder Gerät) */
function cloudOk(){try{return typeof syncClient!=='undefined'&&!!syncClient&&typeof syncUser!=='undefined'&&!!syncUser&&syncClient.storage}catch(_){return false}}
const safeName=(n)=>String(n||'befund').replace(/[^\w.\-]+/g,'_').slice(-80);
async function storeFile(file,rid){
  if(cloudOk()){try{const path=`${syncUser.id}/${rid}-${safeName(file.name)}`;const {error}=await syncClient.storage.from('blood-reports').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(!error)return{where:'cloud',path};console.warn('blood upload',error.message)}catch(e){warn(e,'blood upload')}}
  try{if(file.size<=15*1024*1024&&await IDB.set('blood:'+rid,file))return{where:'local',path:'blood:'+rid}}catch(e){warn(e,'blood idb')}
  return null}
async function openFile(rid){
  const r=reports().find(x=>x.id===rid);if(!r||!r.store){toast('Datei nicht gespeichert');return}
  try{let url=null;
    if(r.store.where==='cloud'&&cloudOk()){const {data,error}=await syncClient.storage.from('blood-reports').createSignedUrl(r.store.path,300);if(error)throw error;url=data.signedUrl}
    else{const blob=await IDB.get(r.store.path);if(!blob)throw new Error('Datei nicht auf diesem Gerät');url=URL.createObjectURL(blob)}
    window.open(url,'_blank','noopener')}catch(e){toast('Datei konnte nicht geöffnet werden: '+(e.message||e))}}
async function deleteFile(r){
  try{if(r.store&&r.store.where==='cloud'&&cloudOk())await syncClient.storage.from('blood-reports').remove([r.store.path]);else if(r.store)await IDB.del(r.store.path)}catch(_){}}

/* ---------------------------------------------------------------- Upload-Ablauf */
async function handleFile(file){
  if(!file||BL.busy)return;BL.busy=true;BL.msg=`Lese ${file.name} …`;paintMsg();
  try{
    const name=file.name||'befund';const isPdf=/pdf$/i.test(file.type)||/\.pdf$/i.test(name);const isCsv=/\.(csv|tsv|txt)$/i.test(name)||/csv|text\/plain/.test(file.type);const isJson=/json/.test(file.type)||/\.json$/i.test(name);const isImg=/^image\//.test(file.type);
    let items=[],date=null,raw='',note='';
    if(isPdf){try{raw=await pdfText(file);items=parseText(raw);date=findDate(raw);if(!raw.trim())note='Das PDF enthält keinen lesbaren Text (Scan). Die Datei wird gespeichert, Werte bitte manuell eintragen.'}catch(e){note='PDF konnte nicht gelesen werden: '+(e.message||e)}}
    else if(isCsv){raw=await file.text();const r=parseCsvText(raw);items=r.items;date=r.date;if(!items.length){items=parseText(raw)}if(!date)date=findDate(raw)}
    else if(isJson){try{const j=JSON.parse(await file.text());const arr=Array.isArray(j)?j:(j.blood||j.values||[]);for(const x of arr){const nm=String(x.marker||x.name||x.parameter||'');let hit=BY[nm]||Object.values(BY).find(m=>m.re.test(nm));const v=num(x.v??x.value??x.wert);if(hit&&v!=null)items.push({marker:hit.id,v,unit:x.unit||x.einheit||hit.unit,lo:num(x.lo)??hit.lo,hi:num(x.hi)??hit.hi,keep:true,line:nm});if(!date&&x.date)date=x.date}}catch(e){note='JSON nicht lesbar'}}
    else if(isImg){note='Fotos kann ich offline nicht automatisch lesen. Das Bild wird gespeichert; die Werte trägst du unten kurz ein.'}
    else note='Dateityp nicht erkannt. Unterstützt: PDF, CSV, JSON, Foto.';
    const rid=uid();const store=await storeFile(file,rid);
    BL.rev={rid,name,date:date||ui.blDate||today(),lab:(ui.blLab||''),items,note,raw,store,mime:file.type||'',size:file.size||0};
    BL.msg=items.length?`${items.length} Werte erkannt. Bitte prüfen und speichern.`:(note||'Keine Werte erkannt. Du kannst sie unten manuell eintragen.');
    if(store&&store.where==='local'&&cloudOk()===false&&typeof syncUser!=='undefined')BL.msg+=' (Datei liegt nur auf diesem Gerät.)';
  }catch(e){warn(e,'blood handle');BL.msg='Fehler: '+(e.message||e)}
  BL.busy=false;try{render()}catch(_){}}
function paintMsg(){const el=document.getElementById('blMsg');if(el)el.textContent=BL.msg||''}
function saveReview(){
  const R=BL.rev;if(!R)return;const rows=[...document.querySelectorAll('[data-blrow]')];let n=0;
  const date=(document.getElementById('blRevDate')||{}).value||R.date;const lab=((document.getElementById('blRevLab')||{}).value||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){toast('Bitte ein gültiges Datum angeben');return}
  const rep={id:R.rid,date,lab,name:R.name,mime:R.mime,size:R.size,store:R.store||null,n:0};
  for(const row of rows){const i=+row.dataset.blrow;const it=R.items[i];if(!it)continue;if(!row.querySelector('[data-blk]').checked)continue;
    const v=num(row.querySelector('[data-blv]').value);if(v==null)continue;
    marks().push({id:uid(),date,marker:it.marker,v,unit:row.querySelector('[data-blu]').value||it.unit,lo:num(row.querySelector('[data-bll]').value),hi:num(row.querySelector('[data-blh]').value),lab,src:'import',rid:R.rid});n++}
  rep.n=n;reports().push(rep);BL.rev=null;BL.msg='';commit(`${n} Blutwerte gespeichert`)}

/* ---------------------------------------------------------------- View */
function rangeBar(m,x){
  const lo=x.lo,hi=x.hi;if(lo==null||hi==null||hi<=lo)return'';
  const min=lo-(hi-lo)*.5,max=hi+(hi-lo)*.5;const p=Math.max(0,Math.min(100,(x.v-min)/(max-min)*100));
  return`<div class="bl-range" title="Referenz ${f(lo)} bis ${f(hi)} ${Esc(x.unit||m.unit)}"><i style="left:calc(${p}% - 2px)"></i></div>`}
function markerRow(id,hist){
  const m=BY[id];if(!m)return'';const L=hist[id];if(!L||!L.length)return'';const x=L.at(-1);const prev=L.length>1?L.at(-2):null;
  const fl=flag(m,x.v,x.lo,x.hi);const dlt=prev?x.v-prev.v:null;
  const open=ui.blOpen===id;
  return`<div class="item" style="flex-direction:column;align-items:stretch;gap:4px"><div class="row between" style="flex-wrap:nowrap;gap:8px"><div class="main"><div class="t">${Esc(m.name)}</div><div class="small mute">${fmtD(x.date)}${x.lab?' · '+Esc(x.lab):''}${dlt!=null?` · ${dlt>0?'▲':dlt<0?'▼':'►'} ${f(Math.abs(dlt))} seit ${fmtD(prev.date)}`:''}</div></div>
    <div style="text-align:right"><span class="num" style="font-size:18px;font-weight:700">${f(x.v)}</span> <span class="small mute">${Esc(x.unit||m.unit)}</span><br><span class="pill ${fl[1]} bl-flag">${fl[0]}</span></div></div>
   ${rangeBar(m,x)}<div class="row between"><span class="small mute">Referenz ${x.lo!=null?f(x.lo):'–'} bis ${x.hi!=null?f(x.hi):'–'}</span>${L.length>1?`<span>${spark(L.map(z=>z.v),90,22)}</span>`:''}<button class="sm ghost" data-bl="open|${id}">${open?'Verlauf ▴':'Verlauf ▾'}</button></div>
   ${m.note?`<span class="small mute">${Esc(m.note)}</span>`:''}
   ${open?`<div class="list" style="margin-top:4px">${L.slice().reverse().map(z=>`<div class="item"><span class="num mute">${fmtD(z.date)}</span><div class="main">${f(z.v)} ${Esc(z.unit||m.unit)} <span class="small mute">· Ref. ${z.lo!=null?f(z.lo):'–'}–${z.hi!=null?f(z.hi):'–'}${z.lab?' · '+Esc(z.lab):''}</span></div><button class="sm ghost" data-bl="del|${z.id}" aria-label="Löschen">✕</button></div>`).join('')}</div>`:''}</div>`}
VIEWS.blood=function(){
  const H=latestBy();const ids=Object.keys(H).filter(k=>BY[k]);const rep=reports().slice().sort((a,b)=>a.date<b.date?1:-1);
  const out=ids.filter(id=>{const x=H[id].at(-1);return flag(BY[id],x.v,x.lo,x.hi)[1]!=='ok'});
  const R=BL.rev;const t=today();
  const review=R?`<section class="panel"><h2>Erkannte Werte prüfen</h2><p class="small mute">${Esc(R.name)} · ${Esc(BL.msg||'')}</p>
    <div class="row"><label class="f" style="flex:1 1 150px">Datum der Blutabnahme<input type="date" id="blRevDate" value="${Esc(R.date)}"></label><label class="f" style="flex:1 1 150px">Labor (optional)<input id="blRevLab" value="${Esc(R.lab||'')}" placeholder="z. B. Synlab"></label></div>
    ${R.items.length?`<div class="tscroll"><table><thead><tr><th></th><th>Wert</th><th>Wert</th><th>Einheit</th><th>Ref. von</th><th>bis</th></tr></thead><tbody>${R.items.map((it,i)=>`<tr data-blrow="${i}"><td><input type="checkbox" data-blk ${it.keep?'checked':''} aria-label="übernehmen"></td><td>${Esc(BY[it.marker].name)}<div class="small mute" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Esc(it.line||'')}</div></td><td><input data-blv inputmode="decimal" value="${String(it.v).replace('.',',')}" style="width:70px;padding:5px"></td><td><input data-blu value="${Esc(it.unit||'')}" style="width:70px;padding:5px"></td><td><input data-bll inputmode="decimal" value="${it.lo==null?'':String(it.lo).replace('.',',')}" style="width:58px;padding:5px"></td><td><input data-blh inputmode="decimal" value="${it.hi==null?'':String(it.hi).replace('.',',')}" style="width:58px;padding:5px"></td></tr>`).join('')}</tbody></table></div>`:`<p class="small">${Esc(R.note||'Keine Werte erkannt.')}</p>`}
    <div class="row"><button class="primary" data-bl="saveRev">${R.items.length?'Werte speichern':'Nur Datei ablegen'}</button><button class="ghost" data-bl="cancelRev">Verwerfen</button></div>
    ${R.raw?`<details><summary>Erkannten Text anzeigen</summary><div><pre class="small" style="white-space:pre-wrap;max-height:240px;overflow:auto">${Esc(R.raw.slice(0,6000))}</pre></div></details>`:''}</section>`:'';
  return`<section class="panel"><h1>Blutwerte</h1><p class="small mute">Lade Laborbefunde hoch (PDF, CSV, Foto). Aus PDFs und CSV werden Werte automatisch erkannt; du prüfst sie, bevor sie gespeichert werden. Befunde und Werte werden mit deinem Konto synchronisiert.</p>
   <div class="kpis">${kpi('Befunde',rep.length)}${kpi('Letzter Befund',rep.length?fmtD(rep[0].date):'–')}${kpi('Werte außerhalb',out.length,'',out.length?'<span class="d" style="color:var(--warn)">prüfen</span>':'')}</div></section>
  ${review}
  <section class="panel"><h2>Befund hochladen</h2>
   <div class="bl-drop" id="blDrop"><p class="small" style="margin:0 0 8px">Datei hierher ziehen oder auswählen</p><input type="file" id="blFile" accept=".pdf,.csv,.tsv,.txt,.json,image/*" ${BL.busy?'disabled':''}><p class="small mute" id="blMsg" style="margin:8px 0 0">${Esc(BL.rev?'':BL.msg)}</p></div>
   <div class="row"><label class="f" style="flex:1 1 140px">Datum (falls nicht im Dokument)<input type="date" id="blDate" value="${Esc(ui.blDate||t)}"></label><label class="f" style="flex:1 1 140px">Labor (optional)<input id="blLab" value="${Esc(ui.blLab||'')}" placeholder="z. B. Hausarzt, Synlab"></label></div></section>
  <section class="panel"><h2>Wert manuell eintragen</h2>
   <div class="row"><label class="f" style="flex:2 1 170px">Wert<select id="blSel">${CATS.map(c=>`<optgroup label="${Esc(c)}">${CAT.filter(x=>x[5]===c).map(x=>`<option value="${x[0]}" ${ui.blSel===x[0]?'selected':''}>${Esc(x[1])} (${Esc(x[2])})</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label class="f" style="flex:1 1 90px">Ergebnis<input id="blVal" inputmode="decimal"></label><label class="f" style="flex:1 1 140px">Datum<input type="date" id="blAddDate" value="${Esc(ui.blDate||t)}"></label><button class="primary" data-bl="add" style="align-self:flex-end">Speichern</button></div>
   <p class="small mute">Referenzbereiche sind typische Laborwerte für erwachsene Männer. Dein Labor kann abweichen: beim Import gilt der Bereich aus dem Befund.</p></section>
  ${ids.length?CATS.map(c=>{const rows=CAT.filter(x=>x[5]===c&&H[x[0]]).map(x=>markerRow(x[0],H)).join('');return rows?`<section class="panel"><h2>${Esc(c)}</h2><div class="list">${rows}</div></section>`:''}).join(''):`<section class="panel"><p class="small mute">Noch keine Blutwerte. Lade oben einen Befund hoch oder trage einen Wert ein.</p></section>`}
  ${rep.length?`<section class="panel"><h2>Befunde</h2><div class="list">${rep.map(r=>`<div class="item"><span class="num mute">${fmtD(r.date)}</span><div class="main"><div class="t">${Esc(r.name||'Befund')}</div><div class="small mute">${r.n||0} Werte${r.lab?' · '+Esc(r.lab):''}${r.store?(r.store.where==='cloud'?' · in der Cloud':' · auf diesem Gerät'):''}</div></div>${r.store?`<button class="sm" data-bl="file|${r.id}">Öffnen</button>`:''}<button class="sm ghost" data-bl="delrep|${r.id}" aria-label="Befund löschen">✕</button></div>`).join('')}</div></section>`:''}
  <section class="panel"><p class="small mute">Diese Seite ordnet Werte nur grob ein und ersetzt keine ärztliche Beurteilung. Auffällige Werte bitte mit Ärztin oder Arzt besprechen. Hartes Training verändert z. B. CK, GOT und Kreatinin.</p></section>`};

document.addEventListener('change',(e)=>{
  const el=e.target;if(!el||!el.id)return;
  try{
    if(el.id==='blFile'&&el.files&&el.files[0]){ui.blDate=(document.getElementById('blDate')||{}).value||ui.blDate;ui.blLab=(document.getElementById('blLab')||{}).value||'';handleFile(el.files[0]);el.value=''}
    else if(el.id==='blSel')ui.blSel=el.value;
    else if(el.id==='blDate'){ui.blDate=el.value}
  }catch(err){warn(err,'blood change')}
},true);
document.addEventListener('dragover',(e)=>{const d=e.target.closest&&e.target.closest('#blDrop');if(d){e.preventDefault();d.classList.add('over')}},true);
document.addEventListener('dragleave',(e)=>{const d=e.target.closest&&e.target.closest('#blDrop');if(d)d.classList.remove('over')},true);
document.addEventListener('drop',(e)=>{const d=e.target.closest&&e.target.closest('#blDrop');if(!d)return;e.preventDefault();d.classList.remove('over');const f0=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f0){ui.blDate=(document.getElementById('blDate')||{}).value||ui.blDate;handleFile(f0)}},true);
document.addEventListener('click',(ev)=>{
  const b=ev.target.closest&&ev.target.closest('[data-bl]');if(!b)return;ev.stopPropagation();ev.preventDefault();
  const [k,...r]=b.dataset.bl.split('|');const v=r.join('|');
  try{
    if(k==='open'){ui.blOpen=ui.blOpen===v?null:v;render();return}
    if(k==='del'){S.blood=marks().filter(x=>x.id!==v);commit('Wert gelöscht');return}
    if(k==='saveRev'){saveReview();return}
    if(k==='cancelRev'){const R=BL.rev;BL.rev=null;BL.msg='';if(R&&R.store)deleteFile({store:R.store});render();return}
    if(k==='file'){openFile(v);return}
    if(k==='delrep'){const rp=reports().find(x=>x.id===v);if(!rp)return;if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Wirklich?';return}
      deleteFile(rp);S.bloodReports=reports().filter(x=>x.id!==v);S.blood=marks().filter(x=>x.rid!==v);commit('Befund gelöscht');return}
    if(k==='add'){const id=(document.getElementById('blSel')||{}).value;const val=num((document.getElementById('blVal')||{}).value);const date=(document.getElementById('blAddDate')||{}).value||today();const m=BY[id];
      if(!m||val==null){toast('Wert eingeben');return}ui.blSel=id;ui.blDate=date;marks().push({id:uid(),date,marker:id,v:val,unit:m.unit,lo:m.lo,hi:m.hi,lab:'',src:'manuell'});commit(`${m.name} gespeichert`);return}
  }catch(err){warn(err,'blood click')}
},true);

window.__apexBloodTest={parseText,parseCsvText,findDate,BY,flag};
(window.__apexExtraBoot=window.__apexExtraBoot||[]).push(function(){
  if(!MODULES.some(m=>m[0]==='blood')){const i=MODULES.findIndex(m=>m[0]==='body');MODULES.splice(i<0?MODULES.length:i+1,0,['blood','Blutwerte','Laborbefunde hochladen, Werte einordnen, Verlauf'])}
});
})();
