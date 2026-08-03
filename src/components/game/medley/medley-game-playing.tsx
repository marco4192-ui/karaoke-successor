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
import type { MedleyPlayer, MedleySong, SnippetMatchup, MedleyScoringEvent, VoiceModifier, MedleySettings } from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';
import { useTranslation } from '@/lib/i18n/translations';
import { NoteHighway, type NoteWithLine } from '@/components/game/note-highway';
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
  lastScoringEvents?: MedleyScoringEvent[];
  currentDynamicDifficulty?: Difficulty | null;
  settings: MedleySettings;
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
  multiPitch,
  handleEndEarly,
  lastScoringEvents = [],
  currentDynamicDifficulty = null,
  settings,
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

  // Sort players by score for ranking display
  const rankedPlayers = [...playersDisplay].sort((a, b) => b.score - a.score);

  // ── Compute NoteWithLine[] for the standard NoteHighway ──
  const notesWithLine = useMemo<NoteWithLine[]>(() => {
    return snippetNotes.map((note, i) => {
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

      {/* ═══════ FULLSCREEN NOTE HIGHWAY ═══════ */}
      {notesWithLine.length > 0 && (
        <div className="absolute inset-0 z-0">
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={absoluteTime}
            pitchStats={pitchStats}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            playerColor="#a855f7"
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        </div>
      )}

      {/* ═══════ TOP BAR: song info + timer + badges ═══════ */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        {/* Left: spacer for PauseButton (rendered by parent) */}
        <div className="w-10" />

        {/* Center: song info + timer + badges */}
        <div className="flex flex-col items-center gap-1">
          {/* Song info row */}
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 text-sm px-2 py-0.5">{t('medley.badge')}</Badge>
            <span className="text-white/60 text-sm">{t('medley.songOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}</span>
            {!isTeam && !isEliminationMode && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5">{t('medley.ffaBadge')}</Badge>
            )}
            {isEliminationMode && (
              <Badge className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5">
                {t('medley.remaining').replace('{n}', String(activePlayerCount)).replace('{m}', String(totalPlayerCount))}
              </Badge>
            )}
            {/* Feature #9: Dynamic difficulty badge */}
            {currentDynamicDifficulty && (
              <MedleyDifficultyBadge difficulty={currentDynamicDifficulty} />
            )}
            {/* Feature #15: Active modifier badge */}
            {activeModifier !== 'none' && !modifierJustRevealed && modDef && (
              <Badge className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5">
                {modDef.icon} {modDef.id}
              </Badge>
            )}
            {/* Feature #16: Mystery mode badge */}
            {isMysteryMode && !mysteryReveal && (
              <Badge className="bg-pink-500/20 text-pink-400 text-xs px-2 py-0.5">🎰</Badge>
            )}
          </div>

          {/* Song title + artist + countdown */}
          <div className="flex items-center gap-3">
            {isMysteryMode && !mysteryReveal ? (
              <>
                <span className="text-sm font-bold">🎰 ???</span>
                <span className="text-white/40 text-xs">{t('medley.mysterySong')}</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-white/90">{currentSnippet.song.title}</span>
                <span className="text-white/40 text-xs">{currentSnippet.song.artist}</span>
              </>
            )}
            <span className="text-lg font-mono text-purple-400 tabular-nums">{countdownSeconds}s</span>
          </div>

          {/* Feature #18: Team scores */}
          {isTeam && settings.teamBonusesEnabled && (
            <div className="flex items-center gap-4 text-xs">
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

      {/* ═══════ BOTTOM: Lyrics (like SinglePlayerLyrics) ═══════ */}
      {currentLyricLine && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-t from-black/80 to-transparent px-6 pb-4 pt-8">
            {/* Current lyric line */}
            <div className="font-bold text-center drop-shadow-lg text-2xl md:text-3xl text-white leading-tight">
              {currentLyricLine.text}
            </div>
            {/* Next line preview */}
            {nextLyricLine && (
              <p className="text-lg text-white/40 mt-3 text-center">
                {nextLyricLine.text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════ BOTTOM EDGE: Snippet progress + quit ═══════ */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <Progress value={snippetProgress} className="h-1 bg-white/10" />
        <div className="flex justify-between items-center px-4 py-1">
          <span className="text-[10px] text-white/30">
            {t('medley.snippetOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}
          </span>
          <button
            onClick={handleEndEarly}
            aria-label={t('medley.quit')}
            className="text-red-400/50 hover:text-red-400 text-[10px] transition-colors pointer-events-auto"
          >
            {t('medley.quit')}
          </button>
        </div>
      </div>

      {/* ═══════ Feature #5: Floating scoring popups ═══════ */}
      <ScoringPopups events={lastScoringEvents} players={playersDisplay} />
    </div>
  );
}

// ===================== FEATURE #5: SCORING POPUPS =====================

function ScoringPopups({
  events,
  players,
}: {
  events: MedleyScoringEvent[];
  players: MedleyPlayer[];
}) {
  const now = Date.now();
  const recentEvents = events.filter(e => now - e.timestamp < 1000);

  if (recentEvents.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {recentEvents.map((event, i) => {
        const player = players.find(p => p.id === event.playerId);
        const color = player?.color || '#fff';
        const age = now - event.timestamp;
        const opacity = Math.max(0, 1 - age / 1000);
        const translateY = -(age / 1000) * 40;

        let text: string;
        let textColor: string;
        if (event.hit && event.golden) {
          text = `+${event.points}`;
          textColor = '#fbbf24';
        } else if (event.hit) {
          text = `+${event.points}`;
          textColor = '#4ade80';
        } else {
          text = `${event.points}`;
          textColor = '#f87171';
        }

        return (
          <div
            key={`${event.playerId}-${event.timestamp}-${i}`}
            className="absolute text-lg font-bold"
            style={{
              right: `${20 + (i * 40)}px`,
              top: '50%',
              color: textColor,
              opacity,
              transform: `translateY(${translateY}px)`,
              textShadow: `0 0 6px ${textColor}`,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
}

// ===================== FEATURE #9: DIFFICULTY BADGE =====================

function MedleyDifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { t } = useTranslation();

  const configs: Record<Difficulty, { label: string; bg: string; text: string }> = {
    easy: { label: t('medley.easy'), bg: 'bg-green-500/20', text: 'text-green-400' },
    medium: { label: t('medley.medium'), bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    hard: { label: t('medley.hard'), bg: 'bg-red-500/20', text: 'text-red-400' },
  };
  const config = configs[difficulty];

  return (
    <Badge className={`${config.bg} ${config.text} text-xs px-2 py-0.5`}>
      {config.label}
    </Badge>
  );
}
