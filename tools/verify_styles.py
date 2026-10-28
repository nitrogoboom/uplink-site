# Proves a CSS move changed nothing: loads every page from two copies of the built site and compares the computed
# style of every element (and its ::before / ::after) at each screen size. Run it before and after moving CSS around.
# usage: python tools/verify_styles.py BEFORE_URL AFTER_URL [page ...]
#   e.g. serve the old build on 8790 (npx wrangler dev --assets <old dist> --port 8790) and the new one on 8787, then
#        python tools/verify_styles.py http://localhost:8790 http://localhost:8787
# Pages default to the sitemap of AFTER_URL plus /soon and a 404. Animations are frozen (reduced motion) so timing
# can't show up as a difference; the CSP is bypassed so the probe script can run. Exits 1 on any difference.
import asyncio, re, sys, urllib.request
from playwright.async_api import async_playwright

SIZES = [(390, 844), (1280, 720), (1440, 900), (3440, 1440)]
# html, body and every element in the body except script/style/link (the head's links change when CSS moves), in
# document order: a hash of its computed style, its ::before and its ::after
# (computed url() values are absolute, so the origin is cut out: the two copies run on different ports; and custom
# properties list in no fixed order, so the properties are sorted by name)
PROBE = """(full) => {
  const els = [document.documentElement, document.body, ...document.body.querySelectorAll('*')].filter((e) => !/^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(e.tagName));
  const o = location.origin;
  const ser = (cs) => { const r = []; for (let i = 0; i < cs.length; i++) r.push([cs[i], cs.getPropertyValue(cs[i]).split(o).join('')]); return r.sort((x, y) => (x[0] < y[0] ? -1 : 1)); };
  const h = (r) => { const s = JSON.stringify(r); let x = 5381; for (let i = 0; i < s.length; i++) x = (Math.imul(x, 33) ^ s.charCodeAt(i)) >>> 0; return x; };
  const one = (e) => [null, '::before', '::after'].map((p) => ser(getComputedStyle(e, p)));
  if (full) return full.map((i) => one(els[i]));
  return els.map((e) => [e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/).join('.') : ''), ...one(e).map(h)]);
}"""


def props(r):
    return dict(r)


async def main():
    a, b, *pages = sys.argv[1:]
    if not pages:
        sm = urllib.request.urlopen(b + '/sitemap.xml').read().decode()
        pages = [re.sub(r'^https?://[^/]+', '', u) or '/' for u in re.findall(r'<loc>([^<]+)</loc>', sm)] + ['/soon', '/no-such-page']
    diffs = 0
    gate = asyncio.Semaphore(6)   # pages at a time

    async def settled(pg, url):
        """the page's styles once two readings half a second apart agree (scripts finish their setup late under load)"""
        await pg.goto(url, wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        last = await pg.evaluate(PROBE, None)
        for _ in range(20):
            await pg.wait_for_timeout(500)
            now = await pg.evaluate(PROBE, None)
            if now == last:
                return now
            last = now
        return last

    # one browser context per page pair
    async def compare(br, w, h, path):
        async with gate:
            ctx = await br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce', bypass_csp=True)
            pa, pb = await ctx.new_page(), await ctx.new_page()
            ea, eb = await asyncio.gather(settled(pa, a + path), settled(pb, b + path))
            out = []
            if [e[0] for e in ea] != [e[0] for e in eb]:
                out.append(f'{w}x{h} {path}: the pages differ in markup ({len(ea)} vs {len(eb)} elements); compare the HTML first')
                n = 1
            else:
                bad = [i for i, (x, y) in enumerate(zip(ea, eb)) if x[1:] != y[1:]]
                n = len(bad)
                if bad:
                    fa, fb = await asyncio.gather(pa.evaluate(PROBE, bad[:20]), pb.evaluate(PROBE, bad[:20]))
                    out.append(f'{w}x{h} {path}: {len(bad)} element(s) differ')
                    for i, x, y in zip(bad, fa, fb):
                        for part, sx, sy in zip(('', '::before', '::after'), x, y):
                            px, py = props(sx), props(sy)
                            ch = [f'{k}: {px.get(k)} -> {py.get(k)}' for k in sorted(set(px) | set(py)) if px.get(k) != py.get(k)]
                            if ch:
                                out.append(f'    {ea[i][0]}{part}: ' + '; '.join(ch[:6]) + (' …' if len(ch) > 6 else ''))
            await ctx.close()
            if out: print('\n'.join(out), flush=True)
            return n

    async with async_playwright() as p:
        br = await p.chromium.launch()
        for w, h in SIZES:
            diffs += sum(await asyncio.gather(*(compare(br, w, h, path) for path in pages)))
            print(f'{w}x{h}: {len(pages)} pages compared', flush=True)
        await br.close()
    print(f'{diffs} difference(s)')
    sys.exit(1 if diffs else 0)

asyncio.run(main())
