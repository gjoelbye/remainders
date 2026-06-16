/**
 * Pure config defaults + validation (no fs/Node deps — safe to import anywhere).
 *
 * DEFAULT_CONFIG and sanitizeConfig are shared by the editor (client), the
 * config-URL encode/decode, and the wallpaper route. sanitizeConfig turns any
 * untrusted input (e.g. a decoded URL) into a complete, valid config.
 */

import type {
  BackgroundStyle,
  DaysLayoutMode,
  DotStyle,
  LifeGrouping,
  LocalConfig,
  Milestone,
  TextElement,
  ViewMode,
} from './types';

/**
 * Canonical defaults — the single source of truth. Mirrors the default-filling
 * that the old Firestore wallpaper route did inline.
 */
export const DEFAULT_CONFIG: LocalConfig = {
  birthDate: '2000-04-22',
  viewMode: 'life',
  device: { brand: 'Apple', modelName: 'iPhone 14 Pro', width: 1179, height: 2556 },
  colors: {
    // Nord palette, with a red current-week marker
    background: '#2E3440',
    past: '#ECEFF4',
    current: '#FF3B30',
    future: '#4C566A',
    text: '#D8DEE9',
  },
  typography: {
    fontFamily: 'monospace',
    fontSize: 0.035,
    statsVisible: true,
  },
  textElements: [],
  milestones: [],
  layout: {
    topPadding: 0.25,
    bottomPadding: 0.15,
    sidePadding: 0.18,
    dotSpacing: 0.7,
  },
  isMondayFirst: false,
  yearViewLayout: 'months',
  daysLayoutMode: 'continuous',
  timezone: 'Europe/Copenhagen',
  lifeExpectancyYears: 84,
  dotStyle: { futureOpacity: 1, ringWidth: 1.5 },
  background: { mode: 'solid', from: '#2E3440', to: '#2E3440', angle: 180 },
  lifeGrouping: { yearGap: 0.5, decadeGap: 1.5, decadeLabels: true },
  daysMonthGrouping: false,
  widgetSpace: true,
  skyline: true,
  skylineLights: true,
  skylineBaseline: 0.24,
  // gridScale/gridOffsetY are relative to the baked-in baseline (see
  // BASE_GRID_SCALE / BASE_GRID_OFFSET_Y); 1 = 100%, 0 = the tuned position.
  gridScale: 1.0,
  gridOffsetY: 0.0,
  gridCols: 0, // auto; the heuristic targets a clean corner-clip (84 → 8×11)
  footerOffsetY: -0.085,
};

// --- small validation helpers ---

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function num(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function hex(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX_RE.test(v) ? v : fallback;
}

// Accept only a valid YYYY-MM-DD date; otherwise fall back (empty = "not set").
function dateString(v: unknown, fallback: string): string {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return v;
  }
  return fallback;
}

// Accept only http(s), data:image, or root-relative image URLs.
function safeUrl(v: unknown): string | null {
  return typeof v === 'string' && /^(https?:\/\/|data:image\/|\/)/.test(v) ? v : null;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function sanitizeDotStyle(v: unknown): DotStyle {
  const d = obj(v);
  const def = DEFAULT_CONFIG.dotStyle;
  return {
    futureOpacity: num(d.futureOpacity, def.futureOpacity, 0, 1),
    ringWidth: num(d.ringWidth, def.ringWidth, 0.5, 20),
  };
}

function sanitizeBackground(v: unknown): BackgroundStyle {
  const d = obj(v);
  const def = DEFAULT_CONFIG.background;
  return {
    mode: oneOf(d.mode, ['solid', 'linear', 'radial'] as const, def.mode),
    from: hex(d.from, def.from),
    to: hex(d.to, def.to),
    angle: num(d.angle, def.angle, 0, 360),
  };
}

function sanitizeLifeGrouping(v: unknown): LifeGrouping {
  const d = obj(v);
  const def = DEFAULT_CONFIG.lifeGrouping;
  return {
    yearGap: num(d.yearGap, def.yearGap, 0, 5),
    decadeGap: num(d.decadeGap, def.decadeGap, 0, 10),
    decadeLabels: bool(d.decadeLabels, def.decadeLabels),
  };
}

// Accept only a valid YYYY-MM-DD date; otherwise null.
function optDate(v: unknown): string | null {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime())) {
    return v;
  }
  return null;
}

function sanitizeMilestones(v: unknown): Milestone[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e) => e && typeof e === 'object')
    .map((e: Record<string, unknown>, i): Milestone | null => {
      const start = optDate(e.start);
      if (!start) return null; // a milestone needs at least a valid start date
      return {
        id: str(e.id, `ms-${i}`),
        start,
        end: optDate(e.end),
        ongoing: bool(e.ongoing, false),
        color: hex(e.color, '#88C0D0'),
      };
    })
    .filter((m): m is Milestone => m !== null);
}

function sanitizeTextElements(v: unknown): TextElement[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((e) => e && typeof e === 'object')
    .map((e: Record<string, unknown>, i): TextElement => ({
      id: str(e.id, `text-${i}`),
      content: str(e.content, ''),
      x: num(e.x, 50, 0, 100),
      y: num(e.y, 50, 0, 100),
      fontSize: num(e.fontSize, 16, 4, 200),
      fontFamily: str(e.fontFamily, 'monospace'),
      color: hex(e.color, '#888888'),
      align: oneOf(e.align, ['left', 'center', 'right'] as const, 'left'),
      visible: bool(e.visible, true),
    }));
}

/**
 * Validate + clamp arbitrary input into a complete, well-formed LocalConfig.
 * Every field falls back to DEFAULT_CONFIG so a partial or hand-edited file
 * never yields undefined nested props (TS strict mode safe).
 */
export function sanitizeConfig(input: unknown): LocalConfig {
  const c = obj(input);
  const device = obj(c.device);
  const colors = obj(c.colors);
  const typography = obj(c.typography);
  const layout = obj(c.layout);
  const bgImage = c.backgroundImage && typeof c.backgroundImage === 'object' ? obj(c.backgroundImage) : undefined;

  const D = DEFAULT_CONFIG;

  const result: LocalConfig = {
    birthDate: dateString(c.birthDate, D.birthDate),
    viewMode: oneOf<ViewMode>(c.viewMode, ['year', 'life'], D.viewMode),
    device: {
      brand: str(device.brand, D.device.brand),
      modelName: str(device.modelName, D.device.modelName),
      width: Math.round(num(device.width, D.device.width, 100, 8000)),
      height: Math.round(num(device.height, D.device.height, 100, 8000)),
    },
    colors: {
      background: hex(colors.background, D.colors.background),
      past: hex(colors.past, D.colors.past),
      current: hex(colors.current, D.colors.current),
      future: hex(colors.future, D.colors.future),
      text: hex(colors.text, D.colors.text),
    },
    typography: {
      fontFamily: str(typography.fontFamily, D.typography.fontFamily),
      fontSize: num(typography.fontSize, D.typography.fontSize, 0.01, 0.2),
      statsVisible: bool(typography.statsVisible, D.typography.statsVisible),
    },
    textElements: sanitizeTextElements(c.textElements),
    milestones: sanitizeMilestones(c.milestones),
    layout: {
      topPadding: num(layout.topPadding, D.layout.topPadding, 0, 0.5),
      bottomPadding: num(layout.bottomPadding, D.layout.bottomPadding, 0, 0.5),
      sidePadding: num(layout.sidePadding, D.layout.sidePadding, 0, 0.5),
      dotSpacing: num(layout.dotSpacing, D.layout.dotSpacing, 0, 3),
    },
    isMondayFirst: bool(c.isMondayFirst, D.isMondayFirst),
    yearViewLayout: oneOf(c.yearViewLayout, ['months', 'days'] as const, D.yearViewLayout),
    daysLayoutMode: oneOf<DaysLayoutMode>(c.daysLayoutMode, ['calendar', 'continuous'], D.daysLayoutMode),
    timezone: str(c.timezone, D.timezone),
    lifeExpectancyYears: Math.round(num(c.lifeExpectancyYears, D.lifeExpectancyYears, 1, 150)),
    dotStyle: sanitizeDotStyle(c.dotStyle),
    background: sanitizeBackground(c.background),
    lifeGrouping: sanitizeLifeGrouping(c.lifeGrouping),
    daysMonthGrouping: bool(c.daysMonthGrouping, D.daysMonthGrouping),
    widgetSpace: bool(c.widgetSpace, D.widgetSpace),
    skyline: bool(c.skyline, D.skyline),
    skylineLights: bool(c.skylineLights, D.skylineLights),
    skylineBaseline: num(c.skylineBaseline, D.skylineBaseline, 0.1, 0.4),
    gridScale: num(c.gridScale, D.gridScale, 0.5, 1.8),
    gridOffsetY: num(c.gridOffsetY, D.gridOffsetY, -0.25, 0.25),
    gridCols: Math.round(num(c.gridCols, D.gridCols, 0, 16)),
    footerOffsetY: num(c.footerOffsetY, D.footerOffsetY, -0.25, 0.25),
  };

  if (bgImage) {
    const url = safeUrl(bgImage.url);
    if (url) {
      result.backgroundImage = {
        url,
        type: oneOf(bgImage.type, ['preset', 'upload'] as const, 'preset'),
        opacity: num(bgImage.opacity, 0.1, 0, 1),
        ...(typeof bgImage.presetId === 'string' ? { presetId: bgImage.presetId } : {}),
      };
    }
  }

  return result;
}
