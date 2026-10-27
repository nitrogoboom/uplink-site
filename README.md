# Uplink Technology site

Overwatch 2–style website for a made-up IT company, "Uplink Technology".
Plain HTML, CSS and JS. One small build step: pages are written in parts in `src/` and joined into `site/` by `python tools/build_pages.py` (see `src/README.md`). Headed for Astro later; `src/` is laid out to match.
Also published as a claude.ai artifact: https://claude.ai/code/artifact/89e3144d-e7d5-4695-9503-653554d0ff98

## Run it on your PC

```
python tools/serve.py
```

Then open http://localhost:8765. Links use clean URLs (`work`, not `work.html`), as Cloudflare Pages serves them, so use this server: plain `python -m http.server` or opening the files from disk breaks the links between pages.

### For the check tools (optional)

```
pip install -r requirements.txt
python -m playwright install chromium
npm install
```

Python 3.10+ and Node 18+.

## What's where

- `src/` – **edit pages here.** One folder per page, one file per section, shared parts (header, footer, pop-ups) in `src/components/`, CSS in `src/styles/`. `src/README.md` maps it all.
- `site/` – the built website, what gets served and deployed. The `.html` files and `assets/css/site.css` are written by `tools/build_pages.py`; don't edit them by hand.
  - `index.html` – home page. The hero drawing (office floor plan, app-tile tray, 3D cloud) and the growing tower are **inline SVG**, written by `tools/gen_office.py` and `tools/gen_tower.py` into `src/pages/home/`.
  - `about.html`, `services.html`, `work.html`, `contact.html`, `soon.html`
  - `404.html` – Cloudflare serves it for any missing address, at any depth, so its links and files start at the root (`/services`, `/assets/...`). `build_footer.py` writes its footer that way too.
  - `assets/css/tokens.css` (all colours, sizes, timings; edit here), `assets/css/site.css` (built: `tokens.css` plus `src/styles/site.css`, minified; the only stylesheet the pages link)
  - `assets/js/` – `core.js` and `footer.js` on every page, plus one script per page (`home.js`, `services.js`, `work.js`, `contact.js`, `soon.js`) loaded only there. The file list and keyboard map are at the top of `core.js`.
  - Links between pages have no `.html` (`services#voip`, home is `./`), and so do canonical tags and `sitemap.xml`. Keep it that way: Cloudflare redirects `work.html` to `work`.
  - The site's address is set once: `SITE_URL` in `tools/build_pages.py` (now the test address, https://uplink-site-4p8.pages.dev; set the real domain at launch, or run the build with a `SITE_URL` environment variable). `{site}` in each `page.html` (canonical, Open Graph, `og:image`, JSON-LD) becomes it, and the build writes `robots.txt`, `sitemap.xml`, `llms.txt` and `agents.md` from it. Don't hand-edit those four.
  - `llms.txt`: a short Markdown guide to the site for AI agents, built from each page's title and description and the service cards on the home page. `agents.md` (notes for AI agents) and `index.md` (the home page as Markdown) are written by hand in `src/`; the build fills in the address.
  - Content lives in the HTML, not in script. Services and Work hold every service and project as HTML. Script only shows one at a time. A one-line inline script adds a `js` class to `<html>` on those two pages so the stacked no-script layout never flashes.
  - `assets/img/*.svg` – the isometric illustrations. `office.svg` and `office-build.svg` share their geometry with the hero, and `tower-grow.svg` with the inline tower; the same scripts write them, so they stay in sync.
- `tools/` – the build, the drawing scripts and their checks (Python + Playwright). Run them from the project root. `tools/retired/` holds old tools waiting to be deleted (see its README).

## Adding a service

The services list is open-ended: counts, tiles and the number-key hint come from the page.
1. `src/pages/services/1-pick.html`: add one `<article class="svc" id="..." data-svc data-tile="Short name">` (copy an existing one; its chip `<span class="chip" data-svc-n>` is filled in for you).
2. `src/pages/home/2-services.html`: add one card to `.svc-cards` (image `NAME-compact.svg?card#plain`).
3. `tools/build_footer.py`: add one line to the services links, then `python tools/build_footer.py`.
4. Add an `<option>` to the "What do you need?" lists (`src/pages/contact/1-message.html` and `src/components/BookDialog.html`), then `python tools/build_pages.py`.
5. Drawing: a `tools/gen_NAME.py` writing `NAME.svg` and `NAME-compact.svg` (copy `gen_voip.py`).

## Footer (hero select)

Every page has the same footer. On desktop it is exactly one screen tall.

- **Stage:** the text for the picked section on the left, a live campus map on the right.
- **Dock:** a roster of tiles (Contact, Services, Company, Support, Resources, Follow). Arrow keys or the two key-cap buttons switch tiles.
- **Base bar:** brand, legal links, keyboard shortcuts, status.

The footer markup comes from `tools/build_footer.py`. Change the lists at the top of that file (link groups, socials, legal links), then run `python tools/build_footer.py`. It writes `src/components/Footer.html` and rebuilds every page.

Each panel has a `data-map` value that picks a spot on the map: `hq`, `services`, `industries`, `company`, `support`, `resources`, `follow`. Anything else points at HQ. The map is drawn by `assets/js/footer.js` with the same true-isometric formula as the illustrations, `u = 38`. Draw order is back to front: resources, follow, services, company, hq, support, industries.

Without script, every panel shows in a stack and the roster is hidden.

## Drawing rules (measured in the files)

- True isometric: one axis right-and-down at 30°, one left-and-down at 30°, verticals straight up.
- Faces: top `#405169`, left `#313F54`, right `#283447`. Edge stroke `#D9E4F0`, width 1, opacity 0.3.
- Highlight faces: `#F7B868` / `#E2953F` / `#C98030`. Accents: `#F4A340` orange, `#7DB9E8` blue.
- Labels: thin leader line (width 1.2, opacity 0.55), dot r=3 with a `#151E2C` 1.5 ring, caps title 13px/600, grey subline 11px `#A9B4C3`.
- Window outlines on walls: `#7DB9E8`, width 0.9, opacity 0.5.
- Floor discs are true iso circles (height/width = 0.577), with gaps cut around labels.
- Wi-Fi access points hang at ceiling height; their rings are halos at the AP's height, not on the floor.

## Tools

Every drawing was made by a generator with world → screen = `origin + ((x − y)·cos30·u, (x + y)·u/2 − z·u)`.
`tools/iso.py` has `W(ox, oy, u)` for this. Known values: helpdesk `W(0,0,23)`, office/hero `W(616.4,240.2,28.127)`, tower `W(262,283.2,24)`, backup `W(0,0,16.46)`, network `W(0,0,1)`, footer map `W(0,0,38)`.

- `gen_<name>.py site/assets/img/<name>.svg` – draws `hq`, `strategy`, `backup`, `helpdesk`, `network`, `security`, `cloud` and `voip` from a world-space description. Edit the numbers at the top and rerun; don't hand-edit those SVGs. Running a script with nothing changed gives the same file byte for byte, so a git diff only ever shows what you changed.
- `gen_office.py site` – the office floor plan: `office.svg`, `office-build.svg` and the hero `src/pages/home/1-hero-office.svg`, then rebuilds the pages. The animation CSS and the hero's hand-drawn cloud live in `tools/office_parts/`.
- `gen_tower.py site` – the growing tower: `tower-grow.svg` and the inline tower `src/pages/home/3-grow-tower.svg`, then rebuilds the pages. Each has a `rules_<name>.py` for painter (its usage line is at the top). Shared pieces live in `isogen.py`.
- `isoprops.py` – shared kit: office chair, monitor on a stand (with `screen_glass` / `app_window` for its screen), VoIP desk phone, and `on_front` / `on_side` / `on_top` for drawing flat details exactly on an iso face. Props sit on a grid (x, y in 0.25s, z in 0.125s) so their parts can never nearly-touch; keep the scene around them on the same grid.
- Compact cuts: every `gen_*.py` (except the tower) also writes `NAME-compact.svg`, the same scene framed closer with fewer, bigger labels (its `COMPACT` settings; `isogen.doc(crop=)`, `label(scale=)`, a `
` in a subline wraps it). Pages swap it in with `<picture>` where the drawing shows small (Services below 1200px wide, About and the Work pop-up below 1600px), cards always use `NAME-compact.svg?card#plain` (no labels; the `?card` keeps the browser from reusing the label-less copy elsewhere, since it caches an SVG by address without the `#`), and on phones the home hero shows `office-compact.svg` in place of the animated drawing. When you change a drawing's labels or layout, check its compact cut too.
- `svgfont.py` – an SVG loaded with `<img>` can't see the page's fonts, so each drawing carries just the Barlow letters it uses (fonts in `tools/fonts/`, SIL OFL). The generators do it automatically. Needs `pip install fonttools brotli`.
- `check.py file.svg` – edges near (but not on) an iso angle (skipped: leader lines in `.co` groups, `class="mark"` arrowheads, `class="free"` parts tilted on purpose), near-miss vertices, leader dots and what they sit on
- `painter.py` – finds boxes drawn in the wrong order or poking into each other. Each drawing has a `rules_<name>.py`; its first lines give the exact command
- `build_pages.py` – joins `src/` into `site/*.html` and `site/assets/css/site.css`, with stamps. `--check` (also run by `verify_footer.py`) says if `site/` is out of date
- `build_footer.py` – writes `src/components/Footer.html` and rebuilds (see above)
- `gen_og.py site` – the share picture `assets/img/og.png` (1200×630) and `apple-touch-icon.png` (180×180, site root). Screenshots of a small page made from the site's tokens, fonts and `office-compact.svg`; rerun after changing those.
- `stamp.py site` – cache busting: puts `?v=<hash>` on every CSS and JS link. `build_pages.py` runs it for you; run it yourself after a JS edit; `site/_headers` lets browsers keep those files for a year. `stamp.py site --check` (also run by `verify_footer.py`) says if a stamp is out of date.
- `verify_footer.py out/` – the hero builds, tiles respond to hover, the tower grows on scroll, no sideways scroll, plus: every footer tab at 1440×900 (one screen tall, no panel overflow, map moves), and every page at phone, tablet, 1440×900 and 3440×1440

Serve `site/` with `python tools/serve.py` before running `verify_footer.py`.

The one-off fix scripts from the precision pass (`tools/fixes/`) were not kept in the Project, so they are not in this bundle. They were a record only.

## Publishing back to the artifact (optional)

The artifact link above only updates from a Claude chat. To push local changes there: zip `site/`, attach it in a Claude chat in the "OW Inspired website" Project, and ask Claude to republish it to the artifact URL.

## Hosting (Cloudflare Pages, password-locked)

- Code: private GitHub repo `nitrogoboom/uplink-site`.
- Site: Cloudflare Pages project `uplink-site` (https://uplink-site-4p8.pages.dev).
- Password lock: **off since 26 Oct 2026**, and the site is open to search engines (a test build with placeholder content). The lock lives in `tools/site-lock/_middleware.js`. To turn it on, move it back to `functions/_middleware.js` and deploy. With it on, every page and file is behind a browser password prompt. Any username works. The password is the Cloudflare secret `SITE_PASSWORD` (still set). With no secret set, the site stays locked. Cloudflare marks each one-off deploy address (`<hash>.uplink-site-4p8.pages.dev`) noindex on its own; only the main address is indexed.
- `site/_headers` sets the security headers on every file (HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP). The CSP allows one inline script by its hash: the `classList.add('js')` line in `services.html` and `work.html`. Change that line and update the hash (the comment at the top of `_headers` says how). Adding another outside host (fonts, analytics, a form service) means adding it to the CSP too.
- Deploy from the project root: `npx wrangler pages deploy` (settings in `wrangler.toml`).
- Change the password: `npx wrangler pages secret put SITE_PASSWORD --project-name uplink-site`, then deploy again.
- The local preview (`python tools/serve.py`) has no lock. To test the lock locally: `npx wrangler pages dev --binding SITE_PASSWORD=some-test-value`.
