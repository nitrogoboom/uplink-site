# Text size check (WCAG 1.4.4 with technique G178, the Settings pop-up): every page at every size with the text at
# 200% (localStorage uplink.text, as the pop-up saves it), looking for what W3C's failure F69 names: text that is
# clipped (partly cut by a box that hides its overflow), overlapping (drawn over other text), or out of reach (above
# or left of the page, where nothing scrolls to it), and sideways scroll. Pages are read as they load, and Home also
# at seven points down the tower's scroll story (more near its end, where the stage lets go); a label that only slides in on hover (home services' "View service")
# is not seen in its shown state. Text in drawings (SVG), hidden and screen-reader-only text, and things faded out
# (the tower's inactive steps) are left out. Text in a bar (the sticky header, the phone tab bar) is checked against
# its own bar only, not against the page that scrolls under it; a fixed bar's text is also checked against the
# screen's edges.
# Exits 1 on any finding.
# usage: npm run build && npm run serve   (wrangler dev on 8787)   then   python tools/verify_text.py [port] [--text 2]
#   --text 1 runs the same check at the default size (it should find nothing: a check on the check)
import asyncio, sys
from playwright.async_api import async_playwright
from site_pages import SIZES, pages

args = sys.argv[1:]
TEXT = args[args.index('--text') + 1] if '--text' in args else '2'
port = next((a for a in args if a.isdigit() and a != TEXT), '8787')
base = f'http://localhost:{port}'
LANES = 6

PROBE = """() => {
  const out = { clip: [], over: [], away: [], sideways: document.documentElement.scrollWidth - innerWidth };
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  // the bar a text sits in, if any: the sticky header or a fixed bar (the phone tab bar), which the page scrolls under
  const layer = (el) => el.closest('.site-header') || (fixed(el) ? 'fixed' : null);
  const fixed = (el) => { for (let a = el; a; a = a.parentElement) if (getComputedStyle(a).position === 'fixed') return true; return false; };
  const skip = (el) => {
    if (el.closest('svg, script, style, template, dialog:not([open]), .sr-only, .toasts, .skip-link')) return true;
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return true;
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (+cs.opacity < 0.05) return true;
      if (a.offsetWidth <= 1 && a.offsetHeight <= 1 && cs.overflow !== 'visible') return true;   // a 1px screen-reader clip
      if (cs.clipPath && cs.clipPath.startsWith('inset(50%')) return true;
    }
    return false;
  };
  const boxes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.nodeValue.trim() ? 1 : 2) });
  for (let n, i = 0; (n = walk.nextNode()); i++) {
    const el = n.parentElement;
    if (!el || skip(el)) continue;
    const r = document.createRange(); r.selectNodeContents(n);
    const fx = fixed(el), ly = layer(el);
    for (const b of r.getClientRects()) if (b.width > 2 && b.height > 2) boxes.push({ n: i, el, b, fx, ly, t: n.nodeValue.trim().slice(0, 28) });
  }
  const sy = scrollY, sx = scrollX;
  for (const x of boxes) {
    // out of reach: above or left of the page's start (a fixed bar's text: off the screen)
    if (x.fx ? x.b.top < -2 || x.b.left < -2 || x.b.right > innerWidth + 2 || x.b.bottom > innerHeight + 2 : x.b.top + sy < -2 || x.b.left + sx < -2) out.away.push(`${name(x.el)} "${x.t}" at ${Math.round(x.b.left + sx)},${Math.round(x.b.top + sy)}`);
    // clipped: a box between the text and the page hides overflow and the text runs past its edge. Text wholly
    // outside the box is tucked away on purpose (a label that slides in on hover or focus), not cut: left out
    for (let a = x.el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const hx = /hidden|clip/.test(cs.overflowX), hy = /hidden|clip/.test(cs.overflowY);
      if (!hx && !hy) continue;
      const c = a.getBoundingClientRect();
      if (x.b.right <= c.left || x.b.left >= c.right || x.b.bottom <= c.top || x.b.top >= c.bottom) break;
      const past = Math.max(hx ? Math.max(c.left - x.b.left, x.b.right - c.right) : 0, hy ? Math.max(c.top - x.b.top, x.b.bottom - c.bottom) : 0);
      if (past > 2) { out.clip.push(`${name(x.el)} "${x.t}" cut ${Math.round(past)}px by ${name(a)}`); break; }
    }
  }
  // overlapping: the middle of two lines of text (the top and bottom quarter are left out: glyph boxes are taller than
  // tight line-heights, so lines of one heading touch there without the letters meeting)
  const core = (b) => ({ l: b.left, r: b.right, t: b.top + b.height * 0.25, b: b.bottom - b.height * 0.25 });
  for (let i = 0; i < boxes.length; i++) {
    const A = boxes[i], a = core(A.b);
    for (let j = i + 1; j < boxes.length; j++) {
      const B = boxes[j];
      // the same text node's own lines, or a bar and the page: content scrolls under the header and tab bar by design
      if (A.n === B.n || A.ly !== B.ly) continue;
      const b = core(B.b);
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 2 && h > 2) out.over.push(`${name(A.el)} "${A.t}" / ${name(B.el)} "${B.t}"`);
    }
  }
  return out;
}"""


async def main():
    paths = pages(base)
    lim = asyncio.Semaphore(LANES)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        async def one(path, n, w, h):
            async with lim:
                ctx = await b.new_context(viewport={'width': w, 'height': h})
                await ctx.add_init_script(f"try {{ localStorage.setItem('uplink.text', '{TEXT}') }} catch (e) {{}}")
                pg = await ctx.new_page()
                await pg.goto(base + path, wait_until='networkidle')
                await pg.wait_for_timeout(600)
                r = await pg.evaluate(PROBE)
                # the home tower is a scroll story: its tags and steps show only part way down, so read it there too
                stops = await pg.evaluate(
                    "(() => { const g = document.querySelector('.grow'); if (!g) return []; const t = g.getBoundingClientRect().top + scrollY; return [0.1, 0.3, 0.5, 0.7, 0.85, 0.92, 0.97].map((f) => t + g.offsetHeight * f - innerHeight * 0.3); })()"
                )
                for y in stops:
                    await pg.evaluate(f'window.scrollTo(0, {y})')
                    await pg.wait_for_timeout(700)
                    s = await pg.evaluate(PROBE)
                    for k in ('clip', 'over'):
                        r[k] += [f'(scrolled to the tower) {x}' for x in s[k] if x not in r[k]]
                await ctx.close()
                found = [f'{len(r[k])} {k}' for k in ('clip', 'over', 'away') if r[k]] + (
                    [f'{r["sideways"]}px sideways'] if r['sideways'] > 0 else []
                )
                lines = [f'{path:28} {n:6} ' + (', '.join(found) if found else 'ok')]
                for k in ('clip', 'over', 'away'):
                    lines += [f'    {k}: {x}' for x in r[k][:4]] + (
                        [f'    {k}: … {len(r[k]) - 4} more'] if len(r[k]) > 4 else []
                    )
                return lines, bool(found)

        results = await asyncio.gather(*(one(path, *s) for path in paths for s in SIZES))
        await b.close()
    print(f'text at {float(TEXT):.0%}\n' + '\n'.join(l for lines, _ in results for l in lines))
    bad = sum(f for _, f in results)
    print(f'\n{bad} of {len(results)} page sizes with findings' if bad else '\nall clear')
    sys.exit(1 if bad else 0)


asyncio.run(main())
