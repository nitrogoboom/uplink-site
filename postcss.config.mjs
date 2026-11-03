// PostCSS, run by Vite on every stylesheet (dev and build): named screen sizes. Each file gets the names in
// src/lib/media.js as @custom-media rules on top, and postcss-custom-media writes the query in wherever the file uses
// one (@media (--desktop)) and drops the rules, so the CSS that ships has plain media queries.
import customMedia from 'postcss-custom-media';
import { MEDIA } from './src/lib/media.js';

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const names = {
  postcssPlugin: 'media-names',
  Once(root, { AtRule }) {
    for (const [name, query] of Object.entries(MEDIA)) root.prepend(new AtRule({ name: 'custom-media', params: `--${kebab(name)} ${query}` }));
  },
};

export default { plugins: [names, customMedia()] };
