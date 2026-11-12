# Site checks

The repo holds one scripted check, the smoke check. Every other check (browsers, phones, accessibility, print, speed) is a look an agent does by hand when the owner asks: the `check` skill.

## The smoke check

`npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]` (`checks/smoke.spec.mjs`, run by `scripts/check.mjs`). It asks a deployed site over plain HTTP; it opens no browser and needs no local server. The deploy runs it twice, at the new version's own address and at the live one, and rolls back when the live run fails ([ops.md](ops.md#deploys)).

It checks every sitemap page, the security headers, `noindex`, redirects, the 404 page, the Worker's own headers, the report endpoint, `robots.txt`, `llms.txt`, and the Markdown copies.

- `--launch` expects `noindex` gone from the pages, and `http://` to redirect.
- `--preview` checks a version at its own preview address, before it takes traffic.
- `--old` checks that the old address redirects to the new one.
- Against `localhost` it leaves out the `http://` redirect and the sitemap's host.

A change that the smoke check refuses (a header, a redirect, a page it expects) changes `checks/smoke.spec.mjs` in the same commit.
