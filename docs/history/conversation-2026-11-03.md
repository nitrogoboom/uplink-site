# Conversation: getting ready for a production release

3 Nov 2026 · John with Claude. A talk, not a plan. The to-do items from it are in `notes.md` under "Production readiness".

Goal: get the site ready for a production release. Live content is a separate job for later. Anything that needs the real domain waits (it's already in `notes.md` under "Before going live").

## 1. Framework, host, browsers, mobile

The site is further along than a draft. It already has typed content, lint, a strict CSP with Trusted Types, CI that blocks a bad deploy, and preview links for each PR.

- **Framework (Astro 7):** keep it. Missing: a written list of the browsers we support, and one pinned Node version.
- **Host (Cloudflare Workers):** keep it. Missing: `main` is unprotected (every push deploys to live), the account and token belong to one person, there are no written rollback steps, and nothing checks the site is up.
- **Browsers:** the biggest gap. CI only tests Chromium, and Firefox and Safari are never checked. The site uses `:has()`, `@view-transition`, `text-wrap` and Trusted Types, and each needs a fallback that works where it's missing.
- **Mobile:** phone sizes are only checked by resizing desktop Chromium. That misses iOS Safari, where the notch, the moving address bar, `100vh` height and tap-instead-of-hover behave differently. A real iPhone and a real Android need a pass, using the PR preview links.
- **npm audit (12 moderate):** one bug in `minimatch` 10.2.6, used only by ESLint. The live site isn't affected (`npm audit --omit=dev` finds 0). Left as is; Dependabot will pick up the fix.

## 2. Node, or something better?

Stay on Node. The alternatives are Bun and Deno:

- **Bun:** faster installs and scripts. Astro runs on it, but Wrangler and Cloudflare's docs assume Node, and on a site this size the speed gain is seconds.
- **Deno:** a cleaner, safer design, but more friction with npm tools like Astro, Stylelint and Wrangler.

AI agents also know Node, npm and Astro best, so the most help and the fewest surprises are there.

The bigger issue isn't Node. **The project runs two languages:** Node for the site, build and lint, and Python for the drawing generators and every browser check. Playwright is installed twice at different versions (npm 1.64.1, pip 1.58.0). A new developer or agent has to set up both.

- The drawing generators should stay in Python (shapely, numpy). That's a good use of it.
- The browser checks (`verify_footer.py`, `verify_spacing.py`, `verify_styles.py`, `verify_text.py`) could move to Playwright Test on Node. That makes Firefox, WebKit and phone runs a config line each, and removes Python from CI. It's the biggest single cleanup; decide later.

## 3. Is the build coherent?

Mostly yes. One command builds the site; the steps after Astro (SVGO, Markdown copies, headers with hashes) are small and each does one thing. CI runs check → lint → build → browser check → deploy.

Small gaps:

- Node version in four places that disagree: `engines` says `>=22.23.4`, README says "Node 22.23+", `.node-version` and CI say 24.
- No single local command does what CI does. `npm run verify` needs `npm run serve` running in another window first.
- The npm `playwright` and `@axe-core/playwright` packages look like they're only there so `axe.min.js` is in `node_modules`. Check that and trim.

## 4. Does it work well for AI agents?

Mostly good:

- `CLAUDE.md` is short and specific.
- The rules are enforced by tools, not just written down: lint refuses raw spacing values, the build refuses `style=""`, and CI fails on CSP blocks and axe findings. An agent can't quietly break them.
- Content is data in typed JSON, so copy lives in one place.
- Every drawing comes from a script, so nobody hand-edits the SVGs.

Weak spots:

- **Ten Markdown files in the root.** An agent can't tell current rules from history. `next.md` is all done and `review.md` is the reasoning from 28 Oct, but both read like instructions. Move them to `docs/history/` (or delete `next.md`), and keep the root to `CLAUDE.md`, `README.md`, `notes.md` and the live rule files (`spacing.md`, `layout-reference.md`).
- **`CLAUDE.md`'s "State (28 Oct 2026)" line** is already a week old. A dated status line in an always-loaded file goes stale. Keep status in `notes.md` only.
- **The Python check scripts are dense** (several statements per line, short names). They work, but an agent editing them is more likely to make a mistake than in the rest of the code.

## 5. Are the docs and comments too much?

No, not by volume. About 8–12% of the lines in CSS, JS and Astro are comments, and about 4% in Python. Docs total about 1,200 lines. That's normal.

The risk is the kind of comment, not the amount. Comments that **explain why** are safe. Comments that **repeat a fact the code also holds** go wrong the day the code changes, and an agent will trust the comment. Examples here:

- Exact numbers in prose: `RUN` must match the `2.5` in `grow.css`, `u = 38`, "five pages", the draw order in README.
- The same rule written in `CLAUDE.md`, README and a file header.

The fix is to cut, not to add. Where a number must match in two places, put it in one place (a token or a shared constant), or have a check fail when they differ. Where a rule is in three files, keep it in one and link to it from the others.

## Waits for the real domain

Already in `notes.md`: DNS, `noindex`, `SITE_URL`, the `workers.dev` redirect, HSTS preload, CSP reporting, analytics token, Search Console, the Markdown-copy canonical headers. Also waiting: forms (PR #38, needs a sending domain) and the legal pages (content).
