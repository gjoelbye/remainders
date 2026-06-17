/**
 * sRGB <-> Display P3 color math (ported from scripts/make-macbook-wallpaper.py).
 *
 * Both sRGB and Display P3 use the sRGB transfer function; they differ only in
 * primaries. The wallpaper is output as a Display-P3-tagged PNG, so every color
 * we draw must be expressed as Display-P3 *code values*:
 *
 *  - `toP3(srgbHex)` converts an sRGB color to the P3 code values that LOOK the
 *    same once the PNG is tagged Display P3 (appearance-preserving) — use for
 *    backgrounds, silhouette tint, text, ring dots.
 *  - `p3Native(r,g,b)` treats the given values directly as Display-P3 code
 *    values (more saturated than sRGB can express) — use for the vibrant lit
 *    windows / glow / Danish-flag red so they "pop" on a P3 display.
 */

export type RGB = { r: number; g: number; b: number };

// sRGB -> CIE XYZ (D65)
const M_SRGB = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];
// CIE XYZ (D65) -> linear Display P3
const XYZ_TO_P3 = [
  [2.4934969, -0.9313836, -0.4027108],
  [-0.8294890, 1.7626641, 0.0236247],
  [0.0358458, -0.0761724, 0.9568845],
];

function srgbDecode(code: number): number {
  const c = code / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function srgbEncode(lin: number): number {
  const x = Math.min(1, Math.max(0, lin));
  const e = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(e * 255);
}

function mul(m: number[][], v: number[]): number[] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** sRGB color -> Display-P3 code values that preserve its appearance. */
export function toP3(srgb: string | RGB): RGB {
  const { r, g, b } = typeof srgb === 'string' ? hexToRgb(srgb) : srgb;
  const lin = [srgbDecode(r), srgbDecode(g), srgbDecode(b)];
  const linp3 = mul(XYZ_TO_P3, mul(M_SRGB, lin));
  return { r: srgbEncode(linp3[0]), g: srgbEncode(linp3[1]), b: srgbEncode(linp3[2]) };
}

/** Appearance-preserving sRGB->P3 as a hex string. */
export function toP3Hex(srgb: string | RGB): string {
  return rgbToHex(toP3(srgb));
}

/** Treat the given code values directly as vibrant Display-P3-native color. */
export function p3Native(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

// --- linear-light helpers (for the runtime compositor, lib/wallpaper-compose) ---

export type LinRGB = [number, number, number];

/** sRGB color -> LINEAR Display P3 (appearance-preserving). */
export function srgbToLinP3(srgb: string | RGB): LinRGB {
  const { r, g, b } = typeof srgb === 'string' ? hexToRgb(srgb) : srgb;
  const lin = [srgbDecode(r), srgbDecode(g), srgbDecode(b)];
  return mul(XYZ_TO_P3, mul(M_SRGB, lin)) as LinRGB;
}

/** Display-P3 code values -> LINEAR Display P3 (vibrant, P3-native). */
export function p3CodeToLinP3({ r, g, b }: RGB): LinRGB {
  return [srgbDecode(r), srgbDecode(g), srgbDecode(b)];
}

export { srgbDecode, srgbEncode };
