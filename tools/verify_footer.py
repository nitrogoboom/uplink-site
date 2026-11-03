# Site checks against the built site: hero, tower, footer and sideways scroll at every size, then an axe
# accessibility pass on every page at phone and desktop (axe-core from node_modules: run npm install first).
# Pages: every address in the served sitemap.xml, plus soon and the 404 page.
# Exits 1 on any script error (console error, uncaught error, a CSP or Trusted Types block), a hero tile that
# doesn't answer hover, a tower that doesn't grow, a footer tab at 1440x900 that isn't one screen tall or whose panel
# overflows, sideways scroll, anything serious or critical from axe, or a sitemap with fewer than five pages.
# CI runs it on every push and pull request before deploy (.github/workflows/site.yml).
# usage: npm run build && npm run serve   (wrangler dev on 8787)   then   python tools/verify_footer.py out/ [port]
import asyncio, sys
from playwright.async_api import async_playwright
from site_pages import MISSING, SIZES, pages
base='http://localhost:'+(sys.argv[2] if len(sys.argv)>2 else '8787'); out=sys.argv[1]
AXE='node_modules/axe-core/axe.min.js'
PAGES=[p.strip('/') or 'index' for p in pages(base)]   # 'index', 'services', … 'soon', MISSING
url=lambda page: f"{base}/{'' if page=='index' else page}"
fails=[]

def watch(pg, where, errs):
    # Chromium reports a CSP or Trusted Types block as a console error, and a script crash as a page error
    def console(m):
        if m.type!='error': return
        # the 404 page's own status is the point of that page, not an error
        if where.startswith(MISSING) and m.location.get('url','').rstrip('/').endswith(MISSING) and 'status of 404' in m.text: return
        errs.append(f'{where}: console: {m.text}')
    pg.on('console',console)
    pg.on('pageerror',lambda e: errs.append(f'{where}: page error: {e}'))

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); rep=[]; errs=[]
        pg=await b.new_page(viewport={'width':1440,'height':900}); watch(pg,'index 1440 (hero, tower, footer)',errs)
        await pg.goto(base+'/'); await pg.wait_for_timeout(5500)
        # hover a tile three along from the one showing, so the cloud's own timer can't have got there first
        tiles=await pg.eval_on_selector_all('.ob-tile','t=>t.map(x=>[x.dataset.tile,x.classList.contains("is-on")])')
        on=next((i for i,(_,o) in enumerate(tiles) if o),0); want=tiles[(on+3)%len(tiles)][0]
        before=await pg.eval_on_selector('.ob-app','e=>e.textContent')
        await (await pg.query_selector(f'.ob-tile[data-tile="{want}"]')).hover(force=True); await pg.wait_for_timeout(500)
        after=await pg.eval_on_selector('.ob-app','e=>e.textContent')
        lit=await pg.eval_on_selector(f'.ob-tile[data-tile="{want}"]','e=>e.classList.contains("is-on")')
        rep.append(f"hero tile hover ({want}): {before} -> {after}")
        if not lit or after==before: fails.append(f'hero: hovering the {want} tile did not show it ({before} -> {after})')
        steps=await pg.eval_on_selector_all('.grow-step[data-floors]','s=>s.map(x=>x.dataset.floors)')
        # the stage pins, so walk down the section a little at a time and note each floor count the tower reaches
        seen=await pg.evaluate("""async()=>{const g=document.querySelector('.grow'),top=g.getBoundingClientRect().top+scrollY,seen=[];
          for(let y=top-innerHeight;y<top+g.offsetHeight;y+=60){window.scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,120));
            const f=document.querySelector('svg.tg').getAttribute('data-floors');if(f&&f!==seen[seen.length-1])seen.push(f)}
          return seen}""")
        rep.append(f"tower floors {','.join(steps)} -> {','.join(seen)}")
        if not steps or seen!=steps: fails.append(f"tower: floors {','.join(seen)}, expected {','.join(steps)}")
        # footer behaviour on home at 1440
        await pg.eval_on_selector('#footer','e=>e.scrollIntoView()'); await pg.wait_for_timeout(400)
        tabs=await pg.eval_on_selector_all('.fc-tile','t=>t.map(x=>x.id)')
        if not tabs: fails.append('footer: no tabs (.fc-tile) found')
        for i,t in enumerate(tabs):
            await pg.click('#'+t); await pg.wait_for_timeout(850)
            info=await pg.evaluate("""()=>{const f=document.getElementById('footer');const p=document.querySelector('.fc-panel.is-on');const s=document.querySelector('.fc-panels');
              return {h:f.offsetHeight, fold:innerHeight-document.querySelector('.site-header').offsetHeight, panel:p.id, map:p.dataset.map, over: s.scrollHeight-s.clientHeight, hud: document.querySelector('.fc-hud b').textContent, vb: document.querySelector('svg.fc-w').getAttribute('viewBox')}}""")
            rep.append(f"tab {t}: {info}")
            if abs(info['h']-info['fold'])>1: fails.append(f"footer tab {t} at 1440: {info['h']}px tall, the screen below the header is {info['fold']}px")
            if info['over']>0: fails.append(f"footer tab {t} at 1440: panel overflows by {info['over']}px")
            await pg.screenshot(path=f'{out}/f-1440-{i}.png')
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(300)
        rep.append('arrow key -> '+await pg.evaluate("document.activeElement.id + ' / ' + document.querySelector('.fc-panel.is-on').id"))
        await pg.close()
        for page in PAGES:
            for n,w,h in SIZES:
                q=await b.new_page(viewport={'width':w,'height':h}); watch(q,f'{page} {n}',errs)
                await q.goto(url(page)); await q.wait_for_timeout(700)
                await q.eval_on_selector('#footer','e=>e.scrollIntoView()'); await q.wait_for_timeout(500)
                r=await q.evaluate("""()=>{const f=document.getElementById('footer'); const s=document.querySelector('.fc-panels');
                  return [document.documentElement.scrollWidth-innerWidth, f.offsetHeight, s.scrollHeight-s.clientHeight, f.classList.contains('fc-js')]}""")
                rep.append(f"{page:22} {n:6} overflowX {r[0]} footer h {r[1]} panel overflow {r[2]} js {r[3]}")
                if r[0]>0: fails.append(f'{page} {n}: {r[0]}px sideways scroll')
                if page in ('soon','index'): await q.screenshot(path=f'{out}/f-{page}-{n}.png')
                await q.close()
        rep.append(f"script errors: {len(errs) or 'none'}")
        fails.extend(errs)
        # axe: the page's CSP blocks an injected script, so this context bypasses it (the site's own scripts still run)
        ctx=await b.new_context(bypass_csp=True)
        for page in PAGES:
            for n,w,h in [['phone',390,844],['1440',1440,900]]:
                q=await ctx.new_page(); await q.set_viewport_size({'width':w,'height':h})
                await q.goto(url(page)); await q.wait_for_timeout(1500)
                await q.add_script_tag(path=AXE)
                v=await q.evaluate("""async()=>(await axe.run(document,{resultTypes:['violations']})).violations.map(v=>({id:v.id,impact:v.impact,help:v.help,
                  nodes:v.nodes.slice(0,4).map(x=>x.target.join(' ')+(x.any[0]?' · '+x.any[0].message:''))}))""")
                serious=[x for x in v if x['impact'] in ('serious','critical')]
                fails.extend(f"axe {page} {n}: [{x['impact']}] {x['id']}" for x in serious)
                rep.append(f"axe {page:22} {n:6} {len(v)} violation(s), {len(serious)} serious/critical")
                for x in v: rep.append(f"    [{x['impact']}] {x['id']}: {x['help']}\n      "+'\n      '.join(x['nodes']))
                await q.close()
        await ctx.close()
        print('\n'.join(rep)); await b.close()
        if fails:
            print(f'\nFAILED ({len(fails)}):\n  '+'\n  '.join(fails)); sys.exit(1)
        print('\nall checks passed')
asyncio.run(main())
