// node shoot1.js <port> <svgname> <out.png> [scale]
const { chromium } = require('playwright');
const [port, name, out, sc] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: +(sc||3), viewport: { width: 1200, height: 930 } });
  await p.goto(`http://localhost:${port}/assets/img/${name}.svg`);
  await p.evaluate(()=>document.documentElement.style.background='#151E2C');
  await p.waitForTimeout(name === 'office-build' ? 6000 : 300);
  await (await p.$('svg')).screenshot({ path: out });
  await b.close();
})();
