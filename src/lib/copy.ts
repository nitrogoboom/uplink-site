// Reads the site's words: src/content/<language>/copy/NAME.yaml. In a component:
// const t = await copy('home', Astro.currentLocale);  then  {t.hero.title}. The YAML is the only place a key is
// written: to add a string, add it there and read it. What copy() gives back throws on a key the file doesn't have
// (t.hero.titel), so a typo in a component stops the build, with the file and the key's path, instead of leaving the
// words out. Another language's file is laid over the default's, so a key it hasn't translated yet shows in English.
// fill() fills a template's {names}.
import { getCollection } from 'astro:content';
import { DEFAULT_LOCALE, localeOf } from './i18n';
export { fill } from './fill.js';

// Any key, any depth: the YAML declares the keys, and strict() below catches one it doesn't have. A value is typed
// as a text, a list and a group at once, so t.hero.title, t.stats.map(…) and fill(t.dot, …) all type-check.
export type Words = string & readonly Words[] & { readonly [key: string]: Words };

// keys that code probes for without meaning a word (a promise's then, JSON.stringify's toJSON)
const PASS = new Set(['then', 'toJSON', 'toPrimitive', '$$typeof', 'asymmetricMatch', 'nodeType']);
const strict = (value: unknown, where: string): unknown => {
  if (typeof value !== 'object' || value === null) return value;
  return new Proxy(value, {
    get(target, key, receiver) {
      if (typeof key === 'string' && !(key in target) && !PASS.has(key))
        throw new Error(`copy: ${where} has no "${key}" (check the key's spelling, or add it to src/content/en/copy/)`);
      return strict(Reflect.get(target, key, receiver), `${where}.${String(key)}`);
    },
  });
};

// A key named like a text or list method (sub, join, filter, length…) takes that method's type, so a typo in it would
// pass the type check: such a key stops the build here instead.
const BUILT_IN = new Set([
  ...Object.getOwnPropertyNames(String.prototype),
  ...Object.getOwnPropertyNames(Array.prototype),
]);
const noBuiltInKeys = (value: unknown, where: string): void => {
  if (typeof value !== 'object' || value === null) return;
  for (const [key, inner] of Object.entries(value)) {
    if (!Array.isArray(value) && BUILT_IN.has(key))
      throw new Error(`copy: ${where} has a key named "${key}", like a built-in method; rename it`);
    noBuiltInKeys(inner, `${where}.${key}`);
  }
};

// one language's words over another's: groups merge key by key, anything else (a text, a list) is replaced whole
const over = (base: unknown, own: unknown): unknown =>
  base && own && typeof base === 'object' && typeof own === 'object' && !Array.isArray(base) && !Array.isArray(own)
    ? Object.fromEntries(
        [...new Set([...Object.keys(base), ...Object.keys(own)])].map((k) => [
          k,
          k in own
            ? over((base as Record<string, unknown>)[k], (own as Record<string, unknown>)[k])
            : (base as Record<string, unknown>)[k],
        ]),
      )
    : own;

export async function copy(name: string, current: string | undefined): Promise<Words> {
  const locale = localeOf(current);
  const files = await getCollection('copy'); // looked up in the list: a file a language doesn't have is no warning
  const base = files.find((f) => f.id === `${DEFAULT_LOCALE}/${name}`);
  if (!base) throw new Error(`src/content/${DEFAULT_LOCALE}/copy/${name}.yaml is missing`);
  const own = locale === DEFAULT_LOCALE ? undefined : files.find((f) => f.id === `${locale}/${name}`);
  const data: unknown = own ? over(base.data, own.data) : base.data;
  noBuiltInKeys(data, `${name}.yaml`);
  return strict(data, `${name}.yaml`) as Words;
}

// Words a page script reads in the browser go in a <script type="application/json"> (components/Words.astro): no
// script runs from it, so the CSP needs no hash for it. < is escaped, so the text can never close the block early.
export const wordsJson = (words: unknown) => JSON.stringify(words).replace(/</g, '\\u003c');

// The shape of those words, for the page scripts' casts (core.js's words()): only the keys the scripts read.
type Toast = { title: string; text: string };
export type UiWords = {
  toast: { dismiss: string; motionReduced: string; motionOn: string; booked: Toast; subscribed: Toast };
  emailError: string;
};
export type HomeWords = {
  grow: { play: { pause: string; play: string; again: string } };
};
export type ContactWords = { copied: string; selected: Toast; received: Toast };
export type SoonWords = { pageTitle: string; names: Record<string, string> };
