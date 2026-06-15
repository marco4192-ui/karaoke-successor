'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Global remote control command types from mobile companions
 */
interface RemoteCommand {
  type: string;
  data?: unknown;
  timestamp: number;
  fromClientId: string;
  fromClientName: string;
}

/**
 * Props for the useGlobalRemoteControl hook
 */
interface UseGlobalRemoteControlProps {
  /** Navigate to a screen */
  navigateToScreen: (_screen: string) => void;
  /** Whether currently in a game */
  isPlaying?: boolean;
  /** Polling interval in milliseconds (default: 1000ms) */
  pollInterval?: number;
}

/**
 * Move focus between interactive elements on the main app, simulating
 * arrow-key navigation similar to Windows File Explorer.
 */
function dispatchDirectionalKey(key: string) {
  const focusableSelector = 'button:not([disabled]), [role="button"], input, select, a, [tabindex]:not([tabindex="-1"])';
  const focusable = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      // Only consider elements visible in the current viewport
      return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
    });

  if (focusable.length === 0) return;
  const active = document.activeElement as HTMLElement;
  const currentIndex = focusable.indexOf(active);

  if (key === 'ArrowDown' || key === 'ArrowUp') {
    let nextIndex: number;
    if (currentIndex === -1) {
      nextIndex = key === 'ArrowDown' ? 0 : focusable.length - 1;
    } else if (key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % focusable.length;
    } else {
      nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
    }
    focusable[nextIndex]?.focus();
    focusable[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
    if (currentIndex === -1) {
      focusable[0]?.focus();
    } else {
      const activeRect = active.getBoundingClientRect();
      const activeCenterY = activeRect.top + activeRect.height / 2;
      let bestIndex = -1;
      let bestDist = Infinity;
      focusable.forEach((el, i) => {
        if (i === currentIndex) return;
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const horizontalDist = key === 'ArrowRight'
          ? (rect.left - activeRect.right)
          : (activeRect.left - rect.right);
        const verticalDist = Math.abs(centerY - activeCenterY);
        if (horizontalDist > 0 && horizontalDist < bestDist && verticalDist < 80) {
          bestDist = horizontalDist;
          bestIndex = i;
        }
      });
      if (bestIndex === -1) {
        // Fallback: move to next/previous
        const nextIndex = key === 'ArrowRight'
          ? (currentIndex + 1) % focusable.length
          : (currentIndex - 1 + focusable.length) % focusable.length;
        focusable[nextIndex]?.focus();
        focusable[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        focusable[bestIndex]?.focus();
        focusable[bestIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  } else if (key === 'Enter') {
    // Activate the currently focused element
    if (active && (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button' || active.tagName === 'A' || active.tagName === 'INPUT')) {
      if (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button' || active.tagName === 'A') {
        active.click();
      }
      // For inputs, focus is already on them
    } else if (focusable.length > 0) {
      // If nothing focused, focus the first element
      focusable[0]?.focus();
    }
  }
}

/**
 * Hook for polling and processing global remote control commands from mobile companions
 *
 * Handles navigation commands like home, library, settings, etc.
 * This should be used at the app root level to handle commands when not in game.
 */
export function useGlobalRemoteControl({
  navigateToScreen,
  isPlaying = false,
  pollInterval = 1000,
}: UseGlobalRemoteControlProps) {
  const isPlayingRef = useRef(isPlaying);
  const lastCommandTimeRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Process a single command
  const processCommand = useCallback((cmd: RemoteCommand) => {
    // Skip if command is too old (more than 5 seconds)
    if (Date.now() - cmd.timestamp > 5000) {
      return;
    }

    // Skip duplicate commands (same timestamp)
    if (cmd.timestamp === lastCommandTimeRef.current) {
      return;
    }
    lastCommandTimeRef.current = cmd.timestamp;

    switch (cmd.type) {
      case 'home':
        navigateToScreen('home');
        break;

      case 'library':
        navigateToScreen('library');
        break;

      case 'settings':
        navigateToScreen('settings');
        break;

      case 'queue':
        navigateToScreen('queue');
        break;

      case 'party':
        navigateToScreen('party');
        break;

      case 'profile':
        navigateToScreen('profile');
        break;

      case 'stop':
      case 'quit':
        navigateToScreen('home');
        break;

      case 'play':
      case 'pause':
      case 'next':
      case 'previous':
      case 'restart':
      case 'skip':
      case 'seek':
      case 'volume':
        if (!isPlayingRef.current && cmd.type === 'play') {
          navigateToScreen('library');
        }
        break;

      case 'up':
        dispatchDirectionalKey('ArrowUp');
        break;

      case 'down':
        dispatchDirectionalKey('ArrowDown');
        break;

      case 'left':
        dispatchDirectionalKey('ArrowLeft');
        break;

      case 'right':
        dispatchDirectionalKey('ArrowRight');
        break;

      case 'enter':
        dispatchDirectionalKey('Enter');
        break;

      // --- New screen navigation commands ---
      case 'highscores':
        navigateToScreen('highscores');
        break;

      case 'achievements':
        navigateToScreen('achievements');
        break;

      case 'jukebox':
        navigateToScreen('jukebox');
        break;

      case 'editor':
        navigateToScreen('editor');
        break;

      case 'dailyChallenge':
        navigateToScreen('dailyChallenge');
        break;

      case 'online':
        navigateToScreen('online');
        break;

      // --- Library search focus (mirror Ctrl+L keyboard shortcut) ---
      case 'focus_search':
        navigateToScreen('library');
        setTimeout(() => {
          const searchInput = document.getElementById('song-search') as HTMLInputElement | null;
          searchInput?.focus();
        }, 200);
        break;

      // --- Random song (mirror Ctrl+R / Ctrl+D keyboard shortcuts) ---
      case 'random_song':
        window.dispatchEvent(new CustomEvent('remote-random-song', { detail: {} }));
        break;

      case 'random_duel':
        window.dispatchEvent(new CustomEvent('remote-random-song', { detail: { mode: 'duel' } }));
        break;

      // --- Queue shortcut (mirror Ctrl+Q keyboard shortcut) ---
      case 'play_queue':
        window.dispatchEvent(new CustomEvent('remote-play-queue', { detail: {} }));
        break;

      // --- Backspace: navigate back from sub-screens ---
      case 'backspace':
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
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

      // --- Volume control via custom events ---
      case 'volume_up':
        window.dispatchEvent(new CustomEvent('remote-volume', { detail: { direction: 'up' } }));
        break;

      case 'volume_down':
        window.dispatchEvent(new CustomEvent('remote-volume', { detail: { direction: 'down' } }));
        break;

      // --- Seek control via custom events ---
      case 'seek_forward':
        window.dispatchEvent(new CustomEvent('remote-seek', { detail: { direction: 'forward' } }));
        break;

      case 'seek_backward':
        window.dispatchEvent(new CustomEvent('remote-seek', { detail: { direction: 'backward' } }));
        break;

      // --- Party mode launchers ---
      case 'start_ptm':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'pass-the-mic' } }));
        }, 300);
        break;

      case 'start_br':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'battle-royale' } }));
        }, 300);
        break;

      case 'start_tournament':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'tournament' } }));
        }, 300);
        break;

      case 'start_missing_words':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'missing-words' } }));
        }, 300);
        break;

      case 'start_blind':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'blind' } }));
        }, 300);
        break;

      case 'start_medley':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'medley' } }));
        }, 300);
        break;

      case 'start_rate_my_song':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'rate-my-song' } }));
        }, 300);
        break;

      case 'start_companion_singalong':
        navigateToScreen('party');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('remote-party-mode', { detail: { mode: 'companion-singalong' } }));
        }, 300);
        break;

      default:
    }
  }, [navigateToScreen]);

  useEffect(() => {
    const pollRemoteCommands = async () => {
      try {
        const response = await fetch('/api/mobile?action=getcommands');
        if (!response.ok) return;
        const data = await response.json();

        if (data.success && data.commands && data.commands.length > 0) {
          for (const cmd of data.commands as RemoteCommand[]) {
            processCommand(cmd);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[GlobalRemoteControl] Error polling remote commands:', error);
      }
    };

    const interval = setInterval(pollRemoteCommands, pollInterval);
    pollRemoteCommands();

    return () => clearInterval(interval);
  }, [processCommand, pollInterval]);
}
