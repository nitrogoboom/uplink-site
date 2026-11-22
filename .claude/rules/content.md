---
paths:
  - "src/content/**"
  - "src/content.config.ts"
  - "src/lib/copy.ts"
  - "src/lib/i18n.ts"
  - "src/lib/site.ts"
  - "src/lib/footer.ts"
  - "src/lib/placeholders.mjs"
  - "src/**/*.astro"
---

# Content is data

- Everything a visitor reads is in `src/content/<language>/` (`en` today). A service is `en/services/SLUG.json`, a project `en/projects/SLUG.json`; the slug is the address. The `page` field holds the copy only that item's own page shows. Smaller lists are `en/*.json` (`{ "items": [ … ] }`, shown in file order).
- **Languages.** `astro.config.mjs` lists them (`i18n`); `src/lib/i18n.ts` holds the helpers. A component reads words and content with the page's language: `copy('home', Astro.currentLocale)`, `getServices(Astro.currentLocale)`. A link is written as in English and passed through `to()`: `const to = linker(Astro.currentLocale)`, `href={to('/contact#message')}`. A page file lives in `src/pages/[...locale]/` and exports `getStaticPaths = localePaths`. Another language is a folder beside `en/`; what it lacks falls back to English.
- Schemas are strict (`src/content.config.ts`; `footer.json`'s in `src/lib/footer.ts`): an unknown key, an icon not in `src/components/icons.ts` or an `image` with no drawing fails the build. Import footer data from `src/lib/footer.ts` (`footerFor(Astro.currentLocale)` for its words), not the JSON; the JSON holds no HTML.
- Every card, footer link, select option, page, sitemap line and JSON-LD block reads from those files. Change words in the data, once.
- Every other word a component, layout or script shows or announces is in `src/content/en/copy/*.yaml`: one file a page, `ui.yaml` for shared UI and screen-reader text. The YAML is the only place a key is written (no schema). Read with `await copy('home', Astro.currentLocale)` (`src/lib/copy.ts`; a key the YAML lacks stops the build), fill `{n}` templates with `fill()`. To add a string: add it to the YAML, then use it. A page script gets its words as JSON (`<Words>`, read with `words()` from `core.js`). Type no words into markup or scripts. Details: `src/README.md`, "Content and copy".
- The seven static pages' `<title>` and description are copy too: `title` and `description` at the top of each page's YAML file (privacy's and accessibility's under their keys in `text-pages.yaml`), read with `pageMeta()` from `src/lib/site.ts`. `PAGES` there holds only each page's address; its name is `pages` in `ui.yaml` (`pageName()`). Home's business description (its JSON-LD) is `business` in `home.yaml`.
- Privacy and accessibility are Markdown in `src/content/en/`, with contact placeholders (`{privacy}`, `{phone}`, `{street}` …) filled from `footer.json` at render (`src/lib/placeholders.mjs`); a name with no value fails the build. When the site starts collecting something new or a processor changes, update `privacy.md` in the same commit.
- Two parts in separate boxes that read as one line get a hidden separator (`<span class="sr-only">, </span>`, or `<Pause />`).
- Copy: short, plain sentences.
