(function (r) {
  r.classList.add('js');
  const kept = (/** @type {string} */ k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  let t = kept('uplink.theme');
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  r.dataset.theme = t;
  const m = kept('uplink.motion');
  if (m === 'reduce' || (m !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches))
    r.dataset.motion = 'reduce';
  else if (m === 'full') r.dataset.motion = 'full';
  if (t === 'light') document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#E8EFF7');
})(document.documentElement);
