// Theme System for UI customization
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
  starPower: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  backgroundImage?: string;
  noteStyle: 'rounded' | 'sharp' | 'pill' | 'diamond';
  fontFamily: string;
  borderRadius: number;
}

export const THEMES: Theme[] = [
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    description: 'Vibrant neon colors on dark background',
    colors: {
      primary: '#00ffff',
      secondary: '#ff00ff',
      accent: '#ffff00',
      background: '#0a0a1a',
      backgroundSecondary: '#1a1a2e',
      text: '#ffffff',
      textSecondary: '#8888aa',
      success: '#00ff88',
      warning: '#ffaa00',
      error: '#ff4466',
      noteDefault: '#00ccff',
      noteGolden: '#ffd700',
      noteBonus: '#ff66ff',
      pitchIndicator: '#00ff88',
      combo: '#ff00ff',
      starPower: '#ffd700',
    },
    noteStyle: 'rounded',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 8,
  },
  {
    id: 'retro-arcade',
    name: 'Retro Arcade',
    description: 'Classic 80s arcade aesthetic',
    colors: {
      primary: '#39ff14',
      secondary: '#ff6ec7',
      accent: '#ff00ff',
      background: '#000000',
      backgroundSecondary: '#1a0a2e',
      text: '#39ff14',
      textSecondary: '#888888',
      success: '#39ff14',
      warning: '#ffff00',
      error: '#ff0000',
      noteDefault: '#39ff14',
      noteGolden: '#ffd700',
      noteBonus: '#ff6ec7',
      pitchIndicator: '#00ffff',
      combo: '#ff00ff',
      starPower: '#ffd700',
    },
    noteStyle: 'sharp',
    fontFamily: 'monospace',
    borderRadius: 0,
  },
  {
    id: 'sunset-vibes',
    name: 'Sunset Vibes',
    description: 'Warm sunset gradient colors',
    colors: {
      primary: '#ff6b6b',
      secondary: '#feca57',
      accent: '#ff9ff3',
      background: '#2d1b3d',
      backgroundSecondary: '#3d2b4d',
      text: '#ffffff',
      textSecondary: '#cccccc',
      success: '#1dd1a1',
      warning: '#feca57',
      error: '#ff6b6b',
      noteDefault: '#ff9ff3',
      noteGolden: '#feca57',
      noteBonus: '#ff6b6b',
      pitchIndicator: '#1dd1a1',
      combo: '#feca57',
      starPower: '#ffd700',
    },
    noteStyle: 'pill',
    fontFamily: 'Poppins, sans-serif',
    borderRadius: 20,
  },
  {
    id: 'ocean-deep',
    name: 'Ocean Deep',
    description: 'Cool ocean blue tones',
    colors: {
      primary: '#00d2d3',
      secondary: '#54a0ff',
      accent: '#5f27cd',
      background: '#0a1628',
      backgroundSecondary: '#162844',
      text: '#ffffff',
      textSecondary: '#88aacc',
      success: '#00d2d3',
      warning: '#feca57',
      error: '#ee5a6f',
      noteDefault: '#54a0ff',
      noteGolden: '#feca57',
      noteBonus: '#5f27cd',
      pitchIndicator: '#00d2d3',
      combo: '#54a0ff',
      starPower: '#ffd700',
    },
    noteStyle: 'rounded',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 12,
  },
  {
    id: 'galaxy-pop',
    name: 'Galaxy Pop',
    description: 'Purple galaxy with pink accents',
    colors: {
      primary: '#a855f7',
      secondary: '#ec4899',
      accent: '#06b6d4',
      background: '#0f0720',
      backgroundSecondary: '#1a0a3e',
      text: '#ffffff',
      textSecondary: '#aabbcc',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      noteDefault: '#a855f7',
      noteGolden: '#fcd34d',
      noteBonus: '#ec4899',
      pitchIndicator: '#06b6d4',
      combo: '#ec4899',
      starPower: '#fcd34d',
    },
    noteStyle: 'diamond',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 6,
  },
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Clean light theme for daytime',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      accent: '#f59e0b',
      background: '#f8fafc',
      backgroundSecondary: '#e2e8f0',
      text: '#1e293b',
      textSecondary: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      noteDefault: '#3b82f6',
      noteGolden: '#f59e0b',
      noteBonus: '#8b5cf6',
      pitchIndicator: '#10b981',
      combo: '#8b5cf6',
      starPower: '#f59e0b',
    },
    noteStyle: 'rounded',
    fontFamily: 'Inter, sans-serif',
    borderRadius: 8,
  },
];

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  
  // Apply CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--theme-${cssVar}`, value);
  });
  
  // Apply font family
  root.style.setProperty('--theme-font', theme.fontFamily);
  
  // Apply border radius
  root.style.setProperty('--theme-radius', `${theme.borderRadius}px`);
  
  // Store preference
  localStorage.setItem('karaoke-theme', theme.id);
}

export function getStoredTheme(): Theme | null {
  const storedId = localStorage.getItem('karaoke-theme');
  return THEMES.find(t => t.id === storedId) || null;
}

export function getThemeColors(themeId: string): ThemeColors {
  const theme = THEMES.find(t => t.id === themeId);
  return theme?.colors || THEMES[0].colors;
}

// CSS variables for theme
export function getThemeCSS(theme: Theme): string {
  return `
    :root {
      --theme-primary: ${theme.colors.primary};
      --theme-secondary: ${theme.colors.secondary};
      --theme-accent: ${theme.colors.accent};
      --theme-background: ${theme.colors.background};
      --theme-background-secondary: ${theme.colors.backgroundSecondary};
      --theme-text: ${theme.colors.text};
      --theme-text-secondary: ${theme.colors.textSecondary};
      --theme-success: ${theme.colors.success};
      --theme-warning: ${theme.colors.warning};
      --theme-error: ${theme.colors.error};
      --theme-note-default: ${theme.colors.noteDefault};
      --theme-note-golden: ${theme.colors.noteGolden};
      --theme-note-bonus: ${theme.colors.noteBonus};
      --theme-pitch-indicator: ${theme.colors.pitchIndicator};
      --theme-combo: ${theme.colors.combo};
      --theme-star-power: ${theme.colors.starPower};
      --theme-font: ${theme.fontFamily};
      --theme-radius: ${theme.borderRadius}px;
    }
  `;
}
