# Reduce motion in Settings: November 8, 2026

Visitors can choose the site's motion in Settings, whatever their device is set to. This page records how it works.

## What the visitor gets

- **Settings → Motion → Reduce motion:** a switch. It starts as the device's setting: on if the device asks for less motion (`prefers-reduced-motion: reduce`), off if not.
- **On:** nothing on the site animates: the drawings, the services row, Grow, the footer map, page transitions, and the slide and fade effects.
- **Off:** the site animates, even on a device that asks for less motion. When the device asks for less, the switch's hint says so: "Your device asks for less motion; turn this off to see them on this site only."
- **Saved on the device** (`uplink.motion`: `reduce` or `full`), so the choice holds on every page and the next visit. It only affects this site.
- **The pause button** still stops the drawings for a moment. With Reduce motion on, it hides: nothing moves.

> **Note:** The first version (earlier the same day) only added calm: with the device asking for less motion, the switch was locked on. The owner wants visitors to be able to turn the animations on here, so the visitor's own choice now wins over the device's. A visitor who never touches the switch still gets the device's setting.

## How it works

It follows the theme's pattern (`docs/light-theme-2026-11-08.md`):

1. **One attribute.** `<html data-motion>` is `reduce` (the visitor turned it on, or the device asks for less and they haven't turned it off) or `full` (they turned it off). With no choice and no device preference, there's no attribute.
2. **Before the first paint.** `Base.astro`'s head script sets it, so nothing starts moving and then stops.
3. **Kept right after that.** `core.js` follows the switch, a change of the device's setting, another tab (`storage`) and the back/forward cache (`pageshow`).
4. **CSS, written once.** Stylesheets keep plain `prefers-reduced-motion` queries. The `motion-choice` step in `postcss.config.mjs` follows them to the attribute, the way `postcss-dark-theme-class` does for colour schemes:
   - a `reduce` block's selectors take `:root:not([data-motion='full'])`, so a visitor's "off" wins; and a copy follows `:root[data-motion='reduce']`, so a visitor's "on" works on any device;
   - a `no-preference` block's selectors take `:root:not([data-motion='reduce'])`; and a copy follows `:root[data-motion='full']`, under the rest of its query.

   A block with any other condition stops the build, so a new kind can't slip through unhandled.
5. **The hero drawing.** Its own `<style>` (`tools/office_parts/hero.css`) turns its loops off for a device that asks for less motion. Those rules take `:root:not([data-motion=full])` too. Inside the page, `:root` is `<html>`, so the visitor's "off" reaches them.
6. **Scripts ask one place.** `reduceMotion` in `core.js` gives the visitor's choice if they made one, else the device's. It has the same shape as the `matchMedia` result it replaced (`.matches`, a `change` event), so `home.js`, `grow.js` and `footer.js` didn't change.
7. **Without script** the CSS media queries alone decide, so a device that asks for less motion gets none.

> **Note:** `@view-transition` has no selector to scope. With the device asking for less motion, the browser's page-to-page transition stays off even when the visitor turns motion on. Turned on by a visitor on any device, `page-transitions.css` turns the transition's animations off.

## Checks

The site check "motion: Reduce motion in Settings…" (`checks/site.spec.mjs`) covers:

- a device that doesn't ask for less motion: the switch is off and the drawings run;
- switching it on: the attribute is `reduce`, the choice is saved, it survives a reload, nothing animates once the footer map is in, and transitions are instant;
- a device that asks for less motion: the switch starts on and nothing moves;
- that device, switched off: the attribute is `full`, the site animates, after a reload too;
- no script on that device: no animation.

The privacy page lists `uplink.motion`; the accessibility page names the switch.
