"""Compute Firechart heat ramps from OKLCH and check them.

Run: python tools/ramps.py

Each ramp has four levels, listed from the step nearest the card surface to
the hottest. A ramp passes when its lightness changes in one direction, each
step differs from the next by at least 0.06 in OKLab lightness, and level 1
has at least 2:1 contrast against the card surface. The hex values printed
here are the ones recorded in docs/DESIGN.md.
"""
import math


def oklch_to_linear(L, C, h):
    a = C * math.cos(math.radians(h))
    b = C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return r, g, bb


def gamma(x):
    x = max(0.0, min(1.0, x))
    return 12.92 * x if x <= 0.0031308 else 1.055 * (x ** (1 / 2.4)) - 0.055


def oklch_to_hex(L, C, h):
    c = C
    while c > 0:
        r, g, b = oklch_to_linear(L, c, h)
        if all(-0.0005 <= v <= 1.0005 for v in (r, g, b)):
            break
        c -= 0.002
    r, g, b = oklch_to_linear(L, max(c, 0), h)
    return "#%02x%02x%02x" % tuple(round(gamma(v) * 255) for v in (r, g, b)), round(max(c, 0), 3)


def hex_to_linear(hx):
    hx = hx.lstrip("#")
    out = []
    for i in (0, 2, 4):
        v = int(hx[i:i + 2], 16) / 255
        out.append(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return out


def lum(hx):
    r, g, b = hex_to_linear(hx)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def oklab_L(hx):
    r, g, b = hex_to_linear(hx)
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    return 0.2104542553 * l ** (1 / 3) + 0.7936177850 * m ** (1 / 3) - 0.0040720468 * s ** (1 / 3)


DARK = {"plane": "#0c0d10", "surface": "#15171c", "raised": "#1c1f26", "empty": "#22262e",
        "line": "#262a32", "ink": "#f2f3f5", "ink2": "#b4bac4", "muted": "#8b93a1"}
LIGHT = {"plane": "#f4f5f7", "surface": "#ffffff", "raised": "#f0f1f4", "empty": "#e6e8ec",
         "line": "#dcdfe5", "ink": "#14161a", "ink2": "#454b57", "muted": "#626a78"}

# name: [(L, C, h) x4] from the step nearest the surface to the hottest
DARK_RAMPS = {
    "ember": [(0.47, 0.13, 38), (0.60, 0.17, 45), (0.74, 0.17, 60), (0.88, 0.15, 88)],
    "moss": [(0.46, 0.11, 150), (0.59, 0.15, 150), (0.73, 0.18, 150), (0.87, 0.19, 150)],
    "ice": [(0.46, 0.10, 248), (0.59, 0.13, 246), (0.73, 0.13, 240), (0.87, 0.09, 232)],
    "orchid": [(0.46, 0.13, 328), (0.59, 0.17, 328), (0.73, 0.17, 328), (0.87, 0.11, 328)],
    "bone": [(0.46, 0.008, 260), (0.60, 0.008, 260), (0.75, 0.008, 260), (0.91, 0.005, 260)],
    "sun": [(0.47, 0.09, 85), (0.61, 0.12, 90), (0.76, 0.15, 95), (0.90, 0.17, 100)],
    "coral": [(0.46, 0.12, 15), (0.59, 0.16, 18), (0.73, 0.15, 20), (0.87, 0.08, 22)],
    "teal": [(0.46, 0.08, 195), (0.59, 0.10, 192), (0.73, 0.12, 190), (0.87, 0.12, 188)],
}
LIGHT_RAMPS = {
    "ember": [(0.77, 0.14, 78), (0.67, 0.17, 58), (0.56, 0.19, 42), (0.44, 0.16, 32)],
    "moss": [(0.76, 0.16, 150), (0.65, 0.17, 150), (0.54, 0.15, 150), (0.42, 0.12, 150)],
    "ice": [(0.76, 0.10, 240), (0.65, 0.13, 244), (0.54, 0.14, 248), (0.42, 0.12, 250)],
    "orchid": [(0.76, 0.14, 328), (0.65, 0.18, 328), (0.54, 0.18, 328), (0.42, 0.15, 328)],
    "bone": [(0.76, 0.008, 260), (0.65, 0.008, 260), (0.53, 0.008, 260), (0.40, 0.008, 260)],
    "sun": [(0.76, 0.15, 95), (0.65, 0.13, 90), (0.54, 0.11, 85), (0.42, 0.09, 80)],
    "coral": [(0.76, 0.13, 20), (0.65, 0.17, 20), (0.54, 0.18, 18), (0.42, 0.15, 15)],
    "teal": [(0.76, 0.11, 190), (0.65, 0.11, 192), (0.54, 0.09, 194), (0.42, 0.07, 196)],
}


def report(title, ramps, theme):
    print("== %s (surface %s, empty %s)" % (title, theme["surface"], theme["empty"]))
    for name, steps in ramps.items():
        hexes = [oklch_to_hex(*s)[0] for s in steps]
        Ls = [oklab_L(h) for h in hexes]
        deltas = [abs(Ls[i + 1] - Ls[i]) for i in range(3)]
        mono = all((Ls[i + 1] - Ls[i]) * (Ls[1] - Ls[0]) > 0 for i in range(3))
        c_surface = contrast(hexes[0], theme["surface"])
        c_empty = contrast(hexes[0], theme["empty"])
        ok = mono and min(deltas) >= 0.06 and c_surface >= 2.0
        print("%-7s %s  L=%s  minDL=%.3f  L1:surface=%.2f  L1:empty=%.2f  %s" % (
            name, " ".join(hexes), " ".join("%.2f" % v for v in Ls), min(deltas), c_surface, c_empty,
            "PASS" if ok else "FAIL"))


report("dark", DARK_RAMPS, DARK)
report("light", LIGHT_RAMPS, LIGHT)
for label, theme in (("dark", DARK), ("light", LIGHT)):
    print("-- text contrast, %s" % label)
    for ink in ("ink", "ink2", "muted"):
        print("%-5s on surface %.2f  on plane %.2f  on raised %.2f" % (
            ink, contrast(theme[ink], theme["surface"]), contrast(theme[ink], theme["plane"]),
            contrast(theme[ink], theme["raised"])))
    print("empty vs surface %.2f" % contrast(theme["empty"], theme["surface"]))
