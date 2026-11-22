// The SVGO settings for every drawing the site ships: scripts/svgo.mjs runs them on dist/assets/img/ after the
// build, and Grow.astro on the world it inlines into Home (README, "How the repository is organized"). Why each
// default is off, why shape tags can't be styled, and shipped(): beside the code below.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION, optimize } from 'svgo';

// What must survive, so a few SVGO defaults are off:
//   ids and classes        home.js, the hero CSS and the footer find parts by them (cleanupIds, collapseGroups)
//   <style> as written     the embedded fonts, and rules for classes the scripts add later, like .is-on
//                          (minifyStyles would drop those as unused; inlineStyles would write style="" attributes,
//                          which the CSP blocks)
//   hidden parts           display="none" parts, the Grow world's r="0" anchor circles
//                          (removeHiddenElems)
//   role="img"             with the aria-label, so screen readers read a drawing as one picture (removeUnknownsAndDefaults)
//   empty groups           ones a script fills, like the Grow dome's <g class="dome-orbit"> (removeEmptyContainers)
// (SVGO 4 keeps the viewBox on its own.)
/** @type {import('svgo').Config} */
export const SVGO = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          minifyStyles: false,
          inlineStyles: false,
          removeHiddenElems: false,
          removeEmptyContainers: false,
          mergeStyles: false,
          removeUnknownsAndDefaults: { keepRoleAttr: true },
        },
      },
    },
  ],
};

// What doesn't survive: shape tags. SVGO writes <polygon>, <rect>, <line> and the like as <path>, so a drawing's CSS
// (its own <style>, or the site's: footer.css for the campus map) styles parts by class, never by tag. shrink()
// refuses a drawing whose own <style> names a tag the output no longer has (review B9: the hero's tiles lost their
// edges and fades that way).
const SHAPES = [
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'use',
  'image',
  'g',
  'stop',
];
const has = (/** @type {string} */ svg, /** @type {string} */ tag) => new RegExp(`<${tag}[\\s/>]`).test(svg);

// the shape tags a drawing's own <style> names in a selector (".ob-tile polygon" -> polygon), not in a declaration
/** @param {string} svg */
export function styledTags(svg) {
  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1])
    .join('')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const tags = new Set();
  let prelude = '';
  for (const ch of css) {
    if (ch === '{') {
      if (!prelude.trim().startsWith('@'))
        for (const t of SHAPES)
          if (new RegExp(`(^|[\\s>+~,(])${t}(?=$|[\\s.#:\\[>+~,)])`).test(prelude.trim())) tags.add(t);
      prelude = '';
    } else if (ch === '}' || ch === ';') prelude = '';
    else prelude += ch;
  }
  return [...tags];
}

// What a shipped drawing may hold: drawing tags, and nothing that runs or leads anywhere. home.js and footer.js put
// drawings into the page as HTML (core.js's html() passes them on unchecked), so they are checked here, where they are
// made, on the bytes that ship (owner, November 17, 2026). A drawing with a tag outside TAGS, an on…= handler or an
// address (href) stops the build: look at the drawing, then add the tag here if it belongs. No <use>, <image>, <a>,
// <script> or <foreignObject>: none is needed, and each can load or run something.
const TAGS = new Set(
  'svg g defs title desc style path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask filter feGaussianBlur feDropShadow'.split(
    ' ',
  ),
);
/** @param {string} svg @param {string} name */
export function vet(svg, name) {
  // tags only: a <style> block's CSS (the embedded fonts, > in a selector) isn't markup
  const markup = svg.replace(/(<style[^>]*>)[\s\S]*?(<\/style>)/g, '$1$2');
  const bad = new Set();
  for (const [, tag, attrs] of markup.matchAll(/<([a-zA-Z][\w:.-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g)) {
    if (!TAGS.has(tag)) bad.add(`<${tag}>`);
    for (const [, attr] of attrs.matchAll(/(?:^|[\s"'/])(on[a-z]+|(?:xlink:)?href)\s*=/gi)) bad.add(`${attr}=`);
  }
  if (/javascript:/i.test(markup)) bad.add('javascript:');
  if (bad.size)
    throw new Error(
      `${name}: holds ${[...bad].join(', ')}. A drawing ships only drawing tags, with no handlers or addresses (TAGS in scripts/svgo-config.mjs)`,
    );
  return svg;
}

// SVGO with the site's settings; throws if a tag the drawing's <style> names is gone from the output. A big drawing
// takes SVGO seconds and the build shrinks each one twice (site.ts for its ?v=, then svgo.mjs), so the output is kept
// in node_modules/.cache, under a hash of the drawing, these settings and SVGO's version.
const CACHE = 'node_modules/.cache/uplink-svgo';
const SALT = createHash('sha1').update(JSON.stringify(SVGO)).update(VERSION).digest('hex');
/** @param {string} svg */
export function shrink(svg, name = 'drawing') {
  const file = join(CACHE, `${createHash('sha1').update(SALT).update(svg).digest('hex')}.svg`);
  if (existsSync(file)) return vet(readFileSync(file, 'utf-8'), name); // a kept output is checked again: it's cheap
  const out = vet(optimize(svg, SVGO).data, name);
  const lost = styledTags(svg).filter((t) => has(svg, t) && !has(out, t));
  if (lost.length)
    throw new Error(
      `${name}: its <style> styles <${lost.join('>, <')}>, but SVGO turns every one into something else (style it by class)`,
    );
  try {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, out);
  } catch {
    /* no cache: the next build shrinks it again */
  }
  return out;
}

// shipped(): a drawing as the site serves it, for the ?v= on the drawings the pages insert (src/lib/site.ts), so a
// change in SVGO's output is a new address too (review B10).
// the bytes the site serves for a file in public/ (a drawing after shrink(), anything else as it is)
export const shipped = (/** @type {string} */ path) => {
  const text = readFileSync(`public${path}`, 'utf-8');
  return path.endsWith('.svg') ? shrink(text, path) : text;
};
