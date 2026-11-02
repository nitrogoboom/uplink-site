// The SVGO settings for every drawing the site ships: scripts/svgo.mjs runs them on dist/assets/img/ after the
// build, and Grow.astro on the tower it inlines into Home (inlined drawings never reach dist/assets/img/).
// What must survive, so a few SVGO defaults are off:
//   ids and classes        home.js, the hero CSS and the footer find parts by them (cleanupIds, collapseGroups)
//   <style> as written     the embedded fonts, and rules for classes the scripts add later, like .is-on
//                          (minifyStyles would drop those as unused; inlineStyles would write style="" attributes,
//                          which the CSP blocks)
//   hidden parts           display="none" paths the hero shows from script, the tower's r="0" anchor circles
//                          (removeHiddenElems)
// (SVGO 4 keeps the viewBox on its own.)
/** @type {import('svgo').Config} */
export const SVGO = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          collapseGroups: false,
          minifyStyles: false,
          inlineStyles: false,
          removeHiddenElems: false,
          mergeStyles: false,
        },
      },
    },
  ],
};
