'use client';

import { useEffect, useRef } from 'react';
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
 *   • A start button (also triggered with Enter / Return)
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
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const showSong = !!song;

  // Keyboard: Enter/Return starts the game (matches the setup auto-focus pattern).
  // Focus the start button so the hint "press Enter" is real and keyboard users
  // are one keypress away — but keep it non-modal (no focus trap).
  useEffect(() => {
    const btn = startButtonRef.current;
    if (!btn || disabled) return;
    const timer = setTimeout(() => btn.focus(), 150);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!startButtonRef.current?.disabled) {
          startButtonRef.current?.click();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disabled]);

  const content = (
    <div className={overlay ? 'relative w-full max-w-4xl mx-auto' : 'w-full max-w-4xl mx-auto'} data-testid={testId ?? 'party-starting-screen'}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-8">
        {/* Mode title — icon drops in, title fades up */}
        <div
          className="text-5xl mb-4 animate-starting-icon-drop drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          aria-hidden="true"
        >
          {modeIcon}
        </div>
        <h2 className="text-3xl font-bold mb-2 text-center text-balance">{modeTitle}</h2>
        {subtitle && <p className="text-white/60 mb-6 text-center max-w-xl">{subtitle}</p>}

        {/* Song card — only shown when the song was explicitly chosen */}
        {(showSong || songLabel) && (
          <div
            className={`relative overflow-hidden bg-gradient-to-r ${modeColor} bg-opacity-20 border border-white/25 rounded-xl px-8 py-4 mb-6 text-center max-w-xl w-full shadow-xl animate-starting-card-in`}
            style={{ animationDelay: '60ms' }}
          >
            {/* subtle shine sweep */}
            <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
              <div className="absolute -inset-y-4 w-24 rotate-12 bg-white/20 blur-md" style={{ left: '10%' }} />
              <div className="absolute -inset-y-4 w-16 rotate-12 bg-white/15 blur-md" style={{ left: '55%' }} />
            </div>
            <div className="relative text-xs text-white/80 uppercase tracking-[0.2em] mb-1">{t('partyStarting.song')}</div>
            {showSong ? (
              <>
                <div className="relative text-xl font-bold text-white truncate">🎵 {song!.title}</div>
                <div className="relative text-sm text-white/75 truncate">{song!.artist}</div>
              </>
            ) : (
              <div className="relative text-lg font-bold text-white">🎵 {songLabel}</div>
            )}
          </div>
        )}
        {showSong && song!.duration > 0 && (
          <p className="text-white/40 text-xs mb-4 -mt-2">{formatDuration(song!.duration)} {t('partyStarting.minutes')}</p>
        )}

        {/* Participants */}
        <div className="mb-3 text-sm text-white/60 font-medium tracking-wide">
          {t('partyStarting.participants').replace('{n}', String(players.length))}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-3xl">
          {players.map((player, index) => (
            <div
              key={player.id}
              className={`relative flex flex-col items-center w-24 sm:w-28 rounded-xl p-3 animate-starting-card-in animate-starting-card-float ${
                player.isStartPlayer
                  ? `bg-gradient-to-br ${modeColor} border-2 border-white/70 shadow-xl scale-105`
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              style={{
                animationDelay: `${140 + index * 90}ms, ${400 + index * 90}ms`,
              }}
              data-testid={`starting-player-${player.name}`}
            >
              {player.isStartPlayer && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-lg animate-starting-badge-pop"
                  style={{ animationDelay: `${300 + index * 90}ms` }}
                >
                  ▶ {startPlayerLabel ?? t('partyStarting.startPlayer')}
                </span>
              )}
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className={`w-14 h-14 rounded-full object-cover mb-2 ${player.isStartPlayer ? 'border-2 border-white/80 shadow-md' : 'border-2 border-white/25'}`}
                />
              ) : (
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white border-2 mb-2 ${
                    player.isStartPlayer ? 'border-white/80 shadow-md' : 'border-white/25'
                  }`}
                  style={{ backgroundColor: player.color }}
                  aria-hidden="true"
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-white truncate w-full text-center">{player.name}</span>
              <span className="text-[10px] text-white/55 truncate w-full text-center">
                {player.playerType === 'companion' ? '📱' : player.micName ? '🎤' : ''}
                {player.playerType === 'companion' ? ` ${t('partyStarting.companion')}` : player.micName ? ` ${player.micName}` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Loading hint */}
        {loadingLabel && (
          <div className="mb-4 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-white/60 border-t-transparent rounded-full" />
            <p className="text-white/40 text-sm mt-2">{loadingLabel}</p>
          </div>
        )}

        {/* Start button — glowing, focused, Enter-enabled */}
        <Button
          ref={startButtonRef}
          onClick={onStart}
          disabled={disabled}
          className={`group relative px-12 py-4 text-xl font-bold bg-gradient-to-r ${modeColor} text-white rounded-xl hover:scale-[1.03] active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 ${
            disabled ? '' : 'animate-start-btn-glow'
          }`}
          data-testid="party-starting-start-button"
        >
          <span className="drop-shadow-sm">{t('partyStarting.startButton')}</span>
          <span
            className="ml-3 inline-block transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            ▸
          </span>
        </Button>
        <p className="text-white/35 text-xs mt-4 text-center max-w-sm">
          {t('partyStarting.hint')}{' '}
          <kbd className="inline-block px-1.5 py-0.5 rounded border border-white/20 bg-white/10 text-[10px] font-semibold text-white/60 shadow-sm align-middle">
            Enter
          </kbd>
        </p>
      </div>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm overflow-y-auto flex items-center justify-center animate-in fade-in duration-300">
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
