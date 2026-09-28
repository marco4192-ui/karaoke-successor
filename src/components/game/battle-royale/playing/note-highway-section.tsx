'use client';

/**
 * Note highway section (layout section 3) — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): V1 visibility check, the
 * ghost-note player strips (≥2 players: per-player strips; 1 survivor: the
 * single-player pipeline; no data: flat fill fallback) and the flex-1 spacer
 * that pushes the lyrics down when the highway is hidden.
 */
import { useMemo } from 'react';
import { NoteHighway, type NotePlayerStrip } from '@/components/game/note-highway';
import type { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';
import type { Note, LyricLine } from '@/types/game';
import type { PitchStats } from '@/lib/game/note-utils';
import { VISIBLE_TOP, VISIBLE_RANGE, SING_LINE_POSITION, NOTE_WINDOW } from '@/lib/game/note-utils';

export interface NoteHighwaySectionProps {
  game: BattleRoyaleGame;
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  currentTime: number;
  activePlayers: BattleRoyalePlayer[];
  brNotePerformance?: Map<string, Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>>;
}

/** Stable empty performance map for players without samples yet. */
const EMPTY_PLAYER_PERF: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>> = new Map();

export function NoteHighwaySection({
  game,
  pitchStats,
  visibleNotes,
  currentTime,
  activePlayers,
  brNotePerformance,
}: NoteHighwaySectionProps) {
  // ── Ghost notes: per-player strips for the note highway ─────────────
  // ≥2 active players → Medley-style per-player strips (hits fill the
  // strip in the player colour, wrong-pitch misses become ghost bars at
  // the sung pitch in the player colour + live miss dots).
  // Exactly 1 active player (late-game survivor) → single-player modern
  // pipeline (ghosts like Single/Duell). No data yet → flat fill fallback.
  const playerStrips = useMemo<NotePlayerStrip[]>(() => {
    if (!brNotePerformance) return [];
    return activePlayers.map(p => ({
      id: p.id,
      color: p.color,
      performance: brNotePerformance.get(p.id) ?? EMPTY_PLAYER_PERF,
    }));
    // activePlayers is memoised upstream; brNotePerformance identity only
    // changes on the throttled (200 ms) snapshot sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayers, brNotePerformance]);

  const stripsActive = playerStrips.length >= 2;
  const soloStrip = playerStrips.length === 1 ? playerStrips[0] : null;
  // (B3.2) The central "x/x mics active" pill was removed — per-player
  // singing indicators on the cards already show real-time mic status.

  // V1: Note highway visibility
  const showNoteHighway = game.settings.showNoteHighway && pitchStats !== null && visibleNotes.length > 0;

  return (
    <>
      {/* ─────────── 3. NOTE HIGHWAY (flex-1, majority of space) ─────────── */}
      {showNoteHighway && (
        <div className="flex-1 min-h-0 px-3">
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={currentTime}
            pitchStats={pitchStats ?? { minPitch: 48, maxPitch: 72, pitchRange: 24 }}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
            // Ghost notes (user request): per-player strips / single-player
            // performance pipeline — wrong-pitch misses render as ghost bars
            // at the sung pitch (per-player colour), hits fill the strips.
            // Flat fill only as long as no samples exist at all.
            playerStrips={stripsActive ? playerStrips : undefined}
            playerNames={stripsActive ? activePlayers.map(p => ({ id: p.id, name: p.name })) : undefined}
            notePerformance={soloStrip ? soloStrip.performance : undefined}
            playerColor={soloStrip ? soloStrip.color : undefined}
            flatNoteFill={!stripsActive && !soloStrip ? '#22d3ee' : undefined}
          />
        </div>
      )}

      {/* If highway is hidden, this spacer pushes lyrics down */}
      {!showNoteHighway && <div className="flex-1" />}
    </>
  );
}
