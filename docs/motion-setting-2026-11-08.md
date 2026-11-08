# Reduce motion in Settings: November 8, 2026

Visitors can turn off the site's motion from Settings, as well as from their device. This page records how it works and why it's a single switch.

## What the visitor gets

- **Settings → Motion → Reduce motion:** a switch. On, nothing on the site animates: the drawings, the services row, Grow, the footer map, page transitions, and the slide and fade effects. It's saved on the device (`uplink.motion`), so it holds on every page and the next visit.
- **The device setting comes first.** If the device asks for less motion (`prefers-reduced-motion: reduce`), the switch shows on, greyed out, with "On: your device is set to reduce motion." The site never animates against the device's setting.
- **The pause button** still stops the drawings for a visitor who wants motion in general but not right now. With Reduce motion on, it hides: nothing moves.

> **Note:** A three-way choice (System, Reduced, Full) was considered. "Full" would let a visitor turn motion back on against their device's setting. That's rarely wanted, easy to choose by mistake, and harder to undo for someone who needs less motion, so the switch only adds calm.

## How it works

It follows the theme's pattern (`docs/light-theme-2026-11-08.md`):

1. **One attribute.** `<html data-motion="reduce">` when the switch is on or the device asks for less motion.
2. **Before the first paint.** `Base.astro`'s head script sets it, so nothing starts moving and then stops.
3. **Kept right after that.** `core.js` follows the switch, a change of the device's setting, another tab (`storage`) and the back/forward cache (`pageshow`).
4. **CSS, written once.** Stylesheets keep plain `prefers-reduced-motion` queries. The `motion-choice` step in `postcss.config.mjs` follows them to the attribute, the way `postcss-dark-theme-class` does for colour schemes:
   - a `reduce` block stays (it's all there is without script), and a copy of it follows `:root[data-motion='reduce']`;
   - a `no-preference` block's selectors take `:root:not([data-motion='reduce'])`.

   A block with any other condition stops the build, so a new kind can't slip through unhandled. `@view-transition` has no selector to scope, so `page-transitions.css` turns the transition's animations off for the attribute instead.
5. **Scripts ask one place.** `reduceMotion` in `core.js` answers for both the device and the switch, with the same shape as the `matchMedia` result it replaced (`.matches`, a `change` event). `home.js`, `grow.js` and `footer.js` didn't change.
6. **Without script** the CSS media queries still apply, so a device that asks for less motion gets none.

## Checks

The site check "motion: Reduce motion in Settings…" (`checks/site.spec.mjs`) covers:

- switching it on: the attribute is set, the choice is saved, and it survives a reload;
- after that, no running animation on Home once the footer map is in, and instant transitions;
- a device that asks for less motion: the switch is on and locked;
- no script on that device: no animation.

The privacy page lists `uplink.motion`; the accessibility page names the switch.
