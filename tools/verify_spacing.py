# Off-scale spacing on the built site: every margin, padding and gap that ends up on screen must be a step of the
# space scale (--sp-1 to --sp-9, read from tokens.css) or 0. Stylelint catches a raw value in our CSS; this catches
# the rest: browser defaults nobody reset (a <dl>'s 1em margin, a <button>'s 1px padding) and calc() sums that land
# between steps. Rules: spacing.md. Exits 1 on anything off scale.
# usage: npm run build && npm run serve   (wrangler dev on 8787)   then   python tools/verify_spacing.py [BASE_URL] [page ...]
# Pages default to the sitemap plus /soon and a 404; sizes are verify_footer.py's four. Values print as px at a 16px
# root, so a fixed 1px reads 0.62px on the 3440 screen (25.6px root).
import asyncio, re, sys
from playwright.async_api import async_playwright
from site_pages import SIZES, pages as site_pages

SCALE = [0] + [float(v) * 16 for v in re.findall(r'--sp-\d:\s*([\d.]+)rem', open('src/styles/tokens.css').read())]
if len(SCALE) < 2: sys.exit('no --sp-* steps in rem found in src/styles/tokens.css: update the SCALE pattern')
# selector -> why it may sit off the scale. Keep this short; fix the CSS instead where you can.
SKIP = {
    '.sr-only': 'the 1px clip',
    '.fc-cl--two svg': 'optical nudge onto the first text line (footer.css)',
    'select.input': 'room for the arrow: --sp-4 + --icon + --sp-2 (forms.css)',
    '.mi-go': 'margin-left: auto pushes the arrow to the end of its row (home/hero.css)',
    '.svc-hint': 'pulled up under the swiping cards by their bottom padding: -(--sp-4 + --sp-8) (home/services.css)',
}
PROPS = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'rowGap', 'columnGap']
# values above the biggest step are layout (auto margins, a scroll track sized in svh), not spacing
PROBE = """([scale, props, skip]) => {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16, max = Math.max(...scale) * rem, out = [];
  const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/).join('.') : '');
  for (const e of document.body.querySelectorAll('*')) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
    if (skip.some((s) => e.matches(s))) continue;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.display === 'contents') continue;
    const centred = Math.abs(parseFloat(cs.marginLeft) - parseFloat(cs.marginRight)) < 0.1;   // margin-inline: auto
    for (const p of props) {
      const v = Math.abs(parseFloat(cs[p]));
      if (!v || v > max * 1.01 || (centred && /margin(Left|Right)/.test(p))) continue;
      if (!scale.some((s) => Math.abs(v - s * rem) < 0.05)) out.push([name(e), p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), Math.round(v / rem * 100) / 100]);
    }
  }
  return out;
}"""


async def main():
    args = sys.argv[1:]
    base = args.pop(0) if args and args[0].startswith('http') else 'http://localhost:8787'
    pages = args
    if not pages:
        pages = site_pages(base)
    found = {}   # element -> {property: values}, and the pages and sizes it shows on
    gate = asyncio.Semaphore(6)
    async with async_playwright() as p:
        br = await p.chromium.launch()

        async def one(path, n, w, h):
            async with gate:
                ctx = await br.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce')
                pg = await ctx.new_page()
                await pg.goto(base + path, wait_until='networkidle')
                for el, prop, v in await pg.evaluate(PROBE, [SCALE, PROPS, list(SKIP)]):
                    f = found.setdefault(el, [{}, set()])
                    f[0].setdefault(prop, set()).add(v)
                    f[1].add(f'{n} {path}')
                await ctx.close()
        await asyncio.gather(*[one(pa, n, w, h) for pa in pages for n, w, h in SIZES])
        await br.close()
    for el in sorted(found):
        props, where = found[el][0], sorted(found[el][1])
        print(el + ': ' + ', '.join(f'{p} {"/".join(f"{v:g}" for v in sorted(vs))}px' for p, vs in sorted(props.items())))
        print(f'    on {len(where)}: {", ".join(where[:4])}{" ..." if len(where) > 4 else ""}')
    print(f'{len(found)} element(s) off scale on {len(pages)} pages x {len(SIZES)} sizes' if found else 'spacing: all on scale')
    sys.exit(1 if found else 0)

asyncio.run(main())
