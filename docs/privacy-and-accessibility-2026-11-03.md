# Privacy and accessibility pages: reasoning and sources

3 Nov 2026. Drafts: `src/data/privacy.md` and `src/data/accessibility.md`. Not legal advice; a lawyer should read both before launch.

**Decided 3 Nov 2026, after this was written:** Uplink has fewer than 50 staff and doesn't do business in Quebec. So the 50+ duties (WCAG by law, the written accessibility policy and multi-year plan, s. 3 and s. 4) don't apply, and neither does Law 25. The site keeps WCAG 2.0 AA as its own standard; the accessibility page says so and no longer offers a policy or plan. This settles open questions 6 and 20 below, and the Quebec part of 2. Question 21 (the compliance report) now turns on the 20-staff line, not 50: see `notes.md`.

Sources were read on 3 Nov 2026. Laws were read on the official consolidations: PIPEDA and the CRTC regulations "current to 2026-10-19" (laws-lois), O. Reg. 191/11 "e-Laws currency date October 30, 2026" (ontario.ca), Quebec's P-39.1 on LégisQuébec. **Unverified** marks anything I couldn't confirm from a primary source.

## Privacy page

### Which law

- PIPEDA applies to the site. Ontario has no general private-sector privacy law. It has one for health information only, and is not on the list of provinces with a "substantially similar" law (Alberta, BC, Quebec). PIPEDA also covers any information that crosses a provincial or national border.
  [OPC, PIPEDA requirements in brief](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/)
- The ten fair information principles are Schedule 1 of PIPEDA. The page answers them in plain words: accountability (4.1), purposes (4.2), consent (4.3), limiting collection (4.4), limiting use and retention (4.5), safeguards (4.7), openness (4.8), access (4.9), challenging compliance (4.10).
  [PIPEDA, Schedule 1](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-7.html)

### Claims and their sources

| Claim on the page | Rests on | Source |
| --- | --- | --- |
| Name a Privacy Officer by title, with a mailing address | PIPEDA Sch. 1, 4.8.2(a): "the name or title, and the address, of the person who is accountable" | [PIPEDA Sch. 1](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-7.html) |
| Say what is collected, why, and who else gets it, in plain words, layered (short version first) | OPC meaningful-consent guidelines: four key elements (what, purposes, third parties, risk of harm) and layering | [OPC, Guidelines for obtaining meaningful consent](https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/gl_omc_201805/) |
| Data may be processed outside Canada; foreign courts and agencies may reach it; we stay responsible | OPC cross-border guidelines: tell people "in clear and understandable" language, at collection; the organization remains accountable; a transfer for processing is a use, so no new consent | [OPC, Guidelines for processing personal data across borders (2009)](https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/); PIPEDA Sch. 1, 4.1.3 |
| We answer access requests within 30 days | PIPEDA s. 8(3); s. 8(4) allows one 30-day extension (or longer to convert to an alternative format) | [PIPEDA, page 2](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-2.html) |
| You can withdraw consent | PIPEDA Sch. 4.3.8 | [PIPEDA Sch. 1](https://laws-lois.justice.gc.ca/eng/acts/P-8.6/page-7.html) |
| Delete form messages once no longer needed | PIPEDA Sch. 4.5.3 | same |
| Complain to us first, then the OPC | OPC: "Always try to resolve the issue with the organization… first" | [OPC, File a formal privacy complaint](https://www.priv.gc.ca/en/report-a-concern/file-a-formal-privacy-complaint/) |
| OPC address: 30 Victoria Street, Gatineau, Quebec K1A 1H3 | | [OPC, Contact the OPC](https://www.priv.gc.ca/en/contact-the-opc/) |
| OPC phone: 1-800-282-1376, TTY 819-994-6591 | | [OPC Information Centre](https://www.priv.gc.ca/en/contact-the-opc/contact-the-information-centre/) |
| Cloudflare sees IP address, browser and the address asked for; acts for us | Cloudflare is a "data processor" of Customer Logs and of content passing through its services; End User data "may include" IP addresses, system configuration, referring URLs | [Cloudflare Privacy Policy, effective 4 Nov 2025](https://www.cloudflare.com/privacypolicy/) |
| Cloudflare stores data mainly in the US and the EU | "We primarily store your information in the United States and the European Economic Area" | same |
| Web Analytics: no cookies, no local storage, doesn't follow people by IP or browser | "We don't use any client-side state (like cookies or localStorage) for analytics purposes"; doesn't "track users over time via their IP address, User Agent string, or any other immutable attributes" | [Cloudflare blog, privacy-first Web Analytics (9 Dec 2020)](https://blog.cloudflare.com/privacy-first-web-analytics/). The current docs say only that it "does not collect or use your visitors' personal data": [About](https://developers.cloudflare.com/web-analytics/about/) |
| What Web Analytics shows: pages, country, browser, OS, device, referrer, load speed | Dimensions list; a visit is counted from the referrer, not from the visitor | [Dimensions](https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/), [High-level metrics](https://developers.cloudflare.com/web-analytics/data-metrics/high-level-metrics/) |
| Web Analytics: full detail for 7 days, then totals | "We retain unsampled beacon data for the past 7 days, after this point data is aggregated down to around 10%" | [Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/) |
| Web Analytics can be blocked; doesn't log query strings | same FAQ | same |
| Our site's logs: up to 7 days | Workers Logs: 3 days on Workers Free, 7 on Workers Paid | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) |
| Error reports also reach Cloudflare with the IP address | Workers Logs capture "request metadata, and headers" of each Worker run (from a changelog entry seen in search; field list **unverified**) | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) |
| Turnstile uses device and browser signals; acts for us | Signals include "client IP address, TLS fingerprint, User-Agent header"; Cloudflare is a processor for site protection, and a controller of signals it uses to improve Turnstile | [Turnstile Privacy Addendum, 18 Jun 2025](https://www.cloudflare.com/turnstile-privacy-policy/) |
| Cloudflare keeps a copy of each sent email for about 7 days | Email Service "Email preview": "retained for about seven days", on by default for sending domains added on or after 2 Jul 2026 | [Email Service changelog, 17 Jul 2026](https://developers.cloudflare.com/changelog/product/email-service/) |
| Newsletter: consent, sender identified, contact details, unsubscribe, stop within 10 business days | CASL s. 6 (consent, identification, unsubscribe), s. 10(1) (what a consent request says), s. 11 (free unsubscribe, link valid 60 days, effect within 10 business days); CRTC Regulations s. 2–4 (name, mailing address, phone or email or web address; a consent request must say consent can be withdrawn) | [CASL](https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-2.html), [Electronic Commerce Protection Regulations (CRTC), SOR/2012-36](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2012-36/FullText.html) |
| Keep a record of each sign-up | CRTC: a web tick-box is valid written consent where "a record of the date, time, purpose, and manner" is kept; no pre-ticked boxes; the sender must prove consent | [CRTC Bulletin 2012-548](https://crtc.gc.ca/eng/archive/2012/2012-548.htm), [2012-549](https://crtc.gc.ca/eng/archive/2012/2012-549.htm). **Unverified first-hand:** crtc.gc.ca answered with a bot check, so these come from search excerpts of those pages |

Claims about the site itself (no cookies, the three storage keys, self-hosted fonts, no embeds, the beacon after load) come from the code: `src/scripts/core.js`, `src/layouts/Base.astro`, `public/_headers` (the CSP allows scripts only from the site and `static.cloudflareinsights.com`).

How the forms part is marked: the page says the forms send nothing yet, and the "once they send" part sits between `<!-- FORMS-LIVE -->` and `<!-- /FORMS-LIVE -->`. When forms ship, delete the "don't send anything yet" paragraph and the two comments, and the "Forms don't send anything yet" line in the short version.

### Quebec (Law 25)

The Quebec private-sector act (P-39.1) applies to an enterprise carrying on business in Quebec (s. 1). Visitors from Quebec alone may not bring the site under it; clients or staff there would. If it applies, the page already does most of it: a policy in clear and simple language on the website (s. 8.2), the purposes, rights of access and correction, and withdrawal of consent (s. 8), the chance data goes outside Quebec (s. 8), and Web Analytics doesn't profile. What it would add:

- Publish the **title and contact details of the person in charge** of personal information (s. 3.1). The Privacy Officer line does this, if that person is the one named under Quebec law.
- A **privacy impact assessment** and a written agreement before data goes outside Quebec (s. 17), which Cloudflare always does. This is a paper task, not page text.
- Governance policies (s. 3.2): internal, not on this page.
- A French version of the page once the French site ships.

Source: [Act respecting the protection of personal information in the private sector, CQLR c P-39.1](https://www.legisquebec.gouv.qc.ca/en/document/cs/P-39.1). I didn't go further: flag, not build.

## Accessibility page

| Claim on the page | Rests on | Source |
| --- | --- | --- |
| A "large organization" is 50+ employees in Ontario | O. Reg. 191/11 s. 2 | [O. Reg. 191/11](https://www.ontario.ca/laws/regulation/110191) |
| Statement of commitment "to meet the accessibility needs of persons with disabilities in a timely manner" | s. 3(2); the policy documents must be public and given in an accessible format on request, s. 3(3) | same |
| Ask for our multi-year plan | s. 4(1): plan posted on the website, in an accessible format on request, reviewed every 5 years | same |
| WCAG 2.0 Level AA | s. 14(2), (4): large organizations, all internet websites and web content by 1 Jan 2021, except 1.2.4 Captions (Live) and 1.2.5 Audio Descriptions (Pre-recorded); s. 14(5): content published after 1 Jan 2012, unless "not practicable" | same |
| Feedback process, accessible, and the public told of it | s. 11(1)–(2) | same |
| "What happens next" and a copy of the feedback process | s. 80.50 (customer service): the process must say what happens when a complaint comes in (2), be readily available (4), and large organizations must write it down, give a copy on request (5) and tell people it exists (6) | same |
| Accessible formats and communication supports, timely, at no extra cost, chosen with the person, and the public told | s. 12(1)–(3); examples from the s. 1 definitions (large print, recorded audio, electronic formats, braille; captioning, plain language, sign language) | same |

The built-in aids and the checks come from the code and `docs/sop.md`: Settings text sizes 100–200% (`SettingsDialog.astro`), the pause button and `prefers-reduced-motion` (`core.js`, `HoldButton.astro`), the shortcuts toggle, the skip link (`Base.astro`), and the release audit in Chromium, Firefox and WebKit with Guidepup's virtual screen reader (`tools/audit.py`).

Known limits come from `notes.md` and `docs/releases/2026-11-03.md`: forms send nothing, about 24 links per page go to `/soon`, and the person-run screen-reader listen (NVDA) is still open; `docs/screen-reader-home.md` is a read-out of the accessibility tree, not a listen.

On `knowledge/Ontario Website Accessibility Rules.md`: what I relied on checks out against the regulation (50+ employees, WCAG 2.0 AA, content after 1 Jan 2012, the 1.2.4 and 1.2.5 exemptions, "not practicable"). One wording is off: "It can be excused only where meeting it is 'not practicable'" sits under the under-50 sentence, but it is the 50+ exception. I didn't check its WCAG list.

## Open questions for the owner

Inboxes and people
1. `privacy@uplinkit.ca` and `accessibility@uplinkit.ca` are placeholders. Both need real, watched inboxes (or one shared inbox) before the pages go live.
2. Who is the Privacy Officer? The page uses the title only, which PIPEDA allows. Under Quebec law the default is the person with the highest authority (the CEO) unless delegated in writing.
3. The mailing address has no postal code. `footer.json` has only the street.
4. The accessibility reply times (2 business days to acknowledge, 10 to answer) are my proposal. The law sets none; pick what the team can keep.
5. "Few people at Uplink can open the inbox" (privacy, "How we protect it") is an assumption. Confirm, or cut it.
6. The page offers a copy of the accessibility policy and the multi-year plan. Both must exist (s. 3, s. 4), and the plan must be posted on the website. The site has neither yet.

Retention I couldn't pin down
7. Cloudflare's request logs: the privacy policy gives no period ("consistent with the business purposes"). The page says so in plain words. **Unverified.**
8. Workers Logs is 3 days (Free) or 7 (Paid). Which plan is the account on? The page says "up to 7 days", true either way.
9. Do requests served only by static assets (no Worker run) show up in Workers Logs? The docs don't say. They are free and don't invoke the Worker, so probably not. **Unverified.** Once `/api/*` exists, those runs are logged with request headers, which include the IP address.
10. How long will form emails stay in the inbox? Set a rule (for example, delete after 12 months unless the sender became a client) and put the number on the page.

When forms go live
11. Delete the "don't send anything yet" lines and the `FORMS-LIVE` comments (privacy page, short version and Forms section; accessibility page, known limits and "once it sends").
12. **Email preview** in Cloudflare Email Service keeps a full copy of each sent message (the form contents) for about 7 days, and is on by default for sending domains added after 2 Jul 2026. The page says so. If you'd rather it didn't, turn it off on the sending domain and delete that sentence.
13. Each form should link to the privacy page next to the Send button, so the notice is given at collection (OPC cross-border guidance prefers that).
14. **Newsletter (CASL).** The form today has the email field and "One email a month. Threats to watch and fixes that matter." That's not a full consent request. It needs, next to the button: who is asking (Uplink Technology), contact details (or a link to them), and that you can unsubscribe at any time (CRTC Regs s. 4(e)). Suggested: "One email a month from Uplink Technology. Unsubscribe any time. [Privacy](/privacy)."
15. **Newsletter: what sends it?** Sign-ups arrive in the inbox, but the monthly email has to go out from something: a mailing service would be another processor to name on the page, with its own country and retention. Who keeps the consent records (date, time, how)? The email itself records date and time; keep it as long as you send to that address. A confirmation email (double opt-in) isn't required by CASL but proves the address's owner asked.
16. Turnstile: does it set cookies on the visitor? Cloudflare's cookie list doesn't name Turnstile. **Unverified.** It runs in a frame on `challenges.cloudflare.com`, so any cookie would be Cloudflare's, not the site's. Check in the browser once it's live.

When the domain moves
17. `notes.md` plans **Bot Fight Mode** on the zone. It sets the `__cf_bm` cookie (30 minutes, strictly necessary), and JavaScript detections can set `cf_clearance` ([Cloudflare cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/)). Then "The site sets no cookies" stops being true. Change it to: "Our own code sets no cookies. Cloudflare may set one short-lived security cookie to tell people from bots. It isn't used for tracking or ads."
18. Swap the `uplinkit.ca` placeholders for the real domain's addresses.
19. If CSP reports are switched on (`Reporting-Endpoints` in `notes.md`), they go to the same `/api/report`, and the error-report paragraph covers them.

Law
20. Law 25: does Uplink carry on business in Quebec (clients, staff, an office)? If yes, see the Quebec section above: name the person in charge, do a privacy impact assessment for Cloudflare, and publish a French page.
21. Large private organizations in Ontario also file an accessibility compliance report every three years under the AODA. Not page text, but check it's on the calendar. **Unverified** (from memory; I didn't read the Act).

## What the site does that differs from the brief

- **Error reports** (`/api/report`) aren't in the repo yet: no Worker script on this branch (`wrangler.jsonc` is assets only). The page describes them as the brief says.
- **"No personal details" in error reports** is true of the report body, but the Worker run is logged with its request headers, so the IP address lands in Workers Logs too. The page says so.
- **"Nothing is stored"** for forms: true of our code, but Email Service's Email preview keeps each message for about 7 days (see 12). The Worker also passes the visitor's IP address to Turnstile's check (`remoteip` in `worker/index.js` on PR #38); the page covers that under Turnstile.
- **Analytics on the live address:** the beacon loads only where the canonical host matches (the `workers.dev` address today), and its token was registered for the old `pages.dev` host, so Cloudflare may be refusing the data (`notes.md`). The page is still right: the browser sends it.
- **Booking toast** says "We will email you within one business day" though nothing is sent (`core.js`, already in `notes.md`, fixed by PR #38).
