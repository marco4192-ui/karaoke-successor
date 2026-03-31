import { NextResponse } from 'next/server';
import { getAllSongs, getCustomSongs } from '@/lib/game/song-library';

export async function GET() {
  try {
    // Get both sample songs and custom/imported songs
    const sampleSongs = getAllSongs();
    const customSongs = getCustomSongs();
    
    // Combine all songs
    const allSongs = [...sampleSongs, ...customSongs];
    
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
