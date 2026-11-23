// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { placeholders } from './src/lib/placeholders.mjs';
import { PLACEHOLDERS } from './src/lib/footer.ts';

// The site's address: jodesign.ca, the project's primary domain (wrangler.jsonc, routes); SITE_URL in the environment
// overrides it. It goes into canonicals, Open Graph, the sitemap and JSON-LD.
const site = (process.env.SITE_URL || 'https://jodesign.ca').replace(/\/$/, '');

export default defineConfig({
  site,
  // Languages (src/lib/i18n.ts): English at /, any other at /<language>/. To add French: add 'fr' here, then
  // src/content/fr/ beside en/.
  i18n: { locales: ['en'], defaultLocale: 'en' },
  // No security.csp here: the Content Security Policy is one header in public/_headers. Astro would write it into
  // each page as a <meta>, and with that Chrome read and laid out the whole page before painting any of it; Astro
  // writes it as a header only for Vercel and Netlify (their adapters' staticHeaders).
  // format 'file': services.html, served at /services (Astro's default, 'directory', would make every address
  // /services/). inlineStylesheets 'always': each page carries its CSS inside it, so nothing waits on a second
  // request before the first paint.
  build: { format: 'file', inlineStylesheets: 'always' },
  trailingSlash: 'never',
  // Astro 7's default ('jsx') drops the space between inline tags on separate lines, e.g. the hero title's
  // "<span>Your IT team,</span> <em>always online</em>". true trims whitespace but keeps one space where it shows.
  compressHTML: true,
  // Astro's own Markdown processor, plus the plugin that fills {phone}, {privacy} … in src/content/en/*.md from
  // footer.json (src/lib/placeholders.mjs). Restart `npm run dev` after changing footer.json to see it there.
  // No code highlighting: the Markdown holds no code, and the highlighter's inline styles don't pass the CSP.
  markdown: { syntaxHighlight: false, processor: satteri({ mdastPlugins: [placeholders(PLACEHOLDERS)] }) },
  // Barlow and Barlow Condensed, the five faces in src/assets/fonts/ (English and French letters only, no hinting:
  // docs/ops.md, "Fonts are Astro's"; SIL Open Font License: public/assets/fonts/OFL.txt). Astro writes their @font-face rules and gives each file a hashed name under /_astro/fonts/, so a changed
  // font is a new address (cached a year, public/_headers). Base.astro's <Font> tags put them in each page and preload
  // the faces every first screen uses. The fallbacks are the measured ones in src/styles/fonts.css (Arial or
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
