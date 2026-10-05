'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== R54: Turnier-Publikumsabstimmung =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring). Während eines Turnier-
// Duells können Companion-Spieler für Seite 1 oder 2 abstimmen (einmal pro
// Match). Rein präsentativ — der Server-Call bleibt beim Caller.

export interface MobileTournamentVoteProps {
  onVote: (playerSide: 1 | 2) => void;
}

export function MobileTournamentVote({ onVote }: MobileTournamentVoteProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-sm border border-rose-500/30 rounded-2xl p-4 shadow-2xl">
      <div className="text-center mb-3">
        <span className="text-2xl">❤️</span>
        <p className="text-sm font-bold text-white mt-1">{t('mobile.tournamentVoteTitle')}</p>
        <p className="text-xs text-white/50">{t('mobile.tournamentVoteDesc')}</p>
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-sm py-3"
          onClick={() => onVote(1)}
        >
          {t('companion.player1')}
        </Button>
        <Button
          className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-sm py-3"
          onClick={() => onVote(2)}
        >
          {t('companion.player2')}
        </Button>
      </div>
    </div>
  );
}

// ===================== R54: Song-läuft-Warnung (Issue 11) =====================
// Navigiert ein steuernder Companion während eines laufenden Songs weg,
// fragt dieses Overlay nach: Song beenden ODER Steuerung freigeben.

export interface MobileSongRunningOverlayProps {
  currentSong: { title: string; artist: string } | null;
  onEndSong: () => void;
  onReleaseControl: () => void;
  onClose: () => void;
}

export function MobileSongRunningOverlay({ currentSong, onEndSong, onReleaseControl, onClose }: MobileSongRunningOverlayProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] border border-amber-400/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{'\u26A0\uFE0F'}</div>
          <h2 className="text-lg font-bold text-white">{t('mobile.mirrorSongRunningWarning')}</h2>
          <p className="text-sm text-white/50 mt-2">
            {currentSong ? `${currentSong.title} — ${currentSong.artist}` : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onEndSong}
            className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
          >
            {'\u2716'} {t('mobile.mirrorEndSong')}
          </button>
          <button
            onClick={onReleaseControl}
            className="flex-1 py-3 rounded-xl font-medium bg-green-500/20 border border-green-500/40 text-green-300 active:bg-green-500/30 transition-all text-sm"
          >
            {'\u{1F513}'} {t('mobile.mirrorReleaseControlShort')}
          </button>
        </div>
      </div>
    </div>
  );
}
