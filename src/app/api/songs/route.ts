import { NextResponse } from 'next/server';
import { getAllSongs } from '@/lib/game/song-library';

export async function GET() {
  try {
    // Get all songs (sample + custom/imported songs)
    const allSongs = getAllSongs();
    
    // Return simplified song data for mobile client
    const simplifiedSongs = allSongs.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      genre: song.genre,
      language: song.language,
      coverImage: song.coverImage,
    }));
    
    console.log('[API /songs] Returning', simplifiedSongs.length, 'songs');
    
    return NextResponse.json({ 
      success: true, 
      songs: simplifiedSongs,
      count: simplifiedSongs.length,
    });
  } catch (error) {
    console.error('Error fetching songs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch songs' },
      { status: 500 }
    );
  }
}
