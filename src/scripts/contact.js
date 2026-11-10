/* ==========================================================================
   Uplink Technology · Contact page
   Copy buttons and the queue card.
   ========================================================================== */

import { $, $$, toast, words } from './core.js';

/** @typedef {import('../lib/copy-schema').ContactWords} ContactWords */
const T = /** @type {ContactWords} */ (words('words-page')); // src/data/copy/en/contact.yaml, toast

/* ======================================================================
   Copy buttons (phone number, email)
   ====================================================================== */
$$('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const value = /** @type {string} */ (btn.dataset.copy); // every copy button has one
    const target = document.getElementById(btn.dataset.copyTarget || '');
    const fallback = () => {
      if (target) {
        const range = document.createRange();
        range.selectNodeContents(target);
        const sel = /** @type {Selection} */ (window.getSelection());
        sel.removeAllRanges();
        sel.addRange(range);
      }
      toast({ ...T.selected, tone: 'info', timeout: 4000 });
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(() => toast({ title: T.copied, text: value, timeout: 3000 }), fallback);
    } else {
      fallback();
    }
  });
});

/* ======================================================================
   Contact form sent: confirm, then show the queue card as queued
   ====================================================================== */
const contactForm = $('form[data-validate="contact"]');
if (contactForm) {
  contactForm.addEventListener('uplink:sent', () => {
    toast(T.received);
    const q = $('[data-queue]');
    if (q) q.dataset.state = 'queued';
    const arc = $('[data-queue-arc]');
    if (arc) arc.setAttribute('stroke-dasharray', '330 440');
    $$('[data-queue-text]').forEach((el) => {
      el.textContent = /** @type {string} */ (el.dataset.queueText);
    });
  });
}
