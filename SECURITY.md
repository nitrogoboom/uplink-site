# Report a security problem

If you find a security problem with the Uplink Technology website, email **security@uplinkit.ca**. The same address is in the site's [`/.well-known/security.txt`](https://uplink-site.johnoreilly.workers.dev/.well-known/security.txt).

You can also report it privately on GitHub: the repository's **Security** tab > **Report a vulnerability**.

Don't open a public issue for a security problem.

## What to include

- The page or address where you found it.
- What you did.
- What happened.

We reply within two business days and tell you when it's fixed.

## Scope

**In scope:**

- The site's pages.
- Its response headers, such as the CSP and HSTS.
- The `/api/*` endpoints in `worker/index.js`.

**Out of scope:**

- Cloudflare's own systems. Report those to Cloudflare.
- Anything that needs a visitor's device to be compromised first.

> **Note:** The inbox is a placeholder until the site moves to its real domain. See "Before going live" in [`notes.md`](notes.md).
