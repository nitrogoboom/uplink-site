// What CI runs, on this machine, in one go (npm run ci): types, the build scripts' tests, lint, build, then the
// built site served the way Cloudflare serves it, checked in a browser (npm run verify: checks/site.spec.mjs,
// screenshots in out/) and for broken links (npm run verify:links). Not the screenshot comparison: CI runs that on pull
// requests only, and by hand it's npm run visual-diff -- https://uplink-site.johnoreilly.workers.dev http://localhost:8787.
// Stops at the first failure. Uses a server already on :8787 if there is one, else starts `wrangler dev` and stops it
// after. Needs Chromium for Playwright once: npx playwright install chromium.
import { spawn } from 'node:child_process';

const URL = 'http://localhost:8787/';

const run = (cmd) =>
  new Promise((done, fail) => {
    console.log(`\n> ${cmd}`);
    spawn(cmd, { shell: true, stdio: 'inherit' }).on('exit', (code) =>
      code === 0 ? done() : fail(new Error(`${cmd} failed (exit ${code})`)),
    );
  });

const up = () =>
  fetch(URL).then(
    (r) => r.ok,
    () => false,
  );

let server;
try {
  await run('npm run check');
  await run('npm test');
  await run('npm run lint');
  await run('npm run build');
  if (!(await up())) {
    console.log('\n> npx wrangler dev --port 8787');
    server = spawn('npx wrangler dev --port 8787', {
      shell: true,
      stdio: 'ignore',
      detached: process.platform !== 'win32',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
    if (!(await up())) throw new Error(`no server at ${URL} after 60 s`);
  }
  await run('npm run verify');
  await run('npm run verify:links');
  console.log('\nAll checks passed.');
} catch (e) {
  console.error(`\n${e.message}`);
  process.exitCode = 1;
} finally {
  // shell: true puts wrangler under a shell, so stop the whole tree (its own process group off Windows)
  if (server) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    else process.kill(-server.pid);
  }
}
