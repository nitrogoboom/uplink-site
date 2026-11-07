// Tests for src/lib/placeholders.mjs (review M8): the {name} placeholders in src/data/*.md, filled in the Markdown's
// syntax tree by Astro's own Markdown processor (Sätteri, as astro.config.mjs sets it up), so values are escaped,
// links work, and a name with no value stops the build, whichever way it's spelt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createSatteriMarkdownProcessor } from '@astrojs/markdown-satteri';
import { PLACEHOLDER, fill, placeholders } from '../../src/lib/placeholders.mjs';

const VALUES = { privacy: 'privacy@example.test', phone: '1-855-555-0100', tel: '+18555550100', street: 'King & <Bay> "St"' };
const render = async (md) => {
  const renderer = await createSatteriMarkdownProcessor({ mdastPlugins: [placeholders(VALUES)] });
  return (await renderer.render(md, { fileURL: pathToFileURL('/site/src/data/privacy.md') })).code;
};

test('placeholders: text and link addresses filled; values escaped as text', async () => {
  const html = await render('Write to [{privacy}](mailto:{privacy}) or call [{phone}](tel:{tel}).\n\nMail: {street}\n\n[ref][r]\n\n[r]: mailto:{privacy}\n');
  assert.ok(html.includes('<a href="mailto:privacy@example.test">privacy@example.test</a>'), html);
  assert.ok(html.includes('<a href="tel:+18555550100">1-855-555-0100</a>'), html);
  assert.ok(html.includes('King &amp; &lt;Bay&gt;'), `a value is text, never markup: ${html}`);
  assert.ok(!html.includes('<Bay>'), html);
  assert.ok(html.includes('<a href="mailto:privacy@example.test">ref</a>'), `a reference link's definition: ${html}`);
  assert.ok(!new RegExp(PLACEHOLDER.source, 'i').test(html), `nothing left unfilled: ${html}`);
});

test('placeholders: a name with no value stops the build, in text, in an address, and spelt %7Bname%7D', async () => {
  for (const md of ['Call {phon}.', '[Call](tel:{tell})', '[Write](mailto:%7Bprivasy%7D)']) {
    await assert.rejects(render(md), /privacy\.md: no value for the placeholder \{(phon|tell|privasy)\}/, md);
  }
});

test('placeholders: fill() for plain text (Home\'s Markdown); the pattern TextPage.astro checks with', () => {
  assert.equal(fill('{phone} or %7Bphone%7D', VALUES, 'x'), '1-855-555-0100 or 1-855-555-0100');
  assert.throws(() => fill('{nope}', VALUES, 'src/data/index.md'), /src\/data\/index\.md: no value for the placeholder \{nope\}/);
  for (const left of ['<a href="mailto:{privacy}">', 'href="mailto:%7Bprivacy%7D"']) assert.match(left, new RegExp(PLACEHOLDER.source, 'i'));
  assert.doesNotMatch('function () { return 1; }', new RegExp(PLACEHOLDER.source, 'i'));
});
