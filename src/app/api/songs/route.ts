import { NextResponse } from 'next/server';

// This endpoint returns songs from the mobile API's cached song library
// The main app syncs its songs to the mobile API when they change
// This allows companion apps to access the song library

export async function GET() {
  try {
    // Fetch songs from the mobile API's cache
    const response = await fetch('http://localhost:3000/api/mobile?action=getsongs');
    const data = await response.json();
    
    if (data.success) {
      console.log('[API /songs] Returning', data.songs?.length || 0, 'songs from cache');
      return NextResponse.json({ 
        success: true, 
        songs: data.songs || [],
        count: data.songs?.length || 0,
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      songs: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}
