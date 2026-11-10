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

`.github/workflows/site.yml`. A pull request runs:

- `dist`: the build. It also decides the scope: docs-only (root `*.md`, `docs/`) skips the build; the `full-checks` label or "Run workflow" turns on every check.
- `preview`: builds the commit itself and posts `https://pr-N-uplink-site.johnoreilly.workers.dev`. Waits for no job.
- `build`: the gate the ruleset on `main` requires. Passes when `dist` passes, plus every full check when they ran.
- With `full-checks` only: `static` (types, tests, lint), `core` (`npm run verify:core`), `verify` (the site check in three shards, plus links and the header smoke), `visual-diff` (screenshots beside the live site).
- Always: `workflows` (zizmor) and `dependency-review`.

A push to `main` (not docs-only) runs `deploy`: it builds, then `node scripts/deploy.mjs LIVE_ADDRESS`:

1. Uploads a version that takes no traffic and smoke-checks it at its own address. A failure stops here; the live site is unchanged.
2. Puts it live, waits for the live address to serve that build (`X-Build` marker), and smoke-checks it.
3. Rolls back to the previous version if the live check fails.

The run summary names both versions. Timings: `DEPLOY_POLL`, `DEPLOY_WAIT`, `DEPLOY_SETTLE`, `DEPLOY_RETRY`. Tests: `scripts/test/deploy.test.mjs`.

Secrets, in the `cloudflare` environment: `CLOUDFLARE_API_TOKEN` ("Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`. Without them the preview skips and a deploy fails.

> **Note:** `wrangler versions deploy` doesn't apply routes, domains, crons, `workers_dev` or `preview_urls`. After changing those, run `npx wrangler triggers deploy`. Keep `preview_urls` on.

> **Note:** With no live version to roll back to, or when `wrangler deployments status` fails, the script stops. Deploy by hand: `npm run build`, then `npx wrangler deploy`.

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

The `Speculation-Rules` header points Chrome and Edge at `public/speculation-rules.json`: the browser prefetches a page of the site when a pointer rests on its link (on phones, when the link comes into view). Links to `/api/` and to the `.md` and `.txt` copies are left out. Home adds `/speculation-rules-home.json` (made from the menu list): the other menu pages are fetched as soon as Home opens. Both prefetch only, so nothing on a fetched page runs until it's opened.

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
