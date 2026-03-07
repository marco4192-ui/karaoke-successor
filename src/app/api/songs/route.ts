import { NextResponse } from 'next/server';
import { getAllSongsAsync } from '@/lib/game/song-library';

export async function GET() {
  try {
    const songs = await getAllSongsAsync();
    
    // Return simplified song data for mobile client
    const simplifiedSongs = songs.map(song => ({
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
