// Types the page scripts' type check (tsconfig checkJs) needs and TypeScript's DOM library doesn't have yet.

// Trusted Types (Chromium and Safari; not Firefox): the one call core.js makes. A policy's TrustedHTML and
// TrustedScriptURL go where a string goes (innerHTML, insertAdjacentHTML, a script's src), so they're typed as strings.
interface Window {
  trustedTypes?: {
    createPolicy(
      name: string,
      rules: { createHTML?: (s: string) => string; createScriptURL?: (u: string) => string },
    ): { createHTML(s: string): string; createScriptURL(u: string): string };
  };
}
