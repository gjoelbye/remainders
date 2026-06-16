/**
 * Wallpaper editor (home page).
 *
 * Settings on the left, a live preview on the right. The config is kept in
 * localStorage and encoded into a stateless wallpaper URL (/api/wallpaper?c=…)
 * that you copy to your phone — no server storage, Vercel-friendly. No auth.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { DeviceModel, LocalConfig } from '@/lib/types';
import { DEFAULT_CONFIG, sanitizeConfig } from '@/lib/config-defaults';
import { encodeConfig } from '@/lib/config-url';
import ViewModeToggle from '@/components/ViewModeToggle';
import BirthDateInput from '@/components/BirthDateInput';
import DeviceSelector from '@/components/DeviceSelector';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import TextElementsEditor from '@/components/TextElementsEditor';
import { PRESET_THEMES, getThemeByName } from '@/lib/themes';

const WALLPAPER_PATH = '/api/wallpaper';
const STORAGE_KEY = 'wallpaper-config';
const PREVIEW_DEBOUNCE_MS = 500;

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  // Core config (mirrors LocalConfig, held as individual fields)
  const [viewMode, setViewMode] = useState(DEFAULT_CONFIG.viewMode);
  const [birthDate, setBirthDate] = useState(DEFAULT_CONFIG.birthDate);
  const [device, setDevice] = useState<DeviceModel>({
    brand: DEFAULT_CONFIG.device.brand,
    model: DEFAULT_CONFIG.device.modelName,
    width: DEFAULT_CONFIG.device.width,
    height: DEFAULT_CONFIG.device.height,
  });
  const [isMondayFirst, setIsMondayFirst] = useState(DEFAULT_CONFIG.isMondayFirst);
  const [yearViewLayout, setYearViewLayout] = useState(DEFAULT_CONFIG.yearViewLayout);
  const [daysLayoutMode, setDaysLayoutMode] = useState(DEFAULT_CONFIG.daysLayoutMode);
  const [timezone, setTimezone] = useState(DEFAULT_CONFIG.timezone);

  const [selectedTheme, setSelectedTheme] = useState('Dark Default');
  const [colors, setColors] = useState(DEFAULT_CONFIG.colors);
  const [statsVisible, setStatsVisible] = useState(DEFAULT_CONFIG.typography.statsVisible);
  const [textElements, setTextElements] = useState(DEFAULT_CONFIG.textElements);

  const [lifeExpectancyYears, setLifeExpectancyYears] = useState(DEFAULT_CONFIG.lifeExpectancyYears);
  const [dotStyle, setDotStyle] = useState(DEFAULT_CONFIG.dotStyle);
  const [background, setBackground] = useState(DEFAULT_CONFIG.background);
  const [lifeGrouping, setLifeGrouping] = useState(DEFAULT_CONFIG.lifeGrouping);
  const [daysMonthGrouping, setDaysMonthGrouping] = useState(DEFAULT_CONFIG.daysMonthGrouping);

  // Fields with no UI control (kept at defaults, round-tripped)
  const [typography, setTypography] = useState(DEFAULT_CONFIG.typography);
  const [layout, setLayout] = useState(DEFAULT_CONFIG.layout);
  const [backgroundImage, setBackgroundImage] = useState(DEFAULT_CONFIG.backgroundImage);

  // UI state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConfigComplete = viewMode === 'year' ? true : Boolean(birthDate);

  const buildConfig = (): LocalConfig => ({
    birthDate,
    viewMode,
    device: { brand: device.brand, modelName: device.model, width: device.width, height: device.height },
    colors,
    typography: { ...typography, statsVisible },
    textElements,
    layout,
    isMondayFirst,
    yearViewLayout,
    daysLayoutMode,
    timezone,
    lifeExpectancyYears,
    dotStyle,
    background,
    lifeGrouping,
    daysMonthGrouping,
    ...(backgroundImage ? { backgroundImage } : {}),
  });

  const applyConfig = (cfg: LocalConfig) => {
    setViewMode(cfg.viewMode);
    setBirthDate(cfg.birthDate);
    setDevice({ brand: cfg.device.brand, model: cfg.device.modelName, width: cfg.device.width, height: cfg.device.height });
    setIsMondayFirst(cfg.isMondayFirst);
    setYearViewLayout(cfg.yearViewLayout);
    setDaysLayoutMode(cfg.daysLayoutMode);
    setTimezone(cfg.timezone);
    setColors(cfg.colors);
    const matching = PRESET_THEMES.find((t) => JSON.stringify(t.colors) === JSON.stringify(cfg.colors));
    setSelectedTheme(matching?.name || 'Custom');
    setStatsVisible(cfg.typography.statsVisible);
    setTypography(cfg.typography);
    setLayout(cfg.layout);
    setTextElements(cfg.textElements);
    setLifeExpectancyYears(cfg.lifeExpectancyYears);
    setDotStyle(cfg.dotStyle);
    setBackground(cfg.background);
    setLifeGrouping(cfg.lifeGrouping);
    setDaysMonthGrouping(cfg.daysMonthGrouping);
    setBackgroundImage(cfg.backgroundImage);
  };

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) applyConfig(sanitizeConfig(JSON.parse(raw)));
    } catch {
      /* keep defaults */
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage + regenerate the stateless wallpaper URL (debounced).
  useEffect(() => {
    if (!loaded) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cfg = buildConfig();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      } catch {
        /* ignore storage quota errors */
      }
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setWallpaperUrl(`${origin}${WALLPAPER_PATH}?c=${encodeConfig(cfg)}`);
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loaded, viewMode, birthDate, device, isMondayFirst, yearViewLayout, daysLayoutMode, timezone,
    colors, statsVisible, textElements, lifeExpectancyYears, dotStyle, background, lifeGrouping, daysMonthGrouping,
  ]);

  const handleThemeChange = (name: string) => {
    setSelectedTheme(name);
    if (name !== 'Custom') {
      const theme = getThemeByName(name);
      if (theme) setColors(theme.colors);
    }
  };

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setSelectedTheme('Custom');
  };

  // Background: Solid / Gradient + direction presets
  const isGradient = background.mode !== 'solid';
  const activeDir = background.mode === 'radial' ? 'radial' : background.angle === 90 ? 'horizontal' : background.angle === 135 ? 'diagonal' : 'vertical';
  const setSolid = () => setBackground((p) => ({ ...p, mode: 'solid' }));
  const setGradient = () => setBackground((p) => (p.mode === 'solid' ? { ...p, mode: 'linear', angle: 180 } : p));
  const setDirection = (dir: 'vertical' | 'horizontal' | 'diagonal' | 'radial') => {
    if (dir === 'radial') setBackground((p) => ({ ...p, mode: 'radial' }));
    else setBackground((p) => ({ ...p, mode: 'linear', angle: dir === 'horizontal' ? 90 : dir === 'diagonal' ? 135 : 180 }));
  };

  const handleExportConfig = () => {
    const blob = new Blob([JSON.stringify(buildConfig(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wallpaper-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        applyConfig(sanitizeConfig(JSON.parse(e.target?.result as string)));
        setSaveMessage('✓ Imported');
        setTimeout(() => setSaveMessage(''), 1500);
      } catch {
        setSaveMessage('✗ Invalid config file');
        setTimeout(() => setSaveMessage(''), 2500);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    applyConfig({ ...DEFAULT_CONFIG, birthDate });
    setSelectedTheme('Dark Default');
    setShowResetConfirm(false);
    setSaveMessage('✓ Reset to defaults');
    setTimeout(() => setSaveMessage(''), 1500);
  };

  const copyUrl = async () => {
    if (!wallpaperUrl) return;
    try {
      await navigator.clipboard.writeText(wallpaperUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  // Preview sized to device aspect ratio
  const previewH = 460;
  const previewW = Math.round(previewH * (device.width / device.height));

  const card = 'p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4';
  const sectionTitle = 'text-xs uppercase tracking-widest text-neutral-400';
  const lbl = 'text-xs uppercase tracking-widest text-neutral-500';
  const segBtn = (active: boolean) =>
    `flex-1 py-2.5 text-xs uppercase tracking-widest transition-colors ${active ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <header className="border-b border-neutral-800 px-5 py-4 flex items-center sticky top-0 bg-[#1a1a1a] z-20">
        <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">Memento Mori</p>
      </header>

      <div className="mx-auto max-w-6xl p-4 lg:grid lg:grid-cols-[1fr_minmax(0,400px)] lg:gap-8 lg:items-start">
        {/* Preview (right on desktop, top on mobile) */}
        <aside className="lg:order-2 lg:sticky lg:top-[73px] mb-6 lg:mb-0">
          <div className={card}>
            <div className={`${sectionTitle} text-center`}>Live Preview</div>
            <div className="flex justify-center">
              <div
                className="relative bg-black rounded overflow-hidden border border-neutral-800"
                style={{ width: `${previewW}px`, height: `${previewH}px` }}
              >
                {loaded && isConfigComplete && wallpaperUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={wallpaperUrl}
                    src={wallpaperUrl}
                    alt="Wallpaper preview"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600 text-center px-4">
                    Enter your birth date to preview Life View
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className={`${lbl} mb-2`}>Your wallpaper URL — copy this to your phone</div>
              <code className="block text-xs text-white font-mono whitespace-nowrap overflow-x-auto bg-black/40 rounded px-2 py-1.5">
                {wallpaperUrl || '…'}
              </code>
            </div>
            <div className="flex gap-2">
              <button onClick={copyUrl} disabled={!wallpaperUrl} className="flex-1 py-2 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors text-xs uppercase tracking-widest">
                {copied ? 'Copied' : 'Copy URL'}
              </button>
              <a href={wallpaperUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest text-center">
                Open
              </a>
            </div>
          </div>
        </aside>

        {/* Settings (left) */}
        <main className="lg:order-1 space-y-6">
          {/* View */}
          <div className={card}>
            <h2 className={sectionTitle}>View</h2>
            <ViewModeToggle selectedMode={viewMode} onChange={setViewMode} />

            {viewMode === 'life' && (
              <>
                <BirthDateInput value={birthDate} onChange={setBirthDate} />

                <div className="space-y-2">
                  <label className={lbl}>Life Expectancy: {lifeExpectancyYears} years</label>
                  <input type="range" min="40" max="120" step="1" value={lifeExpectancyYears} onChange={(e) => setLifeExpectancyYears(parseInt(e.target.value))} className="w-full" />
                </div>

                <div className="space-y-2">
                  <label className={lbl}>Layout</label>
                  <div className="flex gap-2">
                    <button onClick={() => setLifeGrouping((p) => ({ ...p, enabled: false }))} className={segBtn(!lifeGrouping.enabled)}>Continuous</button>
                    <button onClick={() => setLifeGrouping((p) => ({ ...p, enabled: true }))} className={segBtn(lifeGrouping.enabled)}>Year blocks</button>
                  </div>
                </div>

                {lifeGrouping.enabled && (
                  <>
                    <div className="space-y-2">
                      <label className={lbl}>Block shape</label>
                      <div className="flex gap-2">
                        <button onClick={() => setLifeGrouping((p) => ({ ...p, blockShape: 'square' }))} className={segBtn(lifeGrouping.blockShape === 'square')}>Square</button>
                        <button onClick={() => setLifeGrouping((p) => ({ ...p, blockShape: 'tall' }))} className={segBtn(lifeGrouping.blockShape === 'tall')}>4×13</button>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={lifeGrouping.decadeLabels} onChange={(e) => setLifeGrouping((p) => ({ ...p, decadeLabels: e.target.checked }))} className="w-4 h-4" />
                      <span className={lbl}>Show decade labels</span>
                    </label>
                  </>
                )}
              </>
            )}

            {viewMode === 'year' && (
              <>
                <div className="space-y-2">
                  <label className={lbl}>Year Layout</label>
                  <div className="flex gap-2">
                    <button onClick={() => setYearViewLayout('months')} className={segBtn(yearViewLayout === 'months')}>Months</button>
                    <button onClick={() => setYearViewLayout('days')} className={segBtn(yearViewLayout === 'days')}>Days</button>
                  </div>
                </div>

                {yearViewLayout === 'days' && (
                  <>
                    <div className="space-y-2">
                      <label className={lbl}>Days Mode</label>
                      <div className="flex gap-2">
                        <button onClick={() => setDaysLayoutMode('continuous')} className={segBtn(daysLayoutMode === 'continuous')}>Continuous</button>
                        <button onClick={() => setDaysLayoutMode('calendar')} className={segBtn(daysLayoutMode === 'calendar')}>Calendar</button>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={daysMonthGrouping} onChange={(e) => setDaysMonthGrouping(e.target.checked)} className="w-4 h-4" />
                      <span className={lbl}>Group days into months</span>
                    </label>
                  </>
                )}

                {(yearViewLayout === 'months' || daysLayoutMode === 'calendar') && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={isMondayFirst} onChange={(e) => setIsMondayFirst(e.target.checked)} className="w-4 h-4" />
                    <span className={lbl}>Start week on Monday</span>
                  </label>
                )}
              </>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={statsVisible} onChange={(e) => setStatsVisible(e.target.checked)} className="w-4 h-4" />
              <span className={lbl}>Show stats footer</span>
            </label>
          </div>

          {/* Device */}
          <div className={card}>
            <h2 className={sectionTitle}>Device</h2>
            <DeviceSelector selectedModel={device.model} onSelect={setDevice} />
            <div className="space-y-2">
              <label className={lbl}>Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none text-sm">
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="America/Chicago">Chicago (GMT-6)</option>
                <option value="America/Denver">Denver (GMT-7)</option>
                <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="Europe/London">London (GMT+0)</option>
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="Europe/Berlin">Berlin (GMT+1)</option>
                <option value="Europe/Copenhagen">Copenhagen (GMT+1)</option>
                <option value="Europe/Moscow">Moscow (GMT+3)</option>
                <option value="Asia/Dubai">Dubai (GMT+4)</option>
                <option value="Asia/Kolkata">India (GMT+5:30)</option>
                <option value="Asia/Singapore">Singapore (GMT+8)</option>
                <option value="Asia/Shanghai">Shanghai (GMT+8)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
                <option value="Australia/Sydney">Sydney (GMT+11)</option>
                <option value="Pacific/Auckland">Auckland (GMT+13)</option>
              </select>
            </div>
          </div>

          {/* Style */}
          <div className={card}>
            <h2 className={sectionTitle}>Style</h2>

            <div className="space-y-2">
              <label className={lbl}>Theme</label>
              <select value={selectedTheme} onChange={(e) => handleThemeChange(e.target.value)} className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none">
                {PRESET_THEMES.map((theme) => (
                  <option key={theme.name} value={theme.name}>{theme.name}</option>
                ))}
                <option value="Custom">Custom</option>
              </select>
            </div>

            {selectedTheme === 'Custom' && (
              <div className="grid grid-cols-2 gap-3">
                {([['background', 'Background'], ['text', 'Text'], ['past', 'Past'], ['current', 'Current'], ['future', 'Future']] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5">
                    <label className={lbl}>{label}</label>
                    <ThemeColorPicker selectedColor={colors[key]} onChange={(c: string) => handleColorChange(key, c)} />
                  </div>
                ))}
              </div>
            )}

            {/* Background fill */}
            <div className="space-y-2">
              <label className={lbl}>Background</label>
              <div className="flex gap-2">
                <button onClick={setSolid} className={segBtn(!isGradient)}>Solid</button>
                <button onClick={setGradient} className={segBtn(isGradient)}>Gradient</button>
              </div>
            </div>
            {isGradient && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={lbl}>From</label>
                    <ThemeColorPicker selectedColor={background.from} onChange={(c: string) => setBackground((p) => ({ ...p, from: c }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={lbl}>To</label>
                    <ThemeColorPicker selectedColor={background.to} onChange={(c: string) => setBackground((p) => ({ ...p, to: c }))} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {([['vertical', '↓'], ['diagonal', '↘'], ['horizontal', '→'], ['radial', '◉']] as const).map(([dir, icon]) => (
                    <button key={dir} onClick={() => setDirection(dir)} className={`py-2 text-base transition-colors ${activeDir === dir ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`} title={dir}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dots */}
            <div className="space-y-2">
              <label className={lbl}>Dot Shape</label>
              <select value={dotStyle.shape} onChange={(e) => setDotStyle((p) => ({ ...p, shape: e.target.value as typeof p.shape }))} className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none">
                <option value="circle">Circle</option>
                <option value="square">Square</option>
                <option value="rounded">Rounded square</option>
                <option value="diamond">Diamond</option>
                <option value="ring">Ring (outline)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className={lbl}>Fade future dots: {(dotStyle.futureOpacity * 100).toFixed(0)}%</label>
              <input type="range" min="0.1" max="1" step="0.05" value={dotStyle.futureOpacity} onChange={(e) => setDotStyle((p) => ({ ...p, futureOpacity: parseFloat(e.target.value) }))} className="w-full" />
            </div>
            {dotStyle.shape === 'ring' && (
              <div className="space-y-2">
                <label className={lbl}>Ring thickness</label>
                <div className="flex gap-2">
                  {([['Thin', 1.5], ['Medium', 2.5], ['Thick', 4]] as const).map(([label, w]) => (
                    <button key={label} onClick={() => setDotStyle((p) => ({ ...p, ringWidth: w }))} className={segBtn(dotStyle.ringWidth === w)}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Text */}
          <div className={card}>
            <h2 className={sectionTitle}>Custom Text</h2>
            <TextElementsEditor textElements={textElements} onChange={setTextElements} />
          </div>

          {/* Config */}
          <div className={card}>
            <h2 className={sectionTitle}>Config</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExportConfig} className="py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest">Export</button>
              <label className="py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest text-center cursor-pointer">
                Import
                <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </label>
            </div>
            <button onClick={() => setShowResetConfirm(true)} className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 hover:text-red-300 transition-colors text-xs uppercase tracking-widest">
              Reset All
            </button>
          </div>
        </main>
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-medium text-white">Reset all settings?</h3>
            <p className="text-sm text-neutral-400">Resets colors, style, and customization to defaults. Your birth date is kept.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-3 bg-red-600 hover:bg-red-700 transition-colors text-xs uppercase tracking-widest text-white">Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* Transient notice (import / reset) */}
      {saveMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${saveMessage.startsWith('✓') ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={saveMessage.startsWith('✓') ? 'text-green-500' : 'text-red-500'}>{saveMessage}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
