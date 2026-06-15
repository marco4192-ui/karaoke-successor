// AI Metadata Enrichment Client
// Provides functions to suggest missing genre/language and harmonize existing values.

import { t } from '@/lib/i18n/translations';

export interface MetadataSuggestion {
  songId: string;
  field: 'genre' | 'language';
  suggested: string;
  confidence: number;
  reason?: string;
}

interface EnrichResponse {
  success: boolean;
  suggestions?: MetadataSuggestion[];
  error?: string;
}

/**
 * Send songs to the AI for metadata enrichment or harmonization.
 * @param songs - Array of songs with at least id, title, artist
 * @param mode - 'enrich' fills missing values, 'harmonize' normalizes existing values
 * @param onProgress - Optional callback for progress updates (batch number)
 */
export async function enrichSongMetadata(
  songs: Array<{ id: string; title: string; artist: string; genre?: string; language?: string }>,
  mode: 'enrich' | 'harmonize',
  onProgress?: (_batchNum: number, _totalBatches: number) => void,
): Promise<EnrichResponse> {
  try {
    const response = await fetch('/api/metadata-enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songs, mode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || t('ai.metadataEnrich.serverError').replace('{status}', String(response.status)) };
    }

    const data: EnrichResponse = await response.json();
    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[MetadataEnrich] Request failed:', error);
    return { success: false, error: t('ai.metadataEnrich.networkError') };
  }
}
