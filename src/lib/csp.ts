// The Content Security Policy is one header in public/_headers, shipped as written (docs/security.md). It lets an
// inline <script> run only by its hash, and nothing writes that hash for us, so a page that carries an inline script
// passes its text through here: a script the header doesn't name would be refused by every browser, so the build
// stops instead and prints the hash to put in the header. Data blocks (JSON-LD, <Words>) run nothing and need none.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// from the project root, where `astro dev` and `astro build` run
const HEADERS = 'public/_headers';
const policy = readFileSync(HEADERS, 'utf8');

export const inlineScript = (text: string, name: string) => {
  const hash = `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
  if (!policy.includes(hash))
    throw new Error(
      `${HEADERS}: the Content-Security-Policy doesn't name ${name} as it is now. In script-src, put ${hash} in place of its old hash.`,
    );
  return text;
};
