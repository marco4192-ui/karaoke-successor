// ===================== SHARED IN-MEMORY RATE LIMITER =====================
// Per-IP sliding window: tracks request timestamps and rejects if limit exceeded.
// Suitable for local-only / companion-app usage — no Redis/external store needed.
//
// Used by: /api/mobile, /api/songs (and any future API routes).

const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute sliding window

/** Check if a request should be allowed. Returns true if within limit. */
export function checkRateLimit(ip: string, maxRequests: number): boolean {
  const now = Date.now();
  let timestamps = rateLimitMap.get(ip);

  if (!timestamps) {
    rateLimitMap.set(ip, [now]);
    return true;
  }

  // Prune old timestamps outside the window
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);
  rateLimitMap.set(ip, timestamps);

  if (timestamps.length >= maxRequests) {
    return false;
  }

  timestamps.push(now);
  return true;
}

// Periodic cleanup of stale entries (every 5 minutes)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap) {
    const filtered = timestamps.filter(t => now - t < WINDOW_MS);
    if (filtered.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, filtered);
    }
  }
}, 300_000);

// Clean up on module disposal (HMR)
if (typeof globalThis !== 'undefined') {
  const originals = globalThis as Record<string, unknown>;
  originals.__sharedRateLimitCleanup = () => clearInterval(cleanupTimer);
}

/** Extract client IP from NextRequest headers. */
export function getClientIp(request: Request): string {
  const headers = request instanceof Headers ? request : (request as { headers: Headers }).headers;
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headers.get('x-real-ip')
    || 'unknown';
}
