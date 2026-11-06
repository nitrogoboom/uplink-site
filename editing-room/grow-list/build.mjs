// Builds the Grow option C mockup: section.html, the Home "We grow with you" section on a stand-in page, made from the
// site's own parts so it looks and moves like the site:
//   - CSS: tokens, fonts, base, layout, type, buttons, shared blocks, fold and grow.css, as the site loads them, with
//     the named screen sizes (@media (--desktop)) written out from src/lib/media.js, as postcss.config.mjs does.
//     Option C's own CSS (grow-list.css, here) goes on top in its own <style>, so the page can switch it off.
//   - Fonts: public/assets/fonts/*.woff2, embedded, so the page is one file that opens anywhere.
//   - Drawing: src/components/home/grow-world.svg, inlined as Grow.astro does (its <style> and id dropped).
//   - Copy: src/data/grow.json, into the same markup as Grow.astro, plus the step list.
//   - Script: src/scripts/grow.js as it is, with its core.js import swapped for the four helpers it uses, then
//     grow-list.js (here), which wires the list to it.
// Run from the project root: node editing-room/grow-list/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { MEDIA } from '../../src/lib/media.js';

const here = new URL('.', import.meta.url);
const root = new URL('../../', here);
const read = (p, base = root) => readFileSync(new URL(p, base), 'utf8');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const kebab = (n) => n.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const media = (css) => Object.entries(MEDIA).reduce((s, [n, q]) => s.replaceAll(`(--${kebab(n)})`, q), css);

// ---- CSS, in the site's cascade order (src/styles/global.css), only the files this section needs ----
const font = (f) => `url('data:font/woff2;base64,${readFileSync(new URL(`public/assets/fonts/${f}`, root)).toString('base64')}')`;
const fonts = read('src/styles/fonts.css').replace(/url\('\/assets\/fonts\/([^']+)'\)/g, (_m, f) => font(f));
const siteCss = ['tokens', 'base', 'layout', 'type', 'buttons', 'shared-blocks', 'fold']
  .map((n) => read(`src/styles/${n}.css`)).join('\n') + '\n' + read('src/components/home/grow.css');
const css = media(fonts + '\n' + siteCss);
const optionC = media(read('grow-list.css', here));
const left = (s) => !/@media\s*\(--/.test(s);
if (!left(css) || !left(optionC)) throw new Error('a named screen size was left unreplaced');

// ---- the section, as Grow.astro writes it, plus the list ----
const steps = JSON.parse(read('src/data/grow.json'));
const last = steps.length - 1;
const world = read('src/components/home/grow-world.svg').replace(/<style>[\s\S]*?<\/style>/g, '').replace(' id="plain"', '');
const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const section = `<section class="section fold grow-section" id="grow" aria-labelledby="grow-title">
  <div class="container">
    <div class="grow" data-steps="${steps.length}">
      <div class="section-head grow-head">
        <p class="eyebrow">Built to scale</p>
        <h2 id="grow-title">We grow with you</h2>
        <p class="lead">As your team spreads out, here's what to watch, and what we take care of.</p>
      </div>
      <!-- option C: the steps as a list, desktop only (grow-list.css). Same states as the dots. -->
      <ol class="grow-list" aria-label="Where your people work">
${steps.map((s, i) => `        <li><button type="button" class="grow-step" data-i="${i}" aria-pressed="false"><span class="grow-step-n">${i + 1}</span><span class="grow-step-t">${esc(s.place)}</span><span class="grow-step-m">Team of ${s.team}</span></button></li>`).join('\n')}
      </ol>
      <div class="grow-player">
        <div class="grow-stage" data-md-skip>
          <span class="grow-place" aria-hidden="true">${esc(steps[last].place)}</span>
          <span class="grow-team" aria-hidden="true">Team of ${steps[last].team}</span>
          ${world}
${steps.map((s, i) => s.tags.map((t, k) => `          <span class="grow-tag" aria-hidden="true" data-step="${i}" data-k="${k}" data-at="${t.at}" data-risk="${esc(t.risk)}" data-fix="${esc(t.fix)}"><span class="grow-tag-i">!</span><span class="grow-tag-t">${esc(t.risk)}</span></span>`).join('\n')).join('\n')}
          <button type="button" class="grow-play" aria-label="Pause">
            <svg class="grow-play-i" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" /></svg>
            <svg class="grow-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="49.5" pathLength="100" /></svg>
          </button>
        </div>
        <div class="grow-nav" role="group" aria-label="Where your people work" data-md-skip>
          <button type="button" class="iconbtn grow-step-btn" data-dir="-1" aria-label="Previous place">${icon('<path d="M15 6l-6 6 6 6"/>')}</button>
          <span class="grow-dots">
${steps.map((s, i) => `            <button type="button" class="grow-dot" data-i="${i}" aria-label="${i + 1} of ${steps.length}: ${esc(s.place)}" aria-pressed="false"><i class="pip"></i></button>`).join('\n')}
          </span>
          <button type="button" class="iconbtn grow-step-btn" data-dir="1" aria-label="Next place">${icon('<path d="M9 6l6 6-6 6"/>')}</button>
        </div>
      </div>
      <ol class="grow-cards">
${steps.map((s, i) => `        <li class="grow-card" data-i="${i}" data-place="${esc(s.place)}" data-team="${s.team}">
          <h3>${esc(s.title)}</h3>
          <div class="grow-rows">
            <div class="grow-row grow-watch"><span class="grow-lbl"><i></i>Watch for</span><p>${esc(s.watch)}</p></div>
            <div class="grow-row grow-handle"><span class="grow-lbl"><i></i>We handle</span><p>${esc(s.handle)}</p></div>
          </div>
        </li>`).join('\n')}
      </ol>
    </div>
  </div>
</section>`;

// ---- the script: grow.js unchanged, with core.js's helpers (the same code) in place of its import ----
const CORE = `const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const held = { on: false, ev: new EventTarget() };
function whenOnScreen(el, onChange) {
  if (!el || !('IntersectionObserver' in window)) return null;
  const io = new IntersectionObserver(([en]) => { el.classList.toggle('is-idle', !en.isIntersecting); if (onChange) onChange(en.isIntersecting); });
  io.observe(el);
  return io;
}`;
const growJs = read('src/scripts/grow.js');
const IMPORT = "import { $, $$, held, reduceMotion, whenOnScreen } from './core.js';";
if (!growJs.includes(IMPORT)) throw new Error("grow.js's core.js import changed: update CORE in build.mjs");
const script = growJs.replace(IMPORT, () => CORE) + '\n' + read('grow-list.js', here);

const page = read('template.html', here)
  .replace('/*CSS*/', () => css)
  .replace('/*OPTION-C*/', () => optionC)
  .replace('<!--SECTION-->', () => section)
  .replace('/*SCRIPT*/', () => script);
writeFileSync(new URL('section.html', here), page);
console.log(`section.html: ${(page.length / 1024).toFixed(0)} KB`);
