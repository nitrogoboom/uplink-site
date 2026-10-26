/* ==========================================================================
   Uplink Technology · Contact page
   Copy buttons and the queue card.
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, toast } = window.Uplink;

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
     Contact form sent: confirm, then show the queue card as queued
     ====================================================================== */
  const contactForm = $('form[data-validate="contact"]');
  if (contactForm) {
    contactForm.addEventListener('uplink:sent', () => {
      toast({ title: 'Message received', text: 'You are in the queue. We reply within one business day.' });
      const q = $('[data-queue]');
      if (q) q.dataset.state = 'queued';
      const arc = $('[data-queue-arc]');
      if (arc) arc.setAttribute('stroke-dasharray', '330 440');
      $$('[data-queue-text]').forEach((el) => { el.textContent = el.dataset.queueText; });
    });
  }
})();
