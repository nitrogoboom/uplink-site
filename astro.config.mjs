// @ts-check
import { defineConfig } from 'astro/config';

// The live address. A test build for now; set the real domain here (or SITE_URL in the environment) at launch.
const site = (process.env.SITE_URL || 'https://uplink-site-4p8.pages.dev').replace(/\/$/, '');

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
