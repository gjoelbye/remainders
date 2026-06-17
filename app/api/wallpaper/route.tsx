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
import { composeWallpaper, maskKeyFor } from '@/lib/wallpaper-compose';
import { toP3Hex, hexToRgb, rgbToHex } from '@/lib/p3';
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

    // Cache at the CDN until the next local midnight: only the current-day dot
    // changes day-to-day, so re-rendering more often is wasteful.
    const secsToday = currentDate.getHours() * 3600 + currentDate.getMinutes() * 60 + currentDate.getSeconds();
    const secsToMidnight = Math.max(60, 86400 - secsToday);
    const pngHeaders = {
      'Content-Type': 'image/png',
      'Cache-Control': `public, max-age=0, s-maxage=${secsToMidnight}, stale-while-revalidate=86400`,
    };

    // True-P3 + bloom path: render the life-grid as a transparent P3 overlay,
    // then composite it over a pre-baked Display-P3 + true-bloom skyline base
    // (lib/wallpaper-compose) — all in the Node runtime. Desktop (landscape)
    // always uses it; portrait (iPhone) uses it for a solid background (gradients
    // / background images fall back to the original single-pass renderer).
    const desktop = width > height;
    const maskKey = config.viewMode === 'life' ? maskKeyFor(width, height) : null;
    const canCompose = !!maskKey && (desktop || (config.background.mode === 'solid' && !config.backgroundImage));
    if (maskKey && canCompose) {
      const p3 = (c: string) => toP3Hex(c);
      const overlay = LifeView({
        width,
        height,
        birthDate: config.birthDate,
        colors: {
          background: p3(config.colors.background),
          past: p3(config.colors.past),
          current: p3(config.colors.current),
          future: p3(config.colors.future),
          text: p3(config.colors.text),
        },
        typography: config.typography,
        layout: config.layout,
        textElements: config.textElements,
        milestones: config.milestones,
        currentDate,
        dotStyle: config.dotStyle,
        lifeExpectancyYears: config.lifeExpectancyYears,
        lifeGrouping: config.lifeGrouping,
        widgetSpace: config.widgetSpace,
        gridScale: desktop ? 1 : config.gridScale, // desktop fits to its area
        gridOffsetY: config.gridOffsetY,
        footerOffsetY: config.footerOffsetY,
        gridCols: desktop ? (config.gridCols > 0 ? config.gridCols : 11) : config.gridCols,
        overlay: true,
        desktop,
        skyline: false,
      });
      const overlayPng = Buffer.from(await new ImageResponse(overlay, { width, height }).arrayBuffer());

      let silhouette: string;
      let offsetY = 0;
      if (desktop) {
        // Night silhouette: a touch darker than the sky.
        const bg = hexToRgb(config.colors.background);
        silhouette = rgbToHex({ r: bg.r * 0.72, g: bg.g * 0.72, b: bg.b * 0.72 });
      } else {
        // iPhone keeps its lighter tint; nudge for the chosen ground line
        // (masks are baked at baseline 0.24).
        silhouette = config.colors.future;
        offsetY = Math.round((config.skylineBaseline - 0.24) * height);
      }

      const png = await composeWallpaper({
        device: maskKey,
        background: config.colors.background,
        silhouette,
        skyline: config.skyline,
        lights: config.skylineLights,
        flag: config.skyline,
        gridPng: overlayPng,
        offsetY,
      });
      return new Response(new Uint8Array(png), { status: 200, headers: pngHeaders });
    }

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

    // Every fetch within the day is served from CDN cache (fast, no re-render).
    return new Response(imageResponse.body, { status: 200, headers: pngHeaders });
  } catch (error) {
    console.error('Error generating wallpaper:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response('Internal server error: ' + message, { status: 500 });
  }
}
