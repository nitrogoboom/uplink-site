# Site checks

The repo holds one scripted check, the smoke check. Every other check (browsers, phones, accessibility, print, speed) is a look an agent does by hand when the owner asks: the `check` skill.

## The smoke check

`npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]` (`checks/smoke.spec.mjs`, run by `scripts/check.mjs`). It asks a deployed site over plain HTTP; it opens no browser and needs no local server. The deploy runs it twice, at the new version's own address and at the live one, and rolls back when the live run fails ([ops.md](ops.md#deploys)).

It asks only "is the site up, and still safe?" (draft mode: Home only, owner, November 13, 2026):

1. Home answers `200` as a web page, with every security header, and `noindex` while the site is a draft.
2. `http://` redirects to `https://`.
3. A made-up address gets the site's 404 page, with status `404`.

Flags:

- `--launch` expects `noindex` gone, and checks the `http://` redirect on Home too.
- `--preview` checks a version at its own preview address, before it takes traffic (no `http://` check).
- `--old` checks that the old address redirects to the new one (launch day).
- Against `localhost` it leaves out the `http://` redirect.

Keep it to that: a detail you want to keep (a redirect's exact form, a cache rule) is a look, not a smoke-check line.

A change that the smoke check refuses (a header, a redirect, a page it expects) changes `checks/smoke.spec.mjs` in the same commit.
