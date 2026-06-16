/**
 * Life View Component - Enhanced with Customization Support
 *
 * Renders lifeExpectancyYears × 52 dots (1 dot = 1 week). Supports custom
 * colors, gradients, dot shapes, year/decade grouping, typography, layout,
 * and text elements.
 */

import { TextElement, DotShape, BackgroundStyle, LifeGrouping } from '@/lib/types';
import { buildBackgroundStyle, dotSvgElement } from '@/lib/wallpaper-render';

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
  currentDate?: Date;
  backgroundImage?: { url: string; opacity: number };
  // Customization
  dotStyle?: { shape: DotShape; futureOpacity: number; ringWidth: number };
  background?: BackgroundStyle;
  lifeExpectancyYears?: number;
  lifeGrouping?: LifeGrouping;
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
  currentDate = new Date(),
  backgroundImage,
  dotStyle = { shape: 'circle', futureOpacity: 1, ringWidth: 2 },
  background,
  lifeExpectancyYears = 84, // default life expectancy
  lifeGrouping = { enabled: false, blockShape: 'square', yearGap: 0.5, decadeGap: 1.5, decadeLabels: false },
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

  const SAFE_AREA_TOP = aspectRatio > 2.0
    ? height * Math.max(layout.topPadding, 0.28)
    : height * layout.topPadding;
  const SAFE_AREA_BOTTOM = height * layout.bottomPadding;

  const adjustedSidePadding = aspectRatio > 2.1
    ? Math.min(layout.sidePadding, 0.08)
    : aspectRatio > 2.0
    ? Math.min(layout.sidePadding, 0.09)
    : layout.sidePadding;
  const SAFE_WIDTH_PADDING = width * adjustedSidePadding;

  const availableWidth = width - SAFE_WIDTH_PADDING * 2;
  const availableHeight = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

  // Reserve a fixed band for the footer so the grid is sized/centered ABOVE it
  // and the footer always sits the same distance from the bottom margin.
  const footerFontSize = width * typography.fontSize;
  const footerReserve = typography.statsVisible ? footerFontSize + height * 0.03 : 0;
  const gridAreaHeight = availableHeight - footerReserve;

  // Two Life layouts share these; each branch fills them in.
  const grouped = lifeGrouping.enabled;
  const WEEKS_PER_YEAR = 52;
  // The current-week dot is always filled (solid) so it stands out even when the
  // rest are ring outlines; other shapes are already filled.
  const currentShape = dotStyle.shape === 'ring' ? 'circle' : dotStyle.shape;
  const pastDots = [];
  const futureDots = [];
  let currentDot = null;
  const decadeLabels = [];
  let gridWidth: number;
  let gridHeight: number;
  let startX: number;
  let startY: number;

  if (grouped) {
    // === Year-blocks layout: each year is its own 52-week block, tiled. ===
    // 'square' → 8×7 (last row holds 4); 'tall' → 4×13 (exact, no partial row).
    const isTall = lifeGrouping.blockShape === 'tall';
    const BLOCK_COLS = isTall ? 4 : 8;
    const BLOCK_ROWS = isTall ? 13 : 7;
    const N = LIFE_EXPECTANCY_YEARS; // one block per year

    // Ordered (row, col) for each of the 52 weeks within a block:
    // 'tall'  → full 4×13;
    // 'square'→ 8×7 with the 4 corners removed (rows of 6,8,8,8,8,8,6 = 52).
    const blockCells: Array<[number, number]> = [];
    for (let r = 0; r < BLOCK_ROWS; r++) {
      const edge = !isTall && (r === 0 || r === BLOCK_ROWS - 1);
      const cStart = edge ? 1 : 0;
      const cEnd = edge ? BLOCK_COLS - 1 : BLOCK_COLS;
      for (let c = cStart; c < cEnd; c++) blockCells.push([r, c]);
    }

    // Outer block grid: pick block-columns so the overall grid matches the
    // canvas aspect (corrected for the block's own ~8:7 aspect).
    const availAR = availableWidth / gridAreaHeight;
    const rawCols = Math.sqrt(availAR * N * (BLOCK_ROWS / BLOCK_COLS));
    const blockCols = Math.max(1, Math.min(N, Math.round(rawCols)));
    const blockRows = Math.ceil(N / blockCols);

    const INNER_SPACING = layout.dotSpacing; // gap between week dots, in dot units
    const BLOCK_GAP_UNITS = Math.max(1.5, 1 + lifeGrouping.yearGap * 2); // gap between blocks

    // Solve dot size from total demand in dot-size units on each axis.
    const wUnits = blockCols * BLOCK_COLS + INNER_SPACING * blockCols * (BLOCK_COLS - 1) + BLOCK_GAP_UNITS * (blockCols - 1);
    const hUnits = blockRows * BLOCK_ROWS + INNER_SPACING * blockRows * (BLOCK_ROWS - 1) + BLOCK_GAP_UNITS * (blockRows - 1);
    const dotSize = Math.max(2, Math.floor(Math.min(availableWidth / wUnits, gridAreaHeight / hUnits)));
    const innerGap = Math.max(1, Math.floor(dotSize * INNER_SPACING));
    const blockGap = Math.max(2, Math.floor(dotSize * BLOCK_GAP_UNITS));

    const blockW = BLOCK_COLS * dotSize + (BLOCK_COLS - 1) * innerGap;
    const blockH = BLOCK_ROWS * dotSize + (BLOCK_ROWS - 1) * innerGap;
    gridWidth = blockCols * blockW + (blockCols - 1) * blockGap;
    gridHeight = blockRows * blockH + (blockRows - 1) * blockGap;

    startX = Math.max(SAFE_WIDTH_PADDING, (width - gridWidth) / 2);
    startY = Math.max(SAFE_AREA_TOP * 0.9, SAFE_AREA_TOP + (gridAreaHeight - gridHeight) / 2);

    for (let i = 0; i < TOTAL_DOTS; i++) {
      const year = Math.floor(i / WEEKS_PER_YEAR);
      const weekInYear = i % WEEKS_PER_YEAR;
      const bRow = Math.floor(year / blockCols);
      const bCol = year % blockCols;
      const [iRow, iCol] = blockCells[weekInYear];
      const cx = bCol * (blockW + blockGap) + iCol * (dotSize + innerGap) + dotSize / 2;
      const cy = bRow * (blockH + blockGap) + iRow * (dotSize + innerGap) + dotSize / 2;
      const radius = dotSize / 2;

      if (i < weeksLived) {
        pastDots.push(dotSvgElement({ keyId: `past-${i}`, cx, cy, radius, color: colors.past, shape: dotStyle.shape, ringWidth: dotStyle.ringWidth }));
      } else if (i === weeksLived) {
        currentDot = dotSvgElement({ keyId: 'current', cx, cy, radius, color: colors.current, shape: currentShape, ringWidth: dotStyle.ringWidth });
      } else {
        futureDots.push(dotSvgElement({ keyId: `future-${i}`, cx, cy, radius, color: colors.future, shape: dotStyle.shape, opacity: dotStyle.futureOpacity, ringWidth: dotStyle.ringWidth }));
      }
    }

    // Decade labels: a small age number above each decade-boundary block.
    if (lifeGrouping.decadeLabels) {
      const labelFont = Math.max(8, Math.floor(dotSize * 1.3));
      for (let year = 0; year < N; year += 10) {
        const bRow = Math.floor(year / blockCols);
        const bCol = year % blockCols;
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
  } else {
    // === Continuous aspect-fit grid (the classic single grid). ===
    const outputRatio = availableWidth / gridAreaHeight;
    const estimatedCols = Math.sqrt(TOTAL_DOTS * outputRatio);
    const cols = Math.max(40, Math.floor(estimatedCols));
    const rows = Math.ceil(TOTAL_DOTS / cols);

    const dotSizeFromWidth = availableWidth / (cols + (cols - 1) * layout.dotSpacing);
    const dotSizeFromHeight = gridAreaHeight / (rows + (rows - 1) * layout.dotSpacing);
    const dotSize = Math.max(2, Math.floor(Math.min(dotSizeFromWidth, dotSizeFromHeight)));
    const gap = Math.max(1, Math.floor(dotSize * layout.dotSpacing));

    gridWidth = cols * dotSize + (cols - 1) * gap;
    gridHeight = rows * dotSize + (rows - 1) * gap;

    startX = Math.max(SAFE_WIDTH_PADDING, (width - gridWidth) / 2);
    startY = Math.max(SAFE_AREA_TOP * 0.9, SAFE_AREA_TOP + (gridAreaHeight - gridHeight) / 2);

    for (let i = 0; i < TOTAL_DOTS; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const cx = col * (dotSize + gap) + dotSize / 2;
      const cy = row * (dotSize + gap) + dotSize / 2;
      const radius = dotSize / 2;

      if (i < weeksLived) {
        pastDots.push(dotSvgElement({ keyId: `past-${i}`, cx, cy, radius, color: colors.past, shape: dotStyle.shape, ringWidth: dotStyle.ringWidth }));
      } else if (i === weeksLived) {
        currentDot = dotSvgElement({ keyId: 'current', cx, cy, radius, color: colors.current, shape: currentShape, ringWidth: dotStyle.ringWidth });
      } else {
        futureDots.push(dotSvgElement({ keyId: `future-${i}`, cx, cy, radius, color: colors.future, shape: dotStyle.shape, opacity: dotStyle.futureOpacity, ringWidth: dotStyle.ringWidth }));
      }
    }
  }

  // Footer stats — pinned a fixed distance above the bottom margin (independent
  // of the grid), so the text is always in the same place.
  const statsY = height - SAFE_AREA_BOTTOM - footerFontSize;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...buildBackgroundStyle(colors, background),
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Background image layer */}
      {backgroundImage?.url && (
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
        {currentDot}
        {futureDots}
      </svg>

      {/* Decade labels */}
      {decadeLabels}

      {/* Stats Footer */}
      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${statsY}px`,
            left: '0px',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${footerFontSize}px`,
            fontFamily: typography?.fontFamily || 'monospace',
            color: colors?.text || '#888888',
          }}
        >
          {lifePercentage}% to {LIFE_EXPECTANCY_YEARS}
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
