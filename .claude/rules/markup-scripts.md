---
paths:
  - "src/**/*.astro"
  - "src/scripts/**"
  - "src/lib/**"
  - "public/_headers"
  - "scripts/headers.mjs"
  - "worker/**"
---

# Markup and scripts

- Links are root-relative: `/services`, `/contact#message`.
- A page's own script goes inside `<Base>`: `<Fragment slot="scripts"><script>import '../scripts/x.js'</script></Fragment>`. Every page script imports `core.js`.
- Icons: `<Icon name="…" />`.
- HTML written by a script goes through `html()` from `core.js` (Trusted Types).
- JavaScript in `src/` is type-checked (`checkJs`): JSDoc types on parameters and lookups (`src/README.md`, "Scripts"). Mark a promise you don't wait for with `void`.
- Styles from script: `el.style.x = …`. Markup carries classes only; the CSP has no `'unsafe-inline'` and the build fails on a `style=""` attribute.
- `public/_headers` is a template; `scripts/headers.mjs` fills in the hashes and Early Hints at build. Never paste a hash.
- A link whose visible parts sit in separate boxes gets `<Pause />` between them. Inside a sideways-scrolling row, a `<Pause />`'s box needs `position: relative`.
- The Worker (`worker/index.js`) runs only for `/api/*`, `/404` and addresses with no file; every other request is a static file (README, "The Worker").
