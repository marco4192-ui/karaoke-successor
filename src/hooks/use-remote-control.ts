'use client';

import { useEffect, RefObject } from 'react';
import { toast } from '@/hooks/use-toast';

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
  setIsPlaying: (value: boolean) => void;
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
  useEffect(() => {
    const pollRemoteCommands = async () => {
      try {
        const response = await fetch('/api/mobile?action=getcommands');
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
                setIsPlaying(true);
                break;
                
              case 'pause':
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                }
                setIsPlaying(false);
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
                setIsPlaying(false);
                stop();
                onBack();
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
                setIsPlaying(true);
                break;
                
              case 'skip':
                // If ad is playing, show toast to guide user
                if (isAdPlaying) {
                  toast({
                    title: '⏭️ Werbung überspringen',
                    description: 'Klicke auf das Video, um den "Skip Ad" Button zu drücken!',
                  });
                } else {
                  // End current song and go to results
                  stop();
                  onEnd();
                }
                break;
                
              case 'next':
                // End current song and go to results
                stop();
                onEnd();
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
                stop();
                onBack();
                break;
                
              case 'library':
              case 'queue':
              case 'settings':
                // Navigate to other screens
                stop();
                onBack();
                break;
                
              case 'volume':
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
                setIsPlaying(false);
                stop();
                onBack();
                break;
                
              case 'seek':
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
          }
        }
      } catch (error) {
        console.error('[useRemoteControl] Error polling remote commands:', error);
      }
    };
    
    // Poll at the specified interval - always, not just when playing
    const interval = setInterval(pollRemoteCommands, pollInterval);
    return () => clearInterval(interval);
  }, [audioRef, videoRef, isPlaying, isAdPlaying, setIsPlaying, stop, onBack, onEnd, pollInterval]);
}

export default useRemoteControl;
