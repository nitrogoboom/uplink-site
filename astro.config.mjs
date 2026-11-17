// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { placeholders } from './src/lib/placeholders.mjs';
import { PLACEHOLDERS } from './src/lib/footer.ts';
import { fileURLToPath } from 'node:url';
import { svgo } from './scripts/svgo.mjs';
import { preload } from './scripts/preload.mjs';
import { headers } from './scripts/headers.mjs';

// The live address: the Worker's workers.dev name until it has a domain. Set the real domain here (or SITE_URL
// in the environment) at launch. It goes into canonicals, Open Graph, the sitemap and JSON-LD.
const site = (process.env.SITE_URL || 'https://uplink-site.johnoreilly.workers.dev').replace(/\/$/, '');

// Finishes dist/ once Astro has written it, so `astro build` alone gives the site as it ships: the drawings shrunk,
// each page's script preloads, then dist/_headers (CSP hashes, X-Build, Early Hints) and dist/_redirects. The order
// matters: headers() hashes the drawings' <style> blocks after svgo(), and the pages as preload() leaves them. A step that throws fails the build. docs/ops.md, "Response headers".
/** @type {import('astro').AstroIntegration} */
const finish = {
  name: 'uplink-finish',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const dist = fileURLToPath(dir);
      svgo(dist);
      preload(dist);
      headers(dist);
    },
  },
};

export default defineConfig({
  site,
  integrations: [finish],
  // services.html served at /services: the URLs, canonicals and sitemap the site has always had.
  // Astro's default ('directory') would make every address /services/.
  // inlineStylesheets 'always': each page carries its CSS in <style> blocks (about 19 KB gzipped), so nothing blocks
  // the first paint (PageSpeed's render-blocking requests). The cost: no CSS file cached across pages. headers.mjs
  // hashes the blocks for the CSP and stops the build if the header outgrows Cloudflare's limits.
  build: { format: 'file', inlineStylesheets: 'always' },
  trailingSlash: 'never',
  // Astro 7's default ('jsx') drops the space between inline tags on separate lines, e.g. the hero title's
  // "<span>Your IT team,</span> <em>always online</em>". true keeps whitespace as written.
  compressHTML: true,
  // Astro's own Markdown processor, plus the plugin that fills {phone}, {privacy} … in src/data/*.md from
  // footer.json (src/lib/placeholders.mjs). Restart `npm run dev` after changing footer.json to see it there.
  markdown: { processor: satteri({ mdastPlugins: [placeholders(PLACEHOLDERS)] }) },
  // Barlow and Barlow Condensed, the five faces in src/assets/fonts/ (English and French letters only, no hinting:
  // docs/ops.md, "Fonts are Astro's"; SIL Open Font License: public/assets/fonts/OFL.txt). Astro writes their @font-face rules and gives each file a hashed name under /_astro/fonts/, so a changed
  // font is a new address (cached a year, public/_headers). Base.astro's <Font> tags put them in each page and preload
  // the two faces every first screen uses. The fallbacks are the measured ones in src/styles/fonts.css (Arial or
  // Liberation Sans resized to Barlow, and Roboto for Android), so Astro's own fallback guess is off.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Barlow',
      cssVariable: '--font-barlow',
      fallbacks: [
        'Barlow Fallback',
        'Barlow Fallback Roboto',
        'Segoe UI',
        'Roboto',
        'Helvetica',
        'Arial',
        'sans-serif',
      ],
      optimizedFallbacks: false,
      options: {
        variants: [
          { weight: 400, style: 'normal', display: 'swap', src: ['./src/assets/fonts/barlow-400.woff2'] },
          { weight: 600, style: 'normal', display: 'swap', src: ['./src/assets/fonts/barlow-600.woff2'] },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Barlow Condensed',
      cssVariable: '--font-barlow-condensed',
      fallbacks: [
        'Barlow Condensed Fallback',
        'Barlow Condensed Fallback Roboto',
        'Roboto Condensed',
        'Arial Narrow',
        'sans-serif',
      ],
      optimizedFallbacks: false,
      options: {
        variants: [
          { weight: 600, style: 'normal', display: 'swap', src: ['./src/assets/fonts/barlow-condensed-600.woff2'] },
          { weight: 700, style: 'normal', display: 'swap', src: ['./src/assets/fonts/barlow-condensed-700.woff2'] },
          {
            weight: 700,
            style: 'italic',
            display: 'swap',
            src: ['./src/assets/fonts/barlow-condensed-700-italic.woff2'],
          },
        ],
      },
    },
  ],
});
