/**
 * Runtime wallpaper compositor (Node, server-side).
 *
 * Combines pre-baked skyline geometry masks (assets/masks/<device>/) with a
 * transparent grid overlay into a Display-P3 PNG with true bloom — all in
 * LINEAR light so the result matches scripts/make-macbook-wallpaper.py exactly.
 *
 * sharp is used only to decode the masks/overlay and encode the final PNG; the
 * pixel math is done here in typed arrays, and the Display P3 ICC profile is
 * injected as an iCCP chunk so sharp never colour-converts our P3-encoded
 * values.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import sharp from 'sharp';
import { srgbToLinP3, p3CodeToLinP3, srgbDecode, srgbEncode, hexToRgb, type LinRGB } from './p3';

const ASSETS = path.join(process.cwd(), 'assets');
const ICC_PATH = path.join(ASSETS, 'display-p3.icc');

// Vibrant P3-native accents — must match scripts/make-macbook-wallpaper.py.
const WINDOW_P3 = { r: 255, g: 196, b: 92 };
const GLOW_P3 = { r: 255, g: 138, b: 36 };
const FLAG_RED_P3 = { r: 210, g: 16, b: 40 };
const FLAG_WHITE_P3 = { r: 255, g: 255, b: 255 };

type Masks = {
  w: number;
  h: number;
  silhouette: Buffer;
  windows: Buffer;
  glow: Buffer;
  flagRed: Buffer;
  flagWhite: Buffer;
};

/** Devices that have pre-baked skyline masks under assets/masks/<key>/. */
export const MASK_DEVICES: Record<string, { w: number; h: number }> = {
  'macbook-14': { w: 3024, h: 1964 },
  'iphone-14-pro': { w: 1179, h: 2556 },
};

/** Return the mask-set key for a (width,height), or null if none is baked. */
export function maskKeyFor(width: number, height: number): string | null {
  for (const [key, d] of Object.entries(MASK_DEVICES)) {
    if (d.w === width && d.h === height) return key;
  }
  return null;
}

const maskCache = new Map<string, Promise<Masks>>();

async function loadGray(file: string): Promise<{ data: Buffer; w: number; h: number }> {
  const { data, info } = await sharp(file)
    .toColourspace('b-w') // force a single grey channel
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function getMasks(device: string): Promise<Masks> {
  let p = maskCache.get(device);
  if (!p) {
    p = (async () => {
      const dir = path.join(ASSETS, 'masks', device);
      const [sil, win, glow, fr, fw] = await Promise.all([
        loadGray(path.join(dir, 'silhouette.png')),
        loadGray(path.join(dir, 'windows.png')),
        loadGray(path.join(dir, 'glow.png')),
        loadGray(path.join(dir, 'flag-red.png')),
        loadGray(path.join(dir, 'flag-white.png')),
      ]);
      return {
        w: sil.w, h: sil.h,
        silhouette: sil.data, windows: win.data, glow: glow.data,
        flagRed: fr.data, flagWhite: fw.data,
      };
    })();
    maskCache.set(device, p);
  }
  return p;
}

// --- Display P3 ICC injection (manual iCCP chunk; no colour conversion) -------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

let iccData: Buffer | null = null;
function injectP3(png: Buffer): Buffer {
  if (!iccData) {
    iccData = fs.readFileSync(ICC_PATH);
  }
  // iCCP = profile name + 0x00 (null term) + 0x00 (compression=deflate) + zlib(profile)
  const data = Buffer.concat([Buffer.from('Display P3', 'latin1'), Buffer.from([0, 0]), zlib.deflateSync(iccData)]);
  const chunk = pngChunk('iCCP', data);
  const insertAt = 8 + 25; // after the 8-byte signature + the 25-byte IHDR chunk
  return Buffer.concat([png.subarray(0, insertAt), chunk, png.subarray(insertAt)]);
}

// --- compose -----------------------------------------------------------------
export type ComposeOptions = {
  device: string; // mask-set key, e.g. 'macbook-14'
  background: string; // sRGB hex
  silhouette: string; // sRGB hex (skyline tint)
  skyline: boolean;
  lights: boolean;
  flag: boolean;
  gridPng?: Buffer | null; // transparent RGBA PNG overlay at the device resolution
  offsetY?: number; // vertical px shift of the skyline group (baseline nudge)
  currentDotPng?: Buffer | null; // transparent RGBA PNG with ONLY the current-week dot
  currentColor?: string; // sRGB hex of the current dot — rendered vibrant P3 + glow
};

export async function composeWallpaper(opts: ComposeOptions): Promise<Buffer> {
  const m = await getMasks(opts.device);
  const W = m.w;
  const H = m.h;

  const bg = srgbToLinP3(opts.background);
  const sil = srgbToLinP3(opts.silhouette);
  const glow = p3CodeToLinP3(GLOW_P3);
  const win = p3CodeToLinP3(WINDOW_P3);
  const white = p3CodeToLinP3(FLAG_WHITE_P3);
  const red = p3CodeToLinP3(FLAG_RED_P3);

  let grid: Buffer | null = null;
  if (opts.gridPng) {
    const { data } = await sharp(opts.gridPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    grid = data; // RGBA
  }

  // Glowing current-week dot: extract its alpha, blur it at two radii for the
  // bloom, and tint everything vibrant P3-native red so it stands out.
  let dotA: Buffer | null = null;
  let glowS: Buffer | null = null;
  let glowL: Buffer | null = null;
  let redLin: LinRGB = [0, 0, 0];
  if (opts.currentDotPng && opts.currentColor) {
    const { data } = await sharp(opts.currentDotPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = Buffer.allocUnsafe(W * H);
    let minx = W, miny = H, maxx = -1, maxy = -1;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v = data[(y * W + x) * 4 + 3];
        a[y * W + x] = v;
        if (v > 30) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
      }
    }
    if (maxx >= 0) {
      const dotR = Math.max(8, Math.max(maxx - minx, maxy - miny) / 2);
      const raw = { width: W, height: H, channels: 1 as const };
      glowS = await sharp(a, { raw }).blur(Math.max(0.8, dotR * 1.0)).raw().toBuffer();
      glowL = await sharp(a, { raw }).blur(Math.max(3, dotR * 2.8)).raw().toBuffer();
      dotA = a;
      redLin = p3CodeToLinP3(hexToRgb(opts.currentColor));
    }
  }

  // sRGB-decode LUT (grid pixels) + linear->code LUT (final encode).
  const DEC = new Float32Array(256);
  for (let i = 0; i < 256; i++) DEC[i] = srgbDecode(i);
  const ENCN = 4096;
  const ENC = new Uint8Array(ENCN + 1);
  // srgbEncode already returns a 0..255 code value.
  for (let i = 0; i <= ENCN; i++) ENC[i] = srgbEncode(i / ENCN);
  const enc = (v: number) => ENC[v <= 0 ? 0 : v >= 1 ? ENCN : (v * ENCN) | 0];

  const drawSky = opts.skyline;
  const lights = opts.lights && drawSky;
  const flag = opts.flag && drawSky;
  const off = Math.round(opts.offsetY || 0);

  const out = Buffer.allocUnsafe(W * H * 3);
  const sc = m.silhouette, wc = m.windows, gc = m.glow, frc = m.flagRed, fwc = m.flagWhite;

  for (let y = 0; y < H; y++) {
    const sy = y - off; // skyline source row (after baseline offset)
    const skyRow = drawSky && sy >= 0 && sy < H;
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let r = bg[0], g = bg[1], b = bg[2];

      // Dots first...
      if (grid) {
        const gi4 = i * 4;
        const ga = grid[gi4 + 3] / 255;
        if (ga > 0) {
          const gr = DEC[grid[gi4]], gg = DEC[grid[gi4 + 1]], gb = DEC[grid[gi4 + 2]];
          r = r * (1 - ga) + gr * ga; g = g * (1 - ga) + gg * ga; b = b * (1 - ga) + gb * ga;
        }
      }

      if (dotA) {
        const gi = (glowS![i] / 255) * 1.15 + (glowL![i] / 255) * 0.8; // red bloom (additive)
        if (gi > 0) { r += redLin[0] * gi; g += redLin[1] * gi; b += redLin[2] * gi; }
        const da = dotA[i] / 255; // crisp vibrant dot
        if (da > 0) { r = r * (1 - da) + redLin[0] * da; g = g * (1 - da) + redLin[1] * da; b = b * (1 - da) + redLin[2] * da; }
      }

      // ...then the city ON TOP of the dots (occludes the grid where they overlap).
      if (skyRow) {
        const mi = sy * W + x;
        const s = sc[mi] / 255;
        if (s > 0) { r = r * (1 - s) + sil[0] * s; g = g * (1 - s) + sil[1] * s; b = b * (1 - s) + sil[2] * s; }
        if (lights) {
          const gi = gc[mi] / 255;
          if (gi > 0) { r += glow[0] * gi; g += glow[1] * gi; b += glow[2] * gi; }
          const w2 = wc[mi] / 255;
          if (w2 > 0) { r = r * (1 - w2) + win[0] * w2; g = g * (1 - w2) + win[1] * w2; b = b * (1 - w2) + win[2] * w2; }
        }
        if (flag) {
          const fw = fwc[mi] / 255;
          if (fw > 0) { r = r * (1 - fw) + white[0] * fw; g = g * (1 - fw) + white[1] * fw; b = b * (1 - fw) + white[2] * fw; }
          const fr = frc[mi] / 255;
          if (fr > 0) { r = r * (1 - fr) + red[0] * fr; g = g * (1 - fr) + red[1] * fr; b = b * (1 - fr) + red[2] * fr; }
        }
      }

      const o = i * 3;
      out[o] = enc(r); out[o + 1] = enc(g); out[o + 2] = enc(b);
    }
  }

  const png = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  return injectP3(png);
}
