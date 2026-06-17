#!/usr/bin/env python3
"""
Pre-bake the skyline GEOMETRY as grayscale alpha masks, per device, so the
Next.js server can tint + composite them at runtime (true bloom + Display P3)
without any Python or heavy work per request.

For each device we emit 8-bit grayscale PNGs under assets/masks/<device>/:
  silhouette.png  - buildings + pole + ground, WITH window holes (so lights-off
                    shows window cut-outs, matching the original skyline)
  windows.png     - lit-window coverage
  glow.png        - the BAKED bloom (small+large Gaussian blur of the windows,
                    weighted) — the additive glow intensity map
  flag-red.png    - Danish flag red-field coverage
  flag-white.png  - flag white-backing coverage
plus meta.json (canvas size + placement + the baked-in glow weighting).

Colors are NOT baked in — the runtime tints these masks with P3 colors from the
URL config. Geometry/scale/anti-aliasing/blur (the expensive parts) are baked
once here. Re-run after changing lib/copenhagen-skyline.ts.
"""

import json
import os
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 3                          # supersample factor for crisp anti-aliasing
SKYLINE_BASE_CROP = 0.10        # trims the heavy ground band (matches the web)

# Glow (bloom) weights — must match the runtime; baked into glow.png. Radii are
# scaled per device by the skyline's on-screen width (see bake()).
GLOW_SMALL_K = 0.0026
GLOW_LARGE_K = 0.0125
GLOW_SMALL_STRENGTH = 0.55
GLOW_LARGE_STRENGTH = 0.42

# Building bounding box in the skyline's 2054x750 viewBox (from the trace).
B_X0, B_X1 = 71.0, 2047.0
B_Y_BASE = 658.0
VB_W, VB_H = 2054.0, 750.0

# Per-device canvas + skyline placement.
#  'bottom'  — full-bleed across the bottom (MacBook), side margins, base at edge.
#  'top'     — behind the iOS clock (iPhone), matching lib/wallpaper-render
#              skylineElement: width = w - 2*sidePadding, ground line at baseline.
DEVICES = {
    'macbook-14': {'w': 3024, 'h': 1964, 'place': 'bottom', 'side_margin': 0.05},
    'iphone-14-pro': {'w': 1179, 'h': 2556, 'place': 'top', 'side_padding': 0.08, 'baseline': 0.24},
}


def load_paths():
    src = open("lib/copenhagen-skyline.ts").read()
    g = lambda key: re.search(key + r':\s*"([^"]+)"', src).group(1)
    return g("path"), g("windowsPath"), g("flagRedPath"), g("flagWhitePath")


def make_geometry(dev):
    """Return (vb_to_hires, hw, hh, skyline_width_px, clip_row)."""
    w, h = dev['w'], dev['h']
    hw, hh = w * SS, h * SS
    if dev['place'] == 'bottom':
        margin = dev['side_margin']
        avail = w * (1 - 2 * margin)
        s = SS * avail / (B_X1 - B_X0)

        def vb(x, y):
            return SS * w * margin + (x - B_X0) * s, hh - (B_Y_BASE - y) * s
        return vb, hw, hh, avail, None
    if dev['place'] == 'top':
        sp = dev['side_padding'] * w
        wpx = w - 2 * sp
        visibleH = VB_H * (1 - SKYLINE_BASE_CROP)         # 675
        aspect = VB_W / visibleH
        hpx = wpx / aspect
        top = h * dev['baseline'] - hpx

        def vb(x, y):
            return SS * (sp + (x / VB_W) * wpx), SS * (top + (y / visibleH) * hpx)
        return vb, hw, hh, wpx, round(h * dev['baseline'])    # clip the ground band
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
    img = Image.new("L", (hw, hh), 0)
    drw = ImageDraw.Draw(img)
    for p in polys:
        if len(p) >= 2:
            drw.polygon(p, fill=255)
    arr = np.asarray(img, dtype=np.float32).reshape(h, SS, w, SS)
    return arr.mean(axis=(1, 3)) / 255.0     # 0..1 coverage


def bake(name, dev):
    print(f"baking {name} ({dev['w']}x{dev['h']}, {dev['place']}) ...")
    vb, hw, hh, sky_w, clip_row = make_geometry(dev)
    w, h = dev['w'], dev['h']
    sil_d, win_d, flag_red_d, flag_white_d = load_paths()

    sil = rasterize_union(flatten(sil_d, vb), hw, hh, w, h)
    win = rasterize_union(flatten(win_d, vb), hw, hh, w, h)
    flag_red = rasterize_union(flatten(flag_red_d, vb), hw, hh, w, h)
    flag_white = rasterize_union(flatten(flag_white_d, vb), hw, hh, w, h)

    # Center the VISIBLE silhouette (buildings + ground; flag excluded) so the
    # base has equal left/right margins. The flag rides along (it's a small
    # accent that may extend a bit past the rightmost wall). MacBook only.
    if dev['place'] == 'bottom':
        cols = np.where(sil.max(axis=0) > 0.05)[0]
        shift = int(round(w / 2 - (cols.min() + cols.max()) / 2))
        if shift:
            def shx(a):
                o = np.zeros_like(a)
                if shift > 0:
                    o[:, shift:] = a[:, :-shift]
                else:
                    o[:, :shift] = a[:, -shift:]
                return o
            sil, win, flag_red, flag_white = shx(sil), shx(win), shx(flag_red), shx(flag_white)
            print(f"  centered silhouette: shift {shift}px")

    # Window holes: the silhouette shows building faces but NOT the windows, so
    # lights-off reveals the background through the windows (as the web does).
    sil = np.clip(sil - win, 0, 1)

    # Bloom: weighted small+large Gaussian blur of the windows. Radii scale with
    # the skyline's on-screen size so the glow looks the same on every device.
    r_small = max(2, round(sky_w * GLOW_SMALL_K))
    r_large = max(6, round(sky_w * GLOW_LARGE_K))
    cov_img = Image.fromarray((win * 255).astype(np.uint8))
    g_small = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(r_small)), np.float32) / 255.0
    g_large = np.asarray(cov_img.filter(ImageFilter.GaussianBlur(r_large)), np.float32) / 255.0
    glow = np.clip(g_small * GLOW_SMALL_STRENGTH + g_large * GLOW_LARGE_STRENGTH, 0, 1)

    if clip_row is not None:
        # Clip the silhouette's ground band at the skyline box bottom (the web
        # clips via the SVG viewBox). Glow/windows/flag sit above this line.
        sil[clip_row:, :] = 0

    out_dir = f"assets/masks/{name}"
    os.makedirs(out_dir, exist_ok=True)

    def save(arr, fn):
        Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f"{out_dir}/{fn}")

    save(sil, "silhouette.png")
    save(win, "windows.png")
    save(glow, "glow.png")
    save(flag_red, "flag-red.png")
    save(flag_white, "flag-white.png")
    json.dump(
        {"w": w, "h": h, "place": dev['place'],
         "glow": {"smallRadius": r_small, "largeRadius": r_large,
                  "smallStrength": GLOW_SMALL_STRENGTH, "largeStrength": GLOW_LARGE_STRENGTH}},
        open(f"{out_dir}/meta.json", "w"), indent=2)
    print(f"  wrote {out_dir}/  (glow radii {r_small}/{r_large}, clip {clip_row})")


def main():
    for name, dev in DEVICES.items():
        bake(name, dev)


if __name__ == "__main__":
    main()
