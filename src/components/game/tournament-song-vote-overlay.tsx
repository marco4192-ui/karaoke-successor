'use client';

import { useEffect } from 'react';
import { Song } from '@/types/game';
import { TournamentMatch } from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';

/**
 * Tournament Bracket Song Vote (#8) — unified-design overlay.
 *
 * When a tournament runs with songSelectionMode 'vote', this overlay replaces
 * the plain inline song picker between bracket rounds. It follows the same
 * design language as the mode starting screens (glass card, staged entrance
 * animations, kbd hints) and adds:
 *   • A player "VS" header so everyone sees who the song is for
 *   • Song cards with cover art / gradient placeholders, hover shine + scale
 *   • Keyboard picking (1 / 2 / 3) and Esc to skip (random)
 *   • radiogroup semantics for screen readers
 */
export interface TournamentSongVoteOverlayProps {
  match: TournamentMatch;
  songs: Song[];
  /** Round label, e.g. "Round 2 of 3" (already translated by the caller) */
  roundLabel?: string;
  onPick: (song: Song) => void;
  onSkip: () => void;
}

export function TournamentSongVoteOverlay({
  match,
  songs,
  roundLabel,
  onPick,
  onSkip,
}: TournamentSongVoteOverlayProps) {
  const { t } = useTranslation();

  // Keyboard shortcuts: 1-3 pick a song, Escape skips to a random pick.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        const index = Number(e.key) - 1;
        const song = songs[index];
        if (song) {
          e.preventDefault();
          onPick(song);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [songs, onPick, onSkip]);

  const p1 = match.player1;
  const p2 = match.player2;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md overflow-y-auto py-6 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={t('tournament.songVoteTitle')}
      data-testid="tournament-song-vote-overlay"
    >
      <div className="relative w-full max-w-3xl mx-4 rounded-2xl border border-amber-500/25 bg-zinc-900/95 shadow-[0_0_60px_rgba(245,158,11,0.12),0_24px_48px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Top accent line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" aria-hidden="true" />

        <div className="p-5 sm:p-7">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="text-4xl mb-2 animate-starting-icon-drop drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" aria-hidden="true">🗳️</div>
            <h2 className="text-2xl font-bold text-white">{t('tournament.songVoteTitle')}</h2>
            <p className="text-sm text-white/55 mt-1">{t('tournament.songVoteHint')}</p>
          </div>

          {/* Player VS header */}
          {(p1 || p2) && (
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6 animate-starting-card-in" style={{ animationDelay: '80ms' }}>
              {/* Player 1 chip */}
              <div className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 max-w-[40%]"
                style={{
                  borderColor: `${p1?.color || '#FF6B6B'}55`,
                  background: `linear-gradient(135deg, ${p1?.color || '#FF6B6B'}18, ${p1?.color || '#FF6B6B'}08)`,
                }}
              >
                {p1?.avatar ? (
                  <img src={p1.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/25 shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white/25 shrink-0"
                    style={{ backgroundColor: p1?.color || '#FF6B6B' }}
                    aria-hidden="true"
                  >
                    {(p1?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-white truncate">{p1?.name ?? '—'}</span>
              </div>

              {/* VS badge */}
              <div className="shrink-0 flex flex-col items-center">
                <span
                  className="text-lg sm:text-xl font-black text-amber-400 tracking-widest animate-vote-vs-pulse select-none"
                  style={{ textShadow: '0 0 18px rgba(245,158,11,0.5)' }}
                  aria-hidden="true"
                >
                  {t('tournament.vs')}
                </span>
                {roundLabel && (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/40 mt-0.5">{roundLabel}</span>
                )}
              </div>

              {/* Player 2 chip */}
              <div className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 max-w-[40%]"
                style={{
                  borderColor: `${p2?.color || '#4ECDC4'}55`,
                  background: `linear-gradient(135deg, ${p2?.color || '#4ECDC4'}18, ${p2?.color || '#4ECDC4'}08)`,
                }}
              >
                {p2?.avatar ? (
                  <img src={p2.avatar} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white/25 shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white/25 shrink-0"
                    style={{ backgroundColor: p2?.color || '#4ECDC4' }}
                    aria-hidden="true"
                  >
                    {(p2?.name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-white truncate">{p2?.name ?? '—'}</span>
              </div>
            </div>
          )}

          {/* Song cards */}
          <div
            className="grid gap-3 sm:gap-4 sm:grid-cols-3 mb-5"
            role="radiogroup"
            aria-label={t('tournament.songVoteTitle')}
          >
            {songs.map((song, index) => (
              <button
                key={song.id}
                type="button"
                role="radio"
                aria-checked={false}
                onClick={() => onPick(song)}
                className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left cursor-pointer transition-all duration-200 hover:border-amber-400/60 hover:bg-white/[0.08] hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(245,158,11,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 animate-vote-card-in"
                style={{ animationDelay: `${160 + index * 110}ms` }}
                data-testid={`tournament-vote-song-${index + 1}`}
              >
                {/* Hover shine sweep */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                >
                  <div className="absolute -inset-y-8 w-16 rotate-12 bg-gradient-to-r from-transparent via-white/12 to-transparent translate-x-[-120%] group-hover:animate-vote-shine" />
                </div>

                {/* Cover art / placeholder */}
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2.5 border border-white/10">
                  {song.coverImage ? (
                    <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/20 via-purple-500/15 to-cyan-500/15 flex items-center justify-center">
                      <span className="text-3xl transition-transform duration-300 group-hover:scale-110" aria-hidden="true">🎵</span>
                    </div>
                  )}
                  {/* Keyboard number badge */}
                  <span
                    className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[22px] h-[22px] px-1 rounded-md border border-white/20 bg-black/60 backdrop-blur-sm text-[11px] font-bold text-white/85"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </div>

                <div className="font-medium text-sm text-white truncate">{song.title}</div>
                <div className="text-xs text-white/50 truncate">{song.artist}</div>
              </button>
            ))}
          </div>

          {/* Skip button */}
          <button
            type="button"
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50 hover:text-white/85 hover:border-white/25 hover:bg-white/[0.06] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            data-testid="party-song-vote-skip-button"
          >
            <span aria-hidden="true">🎲</span>
            <span>{t('tournament.songVoteSkip')}</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded border border-white/15 bg-white/10 text-[10px] font-semibold text-white/50 shadow-sm">Esc</kbd>
          </button>

          {/* Keyboard hint */}
          <p className="mt-3 text-center text-white/35 text-xs">
            {t('tournament.songVoteKeyHint')}
          </p>
        </div>
      </div>
    </div>
  );
}
