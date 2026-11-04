// APEX Lift service worker: cache-first, so the app opens without network
const CACHE='apex-lift-v63';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg',
 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
 './skin/supabase.js','./skin/supabase-config.js','./skin/perf.js','./anatomy-model.wasm','./mob/apley-scratch.webp','./mob/bws-rotation.webp','./mob/deep-squat.webp','./mob/einbeinstand.webp','./mob/fersen-gesaess.webp','./mob/fussstreckung.webp','./mob/halsrotation.webp','./mob/handgelenk-extension.webp','./mob/hueft-aussenrotation.webp','./mob/hueft-innenrotation.webp','./mob/knie-zur-wand.webp','./mob/schulter-aussenrotation.webp','./mob/schulter-innenrotation.webp','./mob/schulterflexion.webp','./mob/seitgraetsche.webp','./mob/sit-and-reach.webp','./mob/straight-leg-raise.webp','./mob/thomas-test.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.hostname.includes('ouraring.com')||u.hostname.endsWith('supabase.co')||u.hostname.includes('googleapis.com'))return; // API calls always live
  e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
    const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;
  }).catch(()=>caches.match('./index.html'))));
});
