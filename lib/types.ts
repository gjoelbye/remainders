/**
 * Core TypeScript types for the wallpaper generator.
 */

/**
 * Represents information about a specific phone model.
 * Used to generate wallpapers with the correct dimensions for each device.
 */
export interface DeviceModel {
  /** Brand name (e.g., "Apple", "Samsung", "Google") */
  brand: string;
  /** Full model name (e.g., "iPhone 15 Pro") */
  model: string;
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
}

/**
 * View mode for the wallpaper visualization.
 * - 'year': current year
 * - 'life': entire life span in weeks
 */
export type ViewMode = 'year' | 'life';

/**
 * Days layout mode for year view.
 * - 'calendar': follows week structure (respects isMondayFirst)
 * - 'continuous': lists all days continuously without week alignment
 */
export type DaysLayoutMode = 'calendar' | 'continuous';

/**
 * Text element that can be added to the wallpaper.
 */
export interface TextElement {
  /** Unique identifier */
  id: string;
  /** Text content to display */
  content: string;
  /** Position X (percentage 0-100) */
  x: number;
  /** Position Y (percentage 0-100) */
  y: number;
  /** Font size in pixels */
  fontSize: number;
  /** Font family name */
  fontFamily: string;
  /** Text color in hex format */
  color: string;
  /** Text alignment */
  align: 'left' | 'center' | 'right';
  /** Whether element is visible */
  visible: boolean;
}

/**
 * Dot symbol shape for the wallpaper grid.
 */
export type DotShape = 'circle' | 'square' | 'rounded' | 'diamond' | 'ring';

export const DOT_SHAPES: DotShape[] = ['circle', 'square', 'rounded', 'diamond', 'ring'];

/**
 * Per-dot rendering style.
 */
export interface DotStyle {
  /** Symbol shape */
  shape: DotShape;
  /** Opacity applied to "future" dots (0-1) for a faded/shaded look */
  futureOpacity: number;
  /** Stroke width in px used when shape === 'ring' */
  ringWidth: number;
}

/**
 * Background fill style. Gradients are linear/radial only (Satori does not
 * support conic-gradient). The renderer builds a valid CSS string from this.
 */
export interface BackgroundStyle {
  mode: 'solid' | 'linear' | 'radial';
  /** Gradient start color (hex) */
  from: string;
  /** Gradient end color (hex) */
  to: string;
  /** Angle in degrees for linear gradients */
  angle: number;
}

/**
 * Life-view dot grouping (the classic "life in weeks" 52-column layout).
 */
export interface LifeGrouping {
  /** Render each year as its own 52-week block, tiled in a grid */
  enabled: boolean;
  /** Block shape: 'square' = 8×7 (square-ish), 'tall' = 4×13 */
  blockShape: 'square' | 'tall';
  /** Extra gap after each year row, in multiples of dot size */
  yearGap: number;
  /** Extra gap after each decade (10 rows), in multiples of dot size */
  decadeGap: number;
  /** Render decade labels (10, 20, …) above each decade block */
  decadeLabels: boolean;
}

/**
 * Optional background image painted under the grid.
 */
export interface BackgroundImage {
  /** Public URL to the image */
  url: string;
  /** Whether this is a preset or user-uploaded image */
  type: 'preset' | 'upload';
  /** Preset ID (if type === 'preset') */
  presetId?: string;
  /** Opacity 0-1 */
  opacity: number;
}

/**
 * Local single-user configuration persisted to data/config.json.
 */
export interface LocalConfig {
  /** Birth date in YYYY-MM-DD format */
  birthDate: string;

  /** View mode: year or life */
  viewMode: ViewMode;

  /** Device dimensions */
  device: {
    brand: string;
    modelName: string;
    width: number;
    height: number;
  };

  /** Visual customization */
  colors: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };

  /** Typography settings */
  typography: {
    fontFamily: string;
    fontSize: number;
    statsVisible: boolean;
  };

  /** Custom text elements */
  textElements: TextElement[];

  /** Layout preferences */
  layout: {
    topPadding: number;
    bottomPadding: number;
    sidePadding: number;
    dotSpacing: number;
  };

  /** Monday as first day of week (for year view) */
  isMondayFirst: boolean;

  /** Year view layout type */
  yearViewLayout: 'months' | 'days';

  /** Days layout mode */
  daysLayoutMode: DaysLayoutMode;

  /** User's timezone (IANA format) */
  timezone: string;

  /** Optional background image painted under the grid */
  backgroundImage?: BackgroundImage;

  // --- Customization features ---

  /** Life expectancy in years (Life view grid = years × 52 weeks) */
  lifeExpectancyYears: number;

  /** Dot symbol shape + shading */
  dotStyle: DotStyle;

  /** Background fill (solid color or gradient) */
  background: BackgroundStyle;

  /** Life-view year/decade grouping */
  lifeGrouping: LifeGrouping;

  /** Year "days" layout: separate dots into month blocks */
  daysMonthGrouping: boolean;

  /**
   * Reserve the top of the screen for the iOS lock-screen clock + a widget row,
   * pushing the dot grid into the lower area so widgets never cover any dots.
   */
  widgetSpace: boolean;

  /** Render the Copenhagen skyline silhouette behind the clock */
  skyline: boolean;

  /**
   * Vertical position of the skyline's ground line, as a fraction of screen
   * height (smaller = higher on screen). Tunes alignment with the iOS clock.
   */
  skylineBaseline: number;

  // --- Advanced layout nudges (for aligning to the lock screen) ---

  /** Multiply the auto-fitted dot/grid size (1 = fit, >1 = larger). */
  gridScale: number;

  /** Nudge the whole grid vertically, as a fraction of screen height. */
  gridOffsetY: number;

  /** Force the number of Life year-block columns (0 = auto). */
  gridCols: number;
}
