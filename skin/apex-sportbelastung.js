/* APEX Lift · Sportbelastung je Muskel und Körperseite (Nov 2026)
   Erkennt Sporteinheiten (selbst eingetragen oder aus Google Health / Strava / CSV) an Typ und Name und
   rechnet daraus die Belastung je Muskel UND Seite (links/rechts) in die Regeneration ein:
   - recovery() liefert weiter rec[muskel] (= die schlechter erholte Seite), dazu unsichtbar rec[muskel+'L'] / rec[muskel+'R']
   - das 3D-Modell (Modus Regeneration) färbt links und rechts getrennt
   - Intensität aus Puls (sonst Standard), Minuten, Zusatzaufschlag für exzentrische Muskeln und Stoßbelastung
   - Sport zählt abgeschwächt gegenüber Krafttraining (SPORT_FAKTOR)
   Seiten-Einstellungen (S.body): hand (Schlag-/Wurfarm), boxFront (vorderer Fuß Boxen), boardFront (vorderer Fuß Brett), footDom (Schussbein)
   Enthält keine persönlichen Daten. Alles defensiv: ein Fehler hier darf die App nie blockieren. */
(function(){
'use strict';
if(window.__apexSportLast)return;window.__apexSportLast=1;
const warn=(e,w)=>{try{logErr(e,w)}catch(_){console.warn(w,e)}};
const G=(n)=>{try{return (0,eval)(n)}catch(_){return undefined}};
if(typeof S==='undefined'||typeof recovery!=='function'||typeof MUS==='undefined'||typeof cardioMusLoads!=='function'){console.warn('apex-sportbelastung: App nicht gefunden');return}

const SPORT_FAKTOR=.7;                       // Sport zählt abgeschwächt gegenüber Krafttraining
const H=1,M=.6,L=.3;                         // hoch / mittel / gering
const LEGS=['qu','bb','ge','wa','ti','ad','ab','hb'];

/* Muskeln: br Brust · vs/ss/hs vordere/seitliche/hintere Schulter · la Latissimus · or oberer Rücken (Rhomboiden) · tr Trapez/Nacken · ur unterer Rücken
   bi Bizeps · tz Trizeps · ua Unterarme · qu Quadrizeps · bb Beinbeuger · ge Gesäß · wa Waden · hb Hüftbeuger · ad Adduktoren
   ba gerader Bauch · sc Schräge (inkl. Serratus anterior) · ti Schienbein · ab Abduktoren
   Gewicht: Zahl = beide Seiten gleich · [a,b] = [Seite 1, Seite 2] nach Regel r (stance: vorn/hinten · hand: Schlagarm/anderer · board: vorn/hinten · foot: Schussbein/Standbein)
   x = Zusatzaufschlag (exzentrisch) für die Muskeln in e, i = Stoßbelastung der Beine (0–1,5) */
const P=[
 {id:'kick',n:'Kickboxen / Muay Thai',re:/kick|muay|thai ?box|k-1/,r:'stance',m:{hb:[.8,1],qu:[.8,1],ge:[.8,1],ad:H,sc:H,wa:M,bb:M,ab:M,vs:M,tz:M,ba:M,ss:L,br:L,ua:L},e:['hb','ad'],x:.15,i:.5},
 {id:'boxen',n:'Boxen',re:/box/,r:'stance',m:{vs:[H,.55],ss:[.8,.4],sc:[H,H],tz:H,wa:[.8,H],qu:M,ge:[.3,M],br:M,ba:M,bi:L,la:L,tr:L,ua:L,ad:L},e:[],x:0,i:.4},
 {id:'bjj',n:'Jiu-Jitsu / Ringen / Judo / MMA',re:/jiu|jitsu|bjj|ringen|wrestl|judo|grappl|mma|martial|kampfsport|nahkampf/,m:{ua:H,bi:H,la:H,ur:H,tr:H,hb:H,ad:H,ge:M,qu:M,bb:M,ba:M,sc:M,or:M,br:L,tz:L,wa:L},e:['la','bi','ur','ad'],x:.3,i:.3},
 {id:'karate',n:'Karate / Taekwondo / Kampfkunst',re:/karate|taekwon|kung ?fu|capoeira|krav|aikido|selbstverteidigung/,m:{hb:H,qu:H,wa:H,ad:H,ge:M,bb:M,ba:M,sc:M,vs:L,tz:L},e:['hb','ad'],x:.15,i:.6},
 {id:'skitour',n:'Skitour',re:/ski ?tour|skitour|touren ?ski|skimo|ski ?mountaineering/,m:{qu:H,ge:H,hb:H,wa:M,bb:M,ab:M,ad:L,ur:L,la:L,tz:L,ti:L},e:['qu'],x:.15,i:.3},
 {id:'langlauf',n:'Langlauf',re:/langlauf|cross.?country ski|nordic ski|loipe|skating ski/,m:{la:H,tz:H,qu:H,ge:H,ba:M,sc:M,wa:M,bb:M,vs:M,hb:M,ur:L},e:[],x:0,i:.1},
 {id:'ski',n:'Skifahren (alpin)',re:/\bski|alpin|abfahrt|downhill ski/,m:{qu:H,ge:H,ad:H,ab:H,bb:M,wa:M,sc:M,ur:M,hb:M,ua:L,tz:L,ba:L},e:['qu','ge'],x:.35,i:.4},
 {id:'snowboard',n:'Snowboarden',re:/snowboard/,r:'board',m:{qu:[H,.6],ge:[H,.6],wa:[H,.6],ad:M,ab:M,hb:[M,L],ba:M,ur:M,sc:M,ua:L,vs:L},e:['qu','ge'],x:.3,i:.5},
 {id:'skate',n:'Skateboard',re:/skate ?board|skateboard|longboard|waveboard/,r:'board',m:{qu:[.8,M],ge:[M,.8],wa:[M,.8],ti:[M,L],ad:M,ab:[L,M],ba:M,sc:M,ur:L,hb:L},e:['wa','qu'],x:.25,i:.6},
 {id:'inline',n:'Inline-Skaten / Eislaufen',re:/inline|rollschuh|roller ?skat|skating|eislauf|ice ?skat|schlittschuh|eishockey/,m:{ge:H,ab:H,ad:H,qu:H,wa:M,bb:M,hb:M,ba:M},e:[],x:0,i:.3},
 {id:'river',n:'River Surfen',re:/river/,r:'board',m:{qu:[.8,.8],ge:M,wa:M,ad:M,ba:H,sc:M,ur:M,ua:M,vs:L},e:[],x:0,i:.1},
 {id:'surf',n:'Wellenreiten / Kitesurfen',re:/surf|wellenreit|kite|wing ?foil|windsurf/,m:{la:H,hs:H,tz:H,br:M,ur:M,vs:M,qu:M,ge:M,ba:M,sc:M,hb:L},e:[],x:0,i:.1},
 {id:'paddeln',n:'SUP / Kajak / Kanu / Paddeln',re:/\bsup\b|stand.?up|paddl|paddel|kajak|kayak|kanu|canoe|drachenboot/,m:{la:H,hs:H,tz:H,sc:M,ur:M,vs:M,ba:M,qu:L,br:L,bi:L},e:[],x:0,i:0},
 {id:'segeln',n:'Segeln',re:/segel|sail/,m:{ua:M,bi:M,la:M,ba:M,sc:M,ur:M,qu:L,hb:L,ad:L,hs:L},e:[],x:0,i:0},
 {id:'rudern',n:'Rudern',re:/rudern|rowing|\brow\b|ruderer|ruder/,m:{la:H,or:H,qu:H,ge:H,ur:H,bb:M,bi:M,hs:M,tr:M,ua:M,ba:M,wa:L,br:L},e:[],x:0,i:0},
 {id:'swim',n:'Schwimmen',re:/schwimm|swim/,m:{la:H,hs:H,tz:H,vs:M,br:M,sc:M,wa:M,ba:M,bi:L,qu:L,bb:L,ge:L,tr:L,or:L},e:[],x:0,i:0},
 {id:'mtb',n:'Mountainbike',re:/mtb|mountain ?bike|mountainbike|gelände ?rad|e-?mtb|downhill|enduro|bmx/,m:{qu:H,ge:H,bb:M,wa:M,hb:M,ua:M,tz:M,vs:M,ba:M,ur:M,br:L,sc:L},e:['qu','ua'],x:.15,i:.1},
 {id:'bike',n:'Radfahren',re:/rennrad|radfahr|radtour|\brad\b|\bbik(e|ing)|cycl|spinning|ergometer|zwift|indoor ?cycl/,m:{qu:H,ge:H,bb:M,wa:M,hb:M,ur:L,ba:L,ua:L,tz:L,vs:L},e:[],x:0,i:0},
 {id:'cross',n:'Crosstrainer / Stepper',re:/cross ?trainer|crosstrainer|ellip|stepper/,m:{qu:M,ge:M,wa:L,bb:L,hb:L,la:L,tz:L},e:[],x:0,i:.15},
 {id:'seil',n:'Seilspringen',re:/seil ?spring|jump ?rope|skipping|springseil/,m:{wa:H,ti:H,qu:M,ba:L,ua:L,vs:L},e:['wa'],x:.2,i:1.5},
 {id:'treppe',n:'Treppensteigen',re:/treppe|stair/,m:{qu:H,ge:H,wa:M,hb:M,ti:L},e:['qu'],x:.15,i:.5},
 {id:'klettern',n:'Klettern / Bouldern',re:/kletter|boulder|climb/,m:{ua:H,la:H,bi:H,or:M,hs:M,tr:M,hb:M,ba:M,wa:M,qu:M,sc:M,tz:L,br:L,ge:L},e:['bi','ua'],x:.2,i:.3},
 {id:'cali',n:'Calisthenics / Turnen',re:/calisth|turnen|gymnast|klimmzug|pull.?up|street ?workout|akrobat/,m:{la:H,br:H,tz:H,bi:H,ba:H,ua:H,vs:M,sc:M,or:M,hb:M,qu:L,ge:L},e:['la','bi'],x:.2,i:.1},
 {id:'hiit',n:'HIIT / CrossFit / HYROX / Zirkel',re:/hiit|crossfit|hyrox|functional|zirkel|circuit|boot ?camp|intervall|aerob|tabata/,m:{qu:H,ge:H,la:H,vs:H,ba:H,br:M,tz:M,bi:M,bb:M,ur:M,wa:M,ua:M,tr:L,ad:L},e:['qu','ge'],x:.2,i:.6},
 {id:'nordic',n:'Nordic Walking',re:/nordic ?walk/,m:{wa:M,qu:M,ge:M,tz:M,la:L,vs:L,ba:L},e:[],x:0,i:.3},
 {id:'wandern',n:'Wandern / Bergwandern',re:/wander|hik|trek|bergwander|bergsteig/,m:{wa:M,qu:M,ge:M,bb:L,hb:L,ur:L,ab:L,ti:L},e:['qu'],x:.2,i:.35},
 {id:'walk',n:'Spazieren / Gehen',re:/spazier|walk/,m:{wa:L,qu:L,ge:L,hb:L},e:[],x:0,i:.25},
 {id:'laufen',n:'Laufen / Trailrunning',re:/lauf|\brun|jog|trail|sprint|leichtathl|marathon/,m:{wa:H,qu:H,bb:H,ge:H,hb:M,ti:M,ab:M,ba:L,ur:L,ad:L},e:['wa','qu','ti','bb'],x:.2,i:1},
 {id:'tischtennis',n:'Tischtennis',re:/tischtennis|table ?tennis|ping ?pong/,r:'hand',m:{wa:M,qu:M,sc:M,ua:[M,L],ge:L,vs:[L,0],tz:[L,0]},e:[],x:0,i:.2},
 {id:'tennis',n:'Tennis / Padel / Squash / Badminton',re:/tennis|padel|squash|badminton|racket|racquet/,r:'hand',m:{wa:H,qu:H,sc:H,ge:M,bb:M,hb:M,ad:M,vs:[M,L],ss:[M,L],hs:[M,L],ua:[M,L],tz:[M,L],br:L,bi:L,ur:L},e:['qu','wa'],x:.15,i:.9},
 {id:'ball',n:'Basketball / Volleyball / Handball',re:/basket|volley|handball|netzball|beachvolley/,r:'hand',m:{wa:H,qu:H,ge:H,bb:M,hb:M,vs:[M,L],ss:[M,L],tz:[M,L],ua:[M,L],ba:L,la:L},e:['wa','qu'],x:.15,i:1},
 {id:'fussball',n:'Fußball',re:/fu(ß|ss)ball|soccer|futsal|football/,r:'foot',m:{qu:[H,.8],bb:H,wa:H,ad:H,ge:M,hb:[H,M],ab:M,ti:M,ba:L,ur:L},e:['bb','ad'],x:.3,i:1},
 {id:'golf',n:'Golf',re:/golf/,m:{sc:H,wa:M,qu:L,ge:M,ur:M,la:L,ua:L},e:[],x:0,i:.1},
 {id:'tanz',n:'Tanzen',re:/tanz|danc|zumba|ballett/,m:{wa:M,qu:M,ge:M,ba:M,hb:L,bb:L,ur:L,vs:L,ad:L},e:[],x:0,i:.5},
 {id:'yoga',n:'Yoga / Pilates / Mobility',re:/yoga|pilates|mobility|stretch|dehn|beweglich/,m:{ba:M,sc:M,ur:M,ge:M,vs:L,qu:L,bb:L,ad:L,tz:L,wa:L},e:[],x:0,i:0},
 {id:'reiten',n:'Reiten',re:/reit|horse|equest/,m:{ad:H,ge:M,ur:M,ba:M,qu:L,ua:L},e:[],x:0,i:0}
];
const PID=Object.fromEntries(P.map(p=>[p.id,p]));

/* ------------------------------------------------------------------ Seiten */
const body=()=>(S.body&&typeof S.body==='object')?S.body:{};
const firstSide=(r)=>{const b=body();return r==='stance'?(b.boxFront||'L'):r==='board'?(b.boardFront||'L'):r==='foot'?(b.footDom||b.hand||'R'):(b.hand||'R')};
function wOf(spec,side,rule){
  if(typeof spec==='number')return spec;
  const r=spec[2]||rule||'hand';const f=firstSide(r);
  if(side==='L'||side==='R')return side===f?spec[0]:spec[1];
  return (spec[0]+spec[1])/2}
const norm=(s)=>String(s||'').toLowerCase().replace(/_/g,' ');
function classify(a){const t=norm((a.type||'')+' '+(a.name||''));if(!t.trim())return null;for(const p of P)if(p.re.test(t))return p;return null}
const SIDE={v:null};

/* Aktivitäten: Die App zählt automatisch erkannte Einheiten ohne Puls/Strecke als „Alltagsbewegung“ (isDaily) und lässt sie aus TA() weg.
   Echte Sportarten (Boxen, Ball, Kampfsport …) werden hier trotzdem gezählt; Gehen/Laufen/Rad/Wandern bleiben bei der App-Regel. */
const ALLTAG=new Set(['walk','laufen','bike','nordic','wandern']);
function sportActs(){return(S.activities||[]).filter(a=>{if(!a||a.dup||a.excl)return false;if(!isDaily(a))return true;const p=classify(a);return !!p&&!ALLTAG.has(p.id)})}

/* ------------------------------------------------------------------ Belastungs-Ereignisse (ersetzt cardioMusLoads) */
function sportLoads(days=21,side){
  const out=[];const t=today();const maxHR=S.body.maxHr||(208-.7*((new Date().getFullYear())-(S.body.birthYear||1990)));
  const raw=[...sportActs().map(a=>({...a,kind:a.type})),...(S.swims||[]).map(w=>({date:w.date,min:w.min,kind:'Schwimmen',time:w.time,hr:w.hr}))];
  // Doppelte (z. B. eigene Einheit + Google-Health-Eintrag am selben Tag) nur einmal zählen
  const groups={};const acts=[];
  for(const a of raw){if(!a.min||dayDiff(t,a.date)>days)continue;const p=classify(a);if(!p){acts.push({a,p:null});continue}
    (groups[p.id+'|'+a.date]=groups[p.id+'|'+a.date]||[]).push({a,p})}
  for(const g of Object.values(groups)){const srcs=new Set(g.map(x=>x.a.source||'-'));
    if(srcs.size>1){let best=g[0];for(const x of g)if(x.a.min>best.a.min)best=x;const hr=g.map(x=>x.a.hr).find(Boolean);acts.push({a:{...best.a,hr:best.a.hr||hr||null},p:best.p})}
    else for(const x of g)acts.push(x)}
  for(const{a,p}of acts){
    const inten=a.hr?clamp((a.hr/maxHR-.5)/.3,.35,1.4):(p&&p.id==='laufen'&&a.km&&a.min?clamp((a.km/a.min*60-6)/6+.8,.5,1.3):.8);
    const eq=a.min/10*inten;const tt=a.time?new Date(a.date+'T'+a.time).getTime()+a.min*6e4:new Date(a.date+'T17:00').getTime();
    if(p){
      for(const[m,spec]of Object.entries(p.m)){
        const wt=wOf(spec,side,p.r);if(!wt)continue;
        const isE=p.e.includes(m);const extra=(isE?p.x:0)+(LEGS.includes(m)?Math.min(.4,p.i*.25):0);
        const w=eq*wt*SPORT_FAKTOR*(1+extra);
        if(w>=.8)out.push({m,t:tt,date:a.date,w,ecc:isE&&w>2,src:p.n,side:side||null,min:Math.round(a.min),hr:a.hr||null,from:a.source||''})}
    }else{
      const Mm=(typeof CARDIO_MUS!=='undefined'&&CARDIO_MUS[a.kind])||null;if(!Mm)continue;
      const E=(typeof CARDIO_ECC!=='undefined'&&CARDIO_ECC[a.kind])||[];
      for(const[m,f]of Object.entries(Mm))if(eq*f>=1)out.push({m,t:tt,date:a.date,w:eq*f,ecc:E.includes(m)&&eq*f>2,src:a.kind})}
  }
  return out}

/* ------------------------------------------------------------------ recovery() mit Seiten */
const origRecovery=recovery;
let cache=null;
const prog=(r)=>r&&r.h!=null&&r.R?r.h/r.R:Infinity;
function keyNow(){let mins=0;for(const a of (S.activities||[]))mins+=(a.min||0);for(const w of (S.swims||[]))mins+=(w.min||0);
  const b=body();return[Math.floor(Date.now()/15000),(S.sets||[]).length,(S.activities||[]).length,Math.round(mins),b.hand,b.boxFront,b.boardFront,b.footDom,b.maxHr].join('|')}
function recoverySided(){
  const k=keyNow();if(cache&&cache.k===k)return cache.v;
  let Lr,Rr;
  try{SIDE.v='L';Lr=origRecovery.apply(this,arguments);SIDE.v='R';Rr=origRecovery.apply(this,arguments)}
  finally{SIDE.v=null}
  const out={};
  for(const key of Object.keys(Lr)){const a=Lr[key],b=Rr[key];out[key]=prog(a)<=prog(b)?a:b;
    Object.defineProperty(out,key+'L',{value:a,enumerable:false});Object.defineProperty(out,key+'R',{value:b,enumerable:false})}
  cache={k,v:out};return out}
function wrapRecovery(){
  const w=function(){try{return recoverySided.apply(this,arguments)}catch(e){warn(e,'recoverySided');SIDE.v=null;return origRecovery.apply(this,arguments)}};
  w.__apxSide=1;window.recovery=w;(0,eval)('recovery=window.recovery')}
function wrapLoads(){
  const w=function(days){const s=SIDE.v;try{return sportLoads(days||21,s)}catch(e){warn(e,'sportLoads');return[]}};
  w.__apxSide=1;window.cardioMusLoads=w;(0,eval)('cardioMusLoads=window.cardioMusLoads')}
try{wrapLoads();wrapRecovery()}catch(e){warn(e,'apex-sportbelastung wrap');return}

/* ------------------------------------------------------------------ 3D-Modell: links/rechts getrennt einfärben (Modus Regeneration) */
function sideRecolor(){
  if(typeof B3==='undefined'||B3.state!=='ready'||B3.mode!=='rec'||!B3.rec||!B3.meshes||!B3.meshes.muscle)return;
  const T=THREE,rec=B3.rec,Mh=B3.meshes.muscle,keys=BODY.keys;const ov={};let any=false;
  for(let ki=0;ki<keys.length;ki++){const k=keys[ki];if(!MUS[k]||!rec[k])continue;
    for(const[si,sd]of[[0,'L'],[1,'R']]){const r=rec[k+sd];if(!r||r===rec[k]||r.c===rec[k].c)continue;ov[ki*3+si]=r;any=true}}
  if(!any)return;
  const col=Mh.g.attributes.color.array,base=Mh.base,n=Mh.slot.length;const dark=new T.Color(0x3f434b),none=new T.Color((G('REC_HEX')||{})['Keine Daten']||0x5b5560);
  const cache={};
  for(let i=0;i<n;i++){const s=Mh.slot[i];const r=ov[s];if(!r)continue;
    let c=cache[s];if(!c){c=r.h==null?none.clone():new T.Color(r.c);const k=keys[Math.floor(s/3)];if(B3.sel&&B3.sel.key===k)c.lerp(new T.Color(0xffffff),.35);cache[s]=c}
    let cc=c;if((r.h==null||r.h>24*21)&&Math.floor((base[i*3]+base[i*3+1]*1.3)*55)%2)cc=dark;
    col[i*3]=cc.r;col[i*3+1]=cc.g;col[i*3+2]=cc.b}
  Mh.g.attributes.color.needsUpdate=true}
try{const u=window.b3Update||G('b3Update');if(typeof u==='function'&&!u.__apxSide){const w=function(){const r=u.apply(this,arguments);try{sideRecolor()}catch(e){warn(e,'sideRecolor')}return r};w.__apxSide=1;window.b3Update=w;(0,eval)('b3Update=window.b3Update')}}catch(e){warn(e,'b3Update wrap')}
// Auswahl eines Muskels: Status der angetippten Seite zeigen
try{const o=window.b3Info||G('b3Info');if(typeof o==='function'&&!o.__apxSide){const w=function(){const s=B3.sel;let sw=null;
  if(s&&B3.rec&&(s.side==='L'||s.side==='R')&&B3.rec[s.key+s.side]){sw=B3.rec[s.key];B3.rec[s.key]=B3.rec[s.key+s.side]}
  try{return o.apply(this,arguments)}finally{if(sw)B3.rec[s.key]=sw}};
  w.__apxSide=1;window.b3Info=w;(0,eval)('b3Info=window.b3Info')}}catch(e){warn(e,'b3Info wrap')}

/* ------------------------------------------------------------------ Bereich unter dem 3D-Modell: Seiten, letzte Einheiten, Zuordnung */
const LV=(w)=>w>=.9?'hoch':w>=.5?'mittel':'gering';
const SDN={L:'links',R:'rechts'};
function recentRows(){const t=today();const rows=[];
  for(const a of sportActs()){if(!a.min||dayDiff(t,a.date)>7)continue;const p=classify(a);if(!p)continue;
    const tops=Object.entries(p.m).map(([m,s])=>{const l=wOf(s,'L',p.r),r=wOf(s,'R',p.r);return{m,l,r,mx:Math.max(l,r)}}).filter(x=>x.mx>=.9).sort((a,b)=>b.mx-a.mx).slice(0,6)
      .map(x=>`${MUS[x.m]}${Math.abs(x.l-x.r)>=.2?` (${x.l>x.r?'links':'rechts'} stärker)`:''}`);
    rows.push({d:a.date,n:p.n,min:Math.round(a.min),hr:a.hr,src:a.source||'',tops})}
  return rows.sort((a,b)=>a.d<b.d?1:-1)}
function seg(label,key,val,opts){const cur=body()[key]||val;return`<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"><span class="small" style="min-width:150px">${label}</span><div class="chips">${opts.map(([v,l])=>`<button data-spb="${key}:${v}" aria-pressed="${cur===v}">${l}</button>`).join('')}</div></div>`}
function panelHtml(){
  const rows=recentRows();const esc2=(s)=>{try{return esc(s)}catch(_){return String(s)}};
  const settings=[seg('Schlag-/Wurfarm (Tennis, Ball …)','hand','R',[['R','rechts'],['L','links']]),
    seg('Vorderer Fuß beim Boxen','boxFront','L',[['L','links (Auslage links)'],['R','rechts']]),
    seg('Vorderer Fuß auf dem Brett','boardFront','L',[['L','links (regular)'],['R','rechts (goofy)']]),
    seg('Schussbein (Fußball)','footDom',body().hand||'R',[['R','rechts'],['L','links']])].join('');
  const recent=rows.length?`<div class="list">${rows.slice(0,8).map(r=>`<div class="item"><div class="main"><div class="t">${esc2(r.n)} · ${r.min} min${r.hr?` · Ø ${r.hr} bpm`:''}</div><div class="small mute">${esc2(r.d)}${r.src?' · '+esc2(r.src):''} — ${r.tops.map(esc2).join(', ')}</div></div></div>`).join('')}</div>`:'<p class="small mute">Keine erkannte Sporteinheit in den letzten 7 Tagen.</p>';
  const table=P.map(p=>{const grp={hoch:[],mittel:[],gering:[]};
    for(const[m,s]of Object.entries(p.m)){const l=wOf(s,'L',p.r),r=wOf(s,'R',p.r);const mx=Math.max(l,r);const tag=Math.abs(l-r)>=.2?` (${l>r?'L':'R'}+)`:'';grp[LV(mx)].push((MUS[m]||m)+tag)}
    return`<div class="small" style="margin:6px 0"><strong>${esc2(p.n)}</strong><br>${['hoch','mittel','gering'].filter(k=>grp[k].length).map(k=>`<span class="mute">${k}:</span> ${grp[k].map(esc2).join(', ')}`).join(' · ')}</div>`}).join('');
  return`<details id="spbBox"><summary>Sportbelastung · Seiten &amp; Zuordnung</summary><div>
   <p class="small mute">Erkannte Sporteinheiten (auch aus Google Health) belasten die Muskeln links und rechts getrennt. Sport zählt abgeschwächt (${Math.round(SPORT_FAKTOR*100)} %) gegenüber Krafttraining; exzentrische und stoßlastige Sportarten verlängern die Erholung zusätzlich. Die Seitenwahl bestimmt, welche Seite stärker belastet wird.</p>
   ${settings}
   <h3 style="margin:10px 0 4px;font-size:14px">Letzte 7 Tage</h3>${recent}
   <details><summary>Welche Sportart belastet was?</summary><div>${table}<p class="small mute">„(L+)“ / „(R+)“: die linke bzw. rechte Seite wird stärker belastet. Serratus anterior ist unter „Schräge“ eingerechnet.</p></div></details>
  </div></details>`}
try{const o=window.bodyPanel||G('bodyPanel');if(typeof o==='function'&&!o.__apxSide){const w=function(){const h=o.apply(this,arguments);let x='';try{x=panelHtml()}catch(e){warn(e,'panelHtml')}
    if(!x||typeof h!=='string')return h;const i=h.lastIndexOf('</section>');return i<0?h+x:h.slice(0,i)+x+h.slice(i)};
  w.__apxSide=1;window.bodyPanel=w;(0,eval)('bodyPanel=window.bodyPanel')}}catch(e){warn(e,'bodyPanel wrap')}

/* ------------------------------------------------------------------ Erklärung beim Antippen eines Muskels (Modus Regeneration) */
// Dehnübungen → gedehnte Muskeln (nur Anzeige: Dehnen belastet nicht und verlängert die Erholung nicht)
const DRILL_MUS={k2w:['wa','ti'],soleus:['wa'],calf:['wa'],pf:['ti'],balance:['wa','ti','ge'],quad:['qu'],ham:['bb'],couch:['hb','qu'],lunge:['hb'],'9090':['ge','ad','hb'],pigeon:['ge'],frog:['ad'],copen:['ad','sc'],squat:['qu','ge','ad','wa'],wgs:['hb','ge','sc','ur'],swingf:['hb','bb'],swings:['ad','ab'],catcow:['ur','ba'],book:['sc','or','br'],tspine:['or','ur'],child:['ur','la'],sleeper:['hs'],angel:['hs','tr','or'],door:['br','vs'],lat:['la'],disloc:['vs','hs','tr'],wrist:['ua'],neck:['tr']};
const f1=(x)=>String(Math.round(x*10)/10).replace('.',',');
const agoTxt=(d)=>{const n=dayDiff(today(),d);return n<=0?'heute':n===1?'gestern':'vor '+n+' Tagen'};
const hTxt=(h)=>h<48?Math.round(h)+' h':Math.round(h/24)+' Tagen';
function strengthEvents(key){const by={};const t0=today();
  for(const s of S.sets||[]){if(dayDiff(t0,s.date)>60)continue;const e=ex(s.exerciseId);if(!e||!e.mus)continue;const i=e.mus.indexOf(key);if(i<0)continue;
    const t=s.t||new Date(s.date+'T18:00').getTime();const k=s.date+'|'+e.id;const o=by[k]=by[k]||{t:0,date:s.date,w:0,n:0,label:e.name,main:i===0,ecc:false,kind:'kraft'};
    o.t=Math.max(o.t,t);o.w+=i===0?1:.5;o.n++;if(i===0&&REC_ECC.test(e.name))o.ecc=true}
  return Object.values(by)}
function explainHtml(key,side){
  const lr=side==='L'||side==='R';const r=B3.rec[lr?key+side:key]||B3.rec[key];if(!r)return'';
  const E=(s)=>{try{return esc(s)}catch(_){return String(s)}};
  const nm=MUS[key]+(lr?(side==='L'?' links':' rechts'):'');
  if(r.h==null)return`<strong>Warum ${E(nm)} grau ist:</strong> Für diesen Muskel gibt es noch keine erfasste Belastung (weder Krafttraining noch erkannte Sporteinheit).`;
  const ev=[...strengthEvents(key),...sportLoads(60,lr?side:null).filter(e=>e.m===key).map(e=>({...e,kind:'sport'}))];
  if(!ev.length)return'';
  const tMax=Math.max(...ev.map(e=>e.t));const ld=iso(tMax);const last=ev.filter(e=>e.date===ld).sort((a,b)=>b.w-a.w);
  const rest=Math.max(0,Math.round(r.R-r.h));
  const item=(e)=>{
    if(e.kind==='kraft')return`${E(agoTxt(e.date))} · ${E(e.label)}: ${e.n} ${e.n===1?'Satz':'Sätze'}${e.main?' (Hauptmuskel)':' (Nebenmuskel, zählt halb)'}${e.ecc?' · exzentrisch':''}`;
    const p=P.find(x=>x.n===e.src);let asym='';
    if(p&&lr&&p.m[key]!=null){const l=wOf(p.m[key],'L',p.r),rr=wOf(p.m[key],'R',p.r);if(Math.abs(l-rr)>=.2){const mine=side==='L'?l:rr,other=side==='L'?rr:l;asym=mine>other?' · diese Seite stärker belastet':' · diese Seite weniger belastet'}}
    return`${E(agoTxt(e.date))} · ${E(e.src)} ${e.min} min${e.hr?' · Ø '+e.hr+' bpm':''}${e.from?' ('+E(e.from)+')':''}: ca. ${f1(e.w)} Satz-Äquivalente${asym}${e.ecc?' · exzentrisch':''}`};
  const eccL=last.some(e=>e.ecc);const sets=last.reduce((x,e)=>x+e.w,0);
  const older=ev.filter(e=>e.date!==ld).sort((a,b)=>b.t-a.t).slice(0,4);
  const mobs=(S.mobSessions||[]).filter(m=>dayDiff(today(),m.date)<=7&&(m.drills||[]).some(d=>(DRILL_MUS[d]||[]).includes(key)));
  return`<div><strong>Warum ${E(nm)} so eingefärbt ist</strong></div>
   <div>${E(r.state)} – zuletzt belastet ${E(agoTxt(ld))} (vor ${hTxt(r.h)}). Erholungszeit ca. ${r.R} h, ${rest>0?'noch ca. '+(rest<48?rest+' h':Math.round(rest/24)+' Tage'):'bereits abgelaufen'}.</div>
   <div style="margin-top:4px"><strong>Verantwortlich (letzter Belastungstag):</strong></div>
   <ul style="margin:2px 0 4px 18px;padding:0">${last.slice(0,6).map(e=>`<li>${item(e)}</li>`).join('')}</ul>
   <div class="mute">Rechnung: Basis ${(typeof REC_BASE!=='undefined'&&REC_BASE[key])||40} h × (0,7 + 0,075 × ${f1(Math.min(sets,8))} Sätze)${eccL?' × 1,15 (exzentrisch)':''} ≈ ${r.R} h. Nur der letzte Belastungstag bestimmt die Dauer.</div>
   ${older.length?`<div class="mute" style="margin-top:4px">Davor: ${older.map(e=>item(e)).join(' · ')}</div>`:''}
   ${mobs.length?`<div class="mute" style="margin-top:4px">Gedehnt: ${mobs.map(m=>E(agoTxt(m.date))+' ('+E(m.routine||'Mobility')+')').join(', ')} – Dehnen zählt nicht als Belastung und verkürzt oder verlängert die Erholung nicht.</div>`:''}`}
function showWhy(){
  let el=document.getElementById('spbWhy');const info=document.getElementById('b3info');
  const s=typeof B3!=='undefined'?B3.sel:null;
  if(!info||!s||B3.mode!=='rec'||!B3.rec||s.key==='xx'||!MUS[s.key]){if(el)el.remove();return}
  let h='';try{h=explainHtml(s.key,s.side)}catch(e){warn(e,'explainHtml')}
  if(!h){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='spbWhy';el.className='small';el.style.cssText='margin:6px 0;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.06);line-height:1.45';info.insertAdjacentElement('afterend',el)}
  el.innerHTML=h}
try{const o2=window.b3Info;if(typeof o2==='function'){const w2=function(){const r=o2.apply(this,arguments);try{showWhy()}catch(e){warn(e,'showWhy')}return r};w2.__apxSide=1;window.b3Info=w2;(0,eval)('b3Info=window.b3Info')}}catch(e){warn(e,'b3Info why')}

document.addEventListener('click',(e)=>{const b=e.target.closest&&e.target.closest('[data-spb]');if(!b)return;e.stopPropagation();e.preventDefault();
  const[key,val]=b.dataset.spb.split(':');if(!['hand','boxFront','boardFront','footDom'].includes(key)||!['L','R'].includes(val))return;
  if(!S.body||typeof S.body!=='object')S.body={};S.body[key]=val;cache=null;
  try{commit('Seite gespeichert')}catch(_){try{save();render()}catch(__){}}},true);

window.ApexSport={profiles:P,classify,loads:sportLoads,factor:SPORT_FAKTOR,recolor:sideRecolor,why:explainHtml};
})();
