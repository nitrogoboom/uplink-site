# Ontario Website Accessibility Rules

Nov 3, 2026 · @John

## Who it applies to

Ontario's website rule applies if you have 50+ employees in Ontario. You must meet WCAG 2.0 Level AA on public websites and web apps, for content published after Jan 1, 2012. It can be excused only where meeting it is "not practicable".

With under 50 employees, you have no WCAG duty.

The other duties for 50+ employees (accessibility policy, multi-year plan, feedback process, accessible formats on request) are in `docs/privacy-and-accessibility-2026-11-03.md`, with sources (checked against O. Reg. 191/11, 3 Nov 2026).

## WCAG musts

These are the 36 criteria that apply, in plain words. The numbers match the [WCAG 2.0 standard](https://www.w3.org/TR/WCAG20/). This summary was written from knowledge of the standard and was not checked line by line against it.

### Images and media

- Images have alt text (1.1.1).
- Audio-only and video-only content has a text version (1.2.1).
- Pre-recorded video has captions (1.2.2).
- Pre-recorded video has audio description or a text version (1.2.3).
- Live captions (1.2.4) and the stricter audio description rule (1.2.5) are exempt in Ontario.

### Layout and colour

- Headings, lists, tables and form labels are marked up in the code (1.3.1).
- Reading order makes sense (1.3.2).
- Instructions don't rely only on shape, size or position (1.3.3).
- Colour is not the only way to show meaning (1.4.1).
- Audio that plays by itself can be stopped (1.4.2).
- Text contrast is at least 4.5:1, or 3:1 for large text (1.4.3).
- Text can zoom to 200% and still work (1.4.4).
- Use real text, not pictures of text (1.4.5).

### Keyboard

- Everything works with a keyboard (2.1.1).
- The keyboard never gets stuck (2.1.2).
- Tab order is logical (2.4.3).
- You can see where the keyboard focus is (2.4.7).

### Time and motion

- Time limits can be turned off or extended (2.2.1).
- Moving content can be paused or stopped (2.2.2).
- Nothing flashes more than 3 times a second (2.3.1).

### Navigation

- There's a way to skip repeated menus (2.4.1).
- Every page has a clear title (2.4.2).
- Link text says where the link goes (2.4.4).
- There are at least two ways to find a page, such as a menu and search (2.4.5).
- Headings and labels are clear (2.4.6).

### Language and behaviour

- The page language is set in the code (3.1.1).
- Text in another language is marked (3.1.2).
- Nothing changes unexpectedly on focus or input (3.2.1, 3.2.2).
- Menus and labels stay consistent across pages (3.2.3, 3.2.4).

### Forms

- Errors are shown in text (3.3.1).
- Fields have labels or instructions (3.3.2).
- Error messages suggest a fix (3.3.3).
- Legal or financial submissions can be checked, corrected or reversed (3.3.4).

### Code

- HTML is valid (4.1.1).
- Controls expose their name, role and state to screen readers (4.1.2).

## Screen readers

Ontario's rule doesn't name screen readers or require testing with them. But several criteria above exist so they work, and scanners can't confirm this, so test by hand.

- [NVDA](https://www.nvaccess.org/about-nvda/): free for Windows. Start here, as it's the most used on desktop.
- [VoiceOver](https://www.apple.com/accessibility/vision/): built into Mac and iPhone.
- [Narrator](https://support.microsoft.com/en-us/windows/complete-guide-to-narrator-e4397a0d-ef4f-b386-d8ae-c172f109bdb1): built into Windows.

## Scanning tools

Scanners catch only about a third to just over half of issues.

### Whole site

| Tool | Cost |
| --- | --- |
| [Pope Tech](https://pope.tech/pricing) | Free up to 25 pages, paid from US$25/mo |
| [Accessibility Checker](https://www.accessibilitychecker.org/pricing/) | From $69/mo for 25 pages |
| [SortSite](https://www.powermapper.com/products/sortsite/) | Free trial, price not listed |
| [Silktide](https://silktide.com/pricing/) | Quote only |
| [AudioEye](https://www.audioeye.com/pricing/) | Free scan, plan prices not listed |
| [Siteimprove](https://www.siteimprove.com/platform/accessibility/) | Quote only |
| [axe Monitor](https://www.deque.com/axe/monitor/) | Quote only |

### One page at a time

These are free or have a free version, though not every vendor page confirms it.

- [WAVE](https://wave.webaim.org/extension/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Accessibility Insights](https://accessibilityinsights.io/)
- [ARC Toolkit](https://vispero.com/lp/arc-toolkit/)
- [IBM Equal Access](https://www.ibm.com/able/toolkit/tools/)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/accessibility/scoring) (built into Chrome)

## Sources

- [Ontario IASR, O. Reg. 191/11](https://www.ontario.ca/laws/regulation/110191)
- [Ontario: making websites accessible](https://www.ontario.ca/page/how-make-websites-accessible)
