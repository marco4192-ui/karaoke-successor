/**
 * Medley next-round snippet regeneration — extracted 1:1 from
 * party-game-screens.tsx (task R9). Function body unchanged; only the
 * `export` keyword was added (the original was module-private and is now
 * imported by medley-game-section.tsx).
 */

import { getAllSongs, filterSongs } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { generateMedleySnippets } from '@/components/game/medley/medley-snippet-generator';
import type { MedleySong } from '@/components/game/medley/medley-types';

// ── Medley next round: regenerate snippets with NEW songs (Fix 7) ──
// Mirrors start-medley.ts: generate a fresh snippet list — EXCLUDING the songs
// used in the round just finished when the filtered pool is large enough
// (pool.length > snippetCount * 2), otherwise falling back to the full pool —
// then prepare URLs + lyrics per snippet exactly like the initial start
// (ensureSongUrls + loadSongLyrics + snippet repositioning).
export async function prepareNextMedleyRound(party: import('@/lib/game/party-store').PartyStore): Promise<MedleySong[] | null> {
  try {
    const settings = party.medleySettings;
    // Item 6: ALWAYS mirror the round just played — the configured snippet
    // count from medleySettings, else the CURRENT round's actual count (the
    // user always gets the same number of snippets per round). The old
    // fallback (players * 2) made a 5-snippet game jump to 8 snippets with
    // 4 players on the very next round.
    const snippetCount = settings?.snippetCount && settings.snippetCount > 0
      ? settings.snippetCount
      : (party.medleySongs.length > 0 ? party.medleySongs.length : 5);
    const snippetDuration = settings?.snippetDuration
      || (party.medleySongs[0]?.duration ? Math.round(party.medleySongs[0].duration / 1000) : 30)
      || 30;

    // Pool: full library with the same filters as the original start (the
    // unified setup result's settings carry the filter fields).
    const filters = party.unifiedSetupResult?.settings;
    const fullPool = filterSongs(
      getAllSongs(),
      filters?.filterGenre,
      filters?.filterLanguage,
      filters?.filterCombined,
      filters?.filterReleaseYear,
      filters?.filterEra,
      filters?.filterSearch,
    );

    // Exclude the current round's songs when enough alternatives exist.
    const currentSongIds = new Set(party.medleySongs.map(m => m.song.id));
    let pool = fullPool;
    if (fullPool.length > snippetCount * 2 && currentSongIds.size > 0) {
      const excluding = fullPool.filter(s => !currentSongIds.has(s.id));
      if (excluding.length >= snippetCount) pool = excluding;
    }
    if (pool.length === 0) return null;

    const medleySongList = generateMedleySnippets(pool, snippetCount, snippetDuration);

    // Pre-restore URLs AND lyrics for all snippet songs (same as the initial
    // start — needed for Tauri file:// paths and IndexedDB-stored lyrics).
    const preparedSnippets = await Promise.all(
      medleySongList.map(async snippet => {
        try {
          let prepared = await ensureSongUrls(snippet.song);

          // Also load lyrics if not present (storedTxt / relativeTxtPath)
          if (!prepared.lyrics || prepared.lyrics.length === 0) {
            try {
              const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
              const lyrics = await loadSongLyrics(prepared);
              if (lyrics.length > 0) {
                prepared = { ...prepared, lyrics };
              }
            } catch { /* non-critical */ }
          }

          // Re-position the snippet if the now-loaded lyrics have no notes
          // overlapping the generated range (same as start-medley.ts).
          let adjustedSnippet = snippet;
          if (prepared.lyrics && prepared.lyrics.length > 0) {
            const hasOverlap = prepared.lyrics.some(line =>
              line.notes.some(n =>
                n.startTime < snippet.endTime && (n.startTime + n.duration) > snippet.startTime,
              ),
            );
            if (!hasOverlap) {
              const allNotes = prepared.lyrics.flatMap(l => l.notes);
              if (allNotes.length > 0) {
                const snippetMs = snippet.duration;
                const firstNote = allNotes[0].startTime;
                const lastNote = allNotes[allNotes.length - 1].startTime;
                const noteRangeEnd = lastNote + 5000;
                const maxStart = Math.max(firstNote, noteRangeEnd - snippetMs);
                let bestStart = firstNote;
                let bestCount = 0;
                for (let pos = Math.max(firstNote, 10000); pos <= maxStart; pos += 2000) {
                  const count = allNotes.filter(n => n.startTime >= pos && n.startTime <= pos + snippetMs).length;
                  if (count > bestCount) { bestCount = count; bestStart = pos; }
                }
                const newEnd = Math.min(bestStart + snippetMs, prepared.duration);
                adjustedSnippet = { ...snippet, startTime: bestStart, endTime: newEnd, duration: newEnd - bestStart };
              }
            }
          }

          return { ...adjustedSnippet, song: prepared };
        } catch {
          return snippet;
        }
      })
    );

    if (preparedSnippets.length === 0) return null;
    party.setMedleySongs(preparedSnippets);
    return preparedSnippets;
  } catch {
    return null;
  }
}

