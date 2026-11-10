// Tests for the pages' Markdown copies (review C15): scripts/markdown.mjs on markup shaped like the real sections
// (About's team cards, a case study's facts, Contact's hours), and the hand-written Markdown in src/data/.
// checks/site.spec.mjs checks the same against the built site.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const convert = (main) => {
  const dir = mkdtempSync(join(tmpdir(), 'uplink-md-'));
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'page.html'),
      `<!doctype html><html><head><link rel="canonical" href="https://example.test/page">
<meta name="description" content="A page."></head><body><main><h1>Page</h1>${main}</main></body></html>`,
    );
    execFileSync('node', ['scripts/markdown.mjs'], { env: { ...process.env, DIST: dir }, stdio: 'pipe' });
    return readFileSync(join(dir, 'page.md'), 'utf-8');
  } finally {
    rmSync(dir, { recursive: true });
  }
};

test('markdown.mjs: a team card reads "name, role" (the hidden separator after a name is kept)', () => {
  // as src/components/about/Team.astro writes it
  const md = convert(
    '<ul class="team"><li class="person panel"><span class="avatar" aria-hidden="true">MR</span><span class="stack-2">' +
      '<span class="person-name">Maya Roy</span><span class="sr-only">, </span><span class="small muted">Founder and CEO</span></span></li></ul>',
  );
  assert.match(md, /^- Maya Roy, Founder and CEO$/m);
});

test('markdown.mjs: a facts value keeps its links', () => {
  // as src/components/work/ProjectCase.astro writes it
  const md = convert(
    '<dl class="facts"><div><dt>Client</dt><dd>Law office, 18 staff</dd></div>' +
      '<div><dt>Services</dt><dd><a href="/services/network">Networks &amp; Wi-Fi</a>, <a href="/services/help-desk">Managed help desk</a></dd></div></dl>',
  );
  assert.ok(md.includes('- Client: Law office, 18 staff'), md);
  assert.ok(
    md.includes(
      '- Services: [Networks & Wi-Fi](https://example.test/services/network), [Managed help desk](https://example.test/services/help-desk)',
    ),
    md,
  );
});

test("markdown.mjs: a heading only screen readers see still heads its list (Contact's hours)", () => {
  // as src/components/contact/Message.astro writes it
  const md = convert(
    '<h2>Send us a message</h2><p>Use the form.</p><div class="lobby-queue"><h2 class="sr-only">Hours and office</h2>' +
      '<dl class="facts"><div><dt>Monday to Friday</dt><dd>7 am to 7 pm ET</dd></div></dl></div>',
  );
  assert.ok(md.includes('## Hours and office\n\n- Monday to Friday: 7 am to 7 pm ET'), md);
});

test('src/data/index.md and agents.md: contact details are placeholders, and Home names both languages', () => {
  for (const file of ['src/data/index.md', 'src/data/agents.md']) {
    const text = readFileSync(file, 'utf-8');
    for (const typed of ['855-555', '@uplinkit.ca', 'King St'])
      assert.ok(!text.includes(typed), `${file} types ${typed}: use the placeholder`);
  }
  const home = readFileSync('src/data/index.md', 'utf-8');
  assert.ok(home.includes('- Languages: English, French'), 'the site and help desk work in English and French');
  for (const p of ['[{phone}](tel:{tel})', '{email}', '{street}, {city}', '{hours}'])
    assert.ok(home.includes(p), `index.md uses ${p}`);
});

test('markdown.mjs: a table cell escapes a backslash before a pipe', () => {
  // a cell holding a\|b must come out as a\\\|b, and a plain pipe as \|
  const md = convert(String.raw`<table><tr><th>A</th><th>B</th></tr><tr><td>a\|b</td><td>c|d</td></tr></table>`);
  assert.ok(md.includes(String.raw`| a\\\|b | c\|d |`), md);
});
