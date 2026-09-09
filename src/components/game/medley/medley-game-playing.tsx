'use client';

/**
 * Medley Contest — Playing Phase UI
 *
 * Layout mirrors the standard GameScreen / PTM layout:
 * - NoteHighway: fullscreen (absolute inset-0)
 * - Lyrics: pinned to bottom with gradient fade
 * - Song info + timer: top header bar
 * - Player ranking: left sidebar (compact)
 * - HUD controls (pause/fullscreen): handled by parent medley-game-screen.tsx
 *
 * Feature #4: Fullscreen NoteHighway (replaces old MiniNoteHighway)
 * Feature #5: Scoring transparency — floating +points popups, combo display
 * Feature #9: Dynamic difficulty badge
 * Feature #10: Elimination — eliminated players grayed out, remaining count
 * Feature #15: Voice modifiers — modifier reveal animation, badge
 * Feature #16: Mystery mode — hidden song info, reveal
 * Feature #18: Team bonuses — synergy flash, comeback boost indicator
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Note, LyricLine, Difficulty } from '@/types/game';
import { useMultiPitchDetector } from '@/hooks/use-multi-pitch-detector';
import type { MedleyPlayer, MedleySong, SnippetMatchup, VoiceModifier, MedleySettings } from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';
import { useTranslation } from '@/lib/i18n/translations';
import { NoteHighway, type NoteWithLine } from '@/components/game/note-highway';
import { TimeDisplay } from '@/components/game/game-hud';
import { MicIndicator } from '@/components/game/mic-indicator';
import {
  calculatePitchStats,
  getVisibleNotes,
  SING_LINE_POSITION,
  NOTE_WINDOW,
  VISIBLE_TOP,
  VISIBLE_RANGE,
} from '@/lib/game/note-utils';

// ===================== PROPS =====================

interface MedleyPlayingProps {
  currentSnippet: MedleySong;
  currentSnippetIdx: number;
  snippetCount: number;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];
  currentLyricLine: LyricLine | null;
  currentTimeMs: number;
  playersDisplay: MedleyPlayer[];
  snippetProgress: number;
  totalProgress: number;
  currentMatchup: SnippetMatchup | null;
  isTeam: boolean;
  multiPitch: ReturnType<typeof useMultiPitchDetector>;
  handleEndEarly: () => void;
  /** Unified HUD: per-note performance samples (colored fills + wrong-singing marks per player) */
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null; playerColor?: string }>>;
  currentDynamicDifficulty?: Difficulty | null;
  settings: MedleySettings;
  /** Total duration of ALL snippets (user item 6.4: total runtime, one line) */
  totalDurationMs?: number;
  /** Elapsed time across all snippets (finished snippets + current snippet time) */
  totalElapsedMs?: number;
  // Feature #10
  isEliminationMode?: boolean;
  activePlayerCount?: number;
  totalPlayerCount?: number;
  // Feature #15
  activeModifier?: VoiceModifier;
  modifierJustRevealed?: boolean;
  // Feature #16
  isMysteryMode?: boolean;
  mysteryReveal?: boolean;
  mysteryRevealSong?: MedleySong | null;
  // Feature #18
  synergyTriggered?: boolean;
  comebackTriggered?: boolean;
  comebackTeamId?: number | null;
}

// ===================== COMPONENT =====================

export function MedleyPlayingUI({
  currentSnippet,
  currentSnippetIdx,
  snippetCount,
  snippetNotes,
  snippetLyrics,
  currentLyricLine,
  currentTimeMs,
  playersDisplay,
  snippetProgress,
  totalProgress,
  currentMatchup,
  isTeam,
  notePerformance,
  settings,
  totalDurationMs = 0,
  totalElapsedMs = 0,
  // Feature #10
  isEliminationMode = false,
  activePlayerCount = 0,
  totalPlayerCount = 0,
  // Feature #15
  activeModifier = 'none',
  modifierJustRevealed = false,
  // Feature #16
  isMysteryMode = false,
  mysteryReveal = false,
  mysteryRevealSong = null,
  // Feature #18
  synergyTriggered = false,
  comebackTriggered = false,
  comebackTeamId = null,
}: MedleyPlayingProps) {
  const { t } = useTranslation();

  // Active players for the current snippet
  const activePlayers = isTeam && currentMatchup
    ? [currentMatchup.playerA, currentMatchup.playerB]
    : isEliminationMode
      ? playersDisplay.filter(p => !p.isEliminated)
      : playersDisplay;

  const modDef = VOICE_MODIFIERS.find(m => m.id === activeModifier);

  // ── Current snippet singer (user item 6) ──
  // The shared note stream is pre-colored in the snippet singer's color so
  // spectators see whose notes are whose; the tint switches whenever the
  // snippet's singer changes (featured singer = pool[snippetIdx % pool.length]):
  // - Team: the current matchup's two singers alternate per snippet
  //   (both are always shown in the TeamMatchupBar below the top bar)
  // - FFA / Elimination: the players rotate by snippet index (player order)
  const singerPool = useMemo<MedleyPlayer[]>(() => {
    if (isTeam && currentMatchup) return [currentMatchup.playerA, currentMatchup.playerB];
    if (isEliminationMode) return playersDisplay.filter(p => !p.isEliminated);
    return playersDisplay;
  }, [isTeam, currentMatchup, isEliminationMode, playersDisplay]);

  const featuredSinger = singerPool.length > 0
    ? singerPool[currentSnippetIdx % singerPool.length]
    : null;

  // The note highway (grid, sing line, glow, unsung note track) uses the
  // featured singer's base color instead of the old hardcoded purple.
  const currentSingerColor = featuredSinger?.color ?? '#a855f7';

  // Sort players by score for ranking display
  const rankedPlayers = [...playersDisplay].sort((a, b) => b.score - a.score);

  // ── Compute NoteWithLine[] for the standard NoteHighway ──
  const notesWithLine = useMemo<NoteWithLine[]>(() => {
    return snippetNotes.map((note, _i) => {
      // Find the lyric line this note belongs to
      const lineIdx = snippetLyrics.findIndex(line =>
        line.notes.some(n => n.startTime === note.startTime && n.pitch === note.pitch),
      );
      return {
        ...note,
        lineIndex: lineIdx >= 0 ? lineIdx : 0,
        line: lineIdx >= 0 ? snippetLyrics[lineIdx] : { id: 'medley-fallback', startTime: 0, endTime: 0, text: '', notes: [] },
      };
    });
  }, [snippetNotes, snippetLyrics]);

  // ── Compute pitch stats for the NoteHighway vertical range ──
  const pitchStats = useMemo(() => calculatePitchStats(snippetNotes), [snippetNotes]);

  // ── Compute visible notes (same logic as useGameTimingData) ──
  const absoluteTime = currentSnippet.startTime + currentTimeMs;
  const visibleNotes = useMemo(
    () => getVisibleNotes(notesWithLine, absoluteTime, NOTE_WINDOW),
    [notesWithLine, absoluteTime],
  );

  // ── Find next lyric line for preview ──
  const nextLyricLine = useMemo(() => {
    if (!currentLyricLine) return null;
    const curIdx = snippetLyrics.indexOf(currentLyricLine);
    return curIdx >= 0 && curIdx + 1 < snippetLyrics.length
      ? snippetLyrics[curIdx + 1]
      : null;
  }, [currentLyricLine, snippetLyrics]);

  // ── Countdown timer ──
  const countdownSeconds = Math.max(0, Math.ceil((currentSnippet.duration - currentTimeMs) / 1000));

  // ── Total medley runtime (user item 6.4) — formatted m:ss ──
  const formatTotalTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* ═══════ Feature #15: Modifier Reveal Overlay ═══════ */}
      {modifierJustRevealed && activeModifier !== 'none' && modDef && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 animate-pulse pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-3">{modDef.icon}</div>
            <div className="text-4xl font-bold text-white">{modDef.id.toUpperCase()}!</div>
          </div>
        </div>
      )}

      {/* ═══════ Feature #18: Synergy Flash ═══════ */}
      {synergyTriggered && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-green-500/30 border-2 border-green-400 rounded-xl px-8 py-4 animate-bounce">
            <div className="text-3xl font-bold text-green-400">{t('medley.synergyTriggered')}</div>
          </div>
        </div>
      )}

      {/* ═══════ Feature #18: Comeback Boost Indicator ═══════ */}
      {comebackTriggered && comebackTeamId !== null && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg animate-pulse ${
            comebackTeamId === 0 ? 'bg-blue-500/30 text-blue-400 border border-blue-400' : 'bg-red-500/30 text-red-400 border border-red-400'
          }`}>
            {t('medley.comebackBoost')}
          </div>
        </div>
      )}

      {/* ═══════ Feature #16: Mystery Reveal ═══════ */}
      {mysteryReveal && mysteryRevealSong && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-none">
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <div className="text-2xl text-white/60 mb-2">{t('medley.songReveal')}</div>
            <div className="text-3xl font-bold text-purple-400">{mysteryRevealSong.song.title}</div>
            <div className="text-xl text-white/80 mt-1">{mysteryRevealSong.song.artist}</div>
            {mysteryRevealSong.song.genre && (
              <div className="mt-3">
                <span className="bg-purple-500/30 text-purple-300 text-sm px-4 py-1.5 rounded-full">{mysteryRevealSong.song.genre}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ FULLSCREEN NOTE HIGHWAY (unified note performance: colored fills + wrong-singing marks) ═══════ */}
      {notesWithLine.length > 0 && (
        <div className="absolute inset-0 z-0">
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={absoluteTime}
            pitchStats={pitchStats}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            notePerformance={notePerformance}
            // User item 6: pre-color the shared note stream in the current
            // snippet singer's color (grid / sing line / glow / note tint).
            playerColor={currentSingerColor}
            noteTint={currentSingerColor}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
            // Medley Contest = more than two simultaneous singers → keep the
            // classic quality-graduated rendering (user decision).
            legacyNoteStyle
          />
        </div>
      )}

      {/* ═══════ TOP BAR: compact info row + total progress ═══════
          User item 6.3: the song title/artist live ONLY in the unified HUD
          chrome's SongTitleBanner (rendered by medley-game-screen.tsx) —
          this bar no longer renders a second, centered title. */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        {/* Left: spacer for PauseButton (rendered by parent) */}
        <div className="w-10" />

        {/* Center: ONE compact info row (snippet index, current singer,
            snippet countdown, mode badges) + team scores + total progress */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 flex-nowrap whitespace-nowrap">
            <Badge className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 shrink-0">{t('medley.badge')}</Badge>
            <span className="text-white/60 text-xs whitespace-nowrap">
              {t('medley.songOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}
            </span>
            {/* Current singer badge (snippet singer whose color tints the note stream) */}
            {featuredSinger && !isTeam && (
              <span
                className="flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                style={{ color: currentSingerColor }}
                title={featuredSinger.name}
              >
                🎤<span className="max-w-[90px] truncate">{featuredSinger.name}</span>
              </span>
            )}
            {/* Snippet duration countdown */}
            <span className="text-sm font-mono text-purple-400 tabular-nums whitespace-nowrap">{countdownSeconds}s</span>
            {!isTeam && !isEliminationMode && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 shrink-0">{t('medley.ffaBadge')}</Badge>
            )}
            {isEliminationMode && (
              <Badge className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 shrink-0">
                {t('medley.remaining').replace('{n}', String(activePlayerCount)).replace('{m}', String(totalPlayerCount))}
              </Badge>
            )}
            {/* Feature #9: Dynamic difficulty badge now lives in the unified top-right HUD chrome */}
            {/* Feature #15: Active modifier badge */}
            {activeModifier !== 'none' && !modifierJustRevealed && modDef && (
              <Badge className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 shrink-0">
                {modDef.icon} {modDef.id}
              </Badge>
            )}
            {/* Feature #16: Mystery mode badge */}
            {isMysteryMode && !mysteryReveal && (
              <Badge className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5 shrink-0">🎰</Badge>
            )}
          </div>

          {/* Feature #18: Team scores */}
          {isTeam && settings.teamBonusesEnabled && (
            <div className="flex items-center gap-4 text-xs whitespace-nowrap">
              <span className="text-blue-400 font-medium">
                {t('medley.teamA')}: {playersDisplay.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0)}
              </span>
              <span className="text-white/30">|</span>
              <span className="text-red-400 font-medium">
                {t('medley.teamB')}: {playersDisplay.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0)}
              </span>
            </div>
          )}

          {/* Total progress bar */}
          <Progress value={totalProgress} className="h-1 bg-white/10 w-64" />
        </div>

        {/* Right: spacer for FullscreenButton (rendered by parent) */}
        <div className="w-10" />
      </div>

      {/* ═══════ LEFT SIDE: Player Ranking ═══════ */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col gap-1.5">
          {rankedPlayers.map((player, rank) => {
            const isActive = activePlayers.some(ap => ap.id === player.id);
            return (
              <div
                key={player.id}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/15 border border-white/20'
                    : player.isEliminated
                      ? 'bg-black/20 border border-white/5 opacity-30'
                      : 'bg-black/40 border border-white/5'
                }`}
                style={isActive ? { borderColor: `${player.color}50` } : {}}
              >
                {/* Rank number */}
                <span className={`text-[10px] font-bold w-4 text-center ${
                  rank === 0 ? 'text-yellow-400' : 'text-white/30'
                }`}>
                  {rank + 1}
                </span>
                {/* Avatar */}
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className={`w-7 h-7 rounded-full object-cover ${isActive ? 'border-2' : 'border border-white/20'}`}
                    style={isActive ? { borderColor: player.color } : {}}
                  />
                ) : (
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isActive ? 'border-2' : 'border border-white/20'}`}
                    style={{ backgroundColor: `${player.color}80`, borderColor: isActive ? player.color : undefined }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-medium truncate max-w-[80px] ${isActive ? 'text-white' : 'text-white/50'}`}>
                    {player.name ?? ''}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] ${isActive ? 'text-cyan-400 font-semibold' : 'text-white/25'}`}>
                      {String(player.score ?? 0).toLocaleString()} pts
                    </span>
                    {/* Feature #5: Combo display for active player */}
                    {isActive && (player.combo ?? 0) >= 3 && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        {String(player.combo)}x
                      </span>
                    )}
                  </div>
                </div>
                {/* Feature #10: Eliminated badge */}
                {player.isEliminated && (
                  <span className="text-xs text-red-400 font-bold ml-auto">💀</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════ BOTTOM: Lyrics — BR-style background card (B3.6), lifted above the bottom-corner time displays ═══════ */}
      {currentLyricLine && (
        <div className="absolute bottom-10 left-0 right-0 z-20 px-4">
          <div className="bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
            {/* Current lyric line */}
            <div className="font-bold text-center drop-shadow-lg text-2xl md:text-3xl text-white leading-tight">
              {currentLyricLine.text}
            </div>
            {/* Next line preview */}
            {nextLyricLine && (
              <p className="text-lg text-white/40 mt-2 text-center">
                {nextLyricLine.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════ PATTERN E — Team matchup bar (both players per team, current singer highlighted) ═══════ */}
      {isTeam && <TeamMatchupBar players={playersDisplay} currentMatchup={currentMatchup} />}

      {/* ═══════ BOTTOM EDGE: Snippet progress + total runtime (user item 6.4) ═══════ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <Progress value={snippetProgress} className="h-1 bg-white/10" />
        <div className="flex justify-between items-center gap-4 px-4 py-1">
          <span className="text-[10px] text-white/30 whitespace-nowrap">
            {t('medley.snippetOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}
          </span>
          {/* Gesamtlaufzeit: total medley runtime on ONE line (no wrap) */}
          {totalDurationMs > 0 && (
            <span className="text-[10px] text-white/40 font-mono tabular-nums whitespace-nowrap">
              ⏱ {formatTotalTime(totalElapsedMs)} / {formatTotalTime(totalDurationMs)}
            </span>
          )}
        </div>
      </div>

      {/* ═══════ Unified bottom HUD: mic indicator (bottom-left) + snippet time (bottom-right) ═══════
          User item 6.4: the time displays render INLINE with whitespace-nowrap
          and a wide-enough container — no more line-wrapped corner fields. */}
      <MicIndicator isPlaying />
      <div className="absolute bottom-8 right-4 z-20 min-w-[110px] whitespace-nowrap text-right">
        <TimeDisplay inline currentTime={currentTimeMs} duration={currentSnippet.duration} />
      </div>
    </div>
  );
}

// ===================== PATTERN E: TEAM MATCHUP BAR =====================
// Duel-style center bar for team mode (1v1 / 2v2): both players of each team
// are shown in the center separator; the player currently singing is highlighted.

function TeamMatchupBar({ players, currentMatchup }: { players: MedleyPlayer[]; currentMatchup: SnippetMatchup | null }) {
  const { t } = useTranslation();
  const teamA = players.filter(p => p.team === 0);
  const teamB = players.filter(p => p.team === 1);
  const singingIds = new Set([currentMatchup?.playerA.id, currentMatchup?.playerB.id]);

  const renderTeam = (team: MedleyPlayer[], align: 'right' | 'left', color: string, label: string) => (
    <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      {team.map(player => {
        const isSinging = singingIds.has(player.id);
        return (
          <div
            key={player.id}
            className={`flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 border transition-all ${
              isSinging ? 'border-white/60 bg-white/15 shadow-lg scale-105' : 'border-white/10 bg-black/30 opacity-60'
            }`}
          >
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} className={`w-6 h-6 rounded-full object-cover ${isSinging ? 'border-2' : 'border'} border-white/30`} />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-white/30" style={{ backgroundColor: `${player.color}90` }}>
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className={`text-xs font-semibold whitespace-nowrap ${isSinging ? 'text-white' : 'text-white/60'}`}>
              {player.name}
            </span>
            <span className="text-[10px] text-cyan-300 tabular-nums">{String(player.score ?? 0).toLocaleString()}</span>
            {isSinging && <span className="text-[9px]">🎤</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10">
        {renderTeam(teamA, 'right', '#60a5fa', t('medley.teamA'))}
        <div className="flex flex-col items-center px-1">
          <span className="text-lg font-black text-white/40">VS</span>
        </div>
        {renderTeam(teamB, 'left', '#f87171', t('medley.teamB'))}
      </div>
    </div>
  );
}

// NOTE (user item 6.1): the former Feature #5 "ScoringPopups" (flying
// +/-points numbers for hit and wrong notes) was removed from the Medley
// in-game view. Wrong-note feedback now renders on the note stream itself:
// per-player colored ghost bars (see note-utils getNoteDisplayStyleClasses).
