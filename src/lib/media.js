// The screen sizes the layout changes at, named once. CSS writes them as @media (--desktop): the build writes each
// name's query back in (postcss.config.mjs, postcss-custom-media), so the browser gets plain media queries. The page
// scripts import MEDIA and hand it to matchMedia. A name is camelCase here and kebab-case in CSS: belowDesktop is
// (--below-desktop). One-off tweaks (900px, aspect ratios, a picture's crop) stay written out where they are used.
// A one-part name can take more conditions ((--desktop) and (hover: hover)); a two-part one (tablet, fold) can't:
// the plugin turns that into a tangle of stand-in rules, so write such a query out in full.
//   phone < 700, tablet 700-1099, desktop >= 1100.
//   fold         a desktop screen tall enough for one section per screen (fold.css; the root font scales, tokens.css).
//   smallPhone   < 600: where the drawings switch to their phone cut (compact-cuts.css, the home hero's phone cut).
export const MEDIA = {
  smallPhone: '(max-width: 599px)',
  phone: '(max-width: 699px)',
  tabletUp: '(min-width: 700px)',
  tablet: '(min-width: 700px) and (max-width: 1099px)',
  belowDesktop: '(max-width: 1099px)',
  desktop: '(min-width: 1100px)',
  fold: '(min-width: 1100px) and (min-height: 700px)',
};
