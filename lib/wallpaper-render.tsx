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

/** Default per-dot ring stroke width if not provided. */
const DEFAULT_RING_WIDTH = 2;

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

  switch (shape) {
    case 'square':
      return { ...base, backgroundColor: color, borderRadius: '0px' };
    case 'rounded':
      return { ...base, backgroundColor: color, borderRadius: `${size * 0.22}px` };
    case 'diamond':
      return { ...base, backgroundColor: color, borderRadius: '0px', transform: 'rotate(45deg)', transformOrigin: 'center' };
    case 'ring':
      return { ...base, backgroundColor: 'transparent', borderRadius: '50%', border: `${ringWidth}px solid ${color}` };
    case 'circle':
    default:
      return { ...base, backgroundColor: color, borderRadius: '50%' };
  }
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
  const size = r * 2;

  switch (shape) {
    case 'square':
      return <rect key={keyId} x={cx - r} y={cy - r} width={size} height={size} fill={color} fillOpacity={opacity} />;
    case 'rounded':
      return <rect key={keyId} x={cx - r} y={cy - r} width={size} height={size} rx={r * 0.44} fill={color} fillOpacity={opacity} />;
    case 'diamond':
      return (
        <rect
          key={keyId}
          x={cx - r}
          y={cy - r}
          width={size}
          height={size}
          fill={color}
          fillOpacity={opacity}
          transform={`rotate(45 ${cx} ${cy})`}
        />
      );
    case 'ring':
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
    case 'circle':
    default:
      return <circle key={keyId} cx={cx} cy={cy} r={r} fill={color} fillOpacity={opacity} />;
  }
}
