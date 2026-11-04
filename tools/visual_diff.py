"""Screenshot comparison: every page of the new build next to the old one, at phone, tablet and desktop, pixel by
pixel. CI runs it on each pull request (new: the PR's build; old: the live site, i.e. main) and lists what changed
in the run's summary, with the pictures as an artifact. It reports; it doesn't fail the build, because most changes
are meant. A person looks at the list and says whether each one was.

usage: python tools/visual_diff.py OLD_URL NEW_URL [--strict]     (--strict exits 1 if anything changed)

Drawings, photos and the footer map are masked (painted over in both shots): their animation frames differ run to
run. Reduce Motion is on, so the page itself holds still. Writes out/visual/report.md and, for each page and size
that changed, old, new and diff pictures (the diff shows changed pixels in red over a faded new shot).
"""

import asyncio, sys
from pathlib import Path
from PIL import Image, ImageChops
from playwright.async_api import async_playwright
from site_pages import pages

ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
OLD, NEW = ARGS[0].rstrip('/'), ARGS[1].rstrip('/')
STRICT = '--strict' in sys.argv
SIZES = [('phone', 390, 844), ('tablet', 820, 1180), ('1440', 1440, 900)]
MASK = 'img, picture, svg, video, canvas, .stage'  # anything that animates or loads its own picture
OUT = Path('out/visual')
NOISE = 24  # a channel difference below this is anti-aliasing, not a change
LANES = 4


async def shot(ctx, url, file):
    pg = await ctx.new_page()
    await pg.goto(url)
    await pg.evaluate('document.fonts.ready')
    await pg.wait_for_timeout(800)
    await pg.screenshot(path=str(file), full_page=True, caret='initial', animations='disabled', mask=[pg.locator(MASK)])
    await pg.close()


def compare(a_file, b_file, diff_file):
    """(share of pixels changed, box, note). Pages of different heights are compared over the shorter one."""
    a, b = Image.open(a_file).convert('RGB'), Image.open(b_file).convert('RGB')
    note = f'height {a.height} -> {b.height}px' if a.height != b.height else ''
    h, w = min(a.height, b.height), min(a.width, b.width)
    a, b = a.crop((0, 0, w, h)), b.crop((0, 0, w, h))
    d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > NOISE else 0)
    box = d.getbbox()
    if not box and not note:
        return 0, None, ''
    changed = sum(1 for v in d.getdata() if v) / (w * h) if box else 0
    red = Image.new('RGB', (w, h), (230, 40, 40))
    Image.composite(red, Image.blend(b, Image.new('RGB', (w, h), 'white'), 0.6), d).save(diff_file)
    return changed, box, note


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob('*.png'):
        f.unlink()
    paths = pages(NEW)
    rows, lim = [], asyncio.Semaphore(LANES)
    async with async_playwright() as p:
        b = await p.chromium.launch()

        async def one(path, size, w, h):
            async with lim:
                ctx = await b.new_context(viewport={'width': w, 'height': h}, reduced_motion='reduce')
                name = f"{path.strip('/').replace('/', '_') or 'index'}-{size}"
                old, new = OUT / f'{name}-old.png', OUT / f'{name}-new.png'
                await shot(ctx, OLD + path, old)
                await shot(ctx, NEW + path, new)
                await ctx.close()
                changed, box, note = compare(old, new, OUT / f'{name}-diff.png')
                if not box and not note:
                    old.unlink()
                    new.unlink()
                    return None
                where = f'from {box[1]}px down to {box[3]}px' if box else ''
                return f"| {path} | {size} | {changed:.2%} | {', '.join(x for x in (where, note) if x)} |"

        rows = [r for r in await asyncio.gather(*(one(path, *s) for path in paths for s in SIZES)) if r]
        await b.close()
    head = f'## Screenshot changes\n\n{OLD} (old) against {NEW} (new), {len(paths)} pages at {len(SIZES)} sizes.\n\n'
    if rows:
        body = '| Page | Size | Pixels changed | Where |\n| --- | --- | --- | --- |\n' + '\n'.join(rows)
        body += '\n\nPictures (old, new, diff in red) are in the `visual-diff` artifact of this run.\n'
    else:
        body = 'No visible change on any page.\n'
    (OUT / 'report.md').write_text(head + body, encoding='utf-8')
    print(head + body)
    sys.exit(1 if STRICT and rows else 0)


asyncio.run(main())
