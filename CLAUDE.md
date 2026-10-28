# Uplink Technology site

Static mockup site (fake content) for a made-up IT company. Overwatch 2–inspired look. Astro 7, hosted on Cloudflare Workers. Read `README.md` first.

**State (28 Oct 2026):** the move from the old Python build to Astro is complete on branch `astro` (plan and reasoning in `review.md`) and live on the Worker at https://uplink-site.johnoreilly.workers.dev; the old Pages site is deleted. Next: merge `astro` to `main`. Open items live in `notes.md`.

- Dev server: `npm run dev` (http://localhost:4321). Build: `npm run build` → `dist/` (also writes `dist/_headers`). Types: `npm run check`. The built site as Cloudflare serves it, headers and 404 included: `npm run serve` (http://localhost:8787). Deploy: CI on push; by hand `npm run deploy`.
- Pages are `src/pages/*.astro`; the shared `<head>`, header, footer and pop-ups are `src/layouts/Base.astro` (props: title, description, page, path, robots, type, ldPage, ldGraph); one component per section in `src/components/<page>/`, with that section's CSS next to it and imported there. Shared CSS is `src/styles/global.css` (the cascade order) and the files it imports.
- CSS order matters (later file wins a tie). Every page's last import is `src/styles/late.css` (the desktop layout block, page transitions, motion), so it comes after the sections' CSS. Keep that line last in every new page.
- All colours, sizes and timings live in `src/styles/tokens.css`. Use the tokens, don't hard-code values. Colour roles come from `editing-room/palette/DESIGN.md`.
- Content is data, typed in `src/content.config.ts`. A service is `src/content/services/<slug>.json` (the slug is its page address); a project is `src/content/projects/<slug>.json`. Smaller lists are `src/data/*.json` (faq, plans, team, industries, footer). Every card, picker entry, footer link, select option, page, sitemap line and JSON-LD block reads from there; never retype a service's words in a component. Lists in `src/data/` keep file order through `byOrder` (the store sorts by id otherwise).
- The five static pages' `<title>` and description live in `src/lib/site.ts` (`PAGES`); the pages, `sitemap.xml` and `llms.txt` read them from there. The sitemap's `lastmod` is the last git commit touching the page's sources (`SOURCES` there).
- `src/data/index.md` (the home page as Markdown) and `src/data/agents.md` are hand-written; `{site}` and `{services}` are filled in by their endpoints in `src/pages/*.ts`.
- Links are root-relative (`/services`, `/contact#message`), never `services` or `./`.
- Static files (fonts, drawings, `_headers`, `og.png`, favicon) live in `public/` and are served at the same path. Scripts are ES modules in `src/scripts/` (every page script imports `core.js`); a page adds its own with `<script>import '../scripts/x.js'</script>`. Icons: `<Icon name="…" />` (`src/components/Icon.astro`).
- `public/_headers` is the template for the response headers (CSP, HSTS, caching); `scripts/headers.mjs` fills in the script hashes and the Early Hints block at build. Don't paste a hash in by hand. A script that writes HTML must go through `Uplink.html()` (Trusted Types).
- Every illustration is written by a script in `tools/gen_*.py`, output to `public/assets/img/` (run as `python tools/gen_office.py public`). The hero and tower too: `gen_office.py` writes `public/assets/img/hero-office.svg` and `src/components/home/hero-flows.svg`; `gen_tower.py` writes `src/components/home/grow-tower.svg`. Change the numbers in the script and rerun; don't hand-edit the SVGs. Each script also writes `NAME-compact.svg` (the phone cut); check it when you change a drawing.
- Illustrations are true isometric. Follow "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it.
- After layout changes: `npm run build && npm run serve`, then `python tools/verify_footer.py out/` (no sideways scroll at phone, tablet, 1440×900 and 3440×1440, footer one screen tall, hero and tower working).
- Cloudflare: the `cloudflare:*` skills cover Workers and Wrangler. Hosting details are in README under "Hosting".
- Style: no "AI slop" tells. No left-side border accents on cards.
- Copy: short, plain sentences.
- Open items (bugs, fixes, polish, copy to confirm) live in `notes.md`. Add new ones there and remove a line when it is done. `review.md` holds the reasoning behind the bigger ones; don't add to-do lines there.
