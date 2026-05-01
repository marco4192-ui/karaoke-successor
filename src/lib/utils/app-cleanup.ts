/**
 * Centralized app cleanup manager for beforeunload.
 *
 * In Tauri, closing the window triggers `beforeunload` on the webview.
 * This utility provides a single registry for synchronous cleanup callbacks
 * that MUST run before the page unloads (e.g. stopping media streams,
 * cancelling animation frames, revoking blob URLs).
 *
 * Usage:
 *   import { registerCleanup, runAllCleanup } from '@/lib/utils/app-cleanup';
 *   registerCleanup('my-resource', () => { stream.getTracks().forEach(t => t.stop()); });
 *
 * Async cleanup (fire-and-forget, best-effort):
 *   registerCleanup('my-audio-ctx', () => { ctx.close().catch(() => {}); });
 */

type CleanupFn = () => void;

const cleanupRegistry = new Map<string, CleanupFn>();
let beforeUnloadRegistered = false;

/** Register a synchronous cleanup callback. Overwrites any previous callback with the same key. */
export function registerCleanup(key: string, fn: CleanupFn): void {
  cleanupRegistry.set(key, fn);

  // Lazily register beforeunload listener on first registration
  if (!beforeUnloadRegistered && typeof window !== 'undefined') {
    beforeUnloadRegistered = true;
    window.addEventListener('beforeunload', runAllCleanup);
  }
}

/** Remove a cleanup callback by key. */
export function unregisterCleanup(key: string): void {
  cleanupRegistry.delete(key);
}

/**
 * Run all registered cleanup callbacks synchronously.
 * Called automatically on beforeunload, but can also be called manually (e.g. in tests).
 */
export function runAllCleanup(): void {
  for (const [, fn] of cleanupRegistry) {
    try {
      fn();
    } catch (e) {
      console.warn('Cleanup callback failed:', e);
    }
  }
  cleanupRegistry.clear();
}

/** Get the number of registered cleanup callbacks (useful for debugging). */
export function getCleanupCount(): number {
  return cleanupRegistry.size;
}
