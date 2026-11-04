# Secrets and keys

Every secret, key and token the site uses: what it's for, where it's kept, and what to do when it changes. **No values
here, ever.** Gathered 3 Nov 2026 from README, notes, CI, the tools and the forms PR (#38); when a secret is added or
moved, change this page in the same PR.

Rotation (new values on a schedule, and who owns each) is still to do: `notes.md`, "Production readiness".

## In use now

| Name | What it does | Where it's kept | Used by | To change it |
| --- | --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Lets CI deploy the Worker and upload PR previews. Needs "Workers Scripts: Edit". | GitHub > repo Settings > Environments > `cloudflare` | `.github/workflows/site.yml` (deploy, preview) | Make a new token in Cloudflare (My Profile > API Tokens), paste it into the environment, delete the old token. |
| `CLOUDFLARE_ACCOUNT_ID` | Which Cloudflare account CI deploys to. Not secret, but kept beside the token. | Same environment | Same jobs | Only if the site moves accounts. |
| `PSI_API_KEY` | Google PageSpeed Insights, for `tools/pagespeed.py`. | `.dev.vars` on your PC (gitignored). Google Cloud project `uplink-site`, key `pagespeed-gate`. | `tools/pagespeed.py` | New key in Google Cloud > Credentials; restrict it to the PageSpeed API. |
| Web Analytics token | Tells Cloudflare which site the beacon reports for. **Public by design**, in the page. | `BEACON_TOKEN` in `src/scripts/core.js` | Every page | Cloudflare > Web Analytics > the site > Manage site. It's registered for the old `pages.dev` host (`notes.md`). |
| Your own logins | GitHub and Cloudflare accounts that own the repo and the Worker. | Your password manager, with 2FA | Everything | `notes.md`: move to a company account with 2FA. |

## Not in use yet

| Name | What it will do | Where it will be kept | Set up in |
| --- | --- | --- | --- |
| `TURNSTILE_SECRET` | Checks the forms' bot test (Turnstile widget "uplink-site forms"). | Worker secret: `npx wrangler secret put TURNSTILE_SECRET`. Locally, `.dev.vars` holds Cloudflare's always-pass test secret. | PR #38 |
| `FORM_TO` | The inbox the forms send to. | Worker secret | PR #38 |
| `FORM_FROM` | The address forms send from (a domain on Cloudflare). | Worker variable | PR #38, once the domain is on Cloudflare |
| `EMAIL` binding | Cloudflare Email Service, which sends the form emails. Not a secret: a binding in `wrangler.jsonc`. | `wrangler.jsonc` | PR #38 |
| `SITE_PASSWORD` | The optional password lock for the whole site. Off. | Worker secret | `tools/site-lock/worker.js` |

## Not secrets, but often mistaken for them

- `GH_TOKEN` in CI is GitHub's own short-lived token for the run. Nothing to store or rotate.
- The placeholder inboxes (`privacy@`, `accessibility@`, `security@uplinkit.ca`) are in `src/data/footer.json` under `inboxes`. They become real with the real domain.

## Rules

- Secrets live in GitHub environments, Worker secrets or `.dev.vars`. Never in the repo, a page, a PR or a chat.
- `.dev.vars` is gitignored; keep it that way.
- A secret that may have leaked (pasted somewhere, committed by mistake): make a new one first, then delete the old one, then note it here.
