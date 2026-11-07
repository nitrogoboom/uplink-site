// Which headings shrink to fit their column. A heading whose longest word has LONG letters or more ("Cybersecurity",
// "Ransomware-ready", "Everything") gets the class `fit`: its size is capped at --fit-long (14cqi, so a 13-letter
// word fits its column). Every other heading keeps its size step, capped only at --fit-short (21cqi, enough for a
// 9-letter word), which binds only with big text in a narrow column. tokens.css and base.css hold the sizes.
// Components call fit(text) on a heading's text at build time; checks/site.spec.mjs checks every page against it.

export const LONG = 10;

/** The letter count of the longest word in a heading's text (or HTML): hyphens and slashes split words. */
export const longest = (text) =>
  Math.max(0, ...String(text).replace(/<[^>]*>/g, ' ').split(/[\s\-‐–—/]+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length));

/** 'fit' for a heading with a long word, else undefined (class={fit(text)} then adds nothing). */
export const fit = (text) => (longest(text) >= LONG ? 'fit' : undefined);
