/* ==========================================================================
   Uplink Technology · footer (every page)
   Hero-select roster and campus map.
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, reduceMotion, toast } = window.Uplink;

  /* ======================================================================
     Footer: hero-select roster + campus map (every page)
     Each roster tile shows one panel. The panel's data-map names a spot on
     the map (hq, services, industries, company, support, resources,
     follow); the camera flies there and lights it up. The map is drawn
     here in true isometric: screen = ((x-y)·cos30·u, (x+y)·u/2 - z·u).
     ====================================================================== */
  const fc = $('.fc');
  if (fc) {
    const C30 = Math.cos(Math.PI / 6), U = 38;
    const pr = (x, y, z = 0) => [(x - y) * C30 * U, (x + y) * U / 2 - z * U];
    const pts = (a) => a.map((p) => pr(...p).map((n) => n.toFixed(1)).join(',')).join(' ');
    const box = (x, y, z, w, d, h, cls = 'b') => `<g class="${cls}">` +
      `<polygon class="f-l" points="${pts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}"/>` +
      `<polygon class="f-r" points="${pts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}"/>` +
      `<polygon class="f-t" points="${pts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}"/></g>`;
    const circ = (cx, cy, z, r, n = 56) => pts(Array.from({ length: n + 1 }, (_, i) => {
      const t = (i / n) * Math.PI * 2; return [cx + r * Math.cos(t), cy + r * Math.sin(t), z];
    }));
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const win = (quad) => {
      const lit = rnd() < 0.3, blink = lit && rnd() < 0.5;
      return `<polygon class="win${lit ? ' lit' : ''}${blink ? ' blink' : ''}"${blink ? ` style="animation-delay:${-(rnd() * 4).toFixed(2)}s"` : ''} points="${pts(quad)}"/>`;
    };
    // windows on the front-left wall (y = const) and front-right wall (x = const)
    const winsY = (x0, x1, y, z0, z1, cols, rows) => {
      let s = ''; const cw = (x1 - x0) / cols, rh = (z1 - z0) / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const a = x0 + c * cw + cw * 0.22, b = a + cw * 0.56, lo = z0 + r * rh + rh * 0.25, hi = lo + rh * 0.5;
        s += win([[a, y, lo], [b, y, lo], [b, y, hi], [a, y, hi]]);
      }
      return s;
    };
    const winsX = (x, y0, y1, z0, z1, cols, rows) => {
      let s = ''; const cw = (y1 - y0) / cols, rh = (z1 - z0) / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const a = y0 + c * cw + cw * 0.22, b = a + cw * 0.56, lo = z0 + r * rh + rh * 0.25, hi = lo + rh * 0.5;
        s += win([[x, a, lo], [x, b, lo], [x, b, hi], [x, a, hi]]);
      }
      return s;
    };
    const led = (x, y, z, cls = '') => {
      const [cx, cy] = pr(x, y, z);
      return `<circle class="led${cls}" style="animation-delay:${-(rnd() * 3).toFixed(2)}s" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.7"/>`;
    };
    const dot = (x, y, z) => { const [cx, cy] = pr(x, y, z); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3.5" fill="#F4A340"/>`; };
    const tree = (x, y, s = 0.5) => box(x, y, 0, s, s, s * 1.1, 'tree');
    const MARK = '<path d="M12 3l4 9-4 9-4-9z"/>';

    // the campus: one spot per kind of footer section
    const D = {
      hq: { name: 'Uplink HQ', sub: 'one team, one number', at: [8, 8], top: [8, 8, 7.45], r: 2.6, zoom: 1.12,
        draw: () => box(6, 6, 0, 4, 4, 0.55) + box(6.9, 6.9, 0.55, 2.2, 2.2, 5.3) +
          winsY(6.9, 9.1, 9.1, 0.8, 5.6, 3, 6) + winsX(9.1, 6.9, 9.1, 0.8, 5.6, 3, 6) +
          box(7.25, 7.25, 5.85, 1.5, 1.5, 0.35) +
          `<line x1="${pr(8, 8, 6.2)[0].toFixed(1)}" y1="${pr(8, 8, 6.2)[1].toFixed(1)}" x2="${pr(8, 8, 7.2)[0].toFixed(1)}" y2="${pr(8, 8, 7.2)[1].toFixed(1)}" stroke="#F4A340" stroke-width="1.6"/>` +
          `<polyline class="beacon" points="${circ(8, 8, 7.2, 0.7)}"/><polyline class="beacon" style="animation-delay:-1.2s" points="${circ(8, 8, 7.2, 0.7)}"/>` +
          dot(8, 8, 7.2) },
      services: { name: 'Server farm', sub: 'monitored around the clock', at: [12.8, 3.5], top: [12.8, 3.5, 2.4], r: 2.4, zoom: 1.35,
        route: [[10, 7.6], [12.9, 7.6], [12.9, 4.4]],
        draw: () => [0, 1, 2, 3].map((i) => {
          const x = 10.9 + i * 0.95; let s = box(x, 2.6, 0, 0.7, 1.8, 2.4);
          for (let k = 0; k < 6; k++) s += led(x + 0.35, 4.4, 0.4 + k * 0.33, k % 3 === 1 ? ' w2' : '');
          return s;
        }).join('') },
      resources: { name: 'Archive', sub: 'guides and checklists', at: [7, 2], top: [7, 2, 1.7], r: 1.8, zoom: 1.35,
        route: [[7.5, 6], [7.5, 2.9]],
        draw: () => box(4.9, 1.6, 0, 0.8, 0.8, 0.5) + [0, 0.58, 1.16].map((z) => {
          let s = box(6.1, 1.1, z, 1.8, 1.8, 0.45);
          for (let k = 0; k < 3; k++) s += led(6.5 + k * 0.4, 2.9, z + 0.22);
          return s;
        }).join('') },
      follow: { name: 'Broadcast', sub: 'news, alerts and how-tos', at: [2, 7], top: [2, 7, 5.3], r: 1.7, zoom: 1.35,
        route: [[6, 7.2], [2.5, 7.2]],
        draw: () => box(1.5, 6.5, 0, 1, 1, 0.4) + box(1.85, 6.85, 0.4, 0.3, 0.3, 2.6) +
          box(1.7, 6.7, 3.0, 0.6, 0.6, 0.12) + box(1.85, 6.85, 3.12, 0.3, 0.3, 1.88) +
          [0, -0.9, -1.8].map((d) => `<polyline class="sig" style="animation-delay:${d}s" points="${circ(2, 7, 5.0, 0.9)}"/>`).join('') +
          dot(2, 7, 5.0) },
      company: { name: 'The crew', sub: 'in-house, never outsourced', at: [3.6, 12.4], top: [3.6, 12.4, 2.3], r: 2.3, zoom: 1.35,
        route: [[7, 10], [7, 12.3], [5, 12.3]],
        draw: () => box(2.2, 11.4, 0, 2.8, 2, 1.6) + winsY(2.2, 5, 13.4, 0.2, 1.5, 5, 2) + winsX(5, 11.4, 13.4, 0.2, 1.5, 3, 2) +
          box(2.5, 11.7, 1.6, 0.55, 0.55, 0.55, 'tree') + box(3.4, 11.7, 1.6, 0.55, 0.55, 0.7, 'tree') + box(4.2, 12.5, 1.6, 0.5, 0.5, 0.5, 'tree') },
      support: { name: 'Help desk', sub: 'tickets in, fixes out', at: [13.7, 9.3], top: [13.7, 9.3, 4.4], r: 2.2, zoom: 1.35,
        route: [[10, 9.2], [12.7, 9.2]],
        draw: () => box(12.7, 8.3, 0, 2, 1.9, 2.1) + winsY(12.7, 14.7, 10.2, 0.2, 2.0, 3, 2) + winsX(14.7, 8.3, 10.2, 0.2, 2.0, 3, 2) +
          [[2.8, 1, 0], [3.35, 2, -0.6], [3.9, 3, -1.2]].map(([z, n, d]) =>
            `<g class="bob" style="animation-delay:${d}s">${box(13.15, 8.75, z, 1.1, 1.0, 0.12, 'tk tk-' + n)}</g>`).join('') },
      industries: { name: 'Client offices', sub: '120+ teams supported', at: [9.6, 13.6], top: [10.45, 12.9, 2.7], r: 2.4, zoom: 1.35,
        route: [[9, 10], [9, 12.6]],
        draw: () => box(8.2, 12.6, 0, 1.2, 1.2, 1.8) + winsY(8.2, 9.4, 13.8, 0.2, 1.7, 2, 3) +
          box(9.8, 12.4, 0, 1.3, 1.0, 2.6) + winsX(11.1, 12.4, 13.4, 0.2, 2.5, 2, 4) +
          box(8.6, 14.1, 0, 1.6, 1.0, 1.1) + winsY(8.6, 10.2, 15.1, 0.15, 1.0, 3, 2) +
          box(10.3, 13.7, 0, 1.0, 1.0, 1.4) + winsX(11.3, 13.7, 14.7, 0.15, 1.3, 2, 2) }
    };
    // back to front, checked with the painter-order tool
    const ORDER = ['resources', 'follow', 'services', 'company', 'hq', 'support', 'industries'];
    const VB0 = [-600, -120, 1200, 860];

    const buildMap = () => {
      seed = 7;
      let s = `<svg class="fc-w" viewBox="${VB0.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of the Uplink campus. The spot for the footer section you pick is lit up.">`;
      s += '<defs><filter id="fc-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>';
      s += `<ellipse class="shadow" cx="0" cy="${(pr(16, 16)[1] + 34).toFixed(1)}" rx="430" ry="38" filter="url(#fc-blur)"/>`;
      s += box(0, 0, -0.7, 16, 16, 0.7, 'plat') + '<g class="grid">';
      for (let k = 1; k < 16; k++) {
        const a = pr(k, 0), b = pr(k, 16), c = pr(0, k), d = pr(16, k);
        s += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/><line x1="${c[0].toFixed(1)}" y1="${c[1].toFixed(1)}" x2="${d[0].toFixed(1)}" y2="${d[1].toFixed(1)}"/>`;
      }
      s += `</g><polyline class="edge" points="${pts([[0, 16, 0], [16, 16, 0], [16, 0, 0]])}"/>`;
      s += `<polyline class="ring2" points="${circ(8, 8, 0, 3.6)}"/>`;
      ORDER.forEach((k) => {
        if (!D[k].route) return;
        const p = pts(D[k].route.map(([x, y]) => [x, y, 0]));
        s += `<polyline class="route" data-k="${k}" points="${p}"/><polyline class="flow" data-k="${k}" points="${p}"/>`;
      });
      s += '<polyline class="ring" points=""/>';
      s += tree(1.4, 1.6) + tree(2.4, 1.2, 0.4) + tree(1.2, 2.8, 0.45) + tree(14.6, 14.4) + tree(13.6, 14.9, 0.4) + tree(6.2, 15, 0.45) + tree(14.8, 1.4, 0.45);
      ORDER.forEach((k) => { s += `<g class="dist" data-k="${k}">${D[k].draw()}</g>`; });
      s += '<g class="mk"><g class="mk-bob"><line class="mk-line" x1="0" y1="14" x2="0" y2="52"/><polygon class="mk-d" points="0,-15 11,0 0,15 -11,0"/><polygon class="mk-i" points="0,-6 4.5,0 0,6 -4.5,0"/></g></g>';
      return s + '</svg>';
    };

    const mapBox = $('[data-fc-map]', fc);
    const hud = $('.fc-hud', fc);
    mapBox.insertAdjacentHTML('afterbegin', buildMap());
    const svg = $('svg.fc-w', mapBox), marker = $('.mk', svg), ring = $('.ring', svg);
    let vb = VB0.slice(), mk = [0, 0], raf = 0;

    const aim = (k) => {
      const d = D[k], top = pr(...d.top), ground = pr(d.at[0], d.at[1], 0);
      const w = VB0[2] / d.zoom, h = VB0[3] / d.zoom;
      const x = Math.min(Math.max((top[0] + ground[0]) / 2 - w / 2, VB0[0]), VB0[0] + VB0[2] - w);
      const y = Math.min(Math.max((top[1] + ground[1]) / 2 - h / 2, VB0[1]), VB0[1] + VB0[3] - h);
      return { vb: [x, y, w, h], mk: [top[0], top[1] - 52] };
    };
    const paint = () => {
      svg.setAttribute('viewBox', vb.map((n) => n.toFixed(1)).join(' '));
      marker.setAttribute('transform', `translate(${mk[0].toFixed(1)} ${mk[1].toFixed(1)})`);
    };
    const focusMap = (key, instant) => {
      const k = D[key] ? key : 'hq', d = D[k];
      $$('.dist', svg).forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      $$('.route, .flow', svg).forEach((g) => g.classList.toggle('on', g.dataset.k === k));
      ring.setAttribute('points', circ(d.at[0], d.at[1], 0.02, d.r));
      hud.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">${MARK}</svg><span><b>${d.name}</b><small>${d.sub}</small></span>`;
      const t = aim(k);
      window.cancelAnimationFrame(raf);
      if (instant || reduceMotion.matches) { vb = t.vb; mk = t.mk; paint(); return; }
      const v0 = vb.slice(), m0 = mk.slice(), t0 = performance.now(), dur = 700;
      const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = ease(p);
        vb = v0.map((a, i) => a + (t.vb[i] - a) * e);
        mk = m0.map((a, i) => a + (t.mk[i] - a) * e);
        paint();
        if (p < 1) raf = window.requestAnimationFrame(step);
      };
      raf = window.requestAnimationFrame(step);
    };

    // roster: tabs with arrow keys, plus the two key-cap buttons
    const tabs = $$('.fc-tile', fc);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    let cur = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    const select = (i, opts = {}) => {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === cur)); t.tabIndex = j === cur ? 0 : -1; });
      panels.forEach((p, j) => { p.classList.toggle('is-on', j === cur); p.classList.remove('is-in'); });
      if (!opts.instant) { void panels[cur].offsetWidth; panels[cur].classList.add('is-in'); }
      const roster = $('.fc-roster', fc), t = tabs[cur];
      roster.scrollTo({ left: t.offsetLeft - (roster.clientWidth - t.offsetWidth) / 2, behavior: opts.instant || reduceMotion.matches ? 'auto' : 'smooth' });
      if (opts.focus) t.focus({ preventScroll: true });
      focusMap(panels[cur].dataset.map, opts.instant);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    $('.fc-roster', fc).addEventListener('keydown', (e) => {
      const map = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(map[e.key], { focus: true });
    });
    $$('[data-fc-step]', fc).forEach((b) => b.addEventListener('click', () => select(cur + Number(b.dataset.fcStep), { focus: false })));

    // newsletter (prototype: nothing is sent)
    const nl = $('[data-fc-nl]', fc);
    if (nl) nl.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', nl), msg = $('[data-fc-nl-msg]', nl);
      if (!input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Enter an email like name@company.com.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      msg.textContent = 'One email a month. Threats to watch and fixes that matter.';
      nl.reset();
      toast({ title: 'Subscribed', text: 'Prototype form: nothing is sent yet.' });
    });

    // the section tracker would sit on top of the map: hide it while the footer fills the screen
    const tracker = $('.tracker');
    if (tracker && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => tracker.classList.toggle('is-off', en.intersectionRatio > 0.5), { threshold: [0, 0.5, 1] }).observe(fc);
    }

    fc.classList.add('fc-js');
    select(cur, { instant: true });
  }
})();
