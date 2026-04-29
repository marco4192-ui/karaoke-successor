import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from './get-handlers';
import { handlePostRequest } from './post-handlers';

// ===================== SIMPLE IN-MEMORY RATE LIMITER =====================
// Per-IP sliding window: tracks request timestamps and rejects if limit exceeded.
// Suitable for local-only Tauri usage — no Redis/external store needed.

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000; // 1 minute window

/** Check if a request should be rate-limited. Returns true if allowed. */
function checkRateLimit(ip: string, maxRequests: number): boolean {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return true;
  }

  // Prune old timestamps outside the window
  entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);

  if (entry.timestamps.length >= maxRequests) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) rateLimitMap.delete(ip);
  }
}, 300_000);

// ===================== ROUTE HANDLERS =====================

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  // Rate-limit connect and setpitch to prevent abuse
  if (action === 'connect') {
    if (!checkRateLimit(ip, 10)) {
      return NextResponse.json(
        { success: false, message: 'Too many connection attempts. Please wait a minute.' },
        { status: 429 },
      );
    }
  }

  return handleGetRequest(request);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate-limit setpitch (most frequent POST from companions)
  if (!checkRateLimit(ip, 300)) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  return handlePostRequest(request);
}
