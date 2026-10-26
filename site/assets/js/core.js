/* ==========================================================================
   Uplink Technology · core script (every page)
   Plain JS, no libraries, no build step. Every feature is optional: the
   pages read and work without script (links navigate, every service and
   project is in the HTML, the full building is drawn).

   Files, loaded with defer in this order:
     core.js      every page   helpers, toasts, pop-ups, forms, shortcuts,
                               section dots; shares window.Uplink
     footer.js    every page   footer roster + campus map
     home.js      Home         growing tower, hero cloud
     services.js  Services     service picker
     work.js      Our work     filters + project pop-up
     contact.js   Contact      copy buttons, queue card
     soon.js      soon.html    names the missing page

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
    const i = pageLinks.findIndex((a) => a.dataset.page === currentPage);
    const target = i >= 0
      ? pageLinks[(i + step + pageLinks.length) % pageLinks.length]
      : $$('.keyhop')[step < 0 ? 0 : 1];
    if (!target) return;
    leaving = true;
    window.location.href = target.getAttribute('href');
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
    const picker = window.Uplink.picker;
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
     Forms: inline validation, then a confirmation toast.
     This prototype does not send anything anywhere yet.
     ====================================================================== */
  $$('form[data-validate]').forEach((form) => {
    form.noValidate = true;
    const fields = $$('input, select, textarea', form).filter((el) => el.willValidate);

    // The field's error text is linked only while the field is invalid, so a
    // screen reader does not read it out on an empty, untouched field.
    const check = (el) => {
      if (el.required && el.value !== '' && el.value.trim() === '') el.setCustomValidity('empty');
      else el.setCustomValidity('');
      const ok = el.checkValidity();
      const err = $('.field-error', el.parentElement);
      if (ok) {
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      } else {
        el.setAttribute('aria-invalid', 'true');
        if (err && err.id) el.setAttribute('aria-describedby', err.id);
      }
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
      fields.forEach((el) => { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });

      if (kind === 'book') {
        toast({ title: 'Check-up requested', text: 'We will email you within one business day to pick a time.' });
      }
      // page scripts can react to a sent form (contact.js updates the queue card)
      form.dispatchEvent(new CustomEvent('uplink:sent', { bubbles: true }));
    });
  });

  /* ---------- shared with the page scripts ------------------------------ */
  // picker: set by services.js so the 1-6 keys can pick a service
  window.Uplink = { $, $$, reduceMotion, toast, openDialog, shortcutsOn, picker: null };
})();
