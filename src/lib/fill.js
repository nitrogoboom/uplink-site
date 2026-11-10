// Fills a copy template's {names} (src/data/copy/en/*.yaml: "Team of {n}", "Questions about {service}"). The pages call
// it at build time and the page scripts in the browser, so both say it the same way. A name with no value throws:
// a template and its caller have drifted apart. The schemas (src/lib/copy-schema.ts) check each template's names.

/**
 * @param {string} template
 * @param {Record<string, string | number>} values
 * @returns {string}
 */
export const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (/** @type {string} */ _, /** @type {string} */ name) => {
    const v = name in values ? values[name] : undefined;
    if (v === undefined) throw new Error(`copy: no value for {${name}} in "${template}"`);
    return String(v);
  });
