# Hosting and operations

This page covers how the site is hosted and run: the Worker, CI and deploys, previews, repository rules, rollback, response headers, search engines, and the password lock. For setup, commands, the repository layout, and the checks, see the [README](../README.md). For secrets and security controls, see [`security.md`](security.md).

The site runs on Cloudflare Workers with static assets.

- **Code:** the GitHub repository `nitrogoboom/uplink-site`, public since November 7, 2026.
- **Site:** a Worker named `uplink-site` serves `dist/` as static assets (`wrangler.jsonc`). Until the site has its own domain, it's at https://uplink-site.johnoreilly.workers.dev. The old Cloudflare Pages project was deleted on October 28, 2026.

## The Worker

`worker/index.js` is the site's only server code. Most requests never run it: the static files answer them, with `_headers` and `_redirects` applied. `wrangler.jsonc` sends the Worker three kinds of request:

- **`/api/*`** (`run_worker_first`). The Worker answers `POST /api/report`, where visitors' browsers send script errors and CSP blocks. Each report becomes one line in the Workers logs. Any other `/api/*` address gets a 404.
- **`/404`** (`run_worker_first`). The 404 page is a file, `dist/404.html`, so asked for by name it would answer `200`. The Worker gives it a `404` status.
- **An address with no file** (`not_found_handling: "none"`). The Worker answers with the same 404 page and the same headers as `/404`. With `"404-page"`, the static files would answer instead, but with the `_headers` rules of the missing path: a missing `.md` sent as Markdown, or a missing script cached for a year.

The Worker always fetches the 404 page afresh, without the visitor's `If-None-Match` or `If-Modified-Since`, and sends it without an `ETag`, so a second visit never gets an empty page. A `POST`, or any method other than `GET` and `HEAD`, to `/404` or to a missing address gets a `405`, as it does from the static files.

For the requests it sees, the Worker also redirects `http://` to `https://` with a `308`, except for a server on your computer or local network (`localhost`, `*.localhost`, `*.local`, `0.0.0.0`, and private addresses). On `workers.dev`, the pages and files themselves aren't redirected: every major browser treats `.dev` addresses as HTTPS-only (the HSTS preload list), so only a tool such as `curl` asks for one over `http://`. At launch, Always Use HTTPS on the domain's zone redirects every request before it reaches the Worker or the files.

Every response the Worker writes itself carries `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, and a CSP that lets it load nothing, because `_headers` doesn't reach a Worker's own responses. The 404 page keeps the headers it has as a file.

A report it can't read gets a `400`. Anything else that goes wrong in the Worker sends the request on to the static files, so a bug there never shows Cloudflare's error page instead of the site. An `/api/` request, or one whose body the Worker has already read, gets a plain `503` instead, as the static files have nothing for it. `npm test` posts every odd shape a report can take to it (`scripts/test/worker.test.mjs`).

The Workers logs keep the Worker's own lines, one per report, for 3 days on the free plan. Cloudflare's own record of each run, the invocation log, is off (`observability.logs.invocation_logs` in `wrangler.jsonc`).

> **Note:** Before `wrangler dev`, `wrangler deploy`, `wrangler versions upload`, and `wrangler preview`, wrangler runs `node scripts/check-dist.mjs` (`build.command` in `wrangler.jsonc`). It builds nothing. It stops wrangler if `dist/_headers` still has its `{script-hashes}` or `{build}` placeholders, as it does after a plain `astro build`. Build with `npm run build`.

## Deploys

GitHub Actions deploys the site (`.github/workflows/site.yml`).

- CI runs on every pull request and on every push to `main`, in these jobs:
  - `scope` decides whether the browser checks run (draft mode, November 9, 2026). On a pull request they run when it changes `src/scripts/`, `scripts/`, `worker/`, `checks/`, `src/layouts/`, `public/_headers`, the workflows, `package.json` or its lock, or the Astro, PostCSS or Wrangler config, or when it has the `full-checks` label (which also runs `visual-diff`). "Run workflow" runs them all. A push to `main` skips them: its pull request ran them, and the deploy smoke-checks the new version anyway.
  - `dist` runs `npm ci` and the build once, and uploads `dist/` as an artifact. Every job after it uses that `dist/`.
  - `static` runs the type check, the tests, and lint, beside `dist`.
  - `verify` (when `scope` says so) runs the site check (`npm run verify`) against the built site served by `wrangler dev`, split in three by Playwright's `--shard`, each part on its own runner. The first part also runs the link check (`npm run verify:links`) and the smoke check (`npm run smoke`). A failed part uploads its screenshots as `site-check-N`. Playwright's Chromium is cached between runs, keyed on the `@playwright/test` version in `package-lock.json`.
  - `visual-diff`, on a pull request with the `full-checks` label, runs the screenshot comparison (see below).
  - `build` is the gate: it passes only when `scope`, `dist` and `static` passed and `verify` and `visual-diff` passed or were skipped by `scope`. A failed or cancelled one fails it. It's the check the ruleset on `main` requires, and what the deploy job waits for. The preview job waits for `dist` only, so the link arrives while the other checks still run; a pull request whose checks then fail can have a preview, and still can't merge.

  To run one part of the site check by hand, as a `verify` job does: `npm run verify -- -- --shard=N/3`.
- CI doesn't regenerate or check the drawings (decided November 9, 2026). Drawings change only locally, on purpose: run `python tools/regen.py --check` and `python -m pytest tools/tests` when you change one (see [Check a drawing](../README.md#check-a-drawing)).
- Every run also lints the workflows with [zizmor](https://docs.zizmor.sh) and fails on a high-severity finding. Each pull request also gets a dependency review (`actions/dependency-review-action`), which fails on a new high-severity vulnerability. It runs only while the repository is public (it went public on November 7, 2026); on a private repository it needs GitHub Advanced Security.
- Every step runs in `bash` with `pipefail`, and every job has a time limit (`timeout-minutes`).
- A push to `main` that touches only root `*.md` files or `docs/` starts no run of `site.yml` (`paths-ignore`), so it deploys nothing. A pull request always runs: if it changes only those files, `scope` skips every other job and `build` passes at once, so it merges like any other.
- A push to `main` that passes the `build` gate and the workflow lint deploys to the live Worker. The deploy and preview jobs install the exact dependencies in `package-lock.json` (`npm ci`) and run that `wrangler`. The deploy job runs `node scripts/deploy.mjs LIVE_ADDRESS` on the `dist/` the `dist` job built and the checks passed, in these steps:
  1. It notes the version that is live now (`wrangler deployments status --json`).
  2. It uploads the build as a new version that takes no traffic (`wrangler versions upload`). The version answers at its own preview address.
  3. It runs the smoke check against that address (`npm run smoke -- VERSION_URL --preview`). If that fails, the job stops and fails, and the live site is unchanged. It then reads the build's marker there: a hash of the home page's `X-Build` header, its CSP header, the hashed `/_astro/` files the home page names, and `sitemap.xml`. It reads the live address's marker too.
  4. It puts the new version on all traffic (`wrangler versions deploy VERSION_ID@100%`). If wrangler reports an error, the script reads the deployment status again. If the new version is live at any percentage, or the status can't be read, it goes on to step 5. Otherwise it stops and fails.
  5. Every 5 seconds, for up to 2 minutes by the clock, it reads the marker at the live address until it matches the preview's. If the live address already gave that marker before the deploy (the same build again, such as a rerun), it says so in the summary and waits 15 seconds instead. Then it runs the smoke check against the live address, and once more 30 seconds later if that fails.
  6. If the marker never matches, or the live check still fails, it rolls back to the version from step 1 (`wrangler rollback VERSION_ID`) and fails the job.

  The run's summary says which step it reached, and names both versions. Any arguments after the address go to both smoke runs, except `--old OLD_ADDRESS`, which fits the live address only. At launch the address becomes `https://DOMAIN` and `--launch` follows it. The smoke runs don't get `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`. `npm test` runs the script against a fake `wrangler`, a fake smoke check, and two local servers for the preview and live addresses (`scripts/test/deploy.test.mjs`).

  `X-Build` is the build's ID, sent with every static file: a hash of every file in `dist/`, the finished `_headers`, and the Worker (`worker/` and `wrangler.jsonc`). `scripts/headers.mjs` writes it at build. Any change that ships, a header or the Worker alone included, changes it, so two builds share a marker only when nothing that ships differs. Then step 5 can't see the switch, and the summary says so. `DEPLOY_POLL`, `DEPLOY_WAIT`, `DEPLOY_SETTLE` and `DEPLOY_RETRY` (seconds) change the timings.

  > **Note:** `wrangler versions deploy` doesn't apply routes, custom domains, cron triggers, `workers_dev`, or `preview_urls` from `wrangler.jsonc`, as `wrangler deploy` did. After a change to those (the custom domain at launch), run `npx wrangler triggers deploy` once, or deploy by hand with `npx wrangler deploy`. Keep `preview_urls` on: every deploy checks the new version at its preview address.

  > **Note:** The first deploy of a new Worker has no live version to roll back to, so the script stops before it changes anything. It also stops if `wrangler deployments status` fails. In either case, deploy by hand with `npx wrangler deploy` after `npm run build`, then let the next push to `main` use the checked flow.
- A pull request with the `full-checks` label also runs the screenshot comparison (`npm run visual-diff`) against the live site in its own job. Every pull request gets a Worker Preview (`npx wrangler preview --name pr-N`), and the job posts its address as a comment. The address comes from the pull request's number, `https://pr-N-uplink-site.johnoreilly.workers.dev`, so it stays the same on every push. The preview takes the built site and the `previews` block in `wrangler.jsonc`, which names the `REPORTS` rate limit again: a preview doesn't inherit bindings. The preview job fails if wrangler's JSON has no address.
- The workflow needs two secrets in a GitHub environment named `cloudflare`: `CLOUDFLARE_API_TOKEN` (with "Workers Scripts: Edit") and `CLOUDFLARE_ACCOUNT_ID`. Without them, a pull request's preview job is skipped, and a push to `main` fails at the `build` gate, as it can't deploy. The environments `production` (deploys from `main` only) and `preview` are set up to replace it (`notes.md`).
- Cloudflare keeps up to 100 previews for the Worker. Past that, it deletes the one deployed to longest ago, so nothing here cleans them up. To delete one by hand: `npx wrangler preview delete --name pr-N`.

> **Note:** `wrangler preview` is an open beta (November 9, 2026). If Cloudflare changes it, the preview job fails and nothing else does: the gate, the deploy, and the live site don't depend on it. The earlier way, `wrangler versions upload --preview-alias`, is in git history (`scripts/preview-alias.mjs`, `scripts/clean-previews.mjs`).

## Repository rules

Two rulesets protect `main` (GitHub > Settings > Rules > Rulesets):

- **main: no force push or delete.** Applies to everyone.
- **main: pull request and build.** A change reaches `main` through a pull request, and the `build` job (the gate over the build and every check) must pass. Repository admins can bypass it (bypass mode "always").

A pull request that changes only root `*.md` files or `docs/` still gets a `build` result: `site.yml` runs on every pull request, its `scope` job sees a docs-only change and skips the rest, and `build` passes in seconds (until November 9, 2026, `paths-ignore` skipped the workflow, and the required check waited forever). Its merge to `main` deploys nothing, because the push to `main` still ignores those files.

Secret scanning with push protection, private vulnerability reporting, CodeQL (default setup), and the dependency graph are on under Settings > Code security.

## Roll back a bad deploy

The deploy job rolls back on its own when the live site fails the smoke check straight after a deploy. Roll back by hand when something breaks that the smoke check doesn't catch, or when the run's summary says "Rollback failed":

1. List the recent deploys: `npx wrangler deployments list`.
2. Put the previous version back live: `npx wrangler rollback` (for an older one, `npx wrangler rollback VERSION_ID`). It takes seconds and needs no build.
3. Fix `main`. The next push to `main` deploys it again.

## Response headers

`public/_headers` sets the security headers on every static file (HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, X-Frame-Options, and the CSP), the cache rules, and the `Speculation-Rules` header. Responses the Worker writes itself, such as the `308` redirect and `/api/report`, don't get them: the Worker sets its own (see [The Worker](#the-worker)).

The `Speculation-Rules` header points Chrome and Edge at `public/speculation-rules.json`, served as `application/speculationrules+json`. When a pointer rests on a link to one of the site's pages for 200 ms (on phones, when the link comes into view), the browser fetches that page in the background, so the click doesn't wait for the HTML. Links to `/api/` and to the `.md` and `.txt` copies are left out. A header, unlike an inline `<script type="speculationrules">`, needs no change to the CSP. Other browsers ignore it.

The file is a template. `npm run build` runs `scripts/headers.mjs`, which writes `dist/_headers` with a hash for every inline `<script>` and `<style>` in the built pages and in the drawings that scripts insert. It also fills in `X-Build`, the build's ID (see [Deploys](#deploys)), writes an Early Hints `Link` rule for each page, and a rule for each Markdown copy (see [Search engines](#search-engines)). Don't paste a hash in by hand.

Keep these rules in mind:

- **Outside hosts.** Adding an outside host, such as fonts, analytics, or a form service, means adding it to the CSP.
- **Trusted Types.** The CSP requires Trusted Types. A script that writes HTML (`innerHTML`, `insertAdjacentHTML`) must pass the string through `html()` from `core.js`, or the browser blocks it.
- **No `style=""` attributes.** `style-src` has no `'unsafe-inline'`, and the build fails on any `style=""` attribute. Scripts set styles with `el.style.x = …` instead.
- **Font files keep their names.** `/assets/fonts/` is cached immutable for a year but has no hash in its file names: if a font file changes, give it a new name.

Every control and how to check it: [`docs/security.md`](docs/security.md).

## Search engines

The site is open to visitors but kept out of search results. `public/_headers` sends `X-Robots-Tag: noindex` on every response, because the content is placeholder. Remove that line at launch.

The Markdown copies (`/services.md`, `/index.md` for Home, and the rest) stay out of search results after launch too. `scripts/headers.mjs` gives each `.md` file a rule of its own in `dist/_headers`, with `X-Robots-Tag: noindex` and a `Link: <PAGE>; rel="canonical"` header that names its page. The address comes from that page's own `<link rel="canonical">`, so it follows `SITE_URL`. `/agents.md` has no page, so it gets the `noindex` only. Keep this `noindex` at launch: it isn't the line in `public/_headers`.

> **Note:** Each page takes two of Cloudflare's 100 `_headers` rules: its Early Hints rule and its Markdown copy's rule. `headers.mjs` stops the build past 100.

The sitemap's `<lastmod>` dates and a case study's `datePublished` and `dateModified` come from git history (`src/lib/git-dates.mjs`). A static page dates from the files listed in `SOURCES` in `src/lib/site.ts`. A service or project page dates from its own JSON file only, so editing one project changes one page's date.

> **Note:** A shallow clone (`git clone --depth N`) would give every page the cut-off commit's date. With `CI` set, the build stops on one. Elsewhere it warns once and leaves the dates out. Run `git fetch --unshallow` to put them back. CI checks out with `fetch-depth: 0`.

## Password lock

The password lock is off. `tools/site-lock/worker.js` holds `lock()`, which puts the whole site behind a browser password prompt. It isn't deployed on its own: you copy it into `worker/index.js`.

To turn the lock on:

1. In `wrangler.jsonc`, set `assets.run_worker_first` to `true`, so every request runs the Worker.
2. Copy `lock()` and `passwordOk()` from `tools/site-lock/worker.js` into `worker/index.js`.
3. In `route()` in `worker/index.js`, add this line after the `/api/report` line:

   ```js
   const denied = await lock(request, env); if (denied) return denied;
   ```

   The line must come after the http-to-https redirect, so the browser never sends the password over plain http. It must also come after `/api/report`, so visitors' browsers can still send their reports.
4. Set the password and deploy:

   ```sh
   npx wrangler secret put SITE_PASSWORD
   npx wrangler deploy
   ```

The browser asks for a username and password. Any username works; the password must match `SITE_PASSWORD`. With no secret set, the site stays locked. To test locally, run `npx wrangler dev --var SITE_PASSWORD:SOME_TEST_VALUE`.

To turn the lock off, undo steps 1 to 3, deploy, and run `npx wrangler secret delete SITE_PASSWORD`.
