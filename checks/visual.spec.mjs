// Screenshot comparison: every page of the new build next to the old one, at phone, tablet and desktop, pixel by
// pixel. CI runs it on each pull request (new: the PR's build; old: the live site, i.e. main) and lists what changed in
// the run's summary, with the pictures as an artifact. It reports; it doesn't fail, because most changes are meant. A
// person looks at the list and says whether each one was.
// usage: npm run visual-diff -- OLD_URL NEW_URL [--strict] [--wide]
//   --strict fails if anything changed; --wide adds 1280 x 720 and 2560 x 1440 (the smallest and a big one-screen-per-
//   section desktop) for a layout change
// Drawings, photos and the footer map are masked (painted over in both shots): their animation frames differ run to
// run. Reduce Motion is on, so the page itself holds still. Writes out/visual/report.md and, for each page and size
// that changed, old, new and diff pictures (the diff shows changed pixels in red over a faded new shot).
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from '@playwright/test';
import { PNG } from 'pngjs';
import { ROOT, flag, lanes, pages, positional } from './lib.mjs';

const SIZES = [
  ['phone', 390, 844],
  ['tablet', 820, 1180],
  ['1440', 1440, 900],
  ...(flag('--wide')
    ? [
        ['1280', 1280, 720],
        ['2560', 2560, 1440],
      ]
    : []),
];
const MASK = 'img, picture, svg, video, canvas, .stage'; // anything that animates or loads its own picture
const OUT = join(ROOT, 'out/visual');
const NOISE = 24; // a difference below this (as grey, of the three channels' differences) is anti-aliasing, not a change

async function shot(ctx, url, file) {
  const pg = await ctx.newPage();
  await pg.goto(url);
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(800);
  await pg.screenshot({
    path: file,
    fullPage: true,
    caret: 'initial',
    animations: 'disabled',
    mask: [pg.locator(MASK)],
  });
  await pg.close();
}

// [share of pixels changed, box or null, note]. Pages of different heights are compared over the shorter one.
function compare(aFile, bFile, diffFile) {
  const a = PNG.sync.read(readFileSync(aFile)),
    b = PNG.sync.read(readFileSync(bFile));
  const note = a.height !== b.height ? `height ${a.height} -> ${b.height}px` : '';
  const w = Math.min(a.width, b.width),
    h = Math.min(a.height, b.height);
  const d = new PNG({ width: w, height: h });
  let changed = 0,
    top = -1,
    bottom = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * a.width + x) * 4,
        j = (y * b.width + x) * 4,
        k = (y * w + x) * 4;
      // the grey of the per-channel difference, as PIL's convert('L') weighs it
      const grey =
        (Math.abs(a.data[i] - b.data[j]) * 19595 +
          Math.abs(a.data[i + 1] - b.data[j + 1]) * 38470 +
          Math.abs(a.data[i + 2] - b.data[j + 2]) * 7471 +
          0x8000) >>
        16;
      const hit = grey > NOISE;
      if (hit) {
        changed++;
        if (top < 0) top = y;
        bottom = y + 1;
      }
      // red where changed, else the new shot faded 60% toward white
      d.data[k] = hit ? 230 : Math.round(b.data[j] * 0.4 + 153);
      d.data[k + 1] = hit ? 40 : Math.round(b.data[j + 1] * 0.4 + 153);
      d.data[k + 2] = hit ? 40 : Math.round(b.data[j + 2] * 0.4 + 153);
      d.data[k + 3] = 255;
    }
  }
  if (!changed && !note) return [0, null, ''];
  writeFileSync(diffFile, PNG.sync.write(d));
  return [changed / (w * h), changed ? [top, bottom] : null, note];
}

test('screenshots against the old build', async ({ browser }) => {
  test.setTimeout(1_800_000);
  const [old, neu] = positional.map((u) => u.replace(/\/$/, ''));
  if (!old || !neu) throw new Error('usage: npm run visual-diff -- OLD_URL NEW_URL [--strict] [--wide]');
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f));
  const paths = await pages(neu);
  const jobs = paths.flatMap((path) => SIZES.map((s) => [path, ...s]));
  const rows = (
    await lanes(jobs, 4, async ([path, size, w, h]) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
      const name = `${path.replace(/^\/|\/$/g, '').replaceAll('/', '_') || 'index'}-${size}`;
      const [a, b] = [join(OUT, `${name}-old.png`), join(OUT, `${name}-new.png`)];
      await shot(ctx, old + path, a);
      await shot(ctx, neu + path, b);
      await ctx.close();
      const [changed, box, note] = compare(a, b, join(OUT, `${name}-diff.png`));
      if (!box && !note) {
        rmSync(a);
        rmSync(b);
        return null;
      }
      const where = box ? `from ${box[0]}px down to ${box[1]}px` : '';
      return `| ${path} | ${size} | ${(changed * 100).toFixed(2)}% | ${[where, note].filter(Boolean).join(', ')} |`;
    })
  ).filter(Boolean);
  const head = `## Screenshot changes\n\n${old} (old) against ${neu} (new), ${paths.length} pages at ${SIZES.length} sizes.\n\n`;
  const body = rows.length
    ? '| Page | Size | Pixels changed | Where |\n| --- | --- | --- | --- |\n' +
      rows.join('\n') +
      '\n\nPictures (old, new, diff in red) are in the `visual-diff` artifact of this run.\n'
    : 'No visible change on any page.\n';
  writeFileSync(join(OUT, 'report.md'), head + body, 'utf8');
  console.log(head + body);
  if (flag('--strict') && rows.length) throw new Error(`${rows.length} page size(s) changed (--strict)`);
});
