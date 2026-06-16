/**
 * Wallpaper Generation API Route (stateless).
 *
 * The full config is carried in the URL: GET /api/wallpaper?c=<base64url>.
 * Nothing is stored server-side, so this works on Vercel and gives every
 * generated wallpaper its own unique URL. It renders fresh on every request,
 * so the current-day progress is always up to date.
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { DEFAULT_CONFIG, sanitizeConfig } from '@/lib/config-defaults';
import { decodeConfig } from '@/lib/config-url';
import { getDateInTimezone } from '@/lib/calcs';
import type { LocalConfig } from '@/lib/types';
import LifeView from './life-view-enhanced';
import YearView from './year-view-enhanced';

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

    // Always fetch a fresh render (no caching) so the current-day dot is current.
    return new Response(imageResponse.body, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating wallpaper:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response('Internal server error: ' + message, { status: 500 });
  }
}
