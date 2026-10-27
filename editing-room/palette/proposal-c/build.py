"""Proposal C (professional-first) palette builder.

Run:  python build.py
Writes tokens.css, notes.md and preview.html next to this file, and prints
every measurement. All colours are generated in OKLCH; nothing is hand-picked
as hex except the fixed logo colours.
"""
import math, os, itertools

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- colour maths
def s2l(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def l2s(c): c = max(0, min(1, c)); return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def hex2rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def rgb2hex(rgb): return '#' + ''.join('%02X' % max(0, min(255, round(x))) for x in rgb)

def lin2oklab(r, g, b):
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = [math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s)]
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)

def oklab(h): return lin2oklab(*[s2l(x) for x in hex2rgb(h)])
def oklch(h):
    L, a, b = oklab(h); return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360

def oklch2lin(L, C, H):
    a = C * math.cos(math.radians(H)); b = C * math.sin(math.radians(H))
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]

def ingamut(L, C, H): return all(-1e-4 <= x <= 1 + 1e-4 for x in oklch2lin(L, C, H))
def lch(L, C, H):
    """OKLCH -> hex, reducing chroma (never lightness or hue) to fit sRGB."""
    if not ingamut(L, C, H):
        lo, hi = 0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if ingamut(L, mid, H) else (lo, mid)
        C = lo
    return rgb2hex([l2s(x) * 255 for x in oklch2lin(L, C, H)])

def lum(h): r, g, b = [s2l(x) for x in hex2rgb(h)]; return .2126 * r + .7152 * g + .0722 * b
def wcag(a, b): x, y = sorted([lum(a), lum(b)]); return (y + .05) / (x + .05)

def apca(txt, bg):
    """APCA-W3 0.0.98G-4g. Returns signed Lc (positive = dark on light)."""
    def Y(h):
        r, g, b = hex2rgb(h)
        y = .2126729 * (r / 255) ** 2.4 + .7151522 * (g / 255) ** 2.4 + .0721750 * (b / 255) ** 2.4
        return y if y > .022 else y + (.022 - y) ** 1.414
    yt, yb = Y(txt), Y(bg)
    if abs(yb - yt) < .0005: return 0.0
    if yb > yt:
        s = (yb ** .56 - yt ** .57) * 1.14
        return 0.0 if s < .1 else (s - .027) * 100
    s = (yb ** .65 - yt ** .62) * 1.14
    return 0.0 if s > -.1 else (s + .027) * 100

def mix(fg, bg, a):
    """Composite fg at alpha a over opaque bg (sRGB, as browsers do)."""
    f, b = hex2rgb(fg), hex2rgb(bg)
    return rgb2hex([a * x + (1 - a) * y for x, y in zip(f, b)])

def dE(a, b): return math.dist(oklab(a), oklab(b))

# Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear RGB.
CVD = {
    'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deutan': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def sim(h, kind):
    lin = [s2l(x) for x in hex2rgb(h)]
    m = CVD[kind]
    out = [sum(m[i][j] * lin[j] for j in range(3)) for i in range(3)]
    return rgb2hex([l2s(x) * 255 for x in out])

# ---------------------------------------------------------------- anchors
LOGO_BLUE, LOGO_CRIMSON = '#1F75A6', '#8D242E'
H_BLUE = oklch(LOGO_BLUE)[2]          # ~239
H_NEUTRAL = H_BLUE + 11               # 250: navy, not petrol, at low lightness
H_AMBER = 66                          # near-complement of 239 (+7 deg toward yellow)
H_GREEN = 158                         # ~ -81 deg from blue: clear of blue and amber
H_RED = 29                            # warm red, 9 deg off the logo crimson (20)

STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
LS = [.975, .94, .88, .81, .73, .635, .535, .455, .375, .295, .215]   # shared lightness ladder

def ramp(H, Cpeak, Lpeak, anchor=None, anchor_step=None):
    out = {}
    for st, L in zip(STEPS, LS):
        if L > Lpeak: f = 1 - 0.78 * ((L - Lpeak) / (1 - Lpeak)) ** 1.5
        else: f = 1 - 0.45 * ((Lpeak - L) / Lpeak) ** 1.4
        out[st] = lch(L, Cpeak * f, H)
    if anchor: out[anchor_step] = anchor
    return out

def neutral_ramp():
    return {st: lch(L, 0.009 + 0.03 * (1 - L) ** 1.3, H_NEUTRAL) for st, L in zip(STEPS, LS)}

R = {
    'neutral': neutral_ramp(),
    'blue':  ramp(H_BLUE, oklch(LOGO_BLUE)[1], oklch(LOGO_BLUE)[0], LOGO_BLUE, 600),
    'amber': ramp(H_AMBER, 0.150, 0.79),
    'green': ramp(H_GREEN, 0.125, 0.72),
    'red':   ramp(H_RED, 0.150, 0.62),
}
N, B, A, G, Rd = R['neutral'], R['blue'], R['amber'], R['green'], R['red']
half = lambda L, C=None, H=H_NEUTRAL: lch(L, 0.009 + 0.03 * (1 - L) ** 1.3 if C is None else C, H)

def rgba(h, a): r, g, b = hex2rgb(h); return f'rgb({r} {g} {b} / {a})'

# ---------------------------------------------------------------- roles
# Each entry: token -> (value, alpha or None). Alpha tokens are composited
# over the page when measured.
def roles(mode):
    d = mode == 'dark'
    t = {}
    if d:
        bg = N[950]
        t['--c-bg'] = bg
        t['--c-bg-band'] = half(0.238)
        t['--c-solid'] = N[900]
        t['--c-surface'] = (N[50], .05)
        t['--c-surface-2'] = (N[50], .09)
        t['--c-well'] = ('#000000', .18)
        t['--c-line'] = (N[50], .10)
        t['--c-line-2'] = (N[50], .46)          # control edges: >= 3:1
        t['--c-text'] = N[50]
        t['--c-muted'] = N[300]
        t['--c-accent'] = A[300]
        t['--c-on-accent'] = N[950]
        t['--c-sky'] = B[300]
        t['--c-ok'] = G[200]
        t['--c-alert'] = Rd[300]
        ink = N[950]
    else:
        bg = N[50]
        t['--c-bg'] = bg
        t['--c-bg-band'] = N[100]
        t['--c-solid'] = '#FFFFFF'
        t['--c-surface'] = ('#FFFFFF', .72)
        t['--c-surface-2'] = (N[900], .045)
        t['--c-well'] = (N[900], .05)
        t['--c-line'] = (N[900], .12)
        t['--c-line-2'] = (N[900], .58)
        t['--c-text'] = N[950]
        t['--c-muted'] = N[700]
        t['--c-accent'] = A[600]
        t['--c-on-accent'] = '#FFFFFF'
        t['--c-sky'] = B[700]                   # one step darker than the logo blue
        t['--c-ok'] = G[800]
        t['--c-alert'] = Rd[600]                 # red-700 is too close to the logo crimson
        ink = N[950]
    acc, sky, ok = t['--c-accent'], t['--c-sky'], t['--c-ok']
    t['--c-accent-tint'] = (acc, .14 if d else .06)
    t['--c-accent-faint'] = (acc, .06 if d else .04)
    t['--c-accent-ring'] = (acc, .30 if d else .35)
    t['--c-sky-tint'] = (sky, .16 if d else .07)
    t['--c-ok-tint'] = (ok, .16 if d else .10)
    t['--c-ink-tint'] = (ink, .08 if d else .16)
    t['--c-glass'] = (bg, .88 if d else .86)
    t['--c-glass-2'] = (t['--c-solid'], .92)
    t['--c-backdrop'] = (N[950] if d else N[900], .62 if d else .40)
    t['--c-glow-accent'] = (acc, .07 if d else .08)
    t['--c-glow-sky'] = (sky, .09 if d else .07)
    t['--c-glow-sky-2'] = (sky, .11 if d else .08)
    t['--c-cool-surface'] = (B[100], .05) if d else (B[100], .40)
    t['--c-cool-surface-2'] = (B[100], .10) if d else (B[100], .70)
    t['--c-cool-muted'] = lch(oklch(t['--c-muted'])[0], 0.035, H_BLUE)

    # isometric drawing palette
    if d:
        t.update({
            '--iso-top': N[700], '--iso-left': N[800], '--iso-right': N[900],
            '--iso-edge': N[100],
            '--iso-hi-top': A[200], '--iso-hi-left': A[300], '--iso-hi-right': A[500],
            '--iso-hi-edge': A[50],
            '--iso-sky-top': B[200], '--iso-sky-right': B[400],
            '--iso-green-top': G[300], '--iso-green-mid': G[500], '--iso-green-dark': G[600],
            '--iso-ground': half(0.245), '--iso-grid': half(0.33),
            '--iso-window': half(0.255), '--iso-light': A[50], '--iso-shadow': '#000000',
        })
    else:
        t.update({
            '--iso-top': '#FFFFFF', '--iso-left': N[200], '--iso-right': N[300],
            '--iso-edge': N[800],
            '--iso-hi-top': A[200], '--iso-hi-left': A[300], '--iso-hi-right': A[500],
            '--iso-hi-edge': A[700],
            '--iso-sky-top': B[400], '--iso-sky-right': B[900],
            '--iso-green-top': G[400], '--iso-green-mid': G[500], '--iso-green-dark': G[700],
            '--iso-ground': N[100], '--iso-grid': N[200],
            '--iso-window': N[400], '--iso-light': A[50], '--iso-shadow': N[950],
        })
    return t

def css_value(v): return rgba(*v) if isinstance(v, tuple) else v
def solid(t, k, over=None):
    v = t[k]
    if isinstance(v, tuple): return mix(v[0], over or t['--c-bg'], v[1])
    return v

MODES = {'dark': roles('dark'), 'light': roles('light')}

# ---------------------------------------------------------------- pairs used
# (fg, bg, kind). kind: body 4.5:1 / Lc 75, small 4.5:1 / Lc 60, ui 3:1 / Lc 45.
PAIRS = [
    ('--c-text', '--c-bg', 'body'), ('--c-text', '--c-bg-band', 'body'), ('--c-text', '--c-surface', 'body'),
    ('--c-text', '--c-surface-2', 'body'), ('--c-text', '--c-solid', 'body'), ('--c-text', '--c-well', 'body'),
    ('--c-text', '--c-glass', 'body'),
    ('--c-muted', '--c-bg', 'small'), ('--c-muted', '--c-bg-band', 'small'), ('--c-muted', '--c-surface', 'small'),
    ('--c-muted', '--c-surface-2', 'small'), ('--c-muted', '--c-solid', 'small'),
    ('--c-cool-muted', '--c-cool-surface', 'small'),
    ('--c-accent', '--c-bg', 'small'), ('--c-accent', '--c-surface', 'small'), ('--c-accent', '--c-surface-2', 'small'),
    ('--c-accent', '--c-solid', 'small'), ('--c-accent', '--c-accent-tint', 'small'),
    ('--c-on-accent', '--c-accent', 'label'), ('--c-on-accent', '--c-ink-tint@accent', 'small'),
    ('--c-sky', '--c-bg', 'small'), ('--c-sky', '--c-surface', 'small'), ('--c-sky', '--c-sky-tint', 'small'),
    ('--c-ok', '--c-bg', 'small'), ('--c-ok', '--c-surface', 'small'), ('--c-ok', '--c-ok-tint', 'small'),
    ('--c-alert', '--c-bg', 'small'), ('--c-alert', '--c-surface', 'small'),
    ('--c-bg', '--c-text', 'small'),
    ('--c-line-2', '--c-bg', 'ui'), ('--c-line-2', '--c-surface', 'ui'),
    ('--c-accent', '--c-bg', 'ui'),     # focus outline and 2px accent borders
    ('--c-accent', '--c-bg-band', 'ui'),
]
NEED = {'body': (4.5, 75), 'small': (4.5, 60), 'label': (4.5, 60), 'ui': (3.0, 30)}

def resolve(t, key):
    if '@' in key:
        k, over = key.split('@'); return solid(t, k, solid(t, '--c-' + over))
    if key in ('--c-cool-surface',): return solid(t, key)
    return solid(t, key)

def measure_pairs(t):
    rows = []
    for fg, bg, kind in PAIRS:
        bgc = resolve(t, bg)
        fgc = solid(t, fg, bgc) if isinstance(t[fg], tuple) else t[fg]
        cr, lc = wcag(fgc, bgc), apca(fgc, bgc)
        need_cr, need_lc = NEED[kind]
        rows.append(dict(fg=fg, bg=bg, kind=kind, fgc=fgc, bgc=bgc, cr=cr, lc=lc,
                         ok_cr=cr >= need_cr, ok_lc=abs(lc) >= need_lc))
    return rows

# ---------------------------------------------------------------- primary test
def primary_options():
    """Amber primary vs blue primary, measured in both modes."""
    out = []
    for mode in ('dark', 'light'):
        t = MODES[mode]; bg = t['--c-bg']
        opts = {
            'amber fill (chosen)': (t['--c-accent'], t['--c-on-accent']),
            'blue fill': (B[600], '#FFFFFF') if mode == 'dark' else (B[700], '#FFFFFF'),
            'light-blue fill': (B[300], N[950]) if mode == 'dark' else None,
        }
        for name, v in opts.items():
            if not v: continue
            fill, label = v
            dh = abs((oklch(fill)[2] - H_NEUTRAL + 180) % 360 - 180)
            out.append(dict(mode=mode, name=name, fill=fill, label=label,
                            label_cr=wcag(label, fill), label_lc=apca(label, fill),
                            edge_cr=wcag(fill, bg), dE_page=dE(fill, bg), hue_gap=dh,
                            dE_link=dE(fill, t['--c-sky']),
                            deutan_dE=dE(sim(fill, 'deutan'), sim(t['--c-sky'], 'deutan')),
                            tritan_dE=dE(sim(fill, 'tritan'), sim(t['--c-sky'], 'tritan'))))
    return out

# ---------------------------------------------------------------- CVD
STATUS = ['--c-accent', '--c-sky', '--c-ok', '--c-alert']
def cvd_report(t):
    rows = []
    for kind in ('none', 'protan', 'deutan', 'tritan'):
        f = (lambda h: h) if kind == 'none' else (lambda h, k=kind: sim(h, k))
        for a, b in itertools.combinations(STATUS, 2):
            rows.append((kind, a, b, dE(f(t[a]), f(t[b]))))
    return rows

def cvd_bg(t):
    rows = []
    for kind in ('protan', 'deutan', 'tritan'):
        for k in STATUS:
            rows.append((kind, k, wcag(sim(t[k], kind), sim(t['--c-bg'], kind))))
    return rows

# ---------------------------------------------------------------- iso check
FACE_SETS = [('box', '--iso-top', '--iso-left', '--iso-right'),
             ('amber box', '--iso-hi-top', '--iso-hi-left', '--iso-hi-right'),
             ('blue box', '--iso-sky-top', '--c-sky', '--iso-sky-right'),
             ('tree', '--iso-green-top', '--iso-green-mid', '--iso-green-dark')]
def iso_report(t):
    rows = []
    for name, a, b, c in FACE_SETS:
        La, Lb, Lc_ = (oklch(t[k])[0] for k in (a, b, c))
        rows.append(dict(name=name, L=(La, Lb, Lc_), order=La > Lb > Lc_,
                         tl=wcag(t[a], t[b]), lr=wcag(t[b], t[c]),
                         ground=min(wcag(t[k], t['--iso-ground']) for k in (a, b, c))))
    return rows

# ---------------------------------------------------------------- output: tokens.css
def ramp_css():
    lines = []
    for name, r in R.items():
        lines.append('  ' + '  '.join(f'--{name}-{st}: {h};' for st, h in list(r.items())[:6]))
        lines.append('  ' + '  '.join(f'--{name}-{st}: {h};' for st, h in list(r.items())[6:]))
    return '\n'.join(lines)

ORDER = [k for k in roles('dark')]
COMMENTS = {
    '--c-bg': 'page (60%: navy neutral)', '--c-bg-band': 'alternate section band', '--c-solid': 'dialogs, toasts, menus',
    '--c-surface': 'panels and cards', '--c-surface-2': 'hover, selected, icon tiles', '--c-well': 'image wells, inputs',
    '--c-line': 'decorative dividers', '--c-line-2': 'control edges (3:1)', '--c-text': 'body text',
    '--c-muted': 'secondary text', '--c-accent': 'the one action colour (10%)', '--c-on-accent': 'label on accent',
    '--c-sky': 'info, links, logo-blue family', '--c-ok': 'online / success', '--c-alert': 'errors',
    '--iso-top': 'box faces', '--iso-edge': 'face outline, used at 0.3 opacity', '--iso-hi-top': 'highlighted box faces',
    '--iso-sky-top': 'blue boxes: top, left is --c-sky', '--iso-green-top': 'green boxes and trees',
    '--iso-ground': 'map platform', '--iso-grid': 'floor grid lines', '--iso-window': 'unlit window',
    '--iso-light': 'warm lit window, white LED', '--iso-shadow': 'drop shadow, used at 0.35 opacity',
}
def block(t, indent='  '):
    out = []
    for k in ORDER:
        c = COMMENTS.get(k)
        out.append(f'{indent}{k}: {css_value(t[k])};' + (f'  /* {c} */' if c else ''))
    return '\n'.join(out)

def write_tokens():
    css = f"""/* Proposal C: professional-first. Generated by build.py; don't hand-edit.
   Dark is the default on :root. Light lives under :root[data-theme="light"].
   Hues (OKLCH): neutral {H_NEUTRAL:.0f}, blue {H_BLUE:.0f} (logo), amber {H_AMBER}, green {H_GREEN}, red {H_RED}.
   Ramp lightness is shared: {', '.join(f'{s} {l}' for s, l in zip(STEPS, LS))}. */

:root {{
  color-scheme: dark;

  /* ---- ramps (same in both modes) */
{ramp_css()}
  --logo-blue: {LOGO_BLUE};      /* logo only */
  --logo-crimson: {LOGO_CRIMSON};   /* logo only, never in the UI */

  /* ---- roles: dark */
{block(MODES['dark'])}
}}

:root[data-theme="light"] {{
  color-scheme: light;
{block(MODES['light'])}
}}
"""
    open(os.path.join(HERE, 'tokens.css'), 'w', encoding='utf-8', newline='\n').write(css)

# ---------------------------------------------------------------- output: preview.html
def cube(x, y, z, s, ox, oy, cls, windows=False):
    c30, s30 = math.cos(math.radians(30)) * s, 0.5 * s
    P = lambda X, Y, Z: (ox + (X - Y) * c30, oy + (X + Y) * s30 - Z * s)
    pts = lambda *ps: ' '.join(f'{px:.1f},{py:.1f}' for px, py in (P(*p) for p in ps))
    top = pts((x, y, z + 1), (x + 1, y, z + 1), (x + 1, y + 1, z + 1), (x, y + 1, z + 1))
    left = pts((x, y + 1, z), (x + 1, y + 1, z), (x + 1, y + 1, z + 1), (x, y + 1, z + 1))
    right = pts((x + 1, y, z), (x + 1, y + 1, z), (x + 1, y + 1, z + 1), (x + 1, y, z + 1))
    f = cls
    edge = 'e-hi' if cls == 'hi' else 'e'
    svg = [f'<polygon class="{f}-t {edge}" points="{top}"/>',
           f'<polygon class="{f}-l {edge}" points="{left}"/>',
           f'<polygon class="{f}-r {edge}" points="{right}"/>']
    if windows:
        for i, lit in ((0.18, False), (0.58, True)):
            w = pts((x + i, y + 1, z + .35), (x + i + .26, y + 1, z + .35), (x + i + .26, y + 1, z + .7), (x + i, y + 1, z + .7))
            svg.append(f'<polygon class="{"win-lit" if lit else "win"}" points="{w}"/>')
        w = pts((x + 1, y + .35, z + .35), (x + 1, y + .65, z + .35), (x + 1, y + .65, z + .7), (x + 1, y + .35, z + .7))
        svg.append(f'<polygon class="win" points="{w}"/>')
    return '\n'.join(svg)

def iso_scene():
    s, ox, oy = 34, 170, 70
    c30, s30 = math.cos(math.radians(30)) * s, 0.5 * s
    P = lambda X, Y, Z=0: (ox + (X - Y) * c30, oy + (X + Y) * s30 - Z * s)
    n = 5
    g = [P(0, 0), P(n, 0), P(n, n), P(0, n)]
    out = [f'<polygon class="ground" points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in g)}"/>']
    for i in range(1, n):
        a, b = P(i, 0), P(i, n); out.append(f'<line class="grid" x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>')
        a, b = P(0, i), P(n, i); out.append(f'<line class="grid" x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>')
    boxes = [(0, 1, 0, 'n', True), (0, 1, 1, 'n', True), (3, 0, 0, 'hi', False), (0, 3, 0, 'sky', False),
             (3, 3, 0, 'gr', False), (2, 2, 0, 'n', True), (4, 1, 0, 'n', False)]
    # shadows first (cast to the right-back, on the ground)
    for x, y, z, c, w in boxes:
        if z == 0:
            sh = [P(x + 1, y), P(x + 1.6, y + .2), P(x + 1.6, y + 1.2), P(x + 1, y + 1)]
            out.append(f'<polygon class="shadow" points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in sh)}"/>')
    for x, y, z, c, w in sorted(boxes, key=lambda b: (b[0] + b[1], b[2])):
        out.append(cube(x, y, z, s, ox, oy, c, w))
    return f'<svg class="iso" viewBox="0 0 340 250" role="img" aria-label="Isometric test scene">{"".join(out)}</svg>'

def scoped_vars(t):
    ramps = ' '.join(f'--{n}-{st}: {h};' for n, r in R.items() for st, h in r.items())
    return ramps + '\n' + '\n'.join(f'  {k}: {css_value(t[k])};' for k in ORDER)

def write_preview():
    scene = iso_scene()
    def panel(mode):
        logo = '../inputs/svs-logo-white-text.svg' if mode == 'dark' else '../inputs/svs-logo-black-text.svg'
        return f'''<section class="mode {mode}" aria-label="{mode} mode">
  <header class="bar"><img src="{logo}" alt="SVS" width="148" height="34"><nav><a href="#">Services</a><a href="#">Support</a><a href="#">About</a></nav><span class="mode-tag">{mode}</span></header>
  <div class="hero">
    <p class="kicker">Managed IT for growing teams</p>
    <h1>IT that just works.</h1>
    <p class="lead">We run your devices, cloud and security. You get one team and one bill.</p>
    <div class="actions"><a class="btn primary" href="#">Book a call</a><a class="btn ghost" href="#">See plans</a></div>
    <p class="small">Read the <a href="#">service terms</a>. Response under 15 minutes.</p>
  </div>
  <div class="cards">
    <article class="card"><span class="tile">24/7</span><h3>Help desk</h3><p>Real people answer. Most fixes on the first call.</p><div class="chips"><span class="chip">Remote</span><span class="chip sel">Popular</span></div></article>
    <article class="card solid"><span class="tile">SOC</span><h3>Security</h3><p>Patching, backups and threat watch, every day.</p><div class="chips"><span class="chip ok">Online</span><span class="chip info">New</span></div></article>
  </div>
  <div class="status">
    <p class="msg ok-msg"><b aria-hidden="true">&#10003;</b> Backup finished. 214 devices checked.</p>
    <p class="msg info-msg"><b aria-hidden="true">i</b> Maintenance window tonight, 11 pm.</p>
    <p class="msg alert-msg"><b aria-hidden="true">!</b> Two devices missed their update.</p>
    <label class="field">Email<input value="name@company.com" aria-label="Email"></label>
  </div>
  <div class="scene">{scene}</div>
</section>'''
    html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Palette C Preview</title>
<style>
/* generated by build.py from the same values as tokens.css */
.mode.dark {{ color-scheme: dark;
{scoped_vars(MODES['dark'])} }}
.mode.light {{ color-scheme: light;
{scoped_vars(MODES['light'])} }}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: #0B0F16; }}
body {{ font: 16px/1.6 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
.grid2 {{ display: grid; grid-template-columns: 1fr; }}
@media (min-width: 1000px) {{ .grid2 {{ grid-template-columns: 1fr 1fr; }} }}
.mode {{ background: var(--c-bg); color: var(--c-text); padding: 0 16px 32px; min-width: 0; }}
@media (min-width: 700px) {{ .mode {{ padding: 0 32px 40px; }} }}
.bar {{ display: flex; align-items: center; gap: 20px; padding: 14px 0; border-bottom: 1px solid var(--c-line); background: var(--c-glass); flex-wrap: wrap; }}
.bar img {{ height: 30px; width: auto; }}
.bar nav {{ display: flex; gap: 16px; flex-wrap: wrap; }}
.bar nav a {{ color: var(--c-muted); text-decoration: none; font-weight: 600; }}
.bar nav a:first-child {{ color: var(--c-text); }}
.mode-tag {{ margin-left: auto; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--c-muted); }}
.hero {{ padding: 40px 0 28px; background: radial-gradient(60% 80% at 20% 70%, var(--c-glow-accent), transparent), radial-gradient(50% 70% at 90% 30%, var(--c-glow-sky), transparent); }}
.kicker {{ font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--c-accent); margin: 0 0 8px; font-weight: 600; }}
h1 {{ font: italic 700 clamp(40px, 6vw, 64px)/0.95 'Barlow Condensed', 'Arial Narrow', sans-serif; text-transform: uppercase; margin: 0 0 14px; }}
.lead {{ color: var(--c-muted); font-size: 18px; max-width: 46ch; margin: 0 0 22px; }}
.small {{ color: var(--c-muted); font-size: 14px; margin: 16px 0 0; }}
a {{ color: var(--c-sky); }}
.actions {{ display: flex; gap: 12px; flex-wrap: wrap; }}
.btn {{ display: inline-flex; align-items: center; height: 48px; padding: 0 22px; border-radius: 12px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; text-decoration: none; font-size: 15px; }}
.btn.primary {{ background: var(--c-accent); color: var(--c-on-accent); }}
.btn.primary:focus-visible, .btn.ghost:focus-visible {{ outline: 2px solid var(--c-accent); outline-offset: 3px; }}
.btn.ghost {{ color: var(--c-text); border: 1px solid var(--c-line-2); background: var(--c-surface); }}
.cards {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }}
.card {{ background: var(--c-surface); border: 1px solid var(--c-line); border-radius: 20px; padding: 18px; }}
.card.solid {{ background: var(--c-solid); box-shadow: 0 12px 32px -12px rgb(0 0 0 / .35); }}
.card h3 {{ margin: 10px 0 4px; font-size: 20px; }}
.card p {{ color: var(--c-muted); margin: 0 0 12px; font-size: 15px; }}
.tile {{ display: inline-grid; place-items: center; min-width: 44px; height: 44px; padding: 0 8px; border-radius: 12px; background: var(--c-surface-2); color: var(--c-sky); font-weight: 700; font-size: 13px; }}
.chips {{ display: flex; gap: 8px; flex-wrap: wrap; }}
.chip {{ font-size: 12px; letter-spacing: .08em; text-transform: uppercase; padding: 3px 10px; border-radius: 999px; background: var(--c-surface-2); color: var(--c-text); font-weight: 600; }}
.chip.sel {{ background: var(--c-accent-tint); color: var(--c-accent); }}
.chip.ok {{ background: var(--c-ok-tint); color: var(--c-ok); }}
.chip.ok::before {{ content: '\\25CF\\00A0'; }}
.chip.info {{ background: var(--c-sky-tint); color: var(--c-sky); }}
.status {{ display: grid; gap: 8px; margin: 18px 0; }}
.msg {{ margin: 0; padding: 10px 14px; border-radius: 12px; display: flex; gap: 10px; align-items: baseline; font-size: 15px; }}
.msg b {{ display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-size: 13px; flex: none; }}
.ok-msg {{ background: var(--c-ok-tint); color: var(--c-text); }} .ok-msg b {{ background: var(--c-ok); color: var(--c-bg); }}
.info-msg {{ background: var(--c-sky-tint); color: var(--c-text); }} .info-msg b {{ background: var(--c-sky); color: var(--c-bg); }}
.alert-msg {{ background: var(--c-surface); color: var(--c-text); border: 1px solid var(--c-alert); }} .alert-msg b {{ background: var(--c-alert); color: var(--c-bg); }}
.field {{ display: grid; gap: 4px; font-size: 14px; color: var(--c-muted); max-width: 320px; }}
.field input {{ height: 44px; border-radius: 12px; border: 1px solid var(--c-line-2); background: var(--c-well); color: var(--c-text); padding: 0 12px; font: inherit; font-size: 16px; box-shadow: 0 0 0 3px var(--c-accent-ring); }}
.scene {{ background: var(--c-bg); border: 1px solid var(--c-line); border-radius: 20px; padding: 8px; }}
.iso {{ display: block; width: 100%; max-width: 420px; margin: 0 auto; height: auto; }}
.ground {{ fill: var(--iso-ground); }} .grid {{ stroke: var(--iso-grid); stroke-width: 1; }}
.shadow {{ fill: var(--iso-shadow); opacity: .35; }}
.e {{ stroke: var(--iso-edge); stroke-opacity: .3; stroke-width: 1; stroke-linejoin: round; }}
.e-hi {{ stroke: var(--iso-hi-edge); stroke-opacity: .5; stroke-width: 1; stroke-linejoin: round; }}
.n-t {{ fill: var(--iso-top); }} .n-l {{ fill: var(--iso-left); }} .n-r {{ fill: var(--iso-right); }}
.hi-t {{ fill: var(--iso-hi-top); }} .hi-l {{ fill: var(--iso-hi-left); }} .hi-r {{ fill: var(--iso-hi-right); }}
.sky-t {{ fill: var(--iso-sky-top); }} .sky-l {{ fill: var(--c-sky); }} .sky-r {{ fill: var(--iso-sky-right); }}
.gr-t {{ fill: var(--iso-green-top); }} .gr-l {{ fill: var(--iso-green-mid); }} .gr-r {{ fill: var(--iso-green-dark); }}
.win {{ fill: var(--iso-window); }} .win-lit {{ fill: var(--iso-light); }}
</style></head>
<body><main class="grid2">
{panel('dark')}
{panel('light')}
</main></body></html>
'''
    open(os.path.join(HERE, 'preview.html'), 'w', encoding='utf-8', newline='\n').write(html)

# ---------------------------------------------------------------- output: notes.md
def f2(x): return f'{x:.2f}'
def write_notes():
    L = []
    w = L.append
    md, ml = MODES['dark'], MODES['light']
    w('# Proposal C: professional-first\n')
    w('Generated by `build.py`. Every number below is measured, not typed.\n')
    w('## Colour theory\n')
    w(f'- One anchor hue: the logo blue, OKLCH hue {H_BLUE:.0f}. Everything else is placed relative to it.')
    w(f'- Neutrals sit at hue {H_NEUTRAL:.0f}, 11 degrees past the logo blue. At low lightness hue {H_BLUE:.0f} drifts toward petrol. Hue {H_NEUTRAL:.0f} keeps the page navy.')
    w('- Neutral chroma is low and rises as lightness falls (0.010 at the top, 0.031 at the bottom). Light greys look grey. Dark greys look navy. Nothing looks dirty.')
    w(f'- Amber sits at hue {H_AMBER}, near the true complement of the logo blue ({(H_BLUE + 180) % 360:.0f}). Complements give the strongest figure against ground. We stop 7 degrees short of orange so it never reads as an alarm.')
    w(f'- Green ({H_GREEN}) and red ({H_RED}) are status hues only. Red is 9 degrees off the logo crimson but much lighter in dark mode and used only for errors. Crimson never appears in the UI.')
    w(f'- All ramps share one lightness ladder: {", ".join(f"{s}={l}" for s, l in zip(STEPS, LS))}. So `blue-300` and `amber-300` have the same weight. Chroma peaks mid-ramp and tapers to the ends, then is clipped to sRGB by chroma only.')
    w(f'- Logo blue is `blue-600`, exact, and step 600 sits at the logo blue lightness (0.535). Links and info use the same hue: `blue-300` on dark, `blue-700` on light. The logo blue itself passes on the plain light page ({wcag(LOGO_BLUE, N[50]):.2f}:1) but drops to {wcag(LOGO_BLUE, mix(B[600], N[50], .07)):.2f}:1 on the info tint, so text takes one step darker.')
    w('- Balance is 60/30/10. 60: navy (or near-white) neutrals. 30: blue family (links, info, blue drawings, cool glows). 10: amber, kept for the one thing to click and for highlighted drawing faces.')
    w('- Chroma is restrained in the UI: text and surfaces stay under 0.035. The drawings keep full ramp chroma (amber 0.15, green 0.12) so the Overwatch warmth survives where it belongs.')
    w('- Light mode is designed, not inverted. Page is `neutral-50`, cards are white glass, dialogs are white. Amber text would fail on white, so the light accent is `amber-600`, a deep burnt amber that works as text and as a fill with white labels.\n')

    w('## Primary button: amber or blue?\n')
    w('We tested amber fill against a blue fill. Same page, same label rules.\n')
    w('| Mode | Option | Fill | Label | Label WCAG | Label Lc | Fill vs page | dE vs page | Hue gap to page | dE vs link blue | deutan dE vs link | tritan dE vs link |')
    w('|---|---|---|---|---|---|---|---|---|---|---|---|')
    for o in primary_options():
        w(f"| {o['mode']} | {o['name']} | `{o['fill']}` | `{o['label']}` | {f2(o['label_cr'])} | {o['label_lc']:.0f} | {f2(o['edge_cr'])} | {o['dE_page']:.3f} | {o['hue_gap']:.0f} deg | {o['dE_link']:.3f} | {o['deutan_dE']:.3f} | {o['tritan_dE']:.3f} |")
    w('')
    w('Verdict: amber stays the primary. Reasons:')
    w('- Isolation. The page is blue-tinted. A blue button sits about 10 degrees from the page hue. Amber sits about 180 degrees away. The amber fill is also far brighter against the dark page (see "Fill vs page"). One amber button wins the eye with no extra size or motion.')
    w('- Roles. Blue already means "link" and "info" and is the logo. A blue primary would give blue two jobs. The amber "highlight" left over would have no job. That breaks rule 4.')
    w('- Dark mode. The darkest blue that carries a white label (the logo blue) is only about 3:1 against the navy page. A light blue fill passes, but it then looks like the link colour (small dE vs link).')
    w('- Professionalism comes from restraint, not from the hue. Rule: one amber fill per view. Everything else is a ghost button, a link, or blue.')
    w('- Cost: under tritanopia amber and blue lean toward each other. They stay apart in lightness, and the button has a fill and a label, so it is still found.\n')

    for mode in ('dark', 'light'):
        t = MODES[mode]
        w(f'## Core values: {mode}\n')
        w('| Token | Value | OKLCH |')
        w('|---|---|---|')
        for k in ['--c-bg', '--c-bg-band', '--c-solid', '--c-text', '--c-muted', '--c-accent', '--c-on-accent', '--c-sky', '--c-ok', '--c-alert']:
            Lx, Cx, Hx = oklch(t[k])
            w(f'| `{k}` | `{t[k]}` | {Lx:.3f} {Cx:.3f} {Hx:.0f} |')
        w('')

    w('## Contrast: every text and background pair in use\n')
    w('Alpha tokens are composited over the page before measuring. Targets: body text 4.5:1 and Lc 75. Small or secondary text 4.5:1 and Lc 60. UI edges and focus 3:1 and Lc 30 (the APCA floor for non-text). APCA Lc is signed: negative means light text on dark.\n')
    w('| Foreground | Background | Use | Dark WCAG | Dark Lc | Light WCAG | Light Lc | Pass |')
    w('|---|---|---|---|---|---|---|---|')
    dr, lr = measure_pairs(md), measure_pairs(ml)
    worst = []
    for a, b in zip(dr, lr):
        ok = all([a['ok_cr'], a['ok_lc'], b['ok_cr'], b['ok_lc']])
        flag = 'yes' if ok else 'no: ' + ', '.join(n for n, v in [('dark WCAG', a['ok_cr']), ('dark Lc', a['ok_lc']), ('light WCAG', b['ok_cr']), ('light Lc', b['ok_lc'])] if not v)
        w(f"| `{a['fg']}` | `{a['bg'].replace('@accent', ' over accent')}` | {a['kind']} | {f2(a['cr'])} | {a['lc']:.0f} | {f2(b['cr'])} | {b['lc']:.0f} | {flag} |")
        if a['kind'] != 'ui': worst += [('dark', a), ('light', b)]
    wm = min(worst, key=lambda x: x[1]['cr'])
    wl = min(worst, key=lambda x: abs(x[1]['lc']))
    w('')
    w(f"Worst text pair by WCAG: `{wm[1]['fg']}` on `{wm[1]['bg']}`, {wm[0]}, {f2(wm[1]['cr'])}:1.")
    w(f"Worst text pair by APCA: `{wl[1]['fg']}` on `{wl[1]['bg'].replace('@accent', ' over accent')}`, {wl[0]}, Lc {wl[1]['lc']:.0f}.\n")
    write_notes.worst = (wm, wl)

    w('## Colour-vision deficiency\n')
    w('Machado 2009 matrices, severity 1.0, in linear RGB. Distance is OKLab dE. Below 0.06 we call it a collapse. 0.06 to 0.10 is weak.\n')
    for mode in ('dark', 'light'):
        t = MODES[mode]
        w(f'### {mode}\n')
        w('| Pair | normal | protan | deutan | tritan |')
        w('|---|---|---|---|---|')
        rep = cvd_report(t)
        for a, b in itertools.combinations(STATUS, 2):
            vals = {k: d for k, x, y, d in rep if x == a and y == b}
            cell = lambda d: f'{d:.3f}' + (' collapse' if d < .06 else ' weak' if d < .10 else '')
            w(f"| `{a}` / `{b}` | {cell(vals['none'])} | {cell(vals['protan'])} | {cell(vals['deutan'])} | {cell(vals['tritan'])} |")
        lo = min(cvd_bg(t), key=lambda r: r[2])
        w(f'\nEvery status colour keeps at least {f2(lo[2])}:1 against the page under all three simulations (lowest: `{lo[1]}`, {lo[0]}).\n')
    w('Findings:')
    w('- Lightness carries the status colours on the page. Hue alone is never trusted.')
    w('- Every status message has a glyph (tick, i, !) and words. The online chip has a dot. Errors also get a border.')
    w('- Amber and alert red sit close under protan and deutan. Amber never means status: it is only for actions. Alerts always carry the "!" glyph, the word and a border.')
    w('- Light ok is `green-800`, darker than alert `red-600`. Protanopes see red darker than it is, so the green has to sit well below the red in lightness or the two merge.\n')

    w('## Isometric faces\n')
    w('Top must be lightest, then left, then right. Ratios are between neighbouring faces.\n')
    w('| Mode | Object | L top / left / right | Order ok | top:left | left:right | Min vs ground |')
    w('|---|---|---|---|---|---|---|')
    for mode in ('dark', 'light'):
        for r in iso_report(MODES[mode]):
            w(f"| {mode} | {r['name']} | {' / '.join(f'{x:.2f}' for x in r['L'])} | {'yes' if r['order'] else 'NO'} | {f2(r['tl'])} | {f2(r['lr'])} | {f2(r['ground'])} |")
    w('')

    w('## Known weaknesses\n')
    w('- `--c-accent` does two jobs in light mode: text and button fill. One deep amber (`amber-600`) does both. It reads more burnt-orange than the dark-mode amber. A future `--c-accent-text` token would let light buttons use a brighter amber fill with dark labels.')
    w('- `--c-line-2` was raised to meet 3:1 for control edges. Places that used it as a soft card border will look heavier. Those should move to `--c-line`.')
    w('- `--c-sky` is the left face of blue boxes. In light mode it is `blue-700`, so blue boxes are much darker than in dark mode. They still read top-light, right-dark.')
    w(f'- Alert red sits 9 degrees from the logo crimson. Light alert is `red-600` (dE {dE(Rd[600], LOGO_CRIMSON):.3f} from crimson). `red-700` was only {dE(Rd[700], LOGO_CRIMSON):.3f} away, so it stays out of the UI.')
    w('- The amber box in light mode is close to the white page in lightness. The amber-700 edge and the drop shadow separate it.')
    w('- Light-mode `--iso-shadow` is navy, not black, used at 0.35. That may be heavy on big drawings. Check at hero scale.')
    w('- APCA Lc for muted text near 60 means: fine at 16px and up, not for 12px labels. Keep 12px labels in `--c-text`.')
    w('- `--c-glass` assumes the content under the header is mostly page colour. Over a bright drawing the text ratio drops.')
    open(os.path.join(HERE, 'notes.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(L) + '\n')

# ---------------------------------------------------------------- run
if __name__ == '__main__':
    for n, r in R.items():
        print(f'{n:8}', ' '.join(r.values()))
    write_tokens(); write_preview(); write_notes()
    for mode in ('dark', 'light'):
        print(f'\n== {mode}')
        for r in measure_pairs(MODES[mode]):
            mark = '' if r['ok_cr'] and r['ok_lc'] else '   <-- FAIL'
            print(f"{r['fg']:16} on {r['bg']:22} {r['kind']:5} {r['cr']:5.2f}  Lc {r['lc']:6.1f}{mark}")
        for r in iso_report(MODES[mode]):
            print('iso', r['name'], [round(x, 2) for x in r['L']], r['order'], round(r['tl'], 2), round(r['lr'], 2), round(r['ground'], 2))
        for k, a, b, d in cvd_report(MODES[mode]):
            if d < .10: print('cvd', k, a, b, round(d, 3))
    print()
    for o in primary_options():
        print('primary', o['mode'], o['name'], o['fill'], round(o['label_cr'], 2), round(o['label_lc']), round(o['edge_cr'], 2),
              round(o['dE_page'], 3), round(o['hue_gap']), round(o['dE_link'], 3), round(o['tritan_dE'], 3))
    wm, wl = write_notes.worst
    print('worst WCAG', wm[0], wm[1]['fg'], wm[1]['bg'], round(wm[1]['cr'], 2), '| worst APCA', wl[0], wl[1]['fg'], wl[1]['bg'], round(wl[1]['lc']))
