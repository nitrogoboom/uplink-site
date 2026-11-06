# Home page: what a screen reader hears

*Recorded November 5, 2026, from the built site.*

This page records what a screen reader gets from the Home page, in order, at desktop and phone size. Use it to check that a change to Home still reads well, and as the reference for the listen in the [release checklist](sop.md#c-by-hand-15-minutes).

The read-out comes from Chromium's accessibility tree, which is what NVDA, JAWS, VoiceOver, and TalkBack read. It was taken at desktop size (1440×900) and phone size (390×844), with script on and the Grow section not yet started. Each screen reader words things a little differently. For example, VoiceOver says "link, Services" where NVDA says "Services, link". But the order and the words are these.

In the read-out, a "." is a short pause and a "," is a shorter one. Both come from the site's `<Pause />` and `<Sep />` components.

## How visitors move through the page

A screen-reader user moves line by line (arrow keys, or swiping on a phone), or jumps by landmark, heading, or link. Home has these landmarks:

| Landmark | Name | Where |
| --- | --- | --- |
| Banner | — | The header |
| Navigation | "Main" | The header tabs (desktop) |
| Main | — | The page content |
| Region | Each section's heading | The five sections |
| Content info | "Site footer" | The footer |
| Navigation | "Legal" | The footer's base bar |
| Navigation | "Main (bottom bar)" | The tab bar (phone) |

The headings are one H1, four H2 sections plus the footer's H2, and H3 for the Grow card and the open footer panel.

## Desktop, top to bottom

### Before the page

1. Link: "Skip to content". It jumps to the main content.

### Header

2. Link: "Uplink Technology management, home page".
3. Navigation "Main", a list of 5 links: "Home" (current page), "Services", "Our work", "About", "Contact".
4. Link: "Get support, for existing clients".
5. Link: "Client portal, sign in".
6. Button: "Accessibility settings", has pop-up dialog. It opens Settings: text size and keyboard shortcuts.

### Your IT team, always online

7. "Managed IT, Ontario".
8. Heading level 1: "Your IT team, always online".
9. "We run the technology behind your business: help desk, security, cloud, network and phones. You run the business."
10. Link: "Get started", has pop-up dialog.
11. "Free check-up. No contract to look."
12. "Services", then a list "Services" of 4 links:
    - "Managed help desk. Real people who pick up and fix it, by phone, email or chat."
    - "Cybersecurity. Devices, email and accounts watched around the clock."
    - "Backup & recovery. Offsite copies, tested every quarter so a restore works."
    - "All services. Help desk, security, cloud, networks, phones"
13. Image: "Drawing of an office being set up: desks, a server rack, Wi-Fi and a cloud workspace for Microsoft 365 and Google Workspace".
14. Button: "Pause animations", not pressed.
15. Link, has pop-up dialog: "IT and security check-up. Free. 30 minutes. We look first, then quote."
16. Link: "Windows 10 support has ended. Guide. Your upgrade plan, step by step".

### Everything your office runs on

17. "What we run".
18. Heading level 2: "Everything your office runs on".
19. Link: "See all services".
20. List "Services", 7 links:
    - "Managed help desk. Real people who pick up and fix it, by phone, email or chat."
    - "Cybersecurity. Devices, email and accounts watched around the clock."
    - "Backup & recovery. Offsite copies, tested every quarter so a restore works."
    - "Cloud workspace. Microsoft 365 or Google Workspace, set up properly and licensed right."
    - "Networks & Wi-Fi. Firewalls and Wi-Fi that reach every corner of the office."
    - "Phones & Teams calling. Your numbers on desk phones, laptops and mobiles."
    - "All services"

### We grow with you

21. "Built to scale".
22. Heading level 2: "We grow with you".
23. "As your team spreads out, here's what to watch, and what we take care of."
24. Image: "A business that grows: the office, a home, a car and café, a second office, the cloud over it all, and a dome that protects it".
25. Button: "Play". While the story plays, it's "Pause"; at the end, "Play again".
26. Group "Where your people work": button "Previous place" (dimmed on the first step), six buttons "1 of 6: Your office" to "6 of 6: Covered" (the current one is pressed), and button "Next place".
27. The current step's card, a list of 1:
    - Heading level 3: "Everyone in one place".
    - "Watch for". "Laptops set up by hand, no backups, no one to call when it breaks."
    - "We handle". "Every device set up the same way, Microsoft 365 backed up, one help desk number."

    Moving to another step changes the card's words. Only the current step's card is read.

### Setups we built and still run

28. "Our work".
29. Heading level 2: "Setups we built and still run".
30. Link: "See all work".
31. A list of 3 links:
    - "Office move in a weekend. Professional services firm, 40 staff"
    - "Phishing lockdown. Law office, 18 staff"
    - "Clinic network refresh. Health clinic, 2 locations"

### Start with a free check-up

32. Heading level 2: "Start with a free check-up".
33. "Thirty minutes, no contract. We show you what we find and what we would fix first."
34. Link, has pop-up dialog: "Book a check-up".
35. Link: "1-855-555-0142".

### Footer

36. Heading level 2: "Site footer".
37. Button: "Previous footer section".
38. Tab list "Footer sections", 6 tabs: "Contact. Start here" (selected), "Services. 7 links", "Company. 4 links", "Support. 4 links", "Resources. 4 links", "Follow. 5 channels".
39. Button: "Next footer section".
40. Tab panel "Contact. Start here", the selected tab's panel:
    - "Contact". Heading level 3: "Reach us".
    - "Call, email or drop by. The help desk is open 7 am to 7 pm ET, Monday to Friday."
    - "Call or email". Links: "1-855-555-0142", "hello@uplinkit.ca".
    - "Office". "Toronto, 100 King St W, Suite 4200". "7 am to 7 pm ET, Monday to Friday".
    - "Follow", a list of 5 links: "LinkedIn", "YouTube", "Facebook", "Instagram", "X".
41. Image: "Map of the Uplink campus. The spot for the footer section you pick is lit up." The map loads when the footer scrolls near, so it's read only after that.
42. Button: "Pause animations", not pressed.
43. "Uplink, © 2026 Uplink Technology Inc."
44. Navigation "Legal": links "Privacy", "Terms", "Accessibility".
45. "All systems normal, Help desk open 7 am to 7 pm ET".

## Phone: what's different

On a phone, the order is the same, with these differences:

- **Header:** no "Main" navigation. The page tabs move to the bottom bar, read last.
- **Hero:** no "Managed IT, Ontario" line and no four-link services list. The lead is shorter: "We run your IT: help desk, security, cloud, network and phones."
- **Footer:** no tabs, no map, and no map pause button. The footer is six buttons that open in place: "Contact. Start here", "Services. 7 links", "Company. 4 links", "Support. 4 links", "Resources. 4 links", and "Follow. 5 channels". Each button says whether it's open or closed (`aria-expanded`), and an open one reads its links next.
- **Bottom bar:** after the footer, navigation "Main (bottom bar)", a list of 5 links: "Home" (current page), "Services", "Work", "About", "Contact".

## What's never read

These parts are hidden from screen readers on purpose, because they repeat words that are read elsewhere or are only decoration:

- The moving dashes in the hero drawing, and the captions over it on phones.
- The Grow section's tags on the drawing ("Watch for" and "We handle" are in the card instead).
- The labels inside the hero drawing and the footer map. Each is read as one picture.
- The dot in " · " separators, which is read as a comma.

## How the drawings stay one picture

The hero (on desktop, tablet, and phone) and the footer map are put into the page as inline SVG, so their parts could join the accessibility tree. Each one is marked as a single image, `role="img"` with a name, and keeps its parts out of the tree:

- **The hero:** `tools/gen_office.py` wraps the drawing's parts in `<g aria-hidden="true">`. Before November 5, 2026, the desktop and tablet cuts exposed 15 pieces of label text, such as "CLOUD WORKSPACE", which some screen readers could read after the image's name.
- **The footer map:** its words are drawn as shapes, not text, so there's nothing to expose.

If you add a drawing that a script puts into the page, check it the same way: in Chromium's accessibility tree, the image should have a name and no text under it.

## Record it again

Record this page again after any change to Home's headings, landmarks, links, or buttons.

1. Build and serve the site:

   ```bash
   npm run build
   npm run serve
   ```

2. Run the screen-reader part of the release audit:

   ```bash
   npm run release-audit -- --only reader
   ```

   It writes Home's transcript to `out/audit/reader/index.txt`, and fails on a run-on link name or one link name that goes to two pages.

3. Compare the transcript with this page and update the steps that changed.

> **Note:** The audit's virtual screen reader walks the page's markup, not Chromium's accessibility tree. Its transcript also includes text that real screen readers skip: the CSS inside the hero drawing, the hero's no-script fallback as raw HTML, and the drawing's labels. Write this page from what a screen reader actually gets, and check doubtful parts with a real one.
