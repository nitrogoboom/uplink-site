// What CI runs, on this machine, in one go (npm run ci): types, the build scripts' tests, lint, build, then the
// built site served the way Cloudflare serves it, checked in a browser (npm run verify: checks/site.spec.mjs and
// checks/zoom.spec.mjs, screenshots in out/), for broken links (npm run verify:links) and for its headers (npm run smoke
// against the local server). Not the screenshot comparison: CI runs that on pull requests only, and by hand it's
// npm run visual-diff -- https://uplink-site.johnoreilly.workers.dev http://localhost:8787.
// Steps that don't depend on each other run side by side: the tests and lint beside the type check and the build; then
// the site check, and the link and smoke checks together, against one server. Each step's output is printed whole when it ends, with its time (the site
// check's as it comes); any
// failure fails the run (the others still finish, so you see every failure at once).
// Starts its own `wrangler dev` on a free port for the checks, so a server you already have on :8787 (perhaps serving
// an older build) is never what gets checked, and stops it after.
// Needs Chromium for Playwright once: npx playwright install chromium.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const t0 = Date.now();
const secs = (t) => `${((Date.now() - t) / 1000).toFixed(1)} s`;

// one command, its output kept and printed in one piece when it ends
// (live: printed as it comes, for the long site check)
const run = (cmd, live = false) =>
  new Promise((done, fail) => {
    const t = Date.now();
    let out = '';
    if (live) console.log(`\n> ${cmd}`);
    const c = spawn(cmd, { shell: true, stdio: live ? 'inherit' : 'pipe', env: { ...process.env, FORCE_COLOR: process.stdout.isTTY ? '1' : '0' } });
    c.stdout?.on('data', (d) => (out += d));
    c.stderr?.on('data', (d) => (out += d));
    c.on('exit', (code) => {
      console.log(`\n> ${cmd}  (${secs(t)}${code === 0 ? '' : `, exit ${code}`})${live ? '' : '\n' + out.trimEnd()}`);
      if (code === 0) done();
      else fail(new Error(`${cmd} failed (exit ${code})`));
    });
  });
// commands side by side; fails once all have ended, naming each that failed
const all = async (...steps) => {
  const r = await Promise.allSettled(steps.map((s) => (typeof s === 'string' ? run(s) : s())));
  const bad = r.filter((x) => x.status === 'rejected').map((x) => x.reason.message);
  if (bad.length) throw new Error(bad.join('\n'));
};

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
  // astro check and astro build both write .astro/, so they take turns; the tests and lint don't touch the build
  await all(
    async () => {
      await run('npm run check');
      await run('npm run build');
    },
    'npm test',
    'npm run lint',
  );
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
  // one after another: the site check keeps every core busy, and the link check beside it ran Windows out of sockets
  // (ERR_NO_BUFFER_SPACE); the two short ones take a few seconds on their own
  await run(`npm run verify -- --base ${base}`, true);
  await all(`npm run verify:links -- --base ${base}`, `npm run smoke -- ${base}`);
  console.log(`\nAll checks passed (${secs(t0)}).`);
} catch (e) {
  console.error(`\n${e.message}\n(${secs(t0)})`);
  process.exitCode = 1;
} finally {
  // shell: true puts wrangler under a shell, so stop the whole tree (its own process group off Windows)
  if (server) {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
    else process.kill(-server.pid);
  }
}
