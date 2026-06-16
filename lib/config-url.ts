/**
 * Stateless config-in-URL encoding.
 *
 * The wallpaper config travels in the URL (/api/wallpaper?c=<base64url>) so the
 * app is fully stateless and Vercel-friendly (no filesystem, no database). These
 * helpers run in both the browser (editor) and the Edge runtime (route) — they
 * avoid Buffer and rely on the global btoa/atob/TextEncoder/TextDecoder.
 */

import type { LocalConfig } from './types';

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Encode a config into a URL-safe string. */
export function encodeConfig(cfg: LocalConfig): string {
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(cfg)));
}

/** Decode a URL-safe string back into a raw object (validate with sanitizeConfig). */
export function decodeConfig(s: string): unknown {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(s)));
}
