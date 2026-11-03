# Site checks against the built site. Home (the page being worked on, FOCUS) gets everything: hero, tower, footer
# tabs, sideways scroll at every size, and an axe accessibility pass at phone and desktop (axe-core from node_modules:
# run npm install first). Every other page (the served sitemap.xml, plus soon and the 404 page) gets a quick look:
# loaded once at phone size for script errors and sideways scroll. --all gives every page the full treatment.
# Exits 1 on any script error (console error, uncaught error, a CSP or Trusted Types block), a hero tile that
# doesn't answer hover, a tower that doesn't grow, a footer tab at 1440x900 that isn't one screen tall or whose panel
# overflows, sideways scroll, a header whose tabs come within 8px of the logo or buttons (or scroll) at any width
# from 320 to 1440 in 10px steps and on wider screens, at the default and 200% text, anything serious or critical
# from axe, or a sitemap with fewer than five pages.
# CI runs it on every push and pull request before deploy (.github/workflows/site.yml).
# usage: npm run build && npm run serve   (wrangler dev on 8787)   then   python tools/verify_footer.py out/ [port] [--all]
import asyncio, sys
from playwright.async_api import async_playwright
from site_pages import MISSING, SIZES, pages

ALL = '--all' in sys.argv
args = [a for a in sys.argv[1:] if a != '--all']
base = 'http://localhost:' + (args[1] if len(args) > 1 else '8787')
out = args[0]
AXE = 'node_modules/axe-core/axe.min.js'
PAGES = [p.strip('/') or 'index' for p in pages(base)]  # 'index', 'services', … 'soon', MISSING
url = lambda page: f"{base}/{'' if page=='index' else page}"
FOCUS = {'index'}  # pages checked in full; the rest get the quick look unless --all
full = lambda page: ALL or page in FOCUS
fails = []
LANES = 6  # pages checked at once


def watch(pg, where, errs):
    # Chromium reports a CSP or Trusted Types block as a console error, and a script crash as a page error
    def console(m):
        if m.type != 'error':
            return
        # the 404 page's own status is the point of that page, not an error
        if (
            where.startswith(MISSING)
            and m.location.get('url', '').rstrip('/').endswith(MISSING)
            and 'status of 404' in m.text
        ):
            return
        errs.append(f'{where}: console: {m.text}')

    pg.on('console', console)
    pg.on('pageerror', lambda e: errs.append(f'{where}: page error: {e}'))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        rep = []
        errs = []
        pg = await b.new_page(viewport={'width': 1440, 'height': 900})
        watch(pg, 'index 1440 (hero, tower, footer)', errs)
        await pg.goto(base + '/')
        await pg.wait_for_timeout(5500)
        # hover a tile three along from the one showing, so the cloud's own timer can't have got there first
        tiles = await pg.eval_on_selector_all('.ob-tile', 't=>t.map(x=>[x.dataset.tile,x.classList.contains("is-on")])')
        on = next((i for i, (_, o) in enumerate(tiles) if o), 0)
        want = tiles[(on + 3) % len(tiles)][0]
        before = await pg.eval_on_selector('.ob-app', 'e=>e.textContent')
        await (await pg.query_selector(f'.ob-tile[data-tile="{want}"]')).hover(force=True)
        await pg.wait_for_timeout(500)
        after = await pg.eval_on_selector('.ob-app', 'e=>e.textContent')
        lit = await pg.eval_on_selector(f'.ob-tile[data-tile="{want}"]', 'e=>e.classList.contains("is-on")')
        rep.append(f"hero tile hover ({want}): {before} -> {after}")
        if not lit or after == before:
            fails.append(f'hero: hovering the {want} tile did not show it ({before} -> {after})')
        steps = await pg.eval_on_selector_all('.grow-step[data-floors]', 's=>s.map(x=>x.dataset.floors)')
        # the stage pins, so walk down the section a little at a time and note each floor count the tower reaches
        seen = await pg.evaluate(
            """async()=>{const g=document.querySelector('.grow'),top=g.getBoundingClientRect().top+scrollY,seen=[];
          for(let y=top-innerHeight;y<top+g.offsetHeight;y+=60){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,120));
            const f=document.querySelector('svg.tg').getAttribute('data-floors');if(f&&f!==seen[seen.length-1])seen.push(f)}
          return seen}"""
        )
        rep.append(f"tower floors {','.join(steps)} -> {','.join(seen)}")
        if not steps or seen != steps:
            fails.append(f"tower: floors {','.join(seen)}, expected {','.join(steps)}")
        # footer behaviour on home at 1440
        await pg.eval_on_selector('#footer', 'e=>e.scrollIntoView()')
        await pg.wait_for_timeout(400)
        tabs = await pg.eval_on_selector_all('.fc-tile', 't=>t.map(x=>x.id)')
        if not tabs:
            fails.append('footer: no tabs (.fc-tile) found')
        for i, t in enumerate(tabs):
            await pg.click('#' + t)
            await pg.wait_for_timeout(850)
            info = await pg.evaluate(
                """()=>{const f=document.getElementById('footer');const p=document.querySelector('.fc-panel.is-on');const s=document.querySelector('.fc-panels');
              return {h:f.offsetHeight, fold:innerHeight-document.querySelector('.site-header').offsetHeight, panel:p.id, map:p.dataset.map, over: s.scrollHeight-s.clientHeight, hud: document.querySelector('.fc-hud b').textContent, vb: document.querySelector('svg.fc-w').getAttribute('viewBox')}}"""
            )
            rep.append(f"tab {t}: {info}")
            if abs(info['h'] - info['fold']) > 1:
                fails.append(
                    f"footer tab {t} at 1440: {info['h']}px tall, the screen below the header is {info['fold']}px"
                )
            if info['over'] > 0:
                fails.append(f"footer tab {t} at 1440: panel overflows by {info['over']}px")
            await pg.screenshot(path=f'{out}/f-1440-{i}.png')
        await pg.keyboard.press('ArrowRight')
        await pg.wait_for_timeout(300)
        rep.append(
            'arrow key -> '
            + await pg.evaluate("document.activeElement.id + ' / ' + document.querySelector('.fc-panel.is-on').id")
        )
        await pg.close()
        # header fit: at every 10px from 320 to 1440 (and four wider screens), at the default and the biggest text size,
        # the tabs keep 8px clear of the logo and the buttons and don't scroll, and nothing scrolls sideways. Room for a
        # new header button has to be made in bottom-nav.css (its measured rules), not found here later.
        for text in ('', '2'):
            ctx = await b.new_context()
            await ctx.add_init_script(f"try{{localStorage.setItem('uplink.text','{text}')}}catch(e){{}}")
            q = await ctx.new_page()
            await q.set_viewport_size({'width': 1440, 'height': 900})
            await q.goto(url('about'))
            worst = None
            for w in [*range(320, 1441, 10), 1600, 1920, 2560, 3440]:
                await q.set_viewport_size({'width': w, 'height': 900})
                await q.wait_for_timeout(60)
                r = await q.evaluate(
                    """()=>{const t=document.querySelector('.tabs'),u=t.querySelector('ul').getBoundingClientRect(),b=document.querySelector('.brand').getBoundingClientRect(),a=document.querySelector('.hdr-actions').getBoundingClientRect();
                  const on=getComputedStyle(t).display!=='none';return {room:Math.round(on?Math.min(u.left-b.right,a.left-u.right):a.left-b.right),cut:on?t.scrollWidth-t.clientWidth:0,side:document.documentElement.scrollWidth-innerWidth}}"""
                )
                if worst is None or r['room'] < worst[1]:
                    worst = (w, r['room'])
                if r['room'] < 8 or r['cut'] > 0 or r['side'] > 0:
                    fails.append(
                        f"header at {w}px, text {text or 'default'}: {r['room']}px room, tabs cut {r['cut']}px, sideways {r['side']}px"
                    )
            rep.append(f"header fit, text {text or 'default'}: tightest {worst[1]}px at {worst[0]}px wide")
            await ctx.close()
        # each page at its sizes, a few at a time (each page gets its own tab, so they can't disturb each other)
        lim = asyncio.Semaphore(LANES)

        async def sized(page, n, w, h):
            async with lim:
                q = await b.new_page(viewport={'width': w, 'height': h})
                watch(q, f'{page} {n}', errs)
                # Home: long enough for the hero's first two captions (about 3.3s and 4.4s in), whose script errors
                # would otherwise come after the check had moved on
                await q.goto(url(page))
                await q.wait_for_timeout(5000 if page == 'index' else 700)
                await q.eval_on_selector('#footer', 'e=>e.scrollIntoView()')
                await q.wait_for_timeout(500)
                r = await q.evaluate(
                    """()=>{const f=document.getElementById('footer'); const s=document.querySelector('.fc-panels');
                  return [document.documentElement.scrollWidth-innerWidth, f.offsetHeight, s.scrollHeight-s.clientHeight, f.classList.contains('fc-js')]}"""
                )
                if r[0] > 0:
                    fails.append(f'{page} {n}: {r[0]}px sideways scroll')
                if page in ('soon', 'index'):
                    await q.screenshot(path=f'{out}/f-{page}-{n}.png')
                await q.close()
                return f"{page:22} {n:6} overflowX {r[0]} footer h {r[1]} panel overflow {r[2]} js {r[3]}"

        rep.extend(
            await asyncio.gather(*(sized(page, *s) for page in PAGES for s in (SIZES if full(page) else SIZES[:1])))
        )
        rep.append(f"script errors: {len(errs) or 'none'}")
        fails.extend(errs)
        # axe: the page's CSP blocks an injected script, so this context bypasses it (the site's own scripts still run)
        ctx = await b.new_context(bypass_csp=True)

        async def axed(page, n, w, h):
            async with lim:
                q = await ctx.new_page()
                await q.set_viewport_size({'width': w, 'height': h})
                await q.goto(url(page))
                await q.wait_for_timeout(1500)
                await q.add_script_tag(path=AXE)
                v = await q.evaluate(
                    """async()=>(await axe.run(document,{resultTypes:['violations']})).violations.map(v=>({id:v.id,impact:v.impact,help:v.help,
                  nodes:v.nodes.slice(0,4).map(x=>x.target.join(' ')+(x.any[0]?' · '+x.any[0].message:''))}))"""
                )
                await q.close()
                serious = [x for x in v if x['impact'] in ('serious', 'critical')]
                fails.extend(f"axe {page} {n}: [{x['impact']}] {x['id']}" for x in serious)
                return [f"axe {page:22} {n:6} {len(v)} violation(s), {len(serious)} serious/critical"] + [
                    f"    [{x['impact']}] {x['id']}: {x['help']}\n      " + '\n      '.join(x['nodes']) for x in v
                ]

        for lines in await asyncio.gather(
            *(axed(page, *s) for page in PAGES if full(page) for s in [['phone', 390, 844], ['1440', 1440, 900]])
        ):
            rep.extend(lines)
        await ctx.close()
        print('\n'.join(rep))
        await b.close()
        if fails:
            print(f'\nFAILED ({len(fails)}):\n  ' + '\n  '.join(fails))
            sys.exit(1)
        print('\nall checks passed')


asyncio.run(main())
