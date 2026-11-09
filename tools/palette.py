"""Drawing colours for every tools/gen_*.py, read from src/styles/tokens.css.

    import palette as pal        then pal.AMBER, pal.EDGE, pal.SCREEN ...

Roles come straight from tokens.css (the roles in docs/design.md), so a colour change
there reaches the drawings on the next run of each gen script.
Shades the drawings need but docs/design.md has no role for (DESIGN-GAP) are worked out here from the
palette: navy(L) is the palette's neutral at OKLCH lightness L, tone(hue, L, C) a colour on one of
its hues. The numbers are the old shade's lightness and chroma, so each keeps its weight in the drawing.
"""
import math
import pathlib
import re

TOKENS = pathlib.Path(__file__).resolve().parent.parent / 'src' / 'styles' / 'tokens.css'


class PaletteError(ValueError):
    """tokens.css doesn't give a drawing colour in a form the drawings can use."""


def root_block(css):
    """The body of the top-level :root { } rule (not one inside @media or another block). Comments are skipped."""
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    depth, i = 0, 0
    for m in re.finditer(r'[{}]', css):
        if m.group() == '}':
            depth -= 1
            continue
        if depth == 0 and re.fullmatch(r'\s*:root\s*', css[i:m.start()].rsplit(';', 1)[-1].rsplit('}', 1)[-1]):
            end, d = m.end(), 1
            for n in re.finditer(r'[{}]', css[end:]):
                d += 1 if n.group() == '{' else -1
                if d == 0:
                    return css[end:end + n.start()]
            raise PaletteError(':root { in tokens.css is never closed')
        depth += 1
        i = m.end()
    raise PaletteError('tokens.css has no top-level :root { } block')


def read_tokens(css):
    """{name: value} for every custom property in the top-level :root block (values as written, trimmed)."""
    return {k: v.strip() for k, v in re.findall(r'--([A-Za-z0-9-]+)\s*:\s*([^;]*)', root_block(css))}


def solid(name, value):
    """#RRGGBB (upper case) from a #RGB or #RRGGBB token value; anything else is a PaletteError naming the token."""
    if not re.fullmatch(r'#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})', value):
        raise PaletteError(f'--{name} in tokens.css is "{value}": the drawings take a solid colour written as #RGB or '
                           f'#RRGGBB (not oklch(), var(), an alpha channel or another form)')
    v = value.upper()
    return '#' + ''.join(c * 2 for c in v[1:]) if len(v) == 4 else v


_tok = read_tokens(TOKENS.read_text(encoding='utf-8'))


def tok(name):
    """A solid colour from tokens.css, e.g. tok('iso-top')."""
    if name not in _tok:
        raise PaletteError(f'--{name} is not in the top-level :root block of tokens.css')
    return solid(name, _tok[name])


# ---- OKLCH, for the shades without a role -------------------------------------------------------
def _oklch(hex_):
    r, g, b = (int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    l = (0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]) ** (1 / 3)
    m = (0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]) ** (1 / 3)
    s = (0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    b2 = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, b2)


def _hex(L, C, h):
    a, b = C * math.cos(math.radians(h)), C * math.sin(math.radians(h))
    l, m, s = ((L + 0.3963377774 * a + 0.2158037573 * b) ** 3, (L - 0.1055613458 * a - 0.0638541728 * b) ** 3,
               (L - 0.0894841775 * a - 1.2914855480 * b) ** 3)
    rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    out = []
    for c in rgb:
        c = min(max(c, 0.0), 1.0)
        out.append(round((12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055) * 255))
    return '#%02X%02X%02X' % tuple(out)


HUE = {'neutral': 250, 'blue': 239.4, 'amber': 66, 'green': 158, 'red': 29}   # docs/design.md, "Ramps"
_NEUTRAL = sorted(_oklch(h) for h in ('#F2F7FC', '#E6ECF2', '#D2D8DE', '#BBC2C9', '#A1A9B1', '#838C95',
                                      '#656E78', '#4D5863', '#37424E', '#222E3A', '#0E1A27'))   # docs/design.md, "Ramps"


def navy(L):
    """The palette's neutral at OKLCH lightness L (its chroma rises as it darkens)."""
    for (l0, c0), (l1, c1) in zip(_NEUTRAL, _NEUTRAL[1:]):
        if l0 <= L <= l1:
            return _hex(L, c0 + (c1 - c0) * (L - l0) / (l1 - l0), HUE['neutral'])
    return _hex(L, (_NEUTRAL[0] if L < _NEUTRAL[0][0] else _NEUTRAL[-1])[1], HUE['neutral'])


def tone(hue, L, C):
    """A colour on one of the palette's hues at OKLCH lightness L and chroma C."""
    return _hex(L, C, HUE[hue])


# ---- roles (tokens.css) ------------------------------------------------------------------------
TOP, LEFT, RIGHT = tok('iso-top'), tok('iso-left'), tok('iso-right')            # plain box faces
EDGE = tok('iso-edge')                                                           # face outline, drawn at 0.3
HI_TOP, HI_LEFT, HI_RIGHT = tok('iso-hi-top'), tok('iso-hi-left'), tok('iso-hi-right')   # amber box
HI_EDGE = tok('iso-hi-edge')
SKY_TOP, SKY, SKY_RIGHT = tok('iso-sky-top'), tok('iso-sky-left'), tok('iso-sky-right')  # blue box; SKY also blue lines
GREEN_TOP, GREEN_MID, GREEN_DARK = tok('iso-green-top'), tok('iso-green-mid'), tok('iso-green-dark')
GRID, WINDOW, LIGHT = tok('iso-grid'), tok('iso-window'), tok('iso-light')
AMBER = tok('iso-hi-left')        # amber lines, dots and rings in a drawing
PAGE = tok('c-bg')                # halos and dot rims: the page colour
SOLID = tok('c-solid')            # opaque label card
WHITE, GREY = tok('c-text'), tok('c-muted')     # label text
ON_AMBER = tok('c-on-accent')     # ink on a lit amber tile
GREEN = tok('c-ok')               # online text and dot
LED = tok('iso-led')              # green LED (same value as GREEN today, its own job)
RED = tok('c-alert')              # alarm red

# ---- shades with no role (DESIGN-GAP), from the old shade's lightness and chroma ------------------
DROP = navy(0.173)                # soft drop shadow under the help desk
SCREEN = navy(0.255)              # screen glass
GLASS = navy(0.283)               # windows and drive bays, unlit
PATH = navy(0.305)                # paved path
APP_BAR = navy(0.318)             # app window title bar, keyboard
TRAY_LEFT, TRAY_RIGHT, TRAY_TOP = navy(0.346), navy(0.307), navy(0.405)   # hero app-tile tray
CLOUD_TOP, CLOUD_BOT = navy(0.395), navy(0.335)        # hero 3D cloud face, top and bottom of its gradient
CLOUD_SIDE_DARK, CLOUD_SIDE_LIGHT = navy(0.317), navy(0.453)   # hero 3D cloud side wall, shaded between these
RUG, MAT = navy(0.387), navy(0.423)                    # office waiting-area rug, entrance mat
BUBBLE = navy(0.406)              # chat bubble
STEP_LEFT, STEP_RIGHT, STEP_TOP = navy(0.474), navy(0.412), navy(0.536)  # HQ front step
DIM = navy(0.503)                 # unlit indicator dot
CABLE = navy(0.534)               # VoIP headset mic boom
MUG_LEFT, MUG_RIGHT, MUG_TOP = navy(0.863), navy(0.781), navy(0.940)     # coffee mug
GLASS_LIT = tone('blue', 0.399, 0.060)                 # lit window, security drawing
GUEST_LEFT, GUEST_RIGHT = tone('blue', 0.579, 0.106), tone('blue', 0.509, 0.095)   # guest Wi-Fi point (top is SKY)
LEAF_SHADE, LEAF_LIGHT = tone('green', 0.466, 0.069), tone('green', 0.705, 0.109)  # office plant (dark side is GREEN_DARK)
VENT = tone('amber', 0.501, 0.099)                     # vent lines on the amber rack
STEP_EDGE = tone('amber', 0.579, 0.114)                # outline of the lit security step
RED_DOT = tone('red', 0.723, 0.149)                    # red dot in app windows and phones
