# Hosting and operations

How the site is hosted and run. Secrets and security controls are in [`security.md`](security.md).

- **Code:** the public GitHub repository `nitrogoboom/uplink-site`.
- **Site:** Cloudflare Workers, static assets only (`wrangler.jsonc`): the files in `dist/`, exactly as `npm run build` (Astro) writes them. No Worker script runs and nothing changes the files after the build. Live at https://jodesign.ca, and still at https://uplink-site.johnoreilly.workers.dev.
- **Domain:** `jodesign.ca`, the project's primary domain (owner, November 23, 2026), a Cloudflare zone (nameservers at Rebel.ca). Both names are Custom Domains in `wrangler.jsonc`; a Redirect Rule on the zone ("Redirect from WWW to root") sends `www` to the bare name with a 301. The zone has Email Address Obfuscation, Automatic HTTPS Rewrites, Rocket Loader, Cloudflare Fonts and Replace insecure JavaScript libraries off: each makes Cloudflare rewrite a page as it's sent, which slows it and drops its ETag, so a returning visitor downloads the page again in full (the last one was doing it). Web Analytics (RUM) is on with manual setup ("Enable with JS Snippet installation"): the site loads the beacon itself once a page has loaded (`src/scripts/analytics.js`), and the CSP allows its two hosts. Never switch it to automatic: Cloudflare would then insert the beacon by rewriting each page. On the owner's PC the beacon fails (`net::ERR_NAME_NOT_RESOLVED`, or "blocked:other"): the PIA VPN's DNS answers `0.0.0.0` for `static.cloudflareinsights.com`. That is the VPN's tracker blocker, not the site, and a Lighthouse run from that PC never loads the beacon; PageSpeed Insights does. Loaded as it is now, the beacon costs the first paint nothing that can be measured (Lighthouse on the live site, phone, 5 runs each, November 22, 2026: 1.18 s with it, 1.15 s with it blocked). Also set on the zone (November 23, 2026): Minimum TLS Version 1.2; 0-RTT Connection Resumption on; DNSSEC left off (Rebel.ca takes the DS record only by an email to its support: `notes.md`); three records that say the domain sends no mail (SPF `-all`, an empty DKIM key, DMARC `reject`: delete them before mail is ever sent from it); Certificate Transparency Monitoring, which emails the owner when anyone issues a certificate for the domain; and Network Error Logging left on, with its section on the privacy page. Cloudflare's own HSTS setting stays off: `public/_headers` sends that header. A Compression Rule on the zone ("Brotli first": Rules > Overview > Compression Rules, default content types, "Enable Brotli and Gzip") sends Brotli where the Free plan's default is Zstandard: Home is 51.8 KB that way against 54.8 KB, and the script and drawings shrink the same way. It covers `jodesign.ca` only; `workers.dev` and the previews still get Zstandard.

## What Astro does, and what Cloudflare does

| Job | Who | Where it is set |
| --- | --- | --- |
| Pages, one set per language | Astro | `src/pages/`, `i18n` in `astro.config.mjs` |
| CSS inside each page (nothing blocks the first paint) | Astro | `build.inlineStylesheets: 'always'` |
| The Content Security Policy and every other response header, caching | Cloudflare | `public/_headers`, shipped as written |
| Fonts, with hashed names | Astro | `fonts` |
| `/services` for `services.html`; `/services/` and `/services.html` redirect there (a 307, Cloudflare's own; each page's canonical tag names the clean address for search engines) | Cloudflare | its default `html_handling` |
| The 404 page for a missing address | Cloudflare | `not_found_handling: "404-page"` |

The drawings are finished on the owner's machine (`tools/`, [`drawing-tools.md`](drawing-tools.md)) and committed; the build only copies them.

## Deploys

A push to `main` that changes the site runs `.github/workflows/site.yml`: `npm ci`, `npm run build`, `npx wrangler deploy`. About a minute. A push of only docs runs nothing. "Run workflow" on `main` deploys again.

- **Is it live?** `curl -s https://jodesign.ca/version.txt` prints the commit the live build was made from (7 characters, as `git log --oneline` shows it).
- **By hand:** `npm run deploy` (build, then `wrangler deploy`), from `main`.
- **Roll back:** `npx wrangler rollback` puts the previous version live; `npx wrangler deployments list` shows them. Then fix `main`.
- **Previews:** a pull request gets `https://pr-N-uplink-site.johnoreilly.workers.dev` (the `preview` job).
- **Secrets:** `CLOUDFLARE_API_TOKEN` ("Workers Scripts: Edit", and "Workers Routes: Edit" on the `jodesign.ca` zone, which a deploy that changes `routes` needs) and `CLOUDFLARE_ACCOUNT_ID`, in the GitHub environment `cloudflare`.

Nothing checks the site after a deploy, and nothing rolls it back by itself. A change a visitor can see gets a look in the browser.

## When the forms send

A static site has no address that takes input. The Astro way to add one is the `@astrojs/cloudflare` adapter: the pages stay prerendered, and the form's endpoint is one on-demand route or Astro Action. That is the owner's decision (PR #38 holds the earlier Worker-script version).

## Dependency notes

- After Dependabot bumps `wrangler`, set `allowScripts` in `package.json` to the versions in `package-lock.json` (`workerd`, `esbuild`, `fsevents`), or `npm ci` warns and npm 12 won't run their install scripts.
- TypeScript 7: `astro check` refuses it, so `dependabot.yml` ignores TypeScript majors. Move when `@astrojs/check` supports 7.
- `compatibility_date` in `wrangler.jsonc`: bump it when wrangler is updated.

## Repository rules

Two rulesets protect `main` (GitHub > Settings > Rules > Rulesets):

- **main: no force push or delete.** Applies to everyone.
- **main: pull request and build.** A change reaches `main` through a pull request, and the `build` job must pass. Repository admins bypass it, and in draft mode the owner's pushes do: straight to `main`.

Secret scanning with push protection, private vulnerability reporting, CodeQL (default setup), and the dependency graph are on under Settings > Code security.
Every control and how to check it: [`security.md`](security.md).

## Plain http

On `workers.dev` a page still answers on `http://`; HSTS (`public/_headers`) moves a browser to `https://` after its first visit. At launch, Always Use HTTPS on the zone redirects every request (`release.md`, "Launch").

## Search engines

`public/_headers` sends `X-Robots-Tag: noindex` on every response, because the content is placeholder. Remove that line at launch.
