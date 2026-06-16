/**
 * Year View Component - Enhanced with Customization Support
 * 
 * Renders 365/366 dots in a 12-month calendar grid showing current year progress.
 * Supports custom colors, gradients, dot shapes, typography, layout, and text elements.
 */

import { TextElement, DotShape, BackgroundStyle } from '@/lib/types';
import { buildBackgroundStyle, dotDivStyle, computeSafeAreaTop, skylineElement } from '@/lib/wallpaper-render';
import {
  calculateDaysLeftInYear,
  getCurrentDayOfYear,
  getTotalDaysInCurrentYear,
} from '@/lib/calcs';

interface YearViewProps {
  width: number;
  height: number;
  isMondayFirst: boolean;
  yearViewLayout?: 'months' | 'days';
  daysLayoutMode?: 'calendar' | 'continuous';
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
  timezone?: string;
  backgroundImage?: { url: string; opacity: number };
  // Customization
  dotStyle?: { shape: DotShape; futureOpacity: number; ringWidth: number };
  background?: BackgroundStyle;
  daysMonthGrouping?: boolean;
  /** Reserve the top of the screen for the iOS clock + a widget row */
  widgetSpace?: boolean;
  /** Render the Copenhagen skyline silhouette behind the clock */
  skyline?: boolean;
  /** Skyline ground-line position as a fraction of height */
  skylineBaseline?: number;
  /** Advanced: multiply the fitted dot/grid size (1 = auto fit) */
  gridScale?: number;
  /** Advanced: nudge the grid vertically, as a fraction of height */
  gridOffsetY?: number;
}

export default function YearView({
  width,
  height,
  isMondayFirst,
  yearViewLayout = 'months',
  daysLayoutMode = 'continuous',
  colors = {
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#404040',
    text: '#888888',
  },
  typography = {
    fontFamily: 'monospace',
    fontSize: 0.035,
    statsVisible: true,
  },
  layout = {
    topPadding: 0.25,
    bottomPadding: 0.15,
    sidePadding: 0.18,
    dotSpacing: 0.7,
  },
  textElements = [],
  currentDate = new Date(),
  timezone = 'UTC',
  backgroundImage,
  dotStyle = { shape: 'circle', futureOpacity: 1, ringWidth: 2 },
  background,
  daysMonthGrouping = false,
  widgetSpace = true,
  skyline = true,
  skylineBaseline = 0.24,
  gridScale = 1,
  gridOffsetY = 0,
}: YearViewProps) {
  // Year Logic
  const date = currentDate;
  const currentYear = date.getFullYear();
  const currentDayOfYear = getCurrentDayOfYear(timezone);
  const daysLeft = calculateDaysLeftInYear(timezone);
  const totalDays = getTotalDaysInCurrentYear();

  // The current-day dot is always filled (solid), even when the rest are rings.
  const currentShape = dotStyle.shape === 'ring' ? 'circle' : dotStyle.shape;

  // Days View Layout (weekly grid - 2 weeks per row)
  if (yearViewLayout === 'days') {
    const aspectRatio = height / width;
    
    const SAFE_AREA_TOP = computeSafeAreaTop(height, aspectRatio, layout.topPadding, widgetSpace);
    const SAFE_AREA_BOTTOM = height * layout.bottomPadding;
    const SAFE_HEIGHT = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;
    
    const adjustedSidePadding = aspectRatio > 2.1 
      ? Math.min(layout.sidePadding, 0.12) 
      : aspectRatio > 2.0 
      ? Math.min(layout.sidePadding, 0.15) 
      : layout.sidePadding;
    
    const paddingX = width * adjustedSidePadding;
    const availableWidth = width - paddingX * 2;
    
    // Calculate grid dimensions - 14 days per row (2 weeks)
    const COLS_PER_ROW = 14;

    // Calculate offset for calendar mode (ignored when month-grouping)
    let startDayOffset = 0;
    if (daysLayoutMode === 'calendar' && !daysMonthGrouping) {
      // Get the day of week for January 1st
      const jan1 = new Date(currentYear, 0, 1);
      startDayOffset = jan1.getDay(); // 0 = Sunday

      // If Monday first, adjust the offset
      if (isMondayFirst) {
        startDayOffset = startDayOffset === 0 ? 6 : startDayOffset - 1;
      }
    }

    // Month-grouping: lay each month as its own block of 14-col rows, with a
    // blank row between months for clear visual separation.
    const daysInMonthArr = Array.from({ length: 12 }, (_, m) => new Date(currentYear, m + 1, 0).getDate());
    const rowsPerMonth = daysInMonthArr.map((d) => Math.ceil(d / COLS_PER_ROW));
    const GAP_ROWS = 1;
    const monthStartRow: number[] = [];
    const monthFirstDay: number[] = []; // first day-of-year (1-based) per month
    {
      let rowAcc = 0;
      let dayAcc = 1;
      for (let m = 0; m < 12; m++) {
        monthStartRow[m] = rowAcc;
        monthFirstDay[m] = dayAcc;
        rowAcc += rowsPerMonth[m] + GAP_ROWS;
        dayAcc += daysInMonthArr[m];
      }
    }
    const groupedRows = monthStartRow[11] + rowsPerMonth[11];

    const totalCells = startDayOffset + totalDays;
    const ROWS = daysMonthGrouping ? groupedRows : Math.ceil(totalCells / COLS_PER_ROW);

    // Reserve a fixed band for the pinned footer; size/center the grid above it.
    const footerFontSize = width * typography.fontSize;
    const footerReserve = typography.statsVisible ? footerFontSize + height * 0.03 : 0;
    const gridAreaHeight = SAFE_HEIGHT - footerReserve;

    // Calculate dot size
    const maxDotSizeH = availableWidth / COLS_PER_ROW;
    const maxDotSizeV = gridAreaHeight / (ROWS + 1);
    const dotSize = Math.min(maxDotSizeH, maxDotSizeV) * 0.7 * gridScale; // Smaller dots
    const dotGap = dotSize * layout.dotSpacing * 0.5; // Tighter spacing

    const gridWidth = COLS_PER_ROW * (dotSize + dotGap) - dotGap;
    const gridHeight = ROWS * (dotSize + dotGap) - dotGap;

    const startX = paddingX + (availableWidth - gridWidth) / 2;
    const startY = SAFE_AREA_TOP + (gridAreaHeight - gridHeight) / 2 + height * gridOffsetY;
    // Footer pinned a fixed distance above the bottom margin.
    const statsY = height - SAFE_AREA_BOTTOM - footerFontSize;

    // Create all dots
    const allDots = [];
    for (let day = 1; day <= totalDays; day++) {
      const isFuture = day > currentDayOfYear;
      const isCurrent = day === currentDayOfYear;
      const color = day < currentDayOfYear ? colors.past : isCurrent ? colors.current : colors.future;

      // Calculate position
      let row: number;
      let col: number;
      if (daysMonthGrouping) {
        let m = 11;
        for (let k = 0; k < 12; k++) {
          if (day < monthFirstDay[k] + daysInMonthArr[k]) { m = k; break; }
        }
        const dayInMonth = day - monthFirstDay[m]; // 0-based
        row = monthStartRow[m] + Math.floor(dayInMonth / COLS_PER_ROW);
        col = dayInMonth % COLS_PER_ROW;
      } else {
        const cellIndex = day - 1 + startDayOffset;
        row = Math.floor(cellIndex / COLS_PER_ROW);
        col = cellIndex % COLS_PER_ROW;
      }

      allDots.push(
        <div
          key={`dot-${day}`}
          style={{
            position: 'absolute',
            left: `${startX + col * (dotSize + dotGap)}px`,
            top: `${startY + row * (dotSize + dotGap)}px`,
            ...dotDivStyle({
              size: dotSize,
              color,
              shape: isCurrent ? currentShape : dotStyle.shape,
              opacity: isFuture ? dotStyle.futureOpacity : 1,
              ringWidth: dotStyle.ringWidth,
            }),
          }}
        />
      );
    }
    
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
        {/* Copenhagen skyline behind the clock */}
        {skyline && skylineElement({ width, height, color: colors.future, sidePadding: paddingX, baseline: skylineBaseline })}
        <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
          {allDots}
        </div>

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
            }}
          >
            <span style={{ color: colors?.current || '#FF6B35' }}>{daysLeft}d left</span>
            <span style={{ color: colors?.text || '#888888', margin: '0px 8px' }}>·</span>
            <span style={{ color: colors?.text || '#888888' }}>{Math.round((currentDayOfYear / totalDays) * 100)}%</span>
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

  // Grid Layout Config (Months View)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const COLUMNS = 3;
  const ROWS = 4;

  // Layout Calculations with Aspect Ratio Support
  const aspectRatio = height / width;
  
  // Adapt safe zones based on aspect ratio
  const SAFE_AREA_TOP = computeSafeAreaTop(height, aspectRatio, layout.topPadding, widgetSpace);
  const SAFE_AREA_BOTTOM = height * layout.bottomPadding;
  const SAFE_HEIGHT = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

  // Reserve a fixed band for the pinned footer; the grid is sized/centered above it.
  const footerFontSize = width * typography.fontSize;
  const footerReserve = typography.statsVisible ? footerFontSize + height * 0.03 : 0;
  const gridAreaHeight = SAFE_HEIGHT - footerReserve;

  // Adjust side padding for narrower screens
  const adjustedSidePadding = aspectRatio > 2.1
    ? Math.min(layout.sidePadding, 0.12)
    : aspectRatio > 2.0
    ? Math.min(layout.sidePadding, 0.15)
    : layout.sidePadding;

  const paddingX = width * adjustedSidePadding;
  const availableWidth = width - paddingX * 2;
  const cellWidth = availableWidth / COLUMNS;

  // Calculate optimal dot size based on available space (both horizontal and vertical)
  const maxDotSizeH = cellWidth / 8; // 7 dots + spacing
  const maxMonthBlockHeight = gridAreaHeight / ROWS;
  const maxDotSizeV = maxMonthBlockHeight / 9; // Labels + 6 rows of dots + gaps
  
  const dotSize = Math.min(maxDotSizeH, maxDotSizeV, cellWidth / 7, 20) * gridScale;
  const dotGap = dotSize * layout.dotSpacing;
  const monthLabelSize = dotSize * 1.6;

  const monthBlockHeight = monthLabelSize + dotSize + 6 * dotSize + 5 * dotGap;
  const rowGap = monthLabelSize * 1.0;

  const gridHeight = ROWS * monthBlockHeight + (ROWS - 1) * rowGap;

  const startY = SAFE_AREA_TOP + (gridAreaHeight - gridHeight) / 2 + height * gridOffsetY;
  // Footer pinned a fixed distance above the bottom margin.
  const statsY = height - SAFE_AREA_BOTTOM - footerFontSize;

  // Helper to get days in month
  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, monthIndex: number) => {
    if (isMondayFirst) {
      const day = new Date(year, monthIndex, 1).getDay();
      return day === 0 ? 6 : day - 1;
    }
    return new Date(year, monthIndex, 1).getDay();
  };

  let globalDayCounter = 0;

  // Build month grids
  const monthCells = MONTHS.map((monthName, monthIndex) => {
    const daysInMonth = getDaysInMonth(currentYear, monthIndex);
    const startDay = getFirstDayOfMonth(currentYear, monthIndex);

    const dots = [];

    // Render 7x6 grid (42 cells)
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startDay + 1;
      let color = 'transparent';

      if (dayNum > 0 && dayNum <= daysInMonth) {
        globalDayCounter++;
        if (globalDayCounter < currentDayOfYear) {
          color = colors.past;
        } else if (globalDayCounter === currentDayOfYear) {
          color = colors.current;
        } else {
          color = colors.future;
        }
      }

      if (dayNum > 0 && dayNum <= daysInMonth) {
        const row = Math.floor(i / 7);
        const col = i % 7;

        const isFuture = globalDayCounter > currentDayOfYear;
        const isCurrent = globalDayCounter === currentDayOfYear;
        dots.push(
          <div
            key={`dot-${monthIndex}-${i}`}
            style={{
              position: 'absolute',
              left: `${col * (dotSize + dotGap)}px`,
              top: `${row * (dotSize + dotGap)}px`,
              ...dotDivStyle({
                size: dotSize,
                color,
                shape: isCurrent ? currentShape : dotStyle.shape,
                opacity: isFuture ? dotStyle.futureOpacity : 1,
                ringWidth: dotStyle.ringWidth,
              }),
            }}
          />
        );
      }
    }

    // Position of month cell
    const colIndex = monthIndex % COLUMNS;
    const rowIndex = Math.floor(monthIndex / COLUMNS);

    const x = paddingX + colIndex * cellWidth;
    const y = startY + rowIndex * (monthBlockHeight + rowGap);
    
    // Center dot grid within cell
    const dotGridWidth = (7 * dotSize) + (6 * dotGap);
    const centerOffset = Math.max(0, (cellWidth - dotGridWidth) / 2);

    return (
      <div
        key={monthName}
        style={{
          position: 'absolute',
          left: `${x + centerOffset}px`,
          top: `${y}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            color: colors?.text || '#888888',
            fontSize: `${monthLabelSize}px`,
            marginBottom: `${dotSize}px`,
            fontFamily: typography?.fontFamily || 'monospace',
            display: 'flex',
          }}
        >
          {monthName}
        </div>
        <div
          style={{
            position: 'relative',
            width: `${7 * (dotSize + dotGap)}px`,
            height: `${6 * (dotSize + dotGap)}px`,
            display: 'flex',
          }}
        >
          {dots}
        </div>
      </div>
    );
  });

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
      {/* Copenhagen skyline behind the clock */}
      {skyline && skylineElement({ width, height, color: colors.future, sidePadding: paddingX, baseline: skylineBaseline })}
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
        {monthCells}
      </div>

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
          }}
        >
          <span style={{ color: colors?.current || '#FF6B35' }}>{daysLeft}d left</span>
          <span style={{ color: colors?.text || '#888888', margin: '0px 8px' }}>·</span>
          <span style={{ color: colors?.text || '#888888' }}>{Math.round((currentDayOfYear / totalDays) * 100)}%</span>
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

        // Handle alignment for percentage-based positioning
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
