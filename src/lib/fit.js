// Which headings shrink to fit their column. A heading whose longest word has LONG letters or more ("Cybersecurity",
// "Ransomware-ready", "Everything") gets the class `fit`: its size is capped at --fit-long (14cqi, so a 13-letter
// word fits its column). Every other heading keeps its size step, capped only at --fit-short (21cqi, enough for a
// 9-letter word), which binds only with big text in a narrow column. One whose words are all SHORT letters or fewer
// ("Talk to a real person") may get the class fit-loose (30cqi), so a narrow column doesn't shrink it needlessly.
// tokens.css and base.css hold the sizes. Components call fit(text) on a heading's text at build time;
// checks/site.spec.mjs fails a long-word heading without the class fit.

export const LONG = 10;
export const SHORT = 6;

/** The letter count of the longest word in a heading's text (or HTML): hyphens and slashes split words.
 * @param {unknown} text */
export const longest = (text) =>
  Math.max(0, ...String(text).replace(/<[^>]*>/g, ' ').split(/[\s\-‐–—/]+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length));

/** 'fit' for a heading with a long word, 'fit-loose' for one of short words only, else undefined (no class).
 * @param {unknown} text */
export const fit = (text) => {
  const n = longest(text);
  return n >= LONG ? 'fit' : n <= SHORT ? 'fit-loose' : undefined;
};
