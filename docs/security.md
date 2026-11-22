# Security, privacy, and secrets

Controls, and every secret (names and places, never values). Reporting: [`SECURITY.md`](../SECURITY.md). The site is static; the Worker runs only for `/404` and missing addresses, and nothing on the site takes input. No accounts, no database, no third-party script (analytics come back at launch: `release.md`, "Before launch"). Targets: PIPEDA and CASL, OWASP headers (Observatory A+), RFC 9116 `security.txt` (expires a year after the build: rebuild yearly).

## Security controls

### HTTPS and HSTS

- Every page and file sends `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (owner, November 17, 2026: PageSpeed's HSTS check). On `workers.dev` the two extra words change nothing. On the real domain they cover every subdomain, mail included: before launch, confirm each one is HTTPS for good, or take the two words out of `public/_headers` until it is (`docs/release.md`, "Before launch"). Joining the browsers' lists at hstspreload.org is hard to undo.
- Nothing redirects `http://` to `https://` on `workers.dev`: a page still answers on plain `http://` (HSTS covers every visit after the first). At launch, Always Use HTTPS on the zone redirects everything.

### Content Security Policy

One header on every response, written by hand in `public/_headers` and shipped as written: nothing fills it in at build.

- `default-src 'none'`, `font-src 'self'`, `img-src 'self' data:`, `connect-src 'self' https://cloudflareinsights.com`, `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and Trusted Types (below).
- **Scripts:** `script-src 'self' https://static.cloudflareinsights.com` and one hash, the theme script's (`src/scripts/theme-init.js`, written into every page by `Base.astro`). No `'unsafe-inline'`: an inline script runs only by its hash. The header is the only place the hash is written, so `Base.astro` passes the script through `inlineScript()` (`src/lib/csp.ts`): when the file and the header part ways the build stops and prints the hash to put in.
- **Styles:** `style-src-elem 'self' 'unsafe-inline'` (and the same in `style-src`, for a browser without `-elem`), `style-src-attr 'none'`. An inline `<style>` is allowed, because each page carries its CSS inside it and a hash for that would change with every page and edit; a `style=""` attribute is still refused.
- **Why a header, and not Astro's `security.csp`:** Astro writes its policy into each page as a `<meta>`, and with a `<meta>` policy Chrome read and laid out the whole page before painting any of it. That shows when the page is there all at once, a return visit or a fast line (Home's first paint on a 4x slowed CPU: about 260 ms with the `<meta>` and 180 ms with the header on this machine, and live about 230 ms against 200 ms after a return visit's response; November 22, 2026). A first visit over a real line showed no change: the page arrives in pieces and paints as it comes either way. Astro sends its policy as a header only through the Vercel and Netlify adapters (`staticHeaders`). What that cost: Astro's per-page style hashes. If the Cloudflare adapter gains `staticHeaders`, the hashes can come back.

- `default-src 'none'`: a kind of file the policy doesn't name (a frame, video, worker, web manifest) is refused, even from the site itself. A new kind needs its own directive.
- The one inline script marks the page as script-enabled and applies the saved theme and motion choice before paint.
- No element carries `style=""`: the policy refuses it. Scripts set styles with `el.style.x = …`.
- A small bundled `<script>` is one Astro writes into the page by itself, and the header would refuse it: page scripts stay in the one file (`src/scripts/site.js`).
- The policy is off in `npm run dev`. To check it: `npm run build`, `npm run serve`, and read the console.
- A new outside host (fonts, analytics, a form service) means a CSP change. Forms with Turnstile will need `challenges.cloudflare.com` in `script-src` and `frame-src`.

### Trusted Types

The header allows one policy, `uplink`, created in `src/scripts/core.js`. Every HTML write goes through its `html()` helper. The policy doesn't clean HTML: callers pass only the site's own icons and drawings (files the drawing tools write), and words a visitor typed are set with `textContent`.

### Other headers

`public/_headers` sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin` (`og.png` is `cross-origin`).

- Not sent on purpose: `X-Permitted-Cross-Domain-Policies` (only Flash and Acrobat read it) and `Cross-Origin-Embedder-Policy` (it could block an outside script added later, such as analytics).

### No reports from browsers

The site has no address that takes input, and no script of ours reports from a visitor's browser (removed November 16, 2026). The CSP has no `report-to` or `report-uri`: a block still happens, it just isn't sent anywhere. Script errors and CSP blocks are found by looking, in browsers on our own machines (the `check` skill). At launch, Cloudflare's client-side security watches which scripts the pages run, with its own report-only header and Cloudflare's endpoint (`release.md`, "Before launch").

### Supply chain

Actions pinned to commits, and GitHub refuses one that isn't pinned or isn't GitHub's own (repository settings, November 17, 2026). zizmor on every run. Dependabot monthly (`.github/dependabot.yml`), with its alerts and security fixes on. `requirements.txt` pins the drawing tools, fonts self-hosted. A new third-party script is a security and privacy decision.

## Privacy

- **No cookies, no tracking.** Settings (theme, motion, pause) stay in the browser's own storage. There's no consent banner.
- **What the site logs:** nothing of ours. No Worker script runs, so there is no error log; Cloudflare serves the files and keeps its own visit details, as the privacy page says.
- **Keep the privacy page true.** A change that starts collecting something, or adds a processor, updates `src/content/en/privacy.md` in the same commit.

## Secrets

Keep secrets in GitHub environments, Worker secrets, or `.dev.vars` (ignored by git). Never put one in the repository, a page, a pull request, or a chat. When you add or move a secret, update this table in the same commit.

| Name | What it does | Where it's kept | Used by | How to change it |
| --- | --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Deploys the Worker and uploads previews. An account token, "uplink-site deploy (GitHub)", with only "Workers Scripts: Edit" (made November 13, 2026; a copy in the owner's 1Password). | GitHub > Settings > Environments > `cloudflare` | `site.yml` (deploy, preview) | Cloudflare > Manage account > Account API tokens: make a new one, save it in 1Password, paste it in, run a deploy, then delete the old one. |
| `CLOUDFLARE_ACCOUNT_ID` | Which Cloudflare account. Not secret. | The same environment | The same jobs | Only if the site moves account. |
| Your sign-ins | The GitHub and Cloudflare accounts that own the repository and Worker. | Your password manager, with 2FA | Everything | Move to a company account with 2FA (`notes.md`). |

Planned, with the forms in [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38) (open, paused):

| Name | What it will do | Where it will be kept |
| --- | --- | --- |
| `TURNSTILE_SECRET` | Checks the forms' bot test (widget "uplink-site forms"). | Worker secret (`npx wrangler secret put TURNSTILE_SECRET`); `.dev.vars` holds Cloudflare's always-pass test secret. |
| `FORM_TO` | The inbox the forms send to. | Worker secret |
| `FORM_FROM` | The sending address, on a domain on Cloudflare. | Worker variable |
| `EMAIL` binding | Cloudflare Email Service. Not a secret. | `wrangler.jsonc` |

Not secrets: `GH_TOKEN` in CI is GitHub's short-lived token for the run. The placeholder inboxes (`privacy@`, `accessibility@`, `security@uplinkit.ca`) are under `inboxes` in `src/content/en/footer.json`.

> **Note:** The environments `production` (deploys from `main` only) and `preview` exist but are empty. The Cloudflare secrets move there, with a separate preview token (`notes.md`).

If a secret may have leaked: make a new one, delete the old one, note it in the table.

## Review checklist

`curl -sI` for HSTS and the other headers; Observatory A+; CSP Evaluator with no high findings; no CSP violations in the console (one that isn't the site's: when Playwright takes a screenshot in WebKit it adds a `<style>` of its own, and the console says "Refused to apply a stylesheet", `style-src-elem` on the document; it comes only with the screenshot, seen November 17, 2026); `document.body.innerHTML = 'x'` is blocked; SSL Labs A; no cookies; `security.txt` unexpired; the privacy page matches what is collected.
