#!/usr/bin/env python3
"""
Pre-bake the skyline GEOMETRY as grayscale alpha masks, per device, so the
Next.js server can tint + composite them at runtime (true bloom + Display P3)
without any Python or heavy work per request.

For each device we emit 8-bit grayscale PNGs under assets/masks/<device>/:
  silhouette.png  - buildings + pole + ground coverage (0..255)
  windows.png     - lit-window coverage
  glow.png        - the BAKED bloom: (small+large Gaussian blur of windows,
                    weighted), i.e. the additive glow intensity map
  flag-red.png    - Danish flag red-field coverage
  flag-white.png  - flag white-backing coverage
plus meta.json (canvas size + the glow weighting, for reference).

The colors are NOT baked in — the runtime tints these masks with P3 colors from
the URL config. Geometry/scale/anti-aliasing/blur (the expensive parts) are
baked once here. Re-run after changing lib/copenhagen-skyline.ts.
"""

import json
import os
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 3                          # supersample factor for crisp anti-aliasing

# Glow (bloom) weights — must match the runtime; baked into glow.png.
GLOW_SMALL_RADIUS = 7
GLOW_LARGE_RADIUS = 34
GLOW_SMALL_STRENGTH = 0.55
GLOW_LARGE_STRENGTH = 0.42

# Building bounding box in the skyline's 2054x750 viewBox (from the trace).
B_X0, B_X1 = 71.0, 2047.0
B_Y_TOP, B_Y_BASE = 15.7, 658.0

# Per-device canvas + skyline placement.
DEVICES = {
    # MacBook Pro 14": skyline full-bleed across the bottom, 5% side margins.
    'macbook-14': {
        'w': 3024, 'h': 1964, 'side_margin': 0.05, 'place': 'bottom',
    },
}


def load_paths():
    src = open("lib/copenhagen-skyline.ts").read()
    g = lambda key: re.search(key + r':\s*"([^"]+)"', src).group(1)
    return g("path"), g("windowsPath"), g("flagRedPath"), g("flagWhitePath")


def make_vb_to_hires(dev):
    w, h = dev['w'], dev['h']
    hw, hh = w * SS, h * SS
    margin = dev.get('side_margin', 0.05)
    if dev['place'] == 'bottom':
        avail = w * (1 - 2 * margin)
        s = SS * avail / (B_X1 - B_X0)

        def vb(x, y):
            hx = SS * w * margin + (x - B_X0) * s
            hy = hh - (B_Y_BASE - y) * s        # base anchored to bottom edge
            return hx, hy
        return vb, hw, hh
    raise ValueError(dev['place'])


def flatten(d, vb):
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
            cur.append(vb(px, py))
        elif c == 'L':
            while i < len(tok) and not tok[i].isalpha():
                px, py = float(tok[i]), float(tok[i + 1]); i += 2
                cur.append(vb(px, py))
        elif c == 'C':
            while i < len(tok) and not tok[i].isalpha():
                x1, y1 = float(tok[i]), float(tok[i + 1])
                x2, y2 = float(tok[i + 2]), float(tok[i + 3])
                x, y = float(tok[i + 4]), float(tok[i + 5]); i += 6
                for t in np.linspace(0, 1, 14)[1:]:
                    mt = 1 - t
                    bx = mt**3*px + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t**3*x
                    by = mt**3*py + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t**3*y
                    cur.append(vb(bx, by))
                px, py = x, y
        elif c == 'Z':
            if cur:
                polys.append(cur); cur = []
    if cur:
        polys.append(cur)
    return polys


def rasterize_union(polys, hw, hh, w, h):
    """Fill all subpaths into a coverage mask, box-downsampled to native res."""
    img = Image.new("L", (hw, hh), 0)
    drw = ImageDraw.Draw(img)
    for p in polys:
        if len(p) >= 2:
            drw.polygon(p, fill=255)
    arr = np.asarray(img, dtype=np.float32).reshape(h, SS, w, SS)
    return arr.mean(axis=(1, 3)) / 255.0     # 0..1 coverage


def bake(name, dev):
    print(f"baking {name} ({dev['w']}x{dev['h']}) ...")
    vb, hw, hh = make_vb_to_hires(dev)
    w, h = dev['w'], dev['h']
    sil_d, win_d, flag_red_d, flag_white_d = load_paths()

    sil = rasterize_union(flatten(sil_d, vb), hw, hh, w, h)
    win = rasterize_union(flatten(win_d, vb), hw, hh, w, h)
    flag_red = rasterize_union(flatten(flag_red_d, vb), hw, hh, w, h)
    flag_white = rasterize_union(flatten(flag_white_d, vb), hw, hh, w, h)

    # Bloom intensity = weighted small+large Gaussian blur of the windows.
    cov_img = Image.fromarray((win * 255).astype(np.uint8))
    g_small = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(GLOW_SMALL_RADIUS)), np.float32) / 255.0
    g_large = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(GLOW_LARGE_RADIUS)), np.float32) / 255.0
    glow = np.clip(g_small * GLOW_SMALL_STRENGTH + g_large * GLOW_LARGE_STRENGTH, 0, 1)

    out_dir = f"assets/masks/{name}"
    os.makedirs(out_dir, exist_ok=True)

    def save(arr, fn):
        Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "L").save(f"{out_dir}/{fn}")

    save(sil, "silhouette.png")
    save(win, "windows.png")
    save(glow, "glow.png")
    save(flag_red, "flag-red.png")
    save(flag_white, "flag-white.png")
    json.dump(
        {"w": w, "h": h, "place": dev['place'],
         "glow": {"smallRadius": GLOW_SMALL_RADIUS, "largeRadius": GLOW_LARGE_RADIUS,
                  "smallStrength": GLOW_SMALL_STRENGTH, "largeStrength": GLOW_LARGE_STRENGTH}},
        open(f"{out_dir}/meta.json", "w"), indent=2)
    print(f"  wrote {out_dir}/ (silhouette, windows, glow, flag-red, flag-white, meta.json)")


def main():
    for name, dev in DEVICES.items():
        bake(name, dev)


if __name__ == "__main__":
    main()
