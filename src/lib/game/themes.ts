// Theme System for UI customization — Jackbox Games / Comic-Book Pop-Art Style
import { StorageKeys, getItem, setItem } from '@/lib/storage';
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  error: string;
  noteDefault: string;
  noteGolden: string;
  noteBonus: string;
  pitchIndicator: string;
  combo: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  backgroundImage?: string;
  noteStyle: 'rounded' | 'sharp' | 'pill' | 'music-note' | 'star' | 'circle' | 'hexagon' | 'triangle';
  fontFamily: string;
  borderRadius: number;
  // Enhanced theme features
  genres?: string[]; // Genres this theme is recommended for
  mood?: 'energetic' | 'calm' | 'romantic' | 'intense' | 'party' | 'melancholic';
  particleEffect?: 'sparkle' | 'pulse' | 'wave' | 'rain' | 'fire' | 'snow' | 'none';
  backgroundAnimation?: 'gradient' | 'particles' | 'waves' | 'stars' | 'none';
}

export const THEMES: Theme[] = [
  {
    id: 'comic-party',
    name: 'Comic Party',
    description: 'KAPOW! The main Jackbox-style theme — bold, chunky, comic-book pop-art madness',
    colors: {
      primary: '#F939A3',
      secondary: '#00F3B2',
      accent: '#FDE601',
      background: '#1a0a2e',
      backgroundSecondary: '#2a1a3e',
      text: '#FDFEFD',
      textSecondary: '#c0b8d0',
      success: '#00F3B2',
      warning: '#FDE601',
      error: '#FC6B48',
      noteDefault: '#F939A3',
      noteGolden: '#FDE601',
      noteBonus: '#00F3B2',
      pitchIndicator: '#00F3B2',
      combo: '#FDE601',

    },
    noteStyle: 'star',
    fontFamily: 'Bangers, Impact, sans-serif',
    borderRadius: 4,
    genres: ['pop', 'rock', 'party'],
    mood: 'party',
    particleEffect: 'sparkle',
    backgroundAnimation: 'stars',
  },
  {
    id: 'psychedelic-sunset',
    name: 'Psychedelic Sunset',
    description: 'Warm psychedelic lava-lamp vibes with trippy gradients and fire particles',
    colors: {
      primary: '#FC6B48',
      secondary: '#FDE601',
      accent: '#BA279D',
      background: '#2d1b3d',
      backgroundSecondary: '#3d2b4d',
      text: '#FDFEFD',
      textSecondary: '#e8d0b0',
      success: '#00F3B2',
      warning: '#FDE601',
      error: '#FC6B48',
      noteDefault: '#FC6B48',
      noteGolden: '#FDE601',
      noteBonus: '#BA279D',
      pitchIndicator: '#00F3B2',
      combo: '#FC6B48',

    },
    noteStyle: 'hexagon',
    fontFamily: 'Comic Neue, Comic Sans MS, cursive',
    borderRadius: 8,
    genres: ['rock', 'pop', 'disco'],
    mood: 'energetic',
    particleEffect: 'fire',
    backgroundAnimation: 'gradient',
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    description: 'INSERT COIN — classic arcade glow with a comic-book twist, pixel-perfect intensity',
    colors: {
      primary: '#39ff14',
      secondary: '#F939A3',
      accent: '#00F3B2',
      background: '#0a0a0a',
      backgroundSecondary: '#1a1a2e',
      text: '#39ff14',
      textSecondary: '#80ff80',
      success: '#39ff14',
      warning: '#FDE601',
      error: '#ff0000',
      noteDefault: '#39ff14',
      noteGolden: '#FDE601',
      noteBonus: '#F939A3',
      pitchIndicator: '#00F3B2',
      combo: '#39ff14',

    },
    noteStyle: 'sharp',
    fontFamily: 'Press Start 2P, monospace',
    borderRadius: 0,
    genres: ['electronic', 'hip-hop', 'retro'],
    mood: 'intense',
    particleEffect: 'pulse',
    backgroundAnimation: 'particles',
  },
  {
    id: 'pastel-pop',
    name: 'Pastel Pop',
    description: 'Soft pastel comic style — dreamy, round, and pop with sparkle effects',
    colors: {
      primary: '#a855f7',
      secondary: '#ec4899',
      accent: '#06b6d4',
      background: '#0f0720',
      backgroundSecondary: '#1a0a3e',
      text: '#ffffff',
      textSecondary: '#ccddff',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      noteDefault: '#a855f7',
      noteGolden: '#fcd34d',
      noteBonus: '#ec4899',
      pitchIndicator: '#06b6d4',
      combo: '#ec4899',

    },
    noteStyle: 'circle',
    fontFamily: 'Nunito, rounded, sans-serif',
    borderRadius: 16,
    genres: ['k-pop', 'pop', 'ballad'],
    mood: 'romantic',
    particleEffect: 'sparkle',
    backgroundAnimation: 'stars',
  },
  {
    id: 'ocean-depths',
    name: 'Ocean Depths',
    description: 'Deep ocean blues with a comic twist — ride the wave with cool calm energy',
    colors: {
      primary: '#00d2d3',
      secondary: '#54a0ff',
      accent: '#6B2E77',
      background: '#0a1628',
      backgroundSecondary: '#162844',
      text: '#ffffff',
      textSecondary: '#88aacc',
      success: '#00d2d3',
      warning: '#FDE601',
      error: '#ee5a6f',
      noteDefault: '#54a0ff',
      noteGolden: '#FDE601',
      noteBonus: '#6B2E77',
      pitchIndicator: '#00F3B2',
      combo: '#54a0ff',

    },
    noteStyle: 'pill',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 12,
    genres: ['jazz', 'classical', 'r&b'],
    mood: 'calm',
    particleEffect: 'wave',
    backgroundAnimation: 'waves',
  },
  {
    id: 'comic-light',
    name: 'Comic Light',
    description: 'Light theme with thick comic outlines — clean cream canvas with bold pop-art punches',
    colors: {
      primary: '#F939A3',
      secondary: '#6B2E77',
      accent: '#FDE601',
      background: '#FDFEFD',
      backgroundSecondary: '#EAECDA',
      text: '#1a0a2e',
      textSecondary: '#4a3a5e',
      success: '#00F3B2',
      warning: '#FDE601',
      error: '#FC6B48',
      noteDefault: '#F939A3',
      noteGolden: '#FDE601',
      noteBonus: '#6B2E77',
      pitchIndicator: '#00F3B2',
      combo: '#F939A3',

    },
    noteStyle: 'rounded',
    fontFamily: 'Bangers, Impact, sans-serif',
    borderRadius: 4,
    genres: ['classical', 'jazz', 'country'],
    mood: 'calm',
    particleEffect: 'none',
    backgroundAnimation: 'none',
  },
];

export function applyTheme(theme: Theme): void {
  // Safety check - ensure theme is defined
  if (!theme || !theme.colors) {
    // eslint-disable-next-line no-console
    console.warn('[applyTheme] Invalid theme provided, using default');
    theme = THEMES[0]; // Fallback to default theme
  }
  
  const root = document.documentElement;
  
  // Apply CSS variables to :root for global access
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--theme-${cssVar}`, value);
  });
  
  // Apply font family
  root.style.setProperty('--theme-font', theme.fontFamily);
  
  // Apply border radius
  root.style.setProperty('--theme-radius', `${theme.borderRadius}px`);
  
  // Apply note style as CSS variable
  root.style.setProperty('--theme-note-style', theme.noteStyle);
  
  // Apply colors directly to body for immediate visual effect
  document.body.style.setProperty('--theme-primary', theme.colors.primary);
  document.body.style.setProperty('--theme-secondary', theme.colors.secondary);
  document.body.style.setProperty('--theme-background', theme.colors.background);
  document.body.style.setProperty('--theme-background-secondary', theme.colors.backgroundSecondary || theme.colors.background);
  document.body.style.setProperty('--theme-text', theme.colors.text);
  document.body.style.setProperty('--theme-text-secondary', theme.colors.textSecondary);
  document.body.style.setProperty('--theme-accent', theme.colors.accent);
  document.body.style.setProperty('--theme-success', theme.colors.success);
  document.body.style.setProperty('--theme-warning', theme.colors.warning);
  document.body.style.setProperty('--theme-error', theme.colors.error);
  document.body.style.fontFamily = theme.fontFamily;
  
  // Update background gradient on body
  const bgStyle = `linear-gradient(135deg, ${theme.colors.background} 0%, ${theme.colors.backgroundSecondary || theme.colors.background} 50%, ${theme.colors.primary}22 100%)`;
  document.body.style.background = bgStyle;
  document.body.style.color = theme.colors.text;
  document.body.style.minHeight = '100vh';
  
  // Apply to all theme-container elements
  const containers = document.querySelectorAll('.theme-container');
  containers.forEach(container => {
    (container as HTMLElement).style.background = bgStyle;
    (container as HTMLElement).style.color = theme.colors.text;
    (container as HTMLElement).style.fontFamily = theme.fontFamily;
  });
  
  // Apply to all theme-text elements (dynamic text color adaptation)
  const themeTextElements = document.querySelectorAll('.theme-text-adaptive');
  themeTextElements.forEach(el => {
    (el as HTMLElement).style.color = theme.colors.text;
  });
  
  const themeTextSecondaryElements = document.querySelectorAll('.theme-text-secondary-adaptive');
  themeTextSecondaryElements.forEach(el => {
    (el as HTMLElement).style.color = theme.colors.textSecondary;
  });
  
  // Determine if theme is light using relative luminance (WCAG formula)
  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    return [
      parseInt(clean.substring(0, 2), 16),
      parseInt(clean.substring(2, 4), 16),
      parseInt(clean.substring(4, 6), 16),
    ];
  };
  const [bgR, bgG, bgB] = hexToRgb(theme.colors.background);
  const sRGB = [bgR / 255, bgG / 255, bgB / 255].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  const bgLuminance = 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  const isLightTheme = bgLuminance > 0.4;

  // Pre-compute adaptive colors by blending theme text toward background
  // This replaces the old opacity-based approach which left white text on light bg
  const blendColor = (baseHex: string, opacity: number): string => {
    const [r, g, b] = hexToRgb(baseHex);
    const [br, bg2, bb] = hexToRgb(theme.colors.background);
    const m = (a: number, bv: number) => Math.round(a * opacity + bv * (1 - opacity));
    return `rgb(${m(r, br)}, ${m(g, bg2)}, ${m(b, bb)})`;
  };
  const blendBg = (opacity: number): string => {
    const [r, g, b] = hexToRgb(theme.colors.backgroundSecondary || theme.colors.background);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  const blendBorder = (opacity: number): string => {
    const [r, g, b] = hexToRgb(theme.colors.text);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const cTextMain = theme.colors.text;
  const cTextSec = theme.colors.textSecondary;
  // Use higher blend factors to ensure text remains readable on dark backgrounds.
  // Old values (0.4-0.8) produced nearly invisible text when textSecondary was already
  // a muted colour blended towards a near-black background.
  const cText80 = blendColor(cTextMain, 0.85);
  const cText90 = blendColor(cTextMain, 0.93);
  const cText70 = blendColor(cTextMain, 0.75);
  const cText60 = blendColor(cTextSec, 0.75);
  const cText50 = blendColor(cTextSec, 0.65);
  const cText40 = blendColor(cTextSec, 0.55);

  // Create or update dynamic theme styles
  let styleEl = document.getElementById('theme-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-dynamic-styles';
    document.head.appendChild(styleEl);
  }

  // Comprehensive GLOBAL CSS overrides — no longer scoped to .theme-container only
  styleEl.textContent = `
    /* === GLOBAL THEME TEXT OVERRIDES === */
    .text-white { color: ${cTextMain} !important; }
    .text-white\\/40 { color: ${cText40} !important; }
    .text-white\\/50 { color: ${cText50} !important; }
    .text-white\\/60 { color: ${cText60} !important; }
    .text-white\\/70 { color: ${cText70} !important; }
    .text-white\\/80 { color: ${cText80} !important; }
    .text-white\\/90 { color: ${cText90} !important; }
    .text-white\\/95 { color: ${cTextMain} !important; }

    /* === THEME ADAPTIVE UTILITY CLASSES === */
    .theme-adaptive-text { color: ${cTextMain} !important; }
    .theme-adaptive-text-secondary { color: ${cTextSec} !important; }
    .theme-adaptive-text-muted { color: ${cText60} !important; }
    .theme-adaptive-bg { background-color: ${theme.colors.background} !important; }
    .theme-adaptive-bg-secondary { background-color: ${theme.colors.backgroundSecondary || theme.colors.background} !important; }

    /* === GLOBAL BACKGROUND OVERRIDES === */
    .bg-white\\/5 { background-color: ${blendBg(0.06)} !important; }
    .bg-white\\/10 { background-color: ${blendBg(0.1)} !important; }
    .bg-white\\/20 { background-color: ${blendBg(0.2)} !important; }
    .bg-white\\/30 { background-color: ${blendBg(0.3)} !important; }
    .bg-white\\/50 { background-color: ${blendBg(0.5)} !important; }

    /* === GLOBAL BORDER OVERRIDES === */
    .border-white\\/5 { border-color: ${blendBorder(0.08)} !important; }
    .border-white\\/10 { border-color: ${blendBorder(0.12)} !important; }
    .border-white\\/20 { border-color: ${blendBorder(0.2)} !important; }
    .border-white\\/30 { border-color: ${blendBorder(0.3)} !important; }

    /* === SETTINGS PANEL === */
    .settings-theme-container,
    .theme-container,
    .theme-override {
      background-color: ${isLightTheme ? 'rgba(255,255,255,0.9)' : theme.colors.background} !important;
      color: ${cTextMain} !important;
    }
    .settings-theme-container .bg-white\\/5,
    .theme-container .bg-white\\/5 {
      background-color: ${isLightTheme ? 'rgba(0,0,0,0.04)' : blendBg(0.08)} !important;
    }

    /* === CARD BACKGROUNDS === */
    .bg-gray-900\\/80 { background-color: ${isLightTheme ? 'rgba(255,255,255,0.85)' : 'rgba(17,24,39,0.8)'} !important; }

    /* === GRADIENT TILE TEXT PRESERVATION === */
    .party-tile .tile-text-white,
    .party-tile .text-white { color: #ffffff !important; }
    .party-tile .text-white\\/80 { color: rgba(255,255,255,0.8) !important; }
    .party-tile .text-white\\/90 { color: rgba(255,255,255,0.9) !important; }
    .party-tile .text-white\\/95 { color: rgba(255,255,255,0.95) !important; }
    .party-tile .bg-white\\/20 { background-color: rgba(255,255,255,0.2) !important; }
    ${isLightTheme ? `
    /* === LIGHT THEME: override gray/slate/zinc text classes === */
    .text-gray-200, .text-slate-200, .text-zinc-200 { color: ${theme.colors.text} !important; }
    .text-gray-300, .text-slate-300, .text-zinc-300 { color: ${theme.colors.text} !important; }
    .text-gray-400, .text-slate-400, .text-zinc-400 { color: ${theme.colors.textSecondary} !important; }
    .text-gray-500, .text-slate-500, .text-zinc-500 { color: ${theme.colors.textSecondary} !important; }
    .text-gray-600, .text-slate-600, .text-zinc-600 { color: ${blendColor(theme.colors.text, 0.55)} !important; }
    /* Light theme: dark backgrounds for elements expecting dark-mode surfaces */
    .bg-slate-800, .bg-gray-800, .bg-zinc-800 { background-color: #e2e8f0 !important; }
    .bg-slate-900, .bg-gray-900 { background-color: ${theme.colors.background} !important; }
    .border-slate-600, .border-gray-600, .border-zinc-600 { border-color: #cbd5e1 !important; }
    .bg-gray-700\\/50, .bg-slate-700\\/50 { background-color: rgba(203,213,225,0.5) !important; }
    .hover\\:text-white:hover { color: ${theme.colors.text} !important; }
    .hover\\:bg-slate-700\\/50:hover { background-color: rgba(203,213,225,0.5) !important; }
    .hover\\:text-slate-300:hover { color: ${theme.colors.text} !important; }
    /* === LIGHT THEME: override shadcn CSS variables for dropdowns/popovers === */
    .dark {
      --popover: ${theme.colors.background} !important;
      --popover-foreground: ${theme.colors.text} !important;
      --accent: ${theme.colors.backgroundSecondary || theme.colors.background} !important;
      --accent-foreground: ${theme.colors.text} !important;
      --muted: ${theme.colors.backgroundSecondary || theme.colors.background} !important;
      --muted-foreground: ${theme.colors.textSecondary} !important;
      --input: ${blendBorder(0.2)} !important;
      --border: ${blendBorder(0.2)} !important;
      --ring: ${theme.colors.primary} !important;
      --primary: ${theme.colors.primary} !important;
      --primary-foreground: #ffffff !important;
      --secondary: ${theme.colors.backgroundSecondary || theme.colors.background} !important;
      --secondary-foreground: ${theme.colors.text} !important;
      --destructive: ${theme.colors.error} !important;
      --destructive-foreground: #ffffff !important;
      --card: ${theme.colors.background} !important;
      --card-foreground: ${theme.colors.text} !important;
    }
    ` : ''}
  `;
  
  // Store preference
  setItem(StorageKeys.THEME, theme.id);
  
  // Dispatch event for components to react (with safety check for SSR)
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[applyTheme] Failed to dispatch themeChanged event:', error);
    }
  }
}

export function getStoredTheme(): Theme | null {
  const storedId = getItem(StorageKeys.THEME);
  return THEMES.find(t => t.id === storedId) || null;
}
