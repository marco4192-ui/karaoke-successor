'use client';

import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

/**
 * Unified mode starting screen — shown after "Ready to Play" and before the
 * actual gameplay for every party mode that does not own a dedicated intro
 * phase (Missing Words, Blind Karaoke, Rate my Song, Tournament pairings).
 *
 * Purpose: at a party (especially with many singers) people may still need a
 * moment to get ready or get into position. The screen shows:
 *   • Name of the party mode
 *   • Names + pictures of the participants (small boxes)
 *   • The start player (when relevant, e.g. duels)
 *   • The song name (when not randomly selected)
 *   • A start button
 */
export interface PartyStartingPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  /** Mic / companion label rendered under the name (e.g. "Mic 1", "Companion") */
  micName?: string;
  playerType?: 'microphone' | 'companion';
  /** Highlighted as the player who starts (duel player 1, PTM/CPTM start player) */
  isStartPlayer?: boolean;
}

export interface PartyStartingScreenProps {
  modeIcon: string;
  modeTitle: string;
  /** Tailwind gradient classes, e.g. 'from-cyan-500 to-blue-500' */
  modeColor: string;
  players: PartyStartingPlayer[];
  /** Explicit song (library/vote) — null hides the song name (random) */
  song?: Song | null;
  /** Alternative label when there is no single song (e.g. "5 Snippets") */
  songLabel?: string;
  /** Optional extra info line (round number, format hints, ...) */
  subtitle?: string;
  /** Caption above the highlighted start player, e.g. "Starts singing first" */
  startPlayerLabel?: string;
  onStart: () => void;
  disabled?: boolean;
  /** Optional loading hint (media preparation) shown above the button */
  loadingLabel?: string;
  /** Render as fixed fullscreen overlay instead of inline */
  overlay?: boolean;
  testId?: string;
}

export function PartyStartingScreen({
  modeIcon,
  modeTitle,
  modeColor,
  players,
  song,
  songLabel,
  subtitle,
  startPlayerLabel,
  onStart,
  disabled,
  loadingLabel,
  overlay,
  testId,
}: PartyStartingScreenProps) {
  const { t } = useTranslation();
  const showSong = !!song;
  const hasStartPlayer = players.some(p => p.isStartPlayer);

  const content = (
    <div className={overlay ? 'relative w-full max-w-4xl mx-auto' : 'w-full max-w-4xl mx-auto'} data-testid={testId ?? 'party-starting-screen'}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
        {/* Mode title */}
        <div className="text-5xl mb-4" aria-hidden="true">{modeIcon}</div>
        <h2 className="text-3xl font-bold mb-2 text-center">{modeTitle}</h2>
        {subtitle && <p className="text-white/60 mb-6 text-center max-w-xl">{subtitle}</p>}

        {/* Song card — only shown when the song was explicitly chosen */}
        {(showSong || songLabel) && (
          <div className={`bg-gradient-to-r ${modeColor} bg-opacity-20 border border-white/20 rounded-xl px-8 py-4 mb-6 text-center max-w-xl w-full shadow-lg`}>
            <div className="text-xs text-white/70 uppercase tracking-wider mb-1">{t('partyStarting.song')}</div>
            {showSong ? (
              <>
                <div className="text-xl font-bold text-white truncate">🎵 {song!.title}</div>
                <div className="text-sm text-white/70 truncate">{song!.artist}</div>
              </>
            ) : (
              <div className="text-lg font-bold text-white">🎵 {songLabel}</div>
            )}
          </div>
        )}
        {showSong && song!.duration > 0 && (
          <p className="text-white/40 text-xs mb-4 -mt-2">{formatDuration(song!.duration)} {t('partyStarting.minutes')}</p>
        )}

        {/* Participants */}
        <div className="mb-2 text-sm text-white/60 font-medium">
          {t('partyStarting.participants').replace('{n}', String(players.length))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-6 max-w-3xl">
          {players.map(player => (
            <div
              key={player.id}
              className={`relative flex flex-col items-center w-24 sm:w-28 rounded-xl p-3 transition-all ${
                player.isStartPlayer
                  ? `bg-gradient-to-br ${modeColor} border-2 border-white/60 shadow-lg scale-105`
                  : 'bg-white/5 border border-white/10'
              }`}
              data-testid={`starting-player-${player.name}`}
            >
              {player.avatar ? (
                <img src={player.avatar} alt={player.name} className="w-14 h-14 rounded-full object-cover border-2 border-white/30 mb-2" />
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 border-white/30 mb-2"
                  style={{ backgroundColor: player.color }}
                  aria-hidden="true"
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-white truncate w-full text-center">{player.name}</span>
              <span className="text-[10px] text-white/60 truncate w-full text-center">
                {player.playerType === 'companion' ? '📱' : player.micName ? '🎤' : ''}
                {player.playerType === 'companion' ? ` ${t('partyStarting.companion')}` : player.micName ? ` ${player.micName}` : ''}
              </span>
              {player.isStartPlayer && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
                  ▶ {startPlayerLabel ?? t('partyStarting.startPlayer')}
                </span>
              )}
            </div>
          ))}
        </div>

        {hasStartPlayer && !players.some(p => p.isStartPlayer) ? null : null}

        {/* Loading hint */}
        {loadingLabel && (
          <div className="mb-4 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full" />
            <p className="text-white/40 text-sm mt-2">{loadingLabel}</p>
          </div>
        )}

        {/* Start button */}
        <Button
          onClick={onStart}
          disabled={disabled}
          className={`px-12 py-4 text-xl font-bold bg-gradient-to-r ${modeColor} hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100`}
          data-testid="party-starting-start-button"
        >
          {t('partyStarting.startButton')}
        </Button>
        <p className="text-white/30 text-xs mt-4 text-center max-w-sm">{t('partyStarting.hint')}</p>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto flex items-center justify-center">
        {content}
      </div>
    );
  }
  return content;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
