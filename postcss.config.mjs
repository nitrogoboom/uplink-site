// PostCSS, run by Vite on every stylesheet (dev and build): named screen sizes. Each file gets the names in
// src/lib/media.js as @custom-media rules on top, and postcss-custom-media writes the query in wherever the file uses
// one (@media (--desktop)) and drops the rules, so the CSS that ships has plain media queries.
import customMedia from 'postcss-custom-media';
import { MEDIA } from './src/lib/media.js';

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const names = {
  postcssPlugin: 'media-names',
  Once(root, { AtRule }) {
    for (const [name, query] of Object.entries(MEDIA))
      root.prepend(new AtRule({ name: 'custom-media', params: `--${kebab(name)} ${query}` }));
  },
};

// Settings, Reduce motion (core.js): html[data-motion] is "reduce" (the visitor turned it on, or their device asks for
// less motion and they haven't turned it off) or "full" (they turned it off, the device's setting notwithstanding).
// The CSS keeps writing plain prefers-reduced-motion queries, and this follows them to the attribute, the way
// postcss-dark-theme-class does for prefers-color-scheme:
//   @media (prefers-reduced-motion: reduce) { A }   A's selectors take :root:not([data-motion='full']), and A is
//                                                   copied after it with :root[data-motion='reduce']
//   @media (... prefers-reduced-motion: no-preference) { B }   B's selectors take :root:not([data-motion='reduce']),
//                                                   and B is copied with :root[data-motion='full'] under the rest of
//                                                   the query (or none)
// Without script there's no attribute, so the queries alone decide. A rule with no selector (say @view-transition)
// can't follow an attribute, so the copies drop it.
const REDUCE = "[data-motion='reduce']";
const NOT_REDUCE = ":not([data-motion='reduce'])";
const FULL = "[data-motion='full']";
const NOT_FULL = ":not([data-motion='full'])";
const scope = (sel, attr) =>
  sel
    .split(',')
    .map((s) => {
      const t = s.trim();
      const m = t.match(/^(html|:root)(?![\w-])/);
      return m ? m[1] + attr + t.slice(m[1].length) : `:root${attr} ${t}`;
    })
    .join(', ');
const inKeyframes = (r) => r.parent?.type === 'atrule' && /keyframes/.test(r.parent.name);
const scoped = (node, attr) => {
  node.walkRules((r) => {
    if (!inKeyframes(r)) r.selector = scope(r.selector, attr);
  });
  return node;
};
const selectorless = (node) => {
  node.walkAtRules((a) => {
    if (!a.nodes?.some((n) => n.type === 'rule' || n.type === 'atrule')) a.remove(); // @view-transition {…}
  });
  return node;
};
const motion = {
  postcssPlugin: 'motion-choice',
  Once(root, { AtRule }) {
    root.walkAtRules('media', (at) => {
      if (!at.params.includes('prefers-reduced-motion') || at.motionDone) return;
      if (at.params.includes('prefers-reduced-motion: no-preference')) {
        const rest = at.params.replace(/(\s*and\s*)?\(prefers-reduced-motion: no-preference\)(\s*and\s*)?/, ' ').trim();
        const copy = scoped(at.clone(), FULL);
        selectorless(copy);
        scoped(at, NOT_REDUCE);
        if (rest) {
          const wrap = new AtRule({ name: 'media', params: rest });
          wrap.append(copy.nodes);
          at.after(wrap);
        } else at.after(copy.nodes);
      } else if (at.params.trim() === '(prefers-reduced-motion: reduce)') {
        const copy = selectorless(scoped(at.clone(), REDUCE));
        scoped(at, NOT_FULL);
        at.after(copy.nodes);
      } else {
        throw at.error(
          `motion-choice: write "${at.params}" as (prefers-reduced-motion: reduce) alone, or teach this plugin`,
        );
      }
      at.motionDone = true;
    });
  },
};

export default { plugins: [names, motion, customMedia()] };
