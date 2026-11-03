/* APEX Lift · Mobile-Performance
   Gegen Einfrieren und Farbartefakte auf Android:
   - kein backdrop-filter (Blur) auf Touch-Geräten: über dem laufenden 3D-Modell muss die GPU
     den Blur sonst in jedem Frame neu berechnen
   - 3D-Modell zeichnet nur, wenn es sichtbar ist (im Viewport, App im Vordergrund, keine Tastatur)
   - auf Touch-Geräten max. 30 fps und Pixeldichte max. 1,5 */
(function () {
  'use strict';
  const coarse = (() => { try { return matchMedia('(pointer: coarse)').matches } catch (_) { return false } })();
  const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const mobile = coarse || native;
  if (!mobile) return;
  document.documentElement.classList.add('perf-mobile');

  const css = document.createElement('style');
  css.textContent =
    'html.perf-mobile *,html.perf-mobile *::before,html.perf-mobile *::after,html.perf-mobile ::backdrop{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
    'html.perf-mobile header.bar{background:var(--bg)!important}' +
    'html.perf-mobile nav.tabs{background:var(--panel)!important}';
  document.head.appendChild(css);

  if (typeof b3Loop !== 'function' || typeof B3 === 'undefined') return;

  let inView = true, observed = null, io = null;
  const watch = el => {
    if (!('IntersectionObserver' in window) || observed === el) return;
    if (io) io.disconnect();
    io = new IntersectionObserver(entries => { for (const e of entries) inView = e.isIntersecting }, { rootMargin: '40px' });
    io.observe(el); observed = el; inView = true;
  };
  const typing = () => {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable) && a.type !== 'range' && a.type !== 'checkbox';
  };

  const FRAME_MS = 1000 / 30;
  let last = 0, ratioCapped = false;
  const inner = b3Loop;
  b3Loop = function () {
    const c = B3.r && B3.r.domElement;
    if (!c || !c.isConnected) return inner();          // Original beendet die Schleife sauber
    if (!ratioCapped) { ratioCapped = true; try { if (B3.r.getPixelRatio() > 1.5) B3.r.setPixelRatio(1.5) } catch (_) {} }
    watch(c);
    const now = performance.now();
    if (!inView || document.hidden || typing() || now - last < FRAME_MS) { requestAnimationFrame(b3Loop); return }
    last = now;
    inner();
  };
  window.ApexPerf = { status: () => ({ inView, typing: typing(), hidden: document.hidden, wrapped: b3Loop !== inner }) };
})();
