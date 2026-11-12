// Finishes dist/_headers from the public/_headers template, the build's last step (astro.config.mjs runs it): the script
// and style hashes, the Early Hints and Markdown-copy rules, X-Build, and dist/_redirects (308s). docs/ops.md,
// "Response headers", "Search engines" and "Deploys". Each part's details sit beside its code below.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const WORKER_DIR = process.env.WORKER_DIR || fileURLToPath(new URL('worker', ROOT)); // likewise
// DIST: the built site's folder (dist/)
export function headers(DIST) {
  // Both lists are read from the built home page, so they can't drift from their sources: the drawings home.js puts
  // into the page (the stage's data-hero* addresses, HERO in src/lib/site.ts, the phone cut's dashes included), the one
  // footer.js puts in (the footer's data-fc-map, CAMPUS) and the fonts every screen preloads (Base.astro's preloads with
  // no media).
  const home = readFileSync(join(DIST, 'index.html'), 'utf-8');
  const INSERTED = [...home.matchAll(/\sdata-(?:hero[a-z-]*|fc-map)="\/([^"?]+)/g)].map((m) => m[1]);
  const FIRST_FONTS = [...home.matchAll(/<link rel="preload" href="(\/assets\/fonts\/[^"]+)"[^>]*>/g)]
    .filter((m) => !/\smedia=/.test(m[0]))
    .map((m) => m[1]);
  if (!INSERTED.some((f) => f.includes('hero')) || !INSERTED.some((f) => f.includes('campus')) || !FIRST_FONTS.length)
    throw new Error('dist/index.html: no data-hero* / data-fc-map drawings or font preloads found');
  const HINT = FIRST_FONTS.map((f) => `<${f}>; rel=preload; as=font; type="font/woff2"; crossorigin`).join(', ');

  const pages = [];
  const copies = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.html')) pages.push(p);
      else if (name.endsWith('.md')) copies.push(p);
    }
  };
  walk(DIST);

  const sha = (text) => "'sha256-" + createHash('sha256').update(text).digest('base64') + "'";
  const hashes = new Set();
  const styles = new Set();
  const attrs = [];
  // {style-hashes} covers every inline <style>: Astro's inlined CSS, the drawings inlined in the home page, and the
  // <style> blocks in the hero drawings and the footer's campus map (home.js and footer.js insert those SVGs into the
  // page, so their styles count as the page's). A style="" attribute stops the build: no hash covers one, so the CSP
  // would block it. Scripts set styles through the CSSOM (el.style.x = …) instead, which the CSP allows.
  const styleBlocks = (file, text) => {
    for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) styles.add(sha(m[1]));
    const n = [...text.matchAll(/<[a-zA-Z][^>]*\sstyle=["']/g)].length; // inside a tag, not prose about one
    if (n) attrs.push(`${relative(DIST, file).split(sep).join('/')} (${n})`);
  };
  for (const file of pages) {
    const html = readFileSync(file, 'utf-8');
    // {script-hashes}: today the one line in every head that adds html.js; change that line and the hash follows.
    // every inline script the browser runs: no src, and no type or a script type (JSON-LD and the like run nothing)
    for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
      const type = m[1].match(/\stype=["']?([^"'\s>]+)/)?.[1];
      if (!/\ssrc=/.test(m[1]) && (!type || /^(module|text\/javascript)$/i.test(type))) hashes.add(sha(m[2]));
    }
    styleBlocks(file, html);
  }
  for (const f of INSERTED) styleBlocks(join(DIST, f), readFileSync(join(DIST, f), 'utf-8'));
  if (attrs.length) throw new Error(`style="" attributes the CSP would block: ${attrs.join(', ')}`);

  // pages that are served at a path: index.html → /, services/help-desk.html → /services/help-desk (format 'file').
  // 404.html is served at any missing address, so no rule can name it; soon is noindex but still a page people see.
  const paths = pages
    .filter((f) => !f.endsWith(`${sep}404.html`))
    .map(
      (f) =>
        '/' +
        relative(DIST, f)
          .split(sep)
          .join('/')
          .replace(/index\.html$/, '')
          .replace(/\.html$/, ''),
    )
    .sort();
  const hints = paths.map((p) => `${p}\n  Link: ${HINT}\n`).join('');

  // A copy is never what a search should show, so its noindex stays after launch, when the site-wide one comes off
  // (review M4). A .md with no page beside it (agents.md) gets the noindex only; a page with no canonical stops the build.
  // each Markdown copy: services.md names services.html's canonical, index.md names index.html's (home, /)
  const markdown = copies
    .map((f) => {
      const md = relative(DIST, f).split(sep).join('/');
      const page = md.replace(/\.md$/, '.html');
      let canonical = null; // no page beside it (agents.md): noindex only
      try {
        canonical = readFileSync(join(DIST, page), 'utf-8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      } catch {
        /* stays null */
      }
      if (canonical === undefined)
        throw new Error(`${md}: its page ${page} has no <link rel="canonical">, so the copy can't name it`);
      return `/${md}\n  X-Robots-Tag: noindex\n${canonical ? `  Link: <${canonical}>; rel="canonical"\n` : ''}`;
    })
    .sort()
    .join('');

  // Cloudflare's own html_handling sends most of these spellings as 307 (temporary), which caches and crawlers don't
  // keep; a _redirects line wins over it.
  // every page, plus /404 (served at its own name too, by the Worker): its trailing-slash, .html and index spellings
  // (Cloudflare would send /index and /services/index.html on as 307s)
  const redirects = [...paths, '/404'].flatMap((p) =>
    p === '/'
      ? ['/index.html / 308', '/index / 308']
      : [`${p}/ ${p} 308`, `${p}.html ${p} 308`, `${p}/index.html ${p} 308`, `${p}/index ${p} 308`],
  );
  writeFileSync(join(DIST, '_redirects'), redirects.join('\n') + '\n');

  const src = readFileSync(join(DIST, '_headers'), 'utf-8');
  // a block the template marks with "# @NAME …" and "# @end NAME" lines; what's between them is written here
  const block = (name) => new RegExp(`(# @${name}[^\\n]*\\n)[\\s\\S]*?(# @end ${name}\\n)`);
  if (
    !src.includes('{script-hashes}') ||
    !src.includes('{style-hashes}') ||
    !src.includes('{build}') ||
    !block('early-hints').test(src) ||
    !block('markdown-copies').test(src)
  ) {
    throw new Error(
      'public/_headers needs the {script-hashes} and {style-hashes} placeholders, the {build} placeholder, and the @early-hints and @markdown-copies blocks',
    );
  }
  const filled = src
    .replaceAll('{script-hashes}', [...hashes].join(' '))
    .replaceAll('{style-hashes}', [...styles].join(' '))
    .replace(block('early-hints'), (_, start, end) => start + hints + end)
    .replace(block('markdown-copies'), (_, start, end) => start + markdown + end);

  // the build's ID (X-Build): every file in dist/ but _headers, the headers as they ship, and the Worker. A change to
  // any of them, a header or the Worker alone included, gives a new ID; scripts/deploy.mjs reads it to tell which build
  // the live address serves. It is a hash of public files and code in a public repository, so it gives nothing away.
  const files = (dir, skip = () => false) =>
    readdirSync(dir)
      .sort()
      .flatMap((name) => {
        const p = join(dir, name);
        return statSync(p).isDirectory() ? files(p, skip) : skip(p) ? [] : [p];
      });
  const id = createHash('sha256');
  const add = (label, bytes) => id.update(`${label}\0${bytes.length}\0`).update(bytes);
  for (const f of files(DIST, (p) => relative(DIST, p) === '_headers'))
    add(`dist/${relative(DIST, f).split(sep).join('/')}`, readFileSync(f));
  add('_headers', Buffer.from(filled));
  for (const f of files(WORKER_DIR)) add(`worker/${relative(WORKER_DIR, f).split(sep).join('/')}`, readFileSync(f));
  add('wrangler.jsonc', readFileSync(new URL('wrangler.jsonc', ROOT)));
  const build = id.digest('hex').slice(0, 16);
  const out = filled.replaceAll('{build}', build);
  writeFileSync(join(DIST, '_headers'), out);

  const rules = out.split('\n').filter((l) => /^\S/.test(l) && !l.startsWith('#')).length;
  const longest = Math.max(...out.split('\n').map((l) => l.length));
  if (rules > 100 || longest > 2000)
    throw new Error(`_headers over Cloudflare's limits: ${rules} rules (max 100), longest line ${longest} (max 2000)`);
  console.log(
    `_headers: build ${build}, ${hashes.size} script hash(es), ${styles.size} style hash(es), Early Hints for ${paths.length} pages, ${copies.length} Markdown copies, ${rules} rules, longest line ${longest}; _redirects: ${redirects.length} lines`,
  );
}

// Run on its own (node scripts/headers.mjs) on the folder DIST names. The build
// calls headers() from the integration in astro.config.mjs.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) headers(process.env.DIST || 'dist');
