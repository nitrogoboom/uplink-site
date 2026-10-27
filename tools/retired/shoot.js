// usage: node shoot.js <port> <outdir>
const { chromium } = require('playwright');
const port = process.argv[2], out = process.argv[3];
const svgs = ['office','office-build','tower-grow','hq','helpdesk','security','cloud','network','backup','strategy'];
(async () => {
  const b = await chromium.launch();
  // standalone svgs at 3x
  const p = await b.newPage({ deviceScaleFactor: 3, viewport: { width: 1200, height: 930 } });
  for (const s of svgs) {
    await p.goto(`http://localhost:${port}/assets/img/${s}.svg`);
    await p.addStyleTag({content:'svg{background:#151E2C}'}).catch(()=>{});
    await p.evaluate(()=>document.documentElement.style.background='#151E2C');
    await p.waitForTimeout(s === 'office-build' ? 6000 : 400);
    const el = await p.$('svg');
    await el.screenshot({ path: `${out}/${s}.png` });
  }
  await p.close();
  // hero inline svg after build
  const h = await b.newPage({ deviceScaleFactor: 2, viewport: { width: 1440, height: 900 } });
  await h.goto(`http://localhost:${port}/index.html`);
  await h.waitForTimeout(7000);
  await (await h.$('svg.ob')).screenshot({ path: `${out}/hero.png` });
  // tower inline: scroll into view to fully grown
  const tg = await h.$('svg.tg');
  await tg.scrollIntoViewIfNeeded();
  await h.evaluate(() => window.scrollBy(0, 400));
  await h.waitForTimeout(2500);
  await tg.screenshot({ path: `${out}/tower-inline.png` });
  await b.close();
})();
