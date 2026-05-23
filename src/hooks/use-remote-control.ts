'use client';

import { useEffect, useRef, RefObject } from 'react';
import { toast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n/translations';

/**
 * Remote control command types from mobile companions
 */
interface RemoteCommand {
  type: string;
  data?: unknown;
}

/**
 * Props for the useRemoteControl hook
 */
export interface UseRemoteControlProps {
  /** Ref to the audio element */
  audioRef: RefObject<HTMLAudioElement | null>;
  /** Ref to the video element */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Whether the game is currently playing */
  isPlaying: boolean;
  /** Setter for isPlaying state */
  setIsPlaying: (_value: boolean) => void;
  /** Whether an ad is currently playing */
  isAdPlaying: boolean;
  /** Stop pitch detection callback */
  stop: () => void;
  /** Navigate back callback */
  onBack: () => void;
  /** End game callback */
  onEnd: () => void;
  /** Polling interval in milliseconds (default: 500ms) */
  pollInterval?: number;
}

/**
 * Hook for polling and processing remote control commands from mobile companions
 * 
 * Handles commands like play, pause, stop, restart, skip, volume control, etc.
 */
export function useRemoteControl({
  audioRef,
  videoRef,
  isPlaying,
  setIsPlaying,
  isAdPlaying,
  stop,
  onBack,
  onEnd,
  pollInterval = 500,
}: UseRemoteControlProps) {
  // Use refs so the polling interval isn't torn down and recreated
  // every time isPlaying / isAdPlaying change.
  const isPlayingRef = useRef(isPlaying);
  const isAdPlayingRef = useRef(isAdPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isAdPlayingRef.current = isAdPlaying;
  }, [isPlaying, isAdPlaying]);

  // Use refs for callbacks so the polling interval isn't torn down
  // and recreated every time a parent re-renders with a new callback ref.
  const setIsPlayingRef = useRef(setIsPlaying);
  const stopRef = useRef(stop);
  const onBackRef = useRef(onBack);
  const onEndRef = useRef(onEnd);
  useEffect(() => { setIsPlayingRef.current = setIsPlaying; }, [setIsPlaying]);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  useEffect(() => {
    const pollRemoteCommands = async () => {
      try {
        const response = await fetch('/api/mobile?action=getcommands');
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.success && data.commands && data.commands.length > 0) {
          // Process each command
          for (const cmd of data.commands as RemoteCommand[]) {
            switch (cmd.type) {
              case 'play':
                if (audioRef.current && audioRef.current.paused) {
                  audioRef.current.play().catch(() => {});
                }
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {});
                }
                setIsPlayingRef.current(true);
                break;
                
              case 'pause':
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                }
                setIsPlayingRef.current(false);
                break;
                
              case 'stop':
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
                setIsPlayingRef.current(false);
                stopRef.current();
                onBackRef.current();
                break;
                
              case 'restart':
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
                setIsPlayingRef.current(true);
                break;
                
              case 'skip':
                // If ad is playing, show toast to guide user
                if (isAdPlayingRef.current) {
                  toast({
                    title: t('remoteControl.skipAdTitle'),
                    description: t('remoteControl.skipAdDesc'),
                  });
                } else {
                  // End current song and go to results
                  stopRef.current();
                  onEndRef.current();
                }
                break;
                
              case 'next':
                // End current song and go to results
                stopRef.current();
                onEndRef.current();
                break;
                
              case 'previous':
                // Restart song
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
                break;
                
              case 'home':
                stopRef.current();
                onBackRef.current();
                break;
                
              case 'library':
              case 'queue':
              case 'settings':
                // NOTE: All three commands currently stop the game and go back.
                // Navigation to specific screens is not available during gameplay
                // (no navigate callback). The companion would need to send a
                // separate command after the game ends to reach a specific screen.
                stopRef.current();
                onBackRef.current();
                break;
                
              case 'volume': {
                const volumeData = cmd.data as { direction?: string };
                if (audioRef.current) {
                  const currentVolume = audioRef.current.volume;
                  if (volumeData?.direction === 'up') {
                    audioRef.current.volume = Math.min(1, currentVolume + 0.1);
                  } else if (volumeData?.direction === 'down') {
                    audioRef.current.volume = Math.max(0, currentVolume - 0.1);
                  }
                }
                break;
              }
                
              case 'quit':
                // Quit the application - same as stop but more definitive
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
                setIsPlayingRef.current(false);
                stopRef.current();
                onBackRef.current();
                break;
                
              case 'seek': {
                const seekData = cmd.data as { position?: number; direction?: string };
                if (audioRef.current && seekData?.position !== undefined) {
                  // Seek to absolute position (in seconds)
                  audioRef.current.currentTime = seekData.position;
                } else if (audioRef.current && seekData?.direction) {
                  // Relative seek
                  const seekAmount = 10; // 10 seconds
                  if (seekData.direction === 'forward') {
                    audioRef.current.currentTime = Math.min(
                      audioRef.current.duration || 0,
                      audioRef.current.currentTime + seekAmount
                    );
                  } else if (seekData.direction === 'backward') {
                    audioRef.current.currentTime = Math.max(
                      0,
                      audioRef.current.currentTime - seekAmount
                    );
                  }
                }
                // Also seek video if present
                if (videoRef.current && seekData?.position !== undefined) {
                  videoRef.current.currentTime = seekData.position;
                } else if (videoRef.current && seekData?.direction) {
                  const seekAmount = 10;
                  if (seekData.direction === 'forward') {
                    videoRef.current.currentTime = Math.min(
                      videoRef.current.duration || 0,
                      videoRef.current.currentTime + seekAmount
                    );
                  } else if (seekData.direction === 'backward') {
                    videoRef.current.currentTime = Math.max(
                      0,
                      videoRef.current.currentTime - seekAmount
                    );
                  }
                }
                break;
              }

              // --- Volume shortcuts (no data payload needed) ---
              case 'volume_up':
                if (audioRef.current) {
                  audioRef.current.volume = Math.min(1, audioRef.current.volume + 0.1);
                }
                break;

              case 'volume_down':
                if (audioRef.current) {
                  audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.1);
                }
                break;

              // --- Seek shortcuts (no data payload needed) ---
              case 'seek_forward':
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.min(
                    audioRef.current.duration || 0,
                    audioRef.current.currentTime + 10
                  );
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.min(
                    videoRef.current.duration || 0,
                    videoRef.current.currentTime + 10
                  );
                }
                break;

              case 'seek_backward':
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }
                break;

              // --- Toggle fullscreen ---
              case 'fullscreen':
                window.dispatchEvent(new Event('toggle-fullscreen'));
                break;

              // --- Simulated keyboard keys ---
              case 'escape':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                break;

              case 'tab':
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
                break;

              // --- Navigation commands that stop the game and go back ---
              case 'highscores':
              case 'achievements':
              case 'jukebox':
              case 'dailyChallenge':
              case 'editor':
              case 'online':
                stopRef.current();
                onBackRef.current();
                break;

              // --- Party mode launchers: stop current game and go back ---
              case 'start_ptm':
              case 'start_br':
              case 'start_tournament':
                stopRef.current();
                onBackRef.current();
                break;
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[useRemoteControl] Error polling remote commands:', error);
      }
    };
    
    // Poll at the specified interval - always, not just when playing
    const interval = setInterval(pollRemoteCommands, pollInterval);
    return () => clearInterval(interval);
  }, [audioRef, videoRef, pollInterval]);
}

