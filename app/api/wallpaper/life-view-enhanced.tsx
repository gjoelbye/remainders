/**
 * Life View Component - Enhanced with Customization Support
 *
 * Renders lifeExpectancyYears × 52 dots (1 dot = 1 week). Supports custom
 * colors, gradients, dot shapes, year/decade grouping, typography, layout,
 * and text elements.
 */

import { TextElement, BackgroundStyle, LifeGrouping, Milestone } from '@/lib/types';
import { buildBackgroundStyle, dotSvgElement, computeSafeAreaTop, skylineElement, BASE_GRID_SCALE, BASE_GRID_OFFSET_Y } from '@/lib/wallpaper-render';

interface LifeViewProps {
  width: number;
  height: number;
  birthDate: string;
  colors?: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };
  typography?: {
    fontFamily: string;
    fontSize: number;
    statsVisible: boolean;
  };
  layout?: {
    topPadding: number;
    bottomPadding: number;
    sidePadding: number;
    dotSpacing: number;
  };
  textElements?: TextElement[];
  milestones?: Milestone[];
  currentDate?: Date;
  backgroundImage?: { url: string; opacity: number };
  // Customization
  dotStyle?: { futureOpacity: number; ringWidth: number };
  background?: BackgroundStyle;
  lifeExpectancyYears?: number;
  lifeGrouping?: LifeGrouping;
  /** Reserve the top of the screen for the iOS clock + a widget row */
  widgetSpace?: boolean;
  /** Render the Copenhagen skyline silhouette behind the clock */
  skyline?: boolean;
  /** Fill the skyline windows with a warm glow */
  skylineLights?: boolean;
  /** Skyline ground-line position as a fraction of height */
  skylineBaseline?: number;
  /** Advanced: grid size relative to the tuned baseline (1 = 100%) */
  gridScale?: number;
  /** Advanced: nudge the grid vertically, relative to the tuned baseline */
  gridOffsetY?: number;
  /** Advanced: force the number of year-block columns (0 = auto) */
  gridCols?: number;
  /** Advanced: raise (+) / lower (−) the footer text, fraction of height */
  footerOffsetY?: number;
  /**
   * Overlay mode: transparent background, no skyline / bg-image — render only
   * the grid + decade labels + footer, to be composited over a pre-baked
   * skyline base by lib/wallpaper-compose. Colors should already be P3-encoded.
   */
  overlay?: boolean;
  /**
   * Desktop (landscape) layout: place the grid in the UPPER region and reserve
   * the bottom for the skyline; fit the grid to its area (no phone zoom/nudge).
   */
  desktop?: boolean;
}

export default function LifeView({
  width,
  height,
  birthDate,
  colors = {
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#333333',
    text: '#888888',
  },
  typography = {
    fontFamily: 'monospace',
    fontSize: 0.035,
    statsVisible: true,
  },
  layout = {
    topPadding: 0.25,
    bottomPadding: 0.14,
    sidePadding: 0.10,
    dotSpacing: 0.4,
  },
  textElements = [],
  milestones = [],
  currentDate = new Date(),
  backgroundImage,
  dotStyle = { futureOpacity: 1, ringWidth: 2 },
  background,
  lifeExpectancyYears = 84, // default life expectancy
  lifeGrouping = { yearGap: 0.5, decadeGap: 1.5, decadeLabels: false },
  widgetSpace = true,
  skyline = true,
  skylineLights = false,
  skylineBaseline = 0.2256,
  gridScale = 1,
  gridOffsetY = 0,
  gridCols = 0,
  footerOffsetY = 0,
  overlay = false,
  desktop = false,
}: LifeViewProps) {
  // Life Logic
  const LIFE_EXPECTANCY_YEARS = lifeExpectancyYears;
  const birth = new Date(birthDate);
  const today = currentDate;

  // Total weeks (years × 52 weeks/year)
  const TOTAL_DOTS = Math.round(LIFE_EXPECTANCY_YEARS * 52);

  const diffTime = Math.abs(today.getTime() - birth.getTime());
  const weeksLived = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)), TOTAL_DOTS);
  const lifePercentage = ((weeksLived / TOTAL_DOTS) * 100).toFixed(1);

  // Layout Calculations with Aspect Ratio Support
  const aspectRatio = height / width;

  // Desktop (landscape): grid in the upper region, bottom ~46% reserved for the
  // skyline. Phone: top reserved for the clock/widgets, grid below.
  const SAFE_AREA_TOP = desktop
    ? height * 0.06
    : computeSafeAreaTop(height, aspectRatio, layout.topPadding, widgetSpace);
  const SAFE_AREA_BOTTOM = desktop ? height * 0.46 : height * layout.bottomPadding;

  const adjustedSidePadding = desktop
    ? 0.06
    : aspectRatio > 2.1
    ? Math.min(layout.sidePadding, 0.08)
    : aspectRatio > 2.0
    ? Math.min(layout.sidePadding, 0.09)
    : layout.sidePadding;
  const SAFE_WIDTH_PADDING = width * adjustedSidePadding;

  const availableWidth = width - SAFE_WIDTH_PADDING * 2;
  const availableHeight = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

  // Footer is three small stacked lines (% of month / year / life). Reserve a
  // fixed band so the grid is sized/centered ABOVE it and the footer is pinned
  // the same distance from the bottom margin.
  const footerLineFont = width * typography.fontSize * 0.85;
  const footerLineH = footerLineFont * 1.4;
  const footerBlockH = typography.statsVisible ? footerLineH * 3 : 0;
  const footerReserve = typography.statsVisible ? footerBlockH + height * 0.02 : 0;
  const gridAreaHeight = availableHeight - footerReserve;

  const WEEKS_PER_YEAR = 52;
  const pastDots = [];
  const futureDots = [];
  const milestoneDots = [];
  let currentDot = null;
  const decadeLabels = [];

  // Map each highlighted week index → its milestone color (later milestones win
  // on overlap). A milestone fills [start..end], where end is the current week
  // when `ongoing`, the end date's week when set, or just the start week.
  const milestoneColorByWeek = new Map<number, string>();
  const weekOf = (dateStr: string) =>
    Math.floor((new Date(dateStr).getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
  for (const m of milestones) {
    const s = weekOf(m.start);
    const e = m.ongoing ? weeksLived : m.end ? weekOf(m.end) : s;
    const lo = Math.max(0, Math.min(s, e));
    const hi = Math.min(TOTAL_DOTS - 1, Math.max(s, e));
    for (let i = lo; i <= hi; i++) milestoneColorByWeek.set(i, m.color);
  }

  // === Year-blocks layout: each year is its own 52-week block, tiled. ===
  let gridWidth = 0;
  let gridHeight = 0;
  let startX = 0;
  let startY = 0;
  {
    const BLOCK_COLS = 8;
    const BLOCK_ROWS = 7;
    const N = LIFE_EXPECTANCY_YEARS; // one block per year

    // Ordered (row, col) for each of the 52 weeks within a block: 8×7 with the
    // 4 corners removed (rows of 6,8,8,8,8,8,6 = 52).
    const blockCells: Array<[number, number]> = [];
    for (let r = 0; r < BLOCK_ROWS; r++) {
      const edge = r === 0 || r === BLOCK_ROWS - 1;
      const cStart = edge ? 1 : 0;
      const cEnd = edge ? BLOCK_COLS - 1 : BLOCK_COLS;
      for (let c = cStart; c < cEnd; c++) blockCells.push([r, c]);
    }

    // Outer block grid: pick block-columns so the overall grid matches the
    // canvas aspect (corrected for the block's own ~8:7 aspect), unless the
    // user pins a column count via Advanced settings.
    const availAR = availableWidth / gridAreaHeight;
    const rawCols = Math.sqrt(availAR * N * (BLOCK_ROWS / BLOCK_COLS));
    // Between the two nearest column counts, prefer the one that wastes fewer
    // cells (a cleaner, more symmetric corner-clip), tie-broken by closeness to
    // the aspect-ideal. For 84 this picks 8 (8×11, spare 4) over 9 (9×10, spare
    // 6) regardless of small footer/area changes.
    const spareFor = (c: number) => c * Math.ceil(N / c) - N;
    const lo = Math.max(1, Math.min(N, Math.floor(rawCols)));
    const hi = Math.max(1, Math.min(N, Math.ceil(rawCols)));
    const preferHi =
      spareFor(hi) < spareFor(lo) ||
      (spareFor(hi) === spareFor(lo) && Math.abs(hi - rawCols) < Math.abs(lo - rawCols));
    const autoCols = preferHi ? hi : lo;
    const blockCols = gridCols > 0 ? Math.max(1, Math.min(N, gridCols)) : autoCols;
    const blockRows = Math.ceil(N / blockCols);

    // Corner-clipped outer grid: leave the 4 grid corners empty (symmetric) by
    // pushing the spare cells into the ends of the top & bottom rows. With 84
    // years in 8 columns this gives 8×11 minus the 4 corners = 84 blocks.
    const spare = blockCols * blockRows - N;
    const topCut = Math.ceil(spare / 2);
    const botCut = spare - topCut;
    const yearCells: Array<[number, number]> = [];
    for (let r = 0; r < blockRows; r++) {
      let skipL = 0;
      let skipR = 0;
      if (blockRows === 1) {
        skipL = Math.ceil(spare / 2);
        skipR = spare - skipL;
      } else if (r === 0) {
        skipL = Math.ceil(topCut / 2);
        skipR = topCut - skipL;
      } else if (r === blockRows - 1) {
        skipL = Math.ceil(botCut / 2);
        skipR = botCut - skipL;
      }
      for (let c = skipL; c < blockCols - skipR; c++) yearCells.push([r, c]);
    }

    const INNER_SPACING = layout.dotSpacing; // gap between week dots, in dot units
    const BLOCK_GAP_UNITS = Math.max(1.5, 1 + lifeGrouping.yearGap * 2); // gap between blocks

    // Solve dot size from total demand in dot-size units on each axis.
    const wUnits = blockCols * BLOCK_COLS + INNER_SPACING * blockCols * (BLOCK_COLS - 1) + BLOCK_GAP_UNITS * (blockCols - 1);
    const hUnits = blockRows * BLOCK_ROWS + INNER_SPACING * blockRows * (BLOCK_ROWS - 1) + BLOCK_GAP_UNITS * (blockRows - 1);
    // Keep sizes fractional (no floor) so the zoom slider scales smoothly
    // instead of plateauing on integer pixel steps. Desktop fits the grid to its
    // area (0.95 margin); phone uses the tuned BASE_GRID_SCALE zoom.
    const baseScale = desktop ? 0.95 : BASE_GRID_SCALE;
    const dotSize = Math.max(2, Math.min(availableWidth / wUnits, gridAreaHeight / hUnits) * baseScale * gridScale);
    const innerGap = Math.max(1, dotSize * INNER_SPACING);
    const blockGap = Math.max(2, dotSize * BLOCK_GAP_UNITS);

    const blockW = BLOCK_COLS * dotSize + (BLOCK_COLS - 1) * innerGap;
    const blockH = BLOCK_ROWS * dotSize + (BLOCK_ROWS - 1) * innerGap;
    gridWidth = blockCols * blockW + (blockCols - 1) * blockGap;
    gridHeight = blockRows * blockH + (blockRows - 1) * blockGap;

    // Always center on the screen (overflowing symmetrically when zoomed in),
    // rather than pinning to the side padding.
    startX = (width - gridWidth) / 2;
    startY = SAFE_AREA_TOP + (gridAreaHeight - gridHeight) / 2 + height * ((desktop ? 0 : BASE_GRID_OFFSET_Y) + gridOffsetY);

    for (let i = 0; i < TOTAL_DOTS; i++) {
      const year = Math.floor(i / WEEKS_PER_YEAR);
      const weekInYear = i % WEEKS_PER_YEAR;
      const [bRow, bCol] = yearCells[year];
      const [iRow, iCol] = blockCells[weekInYear];
      const cx = bCol * (blockW + blockGap) + iCol * (dotSize + innerGap) + dotSize / 2;
      const cy = bRow * (blockH + blockGap) + iRow * (dotSize + innerGap) + dotSize / 2;
      const radius = dotSize / 2;

      if (i === weeksLived) {
        // Current week — always a filled dot so it stands out among the rings.
        currentDot = dotSvgElement({ keyId: 'current', cx, cy, radius, color: colors.current, shape: 'circle' });
      } else if (milestoneColorByWeek.has(i)) {
        // Milestone week — filled in its accent color.
        milestoneDots.push(dotSvgElement({ keyId: `ms-${i}`, cx, cy, radius, color: milestoneColorByWeek.get(i)!, shape: 'circle' }));
      } else if (i < weeksLived) {
        pastDots.push(dotSvgElement({ keyId: `past-${i}`, cx, cy, radius, color: colors.past, shape: 'ring', ringWidth: dotStyle.ringWidth }));
      } else {
        futureDots.push(dotSvgElement({ keyId: `future-${i}`, cx, cy, radius, color: colors.future, shape: 'ring', opacity: dotStyle.futureOpacity, ringWidth: dotStyle.ringWidth }));
      }
    }

    // Decade labels: a small age number above each decade-boundary block.
    if (lifeGrouping.decadeLabels) {
      const labelFont = Math.max(8, Math.floor(dotSize * 1.3));
      for (let year = 0; year < N; year += 10) {
        const [bRow, bCol] = yearCells[year];
        decadeLabels.push(
          <div
            key={`decade-${year}`}
            style={{
              position: 'absolute',
              left: `${startX + bCol * (blockW + blockGap)}px`,
              top: `${Math.max(2, startY + bRow * (blockH + blockGap) - labelFont * 1.2)}px`,
              fontSize: `${labelFont}px`,
              fontFamily: typography?.fontFamily || 'monospace',
              color: colors?.text || '#888888',
              display: 'flex',
            }}
          >
            {year}
          </div>
        );
      }
    }
  }

  // Footer percentages — pinned a fixed distance above the bottom margin
  // (independent of the grid), so the lines are always in the same place.
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1).getTime();
  const monthPct = ((today.getTime() - monthStart) / (monthEnd - monthStart)) * 100;
  const yearStart = new Date(today.getFullYear(), 0, 1).getTime();
  const yearEnd = new Date(today.getFullYear() + 1, 0, 1).getTime();
  const yearPct = ((today.getTime() - yearStart) / (yearEnd - yearStart)) * 100;
  const statsY = height - SAFE_AREA_BOTTOM - footerBlockH - height * footerOffsetY;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...(overlay ? { backgroundColor: 'transparent' } : buildBackgroundStyle(colors, background)),
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Background image layer */}
      {!overlay && backgroundImage?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage.url}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: backgroundImage.opacity ?? 0.1,
          }}
        />
      )}
      {/* Copenhagen skyline behind the clock (skipped in overlay mode — the
          skyline is supplied by the pre-baked P3 base in wallpaper-compose) */}
      {!overlay && skyline && skylineElement({ width, height, color: colors.future, sidePadding: SAFE_WIDTH_PADDING, baseline: skylineBaseline, lights: skylineLights })}
      {/* Main Grid SVG */}
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{
          position: 'absolute',
          left: `${startX}px`,
          top: `${startY}px`,
        }}
      >
        {pastDots}
        {futureDots}
        {milestoneDots}
        {currentDot}
      </svg>

      {/* Decade labels */}
      {decadeLabels}

      {/* Stats Footer — three small stacked lines */}
      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${statsY}px`,
            left: '0px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: typography?.fontFamily || 'monospace',
            color: colors?.text || '#888888',
          }}
        >
          {[
            `${monthPct.toFixed(1)}% of month`,
            `${yearPct.toFixed(1)}% of year`,
            `${lifePercentage}% of life`,
          ].map((line) => (
            <div
              key={line}
              style={{ display: 'flex', height: `${footerLineH}px`, alignItems: 'center', fontSize: `${footerLineFont}px` }}
            >
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Custom Text Elements */}
      {textElements.map((element) => {
        if (!element.visible || element.content == null) return null;

        const style: Record<string, string> = {
          position: 'absolute',
          left: `${element.x}%`,
          top: `${element.y}%`,
          fontSize: `${element.fontSize || 16}px`,
          fontFamily: element.fontFamily || typography?.fontFamily || 'monospace',
          color: element.color || colors?.text || '#888888',
        };

        const align = element.align || 'left';
        if (align === 'center') {
          style.transform = 'translate(-50%, -50%)';
        } else if (align === 'right') {
          style.transform = 'translate(-100%, -50%)';
        } else {
          style.transform = 'translateY(-50%)';
        }

        return (
          <div key={element.id} style={style}>
            {String(element.content).trim()}
          </div>
        );
      })}
    </div>
  );
}
