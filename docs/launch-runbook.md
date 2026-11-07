# Launch runbook: move the site to its real domain

*Last updated: November 7, 2026*

This runbook gives the order of steps for launch day, who does each one, and how to back out. The reasons behind each step are in "Domain and hosting" in [`notes.md`](../notes.md) and in [`go-live-checklist.md`](go-live-checklist.md).

On this page, `DOMAIN` stands for the real domain, for example `uplinkit.ca`. The code uses `uplinkit.ca` as a placeholder today. Confirm the real domain before you start.

## Roles

- **Owner** (John) does anything that needs an account sign-in: the registrar, the Cloudflare dashboard, and GitHub settings.
- **Claude** makes the code changes and runs the checks.

One person can do both. Pick a quiet weekday morning, not a Friday.

## Before you begin

Choose how the old `workers.dev` address is retired. The choice changes the code in step 3 of [The day before](#the-day-before). There are two ways:

| Option | What happens | What it costs |
| --- | --- | --- |
| **A. Turn `workers.dev` off** | The old address stops answering. | No code change. Links to the old address break. CI's screenshot comparison and pull request previews must stop relying on it. |
| **B. Redirect `workers.dev` to `DOMAIN`** | The old address sends a `301` to the same page on `DOMAIN`. | The Worker must see every request, so `run_worker_first` becomes `true`, and every request counts against the free plan's 100,000 a day. Needs a host redirect in `worker/index.js`, which doesn't exist yet. |

## The day before

1. **Owner:** at the registrar, lower the TTL on the current DNS records to 300 seconds (5 minutes), so a mistake can be undone fast. Skip this if the domain has no live site today.
2. **Owner:** if the company has an old site, list its addresses so each one can get a redirect (see the redirects line in `notes.md`).
3. **Claude:** on a branch named `launch`, make the launch code changes. Don't merge yet.
   - `public/_headers`: delete the `X-Robots-Tag: noindex` line.
   - `src/pages/robots.txt.ts`: add the `Sitemap:` line back. Its comment says how.
   - `SITE_URL`: set it to `https://DOMAIN`, as the default in `astro.config.mjs` or in the CI environment.
   - The `.md` copies need nothing: `scripts/headers.mjs` already gives each one its own `noindex` and a canonical `Link` to its page, and the canonical follows `SITE_URL`.
   - `wrangler.jsonc`: add `routes` with the custom domain.
   - `.github/workflows/site.yml`: change the live address the screenshot comparison uses from `uplink-site.johnoreilly.workers.dev` to `DOMAIN`. In the deploy job, change `node scripts/deploy.mjs https://uplink-site.johnoreilly.workers.dev` to `node scripts/deploy.mjs https://DOMAIN --launch`, so both of its smoke runs expect the launched site. Change the same address in the example in the comment at the top of `scripts/ci.mjs`.
   - `SECURITY.md`: point the `security.txt` link at `DOMAIN`.
   - `src/data/privacy.md`: if Bot Fight Mode goes on, change "The site sets no cookies". See item 17 in `docs/privacy-and-accessibility-2026-11-03.md`.
   - **With option A:** nothing in `wrangler.jsonc` or `worker/index.js`. Keep `run_worker_first` as `["/api/*", "/404"]` and `not_found_handling` as `"none"`. Keep the `http://` to `https://` lines in `worker/index.js`: preview addresses are still on `workers.dev`, and on `DOMAIN` the zone redirects first.
   - **With option B:** set `run_worker_first` to `true` and keep `not_found_handling` as `"none"` (the Worker's 404 page works either way). Add a redirect to `worker/index.js` that sends any request for the `workers.dev` host to the same path on `DOMAIN` with a `301`. Keep the `http://` to `https://` lines.
4. **Claude:** open the pull request, and let CI pass. Don't merge yet.
5. **Both:** read the pull request's preview once, end to end.

## Launch

The launch takes about an hour.

1. **Owner:** in Cloudflare, add `DOMAIN` as a zone. The free plan is fine. At the registrar, change the nameservers to Cloudflare's. Wait until Cloudflare shows the zone as Active, which takes from a few minutes to a few hours.
2. **Owner:** set the zone's settings:
   - SSL/TLS: **Full (strict)**, and **Always Use HTTPS** on.
   - Minimum TLS version 1.2, with HTTP/3 and Early Hints on.
   - Auto Minify and Rocket Loader off. They would break the CSP hashes.
   - Browser Integrity Check: make sure it doesn't block agents that read `llms.txt` and the `.md` copies. On `workers.dev`, it returns 403 to a client that sends no user agent of its own.
   - DNSSEC on. Then add the DS record at the registrar.
3. **Owner:** attach `DOMAIN` to the Worker before the merge. CI deploys with `wrangler versions deploy`, which doesn't apply the `routes` in `wrangler.jsonc`. From the `launch` branch, signed in to Cloudflare, run:

   ```bash
   npx wrangler triggers deploy
   ```

   The version live now answers on `DOMAIN` until the merge, still with `noindex`.
4. **Owner:** in Workers > uplink-site > Settings, check that the custom domain shows Active, with a certificate.
5. **Claude:** merge the `launch` pull request. CI uploads the new version, smoke checks it, puts it live, and smoke checks `https://DOMAIN` with `--launch`. If that last check fails, CI rolls back and the run fails: read the deploy job's summary.
6. **Claude:** run the smoke test yourself. Every line must pass.

   ```bash
   npm run smoke -- https://DOMAIN --launch
   ```

7. **Owner and Claude:** retire the old address.
   - **Option A:** in Workers > uplink-site > Settings > Domains & Routes, turn `workers.dev` off. Check that `https://uplink-site.johnoreilly.workers.dev` no longer answers. Then open a test pull request and check that its preview address still works.
   - **Option B:** check the redirect with the smoke test:

     ```bash
     npm run smoke -- https://DOMAIN --launch --old https://uplink-site.johnoreilly.workers.dev
     ```

8. **Owner:** add the DNS records the domain needs, even before it sends mail. They stop anyone from faking mail from it:
   - CAA records naming the certificate authorities Cloudflare uses.
   - SPF: `v=spf1 -all`.
   - DMARC: a `_dmarc` record with `p=reject`.
   - A null MX record (`0 .`).

   When Cloudflare Email Service starts sending mail, replace these with its records.
9. **Owner:** in Web Analytics, add `DOMAIN` to the site. Or make a new site and give Claude the token for `core.js`.
10. **Claude:** check the real domain in a browser. Run the site check against it, then open Home, one service page, and Contact in a real browser and watch the console for CSP blocks:

   ```bash
   npm run verify -- --base https://DOMAIN
   ```

## Straight after launch

- **Owner:** set up Google Search Console and Bing Webmaster Tools. Verify the domain with a DNS record, and submit `https://DOMAIN/sitemap.xml`.
- **Owner:** point the uptime check at `DOMAIN`.
- **Both:** run the outside checks:
  - [SSL Labs](https://www.ssllabs.com/ssltest/): aim for A or better.
  - [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory): it was A+ on `workers.dev`.
  - Google's [Rich Results Test](https://search.google.com/test/rich-results) on Home, one service, and one project.
  - Share previews in the LinkedIn Post Inspector and the Facebook Sharing Debugger.
- **Claude:** tick what the launch closed in `docs/go-live-checklist.md`, and remove the finished lines from `notes.md`. Tag the release (see step 10 of [How a change reaches the live site](sop.md#how-a-change-reaches-the-live-site)).
- **Owner, after a week of clean HTTPS:** add `includeSubDomains; preload` to HSTS, then submit the domain at [hstspreload.org](https://hstspreload.org/).

  > **Caution:** Preloading is hard to undo. Do it only once every subdomain is on HTTPS for good.

- **Owner:** set the DNS TTL back to Auto.

## Back out

| What broke | How to undo it | How long it takes |
| --- | --- | --- |
| A bad deploy: page errors or a broken layout | If the smoke check caught it, CI has rolled back already (the deploy job's summary says so). Otherwise run `npx wrangler rollback`. Then fix the problem on a branch. | Seconds |
| The domain doesn't answer, or the certificate fails | Remove the custom domain from the Worker. `workers.dev` still works; with option A, turn it back on first. | Minutes |
| The move to Cloudflare's nameservers went wrong | Put the old nameservers back at the registrar. | Up to the old TTL: 5 minutes, if you lowered it the day before |
| Pages indexed too early, or the wrong pages in search | Put `X-Robots-Tag: noindex` back and deploy. For urgent ones, use Search Console > Removals. | One deploy |

## Practise the rollback

Do this once before launch, on a quiet day with nothing else deploying. It briefly puts the previous version live.

1. List the deploys and note the current version ID:

   ```bash
   npx wrangler deployments list
   ```

2. Put the previous version live, then check that the site still answers:

   ```bash
   npx wrangler rollback
   npm run smoke -- https://uplink-site.johnoreilly.workers.dev
   ```

3. Go back to the current version, replacing `VERSION_ID` with the ID from step 1, and run the smoke test again:

   ```bash
   npx wrangler rollback VERSION_ID
   npm run smoke -- https://uplink-site.johnoreilly.workers.dev
   ```

4. Write the date, and how long it took, in `docs/go-live-checklist.md`.
