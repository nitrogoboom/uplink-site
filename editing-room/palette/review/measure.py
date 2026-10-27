"""Independent palette measurement. Reviewer's own code; imports nothing from the proposals.

Reads proposal-*/tokens.css (dark = :root, light = :root[data-theme="light"] over dark).
Prints WCAG 2 ratios, APCA Lc (0.0.98G-4g), OKLCH, Machado 2009 CVD dE (OKLab x100),
isometric face order, and logo contrast.
Run: python review/measure.py            (proposals a b c)
     python review/measure.py final      (any folder under palette/ with a tokens.css)
"""
import itertools
import math
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
LOGO_BLUE, LOGO_CRIMSON = (0x1F, 0x75, 0xA6, 1.0), (0x8D, 0x24, 0x2E, 1.0)


# ---------- parsing ----------
def parse_color(v):
    v = v.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", v)
    if m:
        h = m.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = re.fullmatch(r"#([0-9a-fA-F]{3})", v)
    if m:
        return tuple(int(c * 2, 16) for c in m.group(1)) + (1.0,)
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)", v)
    if m:
        a = m.group(4)
        a = 1.0 if a is None else (float(a[:-1]) / 100 if a.endswith("%") else float(a))
        return (float(m.group(1)), float(m.group(2)), float(m.group(3)), a)
    return None


def blocks(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = {}
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        d = dict(re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", body))
        out.setdefault(sel.strip(), {}).update({k: v.strip() for k, v in d.items()})
    return out


def load(path):
    b = blocks(path.read_text(encoding="utf-8"))
    dark = dict(b.get(":root", {}))
    light = dict(dark)
    light.update(b.get(':root[data-theme="light"]', {}))

    def resolve(d):
        r = {}
        for k, v in d.items():
            n = 0
            while v.startswith("var(") and n < 10:
                v = d.get(v[4:-1].strip(), v)
                n += 1
            c = parse_color(v)
            if c:
                r[k] = c
        return r

    return {"dark": resolve(dark), "light": resolve(light)}


# ---------- colour maths ----------
def over(fg, bg):
    a = fg[3]
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def delin(c):
    c = max(0.0, min(1.0, c))
    return 255 * (12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055)


def rel_lum(c):
    r, g, b = (lin(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def wcag(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def apca(txt, bg):
    """APCA-W3 0.0.98G-4g. Positive = dark text on light, negative = light on dark."""
    def y(c):
        r, g, b = ((x / 255) ** 2.4 for x in c[:3])
        v = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b
        return v if v > 0.022 else v + (0.022 - v) ** 1.414

    yt, yb = y(txt), y(bg)
    if abs(yb - yt) < 0.0005:
        return 0.0
    if yb > yt:
        s = (yb ** 0.56 - yt ** 0.57) * 1.14
        return 0.0 if s < 0.1 else (s - 0.027) * 100
    s = (yb ** 0.65 - yt ** 0.62) * 1.14
    return 0.0 if s > -0.1 else (s + 0.027) * 100


def oklab(c):
    r, g, b = (lin(x) for x in c[:3])
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def oklch(c):
    L, a, b = oklab(c)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def dE(a, b):
    return 100 * math.dist(oklab(a), oklab(b))


MACHADO = {  # severity 1.0, applied to linear RGB (Machado, Oliveira, Fernandes 2009)
    "protan": [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    "deutan": [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    "tritan": [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}


def sim(c, kind):
    if kind == "normal":
        return c
    v = [lin(x) for x in c[:3]]
    M = MACHADO[kind]
    return tuple(delin(sum(M[i][j] * v[j] for j in range(3))) for i in range(3)) + (1.0,)


def hexs(c):
    return "#%02X%02X%02X" % tuple(round(x) for x in c[:3])


# ---------- what to measure (pairs taken from how src/ uses the tokens) ----------
TEXT_FG = ["text", "muted", "accent-text", "accent", "sky", "ok", "alert", "cool-muted"]
GROUNDS = ["bg", "bg-band", "solid", "surface", "surface@band", "surface-2", "glass", "cool-surface", "cool-surface-2"]
UI = [("line-2", "bg"), ("line-2", "surface"), ("edge", "bg"), ("edge", "surface"), ("edge", "solid"),
      ("focus", "bg"), ("focus", "surface"), ("focus", "solid"),
      ("accent", "bg"), ("accent-ring", "bg"), ("sky", "bg"), ("ok", "bg"), ("alert", "bg")]


def run(name, path):
    t = load(path)
    print(f"\n{'=' * 78}\n {name.upper()}  ({path})\n{'=' * 78}")
    for mode in ("dark", "light"):
        T = t[mode]
        bg, band = T["--c-bg"], T["--c-bg-band"]

        def g(n):
            if n == "surface@band":
                return over(T["--c-surface"], band)
            c = T.get("--c-" + n)
            if c is None:
                return None
            return over(c, bg) if c[3] < 1 else c

        def focus():
            for k in ("--c-focus", "--c-accent-text", "--c-accent"):
                if k in T:
                    return over(T[k], bg)

        print(f"\n--- {mode}: core OKLCH (L C H) ---")
        for k in ["bg", "bg-band", "solid", "text", "muted", "accent", "accent-text", "on-accent", "sky", "ok", "alert", "edge", "line-2"]:
            c = g(k)
            if c:
                L, C, H = oklch(c)
                print(f"  {k:12s} {hexs(c)}  {L:.3f} {C:.3f} {H:5.1f}")

        print(f"\n--- {mode}: text pairs  ratio/|Lc|   !! = under 4.5:1   ~ = |Lc| under 60 ---")
        for f in TEXT_FG:
            fc = g(f)
            if not fc:
                continue
            cells = []
            for gn in GROUNDS:
                gc = g(gn)
                if not gc:
                    continue
                r, lc = wcag(fc, gc), abs(apca(fc, gc))
                cells.append(f"{gn}:{r:.2f}/{lc:.0f}{'!!' if r < 4.5 else ('~' if lc < 60 else '')}")
            print(f"  {f:11s} " + "  ".join(cells))
        pairs = [("on-accent", "accent"), ("accent", "accent-tint"), ("accent-text", "accent-tint"),
                 ("sky", "sky-tint"), ("ok", "ok-tint")]
        for f, b in pairs:
            fc, bc = g(f), g(b)
            if fc and bc:
                print(f"  {f} on {b}: {wcag(fc, bc):.2f} / Lc {abs(apca(fc, bc)):.0f}")
        acc = g("accent")
        ink = over(T["--c-ink-tint"], acc)
        print(f"  on-accent on ink-tint over accent: {wcag(g('on-accent'), ink):.2f} / Lc {abs(apca(g('on-accent'), ink)):.0f}")

        print(f"\n--- {mode}: non-text (needs 3:1) ---")
        for f, b in UI:
            bc = g(b)
            raw = T.get("--c-" + f)
            # a translucent edge is drawn over the surface it sits on, not over the page
            fc = focus() if f == "focus" else (over(raw, bc) if raw and bc and raw[3] < 1 else g(f))
            if fc and bc:
                r = wcag(fc, bc)
                print(f"  {f:11s} on {b:8s} {r:5.2f} {'FAIL' if r < 3 else 'ok'}")
        print(f"  accent fill vs page: {wcag(acc, bg):.2f}  (label carries meaning; edge not required)")
        print(f"  logo blue vs bg {wcag(LOGO_BLUE, bg):.2f} | crimson vs bg {wcag(LOGO_CRIMSON, bg):.2f}"
              f" | sky hue gap to logo {abs(oklch(g('sky'))[2] - oklch(LOGO_BLUE)[2]):.1f} deg | bg hue {oklch(bg)[2]:.0f}")
        print(f"  dE to logo crimson: accent {dE(acc, LOGO_CRIMSON):.1f}, alert {dE(g('alert'), LOGO_CRIMSON):.1f}")

        print(f"\n--- {mode}: CVD (Machado 1.0), OKLab dE x100, * = under 10 ---")
        S = {k: g(k) for k in ("accent", "sky", "ok", "alert")}
        if g("accent-text"):
            S["accent-text"] = g("accent-text")
        for kind in ("normal", "protan", "deutan", "tritan"):
            ds = sorted((dE(sim(S[a], kind), sim(S[b], kind)), f"{a}/{b}") for a, b in itertools.combinations(S, 2))
            iso1 = dE(sim(T["--iso-hi-left"], kind), sim(T["--iso-green-mid"], kind))
            iso2 = dE(sim(T["--iso-sky-top"], kind), sim(T["--iso-green-top"], kind))
            print(f"  {kind:7s} " + "  ".join(f"{n} {d:4.1f}{'*' if d < 10 else ''}" for d, n in ds)
                  + f" | iso amber/green {iso1:.1f}, iso skytop/greentop {iso2:.1f}")

        print(f"\n--- {mode}: isometric faces (OKLab L top>left>right) ---")
        sets = {"box": ("--iso-top", "--iso-left", "--iso-right"),
                "amber": ("--iso-hi-top", "--iso-hi-left", "--iso-hi-right"),
                "blue": ("--iso-sky-top", "--iso-sky-left" if "--iso-sky-left" in T else "--c-sky", "--iso-sky-right"),
                "green": ("--iso-green-top", "--iso-green-mid", "--iso-green-dark")}
        ground = T["--iso-ground"]

        def ordered(L):
            return L[0] > L[1] > L[2]

        for s, keys in sets.items():
            Ls = [oklab(T[x])[0] for x in keys]
            cvd = all(ordered([oklab(sim(T[x], k))[0] for x in keys]) for k in MACHADO)
            print(f"  {s:6s} L {Ls[0]:.2f}/{Ls[1]:.2f}/{Ls[2]:.2f}  steps {Ls[0]-Ls[1]:.2f},{Ls[1]-Ls[2]:.2f}"
                  f"  order {'ok' if ordered(Ls) else 'BROKEN'}  cvd {'ok' if cvd else 'BROKEN'}"
                  f"  top~ground dE {dE(T[keys[0]], ground):.1f}  top~page {dE(T[keys[0]], bg):.1f}  right~ground {dE(T[keys[2]], ground):.1f}")
        print(f"  grid vs ground {wcag(T['--iso-grid'], ground):.2f}:1; window~ground dE {dE(T['--iso-window'], ground):.1f};"
              f" ground~page dE {dE(ground, bg):.1f}; edge(0.3) on top dE {dE(over(T['--iso-edge'][:3] + (0.3,), T['--iso-top']), T['--iso-top']):.1f}")
    return t


if __name__ == "__main__":
    for n in sys.argv[1:] or ["a", "b", "c"]:
        p = ROOT / f"proposal-{n}" / "tokens.css"
        if not p.exists():
            p = ROOT / n / "tokens.css"
        run(n, p.relative_to(ROOT) if False else p)
