---
name: check
description: Look over the Uplink site by hand and report, when the owner asks for a check - browser compatibility, phones and screen sizes, accessibility, large text and zoom, high contrast, print, links, speed, no script, before and after a change, or a deployed address.
---

# Check the site

A check is a **look**: you open the pages, judge what you see, and report in your reply. It leaves nothing in the repo. The site is a draft that changes daily, so judge whether it works for a visitor, never whether it matches a number someone wrote down earlier.

## Every look

1. **Scope.** Home, unless the owner names pages. Run only the look they asked for.
2. **Serve.** Looks and layout: the `astro` dev server (`.claude/launch.json`). Headers, links, speed, print: `npm run build`, then the `built` server (http://localhost:8787).
3. **Look** at phone (390×844), tablet (820×1180) and desktop (1440×900), in both themes when colour matters. Use the browser tools you have; take screenshots and read them.
4. **Report.** One line per finding: page, size, what is wrong, and how bad (blocks a visitor, looks off, nit). Then one line on what you looked at and what you couldn't (no real iPhone, no screen reader). Fix a finding when the owner says to.

A helper script for one look (a link crawl, say) goes in the scratchpad and is thrown away after.

## The looks

| The owner asks | Do |
|---|---|
| Browser compatibility | List the newer CSS and JS the site leans on (grep `src/` for `:has(`, `@view-transition`, `text-wrap`, `<details name`, `closedby`, `scrollend`, `@container`, anything else recent). For each: which current and year-old Chrome, Edge, Firefox and Safari lack it (MDN), and what the visitor gets without it. Then see the page in Firefox and WebKit: `npx playwright screenshot --browser firefox --viewport-size 390,844 URL FILE.png` (and `webkit`; `npx playwright install firefox webkit` once), and read the pictures. |
| Phones, screen sizes | Each size above, plus 320 wide and 3440×1440. Look for sideways scroll, overlap, clipped or tiny text, tap targets under 24px, anything hidden behind the bottom bar. On Home, also check each section fits the fold at 1440×900, 1280×800 and 1920×1080 (`.claude/rules/css.md`, "Fits the fold"). |
| Accessibility | A Lighthouse accessibility audit if you have one. Then by hand: Tab through the page (focus always visible, order sensible, nothing trapped, Esc closes pop-ups); the accessibility tree (every button and link named, one h1, headings in order, landmarks); contrast in both themes; the page with motion paused. Standard: WCAG 2.2 AA. |
| Large text, zoom | Browser zoom at 200% and 400% (or a 320px-wide window), and a 24px default font. Text grows, nothing is clipped or overlaps, no sideways scroll. |
| High contrast | Emulate forced colours, light and dark. Every control is visible and its on, off and current states can be told apart. |
| Print | Emulate print, or `npx playwright pdf URL FILE.pdf` and read it. Content is all there, nothing is cut mid-card, no screen-only controls. |
| Links | On the built site: every link, picture and script on each sitemap page answers, and every `#section` has its id. |
| Speed | A Lighthouse performance run on the built site at phone size. Report the LCP element and time, layout shift, and page weight. |
| No script | Turn JavaScript off. The page reads, the menu and footer work, links go somewhere. |
| Before and after | Screenshot the same pages at the same sizes from the live site and from local; look at each pair and list what moved. |
| A deployed address | `npm run smoke -- ADDRESS` (`docs/site-checks.md`): headers, redirects, the 404. The one scripted check; the deploy runs it itself. |

Real phones, a real screen reader and Safari on a Mac are the owner's to try: give them the address and a short list of what to look at.
