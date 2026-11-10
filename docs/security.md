# Security, privacy, and secrets

The site's security and privacy controls, how to check each one, and every secret (names and places, never values). How to report a problem: [`SECURITY.md`](../SECURITY.md).

The site is static. One small Worker runs only for `/api/*`, `/404`, and addresses with no file ([`ops.md`](ops.md#the-worker)). There are no accounts, no database, and no third-party script except Cloudflare Web Analytics.

| Area | Standard | What the site does |
| --- | --- | --- |
| Privacy | [PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/), and CASL for the newsletter | Publishes what it collects, who processes it, where, and for how long (`/privacy`). Sets no cookies. |
| Response headers | [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) | A+ on [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory). |
| Disclosure | [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) | `/.well-known/security.txt`, built with an expiry a year after the build, so rebuild at least once a year. |

## Security controls

### HTTPS and HSTS

- Every page and file sends `Strict-Transport-Security: max-age=31536000`. Add `includeSubDomains; preload` only once every subdomain is HTTPS for good: preloading is hard to undo.
- The Worker redirects `http://` to `https://` with a `308` for the requests it sees. At launch, Always Use HTTPS on the zone redirects everything first.

### Content Security Policy

No `'unsafe-inline'`: inline code runs only by its SHA-256 hash. `public/_headers` is the template; `scripts/headers.mjs` fills in the hashes at build. Its shape:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com 'sha256-…';
  style-src 'self' 'sha256-…'; font-src 'self' data:; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com;
  form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none';
  require-trusted-types-for 'script'; trusted-types uplink; report-uri /api/report; report-to csp
```

- The one inline script marks the page as script-enabled and applies the saved theme and motion choice before paint.
- No element carries `style=""`; the build fails on one. Scripts set styles with `el.style.x = …`.
- `font-src data:` is there because each SVG carries its own letters as a data font.
- A new outside host (fonts, analytics, a form service) means a CSP change. Forms with Turnstile will need `challenges.cloudflare.com` in `script-src` and `frame-src`.

### Trusted Types

The CSP allows one policy, `uplink`, created in `src/scripts/core.js`. Every HTML write goes through its `html()` helper. The policy doesn't clean HTML: callers pass only the site's own text and drawings. Its `createScriptURL` allows only the analytics beacon.

### Other headers

`public/_headers` sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin` (`og.png` is `cross-origin`).

- The Worker's own responses don't get `_headers` ([`ops.md`](ops.md#the-worker)).
- Not sent on purpose: `X-Permitted-Cross-Domain-Policies` (the smoke check fails if it comes back) and `Cross-Origin-Embedder-Policy` (it could block the analytics script).

### Reports from browsers

The CSP reports to `/api/report` (`report-to` and `report-uri`, with `Reporting-Endpoints: csp="/api/report"`). `core.js` also sends uncaught script errors there, at most five per page view. The endpoint, the only part of the site that takes input:

- accepts only `POST`, and only from the site's own `Origin`; drops reports about other sites' pages
- rate-limits each visitor (`REPORTS` in `wrangler.jsonc`)
- stops reading a body at 8 KB, even with no `Content-Length`
- parses strict JSON, keeps a short list of known fields, cuts each to a fixed length, strips query strings from addresses, and logs line and column only when they're whole numbers

Tests: `scripts/test/worker.test.mjs`. Each report becomes one line in the Workers logs, kept 3 days.

### Supply chain

- Every GitHub Action is pinned to a commit. zizmor lints the workflows on every run.
- Dependabot proposes npm and Actions updates monthly, each release held a week first (5 days for an npm patch; `.github/dependabot.yml`).
- `requirements.txt` pins the Python drawing tools. They never run in CI or on the site.
- Fonts are self-hosted. The only third-party script is the analytics beacon.
- Treat every new third-party script as a security and privacy decision.

## Privacy

- **No cookies, no tracking.** Cloudflare Web Analytics uses no cookies. Settings (theme, motion, pause) stay in the browser's own storage. There's no consent banner.
- **What a report holds:** the page address without its query string, the error message, the script address and line, and the user agent cut to 200 characters; a CSP report also the blocked address (no query) and the directive. Never anything a visitor typed. Cloudflare keeps its own request log, IP included, for up to three days; the privacy page says so.
- **Keep the privacy page true.** A change that starts collecting something, or adds a processor, updates `src/data/privacy.md` in the same pull request.

## Secrets

Keep secrets in GitHub environments, Worker secrets, or `.dev.vars` (ignored by git). Never put one in the repository, a page, a pull request, or a chat. When you add or move a secret, update this table in the same pull request.

| Name | What it does | Where it's kept | Used by | How to change it |
| --- | --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploys the Worker and uploads previews. Needs "Workers Scripts: Edit". | GitHub > Settings > Environments > `cloudflare` | `site.yml` (deploy, preview) | Make a new token in Cloudflare (My Profile > API Tokens), paste it in, delete the old one. |
| `CLOUDFLARE_ACCOUNT_ID` | Which Cloudflare account. Not secret. | The same environment | The same jobs | Only if the site moves account. |
| `PSI_API_KEY` | Calls PageSpeed Insights. | `.dev.vars` or the environment. The key is `pagespeed-gate` in the Google Cloud project `uplink-site`. | `checks/pagespeed.spec.mjs` | Google Cloud > Credentials: a new key restricted to the PageSpeed Insights API. |
| Web Analytics token | Which site the beacon reports for. Public by design. | `BEACON_TOKEN` in `src/scripts/core.js` | Every page | Cloudflare > Web Analytics > the site > Manage site. Registered for the old `pages.dev` host. |
| Your sign-ins | The GitHub and Cloudflare accounts that own the repository and Worker. | Your password manager, with 2FA | Everything | Move to a company account with 2FA (`notes.md`). |

Planned, with the forms in [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (open, paused):

| Name | What it will do | Where it will be kept |
| --- | --- | --- |
| `TURNSTILE_SECRET` | Checks the forms' bot test (widget "uplink-site forms"). | Worker secret (`npx wrangler secret put TURNSTILE_SECRET`); `.dev.vars` holds Cloudflare's always-pass test secret. |
| `FORM_TO` | The inbox the forms send to. | Worker secret |
| `FORM_FROM` | The sending address, on a domain on Cloudflare. | Worker variable |
| `EMAIL` binding | Cloudflare Email Service. Not a secret. | `wrangler.jsonc` |
| `SITE_PASSWORD` | The optional site-wide lock, which is off ([`ops.md`](ops.md#password-lock)). | Worker secret |

Not secrets: `GH_TOKEN` in CI is GitHub's short-lived token for the run. The placeholder inboxes (`privacy@`, `accessibility@`, `security@uplinkit.ca`) are under `inboxes` in `src/data/footer.json`.

> **Note:** The environments `production` (deploys from `main` only) and `preview` exist but are empty. The Cloudflare secrets move there, with a separate preview token (`notes.md`).

If a secret may have leaked:

1. Make a new one.
2. Delete the old one.
3. Note the change in this table's row.

## Review checklist

| Check | How | Pass |
| --- | --- | --- |
| HTTPS and HSTS | `curl -sI http://DOMAIN/services`, `curl -sI https://DOMAIN/ \| grep -i strict-transport` | `308` to `https://`; HSTS present |
| Security headers | Mozilla HTTP Observatory | A+ |
| CSP strength | [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | No high-severity findings |
| CSP in use | DevTools Console on several pages | No violations |
| Trusted Types | `document.body.innerHTML = 'x'` in the Console | Blocked |
| TLS | [SSL Labs](https://www.ssllabs.com/ssltest/) | A or higher |
| Cookies | DevTools > Application > Cookies, private window | None |
| Security contact | `/.well-known/security.txt` | Present, expiry in the future |
| Privacy page | Compare with what the site collects | Every claim matches |
