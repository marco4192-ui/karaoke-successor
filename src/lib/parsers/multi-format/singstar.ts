/**
 * Multi-Format Import — SingStar Parser
 *
 * KEY=VALUE / NOTE= INI-style lyric files from SingStar exports.
 *
 * Extracted from multi-format-import.ts (R11) — byte-identical blocks,
 * orchestrator re-exports keep the public import path stable.
 */
// ─── SingStar Parser ─────────────────────────────────────────────────

export interface SingStarSongData {
  title: string;
  artist: string;
  genre?: string;
  year?: number;
  notes: Array<{ startTime: number; duration: number; pitch: number; text: string }>;
}

export function parseSingStarData(data: string): SingStarSongData | null {
  try {
    const lines = data.split('\n');
    const songData: Partial<SingStarSongData> = {};
    const notes: SingStarSongData['notes'] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TITLE=')) songData.title = trimmed.slice(6);
      else if (trimmed.startsWith('ARTIST=')) songData.artist = trimmed.slice(7);
      else if (trimmed.startsWith('GENRE=')) songData.genre = trimmed.slice(6);
      else if (trimmed.startsWith('YEAR=')) songData.year = parseInt(trimmed.slice(5));
      else if (trimmed.startsWith('NOTE=')) {
        const parts = trimmed.slice(5).split(',');
        if (parts.length >= 4) {
          notes.push({ startTime: parseInt(parts[0]), duration: parseInt(parts[1]), pitch: parseInt(parts[2]), text: parts[3] ?? '' });
        }
      }
    }

    if (!songData.title || !songData.artist) return null;
    return { ...songData, notes } as SingStarSongData;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.debug('[multi-format-import]: failed to parse SingStar data', error);
    return null;
  }
}
