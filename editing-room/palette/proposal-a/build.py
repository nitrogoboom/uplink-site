"""Proposal A: logo-locked palette.

Builds every colour from the logo blue's OKLCH hue, writes tokens.css and
preview.html, measures WCAG 2 / APCA / CVD, and fills the measured block
in notes.md (between the <!-- measured --> markers).

Run:  python build.py
"""
import math, re, os

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- colour maths
def s2l(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def l2s(c): c = max(0, min(1, c)); return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def hex2rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def rgb2hex(rgb): return '#' + ''.join('%02X' % max(0, min(255, round(x))) for x in rgb)

def lin2oklab(r, g, b):
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l, m, s = [math.copysign(abs(x) ** (1/3), x) for x in (l, m, s)]
    return (0.2104542553*l + 0.7936177850*m - 0.0040720468*s,
            1.9779984951*l - 2.4285922050*m + 0.4505937099*s,
            0.0259040371*l + 0.7827717662*m - 0.8086757660*s)

def hex2oklab(h): return lin2oklab(*[s2l(x) for x in hex2rgb(h)])
def hex2oklch(h):
    L, a, b = hex2oklab(h)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360

def oklch2lin(L, C, H):
    a = C * math.cos(math.radians(H)); b = C * math.sin(math.radians(H))
    l = (L + 0.3963377774*a + 0.2158037573*b) ** 3
    m = (L - 0.1055613458*a - 0.0638541728*b) ** 3
    s = (L - 0.0894841775*a - 1.2914855480*b) ** 3
    return [4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
            -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
            -0.0041960863*l - 0.7034186147*m + 1.7076147010*s]

def ingamut(L, C, H): return all(-1e-4 <= x <= 1 + 1e-4 for x in oklch2lin(L, C, H))

def oklch(L, C, H):
    """OKLCH -> hex, reducing chroma (never L or H) until it fits sRGB."""
    if not ingamut(L, C, H):
        lo, hi = 0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if ingamut(L, mid, H) else (lo, mid)
        C = lo
    return rgb2hex([l2s(x) * 255 for x in oklch2lin(L, C, H)])

def mix(fg, bg, a):
    """Composite fg at alpha a over bg (sRGB space, as browsers do)."""
    f, b = hex2rgb(fg), hex2rgb(bg)
    return rgb2hex([fv * a + bv * (1 - a) for fv, bv in zip(f, b)])

# WCAG 2
def lum(h): r, g, b = [s2l(x) for x in hex2rgb(h)]; return .2126*r + .7152*g + .0722*b
def wcag(a, b): x, y = sorted([lum(a), lum(b)]); return (y + .05) / (x + .05)

# APCA 0.0.98G-4g (W3 / Myndex constants)
def apca(txt, bg):
    def Y(h):
        r, g, b = [(x / 255) ** 2.4 for x in hex2rgb(h)]
        y = 0.2126729*r + 0.7151522*g + 0.0721750*b
        return y + (0.022 - y) ** 1.414 if y < 0.022 else y
    yt, yb = Y(txt), Y(bg)
    if abs(yb - yt) < 0.0005: return 0.0
    if yb > yt:
        s = (yb ** 0.56 - yt ** 0.57) * 1.14
        return 0.0 if s < 0.1 else (s - 0.027) * 100
    s = (yb ** 0.65 - yt ** 0.62) * 1.14
    return 0.0 if s > -0.1 else (s + 0.027) * 100

# CVD: Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear RGB
MACHADO = {
    'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deutan': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def cvd(h, kind):
    if kind == 'normal': return h.upper()
    lin = [s2l(x) for x in hex2rgb(h)]
    M = MACHADO[kind]
    out = [sum(M[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return rgb2hex([l2s(x) * 255 for x in out])
def de_ok(a, b):
    A, B = hex2oklab(a), hex2oklab(b)
    return 100 * math.dist(A, B)

# ---------------------------------------------------------------- hue plan
LOGO_BLUE, LOGO_CRIMSON = '#1F75A6', '#8D242E'
H_BLUE = hex2oklch(LOGO_BLUE)[2]          # 239.4, the key hue
H_COMP = (H_BLUE + 180) % 360             # 59.4, the complement
H_AMBER = (H_BLUE - 165) % 360            # 74.4: warm arm of a narrow split-complement
H_ALERT = (H_BLUE + 150) % 360            # 29.4: classic split arm, the red side
H_GREEN = (H_BLUE - 90) % 360             # 149.4: square relation to blue

STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
LS = [.975, .935, .875, .80, .72, .64, .56, .48, .40, .31, .225]   # same L for every ramp

def taper(L, Lpk):
    """Chroma falls off away from the ramp's peak lightness."""
    if L > Lpk: return 1 - 0.75 * ((L - Lpk) / (1 - Lpk)) ** 1.4
    return 1 - 0.5 * ((Lpk - L) / Lpk) ** 1.4

def ramp(H, Cpk, Lpk, drift=0.0, anchor=None):
    """11-step ramp. drift: degrees the hue turns by step 950 (dark end only)."""
    out = {}
    for st, L in zip(STEPS, LS):
        h = H - drift * max(0, (0.64 - L) / (0.64 - 0.225))
        out[st] = oklch(L, Cpk * taper(L, Lpk), h)
    if anchor:
        st, hx = anchor; out[st] = hx
    return out

def NC(L):
    """Neutral chroma: a visible blue tint, stronger in the darks."""
    return 0.006 + 0.03 * (1 - L)

RAMPS = {
    'neutral': {st: oklch(L, NC(L), H_BLUE) for st, L in zip(STEPS, LS)},
    'blue':    ramp(H_BLUE, 0.115, 0.56, anchor=(600, LOGO_BLUE)),
    'amber':   ramp(H_AMBER, 0.165, 0.80, drift=10),   # dark steps warm toward orange, never olive
    'green':   ramp(H_GREEN, 0.135, 0.78),
    'coral':   ramp(H_ALERT, 0.150, 0.70),
}
N, B, A, G, R = (RAMPS[k] for k in ('neutral', 'blue', 'amber', 'green', 'coral'))

def nL(L, extra=0.0):
    """A neutral at any lightness on the blue hue (for between-step surfaces)."""
    return oklch(L, NC(L) + extra, H_BLUE)

def rgba(h, a): r, g, b = hex2rgb(h); return f'rgb({r} {g} {b} / {a})'

# ---------------------------------------------------------------- tokens
# each value: hex string, or (hex, alpha) for translucent tokens
WHITE, BLACK = '#FFFFFF', '#000000'
DARK = {
    '--c-bg':        N[950],
    '--c-bg-band':   nL(0.245),
    '--c-solid':     nL(0.29, 0.004),
    '--c-surface':   (WHITE, 0.05),
    '--c-surface-2': (WHITE, 0.09),
    '--c-well':      (BLACK, 0.18),
    '--c-line':      (WHITE, 0.09),
    '--c-line-2':    (WHITE, 0.18),
    '--c-text':      N[50],
    '--c-muted':     nL(0.86),      # between 200 and 300: Lc 70+ for lead text
    '--c-accent':    A[300],
    '--c-on-accent': N[950],
    '--c-sky':       B[300],
    '--c-ok':        G[200],        # lighter than accent/sky ...
    '--c-alert':     oklch(0.76, 0.14, H_ALERT),  # ... and alert darker (between coral-300 and 400), so red/green and amber/red split by lightness under CVD
    '--c-accent-tint':  (A[300], 0.12),
    '--c-accent-faint': (A[300], 0.06),
    '--c-accent-ring':  (A[300], 0.35),
    '--c-sky-tint':     (B[300], 0.16),
    '--c-ok-tint':      (G[200], 0.16),
    '--c-ink-tint':     (N[950], 0.16),
    '--c-glass':        (N[950], 0.88),
    '--c-glass-2':      (nL(0.29, 0.004), 0.92),
    '--c-backdrop':     (nL(0.14), 0.62),
    '--c-glow-accent':  (A[300], 0.07),
    '--c-glow-sky':     (B[300], 0.09),
    '--c-glow-sky-2':   (B[300], 0.11),
    '--c-cool-surface':   (B[100], 0.05),
    '--c-cool-surface-2': (B[100], 0.10),
    '--c-cool-muted':     oklch(0.80, 0.045, H_BLUE),
    # drawing palette: top lightest, left mid, right darkest
    '--iso-top':        nL(0.47, 0.012),
    '--iso-left':       nL(0.39, 0.010),
    '--iso-right':      nL(0.335, 0.008),
    '--iso-edge':       N[100],
    '--iso-hi-top':     A[200],
    '--iso-hi-left':    A[400],
    '--iso-hi-right':   A[500],
    '--iso-hi-edge':    A[50],
    '--iso-sky-top':    B[200],
    '--iso-sky-right':  B[500],
    '--iso-green-top':  G[200],
    '--iso-green-mid':  G[500],
    '--iso-green-dark': G[600],
    '--iso-ground':     nL(0.255),
    '--iso-grid':       nL(0.33),
    '--iso-window':     nL(0.27),
    '--iso-light':      oklch(0.97, 0.03, H_AMBER),
    '--iso-shadow':     BLACK,
}

LIGHT = {
    '--c-bg':        N[50],
    '--c-bg-band':   nL(0.95),
    '--c-solid':     WHITE,
    '--c-surface':   (WHITE, 0.80),
    '--c-surface-2': (B[600], 0.08),
    '--c-well':      (N[900], 0.05),
    '--c-line':      (N[900], 0.12),
    '--c-line-2':    (N[900], 0.26),
    '--c-text':      N[950],
    '--c-muted':     N[700],
    '--c-accent':    None,          # picked below: lightest amber that carries text both ways
    '--c-on-accent': WHITE,
    '--c-sky':       B[700],         # one step under the logo blue: passes on its own tint
    '--c-ok':        G[800],         # darker than sky so the two hold apart under tritan
    '--c-alert':     oklch(0.53, 0.16, H_ALERT),  # between coral-600 and 700, full chroma: clearly red, still 4.9:1 on the band
    '--c-accent-tint':  None,
    '--c-accent-faint': None,
    '--c-accent-ring':  None,
    '--c-sky-tint':     (B[600], 0.08),
    '--c-ok-tint':      (G[800], 0.10),
    '--c-ink-tint':     (WHITE, 0.20),
    '--c-glass':        (N[50], 0.88),
    '--c-glass-2':      (WHITE, 0.94),
    '--c-backdrop':     (N[950], 0.45),
    '--c-glow-accent':  (A[300], 0.16),
    '--c-glow-sky':     (B[300], 0.18),
    '--c-glow-sky-2':   (B[300], 0.20),
    '--c-cool-surface':   (B[600], 0.04),
    '--c-cool-surface-2': (B[600], 0.08),
    '--c-cool-muted':     oklch(0.48, 0.040, H_BLUE),
    '--iso-top':        WHITE,
    '--iso-left':       nL(0.905, 0.008),
    '--iso-right':      nL(0.83, 0.012),
    '--iso-edge':       N[800],
    '--iso-hi-top':     A[200],
    '--iso-hi-left':    A[300],
    '--iso-hi-right':   A[400],
    '--iso-hi-edge':    A[800],
    '--iso-sky-top':    B[500],
    '--iso-sky-right':  B[800],
    '--iso-green-top':  G[300],
    '--iso-green-mid':  G[500],
    '--iso-green-dark': G[600],
    '--iso-ground':     nL(0.935),
    '--iso-grid':       nL(0.86),
    '--iso-window':     nL(0.70, 0.01),
    '--iso-light':      oklch(0.97, 0.03, H_AMBER),
    '--iso-shadow':     N[950],
}

# light accent: walk the amber ramp from light to dark, take the first step that
# reads as text on the light page (4.5) and carries white button text (4.5)
for st in STEPS:
    if wcag(A[st], LIGHT['--c-bg']) >= 4.5 and wcag(WHITE, A[st]) >= 4.5:
        LIGHT_ACCENT_STEP = st; break
LA = A[LIGHT_ACCENT_STEP]
LIGHT['--c-accent'] = LA
LIGHT['--c-accent-tint'] = (A[300], 0.20)
LIGHT['--c-accent-faint'] = (A[300], 0.10)
LIGHT['--c-accent-ring'] = (LA, 0.35)

# --c-edge (new): form-control and ghost-button edge, the lowest alpha that reaches 3:1
for tk, ink in ((DARK, WHITE), (LIGHT, N[900])):
    a = 0.10
    while wcag(mix(ink, tk['--c-bg'], a), tk['--c-bg']) < 3.0: a += 0.01
    tk['--c-edge'] = (ink, round(a, 2))
for tk in (DARK, LIGHT):   # keep --c-edge next to the other lines
    v = tk.pop('--c-edge'); items = list(tk.items()); i = [k for k, _ in items].index('--c-line-2') + 1
    items.insert(i, ('--c-edge', v)); tk.clear(); tk.update(items)

ORDER = list(DARK.keys())

def css_val(v):
    return rgba(*v) if isinstance(v, tuple) else v.upper()

def solid(tokens, name, over=None):
    """Opaque hex of a token, compositing translucent ones over `over` (default the page)."""
    v = tokens[name]
    if not isinstance(v, tuple): return v.upper()
    base = over or tokens['--c-bg']
    return mix(v[0], base, v[1])

# ---------------------------------------------------------------- write tokens.css
def block(tokens, indent='  '):
    return '\n'.join(f'{indent}{k}: {css_val(tokens[k])};' for k in ORDER)

def ramps_block(indent='  '):
    lines = []
    for name, r in RAMPS.items():
        lines.append(f'{indent}/* {name} */')
        lines += [f'{indent}--{name}-{st}: {r[st]};' for st in STEPS]
    return '\n'.join(lines)

hue_note = (f'blue {H_BLUE:.1f} (logo) | amber {H_AMBER:.1f} = blue-165 | '
            f'alert {H_ALERT:.1f} = blue+150 | green {H_GREEN:.1f} = blue-90 | neutrals on {H_BLUE:.1f}')
tokens_css = f"""/* Proposal A: logo-locked palette. Generated by build.py; do not hand-edit.
   Hues (OKLCH): {hue_note}
   Ramp lightness (OKLCH L) for every ramp: {', '.join(f'{s}={l}' for s, l in zip(STEPS, LS))} */

:root {{
  color-scheme: dark;

  /* ---- ramps (same in both modes) ---- */
{ramps_block()}

  /* ---- roles: dark (default) ---- */
{block(DARK)}
}}

:root[data-theme="light"] {{
  color-scheme: light;
{block(LIGHT)}
}}
"""
open(os.path.join(HERE, 'tokens.css'), 'w', encoding='utf-8').write(tokens_css)

# ---------------------------------------------------------------- measure
# (fg token, bg token, kind)  kind: body = 4.5 / Lc 75 (60 min), large = 3 / Lc 45, ui = 3
PAIRS = [
    ('--c-text', '--c-bg', 'body'), ('--c-text', '--c-bg-band', 'body'), ('--c-text', '--c-solid', 'body'),
    ('--c-text', '--c-surface', 'body'), ('--c-text', '--c-surface-2', 'body'), ('--c-text', '--c-glass', 'body'),
    ('--c-muted', '--c-bg', 'body'), ('--c-muted', '--c-bg-band', 'body'), ('--c-muted', '--c-solid', 'body'),
    ('--c-muted', '--c-surface', 'body'), ('--c-muted', '--c-surface-2', 'body'),
    ('--c-cool-muted', '--c-bg', 'body'), ('--c-cool-muted', '--c-cool-surface-2', 'body'),
    ('--c-accent', '--c-bg', 'body'), ('--c-accent', '--c-surface', 'body'), ('--c-accent', '--c-accent-tint', 'body'),
    ('--c-on-accent', '--c-accent', 'body'),
    ('--c-sky', '--c-bg', 'body'), ('--c-sky', '--c-surface', 'body'), ('--c-sky', '--c-sky-tint', 'body'),
    ('--c-ok', '--c-bg', 'body'), ('--c-ok', '--c-ok-tint', 'body'),
    ('--c-alert', '--c-bg', 'body'), ('--c-alert', '--c-bg-band', 'body'), ('--c-alert', '--c-surface', 'body'),
    ('--c-ok', '--c-bg-band', 'body'), ('--c-sky', '--c-bg-band', 'body'), ('--c-accent', '--c-bg-band', 'body'), ('--c-muted', '--c-glass', 'body'),
    ('--c-accent', '--c-bg', 'ui'), ('--c-accent', '--c-solid', 'ui'), ('--c-sky', '--c-bg', 'ui'),
    ('--c-line-2', '--c-bg', 'ui'), ('--c-edge', '--c-bg', 'ui'), ('--c-edge', '--c-surface', 'ui'), ('--c-accent-ring', '--c-bg', 'ui'),
]
PASS = {'body': 4.5, 'large': 3.0, 'ui': 3.0}

def measure(tokens):
    rows = []
    for fg, bg, kind in PAIRS:
        bgh = solid(tokens, bg)
        fgh = solid(tokens, fg, over=bgh) if isinstance(tokens[fg], tuple) else tokens[fg]
        c = wcag(fgh, bgh); lc = apca(fgh, bgh)
        rows.append((fg, bg, kind, fgh, bgh, c, lc))
    return rows

def verdict(kind, c, lc):
    if c < PASS[kind]: return 'FAIL'
    if kind == 'body' and abs(lc) < 60: return 'wcag ok, Lc<60'
    if kind == 'body' and abs(lc) < 75: return 'ok (Lc 60-75: short text)'
    return 'ok'

dm, lm = measure(DARK), measure(LIGHT)
md = ['| fg | on | use | dark ratio | dark Lc | light ratio | light Lc | dark | light |',
      '|---|---|---|---:|---:|---:|---:|---|---|']
worst = []
for d, l in zip(dm, lm):
    fg, bg, kind = d[:3]
    md.append(f'| `{fg[4:]}` | `{bg[4:]}` | {kind} | {d[5]:.2f} | {d[6]:.0f} | {l[5]:.2f} | {l[6]:.0f} | '
              f'{verdict(kind, d[5], d[6])} | {verdict(kind, l[5], l[6])} |')
    if kind == 'body':
        worst += [(d[5], 'dark', fg, bg), (l[5], 'light', fg, bg)]
worst.sort()

# logo checks
logo = ['| logo part | dark bg ratio | light bg ratio |', '|---|---:|---:|']
for nm, dh, lh in [('wordmark', WHITE, '#15181C'), ('blue', LOGO_BLUE, LOGO_BLUE), ('crimson', LOGO_CRIMSON, LOGO_CRIMSON)]:
    logo.append(f'| {nm} | {wcag(dh, DARK["--c-bg"]):.2f} | {wcag(lh, LIGHT["--c-bg"]):.2f} |')

# CVD: status + accent, on the page bg, pairwise OKLab distance (x100)
STAT = ['--c-accent', '--c-sky', '--c-ok', '--c-alert']
cv = ['| mode | vision | accent | sky | ok | alert | closest pair | dE |', '|---|---|---|---|---|---|---|---:|']
cvd_flags = []
for mode, tk in (('dark', DARK), ('light', LIGHT)):
    for kind in ('normal', 'protan', 'deutan', 'tritan'):
        sim = {s: cvd(tk[s], kind) for s in STAT}
        pairs = [(de_ok(sim[a], sim[b]), a[4:], b[4:]) for i, a in enumerate(STAT) for b in STAT[i+1:]]
        d, a, b = min(pairs)
        if d < 10: cvd_flags.append(f'{mode} {kind}: {a} vs {b} dE {d:.1f}')
        cv.append(f'| {mode} | {kind} | ' + ' | '.join(f'`{sim[s]}`' for s in STAT) + f' | {a}/{b} | {d:.1f} |')

# Isometric lighting order: OKLab L top > left > right, under every vision type
iso = ['| mode | set | top L | left L | right L | order holds (all CVD) |', '|---|---|---:|---:|---:|---|']
SETS = {'box': ('--iso-top', '--iso-left', '--iso-right'), 'amber': ('--iso-hi-top', '--iso-hi-left', '--iso-hi-right'),
        'blue': ('--iso-sky-top', '--c-sky', '--iso-sky-right'), 'green': ('--iso-green-top', '--iso-green-mid', '--iso-green-dark')}
for mode, tk in (('dark', DARK), ('light', LIGHT)):
    for nm, (t, l, r) in SETS.items():
        Ls = [hex2oklab(tk[x])[0] for x in (t, l, r)]
        ok = all(hex2oklab(cvd(tk[t], k))[0] > hex2oklab(cvd(tk[l], k))[0] > hex2oklab(cvd(tk[r], k))[0]
                 for k in ('normal', 'protan', 'deutan', 'tritan'))
        iso.append(f'| {mode} | {nm} | {Ls[0]:.2f} | {Ls[1]:.2f} | {Ls[2]:.2f} | {"yes" if ok else "NO"} |')

core = ['| role | dark | light |', '|---|---|---|']
for k in ['--c-bg', '--c-bg-band', '--c-solid', '--c-text', '--c-muted', '--c-accent', '--c-on-accent', '--c-sky', '--c-ok', '--c-alert']:
    def lch(h): L, C, H = hex2oklch(h); return f'{L:.2f} {C:.3f} {H:.0f}'
    core.append(f'| `{k[4:]}` | `{DARK[k]}` ({lch(DARK[k])}) | `{LIGHT[k]}` ({lch(LIGHT[k])}) |')

measured = '\n'.join([
    f'Hues: {hue_note}.', f'Light accent = amber-{LIGHT_ACCENT_STEP}.', '',
    '### Core values (hex, then OKLCH L C H)', '', *core, '',
    '### Text and UI pairs', '',
    'Translucent tokens are composited over the page colour before measuring. '
    'Body text passes at 4.5:1; APCA Lc 75+ is the body-text target, 60-75 is fine for short text and labels. '
    'UI rows need 3:1.', '', *md, '',
    f'Worst body pair: {worst[0][2][4:]} on {worst[0][3][4:]} ({worst[0][1]}) at {worst[0][0]:.2f}:1.', '',
    '### Logo on the page', '', *logo, '',
    '### Colour-vision simulation (Machado 2009, full severity)', '',
    'dE is OKLab distance x100 between the two closest status colours. Under 10 reads as "same colour at a glance".', '',
    *cv, '', 'Flags: ' + ('; '.join(cvd_flags) if cvd_flags else 'none'), '',
    '### Isometric light order', '', *iso,
])
notes_path = os.path.join(HERE, 'notes.md')
if os.path.exists(notes_path):
    txt = open(notes_path, encoding='utf-8').read()
    txt = re.sub(r'<!-- measured:start -->.*<!-- measured:end -->',
                 lambda m: '<!-- measured:start -->\n' + measured + '\n<!-- measured:end -->', txt, flags=re.S)
    open(notes_path, 'w', encoding='utf-8').write(txt)
print(measured)

# ---------------------------------------------------------------- preview.html
def iso_scene():
    """True isometric (30 deg) scene. Cubes on a 6x6 grid, drawn back to front."""
    S = 34; cx, cy = 210, 100
    c30, s30 = math.cos(math.radians(30)), 0.5
    def P(x, y, z): return (cx + (x - y) * S * c30, cy + (x + y) * S * s30 - z * S)
    def poly(pts, fill, extra=''):
        return f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="var({fill})"{extra}/>'
    edge = ' stroke="var(--iso-edge)" stroke-opacity="0.3" stroke-width="1" stroke-linejoin="round"'
    hedge = ' stroke="var(--iso-hi-edge)" stroke-opacity="0.5" stroke-width="1" stroke-linejoin="round"'
    out = []
    n = 6
    out.append(poly([P(0, 0, 0), P(n, 0, 0), P(n, n, 0), P(0, n, 0)], '--iso-ground'))
    for i in range(1, n):
        a, b = P(i, 0, 0), P(i, n, 0); out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="var(--iso-grid)"/>')
        a, b = P(0, i, 0), P(n, i, 0); out.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="var(--iso-grid)"/>')
    # (x, y, z, w, d, h, set)
    boxes = [(1, 1, 0, 2, 1, 2.4, 'box'), (4, 0.5, 0, 1, 1, 1, 'blue'), (0.5, 3.5, 0, 1, 1, 1, 'green'),
             (3, 3, 0, 1, 1, 1, 'amber'), (3, 3, 1, 1, 1, 1, 'amber'), (4.4, 3.2, 0, 1, 1, 0.6, 'box'),
             (1.8, 4.4, 0, 0.6, 0.6, 1.4, 'green')]
    faces = {'box': ('--iso-top', '--iso-left', '--iso-right', edge), 'amber': ('--iso-hi-top', '--iso-hi-left', '--iso-hi-right', hedge),
             'blue': ('--iso-sky-top', '--c-sky', '--iso-sky-right', edge), 'green': ('--iso-green-top', '--iso-green-mid', '--iso-green-dark', edge)}
    # shadows first (sun from the back-left: cast to +x)
    for x, y, z, w, d, h, s in boxes:
        if z == 0:
            out.append(poly([P(x + w, y, 0), P(x + w + h * 0.5, y, 0), P(x + w + h * 0.5, y + d, 0), P(x + w, y + d, 0)],
                            '--iso-shadow', ' fill-opacity="0.35"'))
    for x, y, z, w, d, h, s in sorted(boxes, key=lambda b: (b[0] + b[1] + b[3] / 2 + b[4] / 2, b[2])):
        t, l, r, e = faces[s]
        out.append(poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], l, e))   # left (front-left)
        out.append(poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], r, e))   # right (front-right)
        out.append(poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], t, e))   # top
        if s == 'box' and h > 2:   # windows on the right face of the tall block
            for k, lit in enumerate((False, True, False)):
                yy = y + 0.2 + k * 0.0; zz = 0.5 + k * 0.6
                out.append(poly([P(x + w, y + 0.25, zz), P(x + w, y + 0.75, zz), P(x + w, y + 0.75, zz + 0.35), P(x + w, y + 0.25, zz + 0.35)],
                                '--iso-light' if lit else '--iso-window'))
    return f'<svg viewBox="0 0 420 330" class="iso" role="img" aria-label="Isometric test scene">{"".join(out)}</svg>'

def scope(tokens): return '\n'.join(f'  {k}: {css_val(tokens[k])};' for k in ORDER)

preview = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Palette A Preview</title>
<style>
:root {{
{ramps_block()}
}}
.mode-dark {{ color-scheme: dark;
{scope(DARK)}
}}
.mode-light {{ color-scheme: light;
{scope(LIGHT)}
}}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: 'Barlow', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: {N[500]}; }}
.wrap {{ display: grid; grid-template-columns: 1fr 1fr; min-height: 100vh; }}
@media (max-width: 900px) {{ .wrap {{ grid-template-columns: 1fr; }} }}
.mode {{ background: var(--c-bg); color: var(--c-text); padding: 0 0 2rem; min-width: 0; }}
header {{ display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem;
  background: var(--c-glass); border-bottom: 1px solid var(--c-line); }}
header img {{ height: 34px; width: auto; display: block; }}
nav {{ display: flex; gap: 1rem; font-size: .875rem; color: var(--c-muted); }}
nav b {{ color: var(--c-text); font-weight: 600; }}
.hero {{ padding: 2rem 1.25rem 1.5rem; background:
  radial-gradient(60% 80% at 15% 90%, var(--c-glow-accent), transparent 70%),
  radial-gradient(60% 80% at 85% 30%, var(--c-glow-sky), transparent 70%); }}
.eyebrow {{ font-size: .75rem; letter-spacing: .12em; text-transform: uppercase; color: var(--c-accent); font-weight: 700; margin: 0 0 .5rem; }}
h1 {{ font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-size: clamp(2rem, 4vw, 3.25rem); line-height: .95; margin: 0 0 .75rem; text-transform: uppercase; letter-spacing: .02em; }}
.lead {{ color: var(--c-muted); margin: 0 0 1.25rem; max-width: 46ch; line-height: 1.6; }}
.btns {{ display: flex; flex-wrap: wrap; gap: .75rem; }}
.btn {{ height: 3rem; padding: 0 1.25rem; border-radius: .75rem; font: 700 1rem/1 inherit; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }}
.btn-primary {{ background: var(--c-accent); color: var(--c-on-accent); border: 0; }}
.btn-primary:focus-visible, .btn-ghost:focus-visible {{ outline: 2px solid var(--c-accent); outline-offset: 3px; }}
.btn-ghost {{ background: transparent; color: var(--c-text); border: 1px solid var(--c-edge); }}
.btn-ghost:hover {{ background: var(--c-surface-2); }}
.kbd {{ display: inline-block; margin-left: .5rem; padding: .1rem .35rem; border-radius: .375rem; background: var(--c-ink-tint); font-size: .75rem; }}
section {{ padding: 1.25rem; }}
section.band {{ background: var(--c-bg-band); }}
h2 {{ font-size: 1rem; margin: 0 0 .75rem; letter-spacing: .04em; text-transform: uppercase; }}
.cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; }}
.card {{ background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 1.25rem; padding: 1rem; }}
.card.sel {{ background: var(--c-accent-tint); border-color: var(--c-accent); }}
.card h3 {{ margin: .5rem 0 .25rem; font-size: 1.125rem; }}
.card p {{ margin: 0; color: var(--c-muted); font-size: .875rem; line-height: 1.5; }}
.tile {{ width: 2.25rem; height: 2.25rem; border-radius: .75rem; background: var(--c-surface-2); display: grid; place-items: center; color: var(--c-sky); font-weight: 700; }}
.chips {{ display: flex; flex-wrap: wrap; gap: .5rem; }}
.chip {{ padding: .3rem .7rem; border-radius: 999px; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; border: 1px solid var(--c-line-2); color: var(--c-muted); }}
.chip.on {{ background: var(--c-accent-tint); color: var(--c-accent); border-color: transparent; }}
.chip.sky {{ background: var(--c-sky-tint); color: var(--c-sky); border-color: transparent; }}
.chip.ok {{ background: var(--c-ok-tint); color: var(--c-ok); border-color: transparent; }}
.msgs {{ display: grid; gap: .5rem; }}
.msg {{ display: flex; gap: .6rem; align-items: center; padding: .65rem .85rem; border-radius: .75rem; background: var(--c-surface); border: 1px solid var(--c-line); font-size: .9rem; }}
.msg svg {{ flex: none; width: 18px; height: 18px; }}
.msg.info {{ color: var(--c-sky); }} .msg.ok {{ color: var(--c-ok); }} .msg.alert {{ color: var(--c-alert); border-color: var(--c-alert); }}
.msg span {{ color: var(--c-text); }}
.input {{ width: 100%; height: 3rem; border-radius: .75rem; background: var(--c-well); border: 1px solid var(--c-edge); color: var(--c-text); padding: 0 .9rem; font: inherit; }}
.input:focus {{ outline: none; border-color: var(--c-accent); box-shadow: 0 0 0 3px var(--c-accent-ring); }}
.dialog {{ background: var(--c-solid); border-radius: 1.25rem; padding: 1rem; box-shadow: 0 12px 32px -12px rgb(0 0 0 / .45); }}
.iso {{ width: 100%; max-width: 460px; display: block; margin: 0 auto; }}
.swatches {{ display: grid; grid-template-columns: repeat(11, 1fr); gap: 2px; margin-bottom: 2px; }}
.swatches div {{ height: 18px; }}
.label {{ font-size: .75rem; color: var(--c-muted); margin: .75rem 0 .25rem; }}
</style></head><body>
<div class="wrap">
{''.join(f'''
<div class="mode mode-{m}">
  <header><img src="../inputs/svs-logo-{logo}-text.svg" alt="Silicon Valley Services">
    <nav><b>Services</b><span>Work</span><span>About</span></nav></header>
  <div class="hero">
    <p class="eyebrow">Managed IT · {m} mode</p>
    <h1>Your IT, handled.<br>Before it breaks.</h1>
    <p class="lead">We watch your systems day and night. You get one team and one number to call.</p>
    <div class="btns"><button class="btn btn-primary">Book a call <span class="kbd">F</span></button><button class="btn btn-ghost">See plans</button></div>
  </div>
  <section class="band"><h2>Plans</h2>
    <div class="cards">
      <div class="card"><div class="tile">1</div><h3>Help desk</h3><p>Real people answer. Most fixes in an hour.</p></div>
      <div class="card sel"><div class="tile">2</div><h3>Full care</h3><p>Help desk, security and backups in one plan.</p></div>
      <div class="card"><div class="tile">3</div><h3>Projects</h3><p>Moves, new offices and cloud work.</p></div>
    </div></section>
  <section><h2>Chips</h2><div class="chips"><span class="chip on">Selected</span><span class="chip">Default</span><span class="chip sky">Info</span><span class="chip ok">Online</span></div></section>
  <section><h2>Status</h2><div class="msgs">
    <div class="msg info"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9v5M10 6v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Info: maintenance on Sunday at 2 am.</span></div>
    <div class="msg ok"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="currentColor"/><path d="M6 10l3 3 5-6" fill="none" stroke="var(--c-bg)" stroke-width="2"/></svg><span>Online: all 42 devices backed up.</span></div>
    <div class="msg alert"><svg viewBox="0 0 20 20"><path d="M10 2l9 16H1z" fill="currentColor"/><path d="M10 8v4M10 14.5v.5" stroke="var(--c-bg)" stroke-width="2" stroke-linecap="round"/></svg><span>Error: one laptop missed its backup.</span></div>
  </div>
    <p class="label">Input (focus it)</p><input class="input" placeholder="Work email">
  </section>
  <section class="band"><h2>Dialog</h2><div class="dialog"><b>Saved.</b> <span style="color:var(--c-muted)">We will call you back today.</span></div></section>
  <section><h2>Isometric</h2>{iso_scene()}</section>
  <section><h2>Ramps</h2>
    {''.join(f'<p class="label">{rn}</p><div class="swatches" title="{rn}">' + ''.join(f'<div style="background:var(--{rn}-{st})" title="{rn}-{st}"></div>' for st in STEPS) + '</div>' for rn in RAMPS)}
  </section>
</div>''' for m, logo in (('dark', 'white'), ('light', 'black')))}
</div>
</body></html>
"""
open(os.path.join(HERE, 'preview.html'), 'w', encoding='utf-8').write(preview)
print('\nwrote tokens.css, preview.html' + (', notes.md' if os.path.exists(notes_path) else ''))
