/* ==========================================================================
   Uplink Technology · Home page
   Growing tower and hero cloud.
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, html, reduceMotion, whenOnScreen } = window.Uplink;

  /* ======================================================================
     Growth story: the building gains floors as you scroll (Home)
     ====================================================================== */
  const tower = $('.grow svg.tg');
  const growSteps = $$('.grow-step[data-floors]');
  if (tower && growSteps.length) {
    // Every screen size: the building stays put (CSS sticky). Desktop: the
    // step whose top passes 60% of the screen sets the floors. Phone and
    // tablet: the cards pass over the building, so it grows as soon as the
    // next card peeks in at the bottom, while the building is still in view.
    // The browser reports when a step crosses the line (IntersectionObserver),
    // so nothing is measured on scroll or during page load.
    const wide = window.matchMedia('(min-width: 1100px)');
    const passed = new Set();
    let shown = null;
    // The first pick shows at once: no fade on load (colour fades are not GPU work,
    // and nobody is watching yet). Fades come back two frames later.
    const grow = tower.closest('.grow');
    if (grow) grow.classList.add('no-trans');
    const update = () => {
      let pick = growSteps[0];
      growSteps.forEach((s) => { if (passed.has(s)) pick = s; });
      if (pick === shown) return;
      shown = pick;
      tower.setAttribute('data-floors', pick.dataset.floors);
      growSteps.forEach((s) => { if (s === pick) s.setAttribute('data-active', ''); else s.removeAttribute('data-active'); });
      if (grow && grow.classList.contains('no-trans')) {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => grow.classList.remove('no-trans')));
      }
    };
    let io = null;
    const watch = () => {
      if (io) io.disconnect();
      passed.clear();
      // the watched area runs from far above the screen down to the line,
      // so "intersecting" means the step's top is above the line, even after a fast scroll
      const below = wide.matches ? '-40%' : '-12%';
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) passed.add(en.target); else passed.delete(en.target); });
        update();
      }, { rootMargin: '100000px 0px ' + below + ' 0px' });
      growSteps.forEach((s) => io.observe(s));
    };
    if ('IntersectionObserver' in window) {
      watch();
      wide.addEventListener('change', watch);
    } else {
      update();
    }
  }

  /* ------------------------------------------------------------------
     Hero cloud: shows one cloud app at a time, big and readable. A curved
     line runs from the cloud to that app's tile in the floating tray.
     It steps through the apps on a timer; hovering a tile or a bar
     segment picks one. Reduced motion: no timer, no line animation.
     Phones get the still picture instead (below 600px, compact-cuts.css).
     The animated drawing is its own file (assets/img/hero-office.svg, in the
     stage's data-hero, preloaded on wide screens), so phones never download
     it: screens 600px and wider fetch it, put it in ahead of the dashes'
     layer (svg.ob-over), then start the cloud.
     ------------------------------------------------------------------ */
  const stage = $('.hero-art .stage[data-hero]');
  const heroShown = window.matchMedia('(min-width: 600px)');
  const startCloud = (cloud) => {
    const svg = cloud.ownerSVGElement;
    const APPS = [
      { id: 'mail',   name: 'Email',    state: 'Online',  detail: 'Spam and phishing filtered' },
      { id: 'files',  name: 'Files',    state: 'Synced',  detail: 'OneDrive and Drive backed up' },
      { id: 'meet',   name: 'Meetings', state: 'Ready',   detail: 'Teams and Meet, one-click join' },
      { id: 'chat',   name: 'Chat',     state: 'Online',  detail: 'Every channel watched' },
      { id: 'cal',    name: 'Calendar', state: 'Synced',  detail: 'Shared calendars in step' },
      { id: 'secure', name: 'Sign-in',  state: 'Secured', detail: 'MFA on for every user' }
    ];
    const focus = svg.querySelector('.ob-focus');
    const appText = svg.querySelector('.ob-app');
    const stateText = svg.querySelector('.ob-state');
    const detailText = svg.querySelector('.ob-detail');
    const base = cloud.querySelector('.ob-link-base');
    const flow = cloud.querySelector('.ob-link');
    const end = svg.querySelector('.ob-link-end');
    const START = { x: +(cloud.dataset.sx || 878), y: +(cloud.dataset.sy || 46) };
    const LINK = cloud.dataset.link || 'curve';
    const tile = (id) => svg.querySelector('.ob-tile[data-tile="' + id + '"]');
    const topCentre = (t) => {
      const pts = t.querySelector('.f-t').getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
      return { x: pts.reduce((a, p) => a + p[0], 0) / pts.length, y: pts.reduce((a, p) => a + p[1], 0) / pts.length };
    };
    // The state word is right-aligned, so the dot before it moves with the word's width.
    // The browser reports the new size after its own layout pass (ResizeObserver), so
    // nothing is measured straight after the text changes (that would force a layout).
    // For SVG it reports only the size, so: the word's right edge (its x) minus its width.
    const dot = svg.querySelector('.ob-state-dot');
    if (dot && 'ResizeObserver' in window) {
      const right = +stateText.parentNode.getAttribute('x');
      new ResizeObserver(([en]) => dot.setAttribute('cx', (right - en.contentRect.width - 10).toFixed(1))).observe(stateText.parentNode);
    }
    let index = -1;
    let timer = 0;
    let swap = 0;
    const show = (i) => {
      i = (i + APPS.length) % APPS.length;
      if (i === index) return;
      const first = index < 0;
      index = i;
      const app = APPS[i];
      svg.querySelectorAll('.ob-tile').forEach((t) => t.classList.toggle('is-on', t.dataset.tile === app.id));
      cloud.querySelectorAll('.ob-seg, .ob-pip').forEach((s) => s.classList.toggle('is-on', s.dataset.app === app.id));
      const t = tile(app.id);
      if (t && LINK !== 'none') {
        const p = topCentre(t);
        const dPath = LINK === 'elbow' ? 'M' + START.x + ',' + START.y + ' H' + p.x + ' V' + p.y : 'M' + START.x + ',' + START.y + ' C' + (START.x + 70) + ',' + START.y + ' ' + p.x + ',' + (p.y - 110) + ' ' + p.x + ',' + p.y;
        base.setAttribute('d', dPath);
        flow.setAttribute('d', dPath);
        end.setAttribute('cx', p.x);
        end.setAttribute('cy', p.y);
        const len = base.getTotalLength();
        base.style.strokeDasharray = len;
        base.style.setProperty('--len', len);
        base.classList.remove('is-draw');
        void base.getBoundingClientRect();
        base.classList.add('is-draw');
      }
      const write = () => {
        appText.textContent = app.name.toUpperCase();
        stateText.textContent = app.state.toUpperCase();
        detailText.textContent = app.detail;
        focus.classList.remove('is-out');
      };
      window.clearTimeout(swap);
      if (first || reduceMotion.matches) { write(); return; }
      focus.classList.add('is-out');
      swap = window.setTimeout(write, 180);
    };
    let onScreen = true;
    const stop = () => { window.clearInterval(timer); timer = 0; };
    const start = () => {
      stop();
      if (reduceMotion.matches || document.hidden || !onScreen) return;
      timer = window.setInterval(() => show(index + 1), 3200);
    };
    const pick = (id) => { stop(); show(APPS.findIndex((a) => a.id === id)); };
    svg.querySelectorAll('.ob-tile').forEach((t) => {
      t.addEventListener('pointerenter', () => pick(t.dataset.tile));
      t.addEventListener('pointerleave', start);
    });
    cloud.querySelectorAll('.ob-seg-hit').forEach((h) => {
      h.addEventListener('pointerenter', () => pick(h.dataset.app));
      h.addEventListener('pointerleave', start);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener('change', start);
    // off screen: no timer, and the looping animations pause
    whenOnScreen(svg, (on) => { onScreen = on; if (on) start(); else stop(); });
    whenOnScreen(document.querySelector('svg.ob-over'));   // the moving dashes' own layer (1-hero-flows.svg)
    show(0);
    start();
  };
  const loadHero = () => {
    window.fetch(stage.dataset.hero)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        stage.insertAdjacentHTML('afterbegin', html(text));
        const cloud = $('svg.ob .ob-cloud', stage);
        if (cloud) startCloud(cloud);
      })
      .catch(() => { /* no drawing: the stage stays empty and the page still reads */ });
  };
  if (stage) {
    if (heroShown.matches) loadHero();
    else {
      const later = () => { if (!heroShown.matches) return; heroShown.removeEventListener('change', later); loadHero(); };
      heroShown.addEventListener('change', later);
    }
  }
})();
