# Secrets and keys

*Last updated: November 6, 2026*

This page lists every secret, key, and token the site uses: what it's for, where it's kept, and how to change it. It never holds a value. When you add or move a secret, update this page in the same pull request.

Rotation is still to set up: each secret needs an owner and a date for its next change. See "Production readiness" in [`notes.md`](../notes.md).

## Secrets in use

| Name | What it does | Where it's kept | Used by | How to change it |
| --- | --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Lets CI deploy the Worker and upload pull request previews. Needs the "Workers Scripts: Edit" permission. | GitHub > the repository's Settings > Environments > `cloudflare` | `.github/workflows/site.yml` (the deploy and preview jobs) | In Cloudflare, make a new token (My Profile > API Tokens). Paste it into the environment, then delete the old token. |
| `CLOUDFLARE_ACCOUNT_ID` | Tells CI which Cloudflare account to deploy to. Not secret, but kept beside the token. | The same environment | The same jobs | Only if the site moves to another account. |
| `PSI_API_KEY` | Calls Google PageSpeed Insights. | `.dev.vars` on your computer (ignored by git), or an environment variable. The key is `pagespeed-gate` in the Google Cloud project `uplink-site`. | `checks/pagespeed.spec.mjs` (`npm run pagespeed`) | In Google Cloud > Credentials, make a new key and restrict it to the PageSpeed Insights API. |
| Web Analytics token | Tells Cloudflare which site the analytics beacon reports for. **Public by design:** it's in every page. | `BEACON_TOKEN` in `src/scripts/core.js` | Every page | In Cloudflare > Web Analytics > the site > Manage site. It's registered for the old `pages.dev` host (`notes.md`). |
| Your own sign-ins | The GitHub and Cloudflare accounts that own the repository and the Worker. | Your password manager, with two-factor authentication | Everything | Move them to a company account with two-factor authentication (`notes.md`). |

## Secrets planned but not in use

These come with the forms in [PR #38](https://github.com/nitrogoboom/uplink-site/pull/38), which is open and paused.

| Name | What it will do | Where it will be kept | Set up in |
| --- | --- | --- | --- |
| `TURNSTILE_SECRET` | Checks the forms' bot test (the Turnstile widget "uplink-site forms"). | A Worker secret: `npx wrangler secret put TURNSTILE_SECRET`. Locally, `.dev.vars` holds Cloudflare's always-pass test secret. | PR #38 |
| `FORM_TO` | The inbox the forms send to. | A Worker secret | PR #38 |
| `FORM_FROM` | The address the forms send from, on a domain on Cloudflare. | A Worker variable | PR #38, once the domain is on Cloudflare |
| `EMAIL` binding | Connects Cloudflare Email Service, which sends the form emails. Not a secret. | `wrangler.jsonc` | PR #38 |
| `SITE_PASSWORD` | The password for the optional site-wide lock, which is off. | A Worker secret | `tools/site-lock/worker.js` |

> **Note:** The environments `production` (deploys from `main` only) and `preview` exist but are empty. The Cloudflare secrets move there, with a separate token for previews (`notes.md`).

## Values that aren't secrets

- `GH_TOKEN` in CI is GitHub's own short-lived token for the run. There's nothing to store or rotate.
- The placeholder inboxes (`privacy@`, `accessibility@`, and `security@uplinkit.ca`) are under `inboxes` in `src/data/footer.json`. They become real with the real domain.

## Rules for secrets

- Keep secrets in GitHub environments, Worker secrets, or `.dev.vars`. Never put one in the repository, a page, a pull request, or a chat.
- Keep `.dev.vars` in `.gitignore`.
- If a secret may have leaked, for example pasted somewhere or committed by mistake:
  1. Make a new one.
  2. Delete the old one.
  3. Note the change on this page.
