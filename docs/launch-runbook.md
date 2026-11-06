# Launch runbook: moving the site to the real domain

The order of steps for launch day, who does each, and how to back out. Written 5 Nov 2026; the domain isn't picked yet, so `example.ca` stands for it below. The reasons behind each step are in `notes.md` ("Domain and hosting") and `docs/go-live-checklist.md`.

**Roles:** **Owner** (John) does anything that needs an account login: registrar, Cloudflare dashboard, GitHub settings. **Claude** does the code changes and the checks. One person can be both. Pick a quiet weekday morning, not a Friday.

## The day before

1. **Owner:** at the registrar, lower the TTL on the current records to 300 seconds (5 minutes), so a mistake can be undone fast. Skip this if the domain has no live site today.
2. **Owner:** if the company has an old site, list its addresses, so each can get a redirect (`notes.md`, the redirects line).
3. **Claude:** on a branch `launch`, make the launch code changes without merging:
   - `public/_headers`: delete the `X-Robots-Tag: noindex` line
   - `src/pages/robots.txt.ts`: add the `Sitemap:` line back (its comment says how)
   - `SITE_URL`: the real domain (`astro.config.mjs` default, or the CI environment)
   - `scripts/headers.mjs`: the `Link: rel="canonical"` header on each `.md` copy (`notes.md`)
   - `wrangler.jsonc`: `routes` with the custom domain, and `run_worker_first` back to `["/api/*", "/404"]`
   - `worker/index.js`: drop the `http://` to `https://` lines (the zone does that now)
   - `src/data/privacy.md`: if Bot Fight Mode goes on, change "The site sets no cookies" (`docs/privacy-and-accessibility-2026-11-03.md`, item 17)
   - Open the PR, let CI pass, and don't merge yet.
4. **Both:** read the PR's preview once, end to end.

## Launch (about an hour)

1. **Owner:** in Cloudflare, add the domain as a zone (the free plan is fine) and change the nameservers at the registrar to Cloudflare's. Wait until Cloudflare says the zone is Active (minutes to a few hours).
2. **Owner:** zone settings:
   - SSL/TLS: Full (strict) and Always Use HTTPS
   - minimum TLS 1.2, with HTTP/3 and Early Hints on
   - Auto Minify and Rocket Loader off (they'd break the CSP hashes)
   - DNSSEC on, then add the DS record at the registrar
3. **Claude:** merge the `launch` PR. CI deploys it, and the Worker answers on `example.ca`.
4. **Owner:** in Workers > uplink-site > Settings, check the custom domain shows Active with a certificate.
5. **Claude:** smoke test: `python tools/smoke.py https://example.ca --launch`. Every line must pass.
6. **Owner:** redirect the old address. For a `workers.dev` → `example.ca` redirect, either turn `workers.dev` off for the Worker (Workers > Settings > Domains), or have the Worker send a 301 for that host. Then:
   `python tools/smoke.py https://example.ca --launch --old https://uplink-site.johnoreilly.workers.dev`
7. **Owner:** DNS records the domain needs even before it sends mail:
   - CAA naming the CAs Cloudflare uses
   - `v=spf1 -all`
   - `_dmarc` with `p=reject`
   - a null MX (`0 .`)
   - Once Cloudflare Email Service sends mail, swap these for its records.
8. **Owner:** Web Analytics: add `example.ca` to the site, or make a new site and give Claude the token for `core.js`.
9. **Claude:** a browser check against the real domain: `python tools/verify_footer.py out/` won't reach it, so open Home, one service page and Contact in a real browser, and watch the console for CSP blocks.

## Straight after

- **Owner:** set up Search Console and Bing Webmaster Tools (verify by DNS record, submit `https://example.ca/sitemap.xml`).
- **Owner:** the uptime check now points at `example.ca`.
- **Both:**
  - SSL Labs (aim for A or better)
  - Mozilla Observatory (it was A+ on `workers.dev`)
  - Rich Results Test on Home, one service and one project
  - share previews in the LinkedIn Post Inspector and the Facebook Sharing Debugger
- **Claude:** `docs/go-live-checklist.md`: tick what launch closed. Move the done lines out of `notes.md`. Tag the release (`docs/sop.md`, section 2, step 6).
- **Owner, after a week of clean HTTPS:** HSTS `includeSubDomains; preload`, then submit at hstspreload.org. Preload is hard to undo, so only once every subdomain is HTTPS for good.
- **Owner:** raise the DNS TTL back to Auto.

## Backing out

| What broke | Undo | Takes |
| --- | --- | --- |
| A bad deploy (page errors, layout broken) | `npx wrangler rollback`, then fix on a branch | seconds |
| The domain doesn't answer, or the certificate fails | Remove the custom domain from the Worker; `workers.dev` still works (turn it back on if step 6 turned it off) | minutes |
| The DNS move itself went wrong | Put the old nameservers back at the registrar | up to the old TTL (5 min if the day-before step was done) |
| Indexed too early, or wrong pages in search | Put `X-Robots-Tag: noindex` back and deploy; Search Console > Removals for urgent ones | a deploy |

## Practising the rollback (do once before launch)

On a quiet day, with nothing else deploying:

1. `npx wrangler deployments list`: note the current version id.
2. `npx wrangler rollback`: the one before goes live. Check the site still answers: `python tools/smoke.py https://uplink-site.johnoreilly.workers.dev`.
3. `npx wrangler rollback <the id from step 1>`: back to current. Run the smoke test again.
4. Write the date and how long it took into `docs/go-live-checklist.md`.
