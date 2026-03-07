/**
 * Theme Configuration for Karaoke Successor
 */

export type ThemeMode = 'dark' | 'light' | 'auto';
export type LyricsStyle = 'classic' | 'concert' | 'retro' | 'neon' | 'minimal';

export interface ThemeSettings {
  mode: ThemeMode;
  lyricsStyle: LyricsStyle;
  primaryColor: string;
  accentColor: string;
  backgroundBlur: number;
  showBackgroundVideo: boolean;
  lyricsSize: 'small' | 'medium' | 'large';
  pitchGuideStyle: 'piano' | 'guitar' | 'simple' | 'none';
}

export const defaultTheme: ThemeSettings = {
  mode: 'dark',
  lyricsStyle: 'classic',
  primaryColor: '#06b6d4', // cyan-500
  accentColor: '#a855f7', // purple-500
  backgroundBlur: 20,
  showBackgroundVideo: true,
  lyricsSize: 'medium',
  pitchGuideStyle: 'piano',
};

export const themePresets: Record<string, Partial<ThemeSettings>> = {
  default: {},
  'neon-night': {
    primaryColor: '#f0abfc', // fuchsia-300
    accentColor: '#22d3ee', // cyan-400
    lyricsStyle: 'neon',
  },
  'retro-80s': {
    primaryColor: '#fb923c', // orange-400
    accentColor: '#f472b6', // pink-400
    lyricsStyle: 'retro',
  },
  'concert': {
    primaryColor: '#fbbf24', // amber-400
    accentColor: '#ef4444', // red-500
    lyricsStyle: 'concert',
    showBackgroundVideo: true,
  },
  'minimal-light': {
    mode: 'light',
    primaryColor: '#3b82f6', // blue-500
    accentColor: '#10b981', // emerald-500
    lyricsStyle: 'minimal',
    showBackgroundVideo: false,
    pitchGuideStyle: 'simple',
  },
};

// Lyrics style CSS configurations
export const lyricsStyleConfigs: Record<LyricsStyle, {
  containerClass: string;
  currentLineClass: string;
  upcomingLineClass: string;
  noteClass: string;
}> = {
  classic: {
    containerClass: 'text-center py-8',
    currentLineClass: 'text-3xl font-bold text-white drop-shadow-lg',
    upcomingLineClass: 'text-xl text-white/50',
    noteClass: 'inline-block transition-all duration-150',
  },
  concert: {
    containerClass: 'text-center py-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent',
    currentLineClass: 'text-4xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]',
    upcomingLineClass: 'text-lg text-cyan-300/70 uppercase tracking-wide',
    noteClass: 'inline-block transition-all duration-100 scale-110 when-active',
  },
  retro: {
    containerClass: 'text-center py-8 font-mono',
    currentLineClass: 'text-3xl font-bold text-amber-400 [text-shadow:_0_0_10px_#f59e0b,_0_0_20px_#d97706]',
    upcomingLineClass: 'text-lg text-amber-200/50 font-mono',
    noteClass: 'inline-block transition-all duration-200 skew-x-[-2deg]',
  },
  neon: {
    containerClass: 'text-center py-10',
    currentLineClass: 'text-4xl font-bold text-fuchsia-400 [text-shadow:_0_0_20px_#f0abfc,_0_0_40px_#d946ef,_0_0_60px_#a855f7]',
    upcomingLineClass: 'text-lg text-cyan-400/50 [text-shadow:_0_0_10px_#22d3ee]',
    noteClass: 'inline-block transition-all duration-100 animate-pulse',
  },
  minimal: {
    containerClass: 'text-center py-6',
    currentLineClass: 'text-2xl font-medium text-white',
    upcomingLineClass: 'text-base text-white/40',
    noteClass: 'inline-block transition-all duration-200',
  },
};
