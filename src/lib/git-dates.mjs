// When a page's source files were first added and last changed, from git history: the sitemap's <lastmod>
// (allPages() in site.ts) and a case study's datePublished and dateModified (docs/ops.md, "Search engines").
// A shallow clone (git clone --depth N) stops at a cut-off commit that seems to add every file, so its dates would
// all be that commit's: the history is checked once, before any date is read (CI: the build stops; elsewhere: one
// warning, and no dates).
import { execFileSync } from 'node:child_process';

/** @type {(args: string[], cwd?: string) => string} */
const git = (args, cwd) =>
  execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** @type {Map<string, boolean>} */
const verdicts = new Map(); // cwd → true (dates can be trusted) or false (left out), checked once per folder

/**
 * Whether the folder's git history is whole. Throws in CI when it isn't; warns once otherwise.
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, warn?: (message: string) => void }} [opts]
 */
export function fullHistory({ cwd = process.cwd(), env = process.env, warn = console.warn } = {}) {
  if (verdicts.has(cwd)) return verdicts.get(cwd);
  let problem = '';
  try {
    if (git(['rev-parse', '--is-shallow-repository'], cwd) === 'true')
      problem = 'the git history is shallow (a --depth clone)';
  } catch {
    problem = 'this is not a git checkout';
  }
  if (problem && env.CI) {
    throw new Error(
      `dates: ${problem}, so every sitemap <lastmod> and case-study date would be wrong. ` +
        'Build from a full clone: actions/checkout with fetch-depth: 0, or git fetch --unshallow (src/lib/git-dates.mjs).',
    );
  }
  if (problem)
    warn(
      `dates: ${problem}; the build leaves out the sitemap's <lastmod> and the case studies' dates. git fetch --unshallow puts them back.`,
    );
  verdicts.set(cwd, !problem);
  return !problem;
}

/**
 * ISO date (YYYY-MM-DD) of the last commit that touched any of the paths; undefined if none did or the history
 * can't be trusted.
 * @param {string[]} paths
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, warn?: (message: string) => void }} [opts]
 * @returns {string | undefined}
 */
export function lastmod(paths, opts = {}) {
  if (!fullHistory(opts)) return undefined;
  const out = git(['log', '-1', '--format=%cI', '--', ...paths], opts.cwd ?? process.cwd());
  return out ? out.slice(0, 10) : undefined;
}

/**
 * ISO date of the oldest commit that added any of the paths; undefined as for lastmod().
 * @param {string[]} paths
 * @param {{ cwd?: string, env?: Record<string, string | undefined>, warn?: (message: string) => void }} [opts]
 * @returns {string | undefined}
 */
export function created(paths, opts = {}) {
  if (!fullHistory(opts)) return undefined;
  const out = git(['log', '--diff-filter=A', '--format=%cI', '--', ...paths], opts.cwd ?? process.cwd());
  return out ? out.split('\n').pop()?.slice(0, 10) : undefined;
}

/**
 * A service's or project's own entry file: the one file its page's dates come from.
 * @param {'services' | 'projects'} collection
 * @param {string} id
 */
export const entryFile = (collection, id) => `src/content/${collection}/${id}.json`;
