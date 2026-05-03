'use client';

/**
 * Custom hook for keyboard shortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  // Use a ref to avoid re-registering the event listener on every render
  // when the shortcuts array reference changes (inline construction).
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
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
  }, []); // Stable - reads from ref, no deps needed

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Global keyboard shortcuts for the app
export function useGlobalKeyboardShortcuts(callbacks: {
  onSearch?: () => void;
  onFullscreen?: () => void;
  onLibrary?: () => void;
  onSettings?: () => void;
  onEscape?: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [];

  if (callbacks.onSearch) {
    shortcuts.push({ key: '/', action: callbacks.onSearch, description: 'Search' });
    shortcuts.push({ key: 'k', ctrl: true, action: callbacks.onSearch, description: 'Search (Ctrl+K)' });
  }

  if (callbacks.onFullscreen) {
    shortcuts.push({ key: 'f', action: callbacks.onFullscreen, description: 'Fullscreen' });
  }

  if (callbacks.onLibrary) {
    shortcuts.push({ key: 'l', action: callbacks.onLibrary, description: 'Library' });
  }

  if (callbacks.onSettings) {
    shortcuts.push({ key: ',', ctrl: true, action: callbacks.onSettings, description: 'Settings (Ctrl+,)' });
  }

  if (callbacks.onEscape) {
    shortcuts.push({ key: 'Escape', action: callbacks.onEscape, description: 'Close/Back' });
  }

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
