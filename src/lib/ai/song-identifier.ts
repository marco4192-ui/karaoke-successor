// AI Service: Song Identification
// Uses web search and LLM to identify song metadata from filename or lyrics

export interface SongMetadata {
  title: string;
  artist: string;
  year?: number;
  genre?: string;
  bpm?: number;
  language?: string;
  confidence: number; // 0-100
}

export interface IdentifyResult {
  success: boolean;
  metadata?: SongMetadata;
  error?: string;
}

// Cache for repeated requests
const cache = new Map<string, { data: SongMetadata; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Identify a song from filename or lyrics snippet
 */
export async function identifySong(
  input: string,
  type: 'filename' | 'lyrics' = 'filename'
): Promise<IdentifyResult> {
  // Check cache
  const cacheKey = `${type}:${input}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { success: true, metadata: cached.data };
  }

  try {
    const response = await fetch('/api/song-identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to identify song' };
    }

    const result = await response.json();
    
    // Cache the result
    if (result.metadata) {
      cache.set(cacheKey, { data: result.metadata, timestamp: Date.now() });
    }

    return result;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
