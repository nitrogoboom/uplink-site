# Site checks

The repo holds one scripted check, the smoke check. Every other check (browsers, phones, accessibility, print, speed) is a look an agent does by hand when the owner asks: the `check` skill.

## The smoke check

`npm run smoke -- ADDRESS [--preview]` (`checks/smoke.spec.mjs`, run by `scripts/check.mjs`). It asks a deployed site over plain HTTP; it opens no browser and needs no local server. The deploy runs it twice, at the new version's own address and at the live one, and rolls back when the live run fails ([ops.md](ops.md#deploys)).

It asks only "is the site up, and still safe?" (draft mode: Home only, owner, November 13, 2026):

1. Home answers `200` as a web page, with every security header, and `noindex` while the site is a draft.
2. `http://` redirects to `https://`, at `/404` (the one place the Worker sees the request before launch).
3. A made-up address gets the site's 404 page, with status `404`.

Flags:

- `--preview` checks a version at its own preview address, before it takes traffic (no `http://` check).
- Against `localhost` it leaves out the `http://` redirect.

The launch-day checks (`--launch`, `--old`) left the code on November 17, 2026 (owner: no launch tests in the scripts until launch). What they checked is a list to write then: [release.md](release.md#launch-checks-to-write).

Keep it to that: a detail you want to keep (a redirect's exact form, a cache rule) is a look, not a smoke-check line.

A change that the smoke check refuses (a header, a redirect, a page it expects) changes `checks/smoke.spec.mjs` in the same commit.
