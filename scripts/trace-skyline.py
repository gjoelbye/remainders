#!/usr/bin/env python3
"""
Trace the Copenhagen skyline (with a Danish flag) from a source PNG into the
vector paths used by lib/copenhagen-skyline.ts.

Produces FOUR paths, all in the same 2054x750 viewBox so they render at the
exact same on-screen location/scale as the previous skyline:

  path        - black silhouette (buildings + pole + ground); tinted by theme.
                Windows are holes (fill-rule evenodd) so lights-off shows bg.
  windowsPath - enclosed white inside the buildings; painted amber when lit.
  flagRedPath - the Danish flag's red field; rendered in fixed Danish red.
  flagCrossPath - the flag's white cross; rendered in fixed white.

The flag's white cross connects to the white background (its arms reach the
flag edges), so a background flood-fill would erase it along with the sky. We
instead isolate the flag by morphologically CLOSING the red mask (bridging the
cross), then split that region into red field vs. white cross.
"""

import re
import subprocess
import numpy as np
from PIL import Image, ImageFilter

SRC = "assets/copenhagen-skyline.png"
POTRACE = "/opt/homebrew/bin/potrace"

# Affine target: map the source's full skyline content bbox onto the previous
# viewBox building bbox so placement is identical to the committed skyline.
DST_X0, DST_X1 = 71.0, 2047.0
DST_Y0, DST_Y1 = 15.7, 658.0


def close(mask_u8, k):
    im = Image.fromarray(mask_u8)
    im = im.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
    return np.array(im) > 127


def trace(mask_bool, turd):
    """Run potrace on a boolean mask (True = filled) -> list of path 'd' strings."""
    bmp = np.where(mask_bool, 0, 255).astype(np.uint8)   # potrace traces black
    Image.fromarray(bmp).save("/tmp/_trace.pgm")
    subprocess.run([POTRACE, "-b", "svg", "-o", "/tmp/_trace.svg",
                    "/tmp/_trace.pgm", "-t", str(turd)], check=True)
    svg = open("/tmp/_trace.svg").read()
    return re.findall(r'<path[^>]*\bd="([^"]+)"', svg)


def main():
    a = np.array(Image.open(SRC).convert("RGB")).astype(int)
    h, w, _ = a.shape
    R, G, B = a[..., 0], a[..., 1], a[..., 2]

    black = (R < 110) & (G < 110) & (B < 110)
    white = (R > 175) & (G > 175) & (B > 175)
    red = (R >= 120) & (R - G > 55) & (R - B > 40) & (G < 150)

    # --- flag: one shared boundary (the red field outline) ---
    # Tracing red and white as two separate regions gives the cross its own
    # boundary that doesn't follow the red, so it looks disconnected. Instead we
    # lay the whole flag down as a solid WHITE backing (closing of red bridges
    # the cross), then paint the precisely-traced red field on top. The only
    # red/white edge is then the single red outline (a clean potrace spline);
    # white shows through exactly in the cross. Dilate red by 1px so it meets
    # the white at the true colour edge rather than the eroded threshold.
    flag_region = close((red * 255).astype(np.uint8), 13)
    flag_white = flag_region & ~black                              # solid backing
    red_dil = np.array(Image.fromarray((red * 255).astype(np.uint8))
                       .filter(ImageFilter.MaxFilter(3))) > 127
    flag_red = red_dil & ~black                                     # red field on top

    # --- windows: enclosed white inside the black buildings (flood fill sky) ---
    from collections import deque
    vis = np.zeros((h, w), bool)
    q = deque()
    for sy, sx in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]:
        if white[sy, sx] and not vis[sy, sx]:
            vis[sy, sx] = True
            q.append((sy, sx))
    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not vis[ny, nx]:
                vis[ny, nx] = True
                q.append((ny, nx))
    windows = white & ~vis & ~flag_region   # exclude any flag white

    # --- reference bbox for the affine: full skyline content above ground band ---
    content = black | red
    rf = content.mean(axis=1)
    ground_top = h
    for y in range(h - 1, -1, -1):
        if rf[y] > 0.95:
            ground_top = y
        else:
            break
    creg = content[:ground_top, :]
    cx = np.where(creg.any(axis=0))[0]
    cy = np.where(creg.any(axis=1))[0]
    SX0, SX1 = cx.min(), cx.max()
    SY0, SBASE = cy.min(), ground_top
    print(f"src {w}x{h}  content x=[{SX0},{SX1}] y=[{SY0},{SBASE}]  ground band h={h-ground_top}")
    print(f"flag: red_field={int(flag_red.sum())} white_backing={int(flag_white.sum())} windows={int(windows.sum())}")

    # potrace transform (raw -> image px): (0.1x, H - 0.1y); then affine to viewBox.
    sx = (DST_X1 - DST_X0) / (SX1 - SX0)
    sy = (DST_Y1 - DST_Y0) / (SBASE - SY0)

    def T(x, y):
        px, py = 0.1 * x, h - 0.1 * y
        return (round(DST_X0 + (px - SX0) * sx, 2),
                round(DST_Y0 + (py - SY0) * sy, 2))

    def xform(d):
        # potrace emits absolute M and relative m/l/c, closed with z.
        tok = re.findall(r'[A-Za-z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?', d)
        out = []; i = 0; cx = cy = 0.0
        while i < len(tok):
            c = tok[i]; i += 1
            if c in 'Mm':
                dx, dy = float(tok[i]), float(tok[i+1]); i += 2
                cx, cy = (dx, dy) if c == 'M' else (cx + dx, cy + dy)
                X, Y = T(cx, cy); out.append(f'M{X} {Y}')
                while i < len(tok) and not tok[i].isalpha():     # implicit lineto
                    dx, dy = float(tok[i]), float(tok[i+1]); i += 2
                    cx, cy = (dx, dy) if c == 'M' else (cx + dx, cy + dy)
                    X, Y = T(cx, cy); out.append(f'L{X} {Y}')
            elif c in 'Ll':
                while i < len(tok) and not tok[i].isalpha():
                    dx, dy = float(tok[i]), float(tok[i+1]); i += 2
                    cx, cy = (dx, dy) if c == 'L' else (cx + dx, cy + dy)
                    X, Y = T(cx, cy); out.append(f'L{X} {Y}')
            elif c in 'Cc':
                while i < len(tok) and not tok[i].isalpha():
                    if c == 'C':
                        x1, y1 = float(tok[i]), float(tok[i+1])
                        x2, y2 = float(tok[i+2]), float(tok[i+3])
                        x, y = float(tok[i+4]), float(tok[i+5])
                    else:
                        x1, y1 = cx + float(tok[i]), cy + float(tok[i+1])
                        x2, y2 = cx + float(tok[i+2]), cy + float(tok[i+3])
                        x, y = cx + float(tok[i+4]), cy + float(tok[i+5])
                    i += 6
                    A = T(x1, y1); Bp = T(x2, y2); E = T(x, y); cx, cy = x, y
                    out.append(f'C{A[0]} {A[1]} {Bp[0]} {Bp[1]} {E[0]} {E[1]}')
            elif c in 'Zz':
                out.append('Z')
        return ''.join(out)

    def build(mask, turd):
        return ' '.join(xform(d) for d in trace(mask, turd))

    sil_path = build(black, 2)
    win_path = build(windows, 1)
    flag_white_path = build(flag_white, 1)
    flag_red_path = build(flag_red, 1)

    def bbox(d):
        n = [float(x) for x in re.findall(r'-?\d+\.?\d+|-?\d+', d)]
        xs = n[0::2]; ys = n[1::2]
        return [round(min(xs), 1), round(max(xs), 1), round(min(ys), 1), round(max(ys), 1)]

    print("path bbox        ", bbox(sil_path))
    print("windowsPath bbox ", bbox(win_path))
    print("flagWhitePath bbox", bbox(flag_white_path))
    print("flagRedPath bbox ", bbox(flag_red_path))

    ts = '''/**
 * Copenhagen skyline silhouette (vector paths), traced from
 * assets/copenhagen-skyline.png with potrace. Rendered behind the iOS clock and
 * as a MacBook wallpaper; the silhouette is filled with a theme color so it
 * matches every palette, while the Danish flag keeps its real red + white.
 *
 * All paths share one 2054x750 viewBox (mapped onto the previous skyline's
 * building box, so placement/scale are unchanged):
 *   path          - buildings + pole + ground; window holes via fill-rule evenodd.
 *   windowsPath   - enclosed windows; painted amber when the lights are on.
 *   flagWhitePath - the whole flag as a solid WHITE backing (drawn first).
 *   flagRedPath   - the flag's red field, drawn ON TOP so the white cross
 *                   shows through with a single, naturally-connected edge.
 */

/** Dannebrog red + white — these are NOT theme-tinted. */
export const FLAG_RED = '#C8102E';
export const FLAG_WHITE = '#FFFFFF';

export const COPENHAGEN_SKYLINE = {
  width: 2054,
  height: 750,
  /** fill-rule must be evenodd so the window cut-outs render as holes */
  path: "%s",
  /** window-only path — painted over the silhouette with a warm amber glow */
  windowsPath: "%s",
  /** solid white flag backing — drawn first, FLAG_WHITE */
  flagWhitePath: "%s",
  /** red field drawn over the white backing — FLAG_RED; cross shows through */
  flagRedPath: "%s",
} as const;
''' % (sil_path, win_path, flag_white_path, flag_red_path)

    open("lib/copenhagen-skyline.ts", "w").write(ts)
    print("wrote lib/copenhagen-skyline.ts", len(ts), "chars")


if __name__ == "__main__":
    main()
