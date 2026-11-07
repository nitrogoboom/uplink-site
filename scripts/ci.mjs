// What CI runs, on this machine, in one go (npm run ci): types, the build scripts' tests, lint, build, then the
// built site served the way Cloudflare serves it, checked in a browser (npm run verify: checks/site.spec.mjs,
// screenshots in out/), for broken links (npm run verify:links) and for its headers (npm run smoke against the local
// server). Not the screenshot comparison: CI runs that on pull requests only, and by hand it's
// npm run visual-diff -- https://uplink-site.johnoreilly.workers.dev http://localhost:8787.
// Stops at the first failure. Starts its own `wrangler dev` on a free port for the checks, so a server you already
// have on :8787 (perhaps serving an older build) is never what gets checked, and stops it after.
// Needs Chromium for Playwright once: npx playwright install chromium.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const run = (cmd) =>
  new Promise((done, fail) => {
    console.log(`\n> ${cmd}`);
    spawn(cmd, { shell: true, stdio: 'inherit' }).on('exit', (code) =>
      code === 0 ? done() : fail(new Error(`${cmd} failed (exit ${code})`)),
    );
  });

// a port nothing is listening on: the system picks one, and it's freed again for wrangler
const freePort = () =>
  new Promise((done, fail) => {
    const s = createServer();
    s.unref();
    s.on('error', fail);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => done(port));
    });
  });

let server;
try {
  await run('npm run check');
  await run('npm test');
  await run('npm run lint');
  await run('npm run build');
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const up = () =>
    fetch(base + '/').then(
      (r) => r.ok,
      () => false,
    );
  console.log(`\n> npx wrangler dev --port ${port}`);
  server = spawn(`npx wrangler dev --port ${port} --inspector-port 0`, {
    shell: true,
    stdio: 'ignore',
    detached: process.platform !== 'win32',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await up())) throw new Error(`no server at ${base} after 60 s`);
  await run(`npm run verify -- --base ${base}`);
  await run(`npm run verify:links -- --base ${base}`);
  await run(`npm run smoke -- ${base}`);
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
