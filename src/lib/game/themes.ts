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
  // Enhanced theme features
  genres?: string[]; // Genres this theme is recommended for
  mood?: 'energetic' | 'calm' | 'romantic' | 'intense' | 'party' | 'melancholic';
  particleEffect?: 'sparkle' | 'pulse' | 'wave' | 'rain' | 'fire' | 'snow' | 'none';
  backgroundAnimation?: 'gradient' | 'particles' | 'waves' | 'stars' | 'none';
}

export interface DynamicBackgroundConfig {
  type: 'gradient' | 'particles' | 'waves' | 'stars' | 'video' | 'image';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  speed?: number; // Animation speed (0-100)
  intensity?: number; // Effect intensity (0-100)
}

export interface SongThemeMapping {
  genre: string;
  recommendedThemes: string[]; // Theme IDs
  defaultBackground: DynamicBackgroundConfig;
}

// Genre-based theme mappings
export const GENRE_THEME_MAPPINGS: SongThemeMapping[] = [
  {
    genre: 'pop',
    recommendedThemes: ['galaxy-pop', 'neon-nights', 'sunset-vibes'],
    defaultBackground: {
      type: 'gradient',
      primaryColor: '#a855f7',
      secondaryColor: '#ec4899',
      accentColor: '#06b6d4',
      speed: 50,
      intensity: 60,
    },
  },
  {
    genre: 'rock',
    recommendedThemes: ['retro-arcade', 'neon-nights'],
    defaultBackground: {
      type: 'particles',
      primaryColor: '#ff4466',
      secondaryColor: '#ffd700',
      accentColor: '#ff6ec7',
      speed: 70,
      intensity: 80,
    },
  },
  {
    genre: 'hip-hop',
    recommendedThemes: ['neon-nights', 'galaxy-pop'],
    defaultBackground: {
      type: 'waves',
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      accentColor: '#ffd700',
      speed: 60,
      intensity: 70,
    },
  },
  {
    genre: 'r&b',
    recommendedThemes: ['sunset-vibes', 'ocean-deep'],
    defaultBackground: {
      type: 'gradient',
      primaryColor: '#ff6b6b',
      secondaryColor: '#feca57',
      accentColor: '#ff9ff3',
      speed: 30,
      intensity: 50,
    },
  },
  {
    genre: 'electronic',
    recommendedThemes: ['neon-nights', 'retro-arcade'],
    defaultBackground: {
      type: 'particles',
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      accentColor: '#ffff00',
      speed: 80,
      intensity: 90,
    },
  },
  {
    genre: 'jazz',
    recommendedThemes: ['ocean-deep', 'sunset-vibes'],
    defaultBackground: {
      type: 'gradient',
      primaryColor: '#54a0ff',
      secondaryColor: '#5f27cd',
      accentColor: '#feca57',
      speed: 20,
      intensity: 40,
    },
  },
  {
    genre: 'classical',
    recommendedThemes: ['ocean-deep', 'minimal-light'],
    defaultBackground: {
      type: 'stars',
      primaryColor: '#1e3a5f',
      secondaryColor: '#2d5a87',
      accentColor: '#ffd700',
      speed: 15,
      intensity: 30,
    },
  },
  {
    genre: 'country',
    recommendedThemes: ['sunset-vibes', 'minimal-light'],
    defaultBackground: {
      type: 'gradient',
      primaryColor: '#feca57',
      secondaryColor: '#ff6b6b',
      accentColor: '#1dd1a1',
      speed: 25,
      intensity: 45,
    },
  },
  {
    genre: 'metal',
    recommendedThemes: ['retro-arcade', 'neon-nights'],
    defaultBackground: {
      type: 'particles',
      primaryColor: '#ff0000',
      secondaryColor: '#ff4466',
      accentColor: '#ffd700',
      speed: 90,
      intensity: 95,
    },
  },
  {
    genre: 'disco',
    recommendedThemes: ['galaxy-pop', 'neon-nights'],
    defaultBackground: {
      type: 'particles',
      primaryColor: '#ff6ec7',
      secondaryColor: '#39ff14',
      accentColor: '#ffd700',
      speed: 70,
      intensity: 85,
    },
  },
  {
    genre: 'latin',
    recommendedThemes: ['sunset-vibes', 'galaxy-pop'],
    defaultBackground: {
      type: 'waves',
      primaryColor: '#ff6b6b',
      secondaryColor: '#feca57',
      accentColor: '#ff9ff3',
      speed: 65,
      intensity: 75,
    },
  },
  {
    genre: 'k-pop',
    recommendedThemes: ['galaxy-pop', 'neon-nights', 'sunset-vibes'],
    defaultBackground: {
      type: 'particles',
      primaryColor: '#ec4899',
      secondaryColor: '#a855f7',
      accentColor: '#06b6d4',
      speed: 75,
      intensity: 80,
    },
  },
];

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
    genres: ['electronic', 'hip-hop', 'pop'],
    mood: 'energetic',
    particleEffect: 'sparkle',
    backgroundAnimation: 'particles',
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
    genres: ['rock', 'metal', 'electronic'],
    mood: 'intense',
    particleEffect: 'pulse',
    backgroundAnimation: 'gradient',
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
    genres: ['r&b', 'pop', 'country', 'latin'],
    mood: 'romantic',
    particleEffect: 'wave',
    backgroundAnimation: 'gradient',
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
    genres: ['jazz', 'classical', 'r&b'],
    mood: 'calm',
    particleEffect: 'wave',
    backgroundAnimation: 'waves',
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
    genres: ['k-pop', 'pop', 'disco'],
    mood: 'party',
    particleEffect: 'sparkle',
    backgroundAnimation: 'stars',
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
    genres: ['classical', 'jazz', 'country'],
    mood: 'calm',
    particleEffect: 'none',
    backgroundAnimation: 'none',
  },
];

export function applyTheme(theme: Theme): void {
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
  
  // Inject dynamic CSS for text-white and text-white/XX overrides based on theme brightness
  const isLightTheme = theme.colors.background.startsWith('#f') || 
                       theme.colors.background.startsWith('#F') ||
                       theme.colors.background.startsWith('#e') ||
                       theme.colors.background.startsWith('#E') ||
                       theme.colors.background.startsWith('#d') ||
                       theme.colors.background.startsWith('#D') ||
                       theme.colors.text.startsWith('#1') ||
                       theme.colors.text.startsWith('#2') ||
                       theme.colors.text.startsWith('#3');
  
  // Create or update dynamic theme styles
  let styleEl = document.getElementById('theme-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'theme-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  
  // For light themes, we need to adjust text colors
  if (isLightTheme) {
    styleEl.textContent = `
      .theme-adaptive-text { color: ${theme.colors.text} !important; }
      .theme-adaptive-text-secondary { color: ${theme.colors.textSecondary} !important; }
      .theme-adaptive-bg { background-color: ${theme.colors.background} !important; }
      
      /* Override Tailwind text colors for light themes */
      .theme-container .text-white { color: ${theme.colors.text} !important; }
      .theme-container .text-white\\/50 { color: ${theme.colors.textSecondary} !important; opacity: 0.5; }
      .theme-container .text-white\\/60 { color: ${theme.colors.textSecondary} !important; opacity: 0.6; }
      .theme-container .text-white\\/70 { color: ${theme.colors.textSecondary} !important; opacity: 0.7; }
      .theme-container .text-white\\/80 { color: ${theme.colors.text} !important; opacity: 0.8; }
      .theme-container .text-white\\/90 { color: ${theme.colors.text} !important; opacity: 0.9; }
      
      /* Override for direct children of theme-aware components */
      .theme-override .text-white { color: ${theme.colors.text} !important; }
      .theme-override .text-white\\/50 { color: ${theme.colors.textSecondary} !important; opacity: 0.5; }
      .theme-override .text-white\\/60 { color: ${theme.colors.textSecondary} !important; opacity: 0.6; }
      
      /* Border overrides for light theme */
      .theme-container .border-white\\/10 { border-color: ${theme.colors.primary}20 !important; }
      .theme-container .border-white\\/20 { border-color: ${theme.colors.primary}30 !important; }
      .theme-container .border-white\\/30 { border-color: ${theme.colors.primary}40 !important; }
      
      /* Background overrides for light theme */
      .theme-container .bg-white\\/5 { background-color: ${theme.colors.backgroundSecondary}80 !important; }
      .theme-container .bg-white\\/10 { background-color: ${theme.colors.backgroundSecondary} !important; }
    `;
  } else {
    styleEl.textContent = `
      .theme-adaptive-text { color: ${theme.colors.text} !important; }
      .theme-adaptive-text-secondary { color: ${theme.colors.textSecondary} !important; }
      .theme-adaptive-bg { background-color: ${theme.colors.background} !important; }
      
      /* Override Tailwind text colors for dark themes */
      .theme-container .text-white { color: ${theme.colors.text} !important; }
      .theme-container .text-white\\/50 { color: ${theme.colors.textSecondary} !important; opacity: 0.5; }
      .theme-container .text-white\\/60 { color: ${theme.colors.textSecondary} !important; opacity: 0.6; }
      .theme-container .text-white\\/70 { color: ${theme.colors.textSecondary} !important; opacity: 0.7; }
      .theme-container .text-white\\/80 { color: ${theme.colors.text} !important; opacity: 0.8; }
      .theme-container .text-white\\/90 { color: ${theme.colors.text} !important; opacity: 0.9; }
      
      /* Override for direct children of theme-aware components */
      .theme-override .text-white { color: ${theme.colors.text} !important; }
      .theme-override .text-white\\/50 { color: ${theme.colors.textSecondary} !important; opacity: 0.5; }
      .theme-override .text-white\\/60 { color: ${theme.colors.textSecondary} !important; opacity: 0.6; }
      
      /* Border overrides */
      .theme-container .border-white\\/10 { border-color: ${theme.colors.primary}20 !important; }
      .theme-container .border-white\\/20 { border-color: ${theme.colors.primary}30 !important; }
      .theme-container .border-white\\/30 { border-color: ${theme.colors.primary}40 !important; }
      
      /* Background overrides */
      .theme-container .bg-white\\/5 { background-color: ${theme.colors.backgroundSecondary}80 !important; }
      .theme-container .bg-white\\/10 { background-color: ${theme.colors.backgroundSecondary} !important; }
    `;
  }
  
  // Store preference
  localStorage.setItem('karaoke-theme', theme.id);
  
  // Dispatch event for components to react
  window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }));
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

// ===================== ENHANCED THEME FUNCTIONS =====================

/**
 * Get recommended themes for a specific genre
 */
export function getThemesForGenre(genre: string): Theme[] {
  const mapping = GENRE_THEME_MAPPINGS.find(m => 
    m.genre.toLowerCase() === genre.toLowerCase()
  );
  
  if (!mapping) {
    // Return default themes if no mapping found
    return [THEMES[0], THEMES[4]]; // neon-nights and galaxy-pop
  }
  
  return mapping.recommendedThemes
    .map(id => THEMES.find(t => t.id === id))
    .filter((t): t is Theme => t !== undefined);
}

/**
 * Get dynamic background config for a genre
 */
export function getBackgroundForGenre(genre: string): DynamicBackgroundConfig {
  const mapping = GENRE_THEME_MAPPINGS.find(m => 
    m.genre.toLowerCase() === genre.toLowerCase()
  );
  
  return mapping?.defaultBackground || {
    type: 'gradient',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    accentColor: '#06b6d4',
    speed: 50,
    intensity: 60,
  };
}

/**
 * Get theme by mood
 */
export function getThemesByMood(mood: Theme['mood']): Theme[] {
  return THEMES.filter(t => t.mood === mood);
}

/**
 * Auto-select best theme for a song based on genre and BPM
 */
export function getAutoThemeForSong(genre?: string, bpm?: number): Theme {
  // If genre is specified, get recommended theme
  if (genre) {
    const genreThemes = getThemesForGenre(genre);
    if (genreThemes.length > 0) {
      // If BPM is high, prefer energetic themes
      if (bpm && bpm > 140) {
        const energetic = genreThemes.find(t => t.mood === 'energetic' || t.mood === 'party');
        if (energetic) return energetic;
      }
      return genreThemes[0];
    }
  }
  
  // Fallback based on BPM
  if (bpm) {
    if (bpm > 160) return THEMES.find(t => t.id === 'retro-arcade') || THEMES[0];
    if (bpm > 130) return THEMES.find(t => t.id === 'neon-nights') || THEMES[0];
    if (bpm > 100) return THEMES.find(t => t.id === 'galaxy-pop') || THEMES[0];
    if (bpm > 80) return THEMES.find(t => t.id === 'sunset-vibes') || THEMES[0];
    return THEMES.find(t => t.id === 'ocean-deep') || THEMES[0];
  }
  
  // Default to neon-nights
  return THEMES[0];
}

/**
 * Generate CSS for dynamic background animation
 */
export function generateDynamicBackgroundCSS(config: DynamicBackgroundConfig): string {
  const { type, primaryColor, secondaryColor, accentColor, speed = 50, intensity = 50 } = config;
  
  const animationDuration = (100 - speed + 10) * 0.1; // 1s - 10s
  
  switch (type) {
    case 'particles':
      return `
        @keyframes particles {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        background: radial-gradient(circle at 20% 80%, ${primaryColor}${Math.round(intensity * 0.4).toString(16).padStart(2, '0')} 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, ${secondaryColor}${Math.round(intensity * 0.4).toString(16).padStart(2, '0')} 0%, transparent 50%),
                    radial-gradient(circle at 40% 40%, ${accentColor}${Math.round(intensity * 0.3).toString(16).padStart(2, '0')} 0%, transparent 40%);
        background-size: 200% 200%;
        animation: particles ${animationDuration}s ease-in-out infinite;
      `;
      
    case 'waves':
      return `
        @keyframes waves {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        background: linear-gradient(45deg, ${primaryColor}33, ${secondaryColor}33, ${accentColor}33);
        background-size: 400% 400%;
        animation: waves ${animationDuration * 2}s ease-in-out infinite;
      `;
      
    case 'stars':
      return `
        @keyframes stars {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        background: radial-gradient(1px 1px at 20% 30%, ${accentColor} 50%, transparent 100%),
                    radial-gradient(1px 1px at 40% 70%, ${primaryColor} 50%, transparent 100%),
                    radial-gradient(1px 1px at 50% 20%, ${secondaryColor} 50%, transparent 100%),
                    radial-gradient(1px 1px at 70% 50%, ${accentColor} 50%, transparent 100%),
                    radial-gradient(1px 1px at 90% 80%, ${primaryColor} 50%, transparent 100%),
                    linear-gradient(to bottom, ${primaryColor}22, ${secondaryColor}22);
        animation: stars ${animationDuration}s ease-in-out infinite;
      `;
      
    case 'gradient':
    default:
      return `
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        background: linear-gradient(135deg, ${primaryColor}44, ${secondaryColor}44, ${accentColor}33);
        background-size: 200% 200%;
        animation: gradient ${animationDuration * 2}s ease-in-out infinite;
      `;
  }
}

/**
 * Generate particle effect CSS
 */
export function generateParticleEffectCSS(effect: Theme['particleEffect'], color: string): string {
  switch (effect) {
    case 'sparkle':
      return `
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .particle::before {
          content: '✦';
          color: ${color};
          animation: sparkle 2s ease-in-out infinite;
        }
      `;
      
    case 'pulse':
      return `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .particle {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `;
      
    case 'wave':
      return `
        @keyframes wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .particle {
          animation: wave 2s ease-in-out infinite;
        }
      `;
      
    default:
      return '';
  }
}
