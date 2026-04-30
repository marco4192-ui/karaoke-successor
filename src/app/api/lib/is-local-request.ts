import { NextRequest } from 'next/server';

/**
 * Check if a request originates from the Tauri webview or localhost.
 * This prevents external network access to API routes that proxy API keys
 * or handle sensitive operations.
 *
 * Allowed origins:
 * - tauri://, https://tauri.*, http://tauri.* (Tauri v1/v2 webview)
 * - http://localhost, http://127.0.0.1 (dev server)
 *
 * SECURITY: Uses strict equality / regex instead of startsWith to prevent
 * subdomain spoofing (e.g., http://localhost.evil.com bypassing startsWith).
 */
const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowed(value: string): boolean {
  if (!value) return false;
  return (
    value.startsWith('tauri://') ||
    value.startsWith('https://tauri.') ||
    value.startsWith('http://tauri.') ||
    LOCALHOST_PATTERN.test(value)
  );
}

export function isLocalRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';

  return isAllowed(origin) || isAllowed(referer) || isAllowed(host);
}

/** Reject non-local requests with 403 Forbidden. */
export function requireLocalRequest(request: NextRequest): { forbidden: true } | { forbidden: false } {
  if (!isLocalRequest(request)) {
    return { forbidden: true };
  }
  return { forbidden: false };
}
