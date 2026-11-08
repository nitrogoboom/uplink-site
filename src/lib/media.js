// The screen sizes the layout changes at, named once (src/README.md, "Breakpoints"). CSS writes them as
// @media (--desktop) and the build writes the query back in (postcss-custom-media); page scripts hand MEDIA to
// matchMedia. A name is camelCase here and kebab-case in CSS: belowDesktop is (--below-desktop).
// A one-part name can take more conditions ((--desktop) and (hover: hover)); a two-part one (fold) can't:
// the plugin turns that into a tangle of stand-in rules, so write such a query out in full.
export const MEDIA = {
  smallPhone: '(width < 37.5em)',
  phone: '(width < 43.75em)',
  tabletUp: '(width >= 43.75em)',
  tablet: '(43.75em <= width < 68.75em)',
  belowDesktop: '(width < 68.75em)',
  desktop: '(width >= 68.75em)',
  fold: '(width >= 68.75em) and (height >= 43.75em)',
};
