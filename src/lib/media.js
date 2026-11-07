// The screen sizes the layout changes at, named once. CSS writes them as @media (--desktop): the build writes each
// name's query back in (postcss.config.mjs, postcss-custom-media), so the browser gets plain media queries. The page
// scripts import MEDIA and hand it to matchMedia. A name is camelCase here and kebab-case in CSS: belowDesktop is
// (--below-desktop). One-off tweaks (56.25em, aspect ratios, a picture's crop) stay written out where they are used.
// A one-part name can take more conditions ((--desktop) and (hover: hover)); a two-part one (fold) can't:
// the plugin turns that into a tangle of stand-in rules, so write such a query out in full.
// Sizes are in em: 16px each at the browser's default font size. In a media query 1em is that default, never the
// page's root font size, so a visitor's bigger default font, and zoom, count as a narrower screen. Range syntax:
// (width < 43.75em) is everything below 700px, fractions included.
//   phone < 700px (43.75em), tablet 700-1099px, desktop >= 1100px (68.75em).
//   fold         a desktop screen tall enough for one section per screen (fold.css). Text keeps the visitor's size there
//                too; the page width, section padding and pictures follow the screen (tokens.css).
//   smallPhone   < 600px (37.5em): where the drawings switch to their phone cut (compact-cuts.css, the home hero's).
export const MEDIA = {
  smallPhone: '(width < 37.5em)',
  phone: '(width < 43.75em)',
  tabletUp: '(width >= 43.75em)',
  tablet: '(43.75em <= width < 68.75em)',
  belowDesktop: '(width < 68.75em)',
  desktop: '(width >= 68.75em)',
  fold: '(width >= 68.75em) and (height >= 43.75em)',
};
