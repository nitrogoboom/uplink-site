/* ==========================================================================
   Uplink Technology · core script (every page)
   Plain JS, no libraries. ES modules, bundled by Astro. Every feature is optional: the
   pages read and work without script (links navigate, every service and
   project is in the HTML, the drawings show finished).

   Files (each page script imports core.js, so core always runs first):
     core.js      every page   helpers, toasts, pop-ups, forms, shortcuts, tab bar;
                               exports the helpers the page scripts import
     footer.js    every page   footer campus map (the sections are <details>)
     home.js      Home         hero, phone Services row; grow.js (We grow with you)
     contact.js   Contact      copy buttons, queue card
     soon.js      soon.html    names the missing page

   Keyboard map (single keys, can be switched off in Settings):
     ?          open Settings (the keys)      all pages
     Esc        close the open pop-up         native <dialog> behaviour; hinted beside each close button
   Single keys never fire while typing in a field, while a pop-up is open,
   or when Ctrl / Cmd / Alt is held.
   ========================================================================== */

import { MEDIA } from '../lib/media.js';

const root = document.documentElement;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- error reports ---------------------------------------------- */
// A script error on a visitor's screen is posted to /api/report (worker/index.js logs it), so we hear about it.
// What goes: the page's path, the message, the script's address and line. Never form contents or anything typed.
// Left out: "Script error." (an outside script's error, which the browser hides), "ResizeObserver loop" (a
// browser notice that a resize took two frames, not a fault) and a page-change animation the browser gave up on
// ("Transition was aborted …", say when a phone's screen size changes mid-change: page-transitions.css; the page
// still loads, so it isn't a fault to hear about). Five reports a page at most.
// CSP blocks are reported by the browser itself (public/_headers).
let reportsLeft = 5;
const reportError = (message, source, line, column) => {
  if (!message || message === 'Script error.' || /ResizeObserver loop|^Transition was (aborted|skipped)/.test(message)) return;
  if (reportsLeft-- <= 0 || !navigator.sendBeacon) return;
  const body = { kind: 'error', page: location.pathname, message: String(message).slice(0, 300), source, line, column };
  navigator.sendBeacon('/api/report', new Blob([JSON.stringify(body)], { type: 'application/json' }));
};
window.addEventListener('error', (e) => reportError(e.message, e.filename, e.lineno, e.colno));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason?.message || String(e.reason), e.reason?.stack?.split('\n')[1]?.trim()));

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
// the page's own region is the one straight under <body> (each dialog holds one too, and they come first)
const pageToasts = $(':scope > .toasts', document.body);

// A modal pop-up makes the rest of the page inert, so while one is open the toast is placed inside it to stay
// visible and announced. Each pop-up has its own empty live region in its markup (Base.astro's .toasts for the page,
// the dialogs' own): a region made in the same moment as its first message isn't announced.
function toastRegion() {
  const dlg = document.querySelector('dialog[open]');
  return dlg ? $(':scope > .toasts', dlg) || pageToasts : pageToasts;
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

  // focus that came into the toast (Tab to its button) goes back where it came from when the toast leaves, or to
  // the pop-up's close button or the page's main content, never to the page's <body>
  let timer = null, from = null;
  const leave = () => {
    clearTimeout(timer);
    if (el.dataset.leaving !== undefined) return;
    el.dataset.leaving = '';
    if (el.contains(document.activeElement)) {
      const dlg = region.closest('dialog');
      const to = [from, dlg && $('[data-close]', dlg), $('#main')].find((x) => x && document.contains(x) && !el.contains(x) && typeof x.focus === 'function');
      if (to) to.focus({ preventScroll: true });
    }
    const done = () => el.remove();
    if (reduceMotion.matches) done(); else el.addEventListener('animationend', done, { once: true });
  };
  const arm = () => { clearTimeout(timer); timer = setTimeout(leave, timeout); };
  btn.addEventListener('click', leave);
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', arm);
  el.addEventListener('focusin', (e) => { clearTimeout(timer); if (e.relatedTarget && !el.contains(e.relatedTarget)) from = e.relatedTarget; });
  el.addEventListener('focusout', arm);
  arm();
}

/* ======================================================================
   Dialogs (native <dialog>: focus is held inside, Esc closes)
   Settings' gear and close button are also invoker commands (commandfor, command="show-modal" / "close") and it
   carries closedby="any", so in a browser that has them it works before this script runs, or if it never does
   (SettingsDialog.astro). Once this script runs it opens and closes the pop-ups itself, the same in every browser
   (its click cancels the command), and a click on the backdrop goes through its own check below. Book is opened by
   links, which without script go to the form on /contact.
   ====================================================================== */
// On touch screens the first field would bring the keyboard up over the sheet before it is read, so there focus
// starts on the close button (a screen reader still reads the dialog's title) and a tap on a field brings the keyboard.
const coarse = window.matchMedia('(pointer: coarse)');
const openedAt = new WeakMap();   // dialog -> when it opened
const openers = new WeakMap();    // dialog -> what opened it, which gets focus back when it closes
function openDialog(id, opener) {
  const dlg = document.getElementById(id);
  if (!dlg || dlg.open || typeof dlg.showModal !== 'function') return false;
  openers.set(dlg, opener || document.activeElement);
  dlg.showModal();
  openedAt.set(dlg, performance.now());
  // a group of options (radios) is entered at its chosen one, as Tab does
  const first = (coarse.matches ? null : $('[autofocus]', dlg) || $('input:not([type="radio"]), input[type="radio"]:checked, select, textarea', dlg)) || $('[data-close]', dlg);
  if (first) first.focus({ preventScroll: true });
  dlg.scrollTop = 0;
  return true;
}

$$('dialog').forEach((dlg) => {
  // click on the dimmed backdrop closes; not the second click of a double-click (or a quick second tap) on what
  // opened it, which lands on the backdrop of the pop-up the first click opened (review B12). The browser's own light
  // dismiss (closedby="any") can't tell the two apart, so it's off once this script runs.
  dlg.setAttribute('closedby', 'closerequest');
  let downOnBackdrop = false;
  dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener('click', (e) => {
    const settled = e.detail < 2 && performance.now() - (openedAt.get(dlg) || 0) > 400;
    if (e.target === dlg && downOnBackdrop && settled) dlg.close();
    downOnBackdrop = false;
  });
  // return focus to whatever opened it; a toast still in it goes too (a closed pop-up never plays the toast's
  // fade-out, so the toast would wait there and flash up the next time the pop-up opens)
  dlg.addEventListener('close', () => {
    $$(':scope > .toasts > .toast', dlg).forEach((t) => t.remove());
    const back = openers.get(dlg);
    openers.delete(dlg);
    if (back && document.contains(back) && typeof back.focus === 'function') back.focus();
  });
});

// No aria-haspopup="dialog" on what opens a pop-up (review J8): on Windows any aria-haspopup makes a button or link a
// menu button to screen readers, VoiceOver doesn't announce it, and the WAI-ARIA APG modal dialog pattern doesn't use
// it. The pop-up names itself as it opens and takes focus.

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

/* ---------- pause (WCAG 2.2.2) ------------------------------------------ */
// Every pause button (HoldButton.astro: the hero's on Home, the footer map's on every page) holds every moving part
// on the page. html.is-held pauses the drawings' CSS animations, nothing else (base.css); page scripts stop their
// timers on held.ev's 'change' (home.js, grow.js). One choice for the whole site, kept for next time. Nothing moves
// with reduced motion, so the buttons hide then.
const HOLD_KEY = 'uplink-held';
const held = { on: false, ev: new EventTarget() };
const holdBtns = $$('[data-hold]');
const setHeld = (on) => {
  held.on = on;
  root.classList.toggle('is-held', on);
  holdBtns.forEach((b) => b.setAttribute('aria-pressed', String(on)));
  held.ev.dispatchEvent(new Event('change'));
};
if (store.get(HOLD_KEY) === '1') setHeld(true);
const showHold = () => holdBtns.forEach((b) => { b.hidden = reduceMotion.matches; });
holdBtns.forEach((b) => b.addEventListener('click', () => { setHeld(!held.on); store.set(HOLD_KEY, held.on ? '1' : '0'); }));
showHold();
reduceMotion.addEventListener('change', showHold);

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

  if (e.key === '?') { e.preventDefault(); openDialog('settings-dialog'); }
});

/* ======================================================================
   Forms: inline validation, then a confirmation toast.
   This prototype does not send anything anywhere yet.
   ====================================================================== */
$$('form[data-validate]').forEach((form) => {
  form.noValidate = true;
  const fields = $$('input, select, textarea', form).filter((el) => el.willValidate);

  // The field's error text is linked only while the field is invalid, so a
  // screen reader does not read it out on an empty, untouched field. Only the
  // error's id comes and goes: a hint the field is described by stays (review J9).
  const linkError = (el, on) => {
    const err = $('.field-error', el.parentElement);
    if (!err || !err.id) return;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== err.id);
    if (on) ids.push(err.id);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };
  const check = (el) => {
    if (el.required && el.value !== '' && el.value.trim() === '') el.setCustomValidity('empty');
    else el.setCustomValidity('');
    const ok = el.checkValidity();
    if (ok) el.removeAttribute('aria-invalid');
    else el.setAttribute('aria-invalid', 'true');
    linkError(el, !ok);
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
    fields.forEach((el) => { el.removeAttribute('aria-invalid'); linkError(el, false); });

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
// The header stays put. The bar shows on phones only (bottom-nav.css); elsewhere it is hidden, so the listener does
// nothing there.
const botnav = $('.botnav');
if (botnav) {
  const STEP = 12;   // px of travel before the bar reacts, so small jitters don't flicker it
  const phone = window.matchMedia(MEDIA.phone);
  const barOn = () => phone.matches;
  let lastY = null;   // set on the first scroll: reading scrollY as the page loads makes the browser lay it out early
  let queued = false;
  const show = (on) => botnav.classList.toggle('is-hidden', !on);
  const update = () => {
    queued = false;
    if (!barOn()) { show(true); return; }
    const y = window.scrollY;
    if (lastY === null) lastY = y;
    const end = root.scrollHeight - window.innerHeight - STEP;
    if (y <= 0 || y >= end || botnav.contains(document.activeElement)) { show(true); lastY = y; return; }
    if (Math.abs(y - lastY) < STEP) return;
    show(y < lastY);
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!queued && barOn()) { queued = true; window.requestAnimationFrame(update); } }, { passive: true });
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
// Marks el with .is-idle while none of it is on screen (base.css pauses
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

/* ---------- pictures that can't load ------------------------------------ */
// A picture that fails (offline, blocked) gets .is-broken (base.css: see-through, so no broken-image box; its alt
// text still reaches screen readers). An error doesn't bubble, so it's caught on the way down; one that came before
// this script ran is found by decode(), which fails only for a picture that can't be shown.
const broken = (img) => img.classList.add('is-broken');
document.addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) broken(e.target); }, true);
$$('img').forEach((img) => { if (img.complete && !img.naturalWidth) img.decode().catch(() => broken(img)); });

/* ---------- Cloudflare Web Analytics ----------------------------------- */
// Real visitors' load speed (LCP, CLS, INP), no cookies. The beacon goes in after the page has loaded and
// the browser is idle, so it never competes with the first screen (Cloudflare's own injection put it in the
// HTML, which cost the phone score). It still reads the timings the browser kept from the start.
// Only the live address reports: Cloudflare refuses others, so the beacon loads only where the page's
// canonical host is the one it is served from (not on previews or localhost; soon and 404 have no canonical).
// Not in a browser driven by a test (navigator.webdriver): our own checks after each deploy were about 140 of a
// page's visits a week in Web Analytics.
const BEACON_TOKEN = '70d8bac3e0604a3cb29757cef206b053';   // public site token: Cloudflare Web Analytics > Manage site (registered for the old pages.dev host; see notes.md)
const startBeacon = () => {
  if (navigator.webdriver) return;
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
export { $, $$, held, html, reduceMotion, replay, toast, openDialog, shortcutsOn, whenOnScreen };
