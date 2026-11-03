/* ==========================================================================
   Uplink Technology · core script (every page)
   Plain JS, no libraries. ES modules, bundled by Astro. Every feature is optional: the
   pages read and work without script (links navigate, every service and
   project is in the HTML, the full building is drawn).

   Files (each page script imports core.js, so core always runs first):
     core.js      every page   helpers, toasts, pop-ups, forms, shortcuts, tab bar;
                               exports the helpers the page scripts import
     footer.js    every page   footer roster + campus map
     home.js      Home         growing tower, hero cloud
     work.js      Our work     filters
     contact.js   Contact      copy buttons, queue card
     soon.js      soon.html    names the missing page

   Keyboard map (single keys, can be switched off in the shortcuts panel):
     ?          open the shortcuts panel      all pages
     Esc        close the open pop-up         native <dialog> behaviour
   Single keys never fire while typing in a field, while a pop-up is open,
   or when Ctrl / Cmd / Alt is held.
   ========================================================================== */

import { MEDIA } from '../lib/media.js';

const root = document.documentElement;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- storage (can be unavailable) ------------------------------ */
const store = {
  get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch { /* ignore */ } }
};

/* ---------- Trusted Types ---------------------------------------------- */
// The CSP (public/_headers) lets only this policy write HTML into the page (innerHTML and the like).
// Every string it passes is markup built in these files from the page's own text, never from a URL or a form.
// The one script it may load from elsewhere is the analytics beacon (BEACON, below).
const BEACON = 'https://static.cloudflareinsights.com/beacon.min.js';
const ttPolicy = window.trustedTypes ? window.trustedTypes.createPolicy('uplink', {
  createHTML: (s) => s,
  createScriptURL: (u) => { if (u === BEACON) return u; throw new TypeError('script not allowed: ' + u); }
}) : null;
const html = (s) => (ttPolicy ? ttPolicy.createHTML(s) : s);

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
  ic.innerHTML = html(tone === 'info' ? ICON.info : ICON.check);

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
  btn.innerHTML = html(ICON.close);

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
// On touch screens the first field would bring the keyboard up over the sheet before it is read, so there focus
// starts on the close button (a screen reader still reads the dialog's title) and a tap on a field brings the keyboard.
const coarse = window.matchMedia('(pointer: coarse)');
function openDialog(id, opener) {
  const dlg = document.getElementById(id);
  if (!dlg || dlg.open || typeof dlg.showModal !== 'function') return false;
  dlg._opener = opener || document.activeElement;
  dlg.showModal();
  const first = (coarse.matches ? null : $('[autofocus]', dlg) || $('input, select, textarea', dlg)) || $('[data-close]', dlg);
  if (first) first.focus({ preventScroll: true });
  dlg.scrollTop = 0;
  return true;
}

$$('dialog').forEach((dlg) => {
  // click on the dimmed backdrop closes
  let downOnBackdrop = false;
  dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });
  // return focus to whatever opened it; a toast still in it goes too (a closed pop-up never plays the toast's
  // fade-out, so the toast would wait there and flash up the next time the pop-up opens)
  dlg.addEventListener('close', () => {
    $$(':scope > .toasts > .toast', dlg).forEach((t) => t.remove());
    const back = dlg._opener;
    dlg._opener = null;
    if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
  });
});

// With script, these open a pop-up instead of going to their page, so screen readers say so ("has pop-up dialog").
// Without script they are plain links again, and nothing claims otherwise.
$$('[data-open]').forEach((el) => { if (document.getElementById(el.dataset.open)) el.setAttribute('aria-haspopup', 'dialog'); });

document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-open]');
  // Ctrl, Cmd, Shift or Alt on a link means a new tab, a new window or a download: let the link do that
  if (opener && opener.matches('a[href]') && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return;
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

  if (e.key === '?') { e.preventDefault(); openDialog('shortcuts-dialog'); }
});

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

/* ---------- phone tab bar: out of the way while reading ----------------- */
// Scrolling down slides the bar off the bottom (.is-hidden, bottom-nav.css); scrolling up brings it back.
// It always shows at the top and the end of the page and while one of its links has focus.
// The header stays put: the home tower pins under it. Wider screens hide the bar, so the listener does nothing there.
const botnav = $('.botnav');
if (botnav) {
  const STEP = 12;   // px of travel before the bar reacts, so small jitters don't flicker it
  const phone = window.matchMedia(MEDIA.phone);
  let lastY = null;   // set on the first scroll: reading scrollY as the page loads makes the browser lay it out early
  let queued = false;
  const show = (on) => botnav.classList.toggle('is-hidden', !on);
  const update = () => {
    queued = false;
    if (!phone.matches) { show(true); return; }
    const y = window.scrollY;
    if (lastY === null) lastY = y;
    const end = root.scrollHeight - window.innerHeight - STEP;
    if (y <= 0 || y >= end || botnav.contains(document.activeElement)) { show(true); lastY = y; return; }
    if (Math.abs(y - lastY) < STEP) return;
    show(y < lastY);
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!queued && phone.matches) { queued = true; window.requestAnimationFrame(update); } }, { passive: true });
  phone.addEventListener('change', () => { lastY = window.scrollY; show(true); });
  botnav.addEventListener('focusin', () => show(true));
}

/* ---------- replay ----------------------------------------------------- */
// Plays a CSS animation from the start: the first time by adding its class, then by restarting it. No layout is
// read, so it costs no forced layout (offsetWidth would).
const replay = (el, cls) => {
  if (el.classList.contains(cls)) el.getAnimations().forEach((a) => { a.cancel(); a.play(); });
  else el.classList.add(cls);
};

/* ---------- off-screen pause ------------------------------------------ */
// Marks el with .is-idle while none of it is on screen (site.css pauses
// its looping animations) and tells onChange(onScreen) about each change.
function whenOnScreen(el, onChange) {
  if (!el || !('IntersectionObserver' in window)) return null;
  const io = new IntersectionObserver(([en]) => {
    el.classList.toggle('is-idle', !en.isIntersecting);
    if (onChange) onChange(en.isIntersecting);
  });
  io.observe(el);
  return io;
}

/* ---------- Cloudflare Web Analytics ----------------------------------- */
// Real visitors' load speed (LCP, CLS, INP), no cookies. The beacon goes in after the page has loaded and
// the browser is idle, so it never competes with the first screen (Cloudflare's own injection put it in the
// HTML, which cost the phone score). It still reads the timings the browser kept from the start.
// Only the live address reports: Cloudflare refuses others, so the beacon loads only where the page's
// canonical host is the one it is served from (not on previews or localhost; soon and 404 have no canonical).
const BEACON_TOKEN = '70d8bac3e0604a3cb29757cef206b053';   // public site token: Cloudflare Web Analytics > Manage site (registered for the old pages.dev host; see notes.md)
const startBeacon = () => {
  const canon = $('link[rel="canonical"]');
  if (!canon || new URL(canon.href).hostname !== window.location.hostname) return;
  const s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: BEACON_TOKEN }));
  s.src = ttPolicy ? ttPolicy.createScriptURL(BEACON) : BEACON;
  document.body.append(s);
};
const whenIdle = (fn) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 4000 }) : window.setTimeout(fn, 1500));
if (document.readyState === 'complete') whenIdle(startBeacon);
else window.addEventListener('load', () => whenIdle(startBeacon), { once: true });

/* ---------- shared with the page scripts ------------------------------ */
export { $, $$, html, reduceMotion, replay, toast, openDialog, shortcutsOn, whenOnScreen };
