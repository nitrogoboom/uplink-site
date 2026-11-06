# Launch runbook: move the site to its real domain

*Last updated: November 5, 2026*

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
| **A. Turn `workers.dev` off** | The old address stops answering. | Nothing runs on every request. Links to the old address break. CI's screenshot comparison and pull request previews must stop relying on it. |
| **B. Redirect `workers.dev` to `DOMAIN`** | The old address sends a `301` to the same page on `DOMAIN`. | The Worker must see every request, so `run_worker_first` stays `true`, and every request counts against the free plan's 100,000 a day. Needs a host redirect in `worker/index.js`, which doesn't exist yet. |

## The day before

1. **Owner:** at the registrar, lower the TTL on the current DNS records to 300 seconds (5 minutes), so a mistake can be undone fast. Skip this if the domain has no live site today.
2. **Owner:** if the company has an old site, list its addresses so each one can get a redirect (see the redirects line in `notes.md`).
3. **Claude:** on a branch named `launch`, make the launch code changes. Don't merge yet.
   - `public/_headers`: delete the `X-Robots-Tag: noindex` line.
   - `src/pages/robots.txt.ts`: add the `Sitemap:` line back. Its comment says how.
   - `SITE_URL`: set it to `https://DOMAIN`, as the default in `astro.config.mjs` or in the CI environment.
   - `scripts/headers.mjs`: add a `Link: <PAGE>; rel="canonical"` header to each `.md` copy (see `notes.md`).
   - `wrangler.jsonc`: add `routes` with the custom domain.
   - `.github/workflows/site.yml` and `scripts/ci.mjs`: change the live address the screenshot comparison uses from `uplink-site.johnoreilly.workers.dev` to `DOMAIN`.
   - `SECURITY.md`: point the `security.txt` link at `DOMAIN`.
   - `src/data/privacy.md`: if Bot Fight Mode goes on, change "The site sets no cookies". See item 17 in `docs/privacy-and-accessibility-2026-11-03.md`.
   - **With option A:** set `run_worker_first` back to `["/api/*", "/404"]` in `wrangler.jsonc`, and remove the `http://` to `https://` lines from `worker/index.js`, because the zone does that now.
   - **With option B:** keep `run_worker_first` as `true`. Add a redirect to `worker/index.js` that sends any request for the `workers.dev` host to the same path on `DOMAIN` with a `301`. Keep the `http://` to `https://` lines.
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
3. **Claude:** merge the `launch` pull request. CI deploys it, and the Worker answers on `DOMAIN`.
4. **Owner:** in Workers > uplink-site > Settings, check that the custom domain shows Active, with a certificate.
5. **Claude:** run the smoke test. Every line must pass.

   ```bash
   npm run smoke -- https://DOMAIN --launch
   ```

6. **Owner and Claude:** retire the old address.
   - **Option A:** in Workers > uplink-site > Settings > Domains & Routes, turn `workers.dev` off. Check that `https://uplink-site.johnoreilly.workers.dev` no longer answers. Then open a test pull request and check that its preview address still works.
   - **Option B:** check the redirect with the smoke test:

     ```bash
     npm run smoke -- https://DOMAIN --launch --old https://uplink-site.johnoreilly.workers.dev
     ```

7. **Owner:** add the DNS records the domain needs, even before it sends mail. They stop anyone from faking mail from it:
   - CAA records naming the certificate authorities Cloudflare uses.
   - SPF: `v=spf1 -all`.
   - DMARC: a `_dmarc` record with `p=reject`.
   - A null MX record (`0 .`).

   When Cloudflare Email Service starts sending mail, replace these with its records.
8. **Owner:** in Web Analytics, add `DOMAIN` to the site. Or make a new site and give Claude the token for `core.js`.
9. **Claude:** check the real domain in a browser. The site check (`npm run verify`) checks only a local server, so open Home, one service page, and Contact in a real browser, and watch the console for CSP blocks.

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
| A bad deploy: page errors or a broken layout | Run `npx wrangler rollback`, then fix the problem on a branch. | Seconds |
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
