# Uplink Technology site

Overwatch 2–style website for a made-up IT company, "Uplink Technology". Astro 7, plain CSS and JS, no UI framework, hosted on Cloudflare Workers as static files. The content is data; the drawings are written by scripts.

`review.md` is the developer review of 28 Oct 2026 and the plan this build followed. `notes.md` holds the open items.

## Run it on your PC

```
npm install
npm run dev
```

Then open http://localhost:4321. Other commands:

- `npm run build` – the site into `dist/` (and `dist/_headers`)
- `npm run serve` – serve `dist/` the way Cloudflare does (http://localhost:8787): headers, the 404 page and the clean-URL redirects apply there, unlike the dev server
- `npm run check` – types and Astro diagnostics
- `npm run deploy` – deploy by hand (CI does it on push; see Hosting)

For the drawing and check tools (optional): `pip install -r requirements.txt` and `python -m playwright install chromium`. Python 3.10+ and Node 22.23+.

## What's where

- `src/` – the site. `src/README.md` maps it: pages, section components, content, styles, scripts.
- `public/` – files served as they are: `_headers` (the response-header template), fonts, the drawings in `assets/img/`, `og.png`, the favicon.
- `tools/` – the drawing generators and their checks (Python + Playwright). Run them from the project root.
- `scripts/headers.mjs` – finishes `dist/_headers` after a build (script hashes, Early Hints).
- `wrangler.jsonc` – the Cloudflare Worker config. `.github/workflows/site.yml` – CI.
- `editing-room/palette/` – the finished colour work. `DESIGN.md` there is the live colour spec; see its README.
- `layout-reference.md` – layout patterns from Overwatch 2 menus, applied on 28 Oct 2026.

Links between pages are root-relative and have no `.html` (`/services`, `/work#industries`). Cloudflare serves `services.html` at `/services` and redirects the `.html` form. The site's address is `SITE_URL` in the environment (default in `astro.config.mjs`); it goes into canonicals, Open Graph, the sitemap and JSON-LD. Set the real domain at launch.

Content lives in the HTML, not in script: every service and project is on its page in full. Script only shows one at a time; the pages read and work without it.

## Adding a service

1. `src/content/services/<slug>.json`: copy an existing one (the fields are typed in `src/content.config.ts`). The slug is the page address, `/services/<slug>`.
2. Drawing: a `tools/gen_NAME.py` writing `public/assets/img/NAME.svg` and `NAME-compact.svg` (copy `gen_voip.py`); `image` in the JSON is NAME.
3. `npm run build`. The picker, the home card, the footer link, the "What do you need?" options, the service's own page, the sitemap, `llms.txt` and the JSON-LD all come from the file.

A project is the same with `src/content/projects/<slug>.json` (`/work/<slug>`). FAQ, plans, team, industries and footer lists are `src/data/*.json`.

## Footer (hero select)

Every page has the same footer. On desktop it is exactly one screen tall.

- **Stage:** the text for the picked section on the left, a live campus map on the right.
- **Dock:** a roster of tiles (Contact, Services, Company, Support, Resources, Follow). Arrow keys or the two key-cap buttons switch tiles.
- **Base bar:** brand, legal links, keyboard shortcuts, status.

The lists come from `src/data/footer.json` (the Services panel from the services collection); the markup is `src/components/Footer.astro`. Each panel has a `data-map` value that picks a spot on the map: `hq`, `services`, `industries`, `company`, `support`, `resources`, `follow`. Anything else points at HQ. The map is drawn by `src/scripts/footer.js` with the same true-isometric formula as the illustrations, `u = 38`. Draw order is back to front: resources, follow, services, company, hq, support, industries. Without script, every panel shows in a stack and the roster is hidden.

## Drawing rules (measured in the files)

- True isometric: one axis right-and-down at 30°, one left-and-down at 30°, verticals straight up.
- Colours come from `tools/palette.py` (read from `src/styles/tokens.css`, roles from DESIGN.md); scripts use names, never hex.
- Faces: top `pal.TOP` (#4D5863), left `pal.LEFT` (#37424E), right `pal.RIGHT` (#222E3A): top lightest, right darkest, on every box. Edge stroke `pal.EDGE` (#E6ECF2), width 1, opacity 0.3.
- Highlight faces: `pal.HI_TOP` / `pal.HI_LEFT` / `pal.HI_RIGHT` (#FFCD9B / #FFAD51 / #C37600). Accents: `pal.AMBER` (#FFAD51), `pal.SKY` (#97C8EA) blue.
- Labels: thin leader line (width 1.2, opacity 0.55), dot r=3 with a `pal.PAGE` (#0E1A27) 1.5 ring, caps title 13px/600, grey subline 11px `pal.GREY` (#BBC2C9).
- Window outlines on walls: `pal.SKY`, width 0.9, opacity 0.5.
- Floor discs are true iso circles (height/width = 0.577), with gaps cut around labels.
- Wi-Fi access points hang at ceiling height; their rings are halos at the AP's height, not on the floor.

## Tools

Every drawing was made by a generator with world → screen = `origin + ((x − y)·cos30·u, (x + y)·u/2 − z·u)`.
`tools/iso.py` has `W(ox, oy, u)` for this. Known values: helpdesk `W(0,0,23)`, office/hero `W(616.4,240.2,28.127)`, tower `W(262,283.2,24)`, backup `W(0,0,16.46)`, network `W(0,0,1)`, footer map `W(0,0,38)`.

- `gen_<name>.py public/assets/img/<name>.svg` – draws `hq`, `strategy`, `backup`, `helpdesk`, `network`, `security`, `cloud` and `voip` from a world-space description. Edit the numbers at the top and rerun; don't hand-edit those SVGs. Running a script with nothing changed gives the same file byte for byte, so a git diff only ever shows what you changed.
- `gen_office.py public` – the office floor plan: `office.svg`, `office-build.svg`, `office-compact.svg`, the hero `hero-office.svg` and its tablet cut `hero-office-tablet.svg` (same scene, three labels at 1.5×; `home.js` fetches one by screen size, `HERO` in `src/lib/site.ts`), the phone cut animated `office-compact-build.svg` with its dashes `office-compact-flows.svg` (fetched on phones) and the hero's moving dashes `src/components/home/hero-flows.svg`. The animation CSS and the hero's hand-drawn cloud live in `tools/office_parts/`.
- `gen_tower.py public` – the growing tower: `tower-grow.svg` and the inline `src/components/home/grow-tower.svg`.
- `palette.py` – every drawing colour, by name (`pal.AMBER`, `pal.EDGE`, `pal.SCREEN`…). Roles are read from `tokens.css`; shades with no DESIGN.md role are worked out there from the palette. Change a colour in `tokens.css`, then rerun the gen scripts. Part files in `tools/office_parts/` write colours as `{{pal:NAME}}`.
- `isoprops.py` – shared kit: office chair, monitor on a stand (with `screen_glass` / `app_window` for its screen), VoIP desk phone, and `on_front` / `on_side` / `on_top` for drawing flat details exactly on an iso face. Props sit on a grid (x, y in 0.25s, z in 0.125s) so their parts can never nearly-touch; keep the scene around them on the same grid.
- Compact cuts: every `gen_*.py` (except the tower) also writes `NAME-compact.svg`, the same scene framed closer with fewer, bigger labels (its `COMPACT` settings; `isogen.doc(crop=)`, `label(scale=)`, a newline in a subline wraps it). Pages swap it in with `<picture>` where the drawing shows small (Services below 1200px wide, About and the Work pop-up below 1600px), cards always use `NAME-compact.svg?card#plain` (no labels; the `?card` keeps the browser from reusing the label-less copy elsewhere, since it caches an SVG by address without the `#`), and on phones the home hero plays `office-compact.svg`'s scene animated (`office-compact-build.svg`), or shows the still with reduced motion. When you change a drawing's labels or layout, check its compact cut too.
- `svgfont.py` – an SVG loaded with `<img>` can't see the page's fonts, so each drawing carries just the Barlow letters it uses (fonts in `tools/fonts/`, SIL OFL). The generators do it automatically. Needs `pip install fonttools brotli`.
- `check.py file.svg` – edges near (but not on) an iso angle (skipped: leader lines in `.co` groups, `class="mark"` arrowheads, `class="free"` parts tilted on purpose), near-miss vertices, leader dots and what they sit on. Two opt-in exceptions: `<g class="curve">` holds a curved surface cut into flat strips (the hero cloud's side wall), whose strips are not checked against each other; `--step PX` counts, rather than lists, vertex pairs exactly one grid step apart along an iso axis, for drawings whose props sit on a grid finer than 2px on screen (office: `--step 1.758`, 0.0625 × 28.127)
- `painter.py` – finds boxes drawn in the wrong order or poking into each other. Each drawing has a `rules_<name>.py`; its first lines give the exact command
- `gen_og.py public` – the share picture `og.png` (1200×630) and `apple-touch-icon.png` (180×180). Screenshots of a small page made from the site's tokens, fonts and `office-compact.svg`; rerun after changing those.
- `verify_footer.py out/` – against `npm run serve`: the hero builds, tiles respond to hover, the tower grows on scroll, every footer tab at 1440×900 (one screen tall, no panel overflow, map moves), and nine pages at phone, tablet, 1440×900 and 3440×1440 with no sideways scroll.
- `pagespeed.py <address>` – Google's PageSpeed Insights on the live site's sitemap pages (see Hosting).

## Hosting (Cloudflare Workers, static assets)

- Code: private GitHub repo `nitrogoboom/uplink-site`.
- Site: a Cloudflare Worker named `uplink-site` serving `dist/` as static assets (`wrangler.jsonc`), at https://uplink-site.johnoreilly.workers.dev until it has a domain. (The old Cloudflare Pages project was deleted on 28 Oct 2026.) `SITE_URL` (in the environment, or the default in `astro.config.mjs`) is the address written into canonicals, the sitemap and JSON-LD; set the real domain there at launch.
- Deploys come from GitHub Actions (`.github/workflows/site.yml`): every push and pull request runs `astro check` and the build; a push to `main` runs `wrangler deploy`; a pull request uploads a preview version and prints its address. The workflow needs two secrets, `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and `CLOUDFLARE_ACCOUNT_ID`, in a GitHub environment called `cloudflare`.
- The site is open to visitors but kept out of search results: `public/_headers` sends `X-Robots-Tag: noindex` on every response (a test build with placeholder content). Delete that line at launch.
- `public/_headers` sets the security headers on every file (HSTS, nosniff, Referrer-Policy, Permissions-Policy, CSP) and the cache rules. It is a template: `npm run build` runs `scripts/headers.mjs`, which writes `dist/_headers` with a hash for every inline `<script>` in the built pages (the `classList.add('js')` line) and an Early Hints `Link` rule per page. Adding an outside host (fonts, analytics, a form service) means adding it to the CSP. The CSP requires Trusted Types: a script that writes HTML (`innerHTML`, `insertAdjacentHTML`) must pass the string through `html()` from `core.js` from `core.js`, or the browser blocks it. `style-src` still allows inline styles because the hero drawing carries `style=""` attributes (notes.md).
- Password lock: off. `tools/site-lock/worker.js` is a Worker that puts the whole site behind a browser password prompt; its header comment says how to wire it into `wrangler.jsonc` and set the `SITE_PASSWORD` secret.
- PageSpeed is a separate tool, run when you want it: `python tools/pagespeed.py <address>`. Google's PageSpeed Insights tests the live sitemap's pages on phone and desktop on its own servers and reports whether Home scores 100 in all four (`--strict` holds every page to that). It needs the PageSpeed API key in `.dev.vars` as `PSI_API_KEY` (gitignored; Google Cloud project `uplink-site`, key `pagespeed-gate`).
