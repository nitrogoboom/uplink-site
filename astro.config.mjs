// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { placeholders } from './src/lib/placeholders.mjs';
import { PLACEHOLDERS } from './src/lib/footer.ts';

// The live address: the Worker's workers.dev name until it has a domain. Set the real domain here (or SITE_URL
// in the environment) at launch. It goes into canonicals, Open Graph, the sitemap, llms.txt and JSON-LD.
const site = (process.env.SITE_URL || 'https://uplink-site.johnoreilly.workers.dev').replace(/\/$/, '');

export default defineConfig({
  site,
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
});
