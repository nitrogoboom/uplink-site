// ---- option C: the step list (desktop). Runs after grow.js and leaves it as it is: a row's click is its dot's
// click, and the rows copy the dots' state (pressed, done) whenever grow.js changes it. While the story plays, the
// open row's foot fills over the step's time. Built for real, grow.js would take the rows into its own dot list. ----
{
  const g = document.querySelector('#grow .grow');
  const dotEls = [...g.querySelectorAll('.grow-dot')];
  const rows = [...g.querySelectorAll('.grow-step')];
  const playBtn = g.querySelector('.grow-play');
  rows.forEach((r, i) => r.addEventListener('click', () => dotEls[i].click()));
  const sync = () => {
    const running = playBtn.getAttribute('aria-label') === 'Pause';
    dotEls.forEach((d, i) => {
      const r = rows[i], on = d.getAttribute('aria-pressed') === 'true', was = r.getAttribute('aria-pressed') === 'true';
      r.setAttribute('aria-pressed', String(on));
      r.classList.toggle('is-done', d.classList.contains('is-done'));
      const timing = on && running;
      if (timing && !was) { r.classList.remove('is-timing'); void r.offsetWidth; }   // a new step: the bar starts over
      r.classList.toggle('is-timing', timing);
    });
  };
  const mo = new MutationObserver(sync);
  [...dotEls, playBtn].forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['aria-pressed', 'class', 'aria-label'] }));
  g.style.setProperty('--grow-dwell', `${DWELL}ms`);   // grow.js's own step time
  sync();
}
