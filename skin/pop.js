/* APEX Lift · Pop-Skin: Sportbilder für Kacheln und Hero-Banner.
   Greift nicht in die App-Logik ein – beobachtet nur #view und dekoriert, was gerendert wurde. */
(function () {
  'use strict';
  // Sportart -> [Bild, Farbe 1, Farbe 2]
  const ART = {
    run: ['run', '#ff4f7b', '#ff9a3d'], sprint: ['sprint', '#ffd23f', '#ff6a1a'],
    bike: ['bike', '#8b5cff', '#ff4fd8'], swim: ['swim', '#2ee6d6', '#2f6bff'],
    tri: ['tri', '#2f7bff', '#ff4f7b'], foot: ['foot', '#16b85a', '#c7f54a'],
    skate: ['skate', '#ff4fd8', '#ffd23f'], dance: ['dance', '#b44dff', '#ff4f7b'],
    sail: ['sail', '#2fb8ff', '#7fd8ff'], winter: ['winter', '#7fd8ff', '#5b5bff'],
    berg: ['berg', '#ff8a3d', '#7a3dff'], homegym: ['homegym', '#ff4f7b', '#8b5cff'],
    cardio: ['cardio', '#ff3d5a', '#ffb03d'], mob: ['mob', '#3dffb0', '#22a7d6'],
    grip: ['grip', '#ffb03d', '#ff4f7b'], atem: ['atem', '#5fd3ff', '#8b5cff'],
    balance: ['balance', '#c7f54a', '#2ec7c4']
  };
  const src = k => 'skin/sport/' + ART[k][0] + '.svg';
  const mod = k => { try { return (MODULES || []).find(m => m[0] === k) } catch (_) { return null } };
  const curTab = () => { try { return tab } catch (_) { return null } };

  function decorate() {
    const view = document.getElementById('view');
    if (!view) return;

    // Kacheln
    view.querySelectorAll('.tile[data-tab]').forEach(t => {
      const k = t.dataset.tab;
      if (t.dataset.sub === 'sport' && t.dataset.tab === 'more' && !t.classList.contains('pop-strip')) {
        const pick = ['run', 'bike', 'swim', 'foot', 'skate', 'sail'];
        t.classList.add('pop-strip');
        t.style.removeProperty('border-color');
        t.insertAdjacentHTML('afterbegin', `<div class="strip" aria-hidden="true">${pick.map(p => `<img src="${src(p)}" alt="">`).join('')}</div>`);
        return;
      }
      if (!ART[k] || t.classList.contains('pop')) return;
      t.classList.add('pop');
      t.style.setProperty('--sp', ART[k][1]);
      t.style.setProperty('--sp2', ART[k][2]);
      t.insertAdjacentHTML('afterbegin', `<img class="pop-art" src="${src(k)}" alt="" loading="lazy">`);
    });

    // Hero in der Sportart-Ansicht
    const k = curTab();
    if (ART[k]) {
      document.body.dataset.sport = k;
      document.body.style.setProperty('--sp', ART[k][1]);
      document.body.style.setProperty('--sp2', ART[k][2]);
      if (!view.querySelector(':scope > .pop-hero')) {
        const m = mod(k) || [k, k, ''];
        const hero = document.createElement('div');
        hero.className = 'pop-hero';
        hero.innerHTML = `<img src="${src(k)}" alt=""><h1>${m[1]}</h1>${m[2] ? `<p>${m[2]}</p>` : ''}`;
        const back = view.querySelector(':scope > .back, :scope > button.back');
        back ? back.after(hero) : view.prepend(hero);
        // doppelte Überschrift der App ausblenden
        const h = view.querySelector('section h1');
        if (h && h.textContent.trim().toLowerCase().startsWith(String(m[1]).toLowerCase().slice(0, 4))) h.classList.add('pop-dup');
      }
    } else {
      delete document.body.dataset.sport;
      document.body.style.removeProperty('--sp');
      document.body.style.removeProperty('--sp2');
    }
  }

  let queued = false;
  const schedule = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { decorate() } catch (e) { console.warn('pop-skin', e) } }) };
  function start() {
    const view = document.getElementById('view');
    if (!view) return setTimeout(start, 50);
    new MutationObserver(schedule).observe(view, { childList: true });
    schedule();
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();
