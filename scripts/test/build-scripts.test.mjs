// Tests for the build's after-steps (npm test; CI runs it before the build). Each one builds a tiny dist/ in a temp
// folder, runs the real script on it (DIST points the script there) and checks what it wrote, or that it refused.
// A break here would otherwise show up as a page whose scripts the CSP blocks, or a Markdown copy gone wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { optimize } from 'svgo';
import { SVGO, shrink, styledTags } from '../svgo-config.mjs';

const sha = (text) => "'sha256-" + createHash('sha256').update(text).digest('base64') + "'";

// a dist/ with what headers.mjs reads: the home page (drawings it inserts, font preloads), those drawings, one more
// page and the _headers template
const site = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-dist-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
};
const run = (script, dir) => execFileSync('node', [`scripts/${script}`], { env: { ...process.env, DIST: dir }, stdio: 'pipe' }).toString();
// runs a script that must refuse; returns what it said
const fails = (script, dir) => {
  try { run(script, dir); } catch (e) { return e.stderr.toString(); }
  assert.fail(`${script} should have refused`);
};

const INLINE = "document.documentElement.classList.add('js')";
const HOME = `<!doctype html><html><head>
<link rel="preload" href="/assets/fonts/body.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/wide.woff2" as="font" type="font/woff2" crossorigin media="(min-width: 700px)">
<script>${INLINE}</script><script type="application/ld+json">{"@type":"Thing"}</script>
<style>body{color:red}</style></head>
<body><div data-hero="/assets/img/hero.svg?v=1"></div><div data-fc-map="/assets/img/campus.svg"></div></body></html>`;
const TEMPLATE = `/*
  Content-Security-Policy: script-src 'self' {script-hashes}; style-src 'self' {style-hashes}
  X-Build: {build}
# @early-hints (written by scripts/headers.mjs)
# @end early-hints
# @markdown-copies (written by scripts/headers.mjs)
# @end markdown-copies
`;
const base = (extra = {}) => site({
  'index.html': HOME,
  'services.html': '<!doctype html><html><body><p>Services</p></body></html>',
  '404.html': '<!doctype html><html><body>Not found</body></html>',
  'assets/img/hero.svg': '<svg xmlns="http://www.w3.org/2000/svg"><style>.a{fill:blue}</style></svg>',
  'assets/img/campus.svg': '<svg xmlns="http://www.w3.org/2000/svg"><style>.b{fill:green}</style></svg>',
  '_headers': TEMPLATE,
  ...extra,
});

test('headers.mjs: hashes every inline script and style, skips JSON-LD, writes Early Hints per page', () => {
  const dir = base();
  try {
    run('headers.mjs', dir);
    const out = readFileSync(join(dir, '_headers'), 'utf-8');
    assert.ok(out.includes(sha(INLINE)), 'the inline script hash');
    assert.ok(!out.includes(sha('{"@type":"Thing"}')), 'JSON-LD runs nothing, so it gets no hash');
    for (const css of ['body{color:red}', '.a{fill:blue}', '.b{fill:green}']) assert.ok(out.includes(sha(css)), `style hash for ${css}`);
    assert.ok(!out.includes('{script-hashes}') && !out.includes('{style-hashes}'), 'placeholders filled');
    assert.match(out, /^\/\n {2}Link: <\/assets\/fonts\/body\.woff2>; rel=preload/m, 'home gets the first-screen font');
    assert.match(out, /^\/services\n {2}Link:/m, 'every page gets a rule');
    assert.ok(!out.includes('wide.woff2'), 'a font preloaded only for some screens is left out');
    assert.ok(!/^\/404/m.test(out), 'no rule for the 404 page');
    const redirects = readFileSync(join(dir, '_redirects'), 'utf-8').split('\n');
    for (const line of ['/index.html / 308', '/services/ /services 308', '/services.html /services 308', '/404.html /404 308']) {
      assert.ok(redirects.includes(line), `redirect: ${line}`);
    }
  } finally { rmSync(dir, { recursive: true }); }
});

test('headers.mjs: /index and a page\'s /index.html and /index spellings go to the page with a 308 too (review H13)', () => {
  const dir = base();
  try {
    run('headers.mjs', dir);
    const redirects = readFileSync(join(dir, '_redirects'), 'utf-8').split('\n');
    for (const line of ['/index / 308', '/services/index.html /services 308', '/services/index /services 308']) {
      assert.ok(redirects.includes(line), `redirect: ${line}`);
    }
  } finally { rmSync(dir, { recursive: true }); }
});

// a dist/ the way a plain `astro build` leaves it (the template copied as is), then finished by headers.mjs
test('check-dist.mjs (wrangler build.command): refuses an unfinished dist/, passes a finished one (review H11)', async () => {
  const dir = base();
  try {
    assert.match(fails('check-dist.mjs', dir), /still has \{script-hashes\} and \{style-hashes\} and \{build\} in it.*npm run build/s);
    run('headers.mjs', dir);
    run('check-dist.mjs', dir);
    rmSync(join(dir, '_redirects'));
    assert.match(fails('check-dist.mjs', dir), /_redirects is missing/);
  } finally { rmSync(dir, { recursive: true }); }
  const empty = site({});
  try { assert.match(fails('check-dist.mjs', empty), /_headers is missing/); }
  finally { rmSync(empty, { recursive: true }); }
  const { unstable_readConfig } = await import('wrangler');
  assert.equal(unstable_readConfig({ config: 'wrangler.jsonc' }).build.command, 'node scripts/check-dist.mjs', 'wrangler runs it before dev, deploy and versions upload');
});

test('headers.mjs: refuses a style="" attribute (no hash covers one)', () => {
  const dir = base({ 'about.html': '<!doctype html><html><body><p style="color:red">x</p></body></html>' });
  try { assert.match(fails('headers.mjs', dir), /style="" attributes the CSP would block: about\.html/); }
  finally { rmSync(dir, { recursive: true }); }
});

test('headers.mjs: refuses a template without its placeholders', () => {
  const dir = base({ '_headers': '/*\n  X-Frame-Options: DENY\n' });
  try { assert.match(fails('headers.mjs', dir), /needs the \{script-hashes\} and \{style-hashes\} placeholders/); }
  finally { rmSync(dir, { recursive: true }); }
});

test('markdown.mjs: converts <main> only, full addresses, drops what is hidden or decorative', () => {
  const page = `<!doctype html><html><head><link rel="canonical" href="https://example.test/about">
<meta name="description" content="Who we are and how we work with offices across Ontario."></head><body>
<header><a href="/">Site header</a></header>
<main><h1>About us</h1><p class="eyebrow">About</p><p>We run IT for <a href="/services">small offices</a>.</p>
<span aria-hidden="true">decoration</span><button>Copy</button><div data-md-skip>Queue ring</div>
<dl class="facts"><div><dt>Team</dt><dd>22 technicians</dd></div></dl></main>
<footer>Footer text</footer></body></html>`;
  const dir = site({ 'about.html': page, 'index.html': '<main></main>', '404.html': '', 'soon.html': '' });
  try {
    run('markdown.mjs', dir);
    const md = readFileSync(join(dir, 'about.md'), 'utf-8');
    assert.match(md, /^# About us\n\n> Who we are and how we work with offices across Ontario\.\n\nPage: https:\/\/example\.test\/about/);
    assert.ok(md.includes('[small offices](https://example.test/services)'), 'links become full addresses');
    assert.ok(md.includes('- Team: 22 technicians'), 'a facts list becomes Label: value lines');
    for (const gone of ['Site header', 'Footer text', 'decoration', 'Copy', 'Queue ring', '\nAbout\n']) assert.ok(!md.includes(gone), `left out: ${gone.trim()}`);
  } finally { rmSync(dir, { recursive: true }); }
});

test('svgo-config.mjs: keeps what the scripts and screen readers rely on', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-label="A drawing">'
    + '<style>.is-on{opacity:1}</style><g id="cloud" class="ob-tile"><rect width="5" height="5" display="none"/></g></svg>';
  const out = optimize(svg, SVGO).data;
  assert.ok(out.includes('role="img"') && out.includes('aria-label="A drawing"'), 'role="img" and the label');
  assert.ok(out.includes('id="cloud"') && out.includes('class="ob-tile"'), 'ids and classes the scripts find');
  assert.ok(out.includes('.is-on{opacity:1}'), 'a <style> rule for a class scripts add later');
  assert.ok(out.includes('display="none"'), 'hidden parts the hero shows from script');
});

test('headers.mjs: hashes an inline module script but not one with src; refuses a style="" in a drawing it inserts', () => {
  const extra = '<script type="module">import "/a.js"</script><script src="/b.js">ignored()</script>';
  const dir = base({ 'contact.html': `<!doctype html><html><head>${extra}</head><body></body></html>` });
  try {
    run('headers.mjs', dir);
    const out = readFileSync(join(dir, '_headers'), 'utf-8');
    assert.ok(out.includes(sha('import "/a.js"')), 'an inline module runs, so it gets a hash');
    assert.ok(!out.includes(sha('ignored()')), 'a script with src runs the file, not its text');
  } finally { rmSync(dir, { recursive: true }); }
  const drawing = base({ 'assets/img/campus.svg': '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:red"/></svg>' });
  try { assert.match(fails('headers.mjs', drawing), /style="" attributes the CSP would block: assets\/img\/campus\.svg/); }
  finally { rmSync(drawing, { recursive: true }); }
});

test('headers.mjs: refuses a home page without its drawings or font preloads', () => {
  const preload = '<link rel="preload" href="/assets/fonts/body.woff2" as="font" type="font/woff2" crossorigin>';
  const drawings = '<div data-hero="/assets/img/hero.svg"></div><div data-fc-map="/assets/img/campus.svg"></div>';
  for (const home of [`${preload}<div data-hero="/assets/img/hero.svg"></div>`, drawings]) {   // no campus map; no fonts
    const dir = base({ 'index.html': `<!doctype html><html><head></head><body>${home}</body></html>` });
    try { assert.match(fails('headers.mjs', dir), /no data-hero\* \/ data-fc-map drawings or font preloads found/); }
    finally { rmSync(dir, { recursive: true }); }
  }
});

test("headers.mjs: refuses a _headers past Cloudflare's limits (100 rules, 2,000 characters a line)", () => {
  const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`p${i}.html`, '<!doctype html><p>x</p>']));
  const dir = base(many);
  try { assert.match(fails('headers.mjs', dir), /_headers over Cloudflare's limits: \d+ rules \(max 100\)/); }
  finally { rmSync(dir, { recursive: true }); }
  const long = base({ '_headers': TEMPLATE + `/x\n  X-Long: ${'a'.repeat(2001)}\n` });
  try { assert.match(fails('headers.mjs', long), /longest line \d+ \(max 2000\)/); }
  finally { rmSync(long, { recursive: true }); }
});

test('markdown.mjs: labels, forms, FAQ, tables, chips, links; pages in folders; 404, soon and home skipped', () => {
  const head = (path, description) => `<!doctype html><html><head><link rel="canonical" href="https://example.test${path}">
<meta name="description" content="${description}"></head><body>`;
  const page = `${head('/contact', 'Call, write or book a visit: we answer within one business day.')}
<main><p class="lead-in">Before the title</p><h1>Contact</h1>
<p>Call, write or book a visit: we answer within one business day.</p>
<div><span class="label">Clients supported</span><strong>120+</strong></div>
<div><span class="card-title">Hours</span><ul><li>Monday to Friday</li></ul></div>
<p><span class="label">Office move</span><span class="sr-only">. </span>Law office</p>
<span class="chip">BUILD</span><ul><li><span class="chip">Known for</span></li></ul>
<section id="message"><form><h2>Write to us</h2><input name="email"></form></section>
<details><summary>Do you work weekends?</summary><p>For emergencies, yes.</p></details>
<table><tr><th>Name</th><th>Kept</th></tr><tr><td>Email <small>if you give it</small></td><td>a | b</td></tr></table>
<p><a href="https://other.test/x">Outside</a> <a href="/services"><svg></svg></a></p></main></body></html>`;
  const dir = site({
    'contact.html': page,
    'services/backup.html': `${head('/services/backup', 'Backups that run every night and get tested.')}<main><h1>Backup</h1></main></body></html>`,
    'index.html': '<main><h1>Home</h1></main>', '404.html': '<main><h1>404</h1></main>', 'soon.html': '<main><h1>Soon</h1></main>',
  });
  try {
    assert.match(run('markdown.mjs', dir), /markdown: 2 pages/);
    const md = readFileSync(join(dir, 'contact.md'), 'utf-8');
    assert.match(md, /^# Contact\n\nPage: https:\/\/example\.test\/contact\n\nBefore the title\n/, 'no summary when the page says it; text before the title moves under it');
    assert.ok(md.includes('Clients supported: **120+**'), 'a label beside its value: one line');
    assert.ok(md.includes('**Hours**\n\n- Monday to Friday'), 'a label over a list: a bold line of its own');
    assert.match(md, /Office move: +Law office/, 'the <Pause /> after a label is left out');
    assert.ok(!md.includes('BUILD') && md.includes('- Known for'), 'a chip is dropped, except as a list item');
    assert.ok(md.includes('## Write to us\n\nUse the form on the page: https://example.test/contact#message'), 'a form: where it is');
    assert.ok(!md.includes('email'), "the form's fields stay out");
    assert.ok(md.includes('**Do you work weekends?**\n\nFor emergencies, yes.'), 'FAQ: question in bold, answer under it');
    assert.ok(md.includes('| Name | Kept |\n| --- | --- |\n| Email (if you give it) | a \\| b |'), 'a table, its <small> note in brackets');
    assert.ok(md.includes('[Outside](https://other.test/x)') && !md.includes('](https://example.test/services)'), 'an outside link as is; a link with no text left out');
    assert.match(readFileSync(join(dir, 'services/backup.md'), 'utf-8'), /^# Backup\n\n> Backups that run every night and get tested\.\n/, 'a page in a folder');
    for (const skipped of ['index.md', '404.md', 'soon.md']) assert.throws(() => readFileSync(join(dir, skipped)), `${skipped} not written`);
  } finally { rmSync(dir, { recursive: true }); }
});

test('markdown.mjs: refuses a page with no <main> or no canonical', () => {
  const dir = site({ 'about.html': '<!doctype html><html><body><main><h1>About</h1></main></body></html>' });
  try { assert.match(fails('markdown.mjs', dir), /markdown: about\.html has no <main> or no canonical/); }
  finally { rmSync(dir, { recursive: true }); }
});

// review B9: SVGO writes <polygon> and <line> as <path>, so a drawing whose <style> styles them by tag loses that
// styling on the live site, silently
const TILE = (css) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>${css}</style>`
  + '<g class="ob-tile"><polygon class="f-t" points="0,0 5,0 5,5"/><line x1="0" y1="0" x2="5" y2="5"/></g></svg>';

test('svgo-config.mjs: shrink() refuses a drawing whose <style> styles a tag SVGO writes as something else', () => {
  assert.deepEqual(styledTags(TILE('.ob-tile polygon{stroke:red}@keyframes a{from{opacity:0}to{opacity:1}}.x line,.y{fill:none}')).sort(), ['line', 'polygon']);
  assert.deepEqual(styledTags(TILE('.ob-tile .f-t{stroke:red}/* polygon { */')), [], 'classes, a comment and a declaration name no tag');
  assert.throws(() => shrink(TILE('.ob-tile polygon{stroke:red}'), 'tile.svg'), /tile\.svg: its <style> styles <polygon>/);
  assert.ok(shrink(TILE('.ob-tile .f-t{stroke:red}')).includes('class="f-t"'), 'a class rule still finds its part');
});

test('svgo-config.mjs: every drawing in public/assets/img/ keeps what its own <style> styles', () => {
  const dir = 'public/assets/img';
  const bad = [];
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.svg'))) {
    try { shrink(readFileSync(join(dir, name), 'utf-8'), name); } catch (e) { bad.push(e.message); }
  }
  assert.deepEqual(bad, []);
});

test('svgo.mjs: shrinks every drawing, the campus map too, and stops the build on a styled tag it would lose', () => {
  const dir = site({ 'assets/img/campus.svg': TILE('.ob-tile .f-t{stroke:red}'), 'assets/img/hero.svg': TILE('.f-t{fill:red}') });
  try {
    run('svgo.mjs', dir);
    for (const name of ['campus.svg', 'hero.svg']) assert.ok(!readFileSync(join(dir, 'assets/img', name), 'utf-8').includes('<polygon'), `${name} shrunk`);
  } finally { rmSync(dir, { recursive: true }); }
  const bad = site({ 'assets/img/hero.svg': TILE('.ob-tile polygon{stroke:red}') });
  try { assert.match(fails('svgo.mjs', bad), /assets\/img\/hero\.svg: its <style> styles <polygon>/); }
  finally { rmSync(bad, { recursive: true }); }
});

// footer.css gives every polygon of the campus map its edge by class (the tag is gone once SVGO has run): a polygon
// whose class isn't in that rule's list would lose its edge, as the map's marker did once
test("footer.css: the campus map's edge rule names a class of every polygon the map draws", () => {
  const css = readFileSync('src/styles/footer.css', 'utf-8');
  const listed = css.match(/\.fc-w :where\(([^)]*)\) \{ stroke:/)[1].split(',').map((c) => c.trim().slice(1));
  const svg = readFileSync('public/assets/img/campus.svg', 'utf-8');
  const polygons = [...svg.matchAll(/<polygon\b[^>]*>/g)].map((m) => m[0].match(/class="([^"]*)"/)?.[1] ?? '');
  assert.ok(polygons.length > 100, 'the map has its polygons');
  const missed = [...new Set(polygons.filter((c) => !c.split(' ').some((k) => listed.includes(k))))];
  assert.deepEqual(missed, [], `polygon classes with no edge rule (listed: ${listed.join(', ')})`);
});

// review M4: a .md copy is never what a search should show, launched or not. headers.mjs gives each copy a rule of its
// own (not the site-wide noindex, which comes off at launch): noindex, and its page as the canonical address
test('headers.mjs: every .md copy gets its own noindex and a canonical Link to its page (review M4)', () => {
  const canon = (path) => `<link rel="canonical" href="https://example.test${path}">`;
  const dir = base({
    'index.html': HOME.replace('<head>', `<head>${canon('/')}`),
    'services.html': `<!doctype html><html><head>${canon('/services')}</head><body><p>Services</p></body></html>`,
    'services/backup.html': `<!doctype html><html><head>${canon('/services/backup')}</head><body></body></html>`,
    'index.md': '# Home', 'services.md': '# Services', 'services/backup.md': '# Backup',
    'agents.md': '# Notes for agents',   // no page of its own: noindex, no canonical
  });
  try {
    run('headers.mjs', dir);
    const out = readFileSync(join(dir, '_headers'), 'utf-8');
    const rule = (path) => out.match(new RegExp(`^${path.replaceAll('.', '\\.')}\\n((?: {2}.*\\n)+)`, 'm'))?.[1] ?? '';
    for (const [md, page] of [['/index.md', '/'], ['/services.md', '/services'], ['/services/backup.md', '/services/backup']]) {
      const r = rule(md);
      assert.match(r, /^ {2}X-Robots-Tag: noindex$/m, `${md}: noindex of its own`);
      assert.match(r, new RegExp(`^ {2}Link: <https://example\\.test${page}>; rel="canonical"$`, 'm'), `${md}: canonical ${page}`);
      assert.ok(!r.includes('rel=preload'), `${md}: no Early Hints on a copy`);
    }
    assert.match(rule('/agents.md'), /^ {2}X-Robots-Tag: noindex$/m, '/agents.md: noindex');
    assert.ok(!rule('/agents.md').includes('canonical'), '/agents.md: no page, so no canonical');
  } finally { rmSync(dir, { recursive: true }); }
  const lost = base({ 'about.html': '<!doctype html><html><head></head><body></body></html>', 'about.md': '# About' });
  try { assert.match(fails('headers.mjs', lost), /about\.md: its page about\.html has no <link rel="canonical">/); }
  finally { rmSync(lost, { recursive: true }); }
});

// review H9: X-Permitted-Cross-Domain-Policies only ever told Flash and Acrobat what they may load; nothing reads it now
test('public/_headers: no X-Permitted-Cross-Domain-Policies (review H9)', () => {
  const dir = base({ '_headers': readFileSync('public/_headers', 'utf-8') });
  try {
    run('headers.mjs', dir);
    assert.ok(!/x-permitted-cross-domain-policies/i.test(readFileSync(join(dir, '_headers'), 'utf-8')), 'X-Permitted-Cross-Domain-Policies still sent');
  } finally { rmSync(dir, { recursive: true }); }
});

// review H3: X-Build names the build, so the deploy can tell which version the live address serves. It covers every
// file in dist/ (but _headers itself), the finished headers and the Worker, so a change to any one of them changes it
test('headers.mjs: X-Build is a hash of dist/, the headers and the Worker; any one change gives another (review H3)', () => {
  const worker = mkdtempSync(join(tmpdir(), 'uplink-worker-'));
  const ids = [];
  const build = (extra, workerText = 'export default {}') => {
    writeFileSync(join(worker, 'index.js'), workerText);
    const dir = base({ '_headers': TEMPLATE, ...extra });
    try {
      execFileSync('node', ['scripts/headers.mjs'], { env: { ...process.env, DIST: dir, WORKER_DIR: worker }, stdio: 'pipe' });
      const out = readFileSync(join(dir, '_headers'), 'utf-8');
      const id = out.match(/^\/\*\n(?: {2}.*\n)*? {2}X-Build: ([0-9a-f]{16})$/m)?.[1];
      assert.ok(id, `an X-Build line in the /* rule:\n${out}`);
      assert.ok(!out.includes('{build}'), 'placeholder filled');
      ids.push(id);
    } finally { rmSync(dir, { recursive: true }); }
  };
  try {
    build({});
    build({});                                                                       // the same build: the same ID
    build({ '_headers': TEMPLATE.replace('/*\n', '/*\n  X-New: 1\n') });             // a header only
    build({ 'agents.md': '# Notes' });                                               // a Markdown file
    build({ 'assets/img/campus.svg': '<svg xmlns="http://www.w3.org/2000/svg"><style>.b{fill:red}</style></svg>' });
    build({ 'assets/fonts/a.woff2': 'font' });                                       // a font
    build({}, 'export default { fetch() {} }');                                      // the Worker only
    build({ 'contact.html': '<!doctype html><p>x</p>' });                            // a page, and with it _redirects
  } finally { rmSync(worker, { recursive: true }); }
  assert.equal(ids[0], ids[1], 'the same build gives the same ID');
  assert.equal(new Set(ids).size, ids.length - 1, `each change gives a new ID: ${ids.join(' ')}`);
});

test('check-dist.mjs: refuses a dist/ whose _headers still has {build} in it', () => {
  const dir = base({ '_headers': TEMPLATE.replace(/\{[a-z]+-hashes\}/g, 'x') });
  try { assert.match(fails('check-dist.mjs', dir), /still has \{build\} in it/); }
  finally { rmSync(dir, { recursive: true }); }
});
