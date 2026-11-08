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

// Settings, Reduce motion (core.js): html[data-motion="reduce"] when the visitor turns it on or the device asks for less
// motion. The CSS keeps writing plain prefers-reduced-motion queries, and this follows them to the attribute, the way
// postcss-dark-theme-class does for prefers-color-scheme:
//   @media (prefers-reduced-motion: reduce) { A }   stays (without script it's all there is), and A is copied after
//                                                   it with :root[data-motion='reduce'] on each selector
//   @media (... prefers-reduced-motion: no-preference) { B }   B's selectors take :root:not([data-motion='reduce'])
// A rule with no selector (@view-transition) can't follow an attribute: page-transitions.css says what it does instead.
const ON = "[data-motion='reduce']";
const OFF = ":not([data-motion='reduce'])";
const scope = (sel, attr) =>
  sel
    .split(',')
    .map((s) => {
      const t = s.trim();
      const m = t.match(/^(html|:root)(?![\w-])/);
      return m ? m[1] + attr + t.slice(m[1].length) : `:root${attr} ${t}`;
    })
    .join(', ');
const motion = {
  postcssPlugin: 'motion-choice',
  Once(root) {
    root.walkAtRules('media', (at) => {
      if (!at.params.includes('prefers-reduced-motion')) return;
      if (at.params.includes('prefers-reduced-motion: no-preference')) {
        at.walkRules((r) => {
          if (r.parent?.type !== 'atrule' || !/keyframes/.test(r.parent.name)) r.selector = scope(r.selector, OFF);
        });
      } else if (at.params.trim() === '(prefers-reduced-motion: reduce)') {
        const copy = at.clone();
        copy.walkRules((r) => {
          if (r.parent?.type !== 'atrule' || !/keyframes/.test(r.parent.name)) r.selector = scope(r.selector, ON);
        });
        copy.walkAtRules((a) => {
          if (!a.nodes?.some((n) => n.type === 'rule' || n.type === 'atrule')) a.remove(); // @view-transition {…}
        });
        at.after(copy.nodes);
      } else {
        throw at.error(
          `motion-choice: write "${at.params}" as (prefers-reduced-motion: reduce) alone, or teach this plugin`,
        );
      }
    });
  },
};

export default { plugins: [names, motion, customMedia()] };
