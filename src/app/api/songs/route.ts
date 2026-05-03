import { NextRequest, NextResponse } from 'next/server';
import { mutableState } from '@/app/api/mobile/mobile-state';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// This endpoint returns songs from the mobile API's cached song library.
// The main app syncs its songs to the mobile API when they change.
// This allows companion apps to access the song library.
//
// NOTE: This endpoint intentionally does NOT use isLocalRequest() because
// companion apps connect from the local network (not localhost).
// Rate limiting is used instead to prevent abuse.

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
