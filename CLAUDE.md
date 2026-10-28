# Uplink Technology site

Static mockup site (fake content) for a made-up IT company. Overwatch 2–inspired look. Read `README.md` first.

**Where things stand (28 Oct 2026, branch `astro`):** the site is moving to Astro 7 in the steps in `review.md` ("Order of work"). Step 1 is done: Astro builds the Home page from `src/pages/index.astro`. The other pages are still in `src/legacy/` (their old HTML parts) until their step. The old Python build (`tools/build_pages.py`, `stamp.py`, `build_footer.py`, `serve.py`, `deploy.py`) no longer runs here and is deleted at step 6; `site/` is kept only as the reference to diff against. When a step changes a rule, change it here in the same commit.

- Dev server: `npm run dev` (http://localhost:4321). Build: `npm run build` → `dist/`. Pages are `src/pages/*.astro`; the shared `<head>`, header, footer and pop-ups are `src/layouts/Base.astro`; one component per section in `src/components/<page>/`, with that section's CSS next to it and imported there. Shared CSS is `src/styles/global.css` (the cascade order) and the files it imports.
- All colours, sizes and timings live in `src/styles/tokens.css`. Use the tokens, don't hard-code values. Colour roles come from `editing-room/palette/DESIGN.md`.
- Links are root-relative (`/services`, `/contact#message`), never `services` or `./`.
- Static files (fonts, drawings, `_headers`, `og.png`, favicon) live in `public/` and are served at the same path. Scripts are ES modules in `src/scripts/` (every page script imports `core.js`); a page adds its own with `<script>import '../scripts/x.js'</script>`.
- Every illustration is written by a script in `tools/gen_*.py`, output to `public/assets/img/` (run as `python tools/gen_office.py public`). The hero and tower too: `gen_office.py` writes `public/assets/img/hero-office.svg` and `src/components/home/hero-flows.svg`; `gen_tower.py` writes `src/components/home/grow-tower.svg`. Change the numbers in the script and rerun; don't hand-edit the SVGs. Each script also writes `NAME-compact.svg` (the phone cut); check it when you change a drawing.
- Illustrations are true isometric. Follow "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it.
- The footer is `src/components/Footer.astro` (static for now; becomes data-driven at step 3).
- After layout changes, check for no sideways scroll at phone, tablet, 1440×900 and 3440×1440 (`tools/verify_footer.py out/` does this; it still expects port 8765, to be repointed at the Astro server).
- Cloudflare: the `cloudflare:*` skills cover Workers, Wrangler and the rest. Hosting details are in README under "Hosting".
- Style: no "AI slop" tells. No left-side border accents on cards.
- Copy: short, plain sentences.
- Open items (bugs, fixes, polish, copy to confirm) live in `notes.md`. Add new ones there and remove a line when it is done. `review.md` holds the reasoning behind the bigger ones; don't add to-do lines there.
