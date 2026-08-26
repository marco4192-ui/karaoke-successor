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

      case 'scores':
        // On the results screen, open the highscore modal
        window.dispatchEvent(new CustomEvent('remote-results-action', { detail: { action: 'scores' } }));
        break;

      case 'play_again':
        // On the results screen, trigger play again
        window.dispatchEvent(new CustomEvent('remote-results-action', { detail: { action: 'play_again' } }));
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

      // Companion Playlist: Song zu bestehender Playlist hinzufuegen
      case 'add_to_playlist': {
        try {
          const { addSongToPlaylist } = require('@/lib/playlist-manager');
          const plId = (cmd.data as { playlistId?: string })?.playlistId;
          const sId = (cmd.data as { songId?: string })?.songId;
          if (plId && sId) {
            addSongToPlaylist(plId, sId);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[GlobalRemoteControl] add_to_playlist error:', e);
        }
        break;
      }

      // Companion Playlist: Neue Playlist erstellen und Song hinzufuegen
      case 'create_and_add_to_playlist': {
        try {
          const { createPlaylist, addSongToPlaylist } = require('@/lib/playlist-manager');
          const plName = (cmd.data as { name?: string })?.name;
          const sId = (cmd.data as { songId?: string })?.songId;
          if (plName && sId) {
            const newPl = createPlaylist(plName);
            if (newPl) {
              addSongToPlaylist(newPl.id, sId);
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[GlobalRemoteControl] create_and_add_to_playlist error:', e);
        }
        break;
      }

      // --- Settings tab navigation from companion accordion ---
      // --- Profile toggle, queue clear, jukebox clear ---
      default: {
        // Check for settings_tab:<tabId> pattern
        if (cmd.type.startsWith('settings_tab:')) {
          const tabId = cmd.type.slice('settings_tab:'.length);
          window.dispatchEvent(new CustomEvent('remote-settings-tab', { detail: { tab: tabId } }));
          break;
        }
        // Check for profile_toggle:<id>:<0|1> pattern
        if (cmd.type.startsWith('profile_toggle:')) {
          const parts = cmd.type.slice('profile_toggle:'.length).split(':');
          if (parts.length === 2) {
            window.dispatchEvent(new CustomEvent('remote-profile-toggle', { detail: { profileId: parts[0], isActive: parts[1] === '1' } }));
          }
          break;
        }
        // Check for clear_queue
        if (cmd.type === 'clear_queue') {
          window.dispatchEvent(new CustomEvent('remote-queue-clear', { detail: {} }));
          break;
        }
        // Check for jukebox_clear
        if (cmd.type === 'jukebox_clear') {
          window.dispatchEvent(new CustomEvent('remote-jukebox-clear', { detail: {} }));
          break;
        }
        // DO-NOT-CHANGE: Jukebox Play von Companion App - startet Wiedergabe
        // (bei leerer Wishlist = Random-Musik aus der Bibliothek).
        // Nutzt das bestehende 'jukebox:start' Event aus use-jukebox.ts.
        if (cmd.type === 'jukebox_play') {
          window.dispatchEvent(new CustomEvent('jukebox:start'));
          break;
        }
        // Jukebox companion controls
        if (cmd.type === 'jukebox_stop') {
          window.dispatchEvent(new CustomEvent('jukebox:stop'));
          break;
        }
        if (cmd.type === 'jukebox_toggle_play') {
          window.dispatchEvent(new CustomEvent('jukebox:toggle_play'));
          break;
        }
        if (cmd.type === 'jukebox_next') {
          window.dispatchEvent(new CustomEvent('jukebox:next'));
          break;
        }
        if (cmd.type === 'jukebox_prev') {
          window.dispatchEvent(new CustomEvent('jukebox:prev'));
          break;
        }
        if (cmd.type === 'jukebox_shuffle') {
          window.dispatchEvent(new CustomEvent('jukebox:shuffle'));
          break;
        }
        if (cmd.type === 'jukebox_repeat') {
          window.dispatchEvent(new CustomEvent('jukebox:repeat'));
          break;
        }
        if (cmd.type === 'jukebox_volume_up') {
          window.dispatchEvent(new CustomEvent('jukebox:volume_up'));
          break;
        }
        if (cmd.type === 'jukebox_volume_down') {
          window.dispatchEvent(new CustomEvent('jukebox:volume_down'));
          break;
        }
        if (cmd.type === 'jukebox_lyrics_toggle') {
          window.dispatchEvent(new CustomEvent('jukebox:lyrics_toggle'));
          break;
        }
        if (cmd.type === 'jukebox_playlist_toggle') {
          window.dispatchEvent(new CustomEvent('jukebox:playlist_toggle'));
          break;
        }
        // Party cancel: companion left party-setup, reset party state on desktop
        if (cmd.type === 'party_cancel') {
          window.dispatchEvent(new CustomEvent('remote-party-cancel', { detail: {} }));
          break;
        }
        // Check for party_apply_config:<json> pattern
        if (cmd.type.startsWith('party_apply_config:')) {
          const jsonStr = cmd.type.slice('party_apply_config:'.length);
          try {
            const config = JSON.parse(decodeURIComponent(jsonStr));
            window.dispatchEvent(new CustomEvent('remote-party-apply-config', { detail: config }));
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[GlobalRemoteControl] Failed to parse party_apply_config:', e);
          }
          break;
        }
        // Check for party_difficulty:<level> pattern
        if (cmd.type.startsWith('party_difficulty:')) {
          const level = cmd.type.slice('party_difficulty:'.length);
          window.dispatchEvent(new CustomEvent('remote-party-difficulty', { detail: { difficulty: level } }));
          break;
        }
        // Check for party_start
        if (cmd.type === 'party_start') {
          window.dispatchEvent(new CustomEvent('remote-party-start', { detail: {} }));
          break;
        }
        // Check for party_vote:<songId> pattern
        // Companion voted for a song in the party voting screen
        if (cmd.type.startsWith('party_vote:')) {
          const songId = cmd.type.slice('party_vote:'.length);
          window.dispatchEvent(new CustomEvent('remote-party-vote', { detail: { songId } }));
          break;
        }
        // Check for party_select_song:<songId> pattern
        // Companion selected a song from library during party mode
        if (cmd.type.startsWith('party_select_song:')) {
          const songId = cmd.type.slice('party_select_song:'.length);
          window.dispatchEvent(new CustomEvent('remote-party-select-song', { detail: { songId } }));
          break;
        }
        // Song preview from companion: play a short audio preview on desktop speakers
        if (cmd.type.startsWith('song_preview:')) {
          const songId = cmd.type.slice('song_preview:'.length);
          window.dispatchEvent(new CustomEvent('remote-song-preview', { detail: { songId } }));
          break;
        }
        // Song preview stop from companion
        if (cmd.type === 'song_preview_stop') {
          window.dispatchEvent(new CustomEvent('remote-song-preview-stop', { detail: {} }));
          break;
        }
        // Check for settings_set:<url-encoded key>:<url-encoded value> pattern
        // Companion App: aendert eine Einstellung direkt im Desktop-LocalStorage
        if (cmd.type.startsWith('settings_set:')) {
          try {
            const rest = cmd.type.slice('settings_set:'.length);
            const colonIdx = rest.lastIndexOf(':');
            if (colonIdx > 0) {
              const rawKey = decodeURIComponent(rest.slice(0, colonIdx));
              const rawVal = decodeURIComponent(rest.slice(colonIdx + 1));
              localStorage.setItem(rawKey, rawVal);
              window.dispatchEvent(new CustomEvent('settingsChange', {
                detail: { companionSetting: true, key: rawKey, value: rawVal },
              }));
              // Theme-Aenderung: auch themeChange-Event ausloesen
              if (rawKey === 'karaoke-theme') {
                window.dispatchEvent(new CustomEvent('themeChange', { detail: rawVal }));
              }
              // Sprache: Seite neu laden fuer i18n
              if (rawKey === 'karaoke-language') {
                window.location.reload();
              }
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('[GlobalRemoteControl] Failed to process settings_set:', e);
          }
          break;
        }
      }
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
