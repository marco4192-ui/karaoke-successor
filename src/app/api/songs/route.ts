import { NextRequest, NextResponse } from 'next/server';
import { mutableState } from '@/app/api/mobile/mobile-state';

// This endpoint returns songs from the mobile API's cached song library.
// The main app syncs its songs to the mobile API when they change.
// This allows companion apps to access the song library.
//
// NOTE: This endpoint intentionally does NOT use isLocalRequest() because
// companion apps connect from the local network (not localhost).
// Rate limiting is used instead to prevent abuse.

// Simple in-memory rate limiter (same pattern as /api/mobile)
const rateLimitMap = new Map<string, number[]>();
const WINDOW_MS = 60_000;

// Periodic cleanup of stale entries (every 5 minutes)
const rateLimitCleanupTimer = setInterval(() => {
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
  originals.__songsRateLimitCleanup = () => clearInterval(rateLimitCleanupTimer);
}

function checkRateLimit(ip: string, maxPerWindow: number): boolean {
  const now = Date.now();
  let timestamps = rateLimitMap.get(ip);
  if (!timestamps) {
    rateLimitMap.set(ip, [now]);
    return true;
  }
  timestamps = timestamps.filter(t => now - t < WINDOW_MS);
  rateLimitMap.set(ip, timestamps);
  if (timestamps.length >= maxPerWindow) return false;
  timestamps.push(now);
  return true;
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // 30 requests per minute — generous for companion apps but prevents scraping
  if (!checkRateLimit(ip, 30)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Please wait a minute.' },
      { status: 429 },
    );
  }

  try {
    const songs = mutableState.songLibrary;

    return NextResponse.json({
      success: true,
      songs,
      count: songs.length,
    });
  } catch (error) {
    console.error('Error reading songs from cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read songs' },
      { status: 500 }
    );
  }
}
