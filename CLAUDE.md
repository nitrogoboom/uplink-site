# Uplink Technology site

Static mockup site (fake content) for a made-up IT company. Overwatch 2–inspired look. Read `README.md` first.

**Where things stand (28 Oct 2026):** the site is built by a small Python build and hosted on Cloudflare Pages. The next job is the move to Astro 7 and Cloudflare Workers; the plan is `review.md`. Until a file says otherwise, the rules below describe the current build and are current. When the Astro move changes a rule, change it here in the same commit.

- Pages are edited in `src/` (one folder per page, one file per section; map in `src/README.md`) and built into `site/` with `python tools/build_pages.py`. Never hand-edit `site/*.html` or `site/assets/css/site.css`. Preview: `python tools/serve.py`.
- All colours, sizes and timings live in `site/assets/css/tokens.css`. Use the tokens, don't hard-code values. Colour roles come from `editing-room/palette/DESIGN.md`.
- Every illustration is written by a script in `tools/gen_*.py` (hero and tower too: `gen_office.py`, `gen_tower.py` write `src/pages/home/1-hero-office.svg` and `3-grow-tower.svg`). Change the numbers in the script and rerun; don't hand-edit the SVGs. Each script also writes `NAME-compact.svg` (the phone cut, used wherever the drawing shows small); check it when you change a drawing.
- Illustrations are true isometric. Follow "Drawing rules" in README. After touching a drawing, run `tools/check.py` and `tools/painter.py` on it.
- The footer is generated. Edit the lists in `tools/build_footer.py`, then run `python tools/build_footer.py`. Don't hand-edit `src/components/Footer.html`.
- After any `src/` edit, run `python tools/build_pages.py` (it also stamps). After a JS or image edit, run `python tools/stamp.py site` (updates the `?v=` cache stamps; browsers keep CSS, JS and images for a year). The build bundles `tokens.css` into a minified `site.css`, puts it inline in every page, and writes `sitemap.xml`, `robots.txt`, `llms.txt`, `agents.md` and the Early Hints block in `site/_headers`; don't hand-edit those. The site address is `SITE_URL` in `tools/build_pages.py` (`{site}` in page heads).
- After layout changes, run `tools/verify_footer.py out/` (needs the server on 8765) and check for no sideways scroll at phone, tablet, 1440×900 and 3440×1440.
- Cloudflare: the `cloudflare:*` skills cover Workers, Wrangler and the rest. Hosting details are in README under "Hosting".
- Style: no "AI slop" tells. No left-side border accents on cards.
- Copy: short, plain sentences.
- Open items (bugs, fixes, polish, copy to confirm) live in `notes.md`. Add new ones there and remove a line when it is done. `review.md` holds the reasoning behind the bigger ones; don't add to-do lines there.
