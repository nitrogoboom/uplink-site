"""Share picture and home-screen icon.

    python tools/gen_og.py public

Writes `public/assets/img/og.png` (1200x630, the link preview on social sites and
chat apps) and `public/apple-touch-icon.png` (180x180, at the site root, where
iPhones look for it). Both are screenshots of a small page built from the site's
tokens (src/styles/tokens.css), fonts and the office drawing, so they follow the
site when it changes. Needs Playwright and the internet (Google Fonts).
"""
import asyncio
import pathlib
import sys

from playwright.async_api import async_playwright

site = pathlib.Path(sys.argv[1]).resolve()
assets = (site / 'assets').as_uri()
tokens = (pathlib.Path(__file__).resolve().parent.parent / 'src' / 'styles' / 'tokens.css').as_uri()

HEAD = f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&amp;family=Barlow+Condensed:ital,wght@0,600;0,700;1,600;1,700&amp;display=swap">
<link rel="stylesheet" href="{tokens}">
<style>
  * {{ margin: 0; box-sizing: border-box; }}
  body {{ background: var(--c-bg); color: var(--c-text); font-family: var(--font-body); overflow: hidden; }}
  .mark {{ display: grid; place-items: center; background: var(--c-accent); color: var(--c-on-accent); }}
  .mark svg {{ fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }}
</style>'''

MARK = '<svg viewBox="0 0 24 24"><path d="M5 14l7-7 7 7"/><path d="M8.5 19l3.5-3.5 3.5 3.5"/></svg>'

OG = HEAD + f'''<style>
  body {{ width: 1200px; height: 630px; position: relative;
          background: radial-gradient(640px 420px at 880px 330px, var(--c-glow-sky), transparent 70%), var(--c-bg); }}
  .brand {{ position: absolute; left: 72px; top: 64px; display: flex; align-items: center; gap: 16px; }}
  .brand .mark {{ width: 56px; height: 56px; border-radius: 12px; }}
  .brand .mark svg {{ width: 34px; height: 34px; }}
  .name {{ font-family: var(--font-display); font-weight: 700; font-style: italic; text-transform: uppercase; font-size: 40px; line-height: 1; }}
  .sub {{ font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--c-muted); margin-top: 6px; }}
  .copy {{ position: absolute; left: 72px; top: 214px; width: 500px; }}
  .eyebrow {{ font-size: 18px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--c-muted); }}
  .eyebrow::before {{ content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--c-accent); margin-right: 12px; vertical-align: 2px; }}
  h1 {{ font-family: var(--font-display); font-weight: 700; font-style: italic; text-transform: uppercase; font-size: 86px; line-height: 0.92; margin-top: 18px; }}
  h1 em {{ display: block; color: var(--c-accent); }}
  .lead {{ font-size: 24px; color: var(--c-muted); margin-top: 26px; }}
  .art {{ position: absolute; right: 20px; top: 75px; width: 580px; height: 480px; object-fit: contain; }}
</style>
<div class="brand"><span class="mark">{MARK}</span><div><div class="name">Uplink</div><div class="sub">Technology management</div></div></div>
<div class="copy"><p class="eyebrow">Managed IT · Ontario</p><h1>Your IT team, <em>always online</em></h1>
<p class="lead">Help desk, security, cloud, networks and phones.</p></div>
<img class="art" src="{assets}/img/office-compact.svg?card#plain" alt="">'''

ICON = HEAD + f'''<style>
  body {{ width: 180px; height: 180px; }}
  .mark {{ width: 180px; height: 180px; }}
  .mark svg {{ width: 124px; height: 124px; }}
</style>
<div class="mark">{MARK}</div>'''


async def shoot(b, html, w, h, out):
    tmp = site.parent / 'out' / (out.stem + '.html')
    tmp.parent.mkdir(exist_ok=True)
    tmp.write_text(html, encoding='utf-8')
    pg = await b.new_page(viewport={'width': w, 'height': h})
    await pg.goto(tmp.as_uri())
    await pg.evaluate('document.fonts.ready')
    await pg.wait_for_timeout(500)
    await pg.screenshot(path=str(out))
    await pg.close()
    print(out.relative_to(site.parent))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--allow-file-access-from-files'])
        await shoot(b, OG, 1200, 630, site / 'assets' / 'img' / 'og.png')
        await shoot(b, ICON, 180, 180, site / 'apple-touch-icon.png')
        await b.close()

asyncio.run(main())
