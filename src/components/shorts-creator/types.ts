import type { Song, HighscoreEntry, GameResult } from '@/types/game';

export type VideoStyle = 'neon' | 'retro' | 'minimal' | 'gradient';

export type CameraPosition = 'pip-top-right' | 'pip-top-left' | 'pip-bottom-right' | 'pip-bottom-left' | 'fullscreen' | 'none';

export interface ShortsCreatorProps {
  song: Song;
  score: HighscoreEntry;
  gameResult?: GameResult;
  audioUrl?: string;
  onClose?: () => void;
}

export interface VideoStyleConfig {
  id: VideoStyle;
  name: string;
  bg: string;
  accent: string;
}

export const VIDEO_STYLES: VideoStyleConfig[] = [
  { id: 'neon', name: 'Neon', bg: '#0a0a0a', accent: '#00ffff' },
  { id: 'retro', name: 'Retro', bg: '#1a0a2e', accent: '#ff00ff' },
  { id: 'minimal', name: 'Minimal', bg: '#ffffff', accent: '#000000' },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#ffffff' },
];

export interface CameraPositionOption {
  id: CameraPosition;
  name: string;
}

export const CAMERA_POSITIONS: CameraPositionOption[] = [
  { id: 'pip-top-right', name: 'Top Right' },
  { id: 'pip-top-left', name: 'Top Left' },
  { id: 'pip-bottom-right', name: 'Bottom Right' },
  { id: 'pip-bottom-left', name: 'Bottom Left' },
  { id: 'fullscreen', name: 'Full Screen' },
  { id: 'none', name: 'No Camera' },
];
