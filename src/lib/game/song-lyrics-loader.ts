// Lyrics loading — on-demand lyrics from IndexedDB and filesystem
import type { Song, LyricLine } from '@/types/game';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import { getTxtContent, storeMedia, getMedia } from '@/lib/db/media-db';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { isAbsolutePath, resolveSongsBaseFolder } from './song-paths';
import { normalizeTxtContent } from '@/lib/utils';

/**
 * Load lyrics on-demand from IndexedDB or filesystem.
 * This is used when a song is played and the lyrics weren't stored in localStorage.
 */
export async function loadSongLyrics(song: Song): Promise<LyricLine[]> {
  // If lyrics are already loaded, return them
  if (song.lyrics && song.lyrics.length > 0) {
    return song.lyrics;
  }

  // Strategy 1: Load from IndexedDB if storedTxt flag is set
  if (song.storedTxt) {
    try {
      const txtContent = await getTxtContent(song.id);
      if (txtContent && txtContent.length > 0) {
        const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
        if (parsedLyrics.length > 0) {
          return parsedLyrics;
        }
      } else {
        console.warn('[SongLibrary] TXT content is null or empty for song:', song.id, '- falling through to file system');
      }
    } catch (error) {
      console.error('[SongLibrary] Failed to load lyrics from IndexedDB:', error, '- falling through to file system');
    }
  }

  // Strategy 2: Load directly from file system in Tauri using native command (bypass ACL)
  if (song.relativeTxtPath && typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
    try {
      const { nativeReadFileText } = await import('@/lib/native-fs');

      // Use shared utility to resolve the effective base folder
      const songsFolder = resolveSongsBaseFolder(song.baseFolder);

      if (songsFolder) {
        const normalizedFolder = normalizeFilePath(songsFolder);
        const normalizedTxtPath = normalizeFilePath(song.relativeTxtPath || '');

        // CRITICAL FIX: If relativeTxtPath is actually an absolute path (e.g. stored
        // incorrectly as full path instead of relative), use it directly instead of
        // concatenating — otherwise paths would double: "baseFolder/absolutePath"
        const txtPathIsAbsolute = isAbsolutePath(normalizedTxtPath);

        const filePath = txtPathIsAbsolute
          ? normalizedTxtPath
          : `${normalizedFolder}/${normalizedTxtPath}`;

        const txtContent = await nativeReadFileText(filePath);

        if (txtContent && txtContent.length > 0) {
          const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
          if (parsedLyrics.length > 0) {
            // Cache in IndexedDB for future use
            try {
              const txtBlob = new Blob([txtContent], { type: 'text/plain' });
              await storeMedia(song.id, 'txt', txtBlob);
            } catch (cacheErr) {
              console.warn('[SongLibrary] Failed to cache TXT:', cacheErr);
            }
            return parsedLyrics;
          }
        }
      } else {
        // No base folder, but relativeTxtPath might be absolute — try it directly
        const normalizedTxtPath = normalizeFilePath(song.relativeTxtPath || '');

        if (isAbsolutePath(normalizedTxtPath)) {
          try {
            const txtContent = await nativeReadFileText(normalizedTxtPath);
            if (txtContent && txtContent.length > 0) {
              const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
              if (parsedLyrics.length > 0) {
                try {
                  const txtBlob = new Blob([txtContent], { type: 'text/plain' });
                  await storeMedia(song.id, 'txt', txtBlob);
                } catch {}
                return parsedLyrics;
              }
            }
          } catch (e) {
            console.warn('[SongLibrary] Failed to load TXT from absolute path:', e);
          }
        }
        console.warn('[SongLibrary] No songs folder available for loading TXT');
      }
    } catch (error) {
      console.error('[SongLibrary] Failed to load lyrics from file system:', error);
    }
  }

  // Strategy 3: Try to load from stored media in IndexedDB with different key format
  if (song.storedTxt) {
    try {
      // Try with original ID
      let blob = await getMedia(song.id, 'txt');

      // Try with scanned- prefix stripped
      if (!blob && song.id.startsWith('scanned-')) {
        const altId = song.id.replace('scanned-', '');
        blob = await getMedia(altId, 'txt');
      }

      if (blob && blob.size > 0) {
        const txtContent = await blob.text();
        if (txtContent && txtContent.length > 0) {
          const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
          if (parsedLyrics.length > 0) {
            return parsedLyrics;
          }
        }
      }
    } catch (error) {
      console.error('[SongLibrary] Alternative IndexedDB lookup failed:', error);
    }
  }

  console.warn('[SongLibrary] Could not load lyrics for song:', song.id);
  return [];
}

// Parse UltraStar TXT content to lyrics
// IMPORTANT: Don't trim lines or lyrics - trailing spaces are significant for word boundaries
function parseUltraStarTxtContent(content: string, gap: number, bpm: number): LyricLine[] {
  const cleanContent = normalizeTxtContent(content);

  const lines = cleanContent.split('\n').filter(l => l.trim().length > 0);
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | undefined = undefined;
  let noteLineCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === 'P1' || trimmedLine === 'P1:') { currentPlayer = 'P1'; continue; }
    if (trimmedLine === 'P2' || trimmedLine === 'P2:') { currentPlayer = 'P2'; continue; }
    if (trimmedLine.startsWith('#')) continue;
    if (trimmedLine === 'E') break;

    if (trimmedLine.startsWith('-')) {
      const lineBreakMatch = trimmedLine.match(/^-\s*(-?\d+)/);
      if (lineBreakMatch) lineBreakBeats.add(parseInt(lineBreakMatch[1]));
      continue;
    }

    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: 'P1' | 'P2' | undefined = currentPlayer;
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
    }

    const noteMatch = noteLine.match(/^\s*([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      notes.push({ type, startBeat: parseInt(startStr), duration: parseInt(durationStr), pitch: parseInt(pitchStr), lyric, player: notePlayer });
      noteLineCount++;
      continue;
    }
  }

  // DIAGNOSTIC: If no notes were found, log sample lines to identify the format
  if (noteLineCount === 0 && lines.length > 0) {
    const nonHeaderLines = lines.filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('#') && t !== 'E' && t !== 'P1' && t !== 'P2' && t !== 'P1:' && t !== 'P2:' && !t.startsWith('-');
    });
    const sampleLines = nonHeaderLines.slice(0, 5).map(l => `"${l.substring(0, 100)}"`);
    console.warn('[SongLibrary] parseUltraStarTxtContent: 0 notes found!', {
      totalLines: lines.length,
      nonHeaderLines: nonHeaderLines.length,
      contentLength: cleanContent.length,
      bpm, gap,
      sampleLines,
    });
  }

  const result = convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);

  // FALLBACK: If UltraStar parsing found no lines but content exists,
  // try to create simple lyric lines from non-header text.
  if (result.length === 0 && noteLineCount === 0 && lines.length > 0) {
    const fallbackLines = createFallbackLyrics(lines);
    if (fallbackLines.length > 0) {
      return fallbackLines;
    }
  }

  return result;
}

/**
 * Create simple LyricLine[] from non-header text lines when UltraStar parsing fails.
 * This allows displaying lyrics even without note timing data.
 * Each non-header text line becomes a lyric line with a small time offset.
 */
function createFallbackLyrics(lines: string[]): LyricLine[] {
  const lyricLines: LyricLine[] = [];
  let timeOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headers, control lines, and empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed === 'E' ||
        trimmed === 'P1' || trimmed === 'P2' || trimmed.startsWith('-')) {
      continue;
    }
    // Skip lines that look like UltraStar notes (even if regex didn't match)
    if (/^\s*[:*FGR]\s*-?\d+\s+\d+\s+-?\d+/.test(trimmed)) {
      continue;
    }

    const startTime = timeOffset;
    const endTime = timeOffset + 3000; // 3 seconds per line default
    timeOffset += 3500;

    lyricLines.push({
      id: `line-${lyricLines.length}`,
      text: trimmed,
      startTime,
      endTime,
      notes: [{
        id: `note-${lyricLines.length}-0`,
        pitch: 0,
        frequency: 261.63, // C4
        startTime,
        duration: 3000,
        lyric: trimmed,
        isBonus: false,
        isGolden: false,
      }],
    });
  }

  return lyricLines;
}
