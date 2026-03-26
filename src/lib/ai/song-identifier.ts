// AI Service: Song Identification
// Uses web search and LLM to identify song metadata from filename or lyrics

import { apiClient } from '@/lib/api-client';

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
    const result = await apiClient.identifySong(input, type);

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to identify song' };
    }

    // Cache the result
    if (result.metadata) {
      cache.set(cacheKey, { data: result.metadata as SongMetadata, timestamp: Date.now() });
    }

    return result as IdentifyResult;
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Auto-fill song metadata with AI
 */
export async function autoFillMetadata(
  filename: string,
  currentMetadata?: Partial<SongMetadata>
): Promise<IdentifyResult> {
  // Try to extract from filename first
  const cleanName = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and dashes
    .trim();

  const result = await identifySong(cleanName, 'filename');

  if (result.success && result.metadata) {
    // Merge with existing metadata
    return {
      success: true,
      metadata: {
        ...result.metadata,
        ...currentMetadata, // Keep existing values if AI couldn't determine
      },
    };
  }

  return result;
}

/**
 * Clear the identification cache
 */
export function clearIdentificationCache(): void {
  cache.clear();
}
