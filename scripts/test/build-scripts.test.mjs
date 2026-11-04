// Tests for the build's after-steps (npm test; CI runs it before the build). Each one builds a tiny dist/ in a temp
// folder, runs the real script on it (DIST points the script there) and checks what it wrote, or that it refused.
// A break here would otherwise show up as a page whose scripts the CSP blocks, or a Markdown copy gone wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { optimize } from 'svgo';
import { SVGO } from '../svgo-config.mjs';

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
# @early-hints (written by scripts/headers.mjs)
# @end early-hints
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
