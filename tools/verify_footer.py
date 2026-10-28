# Site checks: hero, tower, footer and sideways scroll at every size, against the built site, then an axe
# accessibility pass on every page at phone and desktop (axe-core from node_modules: run npm install first).
# Exits 1 if axe finds anything serious or critical.
# usage: npm run build && npm run serve   (wrangler dev on 8787)   then   python tools/verify_footer.py out/ [port]
import asyncio, sys
from playwright.async_api import async_playwright
base='http://localhost:'+(sys.argv[2] if len(sys.argv)>2 else '8787'); out=sys.argv[1]
AXE='node_modules/axe-core/axe.min.js'
PAGES=['index','services','work','about','contact','soon','404','services/help-desk','work/office-move']
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); rep=[]
        pg=await b.new_page(viewport={'width':1440,'height':900})
        errs=[]; pg.on('pageerror',lambda e: errs.append(str(e))); pg.on('console',lambda m: m.type=='error' and errs.append(m.text))
        await pg.goto(base+'/'); await pg.wait_for_timeout(5500)
        before=await pg.eval_on_selector('.ob-app','e=>e.textContent')
        await (await pg.query_selector('.ob-tile[data-tile="files"]')).hover(force=True); await pg.wait_for_timeout(500)
        rep.append(f"hero tile hover: {before} -> {await pg.eval_on_selector('.ob-app','e=>e.textContent')}")
        steps=await pg.eval_on_selector_all('.grow-step[data-floors]','s=>s.map(x=>x.dataset.floors)'); seen=[]
        for f in steps:
            await pg.eval_on_selector(f'.grow-step[data-floors="{f}"]',"e=>e.scrollIntoView({block:'center'})"); await pg.wait_for_timeout(700)
            seen.append(await pg.eval_on_selector('svg.tg','e=>e.getAttribute("data-floors")'))
        rep.append(f"tower floors {','.join(steps)} -> {','.join(seen)}")
        # footer behaviour on home at 1440
        await pg.eval_on_selector('#footer','e=>e.scrollIntoView()'); await pg.wait_for_timeout(400)
        tabs=await pg.eval_on_selector_all('.fc-tile','t=>t.map(x=>x.id)')
        for i,t in enumerate(tabs):
            await pg.click('#'+t); await pg.wait_for_timeout(850)
            info=await pg.evaluate("""()=>{const f=document.getElementById('footer');const p=document.querySelector('.fc-panel.is-on');const s=document.querySelector('.fc-panels');
              return {h:f.offsetHeight, fold:innerHeight-document.querySelector('.site-header').offsetHeight, panel:p.id, map:p.dataset.map, over: s.scrollHeight-s.clientHeight, hud: document.querySelector('.fc-hud b').textContent, vb: document.querySelector('svg.fc-w').getAttribute('viewBox')}}""")
            rep.append(f"tab {t}: {info}")
            await pg.screenshot(path=f'{out}/f-1440-{i}.png')
        await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(300)
        rep.append('arrow key -> '+await pg.evaluate("document.activeElement.id + ' / ' + document.querySelector('.fc-panel.is-on').id"))
        rep.append(f"console errors: {errs or 'none'}")
        await pg.close()
        for page in PAGES:
            for n,w,h in [['phone',390,844],['tablet',820,1180],['1440',1440,900],['3440',3440,1440]]:
                q=await b.new_page(viewport={'width':w,'height':h}); e2=[]; q.on('pageerror',lambda e: e2.append(str(e)))
                await q.goto(f"{base}/{'' if page=='index' else page}"); await q.wait_for_timeout(700)
                await q.eval_on_selector('#footer','e=>e.scrollIntoView()'); await q.wait_for_timeout(500)
                r=await q.evaluate("""()=>{const f=document.getElementById('footer'); const s=document.querySelector('.fc-panels');
                  return [document.documentElement.scrollWidth-innerWidth, f.offsetHeight, s.scrollHeight-s.clientHeight, f.classList.contains('fc-js')]}""")
                rep.append(f"{page:18} {n:6} overflowX {r[0]} footer h {r[1]} panel overflow {r[2]} js {r[3]} {e2 or ''}")
                if page in ('soon','index'): await q.screenshot(path=f'{out}/f-{page}-{n}.png')
                await q.close()
        # axe: the page's CSP blocks an injected script, so this context bypasses it (the site's own scripts still run)
        bad=0; ctx=await b.new_context(bypass_csp=True)
        for page in PAGES:
            for n,w,h in [['phone',390,844],['1440',1440,900]]:
                q=await ctx.new_page(); await q.set_viewport_size({'width':w,'height':h})
                await q.goto(f"{base}/{'' if page=='index' else page}"); await q.wait_for_timeout(1500)
                await q.add_script_tag(path=AXE)
                v=await q.evaluate("""async()=>(await axe.run(document,{resultTypes:['violations']})).violations.map(v=>({id:v.id,impact:v.impact,help:v.help,
                  nodes:v.nodes.slice(0,4).map(x=>x.target.join(' ')+(x.any[0]?' · '+x.any[0].message:''))}))""")
                serious=[x for x in v if x['impact'] in ('serious','critical')]; bad+=len(serious)
                rep.append(f"axe {page:18} {n:6} {len(v)} violation(s), {len(serious)} serious/critical")
                for x in v: rep.append(f"    [{x['impact']}] {x['id']}: {x['help']}\n      "+'\n      '.join(x['nodes']))
                await q.close()
        await ctx.close()
        print('\n'.join(rep)); await b.close()
        if bad: print(f'axe: {bad} serious/critical'); sys.exit(1)
asyncio.run(main())
