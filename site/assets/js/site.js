/* ==========================================================================
   Uplink Technology · site script
   Plain JS, no libraries. Every feature is optional: the pages read and
   work without it (links still navigate, the first service is shown,
   all projects are listed, the full building is drawn).

   Keyboard map (single keys, can be switched off in the shortcuts panel):
     Q / E      previous / next page          all pages
     1 - 6      pick a service                Services page
     ?          open the shortcuts panel      all pages
     Left/Right previous / next project       inside the project pop-up
     Esc        close the open pop-up         native <dialog> behaviour
   Single keys never fire while typing in a field, while a pop-up is open,
   or when Ctrl / Cmd / Alt is held.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- storage (can be unavailable) ------------------------------ */
  const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ } }
  };

  /* ---------- icons used by script-built UI ------------------------------ */
  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M12 8h.01M12 11v6"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>'
  };

  /* ======================================================================
     Toasts
     ====================================================================== */
  const pageToasts = $('.toasts');

  // A modal pop-up makes the rest of the page inert, so while one is open
  // the toast is placed inside it to stay visible and announced.
  function toastRegion() {
    const dlg = document.querySelector('dialog[open]');
    if (!dlg) return pageToasts;
    let region = $(':scope > .toasts', dlg);
    if (!region) {
      region = document.createElement('div');
      region.className = 'toasts';
      region.setAttribute('aria-live', 'polite');
      dlg.append(region);
    }
    return region;
  }

  function toast({ title, text = '', tone = 'ok', timeout = 6000 }) {
    const region = toastRegion();
    if (!region) return;
    const el = document.createElement('div');
    el.className = 'toast' + (tone === 'info' ? ' toast--info' : '');

    const ic = document.createElement('span');
    ic.className = 'toast-ic';
    ic.innerHTML = tone === 'info' ? ICON.info : ICON.check;

    const body = document.createElement('span');
    body.className = 'toast-text';
    const strong = document.createElement('strong');
    strong.textContent = title;
    body.append(strong);
    if (text) {
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = text;
      body.append(span);
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iconbtn';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.innerHTML = ICON.close;

    el.append(ic, body, btn);
    region.append(el);

    let timer = null;
    const leave = () => {
      clearTimeout(timer);
      if (el.dataset.leaving !== undefined) return;
      el.dataset.leaving = '';
      const done = () => el.remove();
      if (reduceMotion.matches) done(); else el.addEventListener('animationend', done, { once: true });
    };
    const arm = () => { clearTimeout(timer); timer = setTimeout(leave, timeout); };
    btn.addEventListener('click', leave);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', arm);
    el.addEventListener('focusin', () => clearTimeout(timer));
    el.addEventListener('focusout', arm);
    arm();
  }

  /* ======================================================================
     Dialogs (native <dialog>: focus is held inside, Esc closes)
     ====================================================================== */
  function openDialog(id, opener) {
    const dlg = document.getElementById(id);
    if (!dlg || dlg.open || typeof dlg.showModal !== 'function') return false;
    dlg._opener = opener || document.activeElement;
    dlg.showModal();
    const first = $('[autofocus]', dlg) || $('input, select, textarea', dlg) || $('[data-close]', dlg);
    if (first) first.focus({ preventScroll: true });
    dlg.scrollTop = 0;
    return true;
  }

  $$('dialog').forEach((dlg) => {
    // click on the dimmed backdrop closes
    let downOnBackdrop = false;
    dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg; });
    dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });
    // return focus to whatever opened it
    dlg.addEventListener('close', () => {
      const back = dlg._opener;
      dlg._opener = null;
      if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
    });
  });

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      if (opener.dataset.open === 'book-dialog') presetService(opener.dataset.service || '');
      if (openDialog(opener.dataset.open, opener)) e.preventDefault();
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) {
      const dlg = closer.closest('dialog');
      if (dlg) dlg.close();
    }
  });

  function presetService(name) {
    const sel = document.getElementById('book-service');
    if (!sel) return;
    const opt = name && Array.from(sel.options).find((o) => o.value === name || o.textContent === name);
    sel.selectedIndex = opt ? opt.index : 0;
  }

  /* ======================================================================
     Keyboard shortcuts
     ====================================================================== */
  const SC_KEY = 'uplink.shortcuts';
  if (store.get(SC_KEY) === 'off') root.dataset.shortcuts = 'off';
  const shortcutsOn = () => root.dataset.shortcuts !== 'off';

  const scToggle = document.getElementById('sc-toggle');
  if (scToggle) {
    scToggle.checked = shortcutsOn();
    scToggle.addEventListener('change', () => {
      if (scToggle.checked) { delete root.dataset.shortcuts; store.set(SC_KEY, 'on'); }
      else { root.dataset.shortcuts = 'off'; store.set(SC_KEY, 'off'); }
      toast({ title: scToggle.checked ? 'Shortcuts on' : 'Shortcuts off', tone: 'info', timeout: 3000 });
    });
  }

  const pageLinks = $$('.tabs [data-page]');
  const currentPage = document.body.dataset.page;

  // one page change at a time, so a fast double press does not skip a page
  let leaving = false;
  window.addEventListener('pageshow', () => { leaving = false; });

  function goPage(step) {
    if (leaving) return;
    leaving = true;
    const i = pageLinks.findIndex((a) => a.dataset.page === currentPage);
    if (i < 0) {
      const hop = $$('.keyhop')[step < 0 ? 0 : 1];
      if (hop) window.location.href = hop.getAttribute('href');
      return;
    }
    const next = pageLinks[(i + step + pageLinks.length) % pageLinks.length];
    window.location.href = next.getAttribute('href');
  }

  function isTyping(el) {
    if (!el || el === document.body) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
    if (el.tagName === 'INPUT') {
      const nonText = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'];
      return !nonText.includes(el.type);
    }
    return false;
  }

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (!shortcutsOn()) return;
    if (isTyping(e.target)) return;
    if (document.querySelector('dialog[open]')) return;

    if (e.key === '?') { e.preventDefault(); openDialog('shortcuts-dialog'); return; }
    if (e.shiftKey) return;

    const k = e.key.toLowerCase();
    if (k === 'q') { e.preventDefault(); goPage(-1); return; }
    if (k === 'e') { e.preventDefault(); goPage(1); return; }
    if (/^[1-9]$/.test(e.key) && picker) {
      const n = Number(e.key) - 1;
      if (n < picker.count) { e.preventDefault(); picker.select(n, { focus: true }); }
    }
  });

  /* ======================================================================
     Section tracker (HUD dots, desktop)
     ====================================================================== */
  const sections = $$('main [data-section]');
  if (sections.length >= 3 && 'IntersectionObserver' in window) {
    const nav = document.createElement('nav');
    nav.className = 'tracker';
    nav.setAttribute('aria-label', 'Sections on this page');
    const ol = document.createElement('ol');
    const links = sections.map((sec) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + sec.id;
      const tip = document.createElement('span');
      tip.className = 'tip';
      tip.textContent = sec.dataset.section;
      a.append(tip);
      li.append(a);
      ol.append(li);
      return a;
    });
    nav.append(ol);
    document.body.append(nav);

    const setActive = (id) => links.forEach((a) => {
      if (a.hash === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    setActive(sections[0].id);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ======================================================================
     Services picker (Services page)
     Every service is an <article data-svc> in the HTML. The tiles show
     one at a time; without script they all stack (see site.css).
     ====================================================================== */
  let picker = null;
  const pickerEl = $('[data-picker]');
  const svcs = pickerEl ? $$('[data-svc]', pickerEl) : [];
  if (svcs.length) {
    const tiles = $$('[data-pick]', pickerEl);
    const live = $('[data-picker-live]', pickerEl);
    let current = Math.max(0, svcs.findIndex((s) => s.classList.contains('is-on')));

    const select = (i, opts = {}) => {
      if (i === current || !svcs[i]) return;
      current = i;
      const name = $('h2', svcs[i]).textContent;
      svcs.forEach((s, j) => s.classList.toggle('is-on', j === i));
      tiles.forEach((t, j) => t.setAttribute('aria-pressed', String(j === i)));
      $$('[data-service-cta]', pickerEl).forEach((b) => { b.dataset.service = name; });
      if (live) live.textContent = name + ' selected';
      if (opts.focus) tiles[i].focus({ preventScroll: true });
      if (opts.hash !== false && window.history && history.replaceState) {
        try { history.replaceState(null, '', '#' + svcs[i].id); } catch (e) { /* ignore */ }
      }
    };

    tiles.forEach((t) => t.addEventListener('click', () => select(Number(t.dataset.pick))));

    const fromHash = () => {
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return -1; }
      return svcs.findIndex((s) => s.id === id);
    };
    const start = fromHash();
    if (start >= 0 && start !== current) {
      select(start, { hash: false });
      pickerEl.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', () => {
      const i = fromHash();
      if (i < 0) return;
      select(i, { hash: false });
      pickerEl.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });

    picker = { select, count: svcs.length };
  }

  /* ======================================================================
     Work: filters + project pop-up
     ====================================================================== */
  // Each card links to its project's <article> further down the page; the
  // pop-up copies that article's text in, so the HTML stays the only source.
  const workGrid = $('[data-work-grid]');
  if (workGrid) {
    const items = $$('[data-tags]', workGrid);
    const cards = items.map((li) => $('a[href^="#"]', li));
    const sources = cards.map((a) => a && document.getElementById(a.hash.slice(1)));
    const filters = $$('[data-filter]');
    const liveCount = $('[data-work-live]');
    const empty = $('[data-work-empty]');

    filters.forEach((btn) => btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let shown = 0;
      items.forEach((li) => {
        const on = f === 'all' || li.dataset.tags.split(' ').includes(f);
        li.hidden = !on;
        if (on) shown += 1;
      });
      if (empty) empty.hidden = shown > 0;
      if (liveCount) liveCount.textContent = 'Showing ' + shown + (shown === 1 ? ' project' : ' projects');
    }));

    const dlg = document.getElementById('case-dialog');
    let open = -1;
    const visible = () => items.map((li, i) => (li.hidden ? -1 : i)).filter((i) => i >= 0);

    const fill = (i) => {
      const src = sources[i];
      if (!src || !dlg) return;
      open = i;
      $$('[data-case-bind]', dlg).forEach((el) => {
        const field = $('[data-case-field="' + el.dataset.caseBind + '"]', src);
        el.textContent = field ? field.textContent : '';
      });
      const im = $('[data-case-img]', dlg), srcImg = $('img', src);
      if (im && srcImg) { im.src = srcImg.getAttribute('src'); im.alt = srcImg.alt; }
      const list = visible();
      const pos = $('[data-case-pos]', dlg);
      if (pos) pos.textContent = (list.indexOf(i) + 1) + ' of ' + list.length;
    };
    const step = (d) => {
      const list = visible();
      if (!list.length) return;
      const at = Math.max(0, list.indexOf(open));
      fill(list[(at + d + list.length) % list.length]);
    };

    cards.forEach((a, i) => {
      if (!a || !sources[i] || !dlg) return;
      a.addEventListener('click', (e) => { e.preventDefault(); fill(i); openDialog('case-dialog', a); });
    });
    if (dlg) {
      $$('[data-case-step]', dlg).forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.caseStep))));
      dlg.addEventListener('keydown', (e) => {
        if (!shortcutsOn() || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      });
    }
  }

  /* ======================================================================
     Forms: inline validation, then a confirmation toast.
     This prototype does not send anything anywhere yet.
     ====================================================================== */
  $$('form[data-validate]').forEach((form) => {
    form.noValidate = true;
    const fields = $$('input, select, textarea', form).filter((el) => el.willValidate);

    const check = (el) => {
      if (el.required && el.value !== '' && el.value.trim() === '') el.setCustomValidity('empty');
      else el.setCustomValidity('');
      const ok = el.checkValidity();
      if (ok) el.removeAttribute('aria-invalid'); else el.setAttribute('aria-invalid', 'true');
      return ok;
    };
    fields.forEach((el) => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) check(el); }));
    fields.forEach((el) => el.addEventListener('blur', () => { if (el.value) check(el); }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const bad = fields.filter((el) => !check(el));
      if (bad.length) { bad[0].focus(); return; }

      const kind = form.dataset.validate;
      const dlg = form.closest('dialog');
      if (dlg) dlg.close();
      form.reset();
      fields.forEach((el) => el.removeAttribute('aria-invalid'));

      if (kind === 'book') {
        toast({ title: 'Check-up requested', text: 'We will email you within one business day to pick a time.' });
      } else if (kind === 'contact') {
        toast({ title: 'Message received', text: 'You are in the queue. We reply within one business day.' });
        const q = $('[data-queue]');
        if (q) q.dataset.state = 'queued';
        const arc = $('[data-queue-arc]');
        if (arc) arc.setAttribute('stroke-dasharray', '330 440');
        $$('[data-queue-text]').forEach((el) => { el.textContent = el.dataset.queueText; });
      }
    });
  });

  /* ======================================================================
     Copy buttons (phone number, email)
     ====================================================================== */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.copy;
      const target = document.getElementById(btn.dataset.copyTarget || '');
      const fallback = () => {
        if (target) {
          const range = document.createRange();
          range.selectNodeContents(target);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        toast({ title: 'Selected', text: 'Copy it with Ctrl+C, or long-press on a phone.', tone: 'info', timeout: 4000 });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          () => toast({ title: 'Copied', text: value, timeout: 3000 }),
          fallback
        );
      } else {
        fallback();
      }
    });
  });

  /* ======================================================================
     Placeholder page: name the page that is missing (soon.html#client-portal)
     ====================================================================== */
  const soonName = $('[data-soon-name]');
  if (soonName) {
    const names = {
      'client-portal': 'The client portal', 'remote-support': 'Remote support', 'system-status': 'System status',
      'careers': 'Careers', 'blog': 'The blog', 'privacy': 'The privacy policy', 'terms': 'The terms of service',
      'accessibility': 'The accessibility statement', 'case-studies': 'The full case studies',
      'windows-10-guide': 'The Windows 10 upgrade guide',
      'security-checklist': 'The security checklist', 'social': 'Our social channels', 'francais': 'The French site'
    };
    const baseTitle = document.title;
    const showName = () => {
      const key = location.hash.slice(1);
      const known = Object.prototype.hasOwnProperty.call(names, key);
      soonName.textContent = known ? names[key] : 'This page';
      document.title = known ? names[key] + ' · Coming soon' : baseTitle;
    };
    showName();
    window.addEventListener('hashchange', showName);
  }

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
    const wide = window.matchMedia('(min-width: 1100px)');
    let shown = null;
    const update = () => {
      const line = window.innerHeight * (wide.matches ? 0.6 : 0.88);
      let pick = growSteps[0];
      growSteps.forEach((s) => { if (s.getBoundingClientRect().top < line) pick = s; });
      if (pick === shown) return;
      shown = pick;
      tower.setAttribute('data-floors', pick.dataset.floors);
      growSteps.forEach((s) => { if (s === pick) s.setAttribute('data-active', ''); else s.removeAttribute('data-active'); });
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => { ticking = false; update(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------
     Hero cloud: shows one cloud app at a time, big and readable. A curved
     line runs from the cloud to that app's tile in the floating tray.
     It steps through the apps on a timer; hovering a tile or a bar
     segment picks one. Reduced motion: no timer, no line animation.
     ------------------------------------------------------------------ */
  const cloud = document.querySelector('svg.ob .ob-cloud');
  const cloudRoot = cloud;
  if (cloud) {
    const svg = cloud.ownerSVGElement;
    const APPS = [
      { id: 'mail',   name: 'Email',    state: 'Online',  detail: 'Spam and phishing filtered' },
      { id: 'files',  name: 'Files',    state: 'Synced',  detail: 'OneDrive and Drive backed up' },
      { id: 'meet',   name: 'Meetings', state: 'Ready',   detail: 'Teams and Meet, one-click join' },
      { id: 'chat',   name: 'Chat',     state: 'Online',  detail: 'Every channel watched' },
      { id: 'cal',    name: 'Calendar', state: 'Synced',  detail: 'Shared calendars in step' },
      { id: 'secure', name: 'Sign-in',  state: 'Secured', detail: 'MFA on for every user' }
    ];
    const svgRoot = cloud.ownerSVGElement;
    const focus = svgRoot.querySelector('.ob-focus');
    const appText = svgRoot.querySelector('.ob-app');
    const stateText = svgRoot.querySelector('.ob-state');
    const detailText = svgRoot.querySelector('.ob-detail');
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
        const sd = svgRoot.querySelector('.ob-state-dot');
        if (sd) { const b = stateText.getBBox(); sd.setAttribute('cx', b.x - 10); }
      };
      window.clearTimeout(swap);
      if (first || reduceMotion.matches) { write(); return; }
      focus.classList.add('is-out');
      swap = window.setTimeout(write, 180);
    };
    const stop = () => { window.clearInterval(timer); timer = 0; };
    const start = () => {
      stop();
      if (reduceMotion.matches || document.hidden) return;
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
    show(0);
    start();
  }

  /* ======================================================================
     Footer: hero-select roster + campus map (every page)
     Each roster tile shows one panel. The panel's data-map names a spot on
     the map (hq, services, industries, company, support, resources,
     follow); the camera flies there and lights it up. The map is drawn
     here in true isometric: screen = ((x-y)·cos30·u, (x+y)·u/2 - z·u).
     ====================================================================== */
  const fc = $('.fc');
  if (fc) {
    const C30 = Math.cos(Math.PI / 6), U = 38;
    const pr = (x, y, z = 0) => [(x - y) * C30 * U, (x + y) * U / 2 - z * U];
    const pts = (a) => a.map((p) => pr(...p).map((n) => n.toFixed(1)).join(',')).join(' ');
    const box = (x, y, z, w, d, h, cls = 'b') => `<g class="${cls}">` +
      `<polygon class="f-l" points="${pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}"/>` +
      `<polygon class="f-r" points="${pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}"/>` +
      `<polygon class="f-t" points="${pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}"/></g>`;
    const circ = (cx, cy, z, r, n = 56) => pts(Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2; return [cx + r * Math.cos(t), cy + r * Math.sin(t), z];
    }));
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const win = (quad) => {
      const lit = rnd() < 0.3, blink = lit && rnd() < 0.5;
      return `<polygon class="win${lit ? ' lit' : ''}${blink ? ' blink' : ''}"${blink ? ` style="animation-delay:${-(rnd() * 4).toFixed(2)}s"` : ''} points="${pts(quad)}"/>`;
    };
    // windows on the front-left wall (y = const) and front-right wall (x = const)
    const winsY = (x0, x1, y, z0, z1, cols, rows) => {
      let s = ''; const cw = (x1 - x0) / cols, rh = (z1 - z0) / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const a = x0 + c * cw + cw * 0.22, b = a + cw * 0.56, lo = z0 + r * rh + rh * 0.25, hi = lo + rh * 0.5;
        s += win([[a, y, lo], [b, y, lo], [b, y, hi], [a, y, hi]]);
      }
      return s;
    };
    const winsX = (x, y0, y1, z0, z1, cols, rows) => {
      let s = ''; const cw = (y1 - y0) / cols, rh = (z1 - z0) / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const a = y0 + c * cw + cw * 0.22, b = a + cw * 0.56, lo = z0 + r * rh + rh * 0.25, hi = lo + rh * 0.5;
        s += win([[x, a, lo], [x, b, lo], [x, b, hi], [x, a, hi]]);
      }
      return s;
    };
    const led = (x, y, z, cls = '') => {
      const [cx, cy] = pr(x, y, z);
      return `<circle class="led${cls}" style="animation-delay:${-(rnd() * 3).toFixed(2)}s" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.7"/>`;
    };
    const dot = (x, y, z) => { const [cx, cy] = pr(x, y, z); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="#F4A340"/>`; };
    const tree = (x, y, s = 0.5) => box(x, y, 0, s, s, s * 1.1, 'tree');
    const MARK = '<path d="M12 3l4 9-4 9-4-9z"/>';

    // the campus: one spot per kind of footer section
    const D = {
      hq: { name: 'Uplink HQ', sub: 'one team, one number', at: [8, 8], top: [8, 8, 7.45], r: 2.6, zoom: 1.12,
        draw: () => box(6, 6, 0, 4, 4, 0.55) + box(6.9, 6.9, 0.55, 2.2, 2.2, 5.3) +
          winsY(6.9, 9.1, 9.1, 0.8, 5.6, 3, 6) + winsX(9.1, 6.9, 9.1, 0.8, 5.6, 3, 6) +
          box(7.25, 7.25, 5.85, 1.5, 1.5, 0.35) +
          `<line x1="${pr(8, 8, 6.2)[0].toFixed(1)}" y1="${pr(8, 8, 6.2)[1].toFixed(1)}" x2="${pr(8, 8, 7.2)[0].toFixed(1)}" y2="${pr(8, 8, 7.2)[1].toFixed(1)}" stroke="#F4A340" stroke-width="1.6"/>` +
          `<polyline class="beacon" points="${circ(8, 8, 7.2, 0.7)}"/><polyline class="beacon" style="animation-delay:-1.2s" points="${circ(8, 8, 7.2, 0.7)}"/>` +
          dot(8, 8, 7.2) },
      services: { name: 'Server farm', sub: 'monitored around the clock', at: [12.8, 3.5], top: [12.8, 3.5, 2.4], r: 2.4, zoom: 1.35,
        route: [[10, 7.6], [12.9, 7.6], [12.9, 4.4]],
        draw: () => [0, 1, 2, 3].map((i) => {
          const x = 10.9 + i * 0.95; let s = box(x, 2.6, 0, 0.7, 1.8, 2.4);
          for (let k = 0; k < 6; k++) s += led(x + 0.35, 4.4, 0.4 + k * 0.33, k % 3 === 1 ? ' w2' : '');
          return s;
        }).join('') },
      resources: { name: 'Archive', sub: 'guides and checklists', at: [7, 2], top: [7, 2, 1.7], r: 1.8, zoom: 1.35,
        route: [[7.5, 6], [7.5, 2.9]],
        draw: () => box(4.9, 1.6, 0, 0.8, 0.8, 0.5) + [0, 0.58, 1.16].map((z) => {
          let s = box(6.1, 1.1, z, 1.8, 1.8, 0.45);
          for (let k = 0; k < 3; k++) s += led(6.5 + k * 0.4, 2.9, z + 0.22);
          return s;
        }).join('') },
      follow: { name: 'Broadcast', sub: 'news, alerts and how-tos', at: [2, 7], top: [2, 7, 5.3], r: 1.7, zoom: 1.35,
        route: [[6, 7.2], [2.5, 7.2]],
        draw: () => box(1.5, 6.5, 0, 1, 1, 0.4) + box(1.85, 6.85, 0.4, 0.3, 0.3, 2.6) +
          box(1.7, 6.7, 3.0, 0.6, 0.6, 0.12) + box(1.85, 6.85, 3.12, 0.3, 0.3, 1.88) +
          [0, -0.9, -1.8].map((d) => `<polyline class="sig" style="animation-delay:${d}s" points="${circ(2, 7, 5.0, 0.9)}"/>`).join('') +
          dot(2, 7, 5.0) },
      company: { name: 'The crew', sub: 'in-house, never outsourced', at: [3.6, 12.4], top: [3.6, 12.4, 2.3], r: 2.3, zoom: 1.35,
        route: [[7, 10], [7, 12.3], [5, 12.3]],
        draw: () => box(2.2, 11.4, 0, 2.8, 2, 1.6) + winsY(2.2, 5, 13.4, 0.2, 1.5, 5, 2) + winsX(5, 11.4, 13.4, 0.2, 1.5, 3, 2) +
          box(2.5, 11.7, 1.6, 0.55, 0.55, 0.55, 'tree') + box(3.4, 11.7, 1.6, 0.55, 0.55, 0.7, 'tree') + box(4.2, 12.5, 1.6, 0.5, 0.5, 0.5, 'tree') },
      support: { name: 'Help desk', sub: 'tickets in, fixes out', at: [13.7, 9.3], top: [13.7, 9.3, 4.4], r: 2.2, zoom: 1.35,
        route: [[10, 9.2], [12.7, 9.2]],
        draw: () => box(12.7, 8.3, 0, 2, 1.9, 2.1) + winsY(12.7, 14.7, 10.2, 0.2, 2.0, 3, 2) + winsX(14.7, 8.3, 10.2, 0.2, 2.0, 3, 2) +
          [[2.8, 1, 0], [3.35, 2, -0.6], [3.9, 3, -1.2]].map(([z, n, d]) =>
            `<g class="bob" style="animation-delay:${d}s">${box(13.15, 8.75, z, 1.1, 1.0, 0.12, 'tk tk-' + n)}</g>`).join('') },
      industries: { name: 'Client offices', sub: '120+ teams supported', at: [9.6, 13.6], top: [10.45, 12.9, 2.7], r: 2.4, zoom: 1.35,
        route: [[9, 10], [9, 12.6]],
        draw: () => box(8.2, 12.6, 0, 1.2, 1.2, 1.8) + winsY(8.2, 9.4, 13.8, 0.2, 1.7, 2, 3) +
          box(9.8, 12.4, 0, 1.3, 1.0, 2.6) + winsX(11.1, 12.4, 13.4, 0.2, 2.5, 2, 4) +
          box(8.6, 14.1, 0, 1.6, 1.0, 1.1) + winsY(8.6, 10.2, 15.1, 0.15, 1.0, 3, 2) +
          box(10.3, 13.7, 0, 1.0, 1.0, 1.4) + winsX(11.3, 13.7, 14.7, 0.15, 1.3, 2, 2) }
    };
    // back to front, checked with the painter-order tool
    const ORDER = ['resources', 'follow', 'services', 'company', 'hq', 'support', 'industries'];
    const VB0 = [-600, -120, 1200, 860];

    const buildMap = () => {
      seed = 7;
      let s = `<svg class="fc-w" viewBox="${VB0.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the Uplink campus. The spot for the footer section you pick is lit up.">`;
      s += '<defs><filter id="fc-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>';
      s += `<ellipse class="shadow" cx="0" cy="${(pr(16, 16)[1] + 34).toFixed(1)}" rx="430" ry="38" filter="url(#fc-blur)"/>`;
      s += box(0, 0, -0.7, 16, 16, 0.7, 'plat') + '<g class="grid">';
      for (let k = 1; k < 16; k++) {
        const a = pr(k, 0), b = pr(k, 16), c = pr(0, k), d = pr(16, k);
        s += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/><line x1="${c[0].toFixed(1)}" y1="${c[1].toFixed(1)}" x2="${d[0].toFixed(1)}" y2="${d[1].toFixed(1)}"/>`;
      }
      s += `</g><polyline class="edge" points="${pts([[0, 16, 0], [16, 16, 0], [16, 0, 0]])}"/>`;
      s += `<polyline class="ring2" points="${circ(8, 8, 0, 3.6)}"/>`;
      ORDER.forEach((k) => {
        if (!D[k].route) return;
        const p = pts(D[k].route.map(([x, y]) => [x, y, 0]));
        s += `<polyline class="route" data-k="${k}" points="${p}"/><polyline class="flow" data-k="${k}" points="${p}"/>`;
      });
      s += '<polyline class="ring" points=""/>';
      s += tree(1.4, 1.6) + tree(2.4, 1.2, 0.4) + tree(1.2, 2.8, 0.45) + tree(14.6, 14.4) + tree(13.6, 14.9, 0.4) + tree(6.2, 15, 0.45) + tree(14.8, 1.4, 0.45);
      ORDER.forEach((k) => { s += `<g class="dist" data-k="${k}">${D[k].draw()}</g>`; });
      s += '<g class="mk"><g class="mk-bob"><line class="mk-line" x1="0" y1="14" x2="0" y2="52"/><polygon class="mk-d" points="0,-15 11,0 0,15 -11,0"/><polygon class="mk-i" points="0,-6 4.5,0 0,6 -4.5,0"/></g></g>';
      return s + '</svg>';
    };

    const mapBox = $('[data-fc-map]', fc);
    const hud = $('.fc-hud', fc);
    mapBox.insertAdjacentHTML('afterbegin', buildMap());
    const svg = $('svg.fc-w', mapBox), marker = $('.mk', svg), ring = $('.ring', svg);
    let vb = VB0.slice(), mk = [0, 0], raf = 0;

    const aim = (k) => {
      const d = D[k], top = pr(...d.top), ground = pr(d.at[0], d.at[1], 0);
      const w = VB0[2] / d.zoom, h = VB0[3] / d.zoom;
      const x = Math.min(Math.max((top[0] + ground[0]) / 2 - w / 2, VB0[0]), VB0[0] + VB0[2] - w);
      const y = Math.min(Math.max((top[1] + ground[1]) / 2 - h / 2, VB0[1]), VB0[1] + VB0[3] - h);
      return { vb: [x, y, w, h], mk: [top[0], top[1] - 52] };
    };
    const paint = () => {
      svg.setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
      marker.setAttribute('transform', `translate(${mk[0].toFixed(1)} ${mk[1].toFixed(1)})`);
    };
    const focusMap = (key, instant) => {
      const k = D[key] ? key : 'hq', d = D[k];
      $$('.dist', svg).forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      $$('.route, .flow', svg).forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      ring.setAttribute('points', circ(d.at[0], d.at[1], 0.02, d.r));
      hud.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${MARK}</svg><span><b>${d.name}</b><small>${d.sub}</small></span>`;
      const t = aim(k);
      window.cancelAnimationFrame(raf);
      if (instant || reduceMotion.matches) { vb = t.vb; mk = t.mk; paint(); return; }
      const v0 = vb.slice(), m0 = mk.slice(), t0 = performance.now(), dur = 700;
      const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = ease(p);
        vb = v0.map((a, i) => a + (t.vb[i] - a) * e);
        mk = m0.map((a, i) => a + (t.mk[i] - a) * e);
        paint();
        if (p < 1) raf = window.requestAnimationFrame(step);
      };
      raf = window.requestAnimationFrame(step);
    };

    // roster: tabs with arrow keys, plus the two key-cap buttons
    const tabs = $$('.fc-tile', fc);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    const select = (i, opts = {}) => {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === cur)); t.tabIndex = j === cur ? 0 : -1; });
      panels.forEach((p, j) => { p.classList.toggle('is-on', j === cur); p.classList.remove('is-in'); });
      if (!opts.instant) { void panels[cur].offsetWidth; panels[cur].classList.add('is-in'); }
      const roster = $('.fc-roster', fc), t = tabs[cur];
      roster.scrollTo({ left: t.offsetLeft - (roster.clientWidth - t.offsetWidth) / 2, behavior: opts.instant || reduceMotion.matches ? 'auto' : 'smooth' });
      if (opts.focus) t.focus({ preventScroll: true });
      focusMap(panels[cur].dataset.map, opts.instant);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    $('.fc-roster', fc).addEventListener('keydown', (e) => {
      const map = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(map[e.key], { focus: true });
    });
    $$('[data-fc-step]', fc).forEach((b) => b.addEventListener('click', () => select(cur + Number(b.dataset.fcStep), { focus: false })));

    // newsletter (prototype: nothing is sent)
    const nl = $('[data-fc-nl]', fc);
    if (nl) nl.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', nl), msg = $('[data-fc-nl-msg]', nl);
      if (!input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Enter an email like name@company.com.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      msg.textContent = 'One email a month. Threats to watch and fixes that matter.';
      nl.reset();
      toast({ title: 'Subscribed', text: 'Prototype form: nothing is sent yet.' });
    });

    // the section tracker would sit on top of the map: hide it while the footer fills the screen
    const tracker = $('.tracker');
    if (tracker && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => tracker.classList.toggle('is-off', en.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] }).observe(fc);
    }

    fc.classList.add('fc-js');
    select(cur, { instant: true });
  }
})();
