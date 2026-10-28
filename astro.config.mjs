// @ts-check
import { defineConfig } from 'astro/config';

// The live address: the Worker's workers.dev name until it has a domain. Set the real domain here (or SITE_URL
// in the environment) at launch. It goes into canonicals, Open Graph, the sitemap, llms.txt and JSON-LD.
const site = (process.env.SITE_URL || 'https://uplink-site.johnoreilly.workers.dev').replace(/\/$/, '');

export default defineConfig({
  site,
  // services.html served at /services: the URLs, canonicals and sitemap the site has always had.
  // Astro's default ('directory') would make every address /services/.
  build: { format: 'file', inlineStylesheets: 'auto' },
  trailingSlash: 'never',
  // Astro 7's default ('jsx') drops the space between inline tags on separate lines, e.g. the hero title's
  // "<span>Your IT team,</span> <em>always online</em>". true keeps whitespace as written.
  compressHTML: true,
});
