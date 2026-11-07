// The SVGO settings for every drawing the site ships: scripts/svgo.mjs runs them on dist/assets/img/ after the
// build, and Grow.astro on the world it inlines into Home (inlined drawings never reach dist/assets/img/).
// What must survive, so a few SVGO defaults are off:
//   ids and classes        home.js, the hero CSS and the footer find parts by them (cleanupIds, collapseGroups)
//   <style> as written     the embedded fonts, and rules for classes the scripts add later, like .is-on
//                          (minifyStyles would drop those as unused; inlineStyles would write style="" attributes,
//                          which the CSP blocks)
//   hidden parts           display="none" paths the hero shows from script, the Grow world's r="0" anchor circles
//                          (removeHiddenElems)
//   role="img"             with the aria-label, so screen readers read a drawing as one picture (removeUnknownsAndDefaults)
//   empty groups           ones a script fills, like the Grow dome's <g class="dome-orbit"> (removeEmptyContainers)
// (SVGO 4 keeps the viewBox on its own.)
// What doesn't survive: shape tags. SVGO writes <polygon>, <rect>, <line> and the like as <path>, so a drawing's CSS
// (its own <style>, or the site's: footer.css for the campus map) styles parts by class, never by tag. shrink()
// refuses a drawing whose own <style> names a tag the output no longer has (review B9: the hero's tiles lost their
// edges and fades that way).
// shipped(): a drawing as the site serves it, for the ?v= on the drawings the pages insert (src/lib/site.ts), so a
// change in SVGO's output is a new address too (review B10).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VERSION, optimize } from 'svgo';

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

const SHAPES = ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'use', 'image', 'g', 'stop'];
const has = (svg, tag) => new RegExp(`<${tag}[\\s/>]`).test(svg);

// the shape tags a drawing's own <style> names in a selector (".ob-tile polygon" -> polygon), not in a declaration
export function styledTags(svg) {
  const css = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('').replace(/\/\*[\s\S]*?\*\//g, '');
  const tags = new Set();
  let prelude = '';
  for (const ch of css) {
    if (ch === '{') {
      if (!prelude.trim().startsWith('@'))
        for (const t of SHAPES) if (new RegExp(`(^|[\\s>+~,(])${t}(?=$|[\\s.#:\\[>+~,)])`).test(prelude.trim())) tags.add(t);
      prelude = '';
    } else if (ch === '}' || ch === ';') prelude = '';
    else prelude += ch;
  }
  return [...tags];
}

// SVGO with the site's settings; throws if a tag the drawing's <style> names is gone from the output. A big drawing
// takes SVGO seconds and the build shrinks each one twice (site.ts for its ?v=, then svgo.mjs), so the output is kept
// in node_modules/.cache, under a hash of the drawing, these settings and SVGO's version.
const CACHE = 'node_modules/.cache/uplink-svgo';
const SALT = createHash('sha1').update(JSON.stringify(SVGO)).update(VERSION).digest('hex');
export function shrink(svg, name = 'drawing') {
  const file = join(CACHE, `${createHash('sha1').update(SALT).update(svg).digest('hex')}.svg`);
  if (existsSync(file)) return readFileSync(file, 'utf-8');
  const out = optimize(svg, SVGO).data;
  const lost = styledTags(svg).filter((t) => has(svg, t) && !has(out, t));
  if (lost.length)
    throw new Error(`${name}: its <style> styles <${lost.join('>, <')}>, but SVGO turns every one into something else (style it by class)`);
  try {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, out);
  } catch {
    /* no cache: the next build shrinks it again */
  }
  return out;
}

// the bytes the site serves for a file in public/ (a drawing after shrink(), anything else as it is)
export const shipped = (path) => {
  const text = readFileSync(`public${path}`, 'utf-8');
  return path.endsWith('.svg') ? shrink(text, path) : text;
};
