// The {name} placeholders in the hand-written Markdown ({privacy}, {phone}, {street} …; values: PLACEHOLDERS in
// src/lib/footer.ts), so a changed phone number or inbox changes everywhere at once.
//   fill(text, values, where)   fills a string; a name with no value throws, naming the file (where)
//   placeholders(values)        a Sätteri mdast plugin (astro.config.mjs) for the Markdown Astro renders
//                               (src/data/privacy.md, accessibility.md). It fills text and link addresses in the
//                               syntax tree, so each value is escaped like any other text when the page is written.
// A placeholder inside a link's address is {name} in the tree; %7Bname%7D, its encoded spelling, is filled too.
// TextPage.astro then refuses a page with either spelling left (one in raw HTML, which the plugin doesn't read).
import { fileURLToPath } from 'node:url';

export const PLACEHOLDER = /\{([a-z]+)\}|%7B([a-z]+)%7D/gi;

/**
 * @param {string} text
 * @param {Record<string, string>} values
 * @param {string} where  the file, for the error
 */
export function fill(text, values, where) {
  return text.replace(PLACEHOLDER, (_, plain, encoded) => {
    const name = plain ?? encoded;
    if (!Object.hasOwn(values, name)) {
      throw new Error(`${where}: no value for the placeholder {${name}} (known: ${Object.keys(values).join(', ')}; src/lib/placeholders.mjs)`);
    }
    return values[name];
  });
}

/** @param {Record<string, string>} values */
export const placeholders = (values) => {
  /** @param {{ fileURL?: URL }} ctx */
  const where = (ctx) => (ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'Markdown');
  /** @type {(key: 'value' | 'url') => (node: any, ctx: any) => void} */
  const filler = (key) => (node, ctx) => {
    const filled = fill(node[key], values, where(ctx));
    if (filled !== node[key]) ctx.setProperty(node, key, filled);
  };
  return { name: 'uplink-placeholders', text: filler('value'), link: filler('url'), definition: filler('url') };
};
