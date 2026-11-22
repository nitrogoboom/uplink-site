---
paths:
  - "src/**/*.astro"
  - "src/scripts/**"
  - "src/lib/**"
  - "public/_headers"
  - "astro.config.mjs"
  - "wrangler.jsonc"
---

# Markup and scripts

- Links are root-relative and go through `to()` (`linker()` in `src/lib/i18n.ts`): `href={to('/services')}`, `href={to('/contact#message')}`. Files (`/assets/…`, `/favicon.ico`) are written as they are.
- The site has one script file: `src/scripts/site.js` imports every part, and `Base.astro` holds the only `<script>`, so a page makes one script request with nothing chained behind it. A new page script is imported there and starts only where its elements are (`if (form) { … }`); it reads its words when it runs, never at the top of the file. A page hands its script's words over with `<Fragment slot="scripts"><Words id="words-page" … /></Fragment>`.
- Icons: `<Icon name="…" />`.
- HTML written by a script goes through `html()` from `core.js` (Trusted Types).
- JavaScript in `src/` is type-checked (`checkJs`): JSDoc types on parameters and lookups (`src/README.md`, "Scripts"). Mark a promise you don't wait for with `void`.
- Styles from script: `el.style.x = …`. Markup carries classes only: the CSP has no `'unsafe-inline'`, so a `style=""` attribute does nothing in the built site.
- The Content Security Policy's script and style hashes are Astro's (`security.csp` in `astro.config.mjs`): it writes them into each page as a `<meta>`. An inline `<script is:inline>` or `<style is:inline>` isn't bundled, so the page adds its hash itself (`src/lib/csp.ts`). Never paste a hash. `public/_headers` ships as written and holds the other headers. The CSP is off in `npm run dev`: check it with `npm run build`, `npm run serve`.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. Inside a sideways-scrolling row, a `<Pause />`'s box needs `position: relative`.
- The site is static files only: no Worker script, no `/api/` address, and nothing sent from a visitor's browser. A new endpoint or beacon is the owner's decision (`docs/ops.md`, "When the forms send").
- Nothing changes `dist/` after `astro build`. A new need there is an Astro or Cloudflare setting first (`docs/ops.md`).
