import type { StartHandlerContext } from './types';
import type { MedleySettings as MedleySettingsType, MedleyPlayer as MedleyPlayerType, SnippetMatchup } from '@/components/game/medley/medley-types';
import { generateTeamMatchups } from '@/components/game/medley/medley-types';
import { generateMedleySnippets } from '@/components/game/medley/medley-snippet-generator';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { Song, EMPTY_PLAYER_SCORE } from '@/types/game';

export async function startMedley(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, filteredSongs } = ctx;
  const s = result.settings as { snippetCount?: number; snippetDuration?: number; playMode?: string };
  const snippetCount = s.snippetCount || 5;
  const snippetDuration = s.snippetDuration || 30;
  const medleySongList = generateMedleySnippets(filteredSongs, snippetCount, snippetDuration);

  // Pre-restore URLs AND lyrics for all snippet songs (needed for
  // Tauri file:// paths and IndexedDB-stored lyrics) — same as PTM medley.
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

        // Re-position snippet if no notes overlap with the snippet range.
        // generateMedleySnippets may have positioned the snippet at a fallback
        // (e.g. 10s) because lyrics were empty during generation, but the
        // now-loaded lyrics have notes at completely different times.
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
              for (let t = Math.max(firstNote, 10000); t <= maxStart; t += 2000) {
                const count = allNotes.filter(n => n.startTime >= t && n.startTime <= t + snippetMs).length;
                if (count > bestCount) { bestCount = count; bestStart = t; }
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

  // Spieler konvertieren und in Team-Modus Teams zuweisen
  const medleyPlayers = toMedleyPlayers(result.players);
  const medleySettings = result.settings as { playMode?: string };
  const playMode = medleySettings?.playMode || 'ffa';

  if (playMode === 'team') {
    // Spieler gleichmäßig auf Team A (0) und Team B (1) aufteilen
    const half = Math.ceil(medleyPlayers.length / 2);
    medleyPlayers.forEach((p, i) => {
      p.team = i < half ? 0 : 1;
    });
    const teamA = medleyPlayers.filter(p => p.team === 0);
    const teamB = medleyPlayers.filter(p => p.team === 1);
    const matchups: SnippetMatchup[] = generateTeamMatchups(teamA, teamB);
    party.setMedleyMatches(matchups);
  } else {
    party.setMedleyMatches([]);
  }

  party.setMedleyPlayers(medleyPlayers);
  party.setMedleySongs(preparedSnippets);
  // Cast unified setup settings to MedleySettings (the unified setup provides matching keys)
  party.setMedleySettings(result.settings as unknown as MedleySettingsType);
  party.setMedleySeriesHistory([]);
  // Reset isSongPlaying BEFORE navigating to prevent React #185
  // (MedleyGameScreen's useEffect would otherwise trigger during mount cycle)
  party.setIsSongPlaying(false);
  setScreen('medley-game');
}

function toMedleyPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]): MedleyPlayerType[] {
  return players.map((_p, _i) => ({ ..._p, team: null as unknown as number, inputType: (_p.playerType === 'companion' ? 'mobile' : 'local') as 'local' | 'mobile', ...EMPTY_PLAYER_SCORE, snippetsSung: 0, isEliminated: false }));
}
