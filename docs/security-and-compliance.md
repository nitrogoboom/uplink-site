# Security, privacy, and accessibility on the Uplink site

*Last updated: November 7, 2026*

This page explains how the Uplink Technology website protects its visitors and who it's built to serve. For each protection, you'll find:
- what it guards against
- how the site puts it in place
- how you can check it yourself with public tools
- how to apply the same idea to your own site

The site is a static site: pages are built ahead of time and served from Cloudflare's network. One small server function sees each request first: it redirects plain `http://` to `https://` and handles error reports from browsers. Because there are no accounts, no database, and no third-party scripts beyond privacy-friendly analytics, there is very little that an attacker can reach. The sections below build on that small footprint.

## Standards this site meets

| Area | Standard | What the site does |
| --- | --- | --- |
| Accessibility | [WCAG 2.0](https://www.w3.org/TR/WCAG20/) Level AA, the level set by Ontario's [Integrated Accessibility Standards](https://www.ontario.ca/laws/regulation/110191) | Built to Level AA and checked by machine on every page. The review by hand is still open. Also built to the WCAG 2.1 and 2.2 criteria listed in [Accessibility](#accessibility). |
| Privacy | [PIPEDA](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/) | Publishes what it collects, who processes it, where, and for how long. Sets no cookies. |
| Response headers | [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/) | Sends the headers listed in [Set protective response headers](#set-protective-response-headers). Scores A+ on [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory). |
| Vulnerability disclosure | [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) | Publishes a `security.txt` file with a contact address. |

## Security

### Serve every page over HTTPS

HTTPS encrypts the connection between the visitor and the site. Without it, anyone on the same network, such as a café's Wi-Fi, can read the page or change it on the way.

**How the site does it**
- Every request made with `http://` is redirected to the same address with `https://`. The redirect uses status `308`, which keeps the request method unchanged.
- Every page and file includes HTTP Strict Transport Security (HSTS), which tells the browser to use HTTPS for this site for the next year, even if someone types `http://`:

  ```http
  Strict-Transport-Security: max-age=31536000
  ```

**Verify it**

Run these commands, replacing `example.com` with the site's address:

```sh
curl -sI http://example.com/services
curl -sI https://example.com/ | grep -i strict-transport
```

The first response shows `308 Permanent Redirect` with a `Location` that starts with `https://`. The second shows the HSTS header.

**Apply it to your site**
1. Turn on your host's "always use HTTPS" setting, and set the minimum TLS version to 1.2.
2. Add the HSTS header with `max-age=31536000`.
3. Once every subdomain also serves HTTPS, add `includeSubDomains; preload` and submit your domain to [hstspreload.org](https://hstspreload.org/).

> **Caution:** Preloading is hard to reverse. Don't add `preload` until you're sure every subdomain will stay on HTTPS.

### Restrict what can run with a Content Security Policy

Cross-site scripting (XSS) is when an attacker gets their own script to run on your page. A Content Security Policy (CSP) is a response header that tells the browser exactly which scripts, styles, and other resources the page may use. Anything not on the list is blocked, so injected code doesn't run.

**How the site does it**

The site uses a *strict* policy. It doesn't trust whole domains. Inline code runs only if its exact SHA-256 hash is listed, and the site allows no `'unsafe-inline'` for scripts or styles. This is the shape of the policy, with the hashes shortened:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://static.cloudflareinsights.com 'sha256-…';
  style-src 'self' 'sha256-…' 'sha256-…';
  font-src 'self' data:;
  img-src 'self' data:;
  connect-src 'self' https://cloudflareinsights.com;
  form-action 'self';
  frame-ancestors 'none';
  base-uri 'self';
  object-src 'none';
  require-trusted-types-for 'script';
  trusted-types uplink;
  report-uri /api/report;
  report-to csp
```

What the directives do:
- `default-src 'self'`: anything not named elsewhere may come only from the site itself.
- `script-src`: scripts come from the site, plus Cloudflare's analytics script. The one inline script, which marks the page as script-enabled, is allowed by its hash.
- `style-src`: styles come from the site. Each inline `<style>` block is allowed by its hash.
- `object-src 'none'`, `base-uri 'self'`, and `form-action 'self'` close three common ways around a CSP: plugins, a rewritten base URL, and forms that post somewhere else.
- `frame-ancestors 'none'`: no other site can show these pages in a frame. This prevents clickjacking.

The hashes are calculated when the site is built, so a policy can't fall out of date with the pages it protects. No HTML element carries a `style` attribute, because the policy would block it. Scripts set styles through the DOM instead, which the policy allows.

> **Note:** A CSP adds a layer of defence on top of good coding. It doesn't replace it. The site still never inserts untrusted text into a page.

**Verify it**
1. In Chrome, open the site, then open **DevTools** > **Network**. Select the page request and look for `content-security-policy` under **Response Headers**.
2. Open the **Console** tab and browse a few pages. A blocked resource appears as an error that names the directive. A clean site shows none.
3. Paste the policy into Google's [CSP Evaluator](https://csp-evaluator.withgoogle.com/) to check it for weaknesses.

**Apply it to your site**
1. Start with `default-src 'self'` and send it as `Content-Security-Policy-Report-Only`, so nothing breaks while you test.
2. Read the reports. Add each source you need by name, and give inline scripts hashes or nonces.
3. Remove `style` attributes from your HTML so `style-src` doesn't need `'unsafe-inline'`.
4. Generate the hashes in your build, not by hand.
5. Switch the header to `Content-Security-Policy` to start enforcing.

For a full walkthrough, see [Mitigate cross-site scripting with a strict CSP](https://web.dev/articles/strict-csp) on web.dev.

### Control HTML writes with Trusted Types

Some XSS happens entirely in the browser: a script takes text from somewhere and writes it into the page with `innerHTML`. A CSP can't see this. Trusted Types makes the browser refuse those writes unless they go through a policy you define.

**How the site does it**
- The CSP includes `require-trusted-types-for 'script'` and `trusted-types uplink`. Only one policy, named `uplink`, may exist.
- The site's shared script creates that policy. Every script that writes HTML calls one helper that goes through it.
- The policy doesn't clean or change the HTML it's given. Its job is to make sure HTML is written in one place only. Callers pass it only the site's own text and the site's own drawings, never anything from a URL or a form.
- The policy may load exactly one outside script, the analytics script, and throws an error for any other.

**Verify it**

In the DevTools **Console**, run:

```js
document.body.innerHTML = '<b>test</b>';
```

The browser blocks the assignment and reports a Trusted Types violation. A page without Trusted Types would accept it.

**Apply it to your site**
1. Find every `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and `document.write` in your code.
2. Create one policy in your first script, and route those writes through it.
3. Add the two CSP directives, in report-only mode first.

Browsers that don't support Trusted Types ignore the directives, so the site keeps working there.

To learn more, see [Prevent DOM-based XSS with Trusted Types](https://web.dev/articles/trusted-types).

### Set protective response headers

Besides HSTS and the CSP, every page and file carries these headers. Short responses the server function writes itself, such as the `http://` redirect and the report endpoint's replies, don't carry them.

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

`X-Content-Type-Options`
: Stops the browser from guessing a file's type. A file is only ever treated as what the server says it is.

`X-Frame-Options`
: Blocks framing in older browsers that don't read `frame-ancestors`.

`Referrer-Policy`
: When a visitor follows a link to another site, that site learns only which domain they came from, not the full address of the page.

`Permissions-Policy`
: Turns off the camera, microphone, location, payment, and USB features. No script on the page, including any that got in by mistake, can ask for them.

`Cross-Origin-Opener-Policy`
: Keeps other sites' windows from holding a reference to this one. That blocks a group of cross-window attacks.

`Cross-Origin-Resource-Policy`
: Stops other sites from loading the site's files into their own pages, which closes off some side-channel attacks. The share picture, `og.png`, is the one exception (`cross-origin`), because some apps show it directly.

The site doesn't send `X-Permitted-Cross-Domain-Policies`. Only Flash and Adobe Acrobat ever read it, so it was dropped on November 7, 2026 (review H9). The smoke check fails if it comes back.

The site doesn't send `Cross-Origin-Embedder-Policy`. It's needed only for features the site doesn't use, and it could block the analytics script, which comes from another domain.

**Verify it**

Scan the site with [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory). On November 5, 2026, the site scored A+ (130 points) and passed all 12 tests.

### Find out when the browser blocks something

A policy is only useful if you know when it fires. The site asks visitors' browsers to report problems, so issues are found without anyone having to report them.

**How the site does it**
- The CSP names a report endpoint on the site itself, `/api/report`, using both `report-to` (the current standard) and `report-uri` (for older browsers). The same endpoint is declared in this header:

  ```http
  Reporting-Endpoints: csp="/api/report"
  ```

- The site's script also sends uncaught JavaScript errors to the same endpoint, at most five per page view.
- Because the endpoint is on the site's own domain, the CSP doesn't need to trust another host.

### Harden the one server endpoint

The report endpoint is the only part of the site that accepts input. It's built to accept only what it expects:
- It accepts only `POST` requests.
- It rejects requests whose `Origin` header names another site, and it drops reports about other sites' pages.
- It limits how many reports each visitor can send per minute.
- It stops reading a request body after 8 KB.
- It accepts only valid JSON, keeps a short list of known fields, and cuts each to a fixed length.
- It removes the query string from every web address before saving it, because a query string can hold personal data.
- It records numbers, such as line numbers, only if they're whole numbers.

Automated tests cover these rules, and CI runs them before it deploys a change.

**Apply it to your site**

For any endpoint that accepts input:
1. Allow only the HTTP methods you need.
2. Check the `Origin` header.
3. Rate-limit by visitor.
4. Cap the size while you read the body, not after.
5. Parse strictly, and keep only the fields you need.

### Keep secrets and dependencies under control

**How the site does it**
- Passwords, API keys, and tokens are never stored in the code. They live in the hosting and build services' secret stores. A private list records each secret's name, purpose, and location, without its value.
- Every build step from GitHub Actions is pinned to an exact commit, so a changed release can't slip into the build.
- Automated update requests arrive weekly for every dependency, and each is tested like any other change.
- The pages load no third-party code except the analytics script. Fonts are hosted on the site itself.
- `npm audit` reports no known vulnerabilities in anything the site ships to visitors.

**Apply it to your site**
1. Keep secrets in your platform's secret store, and keep a list of names and owners.
2. Pin third-party CI actions to a commit hash.
3. Turn on automated dependency updates.
4. Treat every new third-party script as a security and privacy decision.

### Publish a security contact

If you find a security problem on this site, report it to the address in [`/.well-known/security.txt`](/.well-known/security.txt). The file follows RFC 9116. It's generated each time the site is built, with an expiry date a year after the build. The site must be rebuilt at least once a year to keep it valid.

## Privacy

The site follows Canada's Personal Information Protection and Electronic Documents Act (PIPEDA). The [privacy page](/privacy) explains, in plain language:
- what the site collects and why
- who processes it and in which country
- how long it's kept
- how to ask for a copy of your information, or to have it removed

### No cookies, no tracking

The site sets no cookies. Visit counts come from Cloudflare Web Analytics, which doesn't use cookies or follow visitors across sites. Its script loads after the page has finished loading, so it never slows the page down. Because there's nothing to consent to, the site shows no cookie banner.

If you change a setting, such as pausing animations or turning keyboard shortcuts off, the site remembers it in your browser's own storage. That setting never leaves your device, and you can clear it by clearing the site's data in your browser.

**Verify it**

Open the site in a private window. In Chrome, open **DevTools** > **Application** > **Cookies**. The list for the site is empty.

### Collect as little as possible

An error report from the browser contains:
- the page address, without its query string
- the error message
- the script address and line number
- the browser's user-agent string, cut to 200 characters

A report of a blocked resource also contains the blocked address, without its query string, and the rule that blocked it.

It never includes anything a visitor typed. Cloudflare keeps its own record of each request, including the IP address, for up to three days. The privacy page says so.

### Keep the privacy page accurate

The site has a working rule: any change that starts collecting new information, or adds a new service that handles visitor data, updates the privacy page in the same change. The page is reviewed together with the code that it describes.

## Accessibility

The site is built to WCAG 2.0 Level AA and checked by machine on every page. A review by hand, on real phones and with a screen reader, is still to be done. The site is also built to these later success criteria:
- from WCAG 2.1: 1.3.5, 1.4.10, 1.4.11, 1.4.12, 2.1.4, 2.5.3 and 4.1.3
- from WCAG 2.2: 2.5.8

The [accessibility statement](/accessibility) describes the site's support and how to send feedback or ask for another format.

### What the site does

| What | How | WCAG |
| --- | --- | --- |
| Page structure | One main heading per page, headings in order, and labelled landmarks (header, navigation, main, footer) | 1.3.1, 2.4.6 |
| Skip link | The first Tab stop jumps straight to the main content | 2.4.1 |
| Page titles and language | A unique title on every page; the language set to Canadian English | 2.4.2, 3.1.1 |
| Link and button names | Every name matches its visible words, so voice control can find it. One name never leads to two places. | 2.4.4, 2.5.3 |
| Images | Decorative images are hidden from screen readers. Words in drawings are repeated in the page text. | 1.1.1, 1.4.5 |
| Keyboard | Everything works from the keyboard, nothing traps focus, and focus is always visible. Pop-ups close with Esc and return focus to where it was. | 2.1.1, 2.1.2, 2.4.3, 2.4.7 |
| Keyboard shortcuts | Single-key shortcuts can be turned off. They never fire while you type or while a pop-up is open. | 2.1.4 |
| Contrast | Text has at least 4.5:1 contrast, and the edges of controls have at least 3:1 | 1.4.3, 1.4.11 |
| Colour | Colour is never the only signal. Errors also have words and an icon. | 1.4.1 |
| Text size | Browser zoom to 200% enlarges text without breaking the layout (on very wide desktop screens zoom does less until the layout plan's phase 4; see the accessibility page's known limits) | 1.4.4 |
| Text spacing | The page holds up when you increase line, letter, word, and paragraph spacing | 1.4.12 |
| Reflow | Every page works at 320 pixels wide without scrolling sideways | 1.4.10 |
| Target size | Touch targets are at least 44 pixels, and never smaller than 24 | 2.5.8 |
| Motion | If your system asks for reduced motion, nothing animates. Otherwise, every looping animation has a pause button, and nothing flashes more than three times a second. | 2.2.2, 2.3.1 |
| Forms | Every field has a visible label. Optional fields say so. Common fields support autofill. Errors are written out, tied to their field, and focus moves to the first one. | 1.3.5, 3.3.1, 3.3.2 |
| Status messages | Updates such as the number of projects shown after you filter are announced by screen readers without moving focus | 4.1.3 |
| Valid code | The home page goes through the W3C validator at each release, and every page does when a release changes their markup. One error is open on the home page today: an attribute on the Grow play button's ring (`notes.md`). | 4.1.1 |

### Works the way you browse

- **Without JavaScript:** every page shows all of its content. Controls that need script are hidden instead of left broken.
- **In Windows contrast themes:** text, borders, and focus outlines take your theme's colours. Drawings keep a dark background, so their labels stay readable.
- **When printed:** pages print dark text on white paper, without menus or animations, and cards don't split across pages.

### Verify it

You can check most of these yourself:
1. **Keyboard:** put your mouse aside and press Tab through a page. Every stop shows a visible outline, and you can reach and use everything.
2. **Screen reader:** turn on [NVDA](https://www.nvaccess.org/) on Windows or VoiceOver on Mac and iPhone. Read a page from the top, then jump between headings.
3. **Automated scan:** run [axe DevTools](https://www.deque.com/axe/devtools/), [WAVE](https://wave.webaim.org/), or Lighthouse's **Accessibility** audit. On November 5, 2026, Lighthouse scored 100 for accessibility on every sitemap page on phone and desktop, after one fix to the home page.
4. **Text size:** zoom the browser to 200%. Nothing is cut off or overlaps.
5. **Narrow screens:** in DevTools, open the device toolbar and set the width to 320 pixels. Nothing scrolls sideways.
6. **Reduced motion:** turn on your system's reduced-motion setting and reload. Nothing moves.
7. **Contrast themes:** in DevTools, open **Rendering** and emulate `forced-colors: active`.

> **Note:** Automated tools find roughly a third to a half of accessibility problems. Testing with a keyboard and a screen reader catches much of the rest.

### Apply it to your site
1. Pick the WCAG level you'll meet, and publish an accessibility statement with a way to contact you.
2. Run an automated checker on every page, every time you change the site.
3. Before each release, test with a keyboard, a screen reader, and in more than one browser engine.
4. Test the settings people bring with them: no JavaScript, reduced motion, contrast themes, and large text with extra spacing.
5. Keep a dated record of each test.

## How changes reach the live site

Every change goes through the same path before visitors see it:
1. **Automated checks.** Each change runs:
   - type checks and code linting
   - tests for the build and the server endpoint
   - a headless browser over every page, which fails on any script error, blocked resource, sideways scroll, or serious accessibility problem
   - a check that every link and file answers
2. **Preview.** Each proposed change gets its own preview address, plus a screenshot comparison against the live site.
3. **Release.** CI deploys only changes that pass every check.
4. **Smoke test.** After a release, a smoke test requests every page and checks its status code, its security headers, and the redirects.
5. **Rollback.** If something goes wrong, the previous version can be restored in seconds.

Larger releases also get a full audit:
- three browser engines and emulated phones
- a keyboard walkthrough of every page
- a screen-reader transcript of every page
- motion and form checks
- HTML validation
- a hands-on pass with real phones and a screen reader

## Review checklist

Use this list to review the site, or a site you build the same way.

| Check | How | Pass |
| --- | --- | --- |
| HTTPS and HSTS | `curl -sI http://…` and `curl -sI https://…` | `308` to `https://`; HSTS header present |
| Security headers | [Mozilla HTTP Observatory](https://developer.mozilla.org/en-US/observatory) | A+ |
| CSP strength | [CSP Evaluator](https://csp-evaluator.withgoogle.com/) | No high-severity findings |
| CSP in use | DevTools **Console** on several pages | No violations |
| Trusted Types | `document.body.innerHTML = 'x'` in the **Console** | Blocked |
| TLS | [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) | A or higher |
| Cookies | DevTools **Application** > **Cookies** | None |
| Security contact | Open `/.well-known/security.txt` | Present, with an expiry date in the future |
| Accessibility scan | Lighthouse, axe, or WAVE on each page | No errors |
| Keyboard | Tab through each page | Focus always visible; nothing trapped |
| Screen reader | NVDA or VoiceOver, top to bottom | Every part is announced clearly and in order |
| Zoom and reflow | 200% zoom; 320 px wide | Nothing lost; no sideways scroll |
| Reduced motion | System setting on | Nothing animates |
| Privacy page | Compare it with what the site collects | Every claim matches |

## Further reading

- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) on MDN
- [Mitigate cross-site scripting with a strict CSP](https://web.dev/articles/strict-csp) on web.dev
- [Prevent DOM-based XSS with Trusted Types](https://web.dev/articles/trusted-types) on web.dev
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Web Content Accessibility Guidelines 2.0](https://www.w3.org/TR/WCAG20/) and the [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [PIPEDA in brief](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief/) from the Office of the Privacy Commissioner of Canada
- [RFC 9116: security.txt](https://www.rfc-editor.org/rfc/rfc9116)
