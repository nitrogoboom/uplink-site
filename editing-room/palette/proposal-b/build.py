"""Proposal B: evolve Uplink.

Smallest set of changes to the current tokens so the blues read as the
logo's family. Writes tokens.css and preview.html next to this file and
prints the measurements (WCAG 2, APCA Lc, CVD) as Markdown.

Run: python build.py > measurements.txt
"""
import math, os, re

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

def oklab(h): return lin2oklab(*[s2l(x) for x in hex2rgb(h)])
def oklch(h):
    L, a, b = oklab(h); return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360

def oklch2lin(L, C, H):
    a = C*math.cos(math.radians(H)); b = C*math.sin(math.radians(H))
    l = (L + 0.3963377774*a + 0.2158037573*b) ** 3
    m = (L - 0.1055613458*a - 0.0638541728*b) ** 3
    s = (L - 0.0894841775*a - 1.2914855480*b) ** 3
    return [4.0767416621*l - 3.3077115913*m + 0.2309699292*s,
            -1.2684380046*l + 2.6097574011*m - 0.3413193965*s,
            -0.0041960863*l - 0.7034186147*m + 1.7076147010*s]

def ingamut(L, C, H): return all(-1e-4 <= x <= 1 + 1e-4 for x in oklch2lin(L, C, H))
def hx(L, C, H):
    """OKLCH -> hex, reducing chroma until it fits sRGB."""
    if not ingamut(L, C, H):
        lo, hi = 0, C
        for _ in range(30):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if ingamut(L, mid, H) else (lo, mid)
        C = lo
    return '#' + ''.join('%02X' % round(l2s(x) * 255) for x in oklch2lin(L, C, H))

def rehue(h, H):
    """Keep lightness and chroma, move hue. The core move of this proposal."""
    L, C, _ = oklch(h); return hx(L, C, H)

def over(fg_hex, alpha, bg_hex):
    f, b = hex2rgb(fg_hex), hex2rgb(bg_hex)
    return rgb2hex([alpha*x + (1 - alpha)*y for x, y in zip(f, b)])

def lum(h): r, g, b = [s2l(x) for x in hex2rgb(h)]; return .2126*r + .7152*g + .0722*b
def wcag(a, b): x, y = sorted([lum(a), lum(b)]); return (y + .05) / (x + .05)

def apca(txt, bg):
    """APCA-W3 0.0.98G-4g. Returns signed Lc (negative = light text on dark)."""
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

# Machado, Oliveira & Fernandes 2009, severity 1.0, applied in linear sRGB.
CVD = {
    'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deutan': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}
def simulate(h, kind):
    v = [s2l(x) for x in hex2rgb(h)]
    out = [sum(m * c for m, c in zip(row, v)) for row in CVD[kind]]
    return rgb2hex([l2s(x) * 255 for x in out])
def dE(a, b):
    A, B = oklab(a), oklab(b); return math.dist(A, B) * 100

# ---------------------------------------------------------------- anchors
LOGO_BLUE, CRIMSON = '#1F75A6', '#8D242E'
H_BLUE = oklch(LOGO_BLUE)[2]          # 239.4
H_NEUTRAL = 247                        # within 8 deg of the logo hue; still navy, not petrol
CUR = {}                               # current dark tokens, parsed from inputs
src = open(os.path.join(HERE, '..', 'inputs', 'tokens-current.css'), encoding='utf-8').read()
for name, val in re.findall(r'(--(?:c|iso)-[a-z0-9-]+):\s*([^;]+);', src):
    CUR[name] = val.strip()

# ---------------------------------------------------------------- ramps
STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
LS    = [.970, .930, .880, .820, .763, .660, .560, .480, .400, .310, .233]
# 400 sits at the current sky lightness (.763), 950 at the current page (.233).

def ramp(anchor, H_light=None, H_dark=None, exact_at=None):
    """Lightness from LS, chroma peaks at the anchor and tapers to both ends.
    Hue may drift linearly from H_light (step 50) to H_dark (step 950)."""
    L0, C0, H0 = oklch(anchor)
    H_light = H0 if H_light is None else H_light
    H_dark = H0 if H_dark is None else H_dark
    out = {}
    for i, (st, L) in enumerate(zip(STEPS, LS)):
        f = 1 - 0.7*((L - L0) / (1 - L0)) ** 1.5 if L > L0 else 1 - 0.45*((L0 - L) / L0) ** 1.5
        H = H_light + (H_dark - H_light) * i / (len(LS) - 1)
        out[st] = hx(L, C0 * f, H)
    if exact_at: out[exact_at] = anchor.upper()
    return out

def neutral_ramp(H):
    # chroma rises gently as it darkens, like the current navy (C .006 at text, .03 at page)
    return {st: hx(L, 0.006 + 0.034 * (1 - L) ** 1.2, H) for st, L in zip(STEPS, LS)}

RAMPS = {
    'blue':    ramp(LOGO_BLUE, exact_at=600),                       # logo blue is 600
    'amber':   ramp(CUR['--c-accent'], H_light=72, H_dark=56, exact_at=None),
    'green':   ramp(CUR['--c-ok']),
    'coral':   ramp(CUR['--c-alert']),
    'neutral': neutral_ramp(H_NEUTRAL),
}
# amber: current #F4A340 is at L .779, between 300 (.82) and 400 (.763). Keep it exact as 400.
RAMPS['amber'][400] = CUR['--c-accent'].upper()
RAMPS['green'][300] = CUR['--c-ok'].upper()        # L .792
RAMPS['coral'][400] = CUR['--c-alert'].upper()     # L .737
B, A, G, R, N = (RAMPS[k] for k in ('blue', 'amber', 'green', 'coral', 'neutral'))

def rgba(h, a): r, g, b = hex2rgb(h); return f'rgb({r} {g} {b} / {a})'

# ---------------------------------------------------------------- dark (today, re-hued)
Nh = lambda k: rehue(CUR[k], H_NEUTRAL)
dark = {
    '--c-bg': Nh('--c-bg'), '--c-bg-band': Nh('--c-bg-band'), '--c-solid': Nh('--c-solid'),
    '--c-surface': 'rgb(255 255 255 / 0.05)', '--c-surface-2': 'rgb(255 255 255 / 0.09)',
    '--c-well': 'rgb(0 0 0 / 0.18)',
    '--c-line': 'rgb(255 255 255 / 0.09)', '--c-line-2': 'rgb(255 255 255 / 0.18)',
    '--c-text': Nh('--c-text'), '--c-muted': Nh('--c-muted'),
    '--c-accent': CUR['--c-accent'], '--c-on-accent': Nh('--c-on-accent'),
    '--c-sky': B[400], '--c-ok': CUR['--c-ok'], '--c-alert': CUR['--c-alert'],
    '--c-cool-muted': rehue(CUR['--c-cool-muted'], H_NEUTRAL - 5),  # a touch nearer the logo hue
    '--iso-top': Nh('--iso-top'), '--iso-left': Nh('--iso-left'), '--iso-right': Nh('--iso-right'),
    '--iso-edge': Nh('--iso-edge'),
    '--iso-hi-top': CUR['--iso-hi-top'], '--iso-hi-left': CUR['--iso-hi-left'],
    '--iso-hi-right': CUR['--iso-hi-right'], '--iso-hi-edge': CUR['--iso-hi-edge'],
    '--iso-sky-top': rehue(CUR['--iso-sky-top'], H_BLUE), '--iso-sky-right': rehue(CUR['--iso-sky-right'], H_BLUE),
    '--iso-green-top': CUR['--iso-green-top'], '--iso-green-mid': CUR['--iso-green-mid'],
    '--iso-green-dark': CUR['--iso-green-dark'],
    '--iso-ground': Nh('--iso-ground'), '--iso-grid': Nh('--iso-grid'), '--iso-window': Nh('--iso-window'),
    '--iso-light': CUR['--iso-light'], '--iso-shadow': '#000000',
}
cool_light = rehue('#C4DCF8', H_BLUE)   # the hero's cool light, now on the logo hue
dark.update({
    '--c-accent-tint': rgba(dark['--c-accent'], 0.12), '--c-accent-faint': rgba(dark['--c-accent'], 0.06),
    '--c-accent-ring': rgba(dark['--c-accent'], 0.25),
    '--c-sky-tint': rgba(dark['--c-sky'], 0.16), '--c-ok-tint': rgba(dark['--c-ok'], 0.16),
    '--c-ink-tint': rgba(dark['--c-on-accent'], 0.16),
    '--c-glass': rgba(dark['--c-bg'], 0.88), '--c-glass-2': rgba(dark['--c-solid'], 0.92),
    '--c-backdrop': rgba(hx(0.15, 0.025, H_NEUTRAL), 0.62),
    '--c-glow-accent': rgba(dark['--c-accent'], 0.07), '--c-glow-sky': rgba(dark['--c-sky'], 0.09),
    '--c-glow-sky-2': rgba(dark['--c-sky'], 0.11),
    '--c-cool-surface': rgba(cool_light, 0.05), '--c-cool-surface-2': rgba(cool_light, 0.10),
})

# ---------------------------------------------------------------- light (designed on its own)
# Amber as text and as a button fill must share one token. Find the lightest amber
# (hue 58, near the blue's complement 59) that passes 4.5:1 both as text on the
# page and under white button text.
def solve_light_accent(bg):
    for i in range(400):
        L = 0.70 - i * 0.001
        c = hx(L, 0.16, 58)
        if wcag(c, '#FFFFFF') >= 4.6 and wcag(c, bg) >= 4.6:
            return c
light_bg = hx(0.982, 0.005, H_NEUTRAL)
light = {
    '--c-bg': light_bg, '--c-bg-band': hx(0.958, 0.009, H_NEUTRAL), '--c-solid': '#FFFFFF',
    '--c-surface': 'rgb(255 255 255 / 0.78)', '--c-surface-2': rgba(N[900], 0.06),
    '--c-well': rgba(N[900], 0.05),
    '--c-line': rgba(N[900], 0.12), '--c-line-2': rgba(N[900], 0.24),
    '--c-text': hx(0.225, 0.022, H_NEUTRAL), '--c-muted': hx(0.475, 0.030, H_NEUTRAL),
    '--c-accent': solve_light_accent(hx(0.958, 0.009, H_NEUTRAL)), '--c-on-accent': '#FFFFFF',
    '--c-sky': hx(0.505, oklch(LOGO_BLUE)[1], H_BLUE), '--c-ok': hx(0.500, 0.105, 158), '--c-alert': hx(0.520, 0.170, 27),
    '--c-cool-muted': hx(0.475, 0.035, H_BLUE + 4),
    '--iso-top': hx(0.955, 0.012, H_NEUTRAL), '--iso-left': hx(0.865, 0.020, H_NEUTRAL),
    '--iso-right': hx(0.775, 0.026, H_NEUTRAL), '--iso-edge': N[800],
    '--iso-hi-top': CUR['--iso-hi-top'], '--iso-hi-left': CUR['--iso-hi-left'],
    '--iso-hi-right': CUR['--iso-hi-right'], '--iso-hi-edge': A[800],
    '--iso-sky-top': B[300], '--iso-sky-right': B[800],
    '--iso-green-top': CUR['--iso-green-top'], '--iso-green-mid': CUR['--iso-green-mid'],
    '--iso-green-dark': CUR['--iso-green-dark'],
    '--iso-ground': hx(0.925, 0.012, H_NEUTRAL), '--iso-grid': hx(0.860, 0.016, H_NEUTRAL),
    '--iso-window': hx(0.700, 0.025, H_NEUTRAL), '--iso-light': A[100], '--iso-shadow': N[900],
}
light.update({
    '--c-accent-tint': rgba(light['--c-accent'], 0.07), '--c-accent-faint': rgba(light['--c-accent'], 0.05),
    '--c-accent-ring': rgba(light['--c-accent'], 0.30),
    '--c-sky-tint': rgba(light['--c-sky'], 0.07), '--c-ok-tint': rgba(light['--c-ok'], 0.08),
    '--c-ink-tint': rgba(N[950], 0.16),
    '--c-glass': rgba(light['--c-bg'], 0.88), '--c-glass-2': rgba('#FFFFFF', 0.92),
    '--c-backdrop': rgba(N[950], 0.40),
    '--c-glow-accent': rgba(light['--c-accent'], 0.06), '--c-glow-sky': rgba(B[400], 0.14),
    '--c-glow-sky-2': rgba(B[400], 0.16),
    '--c-cool-surface': rgba(B[400], 0.06), '--c-cool-surface-2': rgba(B[400], 0.11),
})

ORDER = [k for k in CUR]  # same order and names as the live file
assert set(ORDER) == set(dark) == set(light), (set(ORDER) ^ set(dark), set(ORDER) ^ set(light))

# ---------------------------------------------------------------- write tokens.css
def block(sel, d, ramps, indent='  '):
    lines = [f'{sel} {{']
    if sel == ':root': lines.append(f'{indent}color-scheme: dark;')
    else: lines.append(f'{indent}color-scheme: light;')
    for k in ORDER:
        lines.append(f'{indent}{k}: {d[k]};')
    if ramps:
        lines.append('')
        lines.append(f'{indent}/* ramps (same in both modes) */')
        for name, r in RAMPS.items():
            lines.append(f'{indent}' + ' '.join(f'--{name}-{s}: {r[s]};' for s in STEPS[:6]))
            lines.append(f'{indent}' + ' '.join(f'--{name}-{s}: {r[s]};' for s in STEPS[6:]))
        lines.append(f'{indent}--logo-blue: {LOGO_BLUE}; /* logo only */')
        lines.append(f'{indent}--logo-crimson: {CRIMSON}; /* logo only, never UI */')
    lines.append('}')
    return '\n'.join(lines)

css = ('/* Proposal B: evolve Uplink. Generated by build.py; edit the script, not this file.\n'
       '   Dark is the default. Light mode: <html data-theme="light">. */\n\n'
       + block(':root', dark, True) + '\n\n' + block(':root[data-theme="light"]', light, False) + '\n')
open(os.path.join(HERE, 'tokens.css'), 'w', encoding='utf-8').write(css)

# ---------------------------------------------------------------- measure
def solid(d, k, base=None):
    """Resolve a token to an opaque hex, compositing alpha over base (default page)."""
    v = d[k]; base = base or d['--c-bg']
    m = re.match(r'rgb\((\d+) (\d+) (\d+) / ([\d.]+)\)', v)
    if m:
        r, g, b, a = int(m[1]), int(m[2]), int(m[3]), float(m[4])
        return over(rgb2hex([r, g, b]), a, base)
    return v

PAIRS = [  # (text token, background token, composited over, use)
    ('--c-text', '--c-bg', None, 'body'), ('--c-text', '--c-bg-band', None, 'body'),
    ('--c-text', '--c-solid', None, 'body'), ('--c-text', '--c-surface', None, 'body'),
    ('--c-text', '--c-surface-2', None, 'body'), ('--c-text', '--c-cool-surface', None, 'body'),
    ('--c-text', '--c-glass', None, 'nav'),
    ('--c-muted', '--c-bg', None, 'body'), ('--c-muted', '--c-bg-band', None, 'body'),
    ('--c-muted', '--c-solid', None, 'body'), ('--c-muted', '--c-surface', None, 'body'),
    ('--c-muted', '--c-surface-2', None, 'body'), ('--c-muted', '--c-surface', '--c-bg-band', 'body'),
    ('--c-cool-muted', '--c-bg', None, 'body'), ('--c-cool-muted', '--c-cool-surface', None, 'body'),
    ('--c-accent', '--c-bg', None, 'body'), ('--c-accent', '--c-bg-band', None, 'body'),
    ('--c-accent', '--c-surface', None, 'body'), ('--c-accent', '--c-accent-tint', None, 'body'),
    ('--c-on-accent', '--c-accent', None, 'button'),
    ('--c-sky', '--c-bg', None, 'body'), ('--c-sky', '--c-surface', None, 'body'),
    ('--c-sky', '--c-bg-band', None, 'body'), ('--c-sky', '--c-sky-tint', None, 'chip'),
    ('--c-sky', '--c-sky-tint', '--c-bg-band', 'chip'), ('--c-ok', '--c-bg-band', None, 'body'),
    ('--c-ok', '--c-bg', None, 'body'), ('--c-ok', '--c-surface', None, 'body'),
    ('--c-ok', '--c-ok-tint', None, 'chip'),
    ('--c-alert', '--c-bg', None, 'body'), ('--c-alert', '--c-surface', None, 'body'),
]
NONTEXT = [  # 3:1 checks: focus, icons, UI edges
    ('--c-accent', '--c-bg', 'focus ring, ghost button edge'),
    ('--c-accent', '--c-surface', 'focus ring on card'),
    ('--c-sky', '--c-bg', 'info icon, stroke'), ('--c-ok', '--c-bg', 'online dot'),
    ('--c-alert', '--c-bg', 'error edge'), ('--c-line-2', '--c-bg', 'input / ghost edge'),
]

def resolve_pair(d, t, b, base):
    bb = solid(d, b, solid(d, base) if base else None)
    return solid(d, t), bb

def fmt(x): return f'{x:.2f}'

print('## Contrast: text on background (both modes)\n')
print('| Text | On | Use | Dark WCAG | Dark Lc | Light WCAG | Light Lc |')
print('|---|---|---|---|---|---|---|')
worst = []
for t, b, base, use in PAIRS:
    row = []
    for mode, d in (('dark', dark), ('light', light)):
        ft, fb = resolve_pair(d, t, b, base)
        w, lc = wcag(ft, fb), apca(ft, fb)
        row += [fmt(w), f'{lc:.0f}']
        worst.append((w, mode, t, b + (f' over {base}' if base else '')))
    on = b.replace('--c-', '') + (f' on {base.replace("--c-", "")}' if base else '')
    print(f'| {t.replace("--c-", "")} | {on} | {use} | ' + ' | '.join(row) + ' |')
worst.sort()
print('\nWorst text pairs:', '; '.join(f'{m} {t} on {b} {w:.2f}' for w, m, t, b in worst[:4]))

print('\n## Contrast: non-text (needs 3:1)\n')
print('| Colour | On | Use | Dark | Light |')
print('|---|---|---|---|---|')
for t, b, use in NONTEXT:
    vals = [fmt(wcag(solid(d, t), solid(d, b))) for d in (dark, light)]
    print(f'| {t.replace("--c-", "")} | {b.replace("--c-", "")} | {use} | {vals[0]} | {vals[1]} |')
print(f'| logo blue mark | bg | logo | {fmt(wcag(LOGO_BLUE, dark["--c-bg"]))} | {fmt(wcag(LOGO_BLUE, light["--c-bg"]))} |')
print(f'| logo crimson mark | bg | logo | {fmt(wcag(CRIMSON, dark["--c-bg"]))} | {fmt(wcag(CRIMSON, light["--c-bg"]))} |')

print('\n## CVD: status and signal pairs, OKLab distance x100 (under 8 = hard to tell apart by hue)\n')
CPAIRS = [('--c-ok', '--c-alert'), ('--c-ok', '--c-accent'), ('--c-alert', '--c-accent'),
          ('--c-sky', '--c-ok'), ('--c-sky', '--c-accent'), ('--c-sky', '--c-alert'),
          ('--iso-hi-left', '--iso-green-mid'), ('--iso-green-mid', '--c-sky')]
print('| Pair | Mode | Normal | Protan | Deutan | Tritan |')
print('|---|---|---|---|---|---|')
for a, b in CPAIRS:
    for mode, d in (('dark', dark), ('light', light)):
        ca, cb = solid(d, a), solid(d, b)
        vals = [dE(ca, cb)] + [dE(simulate(ca, k), simulate(cb, k)) for k in CVD]
        cells = [(f'**{v:.0f}**' if v < 8 else f'{v:.0f}') for v in vals]
        print(f'| {a.replace("--", "")} / {b.replace("--", "")} | {mode} | ' + ' | '.join(cells) + ' |')

print('\n## Iso face order (OKLCH L; top > left > right)\n')
FACES = [('box', '--iso-top', '--iso-left', '--iso-right'),
         ('amber', '--iso-hi-top', '--iso-hi-left', '--iso-hi-right'),
         ('blue', '--iso-sky-top', '--c-sky', '--iso-sky-right'),
         ('green', '--iso-green-top', '--iso-green-mid', '--iso-green-dark')]
print('| Box | Dark top/left/right | Light top/left/right | Box top vs page (light) |')
print('|---|---|---|---|')
for name, t, l, r in FACES:
    out = []
    for d in (dark, light):
        Ls = [oklch(solid(d, k))[0] for k in (t, l, r)]
        ok = Ls[0] > Ls[1] > Ls[2]
        out.append('/'.join(f'{x:.2f}' for x in Ls) + ('' if ok else ' BAD'))
    print(f'| {name} | {out[0]} | {out[1]} | {wcag(solid(light, t), light["--c-bg"]):.2f} |')

print('\n## What moved (dark mode, old -> new, OKLCH hue)\n')
for k in ORDER:
    if CUR[k].startswith('#') and dark[k].upper() != CUR[k].upper().replace('#000', '#000000'):
        print(f'- {k}: {CUR[k]} (h{oklch(CUR[k])[2]:.0f}) -> {dark[k]} (h{oklch(dark[k])[2]:.0f})')

print('\n## Ramps\n')
for name, r in RAMPS.items():
    print(f'- {name}: ' + ' '.join(f'{s}:{r[s]}' for s in STEPS))
print('\nLight accent:', light['--c-accent'], 'L/C/H', ['%.3f' % x for x in oklch(light['--c-accent'])])

# ---------------------------------------------------------------- preview.html
def scoped(sel, d):
    s = [f'{sel} {{']
    for k in ORDER: s.append(f'  {k}: {d[k]};')
    s.append('}')
    return '\n'.join(s)

def iso_scene():
    # true isometric: 30 deg axes, unit u. Cube at grid (x,y) with height h.
    u = 26; cx, cy = 200, 70
    def P(x, y, z):
        return (cx + (x - y) * u * math.cos(math.radians(30)), cy + (x + y) * u * 0.5 - z * u)
    def poly(pts, fill, extra=''):
        return f'<polygon points="{" ".join(f"{a:.1f},{b:.1f}" for a, b in pts)}" fill="var({fill})" {extra}/>'
    def cube(x, y, h, top, left, right, edge='--iso-edge'):
        e = f'stroke="var({edge})" stroke-opacity="0.3" stroke-width="1" stroke-linejoin="round"'
        return ''.join([
            poly([P(x, y, h), P(x+1, y, h), P(x+1, y+1, h), P(x, y+1, h)], top, e),
            poly([P(x, y+1, h), P(x+1, y+1, h), P(x+1, y+1, 0), P(x, y+1, 0)], left, e),
            poly([P(x+1, y, h), P(x+1, y+1, h), P(x+1, y+1, 0), P(x+1, y, 0)], right, e),
        ])
    g = [poly([P(0, 0, 0), P(6, 0, 0), P(6, 6, 0), P(0, 6, 0)], '--iso-ground')]
    for i in range(7):
        g.append(f'<line x1="{P(i,0,0)[0]:.1f}" y1="{P(i,0,0)[1]:.1f}" x2="{P(i,6,0)[0]:.1f}" y2="{P(i,6,0)[1]:.1f}" stroke="var(--iso-grid)"/>')
        g.append(f'<line x1="{P(0,i,0)[0]:.1f}" y1="{P(0,i,0)[1]:.1f}" x2="{P(6,i,0)[0]:.1f}" y2="{P(6,i,0)[1]:.1f}" stroke="var(--iso-grid)"/>')
    # shadows then cubes, back to front (painter's order: x+y ascending)
    items = [(1, 1, 3, 'box'), (3, 1, 2, 'sky'), (1, 3, 1.5, 'hi'), (4, 3, 1, 'green'), (3, 4, 2.5, 'box')]
    for x, y, h, k in items:
        sh = [P(x+1, y, 0), P(x+1.6, y+0.6, 0), P(x+1.6, y+1.6, 0), P(x+0.6, y+1.6, 0), P(x, y+1, 0), P(x+1, y+1, 0)]
        g.append(poly([P(x+1, y, 0), P(x+1.7, y+0.7, 0), P(x+1.7, y+1.7, 0), P(x+0.7, y+1.7, 0), P(x, y+1, 0), P(x+1, y+1, 0)],
                      '--iso-shadow', 'opacity="0.35"'))
    for x, y, h, k in sorted(items, key=lambda t: t[0] + t[1]):
        faces = {'box': ('--iso-top', '--iso-left', '--iso-right', '--iso-edge'),
                 'hi': ('--iso-hi-top', '--iso-hi-left', '--iso-hi-right', '--iso-hi-edge'),
                 'sky': ('--iso-sky-top', '--c-sky', '--iso-sky-right', '--iso-edge'),
                 'green': ('--iso-green-top', '--iso-green-mid', '--iso-green-dark', '--iso-edge')}[k]
        g.append(cube(x, y, h, *faces))
        if k == 'box':  # windows on the left face, one lit
            for j in range(int(h)):
                z = j + 0.35
                for wx, lit in ((0.2, j == 1), (0.6, False)):
                    pts = [P(x+wx, y+1, z+0.4), P(x+wx+0.25, y+1, z+0.4), P(x+wx+0.25, y+1, z), P(x+wx, y+1, z)]
                    g.append(poly(pts, '--iso-light' if lit else '--iso-window'))
    return f'<svg viewBox="0 0 400 290" role="img" aria-label="Isometric blocks">{"".join(g)}</svg>'

def pane(cls, logo, label):
    return f'''<section class="pane {cls}" aria-label="{label}">
  <header class="bar"><img src="../inputs/{logo}" alt="Silicon Valley Services" height="28">
    <nav><a href="#" class="cur">Services</a><a href="#">Support</a><a href="#">About</a></nav></header>
  <div class="hero">
    <div>
      <p class="eyebrow">Managed IT · {label}</p>
      <h1>IT that keeps your team working.</h1>
      <p class="lead">We run your network, devices and help desk. You get one number to call.</p>
      <div class="btns"><a class="btn" href="#">Book a call</a><a class="btn ghost" href="#">See plans</a></div>
    </div>
    <div class="scene">{iso_scene()}</div>
  </div>
  <div class="band">
    <div class="cards">
      <article class="card"><span class="chip sky">Info</span><h3>Help desk</h3><p>Real people answer in under five minutes. <a href="#">How it works</a></p></article>
      <article class="card sel"><span class="chip acc">Popular</span><h3>Managed plan</h3><p>Patching, backups and monitoring, all in one fee.</p><p class="price">$89 <small>per seat</small></p></article>
      <article class="card"><span class="chip ok"><i aria-hidden="true">●</i> Online</span><h3>Network</h3><p class="mut">All 14 sites up. Last check 2 min ago.</p></article>
    </div>
    <div class="msgs">
      <p class="msg info"><b aria-hidden="true">i</b> Maintenance window Sunday 2–4 am.</p>
      <p class="msg ok"><b aria-hidden="true">✓</b> Backup finished. 412 GB saved.</p>
      <p class="msg alert"><b aria-hidden="true">!</b> Two laptops missed last night’s patch.</p>
    </div>
    <label class="field">Work email<input type="text" placeholder="you@company.com"></label>
  </div>
</section>'''

PREVIEW_CSS = '''
*{box-sizing:border-box}
body{margin:0;font-family:Barlow,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#888}
.wrap{display:grid;grid-template-columns:1fr 1fr;min-height:100vh}
@media (max-width:1000px){.wrap{grid-template-columns:1fr}}
.pane{background:var(--c-bg);color:var(--c-text);padding:0 0 32px;min-width:0}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 24px;background:var(--c-glass);border-bottom:1px solid var(--c-line)}
.bar img{display:block;height:28px;width:auto}
.bar nav{display:flex;gap:18px;font-size:15px}
.bar a{color:var(--c-muted);text-decoration:none}
.bar a.cur{color:var(--c-text);box-shadow:inset 0 -2px 0 var(--c-accent);padding-bottom:4px}
.hero{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:center;padding:36px 24px 24px;
  background:radial-gradient(60% 70% at 80% 50%,var(--c-glow-sky),transparent),radial-gradient(40% 50% at 15% 80%,var(--c-glow-accent),transparent)}
@media (max-width:560px){.hero{grid-template-columns:1fr}}
.eyebrow{margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--c-accent);font-weight:600}
h1{font-family:'Barlow Condensed','Arial Narrow',sans-serif;font-size:44px;line-height:.95;margin:0 0 12px;font-weight:700}
.lead{color:var(--c-muted);font-size:17px;line-height:1.5;margin:0 0 20px;max-width:40ch}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;height:46px;padding:0 20px;border-radius:12px;font-weight:600;letter-spacing:.04em;text-decoration:none;
  background:var(--c-accent);color:var(--c-on-accent);border:2px solid var(--c-accent)}
.btn:focus-visible,input:focus{outline:2px solid var(--c-accent);outline-offset:2px}
.btn.ghost{background:transparent;color:var(--c-text);border-color:var(--c-line-2)}
.btn.ghost:hover{border-color:var(--c-accent)}
.scene svg{width:100%;height:auto;display:block}
.band{background:var(--c-bg-band);padding:24px;border-top:1px solid var(--c-line)}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
@media (max-width:560px){.cards{grid-template-columns:1fr}}
.card{background:var(--c-surface);border:1px solid var(--c-line);border-radius:20px;padding:16px;min-width:0}
.card.sel{background:var(--c-accent-tint);border-color:var(--c-accent)}
.card h3{margin:10px 0 6px;font-size:20px}
.card p{margin:0;font-size:15px;line-height:1.5;color:var(--c-text)}
.card p.mut,.card .price small{color:var(--c-muted)}
.card a{color:var(--c-accent);text-decoration-color:var(--c-line-2)}
.price{font-size:22px!important;font-weight:700;margin-top:8px!important}
.chip{display:inline-flex;gap:6px;align-items:center;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;padding:3px 10px;border-radius:999px}
.chip.sky{background:var(--c-sky-tint);color:var(--c-sky)}
.chip.ok{background:var(--c-ok-tint);color:var(--c-ok)}
.chip.ok i{font-style:normal;font-size:9px}
.chip.acc{background:var(--c-accent);color:var(--c-on-accent)}
.msgs{display:grid;gap:8px;margin:16px 0}
.msg{display:flex;gap:10px;align-items:center;margin:0;padding:10px 14px;border-radius:12px;background:var(--c-surface);border:1px solid var(--c-line);font-size:15px}
.msg b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;font-size:12px;flex:none;color:var(--c-bg)}
.msg.info b{background:var(--c-sky)}.msg.info{border-color:var(--c-sky)}
.msg.ok b{background:var(--c-ok)}.msg.ok{border-color:var(--c-ok)}
.msg.alert b{background:var(--c-alert)}.msg.alert{border-color:var(--c-alert);color:var(--c-text)}
.field{display:grid;gap:6px;font-size:14px;color:var(--c-muted);max-width:340px}
.field input{height:44px;border-radius:12px;border:1px solid var(--c-line-2);background:var(--c-well);color:var(--c-text);padding:0 12px;font:inherit}
.field input::placeholder{color:var(--c-muted)}
.ramps{grid-column:1/-1;background:#fff;color:#222;padding:16px 24px;font:12px/1.4 ui-monospace,Consolas,monospace}
.ramp{display:grid;grid-template-columns:70px repeat(11,1fr);gap:2px;margin:2px 0}
.ramp span{height:28px;display:grid;place-items:center;font-size:10px}
'''

def ramp_rows():
    rows = []
    for name, r in RAMPS.items():
        cells = ''.join(f'<span style="background:{r[s]};color:{"#000" if oklch(r[s])[0] > .6 else "#fff"}" title="{r[s]}">{s}</span>' for s in STEPS)
        rows.append(f'<div class="ramp"><b>{name}</b>{cells}</div>')
    return ''.join(rows)

html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposal B Palette</title>
<style>
{scoped('.mode-dark', dark)}
{scoped('.mode-light', light)}
.mode-dark{{color-scheme:dark}} .mode-light{{color-scheme:light}}
{PREVIEW_CSS}
</style></head><body>
<main class="wrap">
{pane('mode-dark', 'svs-logo-white-text.svg', 'Dark')}
{pane('mode-light', 'svs-logo-black-text.svg', 'Light')}
<section class="ramps"><p>Proposal B ramps. Generated by build.py.</p>{ramp_rows()}</section>
</main>
</body></html>
'''
open(os.path.join(HERE, 'preview.html'), 'w', encoding='utf-8').write(html)
