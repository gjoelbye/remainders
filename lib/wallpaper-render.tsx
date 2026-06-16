/**
 * Shared rendering helpers for the two wallpaper renderers.
 *
 * The Year view renders dots as positioned <div>s; the Life view renders them
 * as SVG nodes. These helpers keep one shape enum + one background builder as
 * the single source of truth across both mechanisms.
 *
 * Satori (the @vercel/og engine) supports linear/radial gradients and CSS
 * `transform: rotate`, but NOT conic-gradient — never emit conic.
 */

import type { ReactElement } from 'react';
import type { BackgroundStyle, DotShape } from './types';
import { COPENHAGEN_SKYLINE } from './copenhagen-skyline';

/** Default per-dot ring stroke width if not provided. */
const DEFAULT_RING_WIDTH = 2;

/**
 * Fraction of the screen height reserved at the top for iOS lock-screen
 * "furniture" when `widgetSpace` is on, so the dot grid sits below it.
 *
 * Reference (iPhone 14 Pro, 393×852 pt logical): the clock artboard is ≈210×130
 * pt centered around y≈195 pt, and a lock-screen widget row (≈160×60 pt) sits
 * just below it, ending near y≈330 pt → ≈0.39 of the height. We round up to
 * 0.40 so a full row of widgets fits with a little breathing room and never
 * overlaps a dot.
 */
export const WIDGET_SAFE_TOP_RATIO = 0.4;

/**
 * Vertical position of the skyline's ground line, as a fraction of screen
 * height. ~0.29 sits the silhouette directly behind the iOS clock (which is
 * centered around 0.23–0.30h) so the time reads in front of the city, while
 * staying above the dot grid and the below-clock widget row.
 */
/** Fraction of the silhouette's solid base (ground) trimmed off the bottom. */
const SKYLINE_BASE_CROP = 0.1;

/** Warm window-glow color used when the skyline lights are turned on. */
const SKYLINE_LIGHT_COLOR = '#F4C77B';

/**
 * Dialed-in layout baseline. The grid-size slider treats BASE_GRID_SCALE as
 * 100% and the vertical-position slider treats BASE_GRID_OFFSET_Y as 0, so the
 * tuned default look reads as neutral while still being adjustable both ways.
 */
export const BASE_GRID_SCALE = 1.12;
export const BASE_GRID_OFFSET_Y = -0.025;

/**
 * Copenhagen skyline silhouette behind the clock, tinted with a theme color so
 * it matches every palette. Inset by `sidePadding` so it shares the grid's even
 * left/right margins, and the heavy solid base is trimmed by shrinking the
 * viewBox (the outer SVG viewport clips whatever falls below the cut line).
 * `baseline` sets the ground line as a fraction of height (lower = higher up),
 * so it can be aligned with the iOS clock. Returns an absolutely positioned
 * inline SVG (Satori renders <path> like the dot shapes).
 */
export function skylineElement(opts: {
  width: number;
  height: number;
  color: string;
  /** px inset on each side, matching the dot grid's side margins */
  sidePadding: number;
  /** ground-line position as a fraction of height (smaller = higher) */
  baseline: number;
  /** fill the building windows with a warm glow */
  lights?: boolean;
  opacity?: number;
}): ReactElement {
  const { width, height, color, sidePadding, baseline, lights = false, opacity = 1 } = opts;
  const visibleH = COPENHAGEN_SKYLINE.height * (1 - SKYLINE_BASE_CROP);
  const aspect = COPENHAGEN_SKYLINE.width / visibleH;
  const w = width - sidePadding * 2;
  const h = w / aspect;
  const top = height * baseline - h;
  return (
    <svg
      key="skyline"
      width={w}
      height={h}
      viewBox={`0 0 ${COPENHAGEN_SKYLINE.width} ${visibleH}`}
      style={{ position: 'absolute', left: `${sidePadding}px`, top: `${top}px`, overflow: 'hidden' }}
    >
      <path d={COPENHAGEN_SKYLINE.path} fill={color} fillRule="evenodd" fillOpacity={opacity} />
      {/* Lit windows painted on top of the silhouette, exactly over the holes. */}
      {lights && <path d={COPENHAGEN_SKYLINE.windowsPath} fill={SKYLINE_LIGHT_COLOR} fillRule="evenodd" />}
    </svg>
  );
}

/**
 * Top safe-area in px for the dot grid. Tall (notch / Dynamic Island) phones
 * need a deeper reserve for the clock even without widgets; turning on
 * `widgetSpace` deepens it further to clear a widget row (see ratio above).
 * Both renderers call this so the two views stay perfectly in sync.
 */
export function computeSafeAreaTop(
  height: number,
  aspectRatio: number,
  topPadding: number,
  widgetSpace: boolean
): number {
  const base = aspectRatio > 2.0 ? Math.max(topPadding, 0.28) : topPadding;
  const ratio = widgetSpace ? Math.max(base, WIDGET_SAFE_TOP_RATIO) : base;
  return height * ratio;
}

/**
 * Root-element background style. Returns a solid color or a CSS gradient
 * string. The optional background-image layer (if any) is painted separately
 * on top by the renderer.
 */
export function buildBackgroundStyle(
  colors: { background: string },
  bg?: BackgroundStyle
): { backgroundColor?: string; backgroundImage?: string } {
  if (!bg || bg.mode === 'solid') {
    return { backgroundColor: colors.background };
  }
  if (bg.mode === 'linear') {
    return { backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.from} 0%, ${bg.to} 100%)` };
  }
  // radial
  return { backgroundImage: `radial-gradient(circle, ${bg.from} 0%, ${bg.to} 100%)` };
}

/**
 * Visual style for a Year-view dot <div> (the caller adds position/left/top).
 * Returns width/height/shape styling + opacity.
 */
export function dotDivStyle(opts: {
  size: number;
  color: string;
  shape: DotShape;
  opacity?: number;
  ringWidth?: number;
}): Record<string, string | number> {
  const { size, color, shape, opacity = 1, ringWidth = DEFAULT_RING_WIDTH } = opts;
  const base: Record<string, string | number> = { width: `${size}px`, height: `${size}px` };
  if (opacity !== 1) base.opacity = opacity;

  if (shape === 'ring') {
    return { ...base, backgroundColor: 'transparent', borderRadius: '50%', border: `${ringWidth}px solid ${color}` };
  }
  // 'circle' — filled
  return { ...base, backgroundColor: color, borderRadius: '50%' };
}

/**
 * A single Life-view dot as an SVG node, centered on (cx, cy) with the given
 * radius. Mirrors the shapes from dotDivStyle using SVG primitives.
 */
export function dotSvgElement(opts: {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  shape: DotShape;
  opacity?: number;
  ringWidth?: number;
  keyId: string;
}): ReactElement {
  const { cx, cy, radius: r, color, shape, opacity = 1, ringWidth = DEFAULT_RING_WIDTH, keyId } = opts;

  if (shape === 'ring') {
    return (
      <circle
        key={keyId}
        cx={cx}
        cy={cy}
        r={Math.max(0.5, r - ringWidth / 2)}
        fill="none"
        stroke={color}
        strokeWidth={ringWidth}
        strokeOpacity={opacity}
      />
    );
  }
  // 'circle' — filled
  return <circle key={keyId} cx={cx} cy={cy} r={r} fill={color} fillOpacity={opacity} />;
}
