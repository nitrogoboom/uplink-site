// node verify.js <port> <outdir>
const { chromium } = require('playwright');
const [port, out] = process.argv.slice(2);
const base = `http://localhost:${port}`;
(async () => {
  const b = await chromium.launch();
  const report = [];
  // 1. hero build animation + tile hover + console errors at 1440x900
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(base + '/');
  await p.waitForTimeout(250);
  await (await p.$('svg.ob')).screenshot({ path: `${out}/anim-hero-0250ms.png` });
  await p.waitForTimeout(1250);
  await (await p.$('svg.ob')).screenshot({ path: `${out}/anim-hero-1500ms.png` });
  await p.waitForTimeout(4000);
  const before = await p.$eval('.ob-app', e => e.textContent);
  const tile = await p.$('.ob-tile[data-tile="files"]');
  await tile.hover({ force: true });
  await p.waitForTimeout(500);
  const after = await p.$eval('.ob-app', e => e.textContent);
  const on = await p.$eval('.ob-tile[data-tile="files"]', e => e.classList.contains('is-on'));
  report.push(`tile hover: app text ${before} -> ${after}, files tile is-on=${on}`);
  await p.mouse.move(5, 5); await p.waitForTimeout(3600);
  report.push(`auto-cycle after leave: ${await p.$eval('.ob-app', e => e.textContent)}`);
  // 2. tower grows with scroll
  const steps = await p.$$eval('.grow-step[data-floors]', s => s.map(x => x.dataset.floors));
  const seen = [];
  for (const f of steps) {
    await p.$eval(`.grow-step[data-floors="${f}"]`, e => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(700);
    seen.push(await p.$eval('svg.tg', e => e.getAttribute('data-floors')));
    await (await p.$('svg.tg')).screenshot({ path: `${out}/anim-tower-${f}.png` });
  }
  report.push(`tower floors per step ${steps.join(',')} -> ${seen.join(',')}`);
  report.push(`console errors: ${errs.length ? errs.join(' | ') : 'none'}`);
  await p.close();
  // 3. viewports
  for (const [n, w, h] of [['phone', 390, 844], ['tablet', 820, 1180], ['1440', 1440, 900], ['3440', 3440, 1440]]) {
    const q = await b.newPage({ viewport: { width: w, height: h } });
    await q.goto(base + '/'); await q.waitForTimeout(5500);
    const ov = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const box = await q.$eval('svg.ob', e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; });
    await q.screenshot({ path: `${out}/vp-${n}.png` });
    report.push(`${n} ${w}x${h}: horizontal overflow ${ov}px, hero svg box ${box}`);
    await q.close();
  }
  console.log(report.join('\n'));
  await b.close();
})();
