'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song } from '@/types/game';
import {
  getMobileAudioProcessor,
  setGameType,
  fetchAndProcessAudio,
  ProcessedAudioResult,
  GameType,
} from '@/lib/audio/mobile-audio-processor';

export interface UseMobileClientOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  gameType?: GameType;
}

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

export interface MobileClientResult {
  id: string;
  code: string;
  name: string;
  profile?: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  };
  pitch: MobilePitchData | null;
  isStreaming: boolean;
}

export function useMobileClient({
  song,
  isPlaying,
  currentTime,
  gameType = 'single',
}: UseMobileClientOptions): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
  isRemoteControlEnabled: boolean;
  sendGameState: () => Promise<void>;
  sendAdState: (isAdPlaying: boolean) => Promise<void>;
  // New audio streaming features
  mobileClients: MobileClientResult[];
  processedAudio: ProcessedAudioResult[];
  transmissionMode: 'pitch-only' | 'audio-stream';
  setGameMode: (type: GameType) => Promise<void>;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(true);
  
  // New state for audio streaming
  const [mobileClients, setMobileClients] = useState<MobileClientResult[]>([]);
  const [processedAudio, setProcessedAudio] = useState<ProcessedAudioResult[]>([]);
  const [transmissionMode, setTransmissionMode] = useState<'pitch-only' | 'audio-stream'>('pitch-only');
  
  const processorRef = useRef(getMobileAudioProcessor());
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize processor
  useEffect(() => {
    processorRef.current.initialize();
    return () => {
      processorRef.current.cleanup();
    };
  }, []);

  // Set game type and transmission mode
  const setGameMode = useCallback(async (type: GameType) => {
    await setGameType(type);
    // Determine transmission mode
    const mode = type === 'battle-royale' ? 'pitch-only' : 'audio-stream';
    setTransmissionMode(mode);
  }, []);

  // Set game type when it changes
  useEffect(() => {
    setGameMode(gameType);
  }, [gameType, setGameMode]);

  // Poll for mobile data (pitch or audio depending on mode)
  useEffect(() => {
    if (!song) return;

    const pollMobileData = async () => {
      try {
        if (transmissionMode === 'audio-stream') {
          // Poll for audio data and process it
          const results = await fetchAndProcessAudio(processorRef.current);
          if (results.length > 0) {
            setProcessedAudio(results);
            setHasMobileClient(true);
            
            // Also update mobile clients list
            const clientsResponse = await fetch('/api/mobile?action=status');
            const clientsData = await clientsResponse.json();
            if (clientsData.success) {
              setMobileClients(
                (clientsData.clients || []).map((c: {
                  id: string;
                  connectionCode: string;
                  name: string;
                  profile?: { id: string; name: string; avatar?: string; color: string };
                  hasPitch?: boolean;
                }) => ({
                  id: c.id,
                  code: c.connectionCode,
                  name: c.name,
                  profile: c.profile,
                  pitch: results.find(r => r.clientId === c.id) || null,
                  isStreaming: true,
                }))
              );
            }
          }
        } else {
          // Pitch-only mode (Battle Royale)
          const response = await fetch('/api/mobile?action=getpitch');
          const data = await response.json();
          if (data.success && data.pitches && data.pitches.length > 0) {
            // Use the first pitch for backward compatibility
            setMobilePitch(data.pitches[0].data);
            setHasMobileClient(true);
            
            // Also update clients list with pitch data
            setMobileClients(
              data.pitches.map((p: {
                clientId: string;
                code: string;
                data: MobilePitchData;
                profile?: { id: string; name: string; avatar?: string; color: string };
              }) => ({
                id: p.clientId,
                code: p.code,
                name: p.profile?.name || 'Mobile Device',
                profile: p.profile,
                pitch: p.data,
                isStreaming: false,
              }))
            );
          }
        }
      } catch {
        // Ignore polling errors
      }
    };

    // Poll every 50ms for low latency
    pollIntervalRef.current = setInterval(pollMobileData, 50);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [song, transmissionMode]);

  // Send game state to mobile clients
  const sendGameState = useCallback(async () => {
    if (!song) return;

    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            currentSong: { id: song.id, title: song.title, artist: song.artist },
            isPlaying,
            currentTime,
          },
        }),
      });
    } catch {
      // Ignore sync errors
    }
  }, [song, isPlaying, currentTime]);

  // Update game state for mobile clients
  useEffect(() => {
    sendGameState();
  }, [sendGameState]);

  // Send ad state to mobile clients
  const sendAdState = useCallback(async (isAdPlaying: boolean) => {
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'setAdPlaying',
          payload: { isAdPlaying },
        }),
      });
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    mobilePitch,
    hasMobileClient,
    isRemoteControlEnabled,
    sendGameState,
    sendAdState,
    // New audio streaming features
    mobileClients,
    processedAudio,
    transmissionMode,
    setGameMode,
  };
}
