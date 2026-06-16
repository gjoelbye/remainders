/**
 * Stateless config-in-URL encoding.
 *
 * The wallpaper config travels in the URL (/api/wallpaper?c=<base64url>) so the
 * app is fully stateless and Vercel-friendly (no filesystem, no database). These
 * helpers run in both the browser (editor) and the Edge runtime (route) — they
 * avoid Buffer and rely on the global btoa/atob/TextEncoder/TextDecoder.
 */

import type { LocalConfig } from './types';
import { DEFAULT_CONFIG } from './config-defaults';

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

/**
 * Encode a config into a URL-safe string. Only fields that differ from the
 * defaults are included, so the URL stays short enough to survive copy/paste
 * into a phone shortcut (which can truncate very long URLs). sanitizeConfig
 * refills every omitted field from DEFAULT_CONFIG on decode.
 */
export function encodeConfig(cfg: LocalConfig): string {
  const diff: Record<string, unknown> = {};
  (Object.keys(cfg) as (keyof LocalConfig)[]).forEach((key) => {
    if (JSON.stringify(cfg[key]) !== JSON.stringify(DEFAULT_CONFIG[key])) {
      diff[key] = cfg[key];
    }
  });
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(diff)));
}

/** Decode a URL-safe string back into a raw object (validate with sanitizeConfig). */
export function decodeConfig(s: string): unknown {
  return JSON.parse(new TextDecoder().decode(b64urlDecode(s)));
}
