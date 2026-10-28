"""Home page touch-up mockup. Doesn't touch site/.

    python mockups/home-touchup/make.py
    python tools/serve.py 8772 .
    open http://localhost:8772/mockups/home-touchup/

Copies the built site/index.html into this folder, points its links and
assets back at site/, and adds touchup.css on top. The "Touch-up" switch
in the corner turns the layer on and off to compare. Rerun after a build.
"""
import os
import re

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))

html = open(os.path.join(root, 'site', 'index.html'), encoding='utf-8').read()

# assets and links resolve against site/ (fonts use root paths, so move those too)
html = html.replace('<head>', '<head>\n<base href="/site/">', 1)
html = re.sub(r"url\((['\"]?)/assets/", r"url(\1/site/assets/", html)

switch = """
<link id="touchup" rel="stylesheet" href="/mockups/home-touchup/touchup.css">
<style>
  #touchup-switch { position: fixed; z-index: 99; right: 12px; bottom: 12px; padding: 8px 12px;
    font: 600 13px/1 system-ui, sans-serif; color: #fff; background: #000c; border: 1px solid #fff4; border-radius: 4px; cursor: pointer; }
</style>
"""
toggle = """
<button id="touchup-switch" type="button" aria-pressed="true">Touch-up: on</button>
<script>
  (function () {
    var b = document.getElementById('touchup-switch'), l = document.getElementById('touchup');
    if (new URLSearchParams(location.search).get('touchup') === 'off') l.disabled = true;
    function show() { b.textContent = 'Touch-up: ' + (l.disabled ? 'off' : 'on'); b.setAttribute('aria-pressed', String(!l.disabled)); }
    b.addEventListener('click', function () { l.disabled = !l.disabled; show(); });
    show();
  })();
</script>
"""
html = html.replace('</head>', switch + '</head>', 1)
html = html.replace('</body>', toggle + '</body>', 1)

open(os.path.join(here, 'index.html'), 'w', encoding='utf-8').write(html)
print('wrote mockups/home-touchup/index.html')
