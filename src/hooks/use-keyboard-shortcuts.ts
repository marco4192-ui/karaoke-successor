'use client';

/**
 * Unified keyboard shortcut system for Karaoke ZERO
 *
 * All global shortcuts are defined here as a single source of truth.
 * Editor shortcuts remain in use-editor-keyboard-shortcuts.ts.
 * Tap-mode spacebar remains in use-tap-note-placement.ts.
 */

import { useEffect, useCallback, useRef } from 'react';
import type { Screen } from '@/types/screens';
import { t } from '@/lib/i18n/translations';

// ── Types ──────────────────────────────────────────────────────────

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  label: string; // display label for settings
}

// ── Constants: Menu F-key mapping ─────────────────────────────────

const FKEY_SCREEN_MAP: Record<string, Screen> = {
  f1: 'home',
  f2: 'library',
  f3: 'party',
  f4: 'queue',
  f5: 'profile',
  f6: 'highscores',
  f7: 'achievements',
  f8: 'jukebox',
  f9: 'settings',
  f10: 'editor',
};

// ── All shortcut definitions (for settings display) ──────────────

export function getShortcutReference(): Array<{ keys: string; label: string }> {
  return [
    { keys: 'Esc', label: t('keyboardShortcuts.esc') },
    { keys: 'Enter', label: t('keyboardShortcuts.enter') },
    { keys: 'F12', label: t('keyboardShortcuts.f12') },
    { keys: 'F1–F10', label: t('keyboardShortcuts.f1f10') },
    { keys: 'Ctrl+L', label: t('keyboardShortcuts.ctrlL') },
    { keys: 'Ctrl+R', label: t('keyboardShortcuts.ctrlR') },
    { keys: 'Ctrl+D', label: t('keyboardShortcuts.ctrlD') },
    { keys: 'Ctrl+Q', label: t('keyboardShortcuts.ctrlQ') },
    { keys: 'Ctrl+J', label: t('keyboardShortcuts.ctrlJ') },
    { keys: '↑↓←→', label: t('keyboardShortcuts.arrows') },
    { keys: 'Backspace', label: 'Back' },
    { keys: 'Tab', label: 'Navigate' },
  ];
}

// ── Core hook: registers keyboard shortcuts ───────────────────────

function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  useEffect(() => { shortcutsRef.current = shortcuts; }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ── Public API: register all global shortcuts ─────────────────────

interface GlobalShortcutCallbacks {
  // Context info
  screen: Screen;
  isFullscreen: boolean;
  isPartyModeActive: boolean;
  isSongPlaying: boolean;
  isPaused: boolean; // pause dialog is open

  // Actions
  toggleFullscreen: () => void;
  navigateTo: (screen: Screen) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  setPauseDialog: (action: 'song-pause' | 'party-leave' | null) => void;
  focusLibrarySearch: () => void;
  startRandomSong: (mode: 'standard' | 'duel') => void;
  startQueueSong: () => void;
  navigateToJukebox: () => void;
}

export function useGlobalKeyboardShortcuts(cb: GlobalShortcutCallbacks) {
  const shortcuts: KeyboardShortcut[] = [];

  // ── Escape: context-dependent ──
  shortcuts.push({
    key: 'Escape',
    label: 'Esc',
    action: () => {
      // 1. In-game, pause dialog open → resume (close dialog)
      //    For party modes (PTM, CPTM, Medley), just close the dialog —
      //    the mode-specific hook's pauseDialogAction effect handles resume.
      //    For standard game, also call resumeGame().
      if (cb.isPaused && cb.isSongPlaying) {
        if (cb.isPartyModeActive) {
          cb.setPauseDialog(null);
        } else {
          cb.resumeGame();
          cb.setPauseDialog(null);
        }
        return;
      }
      // 2. In-game → pause
      if (cb.screen === 'game') {
        cb.pauseGame();
        cb.setPauseDialog('song-pause');
        return;
      }
      // 3. Party mode, song playing → pause
      if (cb.isPartyModeActive && cb.isSongPlaying) {
        cb.setPauseDialog('song-pause');
        return;
      }
      // 4. Party mode, not playing → leave dialog
      if (cb.isPartyModeActive) {
        cb.setPauseDialog('party-leave');
        return;
      }
      // 5. Any menu (not home) → back to home
      if (cb.screen !== 'home') {
        cb.navigateTo('home');
        return;
      }
      // 6. On home screen → do nothing (Escape should never close the app,
      //    only navigate back through menus up to the start screen)
    },
  });

  // ── Enter: resume game (when pause dialog is open) ──
  shortcuts.push({
    key: 'Enter',
    label: 'Enter',
    action: () => {
      if (cb.isPaused && cb.isSongPlaying) {
        if (cb.isPartyModeActive) {
          cb.setPauseDialog(null);
        } else {
          cb.resumeGame();
          cb.setPauseDialog(null);
        }
      }
    },
  });

  // ── F12: toggle fullscreen ──
  shortcuts.push({
    key: 'F12',
    label: 'F12',
    action: () => cb.toggleFullscreen(),
  });

  // ── F1–F10: menu navigation ──
  for (const [fKey, targetScreen] of Object.entries(FKEY_SCREEN_MAP)) {
    const label = `F${fKey.toUpperCase().replace('F', '')}`;
    shortcuts.push({
      key: fKey,
      label,
      action: () => cb.navigateTo(targetScreen),
    });
  }

  // ── Ctrl+L: focus library search ──
  shortcuts.push({
    key: 'l',
    ctrl: true,
    label: 'Ctrl+L',
    action: () => cb.focusLibrarySearch(),
  });

  // ── Ctrl+R: random song (single-player) ──
  shortcuts.push({
    key: 'r',
    ctrl: true,
    label: 'Ctrl+R',
    action: () => cb.startRandomSong('standard'),
  });

  // ── Ctrl+D: random song (duel) ──
  shortcuts.push({
    key: 'd',
    ctrl: true,
    label: 'Ctrl+D',
    action: () => cb.startRandomSong('duel'),
  });

  // ── Ctrl+Q: play next song from queue ──
  shortcuts.push({
    key: 'q',
    ctrl: true,
    label: 'Ctrl+Q',
    action: () => cb.startQueueSong(),
  });

  // ── Ctrl+J: open jukebox ──
  shortcuts.push({
    key: 'j',
    ctrl: true,
    label: 'Ctrl+J',
    action: () => cb.navigateToJukebox(),
  });

  // ── Escape: context-dependent for sub-screens ──
  // Back from party-setup to party, from editor to library, etc.
  // This is handled above for the global escape, but we also handle
  // Backspace as an alternative "back" key for non-input contexts
  shortcuts.push({
    key: 'Backspace',
    label: 'Backspace',
    action: () => {
      // Back from party-setup to party screen
      if (cb.screen === 'party-setup') {
        cb.navigateTo('party' as Screen);
        return;
      }
      // Back from results to library
      if (cb.screen === 'results') {
        cb.navigateTo('library' as Screen);
        return;
      }
    },
  });

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
}

// ── Arrow key navigation hook ─────────────────────────────────────

/**
 * Provides arrow-key navigation for focusable elements within a container.
 * Up/Down cycle through focusable children; Left/Right are forwarded for
 * horizontal navigation (e.g., tabs, sliders).
 */
export function useArrowKeyNavigation(containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const focusable = container.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const arr = Array.from(focusable);
        const idx = arr.indexOf(document.activeElement as HTMLElement);
        let next: number;
        if (e.key === 'ArrowDown') {
          next = idx < arr.length - 1 ? idx + 1 : 0;
        } else {
          next = idx > 0 ? idx - 1 : arr.length - 1;
        }
        arr[next]?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}
