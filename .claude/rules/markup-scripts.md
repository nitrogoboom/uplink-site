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
- A page's own script goes inside `<Base>`: `<Fragment slot="scripts"><script>import '../scripts/x.js'</script></Fragment>`. Every page script imports `core.js`.
- Icons: `<Icon name="…" />`.
- HTML written by a script goes through `html()` from `core.js` (Trusted Types).
- JavaScript in `src/` is type-checked (`checkJs`): JSDoc types on parameters and lookups (`src/README.md`, "Scripts"). Mark a promise you don't wait for with `void`.
- Styles from script: `el.style.x = …`. Markup carries classes only: the CSP has no `'unsafe-inline'`, so a `style=""` attribute does nothing in the built site.
- The Content Security Policy's script and style hashes are Astro's (`security.csp` in `astro.config.mjs`): it writes them into each page as a `<meta>`. An inline `<script is:inline>` or `<style is:inline>` isn't bundled, so the page adds its hash itself (`src/lib/csp.ts`). Never paste a hash. `public/_headers` ships as written and holds the other headers. The CSP is off in `npm run dev`: check it with `npm run build`, `npm run serve`.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. Inside a sideways-scrolling row, a `<Pause />`'s box needs `position: relative`.
- The site is static files only: no Worker script, no `/api/` address, and nothing sent from a visitor's browser. A new endpoint or beacon is the owner's decision (`docs/ops.md`, "When the forms send").
- Nothing changes `dist/` after `astro build`. A new need there is an Astro or Cloudflare setting first (`docs/ops.md`).
