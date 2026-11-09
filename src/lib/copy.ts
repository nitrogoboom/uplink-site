// Reads the site's words: src/data/copy/NAME.yaml, checked against its schema (src/lib/copy-schema.ts) when the build
// loads it (content.config.ts). In a component:  const t = await copy('home');  then  {t.hero.title}.
// What it gives back throws on a key the file doesn't have (t.hero.titel), so a typo in a component stops the build
// as one in the YAML does, instead of leaving the words out. fill() fills a template's {names}.
import { getEntry } from 'astro:content';
import type { Copy, CopyName } from './copy-schema';
export { fill } from './fill.js';

// keys that code probes for without meaning a word (a promise's then, JSON.stringify's toJSON)
const PASS = new Set(['then', 'toJSON', 'toPrimitive', '$$typeof', 'asymmetricMatch', 'nodeType']);
const strict = <T>(value: T, where: string): T => {
  if (typeof value !== 'object' || value === null) return value;
  return new Proxy(value, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !(key in target) && !PASS.has(key))
        throw new Error(`copy: ${where} has no "${key}" (the key's spelling, or src/data/copy/ and copy-schema.ts)`);
      return strict(Reflect.get(target, key, receiver) as unknown, `${where}.${String(key)}`);
    },
  });
};

const entry = getEntry as (collection: string, id: string) => Promise<{ data: unknown } | undefined>;
export async function copy<N extends CopyName>(name: N): Promise<Copy<N>> {
  const e = await entry(`copy-${name}`, name);
  if (!e) throw new Error(`src/data/copy/${name}.yaml is missing`);
  return strict(e.data as Copy<N>, `${name}.yaml`);
}

// Words a page script reads in the browser go in a <script type="application/json"> (components/Words.astro): no
// script runs from it, so the CSP needs no hash for it. < is escaped, so the text can never close the block early.
export const wordsJson = (words: unknown) => JSON.stringify(words).replace(/</g, '\\u003c');
