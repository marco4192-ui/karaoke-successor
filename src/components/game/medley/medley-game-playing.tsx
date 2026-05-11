/**
 * Medley Contest — Playing Phase UI
 *
 * Renders the active game view: top bar with scores, lyrics, notes display,
 * pitch indicators, and snippet timer.
 */

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import type { Note, LyricLine } from '@/types/game';
import { useMultiPitchDetector } from '@/hooks/use-multi-pitch-detector';
import { PitchIndicator } from './medley-game-components';
import type { MedleyPlayer, MedleySong, SnippetMatchup } from './medley-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== PROPS =====================

export interface MedleyPlayingProps {
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
}: MedleyPlayingProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Top bar: badge + progress + controls */}
      <div className="flex-shrink-0 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400 text-sm px-2 py-0.5">{t('medley.badge')}</Badge>
            <span className="text-white/60 text-sm">{t('medley.songOf').replace('{n}', String(currentSnippetIdx + 1)).replace('{m}', String(snippetCount))}</span>
            {!isTeam && (
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5">{t('medley.ffaBadge')}</Badge>
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
        {/* Per-player live scores */}
        <div className="flex items-center gap-3">
          {[...playersDisplay].sort((a, b) => b.score - a.score).map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              {/* Avatar or color dot fallback */}
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="w-5 h-5 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: p.color }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium" style={{ color: p.color }}>{p.name}: {p.score}</span>
              {p.combo > 2 && (
                <span className="text-xs text-amber-400">{p.combo}x</span>
              )}
            </div>
          ))}
        </div>
        <Progress value={totalProgress} className="h-1.5 bg-white/10" />
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {/* Song info + timer */}
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
          <p className="text-white/60 text-sm">{currentSnippet.song.artist}</p>
          <div className="text-2xl font-mono text-purple-400 mt-1">
            {Math.max(0, Math.ceil((currentSnippet.duration - currentTimeMs) / 1000))}s
          </div>
        </div>

        {/* Lyrics */}
        {currentLyricLine && (
          <div className="bg-black/30 rounded-xl px-8 py-4 mb-4 max-w-lg">
            <div className="text-center text-xl font-bold text-white">{currentLyricLine.text}</div>
          </div>
        )}

        {/* Notes display (simplified: current note position) */}
        {snippetNotes.length > 0 && (
          <div className="w-full max-w-lg bg-black/20 rounded-lg p-2 mb-4 overflow-hidden h-16 flex items-end">
            <div className="flex gap-0.5 w-full">
              {snippetNotes.map((note, i) => {
                const absoluteTime = currentSnippet.startTime + currentTimeMs;
                const isActive = absoluteTime >= note.startTime && absoluteTime <= note.startTime + note.duration;
                const isPast = absoluteTime > note.startTime + note.duration;
                const relStart = (note.startTime - currentSnippet.startTime) / currentSnippet.duration * 100;
                const width = Math.max(2, (note.duration / currentSnippet.duration) * 100);
                const height = 20 + (note.pitch % 24) * 2;

                return (
                  <div
                    key={`${note.startTime}-${i}`}
                    className={`flex-shrink-0 rounded-sm transition-all ${isActive ? 'opacity-100' : isPast ? 'opacity-30' : 'opacity-50'}`}
                    style={{
                      height: `${height}px`,
                      width: `${width}%`,
                      backgroundColor: isActive
                        ? (note.isGolden ? '#fbbf24' : '#a855f7')
                        : isPast
                          ? (note.isGolden ? '#92400e' : '#581c87')
                          : (note.isGolden ? '#fbbf2440' : '#a855f740'),
                      marginLeft: i === 0 ? `${relStart}%` : '0',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Per-player pitch indicators */}
        <div className="flex gap-6 items-center justify-center">
          {(isTeam && currentMatchup
            ? [currentMatchup.playerA, currentMatchup.playerB]
            : playersDisplay
          ).map(p => (
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
          <button onClick={handleEndEarly} aria-label="Beenden" className="text-red-400/60 hover:text-red-400 transition-colors">
            {t('medley.quit')}
          </button>
        </div>
      </div>
    </>
  );
}
