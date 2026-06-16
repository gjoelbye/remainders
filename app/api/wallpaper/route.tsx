/**
 * Wallpaper Generation API Route (stateless).
 *
 * The full config is carried in the URL: GET /api/wallpaper?c=<base64url>.
 * Nothing is stored server-side, so this works on Vercel and gives every
 * generated wallpaper its own unique URL. It renders fresh on every request,
 * so the current-day progress is always up to date.
 */

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { DEFAULT_CONFIG, sanitizeConfig } from '@/lib/config-defaults';
import { decodeConfig } from '@/lib/config-url';
import { getDateInTimezone } from '@/lib/calcs';
import type { LocalConfig } from '@/lib/types';
import LifeView from './life-view-enhanced';
import YearView from './year-view-enhanced';

// Rendering a full-resolution PNG with thousands of dots is memory/CPU-heavy —
// it OOM/CPU-crashes Vercel's Edge runtime (128 MB). The Node.js runtime has the
// headroom (≈1 GB), so we render there. The result is then CDN-cached until the
// next local midnight (see Cache-Control), so it renders ~once per day per URL
// and every other fetch is served from cache in a few ms.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Config comes from the ?c= param; bad/missing input falls back to defaults.
    const raw = request.nextUrl.searchParams.get('c');
    let config: LocalConfig = DEFAULT_CONFIG;
    if (raw) {
      try {
        config = sanitizeConfig(decodeConfig(raw));
      } catch {
        config = DEFAULT_CONFIG;
      }
    }

    if (config.viewMode === 'life' && !config.birthDate) {
      return new Response('Set your birth date to use Life View.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const timezone = config.timezone || 'UTC';
    const currentDate = getDateInTimezone(timezone);

    // Render at the device's native resolution (e.g. iPhone 14 Pro = 1179×2556).
    const width = config.device.width;
    const height = config.device.height;

    const backgroundImageProp = config.backgroundImage?.url
      ? { url: config.backgroundImage.url, opacity: config.backgroundImage.opacity ?? 0.1 }
      : undefined;

    const viewProps = {
      width,
      height,
      colors: config.colors,
      typography: config.typography,
      layout: config.layout,
      textElements: config.textElements,
      currentDate,
      backgroundImage: backgroundImageProp,
      widgetSpace: config.widgetSpace,
      skyline: config.skyline,
      skylineLights: config.skylineLights,
      skylineBaseline: config.skylineBaseline,
      gridScale: config.gridScale,
      gridOffsetY: config.gridOffsetY,
      footerOffsetY: config.footerOffsetY,
    };

    const view =
      config.viewMode === 'life'
        ? LifeView({
            ...viewProps,
            birthDate: config.birthDate,
            dotStyle: config.dotStyle,
            background: config.background,
            lifeExpectancyYears: config.lifeExpectancyYears,
            lifeGrouping: config.lifeGrouping,
            gridCols: config.gridCols,
            milestones: config.milestones,
          })
        : YearView({
            ...viewProps,
            isMondayFirst: config.isMondayFirst || false,
            yearViewLayout: config.yearViewLayout || 'months',
            daysLayoutMode: config.daysLayoutMode || 'continuous',
            timezone,
            dotStyle: config.dotStyle,
            background: config.background,
            daysMonthGrouping: config.daysMonthGrouping,
          });

    const imageResponse = new ImageResponse(view, { width, height });

    // Cache at the CDN until the next local midnight: the only thing that changes
    // day-to-day is the current-day dot, so re-rendering more often is wasteful.
    // Every fetch within the day is served from cache (fast, no re-render).
    const secsToday = currentDate.getHours() * 3600 + currentDate.getMinutes() * 60 + currentDate.getSeconds();
    const secsToMidnight = Math.max(60, 86400 - secsToday);

    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': `public, max-age=0, s-maxage=${secsToMidnight}, stale-while-revalidate=86400`,
      },
    });
  } catch (error) {
    console.error('Error generating wallpaper:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response('Internal server error: ' + message, { status: 500 });
  }
}
