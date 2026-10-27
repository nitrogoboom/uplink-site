"""Check the per-page CSS: each page must look exactly as it would with the whole site's CSS.

    python tools/verify_css_split.py [port]    # serve site/ with tools/serve.py first; port 8765 by default

For every page at phone, tablet, 1440 and 3440 wide, it loads the page twice: as built (its own CSS
inline) and with that CSS swapped for all of site/assets/css/site.css. Then it compares the computed
style of every element, pseudo-elements ::before and ::after too. Any difference is listed with the
element and the property; none means the split dropped nothing the page uses.
Motion is reduced and the page settles first, so animations don't show up as differences.
"""
import asyncio
import pathlib
import re
import sys

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ['/', '/services', '/work', '/about', '/contact', '/soon', '/404']
SIZES = {'phone': (375, 812), 'tablet': (768, 1024), '1440': (1440, 900), '3440': (3440, 1440)}
STYLE = re.compile(r'<style>.*?</style>', re.S)

GRAB = """(detail) => {
  // one line per element and pseudo-element: an FNV hash of every computed value, or the values themselves for `detail`
  const out = [];
  document.querySelectorAll('body *').forEach((el, i) => {
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && cs.content === 'none') continue;
      const id = i + ' ' + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].join('.') : '') + (pseudo || '');
      let s = '';
      for (let k = 0; k < cs.length; k++) s += cs[k] + ':' + cs.getPropertyValue(cs[k]) + ';';
      if (detail && detail.includes(id)) { out.push([id, s]); continue; }
      if (detail) continue;
      let h = 2166136261;
      for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
      out.push([id, h >>> 0]);
    }
  });
  return out;
}"""


async def load(page, url, full_css=None):
    if full_css:
        async def swap(route):
            resp = await route.fetch()
            body = STYLE.sub(lambda m: '<style>' + full_css + '</style>', await resp.text(), count=1)
            await route.fulfill(response=resp, body=body)
        await page.route(url, swap)
    await page.goto(url, wait_until='networkidle')
    await page.wait_for_timeout(600)
    if full_css:
        await page.unroute(url)


async def styles(page, url, full_css=None, detail=None):
    await load(page, url, full_css)
    return await page.evaluate(GRAB, detail)


async def main():
    port = sys.argv[1] if len(sys.argv) > 1 else '8765'
    full = (ROOT / 'site/assets/css/site.css').read_text(encoding='utf-8').strip().replace("url('../", "url('/assets/")
    problems = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for size, (w, h) in SIZES.items():
            ctx = await browser.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce')
            page = await ctx.new_page()
            for path in PAGES:
                url = f'http://localhost:{port}{path}'
                a, b = await styles(page, url), await styles(page, url, full)
                diffs = []
                if [k for k, _ in a] != [k for k, _ in b]:
                    diffs.append(f'elements differ: {len(a)} vs {len(b)}')
                bad = [ka for (ka, ha), (kb, hb) in zip(a, b) if ha != hb][:12]
                if bad:   # look closer at the first few
                    da = dict(await styles(page, url, None, bad))
                    db = dict(await styles(page, url, full, bad))
                    for k in bad:
                        pa = dict(x.split(':', 1) for x in da.get(k, '').split(';') if ':' in x)
                        pb = dict(x.split(':', 1) for x in db.get(k, '').split(';') if ':' in x)
                        diffs += [f'{k} {pr}: split {pa.get(pr)!r} / full {pb.get(pr)!r}' for pr in sorted(set(pa) | set(pb)) if pa.get(pr) != pb.get(pr)]
                    diffs.append(f'({sum(1 for (_, ha), (_, hb) in zip(a, b) if ha != hb)} elements differ in all)')
                problems += len(diffs)
                print(f'{path:10} {size:6} {"ok" if not diffs else str(len(diffs)) + " differences"}')
                for d in diffs[:12]:
                    print('   ', d)
            await ctx.close()
        await browser.close()
    sys.exit(1 if problems else 0)


asyncio.run(main())
