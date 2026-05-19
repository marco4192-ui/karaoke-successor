'use client';

/**
 * Medley Contest — Playing Phase UI
 *
 * Feature #4: MiniNoteHighway — horizontal scrolling note highway
 * Feature #5: Scoring transparency — floating +points popups, combo display
 * Feature #9: Dynamic difficulty badge
 * Feature #10: Elimination — eliminated players grayed out, remaining count
 * Feature #15: Voice modifiers — modifier reveal animation, badge
 * Feature #16: Mystery mode — hidden song info, reveal
 * Feature #18: Team bonuses — synergy flash, comeback boost indicator
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import type { Note, LyricLine, Difficulty } from '@/types/game';
import { useMultiPitchDetector } from '@/hooks/use-multi-pitch-detector';
import { PitchIndicator } from './medley-game-components';
import type { MedleyPlayer, MedleySong, SnippetMatchup, MedleyScoringEvent, VoiceModifier, MedleySettings } from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== PROPS =====================

interface MedleyPlayingProps {
  currentSnippet: MedleySong;
  currentSnippetIdx: number;
  snippetCount: number;
  snippetNotes: Note[];
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

  return (
    <>
      {/* Feature #15: Modifier Reveal Overlay */}
      {modifierJustRevealed && activeModifier !== 'none' && modDef && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 animate-pulse">
          <div className="text-center">
            <div className="text-6xl mb-3">{modDef.icon}</div>
            <div className="text-4xl font-bold text-white">{modDef.id.toUpperCase()}!</div>
          </div>
        </div>
      )}

      {/* Feature #18: Synergy Flash */}
      {synergyTriggered && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-green-500/30 border-2 border-green-400 rounded-xl px-8 py-4 animate-bounce">
            <div className="text-3xl font-bold text-green-400">{t('medley.synergyTriggered')}</div>
          </div>
        </div>
      )}

      {/* Feature #18: Comeback Boost Indicator */}
      {comebackTriggered && comebackTeamId !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className={`px-4 py-2 rounded-lg font-bold text-lg animate-pulse ${
            comebackTeamId === 0 ? 'bg-blue-500/30 text-blue-400 border border-blue-400' : 'bg-red-500/30 text-red-400 border border-red-400'
          }`}>
            {t('medley.comebackBoost')}
          </div>
        </div>
      )}

      {/* Feature #16: Mystery Reveal */}
      {mysteryReveal && mysteryRevealSong && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
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

      {/* Top bar: badge + progress + controls */}
      <div className="flex-shrink-0 p-3 space-y-2">
        <div className="flex items-center justify-between">
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
              <DifficultyBadge difficulty={currentDynamicDifficulty} />
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
          <div className="flex items-center gap-2 pointer-events-auto">
            {isTeam && currentMatchup && (
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: currentMatchup.playerA.color }}>{currentMatchup.playerA.name}</span>
                <span className="text-white/40">{t('medley.vs')}</span>
                <span style={{ color: currentMatchup.playerB.color }}>{currentMatchup.playerB.name}</span>
              </div>
            )}
            <FullscreenButton />
          </div>
        </div>

        {/* Feature #18: Team scores during gameplay */}
        {isTeam && settings.teamBonusesEnabled && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-blue-400 font-medium">
              {t('medley.teamA')}: {playersDisplay.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0)}
            </span>
            <span className="text-white/30">|</span>
            <span className="text-red-400 font-medium">
              {t('medley.teamB')}: {playersDisplay.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0)}
            </span>
          </div>
        )}

        {/* Per-player live scores + combo */}
        <div className="flex items-center gap-3 flex-wrap">
          {[...playersDisplay].sort((a, b) => b.score - a.score).map((p) => (
            <div key={p.id} className={`flex items-center gap-1.5 ${p.isEliminated ? 'opacity-30' : ''}`}>
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: p.color }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium" style={{ color: p.color }}>{p.name}: {p.score}</span>
              {/* Feature #5: Combo display */}
              {!p.isEliminated && <ComboDisplay combo={p.combo} />}
              {/* Feature #10: Eliminated badge */}
              {p.isEliminated && (
                <span className="text-xs text-red-400 font-bold">💀</span>
              )}
            </div>
          ))}
        </div>
        <Progress value={totalProgress} className="h-1.5 bg-white/10" />
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {/* Song info + timer */}
        <div className="text-center mb-2">
          {isMysteryMode && !mysteryReveal ? (
            <>
              <h3 className="text-xl font-bold">🎰 ???</h3>
              <p className="text-white/60 text-sm">{t('medley.mysterySong')}</p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
              <p className="text-white/60 text-sm">{currentSnippet.song.artist}</p>
            </>
          )}
          <div className="text-2xl font-mono text-purple-400 mt-1">
            {Math.max(0, Math.ceil((currentSnippet.duration - currentTimeMs) / 1000))}s
          </div>
        </div>

        {/* Lyrics */}
        {currentLyricLine && (
          <div className="bg-black/30 rounded-xl px-8 py-3 mb-2 max-w-lg">
            <div className="text-center text-xl font-bold text-white">{currentLyricLine.text}</div>
          </div>
        )}

        {/* Feature #4: Mini Note Highway */}
        {snippetNotes.length > 0 && (
          <MiniNoteHighway
            notes={snippetNotes}
            currentTimeMs={currentTimeMs}
            snippetStartTime={currentSnippet.startTime}
            snippetDuration={currentSnippet.duration}
            activePlayers={activePlayers}
            multiPitch={multiPitch}
          />
        )}

        {/* Feature #5: Floating scoring popups */}
        <ScoringPopups events={lastScoringEvents} players={playersDisplay} />

        {/* Per-player pitch indicators */}
        <div className="flex gap-6 items-center justify-center mt-2">
          {activePlayers.map(p => (
            <PitchIndicator
              key={p.id}
              player={p}
              pitch={multiPitch.getPlayerPitch(p.id)}
            />
          ))}
        </div>
      </div>

      {/* Snippet timer */}
      <div className="flex-shrink-0 px-3 pb-3">
        <Progress value={snippetProgress} className="h-2 bg-white/10" />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>{t('medley.snippetOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}</span>
          <button onClick={handleEndEarly} aria-label={t('medley.quit')} className="text-red-400/60 hover:text-red-400 transition-colors">
            {t('medley.quit')}
          </button>
        </div>
      </div>
    </>
  );
}

// ===================== FEATURE #4: MINI NOTE HIGHWAY =====================

function MiniNoteHighway({
  notes,
  currentTimeMs,
  snippetStartTime,
  snippetDuration,
  activePlayers,
  multiPitch,
}: {
  notes: Note[];
  currentTimeMs: number;
  snippetStartTime: number;
  snippetDuration: number;
  activePlayers: MedleyPlayer[];
  multiPitch: ReturnType<typeof useMultiPitchDetector>;
}) {
  const HIGHWAY_HEIGHT = 160;
  const LOOKAHEAD_MS = 5000;
  const LOOKBEHIND_MS = 1000;

  const absoluteTime = snippetStartTime + currentTimeMs;

  const pitches = notes.map(n => n.pitch);
  const minPitch = Math.min(...pitches, 40);
  const maxPitch = Math.max(...pitches, 80);
  const pitchRange = Math.max(maxPitch - minPitch, 12);

  const pitchToY = (pitch: number) => {
    const normalized = (pitch - minPitch) / pitchRange;
    return 1 - Math.max(0, Math.min(1, normalized));
  };

  const windowStart = absoluteTime - LOOKBEHIND_MS;
  const windowEnd = absoluteTime + LOOKAHEAD_MS;
  const windowDuration = windowEnd - windowStart;

  const visibleNotes = notes.filter(n => {
    const noteEnd = n.startTime + n.duration;
    return noteEnd > windowStart && n.startTime < windowEnd;
  });

  const timeToX = (time: number) => {
    return (time - windowStart) / windowDuration;
  };

  const playheadX = timeToX(absoluteTime);

  const lanePitches = [minPitch + pitchRange * 0.2, minPitch + pitchRange * 0.5, minPitch + pitchRange * 0.8];

  const playerPitchOverlays = activePlayers.map(p => {
    const pitchData = multiPitch.getPlayerPitch(p.id);
    if (!pitchData?.isSinging || pitchData.note == null) return null;
    return {
      playerId: p.id,
      color: p.color,
      y: pitchToY(pitchData.note),
    };
  }).filter(Boolean) as Array<{ playerId: string; color: string; y: number }>;

  return (
    <div
      className="w-full max-w-2xl bg-black/30 rounded-lg border border-white/10 overflow-hidden relative mb-2"
      style={{ height: `${HIGHWAY_HEIGHT}px` }}
    >
      {lanePitches.map((lp, i) => {
        const y = pitchToY(lp) * 100;
        return (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-white/5"
            style={{ top: `${y}%` }}
          />
        );
      })}

      {visibleNotes.map((note, i) => {
        const x = timeToX(note.startTime);
        const endX = timeToX(note.startTime + note.duration);
        const y = pitchToY(note.pitch) * 100;
        const width = Math.max(2, (endX - x) * 100);

        const isActive = absoluteTime >= note.startTime && absoluteTime <= note.startTime + note.duration;
        const isPast = absoluteTime > note.startTime + note.duration;

        let bg: string;
        if (isPast) {
          bg = note.isGolden ? '#92400e' : '#166534';
        } else if (isActive) {
          bg = note.isGolden ? '#fbbf24' : '#a855f7';
        } else {
          bg = note.isGolden ? '#fbbf2440' : '#a855f740';
        }

        return (
          <div
            key={`${note.startTime}-${i}`}
            className={`absolute rounded-sm transition-opacity ${isPast ? 'opacity-40' : isActive ? 'opacity-100' : 'opacity-60'}`}
            style={{
              left: `${x * 100}%`,
              top: `${y}%`,
              width: `${width}%`,
              height: '8px',
              marginTop: '-4px',
              backgroundColor: bg,
              boxShadow: isActive ? `0 0 6px ${bg}` : 'none',
            }}
          />
        );
      })}

      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10"
        style={{ left: `${playheadX * 100}%` }}
      />

      {playerPitchOverlays.map(pp => (
        <div
          key={pp.playerId}
          className="absolute w-4 h-4 rounded-full border-2 border-white z-20"
          style={{
            left: `${playheadX * 100}%`,
            top: `${pp.y * 100}%`,
            marginTop: '-8px',
            marginLeft: '-8px',
            backgroundColor: pp.color,
            boxShadow: `0 0 8px ${pp.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ===================== FEATURE #5: COMBO DISPLAY =====================

function ComboDisplay({ combo }: { combo: number }) {
  if (combo < 3) return null;

  if (combo >= 10) {
    return (
      <span className="text-xs font-bold text-red-400 animate-pulse"
        style={{ textShadow: '0 0 8px rgba(248, 113, 113, 0.6)' }}>
        {combo}x MEGA COMBO!
      </span>
    );
  }
  if (combo >= 5) {
    return (
      <span className="text-xs font-bold text-orange-400 animate-pulse">
        {combo}x COMBO!
      </span>
    );
  }
  return (
    <span className="text-xs text-yellow-400">{combo}x</span>
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

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
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
