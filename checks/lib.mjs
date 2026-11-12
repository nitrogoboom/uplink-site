// The smoke check's command-line arguments.
// scripts/check.mjs passes its arguments here, as JSON: `npm run smoke -- ADDRESS --old URL` gives ['ADDRESS', '--old', 'URL']
export const ARGS = JSON.parse(process.env.CHECK_ARGS || '[]');
const VALUED = new Set(['--old']); // options that take a value
export const flag = (name) => ARGS.includes(name);
export const option = (name, fallback) => (ARGS.includes(name) ? ARGS[ARGS.indexOf(name) + 1] : fallback);
export const positional = ARGS.filter((a, i) => !a.startsWith('--') && !VALUED.has(ARGS[i - 1]));
