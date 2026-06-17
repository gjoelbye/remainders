import fs from 'fs';
import { ImageResponse } from 'next/og';
import LifeView from '../app/api/wallpaper/life-view-enhanced';
import { composeWallpaper } from '../lib/wallpaper-compose';
import { toP3Hex } from '../lib/p3';

const W = 3024, H = 1964;

async function renderGrid(gridCols: number): Promise<Buffer> {
  const el = LifeView({
    width: W,
    height: H,
    birthDate: '2000-04-22',
    colors: {
      background: toP3Hex('#2E3440'),
      past: toP3Hex('#ECEFF4'),
      current: toP3Hex('#FF3B30'),
      future: toP3Hex('#4C566A'),
      text: toP3Hex('#D8DEE9'),
    },
    typography: { fontFamily: 'monospace', fontSize: 0.02, statsVisible: true },
    layout: { topPadding: 0.25, bottomPadding: 0.15, sidePadding: 0.18, dotSpacing: 0.7 },
    milestones: [],
    currentDate: new Date(),
    dotStyle: { futureOpacity: 1, ringWidth: 3 },
    lifeExpectancyYears: 84,
    lifeGrouping: { yearGap: 0.5, decadeGap: 1.5, decadeLabels: true },
    gridScale: 1.0,
    gridOffsetY: 0,
    footerOffsetY: 0,
    gridCols,
    overlay: true,
    desktop: true,
    skyline: false,
  });
  const resp = new ImageResponse(el, { width: W, height: H });
  return Buffer.from(await resp.arrayBuffer());
}

(async () => {
  for (const cols of [14, 11]) {
    const grid = await renderGrid(cols);
    const png = await composeWallpaper({
      device: 'macbook-14',
      background: '#2E3440',
      silhouette: '#222731',
      skyline: true,
      lights: true,
      flag: true,
      gridPng: grid,
      offsetY: 0,
    });
    const out = `/tmp/compose-mac-${cols}.png`;
    fs.writeFileSync(out, png);
    console.log('wrote', out, png.length, 'bytes');
  }
})();
