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
- Styles from script: `el.style.x = …`. Markup carries classes only: the CSP refuses a `style=""` attribute (`style-src-attr 'none'`), so it does nothing in the built site.
- The Content Security Policy is one header in `public/_headers`, written by hand and shipped as written (`docs/security.md`); Astro's `security.csp` is off. An inline `<style>` is allowed. An inline `<script is:inline>` runs only by its hash in that header: pass its text through `inlineScript()` (`src/lib/csp.ts`), and the build stops with the hash to put in when the header lacks it. A new outside host goes in the header too. The CSP is off in `npm run dev`: check it with `npm run build`, `npm run serve`.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. Inside a sideways-scrolling row, a `<Pause />`'s box needs `position: relative`.
- The site is static files only: no Worker script, no `/api/` address, and nothing sent from a visitor's browser except Cloudflare Web Analytics (`src/scripts/analytics.js`) and, when a page fails to load, the browser's own error report to Cloudflare (Network Error Logging, a setting on the zone: `docs/ops.md`, "Domain"; the privacy page says so). Another endpoint or beacon is the owner's decision (`docs/ops.md`, "When the forms send").
- Nothing changes `dist/` after `astro build`. A new need there is an Astro or Cloudflare setting first (`docs/ops.md`).
