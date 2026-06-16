/**
 * DeviceSelector Component
 * Minimalist Redesign
 */

'use client';

import { useState, useMemo } from 'react';
import { getAllBrands, getDevicesByBrand } from '@/lib/devices';
import { DeviceModel } from '@/lib/types';

interface DeviceSelectorProps {
  selectedModel: string;
  onSelect: (device: DeviceModel) => void;
}

export default function DeviceSelector({ selectedModel, onSelect }: DeviceSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'iPhone' | 'Android' | ''>('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  const brands = useMemo(() => {
    const allBrands = getAllBrands();
    if (selectedPlatform === 'iPhone') {
      return allBrands.filter(brand => brand === 'Apple');
    } else if (selectedPlatform === 'Android') {
      return allBrands.filter(brand => brand !== 'Apple');
    }
    return allBrands;
  }, [selectedPlatform]);

  const handleDeviceSelect = (device: DeviceModel) => {
    onSelect(device);
    setSelectedBrand('');
  };

  const handleCustomDevice = () => {
    const width = parseInt(customWidth);
    const height = parseInt(customHeight);

    if (!width || !height) return;

    onSelect({
      brand: 'Custom',
      model: `Custom (${width}×${height})`,
      width,
      height,
    });
    setSelectedBrand('');
  };

  if (selectedModel) {
    return (
      <div className="group relative">
        <label className="text-xs uppercase tracking-widest text-neutral-500 mb-1 block">Device</label>
        <div className="flex items-center justify-between py-2 border-b border-white/20 group-hover:border-white/40 transition-colors">
          <span className="text-white font-light">{selectedModel}</span>
          <button
            onClick={() => {
              onSelect({} as DeviceModel);
              setSelectedPlatform('');
              setSelectedBrand('');
            }}
            className="text-xs text-neutral-500 hover:text-white uppercase tracking-wider"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  if (selectedBrand === 'Custom') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-neutral-500">Custom Resolution</label>
          <button onClick={() => {
            setSelectedBrand('');
          }} className="text-xs text-neutral-500 hover:text-white">Back</button>
        </div>
        <div className="flex gap-4">
          <input
            type="number"
            placeholder="Width"
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            className="input-minimal text-white placeholder:text-neutral-700"
          />
          <input
            type="number"
            placeholder="Height"
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value)}
            className="input-minimal text-white placeholder:text-neutral-700"
          />
        </div>
        <button
          onClick={handleCustomDevice}
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white text-xs uppercase tracking-widest transition-colors"
        >
          Set Dimensions
        </button>
      </div>
    );
  }

  if (selectedBrand) {
    const devices = getDevicesByBrand(selectedBrand);
    return (
      <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between mb-4">
          <label className="text-xs uppercase tracking-widest text-neutral-500">{selectedBrand} Models</label>
          <button onClick={() => {
            setSelectedBrand('');
            // For iPhone, go back to platform selection; for Android, stay on brand selection
            if (selectedPlatform === 'iPhone') {
              setSelectedPlatform('');
            }
          }} className="text-xs text-neutral-500 hover:text-white">Back</button>
        </div>
        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
          {devices.map((device) => (
            <button
              key={device.model}
              onClick={() => handleDeviceSelect(device)}
              className="w-full text-left py-2 px-3 text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors rounded"
            >
              {device.model}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Platform selection (first step)
  if (!selectedPlatform) {
    return (
      <div className="space-y-2 animate-in fade-in duration-300">
        <label className="text-xs uppercase tracking-widest text-neutral-500 mb-2 block">Select Platform</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setSelectedPlatform('iPhone');
              setSelectedBrand('Apple'); // Auto-select Apple for iPhone
            }}
            className="py-3 px-4 text-left text-sm text-neutral-300 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <span>Apple</span>
          </button>
          <button
            onClick={() => setSelectedPlatform('Android')}
            className="py-3 px-4 text-left text-sm text-neutral-300 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.55 10.79 3.03 13.17 3 15.86h18c-.03-2.69-1.55-5.07-3.4-6.38zM10.5 14c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75zm3 0c-.41 0-.75-.34-.75-.75s.34-.75.75-.75.75.34.75.75-.34.75-.75.75z"/>
            </svg>
            <span>Android</span>
          </button>
        </div>
      </div>
    );
  }

  // Brand selection (only for Android)
  if (selectedPlatform === 'Android' && !selectedBrand) {
    return (
      <div className="space-y-2 animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-widest text-neutral-500">Select Brand</label>
          <button onClick={() => setSelectedPlatform('')} className="text-xs text-neutral-500 hover:text-white">Back</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {brands.map((brand) => (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand)}
              className="py-3 px-4 text-left text-sm text-neutral-300 border border-white/5 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              {brand}
            </button>
          ))}
          <button
            onClick={() => setSelectedBrand('Custom')}
            className="py-3 px-4 text-left text-sm text-neutral-500 border border-dashed border-neutral-800 hover:border-neutral-600 hover:text-neutral-300 transition-all"
          >
            Custom...
          </button>
        </div>
      </div>
    );
  }

  // This should never be reached but keeps TypeScript happy
  return null;
}
