"""Release audit: the machine half of the checklist in docs/sop.md, section 5. Run it before a release, not on every
build (it takes a few minutes). Against `npm run serve` (or any address of the built site with --base).

usage: npm run release-audit
       python tools/audit.py [--base http://localhost:8787] [--only browsers,keyboard,reader,motion,forms,html]

What each part does (every page in the sitemap, plus /soon and the 404 page):
  browsers   Chromium, Firefox and WebKit (Safari's engine) at 1440x900, plus an iPhone (WebKit) and an Android phone
             (Chromium) as Playwright emulates them: script errors, CSP blocks, sideways scroll, a screenshot of each
             page's first screen. Emulation is not a real phone; the SOP still asks for one pass on real ones.
  keyboard   Tabs through each page from the top, like a keyboard user: every stop's name, whether focus is visible
             (its outline, shadow, border or background changes from the unfocused look), whether it is on screen, and
             whether Tab ever gets stuck. Opens each dialog from the keyboard, checks Esc closes it and focus returns.
  reader     Reads each page top to bottom with Guidepup's Virtual Screen Reader (the words a screen reader says,
             built from the accessibility tree), saves it as a transcript, and flags what sounds wrong: run-on link
             names, the same link name going two places, very long names. Not NVDA or VoiceOver word for word: each
             says it a little differently, but the order and the words are these.
  motion     With Reduce Motion on, nothing may keep moving. With it off, anything that loops longer than 5 s needs a
             way to stop (WCAG 2.2.2), and nothing may flash more than 3 times a second (2.3.1).
  forms      Submits each form empty, then with a bad email: is each error in words, tied to its field
             (aria-describedby or the field's own message), and does focus go to the first problem?
  html       Sends Home's HTML to the W3C Nu validator (validator.w3.org/nu) and lists its errors; --html-all sends
             every page. The pages are public anyway; nothing else leaves this machine. W3C's free service limits
             requests per address: on 3 Nov 2026 a day of repeated full runs (20 pages each) got "429 Too Many
             Requests". So it's Home only by default (one request a run), and while fixing things, skip it:
             --only browsers,keyboard,reader,motion,forms.

Writes out/audit/report.md (the summary to paste into docs/releases/) and, per page, the reader transcript and the
keyboard stops in out/audit/reader/ and out/audit/keyboard/, screenshots in out/audit/shots/. Exits 1 if anything
fails. Needs: pip install -r requirements.txt; python -m playwright install chromium firefox webkit; npm install
(the reader is bundled from node_modules with esbuild).
"""

import asyncio, json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path
from playwright.async_api import async_playwright
from site_pages import MISSING, UA, pages

ARGS = sys.argv[1:]
BASE = ARGS[ARGS.index('--base') + 1] if '--base' in ARGS else 'http://localhost:8787'
PARTS = ['browsers', 'keyboard', 'reader', 'motion', 'forms', 'html']
ONLY = ARGS[ARGS.index('--only') + 1].split(',') if '--only' in ARGS else PARTS
HTML_ALL = '--html-all' in ARGS  # W3C for every page, not just Home (one request per page to a rate-limited free service)
OUT = Path('out/audit')
VSR = Path('out/vsr.js')
LANES = 4  # pages checked at once

report = {p: [] for p in PARTS}  # lines for report.md, per part
fails = []  # (part, text): anything here makes the run fail


def name_of(path):
    return path.strip('/').replace('/', '_') or 'index'


def fail(part, text):
    fails.append((part, text))
    report[part].append(f'- **FAIL** {text}')


def note(part, text):
    report[part].append(f'- {text}')


def watch(pg, where, errs):
    def console(m):
        if m.type != 'error':
            return
        # the 404 page's own status is the point of that page
        if MISSING in where and 'status of 404' in m.text:
            return
        errs.append(f'{where}: console: {m.text[:200]}')

    def crash(e):
        if 'ResizeObserver loop' not in str(e):  # a browser notice that a resize took two frames, not a fault
            errs.append(f'{where}: page error: {str(e)[:200]}')

    pg.on('console', console)
    pg.on('pageerror', crash)


# ---------------------------------------------------------------- browsers


async def browsers(p, paths):
    lim = asyncio.Semaphore(LANES)
    runs = [
        ('Chromium 1440', 'chromium', {'viewport': {'width': 1440, 'height': 900}}),
        ('Firefox 1440', 'firefox', {'viewport': {'width': 1440, 'height': 900}}),
        ('WebKit 1440', 'webkit', {'viewport': {'width': 1440, 'height': 900}}),
        ('iPhone (WebKit)', 'webkit', p.devices['iPhone 15']),
        ('Android (Chromium)', 'chromium', p.devices['Pixel 7']),
    ]
    for label, engine, opts in runs:
        b = await getattr(p, engine).launch()
        try:
            ctx = await b.new_context(**opts)
        except Exception:  # an engine that can't do part of a device profile (isMobile) still gets its size
            opts = {k: v for k, v in opts.items() if k in ('viewport', 'user_agent', 'device_scale_factor')}
            ctx = await b.new_context(**opts)
        errs = []

        async def one(path):
            async with lim:
                pg = await ctx.new_page()
                mine = []
                watch(pg, f'{label} {path}', mine)
                await pg.goto(BASE + path)
                await pg.wait_for_timeout(1500)
                # clientWidth, not innerWidth: a phone widens its viewport to fit a page that's too wide, hiding it
                side = await pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
                if side > 0:
                    fail('browsers', f'{label} {path}: {side}px sideways scroll')
                # caret='initial': hiding the caret injects a <style>, which the CSP blocks (a false error in WebKit)
                shot = OUT / 'shots' / f'{name_of(path)}-{engine}-{label.split()[0].lower()}.png'
                # WebKit's screenshot injects a <style> of its own, which the CSP blocks: keep only what came before
                errs.extend(mine)
                await pg.screenshot(path=str(shot), caret='initial')
                await pg.close()

        await asyncio.gather(*(one(path) for path in paths))
        for e in errs:
            fail('browsers', e)
        note('browsers', f'{label}: {len(paths)} pages, {len(errs) or "no"} script errors')
        await b.close()


# ---------------------------------------------------------------- keyboard

# every focusable element gets a number and its unfocused look, so each Tab stop can be compared with it
MARK = """() => {
  const sel = 'a[href], button, input, select, textarea, summary, [tabindex], iframe';
  const look = (e) => { const s = getComputedStyle(e);
    return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor,
            s.color, s.textDecorationLine].join('|'); };
  document.querySelectorAll(sel).forEach((e, i) => { e.dataset.kb = i; e.dataset.kbLook = look(e); });
}"""

# the site scrolls smoothly, so a stop is measured once the page (and any scrolling box) has stopped moving
SETTLE = """() => new Promise((done) => {
  const at = () => [scrollY, ...[...document.querySelectorAll('*')].filter((e) => e.scrollTop || e.scrollLeft)
    .map((e) => e.scrollTop + ',' + e.scrollLeft)].join(';');
  let last = at(), still = 0, n = 0;
  const tick = () => { const now = at(); still = now === last ? still + 1 : 0; last = now;
    if (still >= 3 || ++n > 90) done(); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})"""

STOP = """() => {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const s = getComputedStyle(e), r = e.getBoundingClientRect();
  const look = [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor,
                s.color, s.textDecorationLine].join('|');
  // a link or button may draw its focus ring on a child or a pseudo-element: count a changed child too
  const kid = [...e.querySelectorAll('*')].some((k) => { const c = getComputedStyle(k);
    return c.outlineStyle !== 'none' || c.boxShadow !== 'none'; });
  const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const name = (e.getAttribute('aria-label') || e.innerText || e.value || e.title || e.getAttribute('alt') || '')
    .replace(/\\s+/g, ' ').trim().slice(0, 70);
  return { kb: e.dataset.kb ?? 'new', tag: e.tagName.toLowerCase(), name,
    seen: ring || look !== e.dataset.kbLook || kid,
    onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    top: Math.round(r.top + scrollY), dialog: !!e.closest('dialog[open]') };
}"""


async def keyboard(p, paths):
    b = await p.chromium.launch()
    lim = asyncio.Semaphore(LANES)

    async def one(path):
        async with lim:
            pg = await b.new_page(viewport={'width': 1440, 'height': 900})
            await pg.goto(BASE + path)
            await pg.wait_for_timeout(800)
            await pg.evaluate(MARK)
            stops, seen_kb = [], set()
            for _ in range(600):
                await pg.keyboard.press('Tab')
                await pg.evaluate(SETTLE)
                s = await pg.evaluate(STOP)
                if s is None or s['kb'] in seen_kb:  # back to the start: the page is done
                    break
                seen_kb.add(s['kb'])
                stops.append(s)
            else:
                fail('keyboard', f'{path}: Tab never came back round after 600 stops (a trap?)')
            lines = [
                f"{i + 1:3} {s['tag']:8} {'focus seen ' if s['seen'] else 'NO FOCUS   '}"
                f"{'' if s['onScreen'] else 'OFF SCREEN '}{s['name']}"
                for i, s in enumerate(stops)
            ]
            (OUT / 'keyboard' / f'{name_of(path)}.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
            unseen = [s['name'] or s['tag'] for s in stops if not s['seen']]
            hidden = [s['name'] or s['tag'] for s in stops if not s['onScreen']]
            if unseen:
                fail('keyboard', f"{path}: {len(unseen)} stop(s) with no visible focus: {', '.join(unseen[:6])}")
            if hidden:
                fail('keyboard', f"{path}: {len(hidden)} stop(s) focused while off screen: {', '.join(hidden[:6])}")
            await pg.close()
            return f'{path}: {len(stops)} Tab stops'

    for line in await asyncio.gather(*(one(path) for path in paths)):
        note('keyboard', line)

    # dialogs, from Home: open from the keyboard, focus inside, Esc closes, focus back on the button
    pg = await b.new_page(viewport={'width': 1440, 'height': 900})
    await pg.goto(BASE + '/')
    await pg.wait_for_timeout(800)
    for d in await pg.evaluate("[...document.querySelectorAll('dialog')].map((d) => d.id)"):
        t = await pg.query_selector(f'[data-open="{d}"]:visible')
        if not t:
            note('keyboard', f'dialog {d}: no visible button on Home (opened another way)')
            continue
        await t.focus()
        await pg.keyboard.press('Enter')
        await pg.wait_for_timeout(500)
        opened = await pg.evaluate(f"document.getElementById('{d}').open")
        inside = await pg.evaluate(f"!!document.activeElement.closest('#{d}')")
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(500)
        closed = not await pg.evaluate(f"document.getElementById('{d}').open")
        back = await pg.evaluate('(el) => document.activeElement === el', t)
        if opened and inside and closed and back:
            note('keyboard', f'dialog {d}: opens, focus inside, Esc closes, focus back')
        else:
            fail(
                'keyboard', f'dialog {d}: opens {opened}, focus inside {inside}, Esc closes {closed}, focus back {back}'
            )
    await b.close()


# ---------------------------------------------------------------- reader

READ = """async () => {
  const v = VSR.virtual;
  await v.start({ container: document.body });
  for (let i = 0; i < 5000; i++) { if ((await v.lastSpokenPhrase()) === 'end of document') break; await v.next(); }
  const log = await v.spokenPhraseLog();
  await v.stop();
  // a link's name as a screen reader builds it: its text without the parts hidden from screen readers
  const heard = (n) => n.nodeType === 3 ? n.textContent : n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true' ? ''
    : n.getAttribute('aria-label') || [...n.childNodes].map(heard).join('');
  const links = [...document.querySelectorAll('main a[href], footer a[href]')].map((a) => ({
    href: a.getAttribute('href'),
    name: heard(a).replace(/\\s+/g, ' ').trim(),
    // a link whose visible parts sit in separate blocks but whose name has no pause between them
    // (counting the innermost blocks only, so a title wrapped in a box counts once)
    blocks: ((all) => all.filter((s) => !all.some((o) => o !== s && s.contains(o))).length)(
      [...a.querySelectorAll('span, strong, em, b, p, div')].filter((s) => getComputedStyle(s).display !== 'inline'
        && !s.closest('[aria-hidden="true"]') && heard(s).trim())),
    paused: !!a.querySelector('.sr-only') || /[.,:;]/.test(a.getAttribute('aria-label') || '') }));
  return { log, links };
}"""


def bundle_reader():
    if VSR.exists() and VSR.stat().st_mtime > Path('package-lock.json').stat().st_mtime:
        return
    VSR.parent.mkdir(parents=True, exist_ok=True)
    js = (
        "require('esbuild').buildSync({entryPoints:[require.resolve('@guidepup/virtual-screen-reader/browser.js')],"
        f"bundle:true,format:'iife',globalName:'VSR',outfile:'{VSR.as_posix()}',logLevel:'warning'}})"
    )
    subprocess.run(['node', '-e', js], check=True)


async def reader(p, paths):
    bundle_reader()
    b = await p.chromium.launch()
    ctx = await b.new_context(
        bypass_csp=True, viewport={'width': 1440, 'height': 900}
    )  # the CSP blocks an injected script
    lim = asyncio.Semaphore(LANES)

    async def one(path):
        async with lim:
            pg = await ctx.new_page()
            await pg.goto(BASE + path)
            await pg.wait_for_timeout(1500)
            await pg.add_script_tag(path=str(VSR))
            r = await pg.evaluate(READ)
            await pg.close()
            # the transcript, without the "end of …" lines a listener barely notices
            said = [x for x in r['log'] if not x.startswith('end of ')]
            (OUT / 'reader' / f'{name_of(path)}.txt').write_text('\n'.join(said) + '\n', encoding='utf-8')
            runon = sorted({l['name'] for l in r['links'] if l['blocks'] >= 2 and not l['paused']})
            long = sorted({l['name'] for l in r['links'] if len(l['name']) > 100})
            by_name = {}
            for l in r['links']:
                by_name.setdefault(l['name'].lower(), set()).add(l['href'].split('#')[0])
            twice = sorted(n for n, hrefs in by_name.items() if len(hrefs) > 1 and n)
            for n in runon:
                fail('reader', f'{path}: run-on link name (parts with no pause): "{n[:90]}"')
            for n in long:
                note('reader', f'{path}: long link name ({len(n)} chars): "{n[:90]}…"')
            for n in twice:
                fail('reader', f'{path}: the link name "{n}" goes to more than one page')
            return f'{path}: {len(said)} phrases'

    for line in await asyncio.gather(*(one(path) for path in paths)):
        note('reader', line)
    await b.close()


# ---------------------------------------------------------------- motion

MOVING = """() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
  const t = a.effect?.getTiming?.() || {}, el = a.effect?.target;
  return { name: a.animationName || a.constructor.name, iter: t.iterations, dur: t.duration,
    el: el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList[0] ? '.' + el.classList[0] : '')) : '?',
    inSvg: !!el?.closest?.('svg') };
})"""


async def motion(p, paths):
    b = await p.chromium.launch()
    for reduce in ('reduce', 'no-preference'):
        ctx = await b.new_context(reduced_motion=reduce, viewport={'width': 1440, 'height': 900})
        for path in paths:
            pg = await ctx.new_page()
            await pg.goto(BASE + path)
            await pg.wait_for_timeout(6000 if reduce == 'reduce' else 3000)
            moving = await pg.evaluate(MOVING)
            smil = await pg.evaluate(
                "document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion').length"
            )
            if reduce == 'reduce':
                if moving:
                    what = sorted({f"{m['el']} ({m['name']})" for m in moving})
                    fail(
                        'motion',
                        f"{path}, Reduce Motion on: {len(moving)} animation(s) still running after 6 s: {', '.join(what[:5])}",
                    )
                if smil:
                    fail('motion', f'{path}, Reduce Motion on: {smil} SVG <animate> element(s) on the page')
            else:
                loops = [m for m in moving if m['iter'] == float('inf') or (m['iter'] or 1) * (m['dur'] or 0) > 5000]
                fast = [m for m in moving if (m['dur'] or 1000) < 333 and m['iter'] == float('inf')]
                for m in fast:
                    fail(
                        'motion',
                        f"{path}: {m['el']} loops every {m['dur']} ms (could flash more than 3 times a second)",
                    )
                if loops:
                    what = sorted({m['el'] for m in loops})
                    # the pause button (HoldButton.astro, data-hold) must stop all of it
                    hold = pg.locator('[data-hold]:visible').first
                    if not await hold.count():
                        fail(
                            'motion',
                            f"{path}: {len(loops)} looping animation(s) on {', '.join(what[:5])} and no pause button",
                        )
                    else:
                        await hold.click()
                        await pg.wait_for_timeout(600)
                        left = await pg.evaluate(MOVING)
                        await hold.click()  # the choice is kept across pages: put it back
                        if left:
                            fail(
                                'motion',
                                f"{path}: Pause leaves {len(left)} animation(s) running: "
                                f"{', '.join(sorted({m['el'] for m in left})[:5])}",
                            )
                        else:
                            note(
                                'motion',
                                f"{path}: {len(loops)} looping animation(s) on {', '.join(what[:5])}; "
                                'the pause button stops all of them, and Reduce Motion stops them too',
                            )
            await pg.close()
        await ctx.close()
    if not report['motion']:
        note('motion', 'nothing moves for more than 5 s on any page, and nothing moves with Reduce Motion on')
    await b.close()


# ---------------------------------------------------------------- forms

FORM_STATE = """(f) => {
  const fields = [...f.querySelectorAll('input, select, textarea')].filter((x) => x.type !== 'hidden' && x.type !== 'submit');
  return { focus: document.activeElement && f.contains(document.activeElement) ?
             (document.activeElement.name || document.activeElement.id) : (document.activeElement?.tagName || ''),
    fields: fields.map((x) => {
      const ids = (x.getAttribute('aria-describedby') || '').split(/\\s+/).filter(Boolean);
      const said = ids.map((i) => document.getElementById(i)?.textContent.trim()).filter(Boolean).join(' / ');
      return { name: x.name || x.id, invalid: x.getAttribute('aria-invalid') === 'true' || !x.checkValidity(),
               native: x.validationMessage, said };
    }),
    live: [...document.querySelectorAll('[aria-live], [role=alert], [role=status]')]
      .map((x) => x.textContent.trim()).filter(Boolean) };
}"""


async def forms(p, paths):
    b = await p.chromium.launch()
    pg = await b.new_page(viewport={'width': 1440, 'height': 900})
    targets = []  # (where, how to show the form, selector)
    for path in paths:
        await pg.goto(BASE + path)
        await pg.wait_for_timeout(500)
        for i in range(await pg.locator('main form, footer form').count()):
            targets.append((path, None, f':is(main, footer) form >> nth={i}'))
    targets.append(('/ (Book a call dialog)', 'book-dialog', '#book-dialog form'))
    done = set()
    for where, dialog, sel in targets:
        path = where.split(' ')[0]
        await pg.goto(BASE + path)
        await pg.wait_for_timeout(500)
        if dialog:
            await pg.evaluate(f"document.querySelector('[data-open=\"{dialog}\"]').click()")
            await pg.wait_for_timeout(500)
        form = pg.locator(sel)
        # a form in a footer tab that isn't showing: pick that tab first, as a visitor would
        await form.evaluate(
            """(f) => { const p = f.closest('[role=tabpanel]');
          if (p && p.hidden !== false || p && !p.offsetParent) document.querySelector(`[aria-controls="${p.id}"]`)?.click(); }"""
        )
        await pg.wait_for_timeout(600)
        key = await form.evaluate(
            '(f) => f.id || f.getAttribute("aria-label") || f.querySelector("[type=submit]")?.textContent.trim()'
        )
        if key in done:  # the same footer form on every page: check it once
            continue
        done.add(key)
        for case in ('empty', 'bad email'):
            await form.evaluate('(f) => f.reset()')
            if case == 'bad email':
                emails = form.locator('input[type=email]')
                if not await emails.count():
                    continue
                await emails.first.fill('not-an-email')
            await form.locator('[type=submit], button:not([type=button])').first.click()
            await pg.wait_for_timeout(600)
            if not pg.url.startswith(BASE + path.split('#')[0]):
                note('forms', f'{where} form "{key}" ({case}): the page moved on to {pg.url}; nothing stopped it')
                await pg.goto(BASE + path)
                break
            s = await form.evaluate(FORM_STATE)
            bad = [f for f in s['fields'] if f['invalid']]
            if not bad:
                note('forms', f'{where} form "{key}" ({case}): no field marked invalid')
                continue
            words = [f"{f['name']}: {f['said'] or f['native'] or '(no message)'}" for f in bad]
            silent = [f['name'] for f in bad if not f['said'] and not f['native']]
            first = bad[0]['name']
            note(
                'forms',
                f"{where} form \"{key}\" ({case}): focus on {s['focus'] or 'nothing'}; errors: {'; '.join(words)}"
                + (f"; announced: {' / '.join(s['live'])}" if s['live'] else ''),
            )
            if silent:
                fail('forms', f"{where} form \"{key}\" ({case}): invalid with no message in words: {', '.join(silent)}")
            if s['focus'] != first:
                fail(
                    'forms',
                    f"{where} form \"{key}\" ({case}): focus is on {s['focus'] or 'nothing'}, not the first problem ({first})",
                )
    await b.close()


# ---------------------------------------------------------------- html


def validate(req):
    # the service answers 429 when it's busy or we've sent a lot today: wait as it asks, then try again
    for wait in (30, 60, 120, None):
        try:
            return json.loads(urllib.request.urlopen(req, timeout=60).read())['messages']
        except urllib.error.HTTPError as e:
            if e.code != 429 or wait is None:
                raise
            time.sleep(int(e.headers.get('Retry-After') or wait))


def html(paths):
    css = set()
    for path in paths if HTML_ALL else ['/']:
        # the 404 answers with an error status; its body is the page all the same
        try:
            page = urllib.request.urlopen(urllib.request.Request(BASE + path, headers=UA)).read()
        except urllib.error.HTTPError as e:
            page = e.read()
        req = urllib.request.Request(
            'https://validator.w3.org/nu/?out=json',
            data=page,
            headers={'Content-Type': 'text/html; charset=utf-8', 'User-Agent': 'uplink-site audit'},
        )
        msgs = validate(req)
        # the validator's CSS checker lags the browsers (@property, appearance: base-select, ::picker-icon are valid
        # CSS it doesn't know yet), so its messages on the inlined <style> are listed once, not counted as failures
        errs = [m for m in msgs if m['type'] == 'error' and not m['message'].startswith('CSS:')]
        css.update(m['message'] for m in msgs if m['type'] == 'error' and m['message'].startswith('CSS:'))
        warns = [m for m in msgs if m.get('subType') == 'warning']
        for m in errs[:8]:
            fail('html', f"{path} line {m.get('lastLine', '?')}: {m['message'][:160]}")
        note(
            'html',
            f'{path}: {len(errs)} HTML error(s), {len(warns)} warning(s)'
            + (f" ({'; '.join(sorted({w['message'][:90] for w in warns}))})" if warns else ''),
        )
        time.sleep(2)  # the W3C service asks for a gentle pace
    if css:
        note('html', 'CSS the validator does not know yet (valid in current browsers): ' + '; '.join(sorted(css)))


# ---------------------------------------------------------------- run


async def main():
    for d in ('reader', 'keyboard', 'shots'):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    paths = pages(BASE)
    started = time.time()
    async with async_playwright() as p:
        for part in PARTS:
            if part not in ONLY:
                continue
            print(f'{part}…', flush=True)
            try:
                if part == 'html':
                    html(paths)
                else:
                    await globals()[part](p, paths)
            except Exception as e:  # one part breaking still leaves the others' results in the report
                fail(part, f'the {part} check stopped: {type(e).__name__}: {str(e)[:200]}')
    lines = [
        f'# Audit, {time.strftime("%d %b %Y %H:%M")}',
        '',
        f'{BASE}, {len(paths)} pages, {round(time.time() - started)} s. '
        f'{len(fails) or "No"} failure(s). Transcripts and Tab stops: out/audit/reader/, out/audit/keyboard/.',
        '',
    ]
    for part in PARTS:
        if part in ONLY:
            lines += [f'## {part}', ''] + (report[part] or ['- nothing to report']) + ['']
    (OUT / 'report.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))
    sys.exit(1 if fails else 0)


asyncio.run(main())
