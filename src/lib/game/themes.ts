// Theme System for UI customization
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
    // R88: the official AfterTen Karaoke look — derived from the brand logo
    // (neon clock: cyan ring #4fc3f7, glow #7dd8f5, purple face accents
    // #7c4dc4, deep night navy backdrop #0d1b2e, silver-white lettering).
    id: 'afterten',
    name: 'AfterTen',
    description: 'Official brand look — neon cyan & purple on deep night navy',
    colors: {
      primary: '#4fc3f7',
      secondary: '#7c4dc4',
      accent: '#7dd8f5',
      background: '#0d1b2e',
      backgroundSecondary: '#16263f',
      text: '#f2f6fa',
      textSecondary: '#8fa8c4',
      success: '#3ddc97',
      warning: '#ffc857',
      error: '#ff5c7a',
      noteDefault: '#4fc3f7',
      noteGolden: '#ffd700',
      noteBonus: '#9b6bff',
      pitchIndicator: '#7dd8f5',
      combo: '#7c4dc4',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['pop', 'electronic', 'disco', 'rock'],
    mood: 'party',
    particleEffect: 'sparkle',
    backgroundAnimation: 'stars',
  },
  {
    // R91: brand color variant "Red" — extracted from the user's logo variant
    // (neon red wordmark #e05241, amber-gold ring glow #f0a63c, crimson
    // accents #b43c6c, dark plum backdrop #170d18, warm white lettering).
    id: 'afterten-red',
    name: 'AfterTen Red',
    description: 'Brand variant — crimson red & amber gold on dark plum',
    colors: {
      primary: '#e05241',
      secondary: '#f0a63c',
      accent: '#ff8a5c',
      background: '#170d18',
      backgroundSecondary: '#241527',
      text: '#f7ece4',
      textSecondary: '#c09890',
      success: '#3ddc97',
      warning: '#ffc857',
      error: '#ff5c7a',
      noteDefault: '#e05241',
      noteGolden: '#ffd700',
      noteBonus: '#b43c6c',
      pitchIndicator: '#ff8a5c',
      combo: '#f0a63c',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['rock', 'metal', 'punk'],
    mood: 'intense',
    particleEffect: 'pulse',
    backgroundAnimation: 'gradient',
  },
  {
    // R91: brand color variant "Green" — emerald/mint neon #3ee8a8 with golden
    // clock-face accents #e8c34a on deep emerald night #0c1a16.
    id: 'afterten-green',
    name: 'AfterTen Green',
    description: 'Brand variant — mint green & gold on deep emerald night',
    colors: {
      primary: '#3ee8a8',
      secondary: '#e8c34a',
      accent: '#78f0c0',
      background: '#0c1a16',
      backgroundSecondary: '#142a20',
      text: '#f0f6ee',
      textSecondary: '#8fb8a4',
      success: '#a3e635',
      warning: '#ffc857',
      error: '#ff5c7a',
      noteDefault: '#3ee8a8',
      noteGolden: '#ffd700',
      noteBonus: '#f0d060',
      pitchIndicator: '#78f0c0',
      combo: '#e8c34a',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['jazz', 'classical', 'r&b'],
    mood: 'calm',
    particleEffect: 'wave',
    backgroundAnimation: 'waves',
  },
  {
    // R91: brand color variant "Purple" — royal violet #a86bf0, deep indigo
    // face #5a2fc0, magenta glow accents #e858c8 on deep violet night #100b26.
    id: 'afterten-purple',
    name: 'AfterTen Purple',
    description: 'Brand variant — royal purple & magenta glow on deep violet',
    colors: {
      primary: '#a86bf0',
      secondary: '#5a2fc0',
      accent: '#d090f5',
      background: '#100b26',
      backgroundSecondary: '#1a1240',
      text: '#f0ecfa',
      textSecondary: '#a496cc',
      success: '#3ddc97',
      warning: '#ffc857',
      error: '#ff5c7a',
      noteDefault: '#a86bf0',
      noteGolden: '#ffd700',
      noteBonus: '#e858c8',
      pitchIndicator: '#d090f5',
      combo: '#5a2fc0',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['k-pop', 'pop', 'disco'],
    mood: 'party',
    particleEffect: 'sparkle',
    backgroundAnimation: 'stars',
  },
  {
    // R91: brand color variant "Orange" — neon orange #ff6a2e with amber
    // clock-face accents #ffb54d on warm charcoal #0e0c10.
    id: 'afterten-orange',
    name: 'AfterTen Orange',
    description: 'Brand variant — neon orange & amber on warm charcoal',
    colors: {
      primary: '#ff6a2e',
      secondary: '#ffb54d',
      accent: '#ff9455',
      background: '#0e0c10',
      backgroundSecondary: '#1c1610',
      text: '#f5ecdc',
      textSecondary: '#c4a084',
      success: '#3ddc97',
      warning: '#ffc857',
      error: '#ff5c7a',
      noteDefault: '#ff6a2e',
      noteGolden: '#ffd700',
      noteBonus: '#f5c242',
      pitchIndicator: '#ff9455',
      combo: '#c84a10',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['rock', 'latin', 'pop'],
    mood: 'energetic',
    particleEffect: 'fire',
    backgroundAnimation: 'gradient',
  },
  {
    // R91: brand color variant "Pink" — hot pink #ff3df0 with electric cyan
    // #4de8f4 (the classic brand duo) on midnight navy #0e1220.
    id: 'afterten-pink',
    name: 'AfterTen Pink',
    description: 'Brand variant — hot pink & electric cyan on midnight navy',
    colors: {
      primary: '#ff3df0',
      secondary: '#9b6dff',
      accent: '#4de8f4',
      background: '#0e1220',
      backgroundSecondary: '#1a1e34',
      text: '#f5f7fa',
      textSecondary: '#a8b4d8',
      success: '#3ddc97',
      warning: '#ffc857',
      error: '#ff5c5c',
      noteDefault: '#ff3df0',
      noteGolden: '#ffd700',
      noteBonus: '#9b6dff',
      pitchIndicator: '#4de8f4',
      combo: '#9b6dff',
    },
    noteStyle: 'music-note',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 14,
    genres: ['pop', 'disco', 'r&b'],
    mood: 'romantic',
    particleEffect: 'sparkle',
    backgroundAnimation: 'particles',
  },
];

/**
 * R88: the default theme applied when the user has no stored preference —
 * the official AfterTen brand look (index 0 of THEMES).
 */
export const DEFAULT_THEME: Theme = THEMES[0];

/**
 * Idempotence guard: the theme id applied last in this session.
 * applyTheme() dispatches the `themeChanged` event, and use-app-effects
 * listens to it by re-applying the stored theme — without this guard that
 * echo caused infinite recursion (applyTheme → event → applyTheme → …)
 * as soon as a theme was picked in the settings while the listener was
 * active. Re-applying the SAME id is always a no-op instead.
 */
let lastAppliedThemeId: string | null = null;

export function applyTheme(theme: Theme): void {
  // Safety check - ensure theme is defined
  if (!theme || !theme.colors) {
    // eslint-disable-next-line no-console
    console.warn('[applyTheme] Invalid theme provided, using default');
    theme = DEFAULT_THEME; // Fallback to default theme
  }

  // Idempotence: same id already active → nothing to do (and no event —
  // this is what terminates the themeChanged echo loop).
  if (theme.id === lastAppliedThemeId) return;
  lastAppliedThemeId = theme.id;
  
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
