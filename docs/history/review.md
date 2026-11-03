# Site review: from vibe-coded mockup to a real Astro site

28 Oct 2026. A developer's read of the whole project: build, hosting, indexing, security, performance, code and repo. Checked against Astro 7.4 (current), Cloudflare's Workers static assets docs, and Google's search guidance.

Open items that come out of this go in `notes.md` once you pick them. This file is the reasoning.

## Verdict in five lines

1. The site itself is in good shape: real HTML, works without script, strong accessibility, security headers, PageSpeed 100. Most mockup sites never get there.
2. The build is the weak part. `tools/build_pages.py`, `stamp.py`, `build_footer.py` and `verify_css_split.py` are a hand-made Astro. Moving to Astro deletes about 600 lines of Python and the rules that go with them (BORROWS, `{site}`, the 404 link rewrite, the inline-CSS split).
3. The biggest search problem is structure, not tags: seven services and six projects live at two URLs. Google indexes URLs, not `#fragments`, so they are invisible as results. Astro makes one page per service and project cheap.
4. Hosting: Cloudflare now says use Workers for new projects. Pages still works. Move when you move to Astro; it is one config file.
5. There is no CI. Deploys go from one PC with `--commit-dirty=true`. A push-to-deploy pipeline with preview URLs is the first thing a second developer would ask for.

## What is already good (keep it)

- Content is in the HTML. Script only shows one thing at a time. Every page reads with script off.
- One `<h1>` per page, real `<title>` and description, canonical, Open Graph, JSON-LD, sitemap, robots, `llms.txt`.
- Accessibility: skip link, native `<dialog>`, focus return, `aria-current`, live regions, reduced motion, keyboard map. Better than most agency sites.
- Security headers: HSTS, nosniff, Referrer-Policy, Permissions-Policy, COOP, CSP with a script hash and Trusted Types. Rare for a brochure site.
- Self-hosted fonts with size-adjusted fallbacks, preloads, Early Hints, year-long caching with content hashes.
- Drawings from scripts with checkers. Keep all of `tools/gen_*.py`, `check.py`, `painter.py`, `palette.py`, `iso*.py`. They are not part of the site build and move over as they are.
- The docs (`README.md`, `src/README.md`, `CLAUDE.md`, `notes.md`) are honest and current. Keep that habit.

## A. The build and the Astro move

### Where we stand against Astro 7

- Current Astro is 7.4.2 (21 Oct 2026). Needs Node 22.23.4 or newer; this PC has Node 24.19, fine.
- Astro 7 changes that matter here:
  - The compiler is strict. An unclosed tag or a bad nesting (`<div>` in `<p>`) is a build error, not a fix-up. Run every section through it once; expect a few errors.
  - `compressHTML` now defaults to `'jsx'`: whitespace between inline tags on separate lines disappears. The hero title is `<span class="line">Your IT team,</span> <em class="line">always online</em>`: that space would vanish. Set `compressHTML: true` in the config to keep the old behaviour.
  - `security.csp` (stable since 6.0) writes a CSP `<meta>` tag with hashes for every inline style and script Astro emits. This is the clean answer to `style-src 'unsafe-inline'` (see Security).
  - SVG files import as components (`import Hero from '../assets/hero.svg'; <Hero />`) and are inlined. That is the tower and the hero flows layer with no build glue.
  - The Fonts API (`fonts` in config with `fontProviders.local()`, `<Font preload />`) does what `fonts.css` does by hand, fallback metrics included. Optional; the hand version is correct and can stay in phase one.
  - Cross-document view transitions (what `page-transitions.css` does with `@view-transition`) need nothing from Astro. Do not add `<ClientRouter />`; it is a script router and does not work with the CSP feature.

### What Astro replaces, file by file

| Now | In Astro |
|---|---|
| `src/pages/*/page.html` (the `<head>` copied seven times) | one `src/layouts/Base.astro` with `title`, `description`, `scripts` props |
| `<!-- @include Header -->` and the `aria-current` fill-in | `<Header current="services" />` |
| `build_pages.py` `{site}` | `site` in `astro.config.mjs`, `Astro.site`, `Astro.url` |
| the 404 root-link rewrite | every link root-relative (`/services`), so nothing to rewrite |
| `stamp.py` `?v=` hashes | Astro hashes every bundled asset by name (`/_astro/site.3f2a.css`) |
| inline CSS per page, `BORROWS`, `verify_css_split.py` | `build.inlineStylesheets` and scoped `<style>` per component; each page gets exactly its own CSS |
| `build_footer.py` writing `Footer.html` | `src/data/footer.json` and `Footer.astro` reads it |
| `structured()` scraping JSON-LD out of the HTML with regex | JSON-LD written from the same data the page is built from |
| `sitemap.xml`, `robots.txt` written by hand in the build | `@astrojs/sitemap` (adds `lastmod`), `public/robots.txt` |
| `llms.txt`, `agents.md`, `index.md` | `src/pages/llms.txt.ts` and friends, built from the content collection |
| `serve.py` | `astro dev` |
| the Early Hints block in `_headers` | a 20-line script after `astro build`, or drop it (see Performance) |
| `deploy.py` | `wrangler deploy` from CI |

### Target layout

```
astro.config.mjs        site, build.format 'file', trailingSlash 'never', compressHTML true, security.csp
wrangler.jsonc          assets.directory ./dist, not_found_handling '404-page', compatibility_date today
package.json            astro, @astrojs/sitemap, wrangler, playwright, prettier + prettier-plugin-astro
src/
  layouts/Base.astro    the shared head, header, footer, dialogs, toasts
  components/           Header, BottomNav, Footer, BookDialog, ShortcutsDialog, Icon
  components/home/      Hero, Services, Grow, Process, Proof   (one file per section, as now)
  components/services/  Picker, Plans, Faq
  components/work/      Projects, Details, CasePopup, Industries
  components/about/     Profile, Story, Team
  components/contact/   Message, Support
  pages/
    index.astro
    services/index.astro, services/[slug].astro
    work/index.astro, work/[slug].astro
    about.astro, contact.astro, 404.astro
    llms.txt.ts, agents.md.ts, index.md.ts
  content/
    services/*.md       one per service: title, lead, features, bestFor, drawing, order
    projects/*.md       one per case study
    faq.json, plans.json, team.json, footer.json, industries.json
  content.config.ts     the schema for each collection (zod)
  styles/               tokens.css, then the shared files as now (base, layout, type, header ...)
  scripts/              core.ts, footer.ts, home.ts, services.ts, work.ts, contact.ts  (ES modules)
  assets/img/           every drawing, written by tools/gen_*.py as now
public/
  _headers, robots.txt, favicon.svg, apple-touch-icon.png, og.png
  assets/fonts/         unchanged names, so fonts.css and the preloads keep working
tools/                  the Python drawing tools, unchanged, writing to src/assets/img/
```

Choices baked in:

- `build.format: 'file'` and `trailingSlash: 'never'`: output stays `services.html` served at `/services`, exactly the URLs, canonicals and sitemap you have now. Astro's default (`directory`) would change every URL to `/services/`.
- Section files become components, as `src/README.md` already planned. Each one's CSS goes in its `<style>`; shared CSS stays global in `src/styles/`.
- The service picker, project filters and pop-ups keep working on the index pages. Each service and project also gets its own URL. The picker tiles link to those URLs on the index; on a service page the same content shows without the picker.
- Scripts: `core.js` and friends become modules Astro bundles and hashes. `window.Uplink` can stay as the shared object in phase one; proper imports later. The Trusted Types policy and the beacon loader move as they are.
- `palette.py` reads `tokens.css`; point it at `src/styles/tokens.css`.

### Order of work

1. Scaffold: `npm create astro@latest`, config, `Base.astro`, `Header`, `Footer`, `BottomNav`, the two dialogs. Build the Home page only. Compare the output HTML with `site/index.html` by diff; they should match except for asset names.
2. The other five pages, section by section. Fix the compiler errors as they come.
3. Content collections for services, projects, FAQ, plans, team, footer. Then `services/[slug]` and `work/[slug]`.
4. The generated files: sitemap, llms.txt, JSON-LD from data.
5. CSP hashes, `_headers`, Workers config, CI. Deploy to a new Worker beside the Pages project; compare with PageSpeed and `verify_footer.py`; switch.
6. Delete `tools/build_pages.py`, `stamp.py`, `build_footer.py`, `verify_css_split.py`, `serve.py`, `deploy.py`, `tools/retired/`, `site/`. Update the READMEs and `CLAUDE.md`.

Two to three days of work for the move itself, not counting the new per-service and per-project pages' copy.

## B. Hosting: Pages to Workers

Cloudflare's current guidance is Workers for new projects; Pages is supported but not where new features land. The Astro docs say the same. What changes for a static site:

- `wrangler.jsonc` with `name`, `compatibility_date` (today's date), `assets.directory: "./dist"`, `assets.not_found_handling: "404-page"` (Pages served `404.html` on its own; Workers only with this line).
- `_headers` and `_redirects` work the same, from the asset directory. Limits: 100 rules, 2,000 characters per line. The Early Hints lines are about 560 characters, fine.
- Early Hints on Workers: turn on the zone setting and send the `Link` headers; check after the move that the 103 actually arrives (`curl -I --http2`).
- The password lock (`tools/site-lock/_middleware.js`) becomes a small Worker script set as `main`, with `assets.run_worker_first: true` so it runs before the files. Only needed if you lock the site again.
- `.assetsignore` in the output folder (Pages skipped `node_modules`, `.git` and such on its own).
- A custom domain must have its DNS on Cloudflare. Check where the real domain's nameservers are before launch day.
- `wrangler dev` (port 8787) and `wrangler deploy` replace the `pages` commands.
- Preview URLs: `preview_urls: true` plus Workers Builds, or a `wrangler versions upload` from CI per pull request.

## C. Indexable content (Google)

In order of weight.

1. **One URL per service and per project.** Today `services#voip` and `work#case-office-move` are fragments of one page. Google indexes a page once; the seven service descriptions and six case studies never appear as their own results, and "managed help desk Ontario" has nothing to land on. In Astro these are `services/[slug].astro` and `work/[slug].astro` from the content collection. Each gets its own title, description, canonical, breadcrumb, `Service` JSON-LD and a line in the sitemap. The index pages keep the picker and filters.
2. **About 25 links per page point at `soon`.** It is `noindex, follow`, which is right for a placeholder, but a quarter of the site's internal links go to a page that says "not built yet". At launch each one needs a page or no link: client portal, remote support, status, careers, blog, Windows 10 guide, security checklist, privacy, terms, accessibility, Français, and the five social links. Privacy and accessibility statements are quick to write and Google and visitors both expect them.
3. **The `Français` link** carries `hreflang="fr"` and goes to the placeholder. Drop the link or build the page; an `hreflang` to nothing looks like a broken alternate.
4. **FAQ rich results**: Google shows `FAQPage` snippets only for government and health sites since August 2023. The markup is correct and harmless; just don't expect a result from it. The `Service` and `ProfessionalService` blocks are the useful ones.
5. **Business JSON-LD at launch**: real phone, address, hours, plus `logo`, `image`, `sameAs` (the social profiles), `priceRange`. Same data in a Google Business Profile.
6. `<html lang="en">` while `og:locale`, `inLanguage` and the copy say Canada: use `lang="en-CA"` for consistency. Small.
7. `<meta name="claude:viewport-fit-sides">` is a leftover from the claude.ai artifact. Remove it.
8. A sitemap `lastmod` helps recrawl after edits; `@astrojs/sitemap` writes it.
9. The home page `<title>` ("Uplink Technology · Managed IT for Ontario businesses") and the descriptions are good. Keep them under 60 and 155 characters as you add pages.
10. Launch checklist: delete the `X-Robots-Tag: noindex` line, set `site` to the real domain, submit the sitemap in Search Console, verify the domain there, check the `pages.dev` address redirects to the real domain (Workers: add a route and a redirect rule).

## D. Security

What is there is good. What to change.

1. **`style-src 'unsafe-inline'`.** Astro's `security.csp` hashes the inline `<style>` blocks it emits. Two catches: it writes a `<meta>` CSP, which cannot carry `frame-ancestors` or reporting, so keep the header too (both apply; the browser enforces the stricter mix). And hashes don't cover `style=""` attributes: the 11 in the hero (`notes.md` already lists them) need to become classes first, or `'unsafe-hashes'` goes in, which is weaker. Move them to classes.
2. **HSTS** is `max-age=31536000` only. At launch on the real domain, once every subdomain is HTTPS, add `includeSubDomains; preload` and submit to hstspreload.org. Not before: preload is hard to undo.
3. **Reporting**: add `Reporting-Endpoints: csp="https://<your report endpoint>"` and `report-to csp` in the CSP, so a blocked script on a real visitor's browser tells you. Cloudflare has no free collector; report-uri.com's free tier or a 10-line Worker that logs works.
4. **Forms at launch** (contact, book, newsletter): a Worker endpoint (same-origin, so `form-action 'self'` holds), Cloudflare Turnstile, a honeypot field, a rate limit (Workers Rate Limiting binding), and email via Cloudflare Email Service or Postmark. CSP additions: `script-src` and `frame-src https://challenges.cloudflare.com`; the Trusted Types policy must allow Turnstile's script URL. Keep sending nothing until all of that is in place; a form that emails without a bot check is a spam pipe within a week.
5. **Secrets**: `.dev.vars` is gitignored and holds the PageSpeed key; fine. The Cloudflare analytics token in `core.js` is public by design; fine. Nothing else sensitive is in the repo.
6. `X-Frame-Options: DENY` and `frame-ancestors 'none'` say the same thing; keep both, old browsers read the first.
7. Dependabot or Renovate on the repo once there is a `package.json` worth watching (Astro, Wrangler, Playwright).
8. Cloudflare zone settings at launch: Always Use HTTPS, minimum TLS 1.2, HTTP/3, Early Hints, Bot Fight Mode. Leave Auto Minify and Rocket Loader off (they break hashes and the CSP).

## E. Performance

PageSpeed is 100 on Home. These are for real visitors, not the score.

1. **About 60 KB of CSS is inlined in every page** (20 KB gzipped of each page's ~22 KB). Great for the first page, paid again on every page after, since inline CSS is never cached. Astro's default inlines only stylesheets under 4 KB and links the rest as a hashed file cached for a year. With view transitions a visitor sees three or four pages; the external file wins by the second one. Measure both after the move; the right split is probably tokens plus the first screen inline, the rest external.
2. The hero drawing is 128 KB fetched by script, and `office-compact.svg` 101 KB for phones. Half of that is the embedded font subsets and repeated gradient defs. Run them through SVGO in the build (`astro-svgo` or a script) and check whether `gen_office.py` can share one `<defs>`.
3. `og.png` is 257 KB. A 1200×630 PNG of flat colours should be 60–90 KB after `oxipng` or `pngquant`. Social crawlers fetch it on every share.
4. Early Hints for fonts save about one round trip. Keep them if the move to Workers makes them easy; drop them if they cost an hour. The preloads in the head do most of the work.
5. `footer.js` draws the campus map on every page (14 KB). Fine, but it could load only when the footer scrolls near (`IntersectionObserver` is already in `core.js`).

## F. Code and repo hygiene

1. **No CI.** Add a GitHub Actions workflow (or Workers Builds): on every push, `npm ci`, `astro check`, `astro build`, the Playwright checks; on `main`, `wrangler deploy`; on a pull request, a preview upload. Then `deploy.py` and `--commit-dirty=true` go away, and nothing deploys that isn't in git.
2. **`site/` is committed build output.** Needed today for direct upload; with CI it is `dist/` and gitignored. Diffs shrink to what you changed.
3. `package.json` `"verify": "node tools/verify.js"` points at a file that is now in `tools/retired/`. Dead script.
4. `agents-cloudflare.md` is empty, and `CLAUDE.md` tells agents to read it. Write it or remove both lines.
5. `tools/retired/` (13 files, already in `notes.md`) and `editing-room/` (560 KB of palette proposals, decided and applied) can go. Git keeps the history.
6. Pin the toolchain: `"engines": { "node": ">=22.23.4" }`, a `.node-version` file, `requirements.txt` with versions.
7. Formatting and linting: Prettier with `prettier-plugin-astro`, ESLint with `eslint-plugin-astro`, Stylelint for the CSS, run in CI. `astro check` for TypeScript in the components.
8. `.editorconfig` (UTF-8, LF, two spaces) so Windows and the OneDrive sync don't flip line endings; `stamp.py` already has a workaround for that.
9. The repo lives in a OneDrive folder. Sync and `node_modules` fight. Either exclude the folder from sync or move the checkout out of OneDrive; GitHub is the backup.
10. `wrangler.toml` `compatibility_date = "2025-09-01"` is a year old; bump with each deploy and move to `wrangler.jsonc` (comments allowed, what the docs use).
11. Six Markdown files at the root (`README`, `CLAUDE`, `notes`, `layout-reference`, `creative`, `agents-cloudflare`). Fine for now; a `docs/` folder when a seventh arrives.
12. `.claude/settings.local.json` is not committed; right.
13. Automated accessibility: `@axe-core/playwright` in `verify_footer.py`'s pass, every page at phone and desktop. Catches regressions the manual care put in.

## G. Things to leave alone

- The design tokens in one file, the drawing rules, the iso tools, the plain-JS no-library stance, the no-script fallbacks, the `README` tone. These are what make the site better than its peers.
- Don't add a client-side router, a UI framework or Tailwind. The site needs none of them, and each one costs the CSP, the no-script story or the size.
- The root font follows the window (`tokens.css`), so desktop zoom at 110-125% grows text only about 9%. Decided 3 Nov 2026 to keep it: 150% and up behaves normally (WCAG 1.4.4 passes), and a `1rem` floor would make text bigger on laptops under 1440 x 900 and push one-screen sections past the screen.
- The `js` class from the `<head>` line stays the switch for the script layouts (footer tabs, service picker). With script off, every page reads in full (tested 2 Nov 2026: same text on all pages, footer panels stacked, still hero picture). If script is on but the page bundle never arrives (a dropped connection, a network or extension blocking scripts), the footer shows only its Contact panel and the home hero is blank. Decided 2 Nov 2026: that is the visitor's setup failing, not the site, so no fallback timer. A script error of our own would break the same parts; `verify_footer.py` fails on one, and CI runs it before every deploy.

## Sources

- Astro releases: https://github.com/withastro/astro/releases (astro@7.4.2, 21 Oct 2026)
- Astro 7 announcement: https://astro.build/blog/astro-7/
- Upgrade to Astro 7: https://docs.astro.build/en/guides/upgrade-to/v7/
- Astro config reference (`security.csp`, `build.format`, `trailingSlash`, `compressHTML`, `build.inlineStylesheets`): https://docs.astro.build/en/reference/configuration-reference/
- Astro fonts: https://docs.astro.build/en/guides/fonts/
- Astro images and SVG components: https://docs.astro.build/en/guides/images/
- Astro on Cloudflare: https://docs.astro.build/en/guides/deploy/cloudflare/
- Workers static assets: https://developers.cloudflare.com/workers/static-assets/
- Workers `_headers`: https://developers.cloudflare.com/workers/static-assets/headers/
- Pages to Workers migration: https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/
- Google: FAQ rich results limited to government and health sites (Aug 2023): https://developers.google.com/search/blog/2023/08/howto-faq-changes
