// Writes a Markdown copy of every page once Astro has built them (astro.config.mjs runs it after svgo.mjs): dist/services.html →
// dist/services.md, dist/services/backup.html → dist/services/backup.md. AI agents read these instead of the HTML;
// each page links to its copy with <link rel="alternate" type="text/markdown"> (Base.astro), and llms.txt lists them.
// Only <main> is converted, so the header, footer and pop-ups stay out. Left out as well: drawings, buttons, chips,
// eyebrows, breadcrumbs and anything aria-hidden. Kept: headings (a .sr-only one too), prose, lists, the facts lists (with
// their links), the FAQ (question in bold, answer under it), and a hidden separator such as About's "name, role".
// Links become full addresses.
// Home is skipped: its Markdown is written by hand (src/data/index.md, served by src/pages/index.md.ts).
// 404 and soon are skipped: they are not pages anyone should cite.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import TurndownService from 'turndown';

const SKIP = ['index.html', '404.html', 'soon.html'];

const cls = (node, ...names) =>
  names.some((n) => (' ' + (node.getAttribute?.('class') || '') + ' ').includes(` ${n} `));
const text = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : '');
// turndown's DOM in Node (domino) has getElementsByTagName but no iterable querySelectorAll
const all = (node, tag) => Array.from(node.getElementsByTagName(tag));
const kids = (node) => Array.from(node.childNodes).filter((c) => c.nodeType === 1);

const md = (site, page) => {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' });
  // a rule, not td.remove(): turndown's own rules (images, links) win over remove(), added rules win over both.
  // data-md-skip on an element leaves it out (decorative parts with text in them, like the contact queue ring).
  // Chips are tags, not content, except as items of a list ("Known for" on About).
  const DROP = ['SCRIPT', 'STYLE', 'TEMPLATE', 'SVG', 'PICTURE', 'IMG', 'BUTTON', 'DIALOG', 'NAV'];
  td.addRule('drop', {
    filter: (node) =>
      DROP.includes(node.nodeName.toUpperCase()) ||
      node.getAttribute?.('aria-hidden') === 'true' ||
      node.hasAttribute?.('data-md-skip') ||
      node.hasAttribute?.('hidden') ||
      cls(node, 'tags', 'kbd', 'roster-wrap', 'eyebrow') ||
      (cls(node, 'chip') && node.parentNode?.nodeName !== 'LI') ||
      // a <Pause /> after a label: the label rule's ": " already separates ("Office move: Law office", not ": .")
      (cls(node, 'sr-only') &&
        !!node.previousElementSibling &&
        cls(node.previousElementSibling, 'label', 'chan-title', 'card-title')),
    replacement: () => '',
  });
  // a card that is one link (its title a heading holding .card-link, review M3): one line, "[Title](address): text",
  // not a heading inside a list item
  td.addRule('card', {
    filter: (node) => cls(node, 'card') && all(node, 'a').some((a) => cls(a, 'card-link')),
    replacement: (content) => {
      const m = content.trim().match(/^#+ +(.+)\n([\s\S]*)$/);
      return m ? `${m[1].trim()}: ${m[2].replace(/\s+/g, ' ').trim()}` : content;
    },
  });
  td.addRule('feature', { filter: (node) => cls(node, 'feat-d'), replacement: (content) => `: ${content.trim()}` });
  // a small label beside its value ("Clients supported" 120+, "Call" 1-855-…): one "Label: value" line; a label
  // over a block (a list) becomes a bold line of its own
  td.addRule('label', {
    filter: (node) =>
      node.nodeName === 'SPAN' && cls(node, 'label', 'chan-title', 'card-title') && !!node.nextElementSibling,
    replacement: (content, node) =>
      ['UL', 'OL', 'DL', 'DIV'].includes(node.nextElementSibling.nodeName)
        ? `\n\n**${content.trim()}**\n\n`
        : `${content.trim()}: `,
  });
  td.addRule('form', {
    // forms are for people: say where it is, not what its fields are
    filter: 'form',
    replacement: (_, node) =>
      `\n\n## ${text(all(node, 'h2')[0]) || 'Form'}\n\nUse the form on the page: ${page}#${node.closest('[id]')?.id || ''}\n\n`,
  });
  td.addRule('summary', { filter: 'summary', replacement: (content) => `\n\n**${content.trim()}**\n\n` });
  td.addRule('facts', {
    // <dl class="facts">: one "Label: value" line each; the value keeps its links
    filter: (node) => node.nodeName === 'DL',
    replacement: (_, node) =>
      '\n\n' +
      all(node, 'div')
        .map(
          (row) =>
            `- ${text(all(row, 'dt')[0])}: ${td
              .turndown(all(row, 'dd')[0]?.innerHTML || '')
              .replace(/\s+/g, ' ')
              .trim()}`,
        )
        .join('\n') +
      '\n\n',
  });
  td.addRule('table', {
    filter: 'table',
    replacement: (_, node) => {
      const cell = (c) => {
        // a cell's <small> note goes in brackets after its text (none today)
        const sub = text(all(c, 'small')[0]);
        return (sub ? `${text(c).replace(sub, '').trim()} (${sub})` : text(c)).replace(/[\\|]/g, '\\$&');
      };
      const rows = all(node, 'tr').map((tr) => kids(tr).map(cell));
      if (!rows.length) return '';
      const [head, ...body] = rows;
      return '\n\n' + [head, head.map(() => '---'), ...body].map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n\n';
    },
  });
  td.addRule('links', {
    // full addresses, so a copy read on its own still points somewhere
    filter: (node) => node.nodeName === 'A' && node.getAttribute('href'),
    replacement: (content, node) => {
      const href = node.getAttribute('href');
      const full = href.startsWith('/') ? site + href : href;
      const label = content.replace(/\s+/g, ' ').trim();
      return label ? `[${label}](${full})` : '';
    },
  });
  return td;
};

const attr = (html, re) => (html.match(re) || [])[1] || '';
// DIST: the built site's folder (dist/)
export function markdown(DIST) {
  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html') && !SKIP.includes(relative(DIST, p).split(sep).join('/'))) pages.push(p);
    }
  };
  walk(DIST);

  let n = 0;
  for (const file of pages) {
    const html = readFileSync(file, 'utf-8');
    const main = attr(html, /<main[^>]*>([\s\S]*?)<\/main>/);
    const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/);
    const description = attr(html, /<meta name="description" content="([^"]*)"/)
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&'); // last, so "&amp;quot;" stays "&quot;" (decoded once, not twice)
    if (!main || !canonical) throw new Error(`markdown: ${relative(DIST, file)} has no <main> or no canonical`);
    const site = new URL(canonical).origin;
    let body = md(site, canonical)
      .turndown(main)
      .replace(/^[ \t\xa0]+$/gm, '') // lines left holding only a space (or a no-break space)
      .replace(/^(\s*)(-|\d+\.) +/gm, '$1$2 ') // "-   item" → "- item"
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    // the page's summary (unless the page already opens with it) and address go right under its title
    const said = description.split(/(?<=\.) /).some((s) => s.length > 40 && body.includes(s));
    const summary = said ? '' : `> ${description}\n\n`;
    // anything before the title moves under it (no page has any today; kept so a card placed first can't lead the copy)
    const at = body.search(/^# /m);
    const before = at > 0 ? body.slice(0, at).trim() : '';
    if (before) body = body.slice(at);
    body = body.replace(/^(# .+)$/m, `$1\n\n${summary}Page: ${canonical}`);
    if (before) body = body.replace(/^(Page: .+)$/m, `$1\n\n${before}`);
    const note = 'This is a test build: Uplink Technology is a placeholder company and the copy is sample text.';
    writeFileSync(file.replace(/\.html$/, '.md'), `${body}\n\n---\n\n${note}\n`);
    n++;
  }
  console.log(`markdown: ${n} pages`);
}

// Run on its own (node scripts/markdown.mjs) on the folder DIST names. The build
// calls markdown() from the integration in astro.config.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) markdown(process.env.DIST || 'dist');
