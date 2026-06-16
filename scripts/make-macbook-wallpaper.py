#!/usr/bin/env python3
"""
Generate a MacBook Pro 14" desktop wallpaper: a flat Nord background with the
Copenhagen skyline full-bleed across the bottom and vibrantly lit windows.

Authored in Display P3 (wide gamut) so the lit windows render more saturated
than sRGB allows on the M4's P3 display. The skyline vector path is read from
lib/copenhagen-skyline.ts (the same artwork as the iOS wallpaper).

Output: 3024 x 1964 PNG with an embedded Display P3 ICC profile.
"""

import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------- config -----
OUT_W, OUT_H = 3024, 1964          # MacBook Pro 14" native resolution
SS = 3                              # supersample factor for crisp anti-aliasing
HW, HH = OUT_W * SS, OUT_H * SS

# Fraction of the width kept clear on each side so the skyline doesn't bleed off
# the edges (the leftmost building's base was getting clipped at zero margin).
SIDE_MARGIN = 0.05

NORD_BG = (0x2E, 0x34, 0x40)        # Nord polar night (sky / background)
SILHOUETTE = (0x22, 0x27, 0x31)     # buildings: a touch darker than the sky

# Lit-window colors authored directly in Display P3 (vibrant, beyond sRGB).
# Given as P3 *code* values 0-255; decoded with the sRGB transfer (P3 uses it).
WINDOW_P3 = (255, 196, 92)          # bright warm amber core
GLOW_P3 = (255, 138, 36)            # warmer orange bloom around the windows

# Danish flag — authored in P3 so the red pops on the wide-gamut display.
FLAG_RED_P3 = (210, 16, 40)         # vibrant Dannebrog red (P3-native)
FLAG_WHITE_P3 = (255, 255, 255)     # white cross

GLOW_SMALL_RADIUS = 7               # tight halo (px, native res)
GLOW_LARGE_RADIUS = 34              # soft wide bloom
GLOW_SMALL_STRENGTH = 0.55
GLOW_LARGE_STRENGTH = 0.42

P3_PROFILE = "/System/Library/ColorSync/Profiles/Display P3.icc"

# Building bounding box in the skyline's 2054x750 viewBox (measured from the
# trace). We map this box to fill the full canvas width and sit on the bottom.
B_X0, B_X1 = 71.0, 2047.0
B_Y_TOP, B_Y_BASE = 15.7, 658.0

# --------------------------------------------------------- color science -----
# sRGB / Display P3 share the sRGB transfer function but have different primaries.
M_SRGB = np.array([[0.4124564, 0.3575761, 0.1804375],
                   [0.2126729, 0.7151522, 0.0721750],
                   [0.0193339, 0.1191920, 0.9503041]])
XYZ_TO_P3 = np.array([[ 2.4934969, -0.9313836, -0.4027108],
                      [-0.8294890,  1.7626641,  0.0236247],
                      [ 0.0358458, -0.0761724,  0.9568845]])


def srgb_decode(c):
    c = np.asarray(c, float) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb_encode(lin):
    lin = np.clip(lin, 0.0, 1.0)
    return np.where(lin <= 0.0031308, lin * 12.92,
                    1.055 * lin ** (1 / 2.4) - 0.055)


def srgb_to_linp3(rgb):
    """sRGB code value -> linear Display P3 (preserves appearance)."""
    lin = srgb_decode(rgb)
    return XYZ_TO_P3 @ (M_SRGB @ lin)


def p3code_to_linp3(rgb):
    """Display-P3 code value -> linear Display P3 (vibrant, P3-native color)."""
    return srgb_decode(rgb)


# ------------------------------------------------------- path -> polygons ----
def load_paths():
    src = open("lib/copenhagen-skyline.ts").read()
    g = lambda key: re.search(key + r':\s*"([^"]+)"', src).group(1)
    return g("path"), g("windowsPath"), g("flagRedPath"), g("flagWhitePath")


def vb_to_hires(x, y):
    avail = OUT_W * (1 - 2 * SIDE_MARGIN)      # width minus left/right margins
    s = SS * avail / (B_X1 - B_X0)
    hx = SS * OUT_W * SIDE_MARGIN + (x - B_X0) * s
    hy = HH - (B_Y_BASE - y) * s               # base anchored to bottom edge
    return hx, hy


def flatten(d):
    """Parse an SVG path (M/L/C/Z) into a list of closed polygons (hi-res px)."""
    tok = re.findall(r'[MLCZ]|-?\d+\.?\d*(?:[eE][-+]?\d+)?', d)
    polys, cur = [], []
    i = 0
    px = py = 0.0
    while i < len(tok):
        c = tok[i]; i += 1
        if c == 'M':
            if cur:
                polys.append(cur); cur = []
            px, py = float(tok[i]), float(tok[i + 1]); i += 2
            cur.append(vb_to_hires(px, py))
        elif c == 'L':
            while i < len(tok) and not tok[i].isalpha():
                px, py = float(tok[i]), float(tok[i + 1]); i += 2
                cur.append(vb_to_hires(px, py))
        elif c == 'C':
            while i < len(tok) and not tok[i].isalpha():
                x1, y1 = float(tok[i]), float(tok[i + 1])
                x2, y2 = float(tok[i + 2]), float(tok[i + 3])
                x, y = float(tok[i + 4]), float(tok[i + 5]); i += 6
                for t in np.linspace(0, 1, 14)[1:]:
                    mt = 1 - t
                    bx = mt**3*px + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t**3*x
                    by = mt**3*py + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t**3*y
                    cur.append(vb_to_hires(bx, by))
                px, py = x, y
        elif c == 'Z':
            if cur:
                polys.append(cur); cur = []
    if cur:
        polys.append(cur)
    return polys


def rasterize_union(polys):
    """Fill all subpaths (union) into a coverage mask downsampled to native res."""
    img = Image.new("L", (HW, HH), 0)
    drw = ImageDraw.Draw(img)
    for p in polys:
        if len(p) >= 2:
            drw.polygon(p, fill=255)
    arr = np.asarray(img, dtype=np.float32).reshape(OUT_H, SS, OUT_W, SS)
    return arr.mean(axis=(1, 3)) / 255.0     # 0..1 coverage, box-filtered AA


# ------------------------------------------------------------- compose -------
def main():
    sil_d, win_d, flag_red_d, flag_white_d = load_paths()
    print("rasterizing silhouette + windows + flag ...")
    sil_cov = rasterize_union(flatten(sil_d))
    win_cov = rasterize_union(flatten(win_d))
    flag_red_cov = rasterize_union(flatten(flag_red_d))
    flag_white_cov = rasterize_union(flatten(flag_white_d))

    bg = srgb_to_linp3(NORD_BG)
    sil = srgb_to_linp3(SILHOUETTE)
    win = p3code_to_linp3(WINDOW_P3)
    glow = p3code_to_linp3(GLOW_P3)
    flag_red = p3code_to_linp3(FLAG_RED_P3)
    flag_white = p3code_to_linp3(FLAG_WHITE_P3)

    h, w = OUT_H, OUT_W
    img = np.empty((h, w, 3), np.float32)
    img[:] = bg

    a = sil_cov[..., None]
    img = img * (1 - a) + sil * a            # buildings over sky

    # Bloom: blur the window coverage at two radii, add warm light additively.
    cov_img = Image.fromarray((win_cov * 255).astype(np.uint8))
    g_small = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(GLOW_SMALL_RADIUS)),
                         np.float32) / 255.0
    g_large = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(GLOW_LARGE_RADIUS)),
                         np.float32) / 255.0
    img += glow * (g_small[..., None] * GLOW_SMALL_STRENGTH +
                   g_large[..., None] * GLOW_LARGE_STRENGTH)

    aw = win_cov[..., None]                   # crisp lit windows on top
    img = img * (1 - aw) + win * aw

    # Danish flag on top: white backing first, then the red field over it, so
    # the cross shows through with one naturally-connected edge. No glow.
    awh = flag_white_cov[..., None]
    img = img * (1 - awh) + flag_white * awh
    ar = flag_red_cov[..., None]
    img = img * (1 - ar) + flag_red * ar

    out = (srgb_encode(img) * 255 + 0.5).astype(np.uint8)
    im = Image.fromarray(out, "RGB")
    profile = open(P3_PROFILE, "rb").read()

    path = "output/macbook-skyline-nord-p3.png"
    import os
    os.makedirs("output", exist_ok=True)
    im.save(path, icc_profile=profile)
    print(f"wrote {path}  ({im.size[0]}x{im.size[1]}, Display P3)")


if __name__ == "__main__":
    main()
