// Keyboard Shortcuts System
export interface KeyboardShortcut {
  id: string;
  key: string;
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  category: 'navigation' | 'gameplay' | 'audio' | 'system';
  isGlobal: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  { id: 'nav-home', key: 'h', modifiers: ['ctrl'], action: 'navigate:home', description: 'Go to Home', category: 'navigation', isGlobal: true },
  { id: 'nav-library', key: 'l', modifiers: ['ctrl'], action: 'navigate:library', description: 'Go to Library', category: 'navigation', isGlobal: true },
  { id: 'nav-party', key: 'p', modifiers: ['ctrl'], action: 'navigate:party', description: 'Go to Party Mode', category: 'navigation', isGlobal: true },
  { id: 'nav-queue', key: 'q', modifiers: ['ctrl'], action: 'navigate:queue', description: 'Go to Queue', category: 'navigation', isGlobal: true },
  { id: 'nav-highscores', key: 's', modifiers: ['ctrl'], action: 'navigate:highscores', description: 'Go to Highscores', category: 'navigation', isGlobal: true },
  { id: 'nav-settings', key: ',', modifiers: ['ctrl'], action: 'navigate:settings', description: 'Open Settings', category: 'navigation', isGlobal: true },
  
  // Gameplay
  { id: 'game-start', key: 'Enter', modifiers: [], action: 'game:start', description: 'Start Game', category: 'gameplay', isGlobal: false },
  { id: 'game-pause', key: 'Escape', modifiers: [], action: 'game:pause', description: 'Pause/Resume', category: 'gameplay', isGlobal: false },
  { id: 'game-restart', key: 'r', modifiers: ['ctrl'], action: 'game:restart', description: 'Restart Song', category: 'gameplay', isGlobal: false },
  { id: 'game-skip', key: 'n', modifiers: ['ctrl'], action: 'game:skip', description: 'Skip to Next Song', category: 'gameplay', isGlobal: false },
  { id: 'game-star-power', key: ' ', modifiers: [], action: 'game:starPower', description: 'Activate Star Power', category: 'gameplay', isGlobal: false },
  { id: 'game-back', key: 'Backspace', modifiers: [], action: 'game:back', description: 'Back to Library', category: 'gameplay', isGlobal: false },
  
  // Audio
  { id: 'audio-mute', key: 'm', modifiers: [], action: 'audio:mute', description: 'Mute/Unmute', category: 'audio', isGlobal: true },
  { id: 'audio-vol-up', key: 'ArrowUp', modifiers: ['ctrl'], action: 'audio:volumeUp', description: 'Volume Up', category: 'audio', isGlobal: true },
  { id: 'audio-vol-down', key: 'ArrowDown', modifiers: ['ctrl'], action: 'audio:volumeDown', description: 'Volume Down', category: 'audio', isGlobal: true },
  { id: 'audio-playback-slower', key: '-', modifiers: ['ctrl'], action: 'audio:playbackSlower', description: 'Slow Down', category: 'audio', isGlobal: false },
  { id: 'audio-playback-faster', key: '=', modifiers: ['ctrl'], action: 'audio:playbackFaster', description: 'Speed Up', category: 'audio', isGlobal: false },
  { id: 'audio-playback-normal', key: '0', modifiers: ['ctrl'], action: 'audio:playbackNormal', description: 'Normal Speed', category: 'audio', isGlobal: false },
  
  // System
  { id: 'sys-fullscreen', key: 'f', modifiers: [], action: 'system:fullscreen', description: 'Toggle Fullscreen', category: 'system', isGlobal: true },
  { id: 'sys-screenshot', key: 's', modifiers: ['ctrl', 'shift'], action: 'system:screenshot', description: 'Take Screenshot', category: 'system', isGlobal: true },
  { id: 'sys-help', key: '?', modifiers: ['shift'], action: 'system:help', description: 'Show Help', category: 'system', isGlobal: true },
];

export interface KeyboardShortcutHandler {
  (action: string, event: KeyboardEvent): void;
}

export class KeyboardShortcutManager {
  private handlers: Map<string, KeyboardShortcutHandler[]> = new Map();
  private enabled: boolean = true;
  private lastKeyTime: number = 0;
  private keySequence: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    // Ignore if typing in input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchingShortcut = KEYBOARD_SHORTCUTS.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      const modifiersMatch = 
        (shortcut.modifiers.includes('ctrl') === (event.ctrlKey || event.metaKey)) &&
        (shortcut.modifiers.includes('alt') === event.altKey) &&
        (shortcut.modifiers.includes('shift') === event.shiftKey);

      return keyMatches && modifiersMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      this.executeAction(matchingShortcut.action, event);
    }

    // Track key sequences for combos
    this.trackKeySequence(event.key);
  }

  private executeAction(action: string, event: KeyboardEvent): void {
    const handlers = this.handlers.get(action) || [];
    handlers.forEach(handler => handler(action, event));
  }

  private trackKeySequence(key: string): void {
    const now = Date.now();
    
    // Reset sequence if too much time passed
    if (now - this.lastKeyTime > 1000) {
      this.keySequence = [];
    }
    
    this.keySequence.push(key);
    this.lastKeyTime = now;
    
    // Keep only last 10 keys
    if (this.keySequence.length > 10) {
      this.keySequence.shift();
    }
  }

  on(action: string, handler: KeyboardShortcutHandler): () => void {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, []);
    }
    this.handlers.get(action)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(action) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    };
  }

  off(action: string, handler?: KeyboardShortcutHandler): void {
    if (handler) {
      const handlers = this.handlers.get(action) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.handlers.delete(action);
    }
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getKeySequence(): string[] {
    return [...this.keySequence];
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
    this.handlers.clear();
  }
}

// Global shortcut manager instance
export const shortcutManager = typeof window !== 'undefined' 
  ? new KeyboardShortcutManager() 
  : null;

// Helper hook for React
export function useKeyboardShortcut(action: string, handler: KeyboardShortcutHandler): void {
  // This would be implemented in a React hook file
  // For now it's just a type signature
}

// Format shortcut for display
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.modifiers.includes('ctrl')) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.modifiers.includes('alt')) {
    parts.push(navigator.platform.includes('Mac') ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers.includes('shift')) {
    parts.push(navigator.platform.includes('Mac') ? '⇧' : 'Shift');
  }
  
  // Format key name
  let keyName = shortcut.key;
  if (shortcut.key === 'ArrowUp') keyName = '↑';
  else if (shortcut.key === 'ArrowDown') keyName = '↓';
  else if (shortcut.key === 'ArrowLeft') keyName = '←';
  else if (shortcut.key === 'ArrowRight') keyName = '→';
  else if (shortcut.key === 'Enter') keyName = '↵';
  else if (shortcut.key === 'Escape') keyName = 'Esc';
  else if (shortcut.key === ' ') keyName = 'Space';
  else if (shortcut.key === 'Backspace') keyName = '⌫';
  
  parts.push(keyName);
  
  return parts.join(' + ');
}
