// Safe Dialog Utility for Tauri
// In Tauri v2, the dialog plugin injects JavaScript that overrides window.alert/confirm/prompt.
// On Windows WebView2, these overrides return Promise<boolean> instead of synchronous boolean,
// which breaks try/catch (can't catch async rejections) and makes confirm() always truthy.
//
// DO-NOT-CHANGE: The iframe technique captures the ORIGINAL browser dialog functions BEFORE
// Tauri's dialog plugin overrides them. Without this, we'd get "plugin:dialog|confirm not
// allowed by ACL" errors because the Tauri IPC layer may reject the call mid-flight.

let _originalAlert: ((msg?: string) => void) | null = null;
let _originalConfirm: ((msg?: string) => boolean) | null = null;
let _originalPrompt: ((msg?: string, def?: string) => string | null) | null = null;

// Capture ORIGINAL browser dialogs via a hidden iframe BEFORE Tauri overrides them.
// The iframe's contentWindow has its own, unpatched versions of alert/confirm/prompt.
try {
  if (typeof document !== 'undefined') {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.head.appendChild(iframe);
    const win = iframe.contentWindow!;
    _originalAlert = win.alert.bind(win);
    _originalConfirm = win.confirm.bind(win);
    _originalPrompt = win.prompt.bind(win);
    document.head.removeChild(iframe);
  }
} catch {
  // Fallback: try standard references (may be Tauri-patched, but better than nothing)
  _originalAlert = typeof window !== 'undefined' ? window.alert.bind(window) : null;
  _originalConfirm = typeof window !== 'undefined' ? window.confirm.bind(window) : null;
  _originalPrompt = typeof window !== 'undefined' ? window.prompt.bind(window) : null;
}

/**
 * Safe alert — always synchronous. Falls back to iframe-captured native alert
 * if Tauri's overridden alert throws (e.g., ACL error).
 */
export function safeAlert(message: string): void {
  try {
    alert(message);
  } catch {
    _originalAlert?.(message);
  }
}

/**
 * Safe confirm — ALWAYS async because Tauri's window.confirm returns Promise<boolean>
 * on Windows WebView2. Returns true if user confirmed, false otherwise.
 *
 * DO-NOT-CHANGE: This MUST be async. Making it sync would return a Promise (truthy)
 * and callers' `if (!safeConfirm(...))` cancel branches would NEVER execute.
 */
export async function safeConfirm(message: string): Promise<boolean> {
  try {
    const result = confirm(message) as boolean | Promise<boolean>;
    // Tauri override returns Promise<boolean> — if result is a Promise, await it
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  } catch {
    // Tauri ACL error or plugin failure — fall back to original native dialog
    if (_originalConfirm) {
      return _originalConfirm(message);
    }
    return false;
  }
}

/**
 * Safe prompt — ALWAYS async for the same reason as safeConfirm.
 * Returns user input string, or null if cancelled.
 */
export async function safePrompt(message: string, defaultText?: string): Promise<string | null> {
  try {
    const result = prompt(message, defaultText) as (string | null) | Promise<string | null>;
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  } catch {
    if (_originalPrompt) {
      return _originalPrompt(message, defaultText);
    }
    return null;
  }
}
