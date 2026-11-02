# Home page: what a screen reader hears

Read out from the built page (with the Services fixes) in Chromium's accessibility tree, at desktop (1440 × 900) and phone (390 × 844), 2 Nov 2026. This is what NVDA, VoiceOver or TalkBack get to read. Each tool words it a little differently (VoiceOver says "link, Services", NVDA says "Services, link"), but the order and the words are these.

How a visitor moves: line by line (arrow keys or swipe), or jumping by landmark, heading or link. The landmarks on Home are: banner (header), main, the five sections, the footer and, on phones, the bottom bar.

## Desktop, top to bottom

**Before the page**
1. Link: "Skip to content". Jumps straight to the main content.

**Header (banner)**
2. Link: "Uplink Technology management, home".
3. Navigation "Main", list of 5: links "Home" (current page), "Services", "Our work", "About", "Contact".
4. Link: "Get support (existing clients)".
5. Link: "Client portal sign in".

**Main content**

*Section "Your IT team, always online"*
6. "Managed IT · Ontario".
7. Heading level 1: "Your IT team, always online".
8. "We run the technology behind your business: help desk, security, cloud, network and phones. You run the business."
9. Link: "Get started". Opens the book-a-check-up pop-up.
10. "Free check-up. No contract to look."
11. Navigation "Main menu", list of 4 links:
    - "Services, Help desk, security, cloud, networks, phones"
    - "Our work, Setups we built and still run"
    - "About, The people behind the screen"
    - "Contact, Talk to a real person"
12. Image: "Animated isometric office floor plan assembling itself: desks, server racks, Wi-Fi and a cloud workspace hub for Microsoft 365 and Google Workspace". The moving labels inside it are not read. The image is one picture with one description, so its changing captions never interrupt.
13. Link: "Free IT and security check-up, 30 minutes. We look first, then quote."
14. Link: "Guide, Windows 10 support has ended, Your upgrade plan, step by step".

*Section "Everything your office runs on"*
15. "What we run".
16. Heading level 2: "Everything your office runs on".
17. Link: "See all services".
18. List "Services", 7 links:
    - "Support, Managed help desk, Real people who pick up and fix it, by phone, email or chat."
    - "Protect, Cybersecurity, Devices, email and accounts watched around the clock."
    - "Protect, Backup & recovery, Offsite copies, tested every quarter so a restore works."
    - "Cloud workspace, Microsoft 365 or Google Workspace, set up properly and licensed right."
    - "Networks & Wi-Fi, Firewalls and Wi-Fi that reach every corner of the office."
    - "Phones & Teams calling, Your numbers on desk phones, laptops and mobiles."
    - "All services"

*Section "We grow with you"*
19. "Built to scale".
20. Heading level 2: "We grow with you".
21. "Start with the basics and add more as your team grows. Same people, same help desk, the whole way."
22. Image: "Isometric office that grows from one to three storeys, then gains remote staff, a second office and a cloud".
23. List of 3 levels, each:
    - "Level 1 · 1 to 10 people", heading level 3 "Get set up right", its paragraph, then a list of 3: "Help desk for every person", "Microsoft 365 or Google set up and backed up", "Devices patched and monitored".
    - "Level 2 · 11 to 50 people", heading level 3 "Lock it down", its paragraph, list: "24/7 threat monitoring", "Email and phishing defence", "Staff security training".
    - "Level 3 · 51 to 150 people", heading level 3 "Plan ahead", its paragraph, list: "Multi-site networks", "Quarterly IT reviews", "Yearly roadmap and budget".

*Section "Setups we built and still run"*
24. "Our work".
25. Heading level 2: "Setups we built and still run".
26. Link: "See all work".
27. List of 3 links:
    - "Build, Office move in a weekend, Professional services firm · 40 staff"
    - "Protect, Phishing lockdown, Law office · 18 staff"
    - "Build, Clinic network refresh, Health clinic · 2 locations"

*Section "Start with a free check-up"*
28. Heading level 2: "Start with a free check-up".
29. "Thirty minutes, no contract. We show you what we find and what we would fix first."
30. Link: "Book a check-up".
31. Link: "1-855-555-0142" (starts a call).

**Footer ("Site footer")**
32. Heading level 2: "Site footer" (only screen readers get this one).
33. Tab panel "Contact, Start here":
    - "Contact", heading level 2 "Reach us".
    - "Call, email or drop by. The help desk is open 7 am to 7 pm ET, Monday to Friday."
    - "Call or email", link "1-855-555-0142", link "hello@uplinkit.ca".
    - "Office", "Toronto 100 King St W, Suite 4200", "7 am to 7 pm ET Monday to Friday".
    - "Follow", list of 5 links: "LinkedIn", "YouTube", "Facebook", "Instagram", "X".
34. Image: "Map of the Uplink campus. The spot for the footer section you pick is lit up."
35. "Uplink HQ one team, one number".
36. Button: "Previous footer section".
37. Tab list "Footer sections", 6 tabs: "Contact, Start here" (selected), "Services, 7 links", "Company, 4 links", "Support, 4 links", "Resources, 4 links", "Follow, 5 channels". Arrow keys move between them.
38. Button: "Next footer section".
39. "Uplink © 2026 Uplink Technology Inc."
40. Navigation "Legal": links "Privacy", "Terms", "Accessibility".
41. Button: "? Keyboard shortcuts".
42. "All systems normal · Help desk open 7 am to 7 pm ET".

## Phone: what changes

- **Header:** the logo link has the same name; the top tabs are gone (the bottom bar takes their place). The two header buttons keep their full names.
- **Hero:** no "Managed IT · Ontario" line and no "Main menu". The short line is read instead: "We run your IT: help desk, security, cloud, network and phones." The image has the same description.
- **Services:** the same 7 links. The three short tiles also read their chip first ("Build, Cloud workspace…", "Build, Networks & Wi-Fi…", "Connect, Phones & Teams calling…"). The "Swipe" hint and dots are not read.
- **We grow with you:** each level reads only its heading and paragraph. **The "Level 1 · 1 to 10 people" lines and the three checklists are not read on phones**, because they are hidden on screen there.
- **Footer:** no "Previous" and "Next footer section" buttons; the tabs still work.
- **At the very end:** navigation "Main (bottom bar)", 5 links: "Home" (current page), "Services", "Work", "About", "Contact".

## What stands out

1. **Phones lose part of "We grow with you".** Who each level is for ("1 to 10 people") and the three checklists are hidden on phones, for sighted visitors and screen readers alike. If the words matter, they need to stay readable (shown, or hidden only visually).
2. **"Get started" says "link" but opens a pop-up.** Screen readers expect a link to go to a new page. It's still usable: the pop-up takes focus and Esc closes it.
3. **Card links read their chip first** ("Support, Managed help desk…"). That's wordy but clear, and it passes the label rules.
4. **The phone bottom bar comes last.** It sits after the footer, so someone moving line by line reaches it at the very end. Jumping by landmark ("navigation") finds it at once. That's normal for a bottom bar.
5. **Nothing moving is announced.** The hero captions and the swipe dots stay quiet, which is right.
