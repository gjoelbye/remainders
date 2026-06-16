/**
 * Preset Color Themes for Wallpaper Customization
 * 
 * Provides carefully curated color schemes that users can quickly apply
 * instead of manually configuring each color value.
 */

export interface Theme {
  name: string;
  description: string;
  colors: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };
}

export const PRESET_THEMES: Theme[] = [
  {
    name: 'Dark Default',
    description: 'Classic dark theme with orange accent',
    colors: {
      background: '#1a1a1a',
      past: '#FFFFFF',
      current: '#FF6B35',
      future: '#404040',
      text: '#888888',
    },
  },
  {
    name: 'Light',
    description: 'Clean light theme with blue accent',
    colors: {
      background: '#FFFFFF',
      past: '#1a1a1a',
      current: '#2563EB',
      future: '#E5E7EB',
      text: '#6B7280',
    },
  },
  {
    name: 'Nord',
    description: 'Arctic palette with a red current marker',
    colors: {
      background: '#2E3440',
      past: '#ECEFF4',
      current: '#FF3B30',
      future: '#4C566A',
      text: '#D8DEE9',
    },
  },
  {
    name: 'Dracula',
    description: 'Dark theme with vibrant purple accent',
    colors: {
      background: '#282A36',
      past: '#F8F8F2',
      current: '#FF79C6',
      future: '#44475A',
      text: '#6272A4',
    },
  },
  {
    name: 'Solarized Dark',
    description: 'Precision colors for comfortable reading',
    colors: {
      background: '#002B36',
      past: '#FDF6E3',
      current: '#268BD2',
      future: '#073642',
      text: '#586E75',
    },
  },
  {
    name: 'Catppuccin Mocha',
    description: 'Soothing pastel theme with lavender accent',
    colors: {
      background: '#1E1E2E',
      past: '#CDD6F4',
      current: '#CBA6F7',
      future: '#45475A',
      text: '#BAC2DE',
    },
  },
];

export function getThemeByName(name: string): Theme | undefined {
  return PRESET_THEMES.find(theme => theme.name === name);
}

export const CUSTOM_THEME: Theme = {
  name: 'Custom',
  description: 'Create your own color scheme',
  colors: {
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#404040',
    text: '#888888',
  },
};
