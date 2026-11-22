// A CSP hash for an inline <script> or <style> a page writes itself (is:inline). Astro hashes what it bundles; a page
// adds its own with Astro.csp.insertScriptHash(sha256(text)) or insertStyleHash, and writes the same text with set:html.
import { createHash } from 'node:crypto';
export const sha256 = (text: string) => `sha256-${createHash('sha256').update(text).digest('base64')}` as const;
