'use client';

import { useEffect, useRef, RefObject } from 'react';
import { io, Socket } from 'socket.io-client';
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
  /** Polling interval in milliseconds (default: 2000ms — now just fallback) */
  pollInterval?: number;
}

/**
 * Hook for receiving and processing remote control commands from mobile companions.
 *
 * Now uses Socket.IO for instant command delivery (no polling delay!).
 * Falls back to HTTP polling if Socket.IO is not connected.
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
  pollInterval = 2000,
}: UseRemoteControlProps) {
  // Use refs so the polling interval isn't torn down and recreated
  const isPlayingRef = useRef(isPlaying);
  const isAdPlayingRef = useRef(isAdPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isAdPlayingRef.current = isAdPlaying;
  }, [isPlaying, isAdPlaying]);

  const setIsPlayingRef = useRef(setIsPlaying);
  const stopRef = useRef(stop);
  const onBackRef = useRef(onBack);
  const onEndRef = useRef(onEnd);
  useEffect(() => { setIsPlayingRef.current = setIsPlaying; }, [setIsPlaying]);
  useEffect(() => { stopRef.current = stop; }, [stop]);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);

  // ─── Command Processor (shared by Socket.IO and HTTP fallback) ───
  const processCommand = useRef((cmd: RemoteCommand) => {
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
        // Forward to global handler so desktop shows pause dialog with pauser name
        window.dispatchEvent(new CustomEvent('remote-command-forward', { detail: cmd }));
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
        if (isAdPlayingRef.current) {
          toast({
            title: t('remoteControl.skipAdTitle'),
            description: t('remoteControl.skipAdDesc'),
          });
        } else {
          stopRef.current();
          onEndRef.current();
        }
        break;

      case 'next':
        stopRef.current();
        onEndRef.current();
        break;

      case 'previous':
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
          audioRef.current.currentTime = seekData.position;
        } else if (audioRef.current && seekData?.direction) {
          const seekAmount = 10;
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

      case 'fullscreen':
        window.dispatchEvent(new Event('toggle-fullscreen'));
        break;

      case 'escape':
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        break;

      case 'tab':
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        break;

      case 'highscores':
      case 'achievements':
      case 'jukebox':
      case 'dailyChallenge':
      case 'editor':
      case 'online':
        stopRef.current();
        onBackRef.current();
        break;

      case 'start_ptm':
      case 'start_br':
      case 'start_tournament':
      case 'start_missing_words':
      case 'start_blind':
      case 'start_medley':
      case 'start_rate_my_song':
      case 'start_companion_singalong':
        stopRef.current();
        onBackRef.current();
        break;

      case 'focus_search':
      case 'random_song':
      case 'random_duel':
      case 'play_queue':
        break;

      case 'backspace':
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        break;

      default:
        window.dispatchEvent(new CustomEvent('remote-command-forward', { detail: cmd }));
        break;
    }
  });

  // ─── Socket.IO Connection for instant command delivery ───
  const socketRef = useRef<Socket | null>(null);
  const socketConnectedRef = useRef(false);

  useEffect(() => {
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      socketConnectedRef.current = true;
      socket.emit('host:register');
    });

    socket.on('disconnect', () => {
      socketConnectedRef.current = false;
    });

    // ─── Receive commands from Companions via Socket.IO (INSTANT!) ───
    socket.on('command', (cmd: RemoteCommand) => {
      processCommand.current(cmd);
    });

    socket.on('connect_error', () => {
      // Silent — fallback to HTTP polling
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      socketConnectedRef.current = false;
    };
  }, []);

  // ─── HTTP Fallback: Poll commands only when Socket.IO is NOT connected ───
  useEffect(() => {
    const pollRemoteCommands = async () => {
      // Skip HTTP poll if Socket.IO is connected (commands arrive instantly)
      if (socketConnectedRef.current) return;

      try {
        const response = await fetch('/api/mobile?action=getcommands');
        if (!response.ok) return;
        const data = await response.json();

        if (data.success && data.commands && data.commands.length > 0) {
          for (const cmd of data.commands as RemoteCommand[]) {
            processCommand.current(cmd);
          }
        }
      } catch (error) {
        console.error('[useRemoteControl] Error polling remote commands:', error);
      }
    };

    // Poll at reduced frequency (2s) as fallback only
    const interval = setInterval(pollRemoteCommands, pollInterval);
    return () => clearInterval(interval);
  }, [audioRef, videoRef, pollInterval]);
}
