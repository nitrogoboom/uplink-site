// After Claude edits or writes a file in this repository, Prettier formats it (.claude/settings.json, PostToolUse).
// A file outside the repository, one Prettier ignores or one it can't parse is left as it is; the hook never stops
// the work.
import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import * as prettier from 'prettier';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = resolve(import.meta.dirname, '../..');
  const file = resolve(input.tool_input?.file_path ?? '');
  const inside = !relative(root, file).startsWith('..') && !isAbsolute(relative(root, file));
  const info = inside ? await prettier.getFileInfo(file, { ignorePath: resolve(root, '.prettierignore') }) : null;
  if (info && !info.ignored && info.inferredParser) {
    const before = readFileSync(file, 'utf8');
    const options = await prettier.resolveConfig(file);
    const after = await prettier.format(before, { ...options, filepath: file });
    if (after !== before) writeFileSync(file, after);
  }
} catch {
  // not a file, or a syntax error mid-edit: leave it for the next edit or npm run lint
}
