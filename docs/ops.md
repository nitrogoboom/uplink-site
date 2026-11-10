# Hosting and operations

How the site is hosted and run. Secrets and security controls are in [`security.md`](security.md).

- **Code:** the public GitHub repository `nitrogoboom/uplink-site`.
- **Site:** a Worker named `uplink-site` serves `dist/` as static assets (`wrangler.jsonc`), at https://uplink-site.johnoreilly.workers.dev until the site has its own domain.

## The Worker

`worker/index.js` is the site's only server code. The static files answer most requests, with `_headers` and `_redirects` applied. `wrangler.jsonc` sends the Worker three kinds of request:

- **`/api/*`** (`run_worker_first`). The Worker answers `POST /api/report`, where browsers send script errors and CSP blocks. Each report becomes one line in the Workers logs. Any other `/api/*` address gets a 404.
- **`/404`** (`run_worker_first`). The Worker gives the 404 page a `404` status.
- **An address with no file** (`not_found_handling: "none"`). The Worker answers with the same 404 page and headers as `/404`. Don't use `"404-page"`: the static files would answer with the `_headers` rules of the missing path.

Also:

- The Worker fetches the 404 page afresh and sends it without an `ETag`. Any method other than `GET` and `HEAD` to `/404` or a missing address gets a `405`.
- For the requests it sees, it redirects `http://` to `https://` with a `308`, except for a local server (`localhost`, `*.localhost`, `*.local`, `0.0.0.0`, and private addresses). At launch, Always Use HTTPS on the zone redirects every request first.
- `_headers` doesn't reach the Worker's own responses, so each carries `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, and a CSP that loads nothing. The 404 page keeps the headers it has as a file.
- A report it can't read gets a `400`. Anything else that goes wrong sends the request on to the static files; an `/api/` request, or one whose body was already read, gets a `503`. Tests: `scripts/test/worker.test.mjs`.
- The Workers logs keep one line per report for 3 days (free plan). The invocation log is off (`observability.logs.invocation_logs`).

> **Note:** Before `wrangler dev`, `deploy`, `versions upload`, and `preview`, wrangler runs `node scripts/check-dist.mjs` (`build.command`). It stops wrangler if `dist/_headers` still has its `{script-hashes}` or `{build}` placeholders, or `dist/_redirects` is missing. Run `npm run build` again and fix what it reports.

## Deploys

GitHub Actions deploys the site (`.github/workflows/site.yml`). CI runs on every pull request and every push to `main`, in these jobs:

- `scope` decides whether the browser checks run. On a pull request they run when it changes `src/scripts/`, `scripts/`, `worker/`, `checks/`, `src/layouts/`, `public/_headers`, the workflows, `package.json` or its lock, or the Astro, PostCSS or Wrangler config, or when it has the `full-checks` label (which also runs `visual-diff`). "Run workflow" runs them all. A push to `main` skips them.
- `dist` runs `npm ci` and the build once, and uploads `dist/` as an artifact for every later job.
- `static` runs the type check, the tests, and lint.
- `verify` (when `scope` says so) runs `npm run verify` against the built site served by `wrangler dev`, in three shards. The first also runs `npm run verify:links` and `npm run smoke`. A failed part uploads its screenshots as `site-check-N`. One shard by hand: `npm run verify -- -- --shard=N/3`.
- `visual-diff`, with the `full-checks` label, runs `npm run visual-diff` against the live site.
- `build` is the gate: it passes only when `scope`, `dist` and `static` passed and `verify` and `visual-diff` passed or were skipped. The ruleset on `main` requires it, and the deploy job waits for it. The preview job waits for `dist` only.

Other rules:

- CI doesn't regenerate or check the drawings. When you change one, run `python tools/regen.py --check` and `python -m pytest tools/tests` ([Check a drawing](drawing-tools.md#check-a-drawing)).
- Every run lints the workflows with [zizmor](https://docs.zizmor.sh) and fails on a high-severity finding. Each pull request gets a dependency review (`actions/dependency-review-action`); on a private repository it needs GitHub Advanced Security.
- Every step runs in `bash` with `pipefail`, and every job has `timeout-minutes`.
- A push to `main` that touches only root `*.md` files, `docs/`, `.claude/` or a `README.md` starts no run (`paths-ignore`), so it deploys nothing. A pull request always runs: for a docs-only one, `scope` skips every other job and `build` passes at once.
- Every pull request gets a Worker Preview (`npx wrangler preview --name pr-N`), and the job comments its address, `https://pr-N-uplink-site.johnoreilly.workers.dev`. The preview takes the `previews` block in `wrangler.jsonc`, which names the `REPORTS` rate limit again: a preview doesn't inherit bindings. Cloudflare keeps up to 100 previews and deletes the oldest. To delete one by hand: `npx wrangler preview delete --name pr-N`.
- The workflow needs two secrets in a GitHub environment named `cloudflare`: `CLOUDFLARE_API_TOKEN` (with "Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`. Without them, the preview job is skipped and a push to `main` fails at the `build` gate.

A push to `main` that passes the `build` gate and the workflow lint deploys. The deploy job runs `node scripts/deploy.mjs LIVE_ADDRESS` on the `dist/` the checks passed:

1. It notes the version that is live now (`wrangler deployments status --json`).
2. It uploads the build as a new version that takes no traffic (`wrangler versions upload`).
3. It runs `npm run smoke -- VERSION_URL --preview` against the version's preview address. If that fails, the job fails and the live site is unchanged. It then reads the build's marker there and at the live address: a hash of the home page's `X-Build` header, its CSP header, the hashed `/_astro/` files the home page names, and `sitemap.xml`.
4. It puts the new version on all traffic (`wrangler versions deploy VERSION_ID@100%`). If wrangler reports an error, it reads the deployment status again: if the new version is live at any percentage, or the status can't be read, it goes on; otherwise it fails.
5. Every 5 seconds, for up to 2 minutes, it reads the live marker until it matches the preview's. If the live address already gave that marker before the deploy (the same build again), it waits 15 seconds instead. Then it runs the smoke check against the live address, and once more 30 seconds later if that fails.
6. If the marker never matches, or the live check still fails, it rolls back to the version from step 1 (`wrangler rollback VERSION_ID`) and fails the job.

The run's summary says which step it reached, and names both versions. Arguments after the address go to both smoke runs, except `--old OLD_ADDRESS`, which goes to the live one only. `DEPLOY_POLL`, `DEPLOY_WAIT`, `DEPLOY_SETTLE` and `DEPLOY_RETRY` (seconds) change the timings. Tests: `scripts/test/deploy.test.mjs`.

`X-Build` is the build's ID, sent with every static file: a hash of every file in `dist/`, the finished `_headers`, and the Worker (`worker/` and `wrangler.jsonc`). `scripts/headers.mjs` writes it.

> **Note:** `wrangler versions deploy` doesn't apply routes, custom domains, cron triggers, `workers_dev`, or `preview_urls` from `wrangler.jsonc`. After a change to those, run `npx wrangler triggers deploy` once, or deploy by hand with `npx wrangler deploy`. Keep `preview_urls` on: every deploy checks the new version at its preview address.

> **Note:** The script stops before it changes anything when there's no live version to roll back to (a new Worker), or when `wrangler deployments status` fails. Then deploy by hand with `npx wrangler deploy` after `npm run build`.

> **Note:** `wrangler preview` is an open beta. If Cloudflare changes it, the preview job fails and nothing else does.

## Repository rules

Two rulesets protect `main` (GitHub > Settings > Rules > Rulesets):

- **main: no force push or delete.** Applies to everyone.
- **main: pull request and build.** A change reaches `main` through a pull request, and the `build` job must pass. Repository admins can bypass it.

Secret scanning with push protection, private vulnerability reporting, CodeQL (default setup), and the dependency graph are on under Settings > Code security.

## Roll back a bad deploy

The deploy job rolls back on its own when the live site fails the smoke check. Roll back by hand when something breaks that the smoke check doesn't catch, or when the run's summary says "Rollback failed":

1. List the recent deploys: `npx wrangler deployments list`.
2. Put the previous version back live: `npx wrangler rollback` (for an older one, `npx wrangler rollback VERSION_ID`).
3. Fix `main`. The next push to `main` deploys it again.

## Response headers

`public/_headers` sets the security headers on every static file, the cache rules, and the `Speculation-Rules` header. The Worker sets its own (see [The Worker](#the-worker)).

The `Speculation-Rules` header points Chrome and Edge at `public/speculation-rules.json`: the browser prefetches a page of the site when a pointer rests on its link (on phones, when the link comes into view). Links to `/api/` and to the `.md` and `.txt` copies are left out.

`public/_headers` is a template. The build's last step (`astro:build:done` in `astro.config.mjs`) runs `scripts/headers.mjs`, which writes `dist/_headers` with a hash for every inline `<script>` and `<style>` in the built pages and in the drawings that scripts insert, `X-Build`, an Early Hints `Link` rule for each page, and a rule for each Markdown copy. Don't paste a hash in by hand.

- **Outside hosts.** Adding an outside host, such as fonts, analytics, or a form service, means adding it to the CSP.
- **Trusted Types.** A script that writes HTML (`innerHTML`, `insertAdjacentHTML`) must pass the string through `html()` from `core.js`.
- **No `style=""` attributes.** The build fails on one. Scripts set styles with `el.style.x = …`.
- **Font files keep their names.** `/assets/fonts/` is cached immutable for a year with no hash in its file names: if a font file changes, give it a new name.

Every control and how to check it: [`security.md`](security.md).

## Search engines

`public/_headers` sends `X-Robots-Tag: noindex` on every response, because the content is placeholder. Remove that line at launch.

The Markdown copies stay out of search results after launch too. `scripts/headers.mjs` gives each `.md` file its own rule in `dist/_headers`, with `X-Robots-Tag: noindex` and a `Link: <PAGE>; rel="canonical"` header taken from the page's own canonical link. `/agents.md` has no page, so it gets the `noindex` only. Keep this `noindex` at launch.

> **Note:** Each page takes two of Cloudflare's 100 `_headers` rules. `headers.mjs` stops the build past 100.

The sitemap's `<lastmod>` dates and a case study's `datePublished` and `dateModified` come from git history (`src/lib/git-dates.mjs`). A static page dates from the files listed in `SOURCES` in `src/lib/site.ts`; a service or project page dates from its own JSON file.

> **Note:** On a shallow clone, the build stops when `CI` is set; elsewhere it warns once and leaves the dates out. Run `git fetch --unshallow`. CI checks out with `fetch-depth: 0`.

## Password lock

The password lock is off. `tools/site-lock/worker.js` holds `lock()`, which puts the whole site behind a browser password prompt.

To turn the lock on:

1. In `wrangler.jsonc`, set `assets.run_worker_first` to `true`.
2. Copy `lock()` and `passwordOk()` from `tools/site-lock/worker.js` into `worker/index.js`.
3. In `route()` in `worker/index.js`, add this line after the `/api/report` line (and so after the http-to-https redirect):

   ```js
   const denied = await lock(request, env); if (denied) return denied;
   ```

4. Set the password and deploy:

   ```sh
   npx wrangler secret put SITE_PASSWORD
   npx wrangler deploy
   ```

Any username works; the password must match `SITE_PASSWORD`. With no secret set, the site stays locked. To test locally: `npx wrangler dev --var SITE_PASSWORD:SOME_TEST_VALUE`.

To turn the lock off, undo steps 1 to 3, deploy, and run `npx wrangler secret delete SITE_PASSWORD`.
