# Parked: open items on hold

Leave these alone unless the owner asks. The active list is `notes.md`.

- [ ] French as `/fr/` addresses (decided): Astro's i18n routing is in (`src/lib/i18n.ts`, README "Languages"). Left: `'fr'` in `astro.config.mjs`, the French words in `src/content/fr/`, and a language switch link.

## Owner and accounts

- [ ] GitHub environments (review H5): put the Cloudflare secrets in `production` and a preview token in `preview`, switch `site.yml` to them, delete `cloudflare`. See `docs/security.md`, "Secrets".
- [ ] Cloudflare: a company account with 2FA. (Done November 13, 2026: the deploy token is an account token with only "Workers Scripts: Edit"; sign-in is Google, which has 2FA.)
- [ ] Secrets: give each one an owner and a rotation date (`docs/security.md`, "Secrets").
- [ ] `uplinkit.ca` is not registered (seen November 17, 2026): anyone could buy it and get the mail sent to the site's addresses (`hello@`, `privacy@`, `accessibility@`, `security@`). Register it, or settle the real domain, before launch (owner, November 17, 2026: leave until then).
- [ ] The repository is public "for now" (November 6, 2026); making it private turns the rulesets off unless the plan is GitHub Pro.
- [ ] Finish the baseline: the 15-minute hand part (iPhone, Android, a 5-minute NVDA listen, the judgement checks).
- [ ] Decide, on hold: who edits copy (today Claude, in git); a CMS only if staff will edit the site themselves.

For launch (the owner): the split environments are under "Owner and accounts"; the paid Workers plan, Always Use HTTPS, and Cloudflare's client-side security belong in `docs/release.md`, "Before launch".

## Privacy and accessibility pages

- [ ] Real inboxes for `privacy@`, `accessibility@`, `security@` (`inboxes` in `src/content/en/footer.json`; its `uplinkit.ca` addresses are placeholders), and a postal code for the office.
- [ ] Name the Privacy Officer (the page gives the title only, which PIPEDA allows).
- [ ] `/accessibility`, "How we check it" (`src/content/en/accessibility.md`) still says every change is checked automatically in three browsers; that stopped November 12, 2026 (checks are looks by hand now). Rewrite it to what's true before launch.
- [ ] Before launch, `/accessibility` gets back two Ontario lines: what happens after feedback (O. Reg. 191/11 s. 80.50(2)) and free accessible formats on request (s. 12(3)).

## Forms

- [ ] Forms are paused. PR #38 (`claude/sweet-chaum-b12ca0`) has the Worker endpoint, Turnstile, honeypot and rate limit, email a stub; leave it open. Needs `TURNSTILE_SECRET`, `FORM_TO`, a sending domain.
- [ ] PR #38 conflicts with `main`: `main` has no `/api/` address since November 16, 2026 (`/api/report` and its `REPORTS` limit are gone). Its form routes bring `/api/*` back to `run_worker_first` (`["/api/*", "/404"]`, with `not_found_handling: "none"`) and its own `ratelimits`; adding them is the owner's decision.
- [ ] With the endpoint: give the contact and newsletter fields their `name` back (without script they go to `/soon`); CSP and the Trusted Types policy allow Turnstile (`docs/security.md`).
- [ ] When forms send: delete the "send nothing yet" lines and `FORMS-LIVE` comments in `src/content/en/privacy.md` and `accessibility.md`, link privacy beside each Send.
- [ ] When forms send: the booking and newsletter toasts (`toast.booked`, `toast.subscribed` in `ui.yaml`) say "Prototype form: nothing is sent yet"; give them the real reply time.
- [ ] Newsletter: a CASL consent line ("One email a month from Uplink Technology. Unsubscribe any time. Privacy."), what sends it (a processor to name), where consent records live.
- [ ] Decide on Cloudflare Email Service's "Email preview" (keeps each sent message about 7 days; the privacy page says so).

## Content

- [ ] Service and project copy (each entry's `page` in `src/content/`) stays sample until there's a real client.
- [ ] With real content: drawn team avatars, Business JSON-LD (phone, address, hours, `logo`, `sameAs`), and a real status page for "All systems normal" (or drop it).
- [ ] Services: a plans or pricing section once real pricing exists.
- [ ] Contact: "Open a ticket" and "Start a remote session" go to `/soon`.

## Layout and look

- [ ] Light theme: signed off November 9, 2026, still open to change. Optional: a quieter amber tower on the footer map; ghost-button edges to `--c-edge` (colour rule 6).
- [ ] Logo: the header's wordmark has no light-ground file in this repository (`docs/design.md`, "Logo").
- [ ] Optional: on service pages "What's included" and "Best for" are h2s; they could be h3s or a label (`ServiceCard.astro` says h2 is on purpose).
- [ ] Idea, not planned: the office fire drill.
