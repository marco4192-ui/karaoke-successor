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

// Genre-specific visual themes
export const GENRE_THEMES: Record<string, string> = {
  pop: 'bright colors, clean design, modern aesthetic',
  rock: 'bold, gritty, electric energy, dark tones',
  'hip-hop': 'urban, street art style, bold typography',
  'r&b': 'smooth gradients, soulful vibes, elegant',
  country: 'warm tones, rustic, americana elements',
  electronic: 'neon lights, futuristic, digital art',
  jazz: 'classic, sophisticated, art deco elements',
  classical: 'elegant, timeless, minimalist',
  latin: 'vibrant, tropical, energetic',
  'k-pop': 'colorful, trendy, polished',
  metal: 'dark, intense, dramatic',
  indie: 'artistic, unique, lo-fi aesthetic',
  soul: 'warm, emotive, vintage feel',
  disco: 'glittery, retro 70s, funky',
  reggae: 'rasta colors, tropical, laid back',
};

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
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to generate cover' };
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

/**
 * Generate a cover with genre-specific styling
 */
export async function generateGenreCover(
  title: string,
  artist: string,
  genre: string
): Promise<CoverGenResult> {
  return generateCoverArt({
    title,
    artist,
    genre,
    style: getStyleForGenre(genre),
  });
}

/**
 * Get recommended style based on genre
 */
function getStyleForGenre(genre: string): CoverGenOptions['style'] {
  const genreStyleMap: Record<string, CoverGenOptions['style']> = {
    pop: 'modern',
    rock: 'artistic',
    'hip-hop': 'modern',
    'r&b': 'artistic',
    country: 'vintage',
    electronic: 'neon',
    jazz: 'vintage',
    classical: 'minimalist',
    latin: 'modern',
    'k-pop': 'neon',
    metal: 'artistic',
    indie: 'artistic',
    soul: 'vintage',
    disco: 'retro',
    reggae: 'retro',
  };

  const lowerGenre = genre.toLowerCase();
  for (const [key, style] of Object.entries(genreStyleMap)) {
    if (lowerGenre.includes(key)) {
      return style;
    }
  }

  return 'modern';
}

/**
 * Save generated cover to IndexedDB
 */
export async function saveCoverToSong(songId: string, base64Image: string): Promise<boolean> {
  try {
    // Convert base64 to Blob
    const response = await fetch(`data:image/png;base64,${base64Image}`);
    const blob = await response.blob();

    // Store using the existing media-db
    const { storeMedia } = await import('@/lib/db/media-db');
    await storeMedia(songId, 'cover', blob);

    return true;
  } catch (error) {
    console.error('Failed to save cover:', error);
    return false;
  }
}
