---
paths:
  - "src/content/**"
  - "src/data/**"
  - "src/content.config.ts"
  - "src/lib/copy.ts"
  - "src/lib/site.ts"
  - "src/lib/footer.ts"
  - "src/lib/placeholders.mjs"
  - "src/**/*.astro"
---

# Content is data

- A service is `src/content/services/SLUG.json`, a project `src/content/projects/SLUG.json`; the slug is the address. The `page` field holds the copy only that item's own page shows. Smaller lists are `src/data/*.json`, kept in file order through `byOrder`.
- Schemas are strict (`src/content.config.ts`; `footer.json`'s in `src/lib/footer.ts`): an unknown key, an icon not in `src/components/icons.ts` or an `image` with no drawing fails the build. Import footer data from `src/lib/footer.ts`, not the JSON; the JSON holds no HTML.
- Every card, footer link, select option, page, sitemap line and JSON-LD block reads from those files. Change words in the data, once.
- Every other word a component, layout or script shows or announces is in `src/data/copy/en/*.yaml`: one file a page, `ui.yaml` for shared UI and screen-reader text. The YAML is the only place a key is written (no schema). Read with `await copy('home')` (`src/lib/copy.ts`; a key the YAML lacks stops the build), fill `{n}` templates with `fill()`. To add a string: add it to the YAML, then use it. A page script gets its words as JSON (`<Words>`, read with `words()` from `core.js`). Type no words into markup or scripts. Details: `src/README.md`, "Content and copy".
- The seven static pages' `<title>` and description are copy too: `title` and `description` at the top of each page's YAML file (privacy's and accessibility's under their keys in `text-pages.yaml`), read with `pageMeta()` from `src/lib/site.ts`. `PAGES` there holds only each page's address and menu name. Home's business description (its JSON-LD) is `business` in `home.yaml`.
- Privacy and accessibility are Markdown in `src/data/`, with contact placeholders (`{privacy}`, `{phone}`, `{street}` …) filled from `src/data/footer.json` at render (`src/lib/placeholders.mjs`); a name with no value fails the build. When the site starts collecting something new or a processor changes, update `src/data/privacy.md` in the same PR.
- Two parts in separate boxes that read as one line get a hidden separator (`<span class="sr-only">, </span>`, or `<Pause />`).
- Copy: short, plain sentences.
