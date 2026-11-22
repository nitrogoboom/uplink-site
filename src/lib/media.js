// The screen sizes the layout changes at, named once (src/README.md, "Breakpoints"). CSS writes them as
// @media (--desktop) and the build writes the query back in (postcss-custom-media). A name is camelCase here and
// kebab-case in CSS: belowDesktop is (--below-desktop).
// A one-part name can take more conditions ((--desktop) and (hover: hover)); a two-part one (fold) can't:
// the plugin turns that into a tangle of stand-in rules, so write such a query out in full.
// The three a page script hands to matchMedia are exports of their own: a script imports the one it asks about, so
// the table below (13 queries, for the CSS) stays out of the site's script.
export const PHONE = '(width < 43.75em)';
export const TABLET_UP = '(width >= 43.75em)';
// a window too short for a header that stays put: its 4rem would be over 12% of the height (200% and 400% zoom, a
// phone on its side), so core.js lets it slide away while reading
export const SHORT_WINDOW = '(height < 33.5em)';

export const MEDIA = {
  // under 320px: a 390px phone at 200% text, or a 24px default font; the header, buttons and bands slim to fit
  tiny: '(width < 20em)',
  notTiny: '(width >= 20em)',
  smallPhone: '(width < 37.5em)',
  phone: PHONE,
  tabletUp: TABLET_UP,
  tablet: '(43.75em <= width < 68.75em)',
  belowDesktop: '(width < 68.75em)',
  // from 900px: room for a page's text and its picture side by side (service and project pages, the landscape hero)
  wide: '(width >= 56.25em)',
  desktop: '(width >= 68.75em)',
  fold: '(width >= 68.75em) and (height >= 43.75em)',
  // the Home hero's services menu (home/hero.css): shown from 800 tall, without its sublines up to 904
  foldMenu: '(width >= 68.75em) and (height >= 50em)',
  foldMenuShort: '(width >= 68.75em) and (50em <= height < 56.5em)',
  shortWindow: SHORT_WINDOW,
};

// The page's column (main .container, layout.css) as a query container named `column`: a block lays itself out by
// the room it has, not the window. CSS writes @container column (--col-medium); the build writes the query in
// (postcss.config.mjs). Each matches a window size above at the same window width, because the side margin
// (--gutter, tokens.css) grows evenly: 16px to a 567px window, 24px at 700px, 48px from 1100px. In rem: a query
// container's em is its own font size.
export const COLUMN = {
  colTiny: '(width < 18rem)', // window under 320px (tiny)
  colNotTiny: '(width >= 18rem)',
  colNarrow: '(width < 40.75rem)', // window under 700px (phone): one card a row
  colMedium: '(width >= 40.75rem)', // window from 700px (tabletUp)
  colWide: '(width >= 62.75rem)', // window from 1100px (desktop)
};
