import { NextResponse } from 'next/server';
import { mutableState } from '@/app/api/mobile/mobile-state';

// This endpoint returns songs from the mobile API's cached song library.
// The main app syncs its songs to the mobile API when they change.
// This allows companion apps to access the song library.

export async function GET() {
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
