/**
 * Streaming Overlay Page
 * Browser Source for OBS - Shows score, song info, and player data
 * Access at: /overlay?key=<OVERLAY_KEY>
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

// Types
interface OverlayData {
  // Current song
  song: {
    title: string;
    artist: string;
    coverImage?: string;
    duration: number;
  } | null;
  // Player info
  player: {
    name: string;
    avatar?: string;
    color: string;
  } | null;
  // Score
  score: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor' | null;
  // Game state
  isPlaying: boolean;
  currentTime: number;
  // Settings
  settings: OverlaySettings;
}

interface OverlaySettings {
  showScore: boolean;
  showAccuracy: boolean;
  showCombo: boolean;
  showSongInfo: boolean;
  showPlayer: boolean;
  showRating: boolean;
  theme: 'dark' | 'light' | 'neon' | 'minimal';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  fontFamily: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

const DEFAULT_SETTINGS: OverlaySettings = {
  showScore: true,
  showAccuracy: true,
  showCombo: true,
  showSongInfo: true,
  showPlayer: true,
  showRating: true,
  theme: 'dark',
  position: 'top-left',
  size: 'medium',
  fontFamily: 'Inter, sans-serif',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  textColor: '#ffffff',
  accentColor: '#8B5CF6',
};

const DEFAULT_OVERLAY_DATA: OverlayData = {
  song: null,
  player: null,
  score: 0,
  accuracy: 0,
  combo: 0,
  maxCombo: 0,
  rating: null,
  isPlaying: false,
  currentTime: 0,
  settings: DEFAULT_SETTINGS,
};

// Rating colors
const RATING_COLORS: Record<string, string> = {
  perfect: '#FFD700',
  excellent: '#00FF00',
  good: '#00BFFF',
  okay: '#FFA500',
  poor: '#FF4444',
};

// Rating emojis
const RATING_EMOJIS: Record<string, string> = {
  perfect: '⭐',
  excellent: '🌟',
  good: '✨',
  okay: '💫',
  poor: '💨',
};

export default function OverlayPage() {
  const searchParams = useSearchParams();
  const overlayKey = searchParams.get('key');
  const theme = searchParams.get('theme') || 'dark';
  const position = searchParams.get('position') || 'top-left';

  const [data, setData] = useState<OverlayData>(DEFAULT_OVERLAY_DATA);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to overlay server
  useEffect(() => {
    // For now, use localStorage for demo
    // In production, this would use EventSource or WebSocket
    const loadData = () => {
      try {
        const stored = localStorage.getItem('overlay-data');
        if (stored) {
          const parsed = JSON.parse(stored);
          setData(prev => ({
            ...prev,
            ...parsed,
            settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          }));
          setConnected(true);
        }
      } catch {
        setError('Failed to load overlay data');
      }
    };

    loadData();

    // Poll for updates
    const interval = setInterval(loadData, 500);

    // Listen for storage events (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'overlay-data') {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format score
  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  // Position classes
  const positionClasses: Record<string, string> = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // Size classes
  const sizeClasses: Record<string, string> = {
    small: 'text-sm p-2',
    medium: 'text-base p-4',
    large: 'text-lg p-6',
  };

  const { settings, song, player, score, accuracy, combo, maxCombo, rating, isPlaying } = data;

  // If not playing and no demo mode, show minimal or nothing
  if (!isPlaying && !song) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className={`text-white/50 text-sm ${positionClasses[position]}`}>
          {!connected && 'Waiting for overlay data...'}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-transparent fixed ${positionClasses[position]}`}
      style={{ fontFamily: settings.fontFamily }}
    >
      <div
        className={`rounded-xl backdrop-blur-md ${sizeClasses[settings.size]} max-w-md`}
        style={{
          backgroundColor: settings.backgroundColor,
          color: settings.textColor,
          boxShadow: `0 0 20px ${settings.accentColor}40`,
          border: `1px solid ${settings.accentColor}30`,
        }}
      >
        {/* Song Info */}
        {settings.showSongInfo && song && (
          <div className="flex items-center gap-3 mb-3">
            {song.coverImage && (
              <img
                src={song.coverImage}
                alt=""
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate" style={{ color: settings.accentColor }}>
                {song.title}
              </div>
              <div className="text-sm opacity-70 truncate">{song.artist}</div>
            </div>
          </div>
        )}

        {/* Player Info */}
        {settings.showPlayer && player && (
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ backgroundColor: player.color }}
            >
              {player.avatar || player.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{player.name}</span>
          </div>
        )}

        {/* Score */}
        {settings.showScore && (
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: settings.accentColor }}
            >
              {formatScore(score)}
            </span>
            <span className="text-sm opacity-50">pts</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex gap-4 text-sm">
          {settings.showAccuracy && (
            <div>
              <span className="opacity-50">Accuracy</span>
              <div className="font-bold tabular-nums">{accuracy.toFixed(1)}%</div>
            </div>
          )}
          {settings.showCombo && (
            <div>
              <span className="opacity-50">Combo</span>
              <div className="font-bold tabular-nums">
                {combo}
                {combo > 0 && <span className="text-xs opacity-50">/{maxCombo}</span>}
              </div>
            </div>
          )}
          {song && (
            <div>
              <span className="opacity-50">Time</span>
              <div className="font-bold tabular-nums">
                {formatTime(data.currentTime)}
              </div>
            </div>
          )}
        </div>

        {/* Rating */}
        {settings.showRating && rating && (
          <div
            className="mt-3 text-center py-1 rounded-lg"
            style={{
              backgroundColor: `${RATING_COLORS[rating]}20`,
              color: RATING_COLORS[rating],
            }}
          >
            {RATING_EMOJIS[rating]} {rating.toUpperCase()}
          </div>
        )}

        {/* Live indicator */}
        <div className="flex items-center gap-2 mt-3 text-xs opacity-50">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
      </div>
    </div>
  );
}
