# Release and launch

Only for the launch, or a release the owner asks for.

Standards: WCAG 2.2 AA (Ontario requires 2.0 AA at 50+ employees, O. Reg. 191/11 s. 14), PIPEDA and CASL, the headers in [`security.md`](security.md), current Chrome, Edge, Firefox and Safari (older browsers get a working page), PageSpeed 100 on Home, `lang="en-CA"`.

## Ship a release

1. Do the looks in the `check` skill on the local site (`astro` dev server, or `npm run build` and `npm run serve`), every page: before and after (against the live site), browser compatibility, accessibility, large text, print, links. Confirm each change you see was meant.
2. When the owner says push: push to `main` (`CLAUDE.md`, "Check, ship"). Read the deploy summary: it names the live version or says why not. Rollback: [ops.md](ops.md#roll-back-a-bad-deploy).
3. Run the checklist below; the filled-in result goes in the release report to the owner, not a saved file.
4. Tag: `git tag -a vYYYY.MM.DD COMMIT -m "SUMMARY"`, `git push origin vYYYY.MM.DD`, `gh release create vYYYY.MM.DD` (a few lines).

## Release checklist

On the live site. About 25 minutes. Proof: one line per failure (page, problem, WCAG number).

**Release:** date `____` · commit `____` · checked by `____`

**A. Hosting**
- [ ] CI green on the live commit (link the run); `npx wrangler deployments list` shows it live.
- [ ] `curl -sI ADDRESS` shows HSTS, CSP, `X-Content-Type-Options`; `npm run smoke -- ADDRESS` passes; a made-up address gives the 404 page with status 404.
- [ ] Workers logs since the last release (search `report`): each real error or CSP block is fixed or in `notes.md`.

**B. The looks** — every look in the `check` skill, on every page: Chromium, Firefox and WebKit, phone and desktop; keyboard; the accessibility tree; zoom; motion; forms. Paste the findings, one line each.

**C. By hand**
- [ ] WCAG 2.1/2.2 items the machine misses, phone and desktop: rotation, `autocomplete` on name and email, 3:1 control contrast, text spacing, hover content (dismissable, hoverable), no single-key shortcuts or path gestures, targets 24px, focus never hidden, consistent help, no repeated entry, status messages announced.
- [ ] Zoom to 200% once in Firefox and Safari.
- [ ] Real iPhone Safari and Android Chrome: Home, one service, Contact (bottom bar, notch, Grow, footer). Firefox ESR footer.
- [ ] Listen to one changed page (NVDA, Narrator or VoiceOver), by heading too.
- [ ] Judge: link text says where it goes; headings, labels and tab titles are clear; colour isn't the only signal; new colour pairs pass contrast; no words in pictures; header, bar and footer are the same on every page.

**D. Content and legal**
- [ ] No wrong `/soon` links; a terms page exists if forms or the real domain go live; `noindex` on until launch, off after; privacy and accessibility pages still true.

**E. Sign-off** — every box ticked or a dated `notes.md` line. Result: `pass` / `pass with notes` / `fail` · signed `____`. Tagged.

## Watch the live site

Workers logs (3 days) for `/api/report` lines after each deploy; Dependabot monthly, merge on green.

## Before launch

**(you)** needs a person or sign-in, **(domain)** the domain, **(content)** real copy. Tick with date and proof.

- [ ] **(you)** Add Cloudflare Web Analytics for `DOMAIN`: the beacon in `core.js` (a Trusted Types `createScriptURL` for it), its two hosts in the CSP (`public/_headers`), and the analytics lines on the privacy page. All three were removed November 13, 2026; `git log -S BEACON_TOKEN` finds the old code.
- [ ] **(you)** Decide what gets a test: the "Set in stone" list in `CLAUDE.md`. Until then the repo has none but the deploy's smoke check.
- [ ] Narrow the Trusted Types policy: `html()` in `core.js` accepts only the site's own drawings and icons (review J6).
- [ ] One cached stylesheet instead of inlined CSS per page (review L4); hashed drawing file names (L5).
- [ ] Review PR #38's form routes like `/api/report`: Turnstile, honeypot, rate limit, header injection.
- [ ] **(domain)** SSL Labs A+, securityheaders.com, Mozilla Observatory; registrar lock, auto-renew, 2FA.
- [ ] **(content)** Social links and the ~20 `/soon` links per page get real targets; `Français` back with a real French page.
- [ ] **(you)** A lawyer reads `/privacy` and the terms; the two Ontario lines for `/accessibility` (`notes.md`).
- [ ] Redirects from the old site's addresses, if there is one.
- [ ] **(you)** PageSpeed on every page (pagespeed.web.dev); one WebPageTest run from Toronto; decide on Lighthouse CI.
- [ ] **(you)** Practise a rollback (below); alerts for `/api/report` and uptime; a proofread by someone else; extra real phones; the owner's sign-off.
- [ ] `curl -sI` a version preview address: if Cloudflare adds `X-Robots-Tag: noindex` there, the deploy's `--preview --launch` smoke fails every deploy (review H3); then leave that check to the live run.

## Launch day

`DOMAIN` is the real domain (placeholder `uplinkit.ca`; confirm it). The owner does sign-ins; Claude does code and checks. A quiet weekday morning.

Launch day is the one planned use of a pull request: the `launch` branch gets a PR so its preview can be read before it goes live. Every other change still goes straight to `main` (`CLAUDE.md`).

**Retire `workers.dev`:** **A.** turn it off (old links break), or **B.** 301 it to `DOMAIN` (`run_worker_first: true`, every request counts against the free plan, and `worker/index.js` needs a host redirect). Either way keep preview URLs on.

### The day before

1. **Owner:** DNS TTL to 300 s; list old addresses for redirects.
2. **Claude:** on a `launch` branch, don't merge yet:
   - `public/_headers`: drop `X-Robots-Tag: noindex`. `src/pages/robots.txt.ts`: add the `Sitemap:` line back.
   - `SITE_URL` = `https://DOMAIN`; `wrangler.jsonc`: `routes` with the custom domain.
   - `site.yml`: `node scripts/deploy.mjs https://DOMAIN --launch`; `SECURITY.md`'s `security.txt` link.
   - If Bot Fight Mode goes on: let user agents `uplink-deploy` and `uplink-smoke-test` through (or deploys roll back), and fix "sets no cookies" in `src/data/privacy.md` (`__cf_bm`).
   - Option B: 301 exactly the host `uplink-site.johnoreilly.workers.dev`, never all of `workers.dev` (previews live there; redirecting them breaks every deploy).
3. Open the PR, let CI pass, both read the preview once.

### Launch (about an hour)

1. **Owner:** add `DOMAIN` as a Cloudflare zone, change nameservers, wait for Active.
2. **Owner:** Full (strict), Always Use HTTPS, TLS 1.2 minimum, HTTP/3, Early Hints on; Auto Minify and Rocket Loader off (they break CSP hashes); DNSSEC on with the DS record.
3. **Owner:** from the `launch` branch, `npx wrangler triggers deploy` (CI doesn't apply routes). `curl -sI` the PR preview for a Cloudflare `X-Robots-Tag`.
4. **Owner:** custom domain Active with a certificate.
5. **Claude:** merge; read the deploy summary.
6. **Claude:** `npm run smoke -- https://DOMAIN --launch`; Early Hints 103 with `curl -I --http2`.
7. Retire the old address. A: turn `workers.dev` off, leave Preview URLs on, check a PR preview still works. B: `npm run smoke -- https://DOMAIN --launch --old https://uplink-site.johnoreilly.workers.dev`.
8. **Owner:** no-mail DNS: CAA, SPF `v=spf1 -all`, DMARC `p=reject`, null MX.
9. **Claude:** `npm run smoke -- https://DOMAIN --launch`; open three pages and watch the console.

### After launch

- **Owner:** Search Console and Bing by DNS, submit the sitemap; uptime check to `DOMAIN`; TTL back to Auto.
- **Both:** SSL Labs, Observatory, Rich Results Test, share previews.
- **Claude:** tick this page and `notes.md`; tag the release.
- **Owner, after a clean week:** HSTS `includeSubDomains; preload` and hstspreload.org (hard to undo).

### Back out

| Broke | Undo |
|---|---|
| A deploy | CI rolled back if the smoke caught it; else `npx wrangler rollback` |
| Domain or certificate | Remove the custom domain; `workers.dev` still works (A: turn it back on) |
| Nameservers | Put the old ones back |
| Indexed too early | Restore `X-Robots-Tag: noindex`, deploy; Search Console Removals |

### Practise the rollback

1. Note the version: `npx wrangler deployments list`.
2. `npx wrangler rollback`, then `npm run smoke -- https://uplink-site.johnoreilly.workers.dev`.
3. `npx wrangler rollback VERSION_ID` (from step 1), smoke again. Tick it in Before launch.
