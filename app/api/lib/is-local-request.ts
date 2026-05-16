import { NextRequest } from 'next/server';

/**
 * Check if a request originates from the Tauri webview or localhost.
 * This prevents external network access to API routes that proxy API keys
 * or handle sensitive operations.
 *
 * Allowed origins:
 * - tauri://localhost (Tauri v1 webview)
 * - https://tauri.localhost, http://tauri.localhost (Tauri v2 webview)
 * - http://localhost, http://127.0.0.1 (dev server)
 *
 * SECURITY: Uses strict regex matching instead of startsWith to prevent
 * subdomain spoofing (e.g., https://tauri.evil.com would bypass startsWith).
 */
const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const TAURI_V1_PATTERN = /^tauri:\/\/localhost$/;
const TAURI_V2_PATTERN = /^https?:\/\/tauri\.localhost(:\d+)?$/;

function isAllowed(value: string): boolean {
  if (!value) return false;
  return (
    TAURI_V1_PATTERN.test(value) ||
    TAURI_V2_PATTERN.test(value) ||
    LOCALHOST_PATTERN.test(value)
  );
}

export function isLocalRequest(request: NextRequest): boolean {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';

  return isAllowed(origin) || isAllowed(referer) || isAllowed(host);
}
