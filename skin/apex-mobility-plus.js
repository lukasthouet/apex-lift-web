/* APEX Lift · Boxen-Companion & sportartenübergreifende Mobility-Vorschläge (Nov 2026)
   1. Neue Übungen (Mobilität, Kraft, Schnelligkeit/Koordination, Aufwärmen, Cooldown) fürs Boxen – eingetragen in DRILLS,
      damit der vorhandene Übungs-Player (Timer, Seiten, Mobility-Einheiten) sie direkt abspielt.
   2. Vorschlagsprogramm im Mobility-Bereich: Grundlage sind die erfassten Einheiten der letzten 4 Wochen (Häufigkeit, Aktualität),
      Rückmeldungen (erledigt · übersprungen · nicht relevant → S.mobSug), Erholung und aktive Beschwerden.
   Vorschläge unterstützen – sie ersetzen keine medizinische Beurteilung. */
(function(){
'use strict';
if(window.__apexMobPlus)return;window.__apexMobPlus=1;
const A=window.ApexBox;if(!A){console.warn('apex-mobility-plus: Kern fehlt');return}
if(typeof DRILLS==='undefined'||typeof DR==='undefined'||typeof ROUTINES==='undefined'){console.warn('apex-mobility-plus: Mobility-Katalog nicht gefunden');return}
const E=A.esc;

/* ------------------------------------------------------------------ 1. Übungen
   [id, Name, Region, Art(hold|reps), Dosis (s bzw. Wdh.), proSeite, Anleitung, Kategorie, Intensität, belastet, leichtere Variante, Warum] */
const X=[
 ['bx-thor','BWS-Rotation im Vierfüßler','Wirbelsäule','reps',8,1,'Vierfüßler, eine Hand am Hinterkopf. Ellbogen zum Standarm führen, dann weit zur Decke aufdrehen – der Blick folgt dem Ellbogen. Langsam, im Atemrhythmus.','mob','gentle',['Wirbelsäule'],'Hand aufs Brustbein legen und nur kleiner drehen.','Schlagen und Ausweichen drehen aus der Brustwirbelsäule – eine bewegliche BWS entlastet Schulter und unteren Rücken.'],
 ['bx-armcirc','Armkreise, groß','Schulter','reps',10,0,'Arme seitlich auf Schulterhöhe, große ruhige Kreise erst vorwärts, dann rückwärts. Schultern bleiben locker.','warm','gentle',['Schulter'],'Kleinere Kreise, Arme etwas tiefer halten.','Die Schultern vor Schlagarbeit durchbewegen – sehr geringe Belastung.'],
 ['bx-pendel','Schulterpendel','Schulter','reps',12,1,'Vorgebeugt, eine Hand stützt auf dem Tisch, der andere Arm hängt locker. Kleine Kreise und Pendel vor/zurück aus dem Körper heraus.','mob','gentle',['Schulter'],'Noch kleinere Bewegung, Arm ganz locker hängen lassen.','Sanftes Mobilisieren der Schulter zum Warmwerden oder zwischendurch.'],
 ['bx-trunk','Rumpfrotation im Stand','Wirbelsäule','reps',12,0,'Füße schulterbreit, Stab oder Arme vor der Brust. Oberkörper abwechselnd drehen, das Becken bleibt ruhig.','warm','gentle',['Wirbelsäule'],'Kleinerer Drehwinkel, Arme vor der Brust verschränken.','Bereitet die Drehbewegung für Schläge vor.'],
 ['bx-hipopen','Hüftkreise im Stand','Hüfte','reps',8,1,'Am Halt festhalten, Knie hoch ziehen und in großem Kreis nach außen führen, dann zurück. Oberkörper ruhig.','warm','gentle',['Hüfte'],'Kleinere Kreise, Knie weniger hoch.','Hüfte wird bei Fußarbeit und Rotation viel gebraucht.'],
 ['bx-wristc','Handgelenke kreisen und beugen','Handgelenk','reps',10,0,'Hände locker zur Faust, Handgelenke in beide Richtungen kreisen, danach beugen und strecken – nur im schmerzfreien Bereich.','warm','gentle',['Handgelenk'],'Kleinere Kreise, Hände im Wechsel schütteln.','Die Handgelenke tragen den Schlagstoß – kurz mobilisieren, bevor die Bandagen drum kommen.'],
 ['bx-neckroll','Nackenhalbkreise mit Kinn-Rückzug','Nacken','reps',8,0,'Aufrecht sitzen, Kinn leicht zurückziehen, dann das Ohr langsam zur Schulter neigen, im Wechsel. Kein Druck mit der Hand.','mob','gentle',['Nacken'],'Nur Kinn-Rückzug, ohne Seitneigung.','Beim Konzentrieren auf die Deckung spannt der Nacken schnell an.'],
 ['bx-shake','Auslockern und ruhig atmen','Wirbelsäule','hold',60,0,'Locker stehen, Arme und Beine ausschütteln, dann 10 ruhige Atemzüge: 4 s ein, 6 s aus.','cool','gentle',['Wirbelsäule'],'Im Sitzen atmen, nur Arme ausschütteln.','Runterfahren nach dem Training.'],
 ['bx-bander','Band-Außenrotation','Schulter','reps',12,1,'Ellbogen an die Rippen (Handtuch dazwischen), Band in der Hand. Unterarm langsam nach außen drehen, 2 s zurück.','kraft','moderate',['Schulter'],'Leichteres Band oder nur die Bewegung ohne Band.','Stabilisiert die Schulter – Gegenspieler zur Schlagbewegung.'],
 ['bx-wallslide','Wand-Gleiten','Schulter','reps',10,0,'Unterarme an der Wand, Schulterblätter nach vorne schieben, Arme langsam nach oben gleiten lassen und zurück.','kraft','moderate',['Schulter'],'Weniger hoch gleiten, Füße näher an die Wand.','Schulterblattkontrolle für viele Schlagwiederholungen.'],
 ['bx-row','Rudern mit Band','Schulter','reps',12,0,'Band auf Brusthöhe befestigt, Ellbogen nah am Körper, Schulterblätter zusammenziehen, 2 s zurück.','kraft','moderate',['Schulter'],'Weniger Bandspannung.','Zugbewegungen gleichen die vielen Druck- und Schlagbewegungen aus.'],
 ['bx-pushup','Liegestütz, kontrolliert','Schulter','reps',8,0,'Körper in einer Linie, Ellbogen etwa 45° zum Körper, Brust fast bis zum Boden, kontrolliert hochdrücken.','kraft','moderate',['Schulter','Handgelenk'],'Auf den Knien oder Hände erhöht (Bank, Wand).','Druckkraft und Schultergürtel – Basis für Schlagkraft.'],
 ['bx-pallof','Pallof Press','Wirbelsäule','hold',30,1,'Band seitlich auf Brusthöhe, beide Hände vor der Brust, Arme ausstrecken und gegen die Drehung halten, ruhig atmen.','kraft','gentle',['Wirbelsäule'],'Weniger Bandspannung, kürzer halten.','Rumpfstabilität: Kraft aus den Beinen sicher bis in die Hand bringen.'],
 ['bx-plank','Unterarmstütz','Wirbelsäule','hold',30,0,'Ellbogen unter den Schultern, Körper in einer Linie, Bauch und Gesäß anspannen, ruhig weiteratmen.','kraft','moderate',['Schulter','Wirbelsäule'],'Auf den Knien oder Hände erhöht.','Rumpfspannung für Schläge und Ausweichbewegungen.'],
 ['bx-bridge','Hüftheben','Hüfte','reps',12,0,'Rückenlage, Füße aufgestellt, Becken heben, oben 1–2 s halten, langsam senken.','kraft','gentle',['Hüfte'],'Ohne Haltezeit oben.','Kräftiges Gesäß bringt Schlagkraft aus dem Boden.'],
 ['bx-calfraise','Einbeiniges Wadenheben','Sprunggelenk','reps',12,1,'An der Wand festhalten, auf den Ballen hochdrücken, 1 s oben, langsam absenken.','kraft','gentle',['Sprunggelenk'],'Beidbeinig ausführen.','Waden tragen die Fußarbeit und das Seilspringen.'],
 ['bx-latlunge','Seitlicher Ausfallschritt','Hüfte','reps',8,1,'Großer Schritt zur Seite, Gesäß nach hinten, Knie folgen den Zehen, Brust aufrecht; kräftig zurückdrücken.','kraft','moderate',['Hüfte','Knie & Oberschenkel'],'Kleinerer Schritt, weniger tief.','Seitliche Beinkraft für Fußarbeit und Ausweichen.'],
 ['bx-foot','Fußarbeit-Muster','Sprunggelenk','hold',90,0,'An einer Linie: Schritt vor, zurück, seitlich, seitlich – Füße kreuzen nicht, Gewicht auf dem Ballen, Knie leicht gebeugt. Tempo langsam steigern.','speed','gentle',['Sprunggelenk'],'Langsamer, ohne Armbewegung.','Fußarbeit ist die Basis im Boxen – Rhythmus und Gleichgewicht.'],
 ['bx-rope','Seilspringen, locker','Sprunggelenk','hold',120,0,'Kleine Sprünge auf dem Ballen, das Seil aus den Handgelenken drehen, Ellbogen nah am Körper. Bei Ermüdung kurz Pause.','speed','moderate',['Sprunggelenk','Knie & Oberschenkel'],'Ohne Seil hüpfen oder 20 s springen, 20 s Pause.','Rhythmus, Koordination und Ausdauer der Waden.'],
 ['bx-slip','Ausweich-Linie (Slip)','Wirbelsäule','reps',10,0,'Gummiband oder Seil auf Kopfhöhe spannen. Im Wechsel links und rechts darunter wegducken: Knie beugen, Rücken lang.','speed','moderate',['Knie & Oberschenkel','Wirbelsäule'],'Höhere Linie, kleinere Bewegung.','Kopfbewegung und Beine koordinieren.'],
 ['bx-jab','Schnelle Jabs, locker','Schulter','hold',30,0,'Aufrechte Grundstellung, schnelle lockere Jab-Cross-Folgen, Schultern entspannt, jedes Mal zurück in die Deckung. Danach 30 s Pause.','speed','moderate',['Schulter'],'Halbes Tempo, nur Jab.','Schnelligkeit kommt aus Entspannung und sauberer Technik.'],
 ['bx-ballwall','Tennisball-Wandwurf','Handgelenk','reps',20,0,'Aus 1,5–2 m den Ball abwechselnd mit rechts und links an die Wand werfen und fangen. Distanz verkürzen, wenn es leichtfällt.','speed','gentle',['Handgelenk'],'Größerer Ball oder weniger Abstand.','Hand-Auge-Koordination und Reaktion.'],
 ['bx-shadow','Schattenboxen, locker','Schulter','hold',120,0,'Zwei Minuten locker in Grundstellung: Jab-Cross mit halber Geschwindigkeit, Fokus auf Fußarbeit und Atmung.','warm','moderate',['Schulter','Wirbelsäule'],'Nur Fußarbeit ohne Schläge.','Aufwärmen mit dem tatsächlichen Bewegungsmuster.']];
const CATS={mob:'Mobilität',kraft:'Kraft',speed:'Schnelligkeit & Koordination',warm:'Aufwärmen',cool:'Cooldown'};
const INTR={gentle:0,moderate:1,intense:2};
for(const x of X){if(DR[x[0]])continue;const d=[x[0],x[1],x[2],x[3],x[4],x[5],[],x[6]];DRILLS.push(d);DR[x[0]]=d;A.META[x[0]]={cat:x[7],int:x[8],loads:x[9],easier:x[10],why:x[11]}}
// Vorhandene Übungen: Nutzen für die Begründung
const WHY={calf:'Waden und Achillessehne tragen bei Lauf-, Sprung- und Fußarbeit viel Last.',soleus:'Der tiefe Wadenmuskel arbeitet bei jedem Schritt mit.',k2w:'Bewegliche Sprunggelenke helfen bei Schritten, Landungen und tiefer Hocke.',couch:'Die Hüftbeuger verkürzen bei vielen Sportarten und beim Sitzen.',lunge:'Dehnt die Hüftbeuger – wichtig bei Beinarbeit und langem Sitzen.',ham:'Die Beinrückseite wird bei Sprint, Rad und Beinkraft stark gefordert.',pigeon:'Öffnet die Hüfte nach außen und entlastet den unteren Rücken.',swingf:'Dynamisches Lockern der Beinrückseite.',swings:'Dynamisches Lockern von Adduktoren und Hüfte.',tspine:'Die Brustwirbelsäule bleibt bei Zug-, Druck- und Rotationssport oft steif.',catcow:'Sanftes Mobilisieren der gesamten Wirbelsäule.',book:'Rotation der Brustwirbelsäule – gut nach Rumpf- und Schlagarbeit.',child:'Entspannt Rücken und Schultern, passt nach dem Training.',door:'Die Brustmuskulatur wird bei Druckbewegungen kurz – Dehnung öffnet die Schultern nach vorne.',lat:'Der Latissimus begrenzt oft die Schulterbeweglichkeit über Kopf.',angel:'Hält die Schultern in Überkopf-Positionen beweglich.',sleeper:'Beweglichkeit der Schulter-Innenrotation, wichtig bei Wurf- und Schwimmschultern.',pf:'Die Fußrist-Dehnung hilft bei Kraul- und Sprungbelastung.',neck:'Der Nacken verspannt bei Konzentration und Deckungshaltung schnell.',wrist:'Handgelenke werden bei Stützen, Klettern und Schlagen beansprucht.',balance:'Einbeinstand schult das Sprunggelenk gegen Umknicken.',frog:'Öffnet die Adduktoren – wichtig bei Seitwärtsbewegungen.',quad:'Der Oberschenkel-Strecker wird bei Laufen, Rad und Ski viel gebraucht.','9090':'Hüftrotation ist Grundlage für viele Bewegungen von Tanz bis Boxen.',disloc:'Mobilisiert die Schultern in großem Radius.',wgs:'Ganzkörper-Mobilisation für Hüfte und Brustwirbelsäule.'};
const whyOf=(id)=>(A.META[id]&&A.META[id].why)||WHY[id]||'Passt zu deinen letzten Einheiten.';

// Routinen
const RT=[['bx-warm','Boxen: Aufwärmen','ca. 8 min vor dem Training',['bx-armcirc','bx-trunk','bx-hipopen','bx-wristc','bx-pendel','bx-rope','bx-shadow']],
 ['bx-cool','Boxen: Cooldown','ruhig runterfahren – Schultern und Rücken',['bx-shake','child','door','neck','pigeon','bx-thor']],
 ['bx-mob','Boxen: Mobility','BWS, Schulter, Hüfte, Handgelenk',['bx-thor','book','9090','couch','bx-wristc','bx-neckroll']],
 ['bx-kraft','Boxen: Kraft kompakt','Schulterstabilität und Rumpf',['bx-bander','bx-wallslide','bx-row','bx-pallof','bx-plank','bx-bridge','bx-calfraise']],
 ['bx-speed','Boxen: Schnelligkeit & Koordination','Fußarbeit, Rhythmus, Reaktion',['bx-foot','bx-slip','bx-ballwall','bx-jab','bx-rope']]];
for(const r of RT)if(!ROUTINES.some(q=>q[0]===r[0]))ROUTINES.push(r);

/* Sicherheitsfilter auch für die vorhandenen Routinen und den Tagesplan: Übungen, die aktive Beschwerden belasten, fallen heraus */
try{if(typeof routineSteps==='function'){const _rs=routineSteps;routineSteps=function(id){const st=_rs.apply(this,arguments);if(!Array.isArray(st))return st;
  const keep=st.filter(s=>A.safe(s.d).show);if(keep.length)return keep;
  const fb=['catcow','child','book','bx-shake'].filter(d=>DR[d]&&A.safe(d).show);return fb.flatMap(d=>(DR[d][5]?['links','rechts']:['']).map(side=>({d,side})))}}}catch(e){A.warn(e,'mobplus-routine')}

/* ------------------------------------------------------------------ 2. Vorschlags-Engine */
const MAP={
 box:[['bx-thor',1],['bx-armcirc',.8],['bx-wristc',.9],['bx-neckroll',.7],['neck',.5],['wrist',.6],['bx-hipopen',.7],['book',.6],['k2w',.5],['door',.5],['bx-pendel',.7],['bx-shake',.5],['child',.5]],
 lauf:[['calf',1],['soleus',.8],['couch',.9],['ham',.8],['pigeon',.6],['k2w',.7],['swingf',.5]],
 rad:[['couch',1],['lunge',.8],['ham',.8],['pigeon',.7],['tspine',.8],['catcow',.6],['neck',.6]],
 swim:[['sleeper',.8],['angel',.9],['door',.8],['lat',.8],['pf',.7],['tspine',.8]],
 kraft:[['tspine',.7],['book',.6],['door',.6],['couch',.6],['9090',.6],['pigeon',.5],['lat',.6],['child',.5]],
 fuss:[['frog',.8],['couch',.7],['ham',.8],['k2w',.7],['swings',.6],['balance',.6],['quad',.6]],
 skate:[['k2w',.8],['calf',.8],['balance',.7],['wrist',.6],['lunge',.6]],
 tanz:[['frog',.7],['9090',.8],['pigeon',.7],['catcow',.6],['pf',.7]],
 klettern:[['wrist',1],['door',.8],['lat',.8],['tspine',.7],['neck',.5],['frog',.5]],
 hiit:[['calf',.8],['soleus',.6],['k2w',.6],['couch',.6],['lunge',.5]],
 wandern:[['calf',.8],['quad',.8],['couch',.6],['pigeon',.5]],
 ski:[['quad',.8],['couch',.8],['ham',.7],['pigeon',.6]],
 tennis:[['wrist',.7],['tspine',.7],['door',.6],['neck',.5],['k2w',.5],['frog',.4]]};
const SPORT_MOD={box:'boxen',lauf:'run',rad:'bike',swim:'swim',fuss:'foot',skate:'skate',tanz:'dance'};
const sportHidden=(k)=>SPORT_MOD[k]&&A.isHidden(SPORT_MOD[k]);
const MORNING=['catcow','book','9090','couch','k2w'];

const estMin=(id)=>{const d=DR[id];if(!d)return 1;const per=d[5]?2:1;const s=(d[3]==='hold'?d[4]:d[4]*4)*per+10;return Math.max(1,Math.round(s/60*2)/2)};
const doseTxt=(id)=>{const d=DR[id];if(!d)return'';const side=d[5]?' pro Seite':'';return d[3]==='hold'?(d[4]>=60&&d[4]%30===0?`${A.de(d[4]/60,1)} min`:`${d[4]} s`)+side:`${d[4]} Wdh.${side}`};

function feed(){return A.list('mobSug')}
function status(id,t,perWeek){let sup=null;
  for(const f of feed()){if(f.drill!==id)continue;const age=A.dd(t,f.date);
    if(f.act==='irrelevant'&&age<90)return{sup:'nicht relevant'};
    if(f.act==='skip'&&age<1)sup='heute übersprungen';
    if(f.act==='done'&&age<(perWeek>=3?2:4))sup='kürzlich erledigt'}
  if(!sup)for(const s of A.list('mobSessions')){if(!(s.drills||[]).includes(id))continue;const age=A.dd(t,s.date);if(age>=0&&age<(perWeek>=3?2:3)){sup='kürzlich geübt';break}}
  return{sup}}
function skipFactor(id,t){const n=feed().filter(f=>f.drill===id&&f.act==='skip'&&A.dd(t,f.date)<14).length;return Math.max(.35,1-.25*n)}
function sportFactor(sk,t){const n=feed().filter(f=>f.sport===sk&&f.act==='irrelevant'&&A.dd(t,f.date)<60).length;return n>=4?.3:n>=2?.5:1}
function lastDone(id,t){let best=null;for(const f of feed())if(f.drill===id&&f.act==='done'&&(!best||f.date>best))best=f.date;for(const s of A.list('mobSessions'))if((s.drills||[]).includes(id)&&(!best||s.date>best))best=s.date;return best?A.dd(t,best):999}

function recState(){const t=A.today();let low=false,hard=false,why=[];
  try{if(typeof readiness==='function'){const R=readiness();if(R&&R.hasVitals&&R.score<45){low=true;why.push(`Readiness ${R.score}/100`)}}}catch(_){}
  const b=A.boxSessions().filter(s=>A.dd(t,s.date)<=1&&A.dd(t,s.date)>=0);
  if(b.some(s=>(s.rpe||0)>=8||(s.secs||[]).some(x=>x.k==='spar'&&x.min>0))){hard=true;why.push('intensives Boxen in den letzten 24 h')}
  try{const n=A.list('sets').filter(s=>A.dd(t,s.date)===0||A.dd(t,s.date)===1).length;if(n>=24){hard=true;why.push('viel Krafttraining in den letzten 24 h')}}catch(_){}
  return{low,hard,why,boxedToday:A.boxSessions().some(s=>s.date===t)}}

function doneToday(scope){const t=A.today();return feed().filter(f=>f.act==='done'&&f.date===t&&(scope==='box'?f.scope==='box':f.scope!=='box')).length}

function stats(){const S4=A.sportStats(28);const arr=Object.entries(S4.sports).map(([k,o])=>({k,...o,label:A.SPORTS[k]||k})).sort((a,b)=>b.n-a.n);return{S4,arr,perWeek:S4.total/4}}

// → {items:[{id,why,note,sport}], info:{...}}
function suggestMob(){const t=A.today();const {S4,arr}=stats();const rs=recState();const nmax=Math.max(2,Math.min(4,2+(S4.total>=16?1:0)+(S4.total>=28?1:0)));
  const left=nmax-doneToday('mob');const info={basis:arr.slice(0,5).map(x=>`${x.label} ${x.n}×`),rs,nmax,generic:false,restDay:false,hidden:0};
  if(left<=0){info.restDay=true;return{items:[],info}}
  const score={},why={},prim={};
  for(const o of arr){if(sportHidden(o.k))continue;const m=MAP[o.k];if(!m)continue;const w=Math.max(.35,Math.min(1.6,.35+o.perWeek*.45))*(o.daysAgo<=7?1:o.daysAgo<=14?.7:.45)*sportFactor(o.k,t);
    for(const[id,iw]of m){if(!DR[id])continue;const s=w*iw;score[id]=(score[id]||0)+s;(why[id]=why[id]||[]).push({k:o.k,n:o.n,perWeek:o.perWeek,s});if(!prim[id]||s>prim[id].s)prim[id]={k:o.k,s}}}
  let generic=false;if(!Object.keys(score).length){generic=true;info.generic=true;for(const id of MORNING){score[id]=1;prim[id]={k:'basis',s:1};why[id]=[]}}
  const cap=rs.low?0:1;const items=[];const regionN={};let mins=0;
  const order=Object.keys(score).map(id=>({id,s:score[id]*skipFactor(id,t)})).sort((a,b)=>b.s-a.s||(a.id<b.id?-1:1));
  for(const{id}of order){if(items.length>=left)break;
    const st=status(id,t,stats().perWeek);if(st.sup)continue;
    const sf=A.safe(id);if(!sf.show){info.hidden++;continue}
    if(INTR[A.intOf(id)]>cap)continue;
    const reg=DR[id][2];if((regionN[reg]||0)>=2)continue;const em=estMin(id);if(mins+em>15&&items.length)continue;
    regionN[reg]=(regionN[reg]||0)+1;mins+=em;
    items.push({id,sport:prim[id].k,why:generic?'Allgemeine Grundübung – es sind noch keine Einheiten der letzten 4 Wochen erfasst. Sobald du trainierst, passe ich die Vorschläge an.':whyLine(id,why[id]),note:sf.note})}
  info.mins=mins;return{items,info}}
function whyLine(id,list){const top=list.slice().sort((a,b)=>b.s-a.s)[0];if(!top)return whyOf(id);
  const others=list.filter(x=>x.k!==top.k).sort((a,b)=>b.s-a.s).slice(0,1);
  const base=`${A.SPORTS[top.k]||top.k}: ${top.n}× in 4 Wochen${top.perWeek>=1.5?' (häufig)':''}. ${whyOf(id)}`;
  return others.length?base+` Passt auch zu ${A.SPORTS[others[0].k]||others[0].k}.`:base}

/* Boxen-Plan: Routine für heute + je Kategorie wenige Übungen, gewählt nach Häufigkeit, Anstrengung, Erholung und Rückmeldungen */
function boxPlan(){const t=A.today();const sess=A.boxSessions();const n28=sess.filter(s=>A.dd(t,s.date)<28&&A.dd(t,s.date)>=0);const pw=n28.length/4;
  const rp=n28.filter(s=>s.rpe).slice(0,3);const rpeAvg=rp.length?rp.reduce((a,s)=>a+s.rpe,0)/rp.length:null;const rs=recState();const out={pw,n28:n28.length,rpeAvg,rs,groups:[],notes:[],routine:null};
  if(rs.boxedToday)out.routine={id:'bx-cool',why:'Du warst heute beim Boxen – ein ruhiger Cooldown hilft beim Runterfahren.'};
  else out.routine={id:'bx-warm',why:'Kurzes Aufwärmen vor dem Training: Schultern, Rumpf, Handgelenke und Fußarbeit.'};
  const hold=rs.low||rs.hard||(rpeAvg!=null&&rpeAvg>=8.5);
  if(hold)out.notes.push(`Heute eher Erholung${rs.why.length?' ('+rs.why.join(', ')+')':rpeAvg>=8.5?' (zuletzt sehr anstrengend)':''}: nur Mobilität und sanfte Übungen, keine zusätzliche Kraft- oder Schnelligkeitsarbeit.`);
  if(n28.length===0)out.notes.push('Noch keine Boxeinheit erfasst – die Vorschläge sind ein behutsamer Einstieg. Mit mehr Einheiten wird es gezielter.');
  else if(pw<1)out.notes.push('Du boxt bisher seltener als einmal pro Woche: Kurz und locker reicht – ein bis zwei Kraftübungen genügen.');
  else if(pw>=3)out.notes.push('Du boxt häufig. Plane Mobilität regelmäßig ein und lass Kraft/Schnelligkeit an erholten Tagen laufen.');
  const cap=hold?0:(pw>=2.5?1:1);const want={mob:2,kraft:hold?0:(pw<1?1:2),speed:hold||pw<1?0:1};
  let hiddenN=0;
  for(const cat of ['mob','kraft','speed']){const k=want[cat];if(!k)continue;
    const pool=Object.keys(A.META).filter(id=>A.META[id].cat===cat||(cat==='mob'&&A.META[id].cat==='warm'&&id!=='bx-shadow'&&id!=='bx-rope')).filter(id=>DR[id]);
    const cand=[];for(const id of pool){const st=status(id,t,pw);if(st.sup)continue;const sf=A.safe(id);if(!sf.show){hiddenN++;continue}if(INTR[A.intOf(id)]>cap&&!(cat==='speed'&&!hold))continue;cand.push({id,sf,age:lastDone(id,t)*skipFactor(id,t)})}
    cand.sort((a,b)=>b.age-a.age||(a.id<b.id?-1:1));
    const items=cand.slice(0,k).map(c=>({id:c.id,note:c.sf.note,why:whyOf(c.id),sport:'box'}));if(items.length)out.groups.push({cat,label:CATS[cat],items})}
  out.hidden=hiddenN;return out}

/* ------------------------------------------------------------------ Karten & Aktionen */
const pillCls=(id)=>({gentle:'ok',moderate:'info',intense:'warn'}[A.intOf(id)]);
const intTxt=(id)=>({gentle:'sanft',moderate:'mittel',intense:'intensiv'}[A.intOf(id)]);
function card(it,scope){const d=DR[it.id];if(!d)return'';const m=A.META[it.id]||{};
  return`<div class="item" style="align-items:flex-start;flex-wrap:wrap"><div class="main" style="flex:1 1 220px"><div class="t">${E(d[1])} <span class="pill mute">${E(d[2])}</span> <span class="pill ${pillCls(it.id)}">${intTxt(it.id)}</span></div>
    <div class="small">${E(doseTxt(it.id))} · ca. ${A.de(estMin(it.id),1)} min</div>
    <div class="small mute">Warum: ${E(it.why)}</div>
    ${it.note?`<div class="small" style="color:var(--warn)">${E(it.note)}</div>`:''}
    <details data-keep="1"><summary>Anleitung</summary><div class="small">${E(d[7])}${m.easier?`<br><strong>Leichter:</strong> ${E(m.easier)}`:''}${m.cat==='kraft'||m.cat==='speed'?'<br><span class="mute">Bei Schmerzen abbrechen – nur im schmerzfreien Bereich.</span>':''}</div></details></div>
    <div class="row" style="gap:6px"><button class="sm primary" data-mobone="${E(it.id)}">▶ Starten</button><button class="sm" data-apx="sgdone" data-v="${E(it.id)}|${E(it.sport)}|${scope}">✓ Erledigt</button><button class="sm ghost" data-apx="sgskip" data-v="${E(it.id)}|${E(it.sport)}|${scope}">Überspringen</button><button class="sm ghost" data-apx="sgnope" data-v="${E(it.id)}|${E(it.sport)}|${scope}">Nicht relevant</button></div></div>`}
function fb(el,act,msg){const[id,sport,scope]=el.dataset.v.split('|');A.arr('mobSug').push({id:A.uid(),date:A.today(),t:Date.now(),drill:id,sport,scope,act});
  // Liste klein halten: Einträge älter als 120 Tage verwerfen
  S.mobSug=A.list('mobSug').filter(f=>A.dd(A.today(),f.date)<120);A.save(msg)}
A.action('sgdone',(el)=>fb(el,'done','Als erledigt markiert'));
A.action('sgskip',(el)=>fb(el,'skip','Übersprungen – heute nicht mehr vorgeschlagen'));
A.action('sgnope',(el)=>fb(el,'irrelevant','Okay – diese Übung kommt vorerst nicht mehr'));
A.action('sgundo',()=>{const L=A.list('mobSug').slice().sort((a,b)=>(a.t||0)-(b.t||0));const last=L.pop();if(!last)return;S.mobSug=A.list('mobSug').filter(f=>f.id!==last.id);A.save('Rückmeldung zurückgenommen')});
A.action('sgreset',()=>{S.mobSug=[];A.save('Rückmeldungen zurückgesetzt')});

function mobPanel(){const {items,info}=suggestMob();
  const basis=info.basis.length?`Grundlage: deine letzten 4 Wochen – ${info.basis.join(', ')}.`:'Noch keine Einheiten der letzten 4 Wochen erfasst.';
  const fbN=A.list('mobSug').length;
  return`<section class="panel" id="apxMobSug"><div class="row between"><h2>Vorschläge für dich</h2>${fbN?`<button class="sm ghost" data-apx="sgundo" title="Letzte Rückmeldung zurücknehmen">↶</button>`:''}</div>
    <p class="small mute">${E(basis)} Je häufiger eine Sportart vorkommt, desto gezielter und öfter erscheinen passende Übungen. Deine Rückmeldungen steuern künftige Vorschläge. Unterstützend – keine medizinische Bewertung.</p>
    ${info.rs.low||info.rs.hard?`<p class="small"><span class="pill warn">Erholung</span> Heute nur sanfte Übungen${info.rs.why.length?' ('+E(info.rs.why.join(', '))+')':''}.</p>`:''}
    ${info.restDay?'<p class="small"><span class="pill ok">Für heute reicht es</span> Du hast heute schon genug erledigt – Ruhe gehört zum Training dazu.</p>':''}
    ${items.length?`<div class="list">${items.map(i=>card(i,'mob')).join('')}</div>`:(info.restDay?'':'<p class="small mute">Gerade nichts Neues vorzuschlagen – alles Passende wurde kürzlich geübt oder übersprungen.</p>')}
    ${info.hidden?`<p class="small mute">${info.hidden} Übung${info.hidden>1?'en':''} ausgeblendet, weil sie eingetragene Beschwerden belasten könnte${info.hidden>1?'n':''}.</p>`:''}
    ${fbN?`<p class="small mute"><button class="sm ghost" data-apx="sgreset">Rückmeldungen zurücksetzen</button></p>`:''}</section>`}

A.companionPanel=(scope)=>{if(scope!=='box')return mobPanel();const P=boxPlan();const R=P.routine&&ROUTINES.find(r=>r[0]===P.routine.id);
  const basis=P.n28?`${P.n28} Boxeinheit${P.n28>1?'en':''} in 4 Wochen (≈ ${A.de(P.pw,1)} pro Woche)${P.rpeAvg!=null?`, zuletzt Ø Anstrengung ${A.de(P.rpeAvg,1)}/10`:''}`:'noch keine Boxeinheit erfasst';
  const stance=A.stanceTxt();
  return`<section class="panel" id="apxBoxComp"><h2>Boxen-Companion</h2>
    <p class="small mute">Basis: ${E(basis)}.${stance?` Auslage: ${E(stance)}.`:''} Die Vorschläge passen sich an Häufigkeit, Verlauf, Erholung, Beschwerden und deine Rückmeldungen an – sie ersetzen keine Trainer- oder Arztbeurteilung.</p>
    ${P.notes.map(n=>`<p class="small"><span class="pill info">Hinweis</span> ${E(n)}</p>`).join('')}
    ${R?`<div class="item"><div class="main"><div class="t">${E(R[1])} <span class="pill info">für heute</span></div><div class="small mute">${E(P.routine.why)} · ca. ${routineMin(R[0])} min</div></div><button class="primary" data-mobstart="${R[0]}">Starten</button></div>`:''}
    ${P.groups.map(g=>`<span class="eyebrow">${E(g.label)}</span><div class="list">${g.items.map(i=>card(i,'box')).join('')}</div>`).join('')}
    ${!P.groups.length?'<p class="small mute">Heute keine zusätzlichen Einzelübungen – Erholung ist Teil des Plans.</p>':''}
    ${P.hidden?`<p class="small mute">${P.hidden} Übung${P.hidden>1?'en':''} ausgeblendet, weil sie eingetragene Beschwerden belasten könnte${P.hidden>1?'n':''}. Bei starken, zunehmenden oder anhaltenden Beschwerden: Training anpassen und ärztlichen Rat einholen.</p>`:''}
    <span class="eyebrow">Boxen-Routinen</span><div class="tiles">${RT.map(r=>`<button class="tile" data-mobstart="${r[0]}"><b>${E(r[1].replace('Boxen: ',''))}</b><span>${E(r[2])} · ca. ${routineMin(r[0])} min</span></button>`).join('')}</div></section>`};

/* Mobility-Bereich: Vorschlagsprogramm vor den Routinen einfügen; Boxen-Routinen verschwinden, wenn Boxen ausgeblendet ist */
{const _m=VIEWS.mob;VIEWS.mob=function(){let kept=null;if(A.isHidden('boxen')){kept=ROUTINES.slice();const f=ROUTINES.filter(r=>!/^bx-/.test(r[0]));ROUTINES.splice(0,ROUTINES.length,...f)}
  let h;try{h=_m.apply(this,arguments)}finally{if(kept)ROUTINES.splice(0,ROUTINES.length,...kept)}
  let p='';try{p=mobPanel()}catch(e){A.warn(e,'mobplus-panel')}
  const i=h.indexOf('<section class="panel"><h2>Routinen</h2>');return i>=0?h.slice(0,i)+p+h.slice(i):h+p}}
A.mobSuggest=suggestMob;A.boxPlan=boxPlan;
})();
