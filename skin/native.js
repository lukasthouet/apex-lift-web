/* APEX Lift · Android-Brücke (nur aktiv in der installierten App).
   - kein Service Worker: die Dateien liegen ohnehin in der App, ein SW-Cache würde Updates verschlucken
   - Downloads (Backup-ZIP, ICS, Exporte) gehen über das Android-Teilen-Menü statt ins Leere
   - Zurück-Taste: erst Unterseite schließen, dann zu „Training“, dann App minimieren */
(function () {
  'use strict';
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  // Plugins über den Capacitor-Core registrieren (kein Bundler nötig)
  const reg = (window.capacitorExports && window.capacitorExports.registerPlugin) || C.registerPlugin;
  const P = {};
  ['Filesystem', 'Share', 'App', 'Browser'].forEach(n => { try { P[n] = (C.Plugins && C.Plugins[n]) || (reg && reg(n)) } catch (_) {} });
  document.documentElement.classList.add('native');

  // 1) Service Worker aus
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register = () => Promise.resolve({ unregister: () => Promise.resolve(true) });
      navigator.serviceWorker.getRegistrations && navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
    }
  } catch (_) {}

  // 2) Downloads -> Datei speichern + Teilen
  const say = m => { try { toast(m) } catch (_) { console.log(m) } };
  const toB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(blob) });
  async function saveAndShare(href, name) {
    const fs = P.Filesystem, share = P.Share;
    if (!fs) { say('Speichern nicht verfügbar'); return }
    const blob = await (await fetch(href)).blob();
    const data = await toB64(blob);
    const path = 'exports/' + (name || ('apex-lift-' + Date.now()));
    const res = await fs.writeFile({ path, data, directory: 'CACHE', recursive: true });
    if (share) {
      try { await share.share({ title: name, files: [res.uri], dialogTitle: 'Speichern oder senden' }) }
      catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e }
    } else say('Gespeichert: ' + name);
  }
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    const href = this.href || '';
    if (this.hasAttribute('download') && /^(blob:|data:)/.test(href)) {
      saveAndShare(href, this.getAttribute('download')).catch(e => say('Export fehlgeschlagen: ' + (e && e.message || e)));
      return;
    }
    return origClick.call(this);
  };

  // 3) Deep links from Supabase email confirmation and password reset.
  if (P.App && P.App.addListener) {
    P.App.addListener('appUrlOpen', event => {
      const handler = window.ApexLiftAuth && window.ApexLiftAuth.handleRedirect;
      if (handler && event && event.url) handler(event.url);
    });
  }

  // 4) Zurück-Taste
  if (P.App && P.App.addListener) {
    P.App.addListener('backButton', () => {
      const open = document.querySelector('dialog[open]');
      if (open) { if (open.id === 'accountDialog' && window.ApexLiftAuth && window.ApexLiftAuth.requiresAccount) { window.ApexLiftAuth.backToWelcome && window.ApexLiftAuth.backToWelcome(); return } open.close(); return }
      const back = document.querySelector('#view > .back, #view button.back');
      if (back) { back.click(); return }
      let cur = null; try { cur = tab } catch (_) {}
      if (cur && cur !== 'log') { const b = document.querySelector('nav.tabs [data-tab="log"]'); if (b) { b.click(); return } }
      P.App.minimizeApp ? P.App.minimizeApp() : P.App.exitApp();
    });
  }
})();
