# Uplink Technology site

Overwatch 2–style website for a made-up IT company, "Uplink Technology".
Plain HTML, CSS and JS. No build step.
Also published as a claude.ai artifact: https://claude.ai/code/artifact/89e3144d-e7d5-4695-9503-653554d0ff98

## Run it on your PC

```
python -m http.server 8765 --directory site
```

Then open http://localhost:8765. (Opening `site/index.html` straight from disk mostly works too.)

### For the check tools (optional)

```
pip install -r requirements.txt
python -m playwright install chromium
npm install
```

Python 3.10+ and Node 18+.

## What's where

- `site/` – the website, exactly as the live artifact (26 Oct 2026)
  - `index.html` – home page. The hero drawing (office floor plan, app-tile tray, 3D cloud) and the growing tower are **inline SVG** in this file, written by `tools/gen_office.py` and `tools/gen_tower.py`.
  - `about.html`, `services.html`, `work.html`, `contact.html`, `soon.html`
  - `assets/css/tokens.css` (all colours, sizes, timings), `assets/css/site.css`
  - `assets/js/` – `core.js` and `footer.js` on every page, plus one script per page (`home.js`, `services.js`, `work.js`, `contact.js`, `soon.js`) loaded only there. The file list and keyboard map are at the top of `core.js`.
  - `robots.txt`, `sitemap.xml`, and the canonical / Open Graph tags in each page's `<head>` use `https://uplinkit.ca/` as the site address. Change it in all three places when the real domain is known. `soon.html` is `noindex`.
  - Content lives in the HTML, not in script. Services and Work hold every service and project as HTML. Script only shows one at a time. A one-line inline script adds a `js` class to `<html>` on those two pages so the stacked no-script layout never flashes.
  - `assets/img/*.svg` – the isometric illustrations. `office.svg` and `office-build.svg` share their geometry with the hero, and `tower-grow.svg` with the inline tower; the same scripts write them, so they stay in sync.
- `tools/` – the scripts used for the precision pass on the illustrations and the footer (Python + Playwright). Run them from the project root.

## Footer (hero select)

Every page has the same footer. On desktop it is exactly one screen tall.

- **Stage:** the text for the picked section on the left, a live campus map on the right.
- **Dock:** a roster of tiles (Contact, Services, Company, Support, Resources, Follow). Arrow keys or the two key-cap buttons switch tiles.
- **Base bar:** brand, legal links, keyboard shortcuts, status.

The footer markup comes from `tools/build_footer.py`. Change the lists at the top of that file (link groups, socials, legal links), then run `python tools/build_footer.py site` to rewrite the footer on all six pages.

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

- `gen_<name>.py site/assets/img/<name>.svg` – draws `hq`, `strategy`, `backup`, `helpdesk`, `network`, `security` and `cloud` from a world-space description. Edit the numbers at the top and rerun; don't hand-edit those SVGs. Running a script with nothing changed gives the same file byte for byte, so a git diff only ever shows what you changed.
- `gen_office.py site` – the office floor plan: `office.svg`, `office-build.svg` and the hero block in `index.html` (only that block is replaced). The animation CSS and the hero's hand-drawn cloud live in `tools/office_parts/`.
- `gen_tower.py site` – the growing tower: `tower-grow.svg` and the inline tower block in `index.html`. Each has a `rules_<name>.py` for painter (its usage line is at the top). Shared pieces live in `isogen.py`.
- `svgfont.py` / `embed_font.py` – an SVG loaded with `<img>` can't see the page's fonts, so each drawing carries just the Barlow letters it uses (fonts in `tools/fonts/`, SIL OFL). The generators do it automatically; run `python tools/embed_font.py site/assets/img/office.svg` after editing a hand-made SVG with text. Needs `pip install fonttools brotli`.
- `check.py file.svg` – edges near (but not on) an iso angle (skipped: leader lines in `.co` groups, `class="mark"` arrowheads, `class="free"` parts tilted on purpose), near-miss vertices, leader dots and what they sit on
- `dump.py file.svg ox oy u` – every shape in world terms
- `boxes.py` / `painter.py` – turn face triples into 3D boxes; find boxes drawn in the wrong order or poking into each other (`rules_office.py` is the rules file for the office drawing)
- `discs.py`, `floorfit.py` – check floor discs and rings are true iso circles; `roundify.py` rebuilds a floor disc as one (needs `site/` served on port 8765)
- `shoot1.js`, `shoot.js`, `compare.py` – zoomed screenshots and before/after sheets
- `verify.js` – checks the hero builds, tiles respond to hover, the tower grows on scroll, and there's no sideways scroll at phone, tablet, 1440×900 and 3440×1440
- `build_footer.py` – writes the footer into every page (see above)
- `verify_footer.py out/` – verify.js checks plus: every footer tab at 1440×900 (one screen tall, no panel overflow, map moves), and every page at phone, tablet, 1440×900 and 3440×1440
- `footer_painter.py url` – painter-order and poke-through check on the boxes the footer map draws. It reads `window.__isoLog`, so add `window.__isoLog && window.__isoLog.push({k, x, y, z, w, d, h, cls})` to `box()` in a local copy first.
- `fixlib.py` – small helper for exact find-and-replace edits on SVG points

Serve `site/` with `python -m http.server 8765 --directory site` before running the JS tools.

The one-off fix scripts from the precision pass (`tools/fixes/`) were not kept in the Project, so they are not in this bundle. They were a record only.

## Publishing back to the artifact (optional)

The artifact link above only updates from a Claude chat. To push local changes there: zip `site/`, attach it in a Claude chat in the "OW Inspired website" Project, and ask Claude to republish it to the artifact URL.

## Hosting (Cloudflare Pages, password-locked)

- Code: private GitHub repo `nitrogoboom/uplink-site`.
- Site: Cloudflare Pages project `uplink-site` (https://uplink-site-4p8.pages.dev). `functions/_middleware.js` puts every page and file behind a browser password prompt. Any username works. The password is the Cloudflare secret `SITE_PASSWORD`. With no secret set, the site stays locked.
- Deploy from the project root: `npx wrangler pages deploy` (settings in `wrangler.toml`).
- Change the password: `npx wrangler pages secret put SITE_PASSWORD --project-name uplink-site`, then deploy again.
- The local preview (`python -m http.server`) has no lock. To test the lock locally: `npx wrangler pages dev --binding SITE_PASSWORD=some-test-value`.
