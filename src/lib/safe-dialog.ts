// Safe Dialog Utility for Tauri
// In Tauri v2, window.alert/confirm/prompt are overridden by the dialog plugin.
// If ACL permissions aren't configured correctly, these calls throw errors.
// This module provides safe wrappers with fallback to browser-native dialogs.

// Store original browser dialogs before Tauri overrides them
const _nativeAlert = typeof window !== 'undefined' ? window.alert.bind(window) : null;
const _nativeConfirm = typeof window !== 'undefined' ? window.confirm.bind(window) : null;
const _nativePrompt = typeof window !== 'undefined' ? window.prompt.bind(window) : null;

/**
 * Safe alert that falls back to native browser alert if Tauri dialog fails.
 */
export function safeAlert(message: string): void {
  try {
    alert(message);
  } catch (e) {
    // Tauri dialog plugin failed (ACL error, etc.) — fall back to native
    console.warn('[SafeDialog] alert() failed, using native fallback:', e);
    _nativeAlert?.(message);
  }
}

/**
 * Safe confirm that falls back to native browser confirm if Tauri dialog fails.
 */
export function safeConfirm(message: string): boolean {
  try {
    return confirm(message);
  } catch (e) {
    // Tauri dialog plugin failed (ACL error, etc.) — fall back to native
    console.warn('[SafeDialog] confirm() failed, using native fallback:', e);
    return _nativeConfirm?.(message) ?? false;
  }
}

/**
 * Safe prompt that falls back to native browser prompt if Tauri dialog fails.
 */
export function safePrompt(message: string, defaultText?: string): string | null {
  try {
    return prompt(message, defaultText);
  } catch (e) {
    // Tauri dialog plugin failed (ACL error, etc.) — fall back to native
    console.warn('[SafeDialog] prompt() failed, using native fallback:', e);
    return _nativePrompt?.(message, defaultText) ?? null;
  }
}
