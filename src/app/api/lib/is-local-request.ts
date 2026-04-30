import { NextRequest } from 'next/server';

/**
 * Check if a request originates from the Tauri webview or localhost.
 * This prevents external network access to API routes that proxy API keys
 * or handle sensitive operations.
 *
 * Allowed origins:
 * - tauri://, https://tauri.*, http://tauri.* (Tauri v1/v2 webview)
 * - http://localhost, http://127.0.0.1 (dev server)
 */
export function isLocalRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';

  const isAllowed = (value: string) =>
    value.startsWith('tauri://') ||
    value.startsWith('https://tauri.') ||
    value.startsWith('http://tauri.') ||
    value.startsWith('http://localhost') ||
    value.startsWith('http://127.0.0.1');

  return isAllowed(origin) || isAllowed(referer) || isAllowed(host);
}

/** Reject non-local requests with 403 Forbidden. */
export function requireLocalRequest(request: NextRequest): { forbidden: true } | { forbidden: false } {
  if (!isLocalRequest(request)) {
    return { forbidden: true };
  }
  return { forbidden: false };
}
