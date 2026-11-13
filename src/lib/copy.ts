// Reads the site's words: src/data/copy/en/NAME.yaml, each its own collection (content.config.ts). In a component:
// const t = await copy('home');  then  {t.hero.title}. The YAML is the only place a key is written: to add a string,
// add it there and read it. What copy() gives back throws on a key the file doesn't have (t.hero.titel), so a typo
// in a component stops the build, with the file and the key's path, instead of leaving the words out.
// fill() fills a template's {names}.
import { getEntry } from 'astro:content';
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
        throw new Error(`copy: ${where} has no "${key}" (check the key's spelling, or add it to src/data/copy/en/)`);
      return strict(Reflect.get(target, key, receiver), `${where}.${String(key)}`);
    },
  });
};

const entry = getEntry as (collection: string, id: string) => Promise<{ data: unknown } | undefined>;
export async function copy(name: string): Promise<Words> {
  const e = await entry(`copy-${name}`, name);
  if (!e) throw new Error(`src/data/copy/en/${name}.yaml is missing`);
  return strict(e.data, `${name}.yaml`) as Words;
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
type App = { name: string; state: string; detail: string };
export type HomeWords = {
  cloud: { title: string; apps: Record<'mail' | 'files' | 'meet' | 'chat' | 'cal' | 'secure', App> };
  grow: { play: { pause: string; play: string; again: string } };
};
export type ContactWords = { copied: string; selected: Toast; received: Toast };
export type SoonWords = { pageTitle: string; names: Record<string, string> };
