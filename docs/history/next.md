# Next: the work that needs no launch

**Done (28 Oct 2026), all eight steps, branch `next-no-launch`.** What's left is in `notes.md`. Kept for the record of what each step did and why.

Written 28 Oct 2026, after the Astro move merged (`review.md` has the reasoning; `notes.md` the full open list). Everything below can be done now, on the `workers.dev` address, with placeholder content. Nothing here needs the real domain, real copy, or a form backend. Those wait in `notes.md` under "Before going live".

Do the steps in order; each is one commit on a branch, and the pull request's CI (build, `astro check`) must stay green. Check the result with `npm run build && npm run serve` and `python tools/verify_footer.py out/`, and in the browser. Update `CLAUDE.md` and `notes.md` in the same commit when a step changes a rule or closes an item.

## 1. Lint, format, editor config (first, so everything after is checked)

- `.editorconfig`: UTF-8, LF, two spaces, final newline. Add `* text=auto eol=lf` in `.gitattributes` so git stops warning about CRLF on every commit and OneDrive can't flip line endings.
- Prettier with `prettier-plugin-astro`; ESLint (flat config) with `eslint-plugin-astro` and `@typescript-eslint`; Stylelint with `stylelint-config-standard` for `src/styles/` and the component CSS. Match the code as it is (2-space, single quotes, 120-ish columns, no semicolon churn): the first run should reformat little. If a rule would rewrite the whole codebase, turn it off.
- `npm run lint` runs all three; add it to `.github/workflows/site.yml` after `npm run check`.
- `package.json`: `"engines"` already says Node ≥ 22.23.4; add a `.node-version` file (`24`).
- Dependabot: `.github/dependabot.yml` for npm, weekly, grouped minor/patch.

Done when: `npm run lint` is clean, CI runs it, a commit produces no CRLF warnings.

## 2. Accessibility check in the test pass

- Add `@axe-core/playwright` (npm) and an `axe` pass to `tools/verify_footer.py` (Python Playwright can inject the axe script from `node_modules/axe-core/axe.min.js` and run `axe.run()`), every page in `PAGES` at phone and desktop. Print violations; exit 1 on any `serious` or `critical`.
- Fix what it finds. The site was built with care, so expect few; colour contrast on `muted` text and the chips is the likely one.

Done when: the pass reports zero serious/critical on all nine pages.

## 3. CSP: drop `'unsafe-inline'` from `style-src`

The one security item left. Hashes can cover `<style>` blocks but not `style=""` attributes, so the attributes must go.

- `tools/gen_office.py` writes 67 `style="--d:…; animation-duration:…; animation-delay:…"` attributes on the hero's animated parts (`HERO_FLOWS` and the `G` groups near line 630, `cable_pair`, the LED helper near line 385). Change it to give each animated element an id (or a class per timing) and emit one `<style>` block inside the SVG with the rules. Same for the 11 in `src/components/home/hero-flows.svg` (written by the same script) and the 12 in `office-compact.svg`. Rerun `python tools/gen_office.py public`, then `tools/check.py` and `tools/painter.py` on the outputs.
- `src/scripts/footer.js` writes `style="animation-delay:…"` into its markup strings (lines ~33, 54, 67, 87, 97). Emit `data-delay="-1.2s"` instead and, after `insertAdjacentHTML`, set `el.style.animationDelay = el.dataset.delay` on each (CSSOM writes are allowed under CSP; attributes are not).
- `scripts/headers.mjs`: hash every inline `<style>` in the built pages **and** the `<style>` blocks inside `public/assets/img/hero-office.svg` (home.js inserts that SVG into the page, so its styles count), and write them into a `{style-hashes}` placeholder in `public/_headers`; then `style-src 'self' {style-hashes}`. Keep the script's check that no `style=""` attribute remains in a built page, and extend it to the hero SVG.
- Set `build.inlineStylesheets: 'never'` in `astro.config.mjs` if hashing Astro's inlined CSS gets fiddly; a linked file is fine.

Done when: `npm run serve`, every page, zero CSP violations in the console, hero animating, footer map lit, `curl -I` shows no `unsafe-inline`.

## 4. CSS housekeeping

- Move the four shared blocks out of section folders into `src/styles/`: `.hero` base (`components/home/hero.css`), `.facts` (`components/work/details.css`), `.industries` (`components/work/industries.css`), `.svc-cards` (`components/home/services.css`). Then the cross-imports in `Picker.astro`, `Profile.astro`, `Message.astro`, `Support.astro`, `services/[slug].astro`, `work/[slug].astro` go.
- Split `src/styles/desktop.css` per section, each piece next to its section with its own `@media (min-width: 1100px)`. When nothing is left in it, delete `late.css` and the "last import" rule in `CLAUDE.md`.
- Prove nothing moved: the computed-style comparison from the move (Playwright, every element on every page at 390/1440/3440, before vs after). Write it as `tools/verify_styles.py` taking two base URLs so it stays around.

Done when: the comparison reports zero differences and `late.css` is gone.

## 5. Scripts: real imports

`src/scripts/*.js` still share `window.Uplink` for the picker slot. Make `core.js` export what the pages need and have `services.js` register the picker through an exported function instead of `Uplink.picker = …`; drop `window.Uplink`. Trusted Types policy and the beacon loader stay as they are.

Done when: `window.Uplink` is undefined in the console and every page's script still works (picker keys 1–7, pop-ups, toasts).

## 6. The service and project pages' own layout

`/services/<slug>` reuses the picker's CSS and `/work/<slug>` the details list's. Give each page a layout of its own: a proper title area, the drawing, the content, a "next" link, and the call-to-action band, following `layout-reference.md` (centred 94rem block, small corners). Keep the shared components; this is CSS in `src/components/services/service-page.css` and `work/project-page.css`, imported by the two `[slug].astro` files.

Done when: both page types look designed at phone, 1440 and 3440, `verify_footer.py` passes, and the screenshots in `out/` look right.

## 7. Images

- Run every drawing in `public/assets/img/` through SVGO at build (an `astro` integration or a step in `scripts/headers.mjs`'s place: `scripts/postbuild.mjs`), keeping ids, classes and the embedded fonts. Check the hero still animates (it relies on classes and `--d` custom properties).
- `og.png` is 257 KB; add `oxipng` (or `pngquant`) to `tools/gen_og.py` and regenerate. Target under 100 KB.

Done when: the drawings are smaller with no visible change, `og.png` under 100 KB, `verify_footer.py` passes.

## 8. Small ones

- `<html lang="en-CA">` in `Base.astro`.
- Remove the `Français` link (`hreflang="fr"` to a placeholder) from `src/data/footer.json`, or leave the label and drop the `lang` fields; decide and note it.
- `tools/pagespeed.py --sample`: Home plus one service and one project page (18 pages × 2 is slow).
- `notes.md`: close each line as its step lands.

## Not here (needs the launch)

Real domain and `SITE_URL`, `noindex` off, HSTS preload, CSP reporting endpoint, forms backend with Turnstile, the `soon` pages, real business JSON-LD, Search Console, Web Analytics host, Early Hints check. All under "Before going live" in `notes.md`.
