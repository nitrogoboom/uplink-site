# Thought audit

## November 19, 2026: whole-site code review

A review of the code as it is, whatever the docs and notes.md say. I read the Worker, the build and deploy scripts, CI, `public/_headers`, `core.js`, `home.js`, `footer.js`, the copy system and `Base.astro`. I skimmed `grow.js`, the CSS and `tools/`. `npm run quick` passes: lint, types and the build.

**Verdict:** the engineering is careful and good. Security, the Worker, accessibility and the build pipeline are well above average for a brochure site. The weak spots are effort spent on fragile things, one false message on a live page, and CI that checks less than it seems to.

### What's good

- **CSP:** strict, with no `'unsafe-inline'`. Script and style hashes are written at build from the real pages. Trusted Types is on. The build refuses a `style=""` attribute.
- **Worker:** small and careful. A missing page gets the 404 page with a real 404 status and no ETag; a throw falls back to the static files.
- **Deploys:** upload a version, smoke it at its own address, put it live, smoke again, roll back on failure.
- **Without JS:** the forms work and their fields have no `name`, so a form sent without script puts nothing in the URL. Dialogs open from plain buttons. Theme and reduced motion are set before the first paint.
- **Copy keys:** `copy()` (src/lib/copy.ts) stops the build on a misspelled key.

### Problems, most important first

1. **On hold (owner, November 19): the contact form is a draft, not yet wired to Cloudflare; no change for now.** **False message on a live page.** After the contact form is sent, the page says "Message received. You are in the queue. We reply within one business day." (src/data/copy/en/contact.yaml, `received`). Nothing is sent. The booking and newsletter messages honestly say "Prototype form: nothing is sent yet".
2. **Done (November 19): the three clashing keys renamed; the build stops on a new one.** **The copy type mixes text and key groups.** `Words = string & readonly Words[] & { [key]: Words }`, so a key named like a string method gets the method's type. The build warning `'sub' is deprecated` (Header.astro:26) is `String.prototype.sub` showing through. Keys such as `link`, `length` or `at` would be mistyped without a warning.
3. **Done (November 19, live in 3368b71): Home's folds are on one fold scale; fit promised from 1280x720.** **One-screen fitting is fragile.** Commits 3a to 3d tuned sections pixel by pixel at measured windows. Each section has its own private curve: `--fold-pad` 13.333svh - 4.5rem (tokens.css), the hero 12.12svh - 5.2rem (hero.css), `--rev-space` 8svh - 3rem (reviews.css), Grow 20svh - 8rem (grow.css). On top of these, height switch points are scattered through five files (35em, 47.5em, 50em, 51.25em, 55.25em, 60em). Nothing guards the fit, so a copy change undoes it. Reviews is still 20 to 40px over at 1100x700.
4. **Leave (owner, November 19): not during draft mode.** **CI checks only the build.** Lint, types and `astro check` run only on the owner's machine (`npm ci --omit=dev`). Pushes go straight to main, and Dependabot merges get only the build check.
5. **Done (November 19): page CSS and the inserted drawings' styles are linked files; 7 hashes, line 717 of 2,000.** **The CSP line has a fixed limit.** Cloudflare allows 2,000 characters per `_headers` line, and the CSP line is 1,365. Each `<style>` block (a drawing's, or one of Home's) adds a hash of about 55 characters: room for about 11 more. The build stops with a clear message when it's over.

### Smaller things

- **Not a problem (checked November 19): without script the page shows the still office; the script fetches one cut per screen size.** **Hero needs JS:** its drawing (70 to 92 KB of SVG) is fetched and inserted by script. Preloaded, but the first picture still waits on the script loading, the fetch and the parse.
- **Keep as is (owner, November 17 and 19).** **Home's CSS isn't cached:** it's inlined (194 KB raw, 37 KB gzipped), so each visit to Home downloads it again. A fair trade for first paint.
- **Checked November 19: no unused rules (all 72 classes in use); 7 KB compressed and cached. Split not started.** **footer.css is 1,035 lines,** the largest stylesheet, for a footer most visits never reach.
- **Done (November 19): in src/data/footer.json.** **Business data typed in markup:** index.astro writes `addressRegion: 'ON'` and the opening hours itself, against the rule that words live in `src/data/`.
- **Done (November 19).** **Naming:** home.js declares its own `settle`, hiding the one it imports from core.js. Storage keys are `uplink-held` beside `uplink.theme` and `uplink.motion`.
- **Rule added to CLAUDE.md (November 19); old comments tidied as files change.** **Commits and comments carry history:** commit messages of 800 to 1,100 characters, 649 commits this month. Comments carry dates, review IDs (B8, J9) and the owner's words. Comments should hold the reason; git holds the history.

### Making it less fragile: ideas to talk through

- **Done (November 19).** **One fold scale, not one curve per section.** Define the vertical space once in tokens.css (for example `--fold-space-1`, `-2` and `-3`, all from one svh curve) and have each section pick a step instead of writing its own `clamp(… Nsvh - Mrem …)`. Change it once and every section moves together.
- **Done (November 19).** **"Fits one screen" as a goal, not a rule.** Promise the fit at the common laptop and desktop sizes (1280x720 and up). Below that, let a section scroll and look right while doing so, and stop tuning for 1100x700.
- **Not doing (owner, November 19): the fit is checked by a look.** **A size report on demand.** A small script that prints each Home section's overflow at a list of window sizes. It reports and blocks nothing, so it's a look, not a test. Whether to keep one is the owner's call.
- **Leave (owner, November 19).** **Lint and types in CI.** Run `npm run check` and lint in the PR job and before the deploy step, so neither a direct push nor a Dependabot merge can ship a type break. About a minute a run.
- **Done (November 19).** **Drawing styles out of the CSP.** Move the inserted drawings' `<style>` rules into a linked stylesheet (allowed by `'self'`), so new drawings stop growing the CSP line.
- **Done (November 19).** **Copy type:** keep text separate from groups of keys, or rename the colliding keys and catch new ones in lint.
- **On hold (owner, November 19): the form is a draft.** **Contact message:** say "Prototype form: nothing is sent yet", as the other two forms do.
