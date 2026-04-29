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
