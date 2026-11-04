# Home page: what a screen reader hears

Read out from the built page in Chromium's accessibility tree, at desktop (1440 × 900) and phone (390 × 844), 2 Nov 2026, after the wording pass. This is what NVDA, VoiceOver or TalkBack get to read. Each tool words it a little differently (VoiceOver says "link, Services", NVDA says "Services, link"), but the order and the words are these. A "." below is a short pause; "," a shorter one.

How a visitor moves: line by line (arrow keys or swipe), or jumping by landmark, heading or link. The landmarks on Home are: banner (header), main, the five sections, the footer and, on phones, the bottom bar.

## Desktop, top to bottom

**Before the page**
1. Link: "Skip to content". Jumps straight to the main content.

**Header**
2. Link: "Uplink Technology management, home page".
3. Navigation "Main", list of 5: "Home" (current page), "Services", "Our work", "About", "Contact".
4. Link: "Get support, for existing clients".
5. Link: "Client portal, sign in".

**Main content**

*Your IT team, always online*
6. "Managed IT, Ontario".
7. Heading level 1: "Your IT team, always online".
8. "We run the technology behind your business: help desk, security, cloud, network and phones. You run the business."
9. Link, has pop-up dialog: "Get started".
10. "Free check-up. No contract to look."
11. "Services", list of 4 links (a plain list since 3 Nov 2026, not a second navigation):
    - "Managed help desk. Real people who pick up and fix it, by phone, email or chat."
    - "Cybersecurity. Devices, email and accounts watched around the clock."
    - "Backup & recovery. Offsite copies, tested every quarter so a restore works."
    - "All services. Help desk, security, cloud, networks, phones"
12. Image: "Drawing of an office being set up: desks, a server rack, Wi-Fi and a cloud workspace for Microsoft 365 and Google Workspace". The moving captions inside it are never read out.
13. Link, has pop-up dialog: "IT and security check-up. Free. 30 minutes. We look first, then quote."
14. Link: "Windows 10 support has ended. Guide. Your upgrade plan, step by step".

*Everything your office runs on*
15. "What we run".
16. Heading level 2: "Everything your office runs on".
17. Link: "See all services".
18. List "Services", 7 links:
    - "Managed help desk. Real people who pick up and fix it, by phone, email or chat."
    - "Cybersecurity. Devices, email and accounts watched around the clock."
    - "Backup & recovery. Offsite copies, tested every quarter so a restore works."
    - "Cloud workspace. Microsoft 365 or Google Workspace, set up properly and licensed right."
    - "Networks & Wi-Fi. Firewalls and Wi-Fi that reach every corner of the office."
    - "Phones & Teams calling. Your numbers on desk phones, laptops and mobiles."
    - "All services"

*We grow with you*
19. "Built to scale".
20. Heading level 2: "We grow with you".
21. "As your team spreads out, here's what to watch, and what we take care of."
22. Image: the world drawing ("A business that grows: the office, a home, a car and café, a second office, the cloud over it all, and a dome that protects it"), then the "Pause" button (it becomes "Play" and "Play again").
23. Group "Where your people work": "Previous place", six buttons "1 of 6: Your office" to "6 of 6: Covered" (the open one pressed), "Next place".
24. The open step's card (a list of one; without script, all six): heading level 3 (for example "Some people work from home"), "Watch for" and its sentence, "We handle" and its sentence. (Written 4 Nov 2026 from the markup, not yet heard in a screen reader.)

*Setups we built and still run*
24. "Our work".
25. Heading level 2: "Setups we built and still run".
26. Link: "See all work".
27. List of 3 links:
    - "Office move in a weekend. Professional services firm, 40 staff"
    - "Phishing lockdown. Law office, 18 staff"
    - "Clinic network refresh. Health clinic, 2 locations"

*Start with a free check-up*
28. Heading level 2: "Start with a free check-up".
29. "Thirty minutes, no contract. We show you what we find and what we would fix first."
30. Link, has pop-up dialog: "Book a check-up".
31. Link: "1-855-555-0142" (starts a call).

**Footer ("Site footer")**
32. Heading level 2: "Site footer" (only screen readers get this one).
33. Tab panel "Contact, Start here": "Contact", heading "Reach us", "Call, email or drop by. The help desk is open 7 am to 7 pm ET, Monday to Friday.", "Call or email", links "1-855-555-0142" and "hello@uplinkit.ca", "Office", "Toronto 100 King St W, Suite 4200", "7 am to 7 pm ET Monday to Friday", "Follow", 5 links: "LinkedIn", "YouTube", "Facebook", "Instagram", "X".
34. Image: "Map of the Uplink campus. The spot for the footer section you pick is lit up." (Built once the footer comes near the screen; screen readers find it the same.)
35. "Uplink HQ one team, one number".
36. Button: "Previous footer section".
37. Tab list "Footer sections", 6 tabs: "Contact, Start here" (selected), "Services, 7 links", "Company, 4 links", "Support, 4 links", "Resources, 4 links", "Follow, 5 channels". Arrow keys move between them.
38. Button: "Next footer section".
39. "Uplink © 2026 Uplink Technology Inc."
40. Navigation "Legal": "Privacy", "Terms", "Accessibility".
41. Button, has pop-up dialog: "Keyboard shortcuts".
42. "All systems normal, Help desk open 7 am to 7 pm ET".

## Phone: what changes

- **Header:** the logo link has the same name; the top tabs are gone (the bottom bar takes their place). The two header buttons keep their full names.
- **Hero:** no "Managed IT, Ontario" line and no "Services" list. The short line is read instead: "We run your IT: help desk, security, cloud, network and phones." The picture is described the same way.
- **Services and Our work:** the same links, read the same way. The "Swipe" hint and dots are not read.
- **We grow with you:** the same as desktop.
- **Footer:** no "Previous" and "Next footer section" buttons; the tabs still work.
- **At the very end:** navigation "Main (bottom bar)", 5 links: "Home" (current page), "Services", "Work", "About", "Contact".

## What changed in the wording pass (2 Nov 2026)

- Cards start with their title and pause before the description. The category tags ("Support", "Build") are no longer read; the title says it. "Free" and "Guide" are read after the title.
- The "·" separators are read as a pause, not "dot".
- Plainer names: "home page", "for existing clients", "sign in", "Keyboard shortcuts" without the "?".
- Pictures are described in plain words.
- Links that open a pop-up say so.
- Each link's spoken name is still its own visible words, so voice control ("click Managed help desk") works and the axe check passes.

## Still open

- **The other pages** get the same pass later (`notes.md`).
