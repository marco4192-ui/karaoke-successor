import type { StartHandlerContext } from './types';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import type { PassTheMicSegment } from '@/components/game/ptm-types';
import type { CptmSettings } from '@/components/game/cptm-types';
import { Song, EMPTY_PLAYER_SCORE } from '@/types/game';

export async function startCompanionSingalong(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, resetGame, addPlayer, setPlayers, setSong, filteredSongs } = ctx;
  const randomSong = pickRandomSong(filteredSongs);
  if (randomSong) {
    const cptmPlayers = toCptmPlayers(result.players);
    party.setCptmPlayers(cptmPlayers);
    party.setCptmSong(randomSong);
    party.setCptmSettings(toCptmSettings(result.settings as GameModeSettingsMap['companion-singalong']));
    const cptmSegments = generatePassTheMicSegments(randomSong, cptmPlayers.length || 2);
    party.setCptmSegments(cptmSegments);
    resetGame();
    setPlayers([]);
    if (cptmPlayers.length > 0) {
      addPlayer({ id: cptmPlayers[0].id, name: cptmPlayers[0].name, color: cptmPlayers[0].color, avatar: cptmPlayers[0].avatar });
    }
    setSong(randomSong);
    setScreen('companion-singalong-game');
  }
}

// ===================== HELPERS (local to this module) =====================

function pickRandomSong(songs: Song[]): Song | null {
  if (songs.length === 0) return null;
  return songs[Math.floor(Math.random() * songs.length)];
}

function toCptmPlayers(players: { id: string; name: string; avatar?: string; color: string; micId?: string; micName?: string; playerType?: string }[]) {
  return players.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0 }));
}

function toCptmSettings(s: { difficulty?: import('@/types/game').Difficulty; blinkWarning?: number }): CptmSettings {
  return {
    difficulty: s.difficulty ?? 'medium',
    blinkWarning: s.blinkWarning ?? 3,
  };
}

// Auto segment duration: 20-60s, at least 2 segments per player, equal segments per player
function generatePassTheMicSegments(song: Song, playerCount: number, _explicitDuration?: number): PassTheMicSegment[] {
  const MIN_SONG_MS = 60_000; // Exclude songs shorter than 60s
  if (song.duration < MIN_SONG_MS) return [];

  const MIN_SEG_S = 20;
  const MAX_SEG_S = 60;
  const MIN_SEGS_PER_PLAYER = 2;

  const durationMs = song.duration;
  const rawAuto = Math.ceil(durationMs / (playerCount * MIN_SEGS_PER_PLAYER * 1000));
  const clampedAuto = Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, rawAuto));
  const segDur = _explicitDuration
    ? Math.max(MIN_SEG_S, Math.min(MAX_SEG_S, _explicitDuration))
    : clampedAuto;
  const segDurMs = segDur * 1000;

  // Round up to ensure every player gets the same number of segments
  const rawCount = Math.ceil(durationMs / segDurMs);
  const segCount = Math.max(playerCount, rawCount);
  // Adjust segment duration so all segments fit evenly
  const adjustedDurMs = durationMs / segCount;

  const segments: PassTheMicSegment[] = [];
  for (let i = 0; i < segCount; i++) {
    segments.push({
      startTime: Math.round(i * adjustedDurMs),
      endTime: Math.round((i + 1) * adjustedDurMs),
      playerId: null,
    });
  }
  return segments;
}
