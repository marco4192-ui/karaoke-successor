// AI Service: Cover Art Generator
// Generates album cover art using AI

export interface CoverGenOptions {
  title: string;
  artist: string;
  genre?: string;
  style?: 'modern' | 'vintage' | 'minimalist' | 'artistic' | 'neon' | 'retro';
}

export interface CoverGenResult {
  success: boolean;
  image?: string; // base64 PNG
  error?: string;
}

/**
 * Generate cover art for a song
 */
export async function generateCoverArt(options: CoverGenOptions): Promise<CoverGenResult> {
  try {
    const response = await fetch('/api/cover-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: options.title,
        artist: options.artist,
        genre: options.genre || 'pop',
        style: options.style || 'modern',
      }),
    });

    if (!response.ok) {
      let error = 'Failed to generate cover';
      try {
        const errorData = await response.json();
        error = errorData.error || error;
      } catch {
        // Error body is not valid JSON
      }
      return { success: false, error };
    }

    const result = await response.json();
    
    return {
      success: true,
      image: result.image,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
