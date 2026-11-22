// /version.txt: the git commit this build was made from (7 characters, as git log --oneline shows it), so one request
// to the live site tells whether it serves a given push. CI sets GITHUB_SHA; a build on this machine says "local".
import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(`${process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
