# Site checks

The checks that open the site in a browser or ask a deployed site: Node, in `checks/`, run through npm. Which check to run for which change is in CLAUDE.md, "Checking a change".

## Site checks

Each is a Playwright Test spec in `checks/`, which `scripts/check.mjs` runs for npm. Start `npm run serve` first.

- Pass a check's arguments after `--`: `npm run verify -- --all`.
- To check another address than http://localhost:8787, add `--base URL`.
- Playwright's own options go after a second `--`: `npm run verify -- --all -- --headed`.

Each check exits with status 1 on any finding, and leaves its details in `out/test-results/`. Every check takes its pages from the build: each `.html` file in `dist/` (another folder with `--dist DIR`). It fails unless the served `sitemap.xml` lists exactly those pages, apart from `/soon` and the 404 page. So build before you check, and check the build you're serving. The page list and screen sizes are in `checks/lib.mjs` (`pages`, `SIZES`, `MISSING`).

Each test's name says what it holds; read them in the spec files.

- **`npm run verify [-- --all] [--out DIR]`**: the main browser check (`checks/site.spec.mjs`), then the zoom check. Everything runs twice, as is and with the site's pause on. Home runs at phone, tablet, 1440×900 and 3440×1440 (`FOCUS`), every other page at phone size; `--all` gives every page the full check. The axe pass fails on anything serious or critical, or moderate unless `AXE_ALLOW` names the rule and why. A known bug is an expected failure (`KNOWN`). `RELEASE=1` adds the checks that expect today's exact copy. Screenshots go to `out/`.
- **`npm run verify:zoom [-- --all]`**: text at 200% and 400% browser zoom and at 20, 24 and 32 px default fonts (WCAG 1.4.4, 1.4.10; `checks/zoom.spec.mjs`). It fails if text doesn't grow, is clipped, overlapped, or out of reach, if the page scrolls sideways, or if a heading or stat number gets smaller on screen from one zoom step to the next.
- **`npm run verify:links [-- --external]`**: every link, picture, script, and preload answers, and every `#section` finds its id. `--external` also checks links to other sites.
- **`npm run verify:spacing [-- PAGE …]`**: every margin, padding, and gap on screen is a step of the spacing scale ([`design.md`](design.md#spacing)).
- **`npm run verify:styles -- BEFORE_URL AFTER_URL [PAGE …]`**: compares every element's computed style at four sizes between two builds. Run it after you move CSS.
- **`npm run visual-diff -- OLD_URL NEW_URL [--strict] [--wide]`**: screenshots every page of both sites at phone, tablet, and desktop, drawings masked, and lists what looks different (`out/visual/`). It never fails unless you add `--strict`; `--wide` adds 1280×720 and 2560×1440.
- **`npm run release-audit [-- --only PARTS] [--html-all]`**: the release audit (`checks/audit.spec.mjs`; [`release.md`](release.md)). The report is `out/audit/report.md`.

## Live-site checks

These ask a deployed site over plain HTTP. They need no local server.

| Command | What it checks |
| --- | --- |
| `npm run smoke -- ADDRESS [--launch] [--preview] [--old OLD_ADDRESS]` | Every sitemap page, the security headers, `noindex`, redirects, the 404 page, the Worker's own headers, the report endpoint, `robots.txt`, `llms.txt`, and the Markdown copies (`checks/smoke.spec.mjs`). `--launch` expects `noindex` gone from the pages, and `http://` to redirect. `--preview` checks a version at its own preview address, before it takes traffic. `--old` checks that the old address redirects to the new one. Against `localhost` it leaves out the `http://` redirect and the sitemap's host. |
| `npm run pagespeed -- ADDRESS [--strict] [--min N] [--sample]` | Google PageSpeed Insights on the sitemap's pages, phone and desktop. It reports whether Home scores 100 in all four categories; `--strict` holds every page to that. Needs `PSI_API_KEY` in `.dev.vars` or the environment ([`security.md`](security.md#secrets)). |
