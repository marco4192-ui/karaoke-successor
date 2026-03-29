/**
 * use-mobile-game-sync.ts
 * 
 * Hook for syncing game state with mobile companion devices
 * Extracted from game-screen.tsx for better maintainability
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Song } from '@/types/game';
import { setGameType, GameType } from '@/lib/audio/mobile-audio-processor';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

export interface MobileGameSyncOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  isDuetMode: boolean;
  /** Game type for setting transmission mode (default: 'single' = audio-stream) */
  gameType?: GameType;
  /** Callback when mobile pitch is received (for P2 in duet mode) */
  onMobilePitch?: (pitch: MobilePitchData | null) => void;
}

export interface MobileGameSyncResult {
  /** Latest pitch data from mobile client */
  mobilePitch: MobilePitchData | null;
  /** Whether a mobile client is connected */
  hasMobileClient: boolean;
  /** Volume from mobile client (for P2) */
  p2Volume: number;
  /** Set P2 volume (internal use) */
  setP2Volume: (volume: number) => void;
}

/**
 * Hook for syncing game state with mobile companion devices
 * Handles:
 * - Polling for mobile pitch data
 * - Syncing game state to mobile clients
 * - Managing P2 volume for duet mode
 * - Setting transmission mode based on game type
 */
export function useMobileGameSync({
  song,
  isPlaying,
  currentTime,
  isDuetMode,
  gameType = 'single', // Default to single player mode (audio-stream)
  onMobilePitch,
}: MobileGameSyncOptions): MobileGameSyncResult {
  
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [p2Volume, setP2Volume] = useState(0);
  
  // Set game type when song is loaded (determines transmission mode)
  // Battle Royale = pitch-only, all others = audio-stream
  useEffect(() => {
    if (song) {
      setGameType(gameType);
    }
    return () => {
      // Reset to single when unmounting
      setGameType('single');
    };
  }, [song, gameType]);
  
  // Poll for mobile pitch data
  useEffect(() => {
    if (!song) return;
    
    const pollMobilePitch = async () => {
      try {
        const data = await apiClient.mobileGetPitch();
        if (data.success && data.pitch) {
          const pitchData = (data.pitch as { data: MobilePitchData }).data;
          setMobilePitch(pitchData);
          setHasMobileClient(true);
          
          // Notify callback for duet mode
          if (onMobilePitch) {
            onMobilePitch(pitchData);
          }
        }
      } catch {
        // Ignore polling errors
      }
    };
    
    const pollInterval = setInterval(pollMobilePitch, 50); // Poll every 50ms for real-time sync
    
    return () => clearInterval(pollInterval);
  }, [song, onMobilePitch]);
  
  // Update game state for mobile clients to see
  useEffect(() => {
    if (!song) return;
    
    const updateGameState = async () => {
      try {
        await apiClient.mobileGameState({
          currentSong: { id: song.id, title: song.title, artist: song.artist },
          isPlaying: isPlaying,
          currentTime: currentTime,
        });
      } catch {
        // Ignore sync errors
      }
    };
    
    // Update on song change and play state change
    updateGameState();
  }, [song, isPlaying, currentTime]);
  
  // Handle P2 volume from mobile in duet mode
  useEffect(() => {
    if (isDuetMode && mobilePitch?.frequency) {
      setP2Volume(mobilePitch.volume || 0);
    } else if (isDuetMode && !mobilePitch?.frequency) {
      setP2Volume(0);
    }
  }, [isDuetMode, mobilePitch]);

  return {
    mobilePitch,
    hasMobileClient,
    p2Volume,
    setP2Volume,
  };
}

/**
 * Send game end notification to mobile clients
 */
export async function notifyMobileGameEnd(song: Song): Promise<void> {
  try {
    await apiClient.mobileGameState({
      currentSong: { id: song.id, title: song.title, artist: song.artist },
      isPlaying: false,
      currentTime: 0,
      songEnded: true,
    });
  } catch {
    // Ignore errors
  }
}

/**
 * Send game results to mobile clients for social features
 */
export async function sendMobileResults(
  song: Song,
  score: number,
  accuracy: number,
  maxCombo: number,
  rating: string
): Promise<void> {
  try {
    await apiClient.mobileResults({
      songId: song.id,
      songTitle: song.title,
      songArtist: song.artist,
      score,
      accuracy,
      maxCombo,
      rating,
      playedAt: Date.now(),
    });
  } catch {
    // Ignore errors
  }
}
