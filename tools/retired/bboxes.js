// node bboxes.js <port> <name>  -> JSON of text bboxes in local (group) coords
const { chromium } = require('playwright');
const [port, name] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(`http://localhost:${port}/assets/img/${name}.svg`);
  const r = await p.evaluate(() => [...document.querySelectorAll('text')].map(t => { const bb = t.getBBox(); return { t: t.textContent, x: bb.x, y: bb.y, w: bb.width, h: bb.height }; }));
  console.log(JSON.stringify(r)); await b.close();
})();
