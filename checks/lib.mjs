// The smoke check's command-line arguments.
// scripts/check.mjs passes its arguments here, as JSON: `npm run smoke -- ADDRESS --preview` gives ['ADDRESS', '--preview']
export const ARGS = JSON.parse(process.env.CHECK_ARGS || '[]');
export const flag = (name) => ARGS.includes(name);
export const positional = ARGS.filter((a) => !a.startsWith('--'));
