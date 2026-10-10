'use client';

// ===================== Library-Lite-Mirror — Song-Options-Overlay =====================
//
// Das untere Sheet mit Song-Optionen: Header, Game-Mode-Badge,
// Schwierigkeit, Gegner/Partner-Auswahl, Warnung und Aktions-Buttons
// (Queue, Playlist, Spiel starten, Fuer Party auswaehlen, Herausfordern).
// R27a-Auslagerung aus mirror-library-lite.tsx — JSX und DIFF_OPTIONS
// byte-identisch; einzige Delta: `gameState.partyGameMode` → Prop
// `partyGameMode`.

import { useTranslation } from '@/lib/i18n/translations';
import { MODE_BUTTONS, dropdownStyle, formatDurationSec, haptic } from './helpers';
import type { GameMode, MobileSong } from '../../mobile-types';

export interface SongOptionsOverlayProps {
  overlaySong: MobileSong;
  closeOverlay: () => void;
  libGameMode: GameMode;
  ovDifficulty: 'easy' | 'medium' | 'hard';
  setOvDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  needsChallenge: boolean;
  missingOpponent: boolean;
  ovPartnerId: string | null;
  setOvPartnerId: (v: string | null) => void;
  allPartners: Array<{ id: string; name: string }>;
  ovAdding: boolean;
  ovChallengeSent: boolean;
  handleOverlayQueue: () => void;
  handleOverlayPlaylist: () => void;
  handleOverlayStart: () => void;
  handleOverlayChallenge: () => void;
  onSendDesktopCommand: (screen: string) => void;
  partyGameMode: string | null | undefined;
}

export function SongOptionsOverlay({
  overlaySong,
  closeOverlay,
  libGameMode,
  ovDifficulty,
  setOvDifficulty,
  needsChallenge,
  missingOpponent,
  ovPartnerId,
  setOvPartnerId,
  allPartners,
  ovAdding,
  ovChallengeSent,
  handleOverlayQueue,
  handleOverlayPlaylist,
  handleOverlayStart,
  handleOverlayChallenge,
  onSendDesktopCommand,
  partyGameMode,
}: SongOptionsOverlayProps) {
  const { t } = useTranslation();
  // Schwierigkeits-Optionen fuer Overlay
  const DIFF_OPTIONS = [
    { id: 'easy' as const, label: t('mobileViews.easy') || 'Leicht', color: 'bg-green-500/25 border-green-400/40 text-green-400' },
    { id: 'medium' as const, label: t('mobileViews.normal') || 'Normal', color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
    { id: 'hard' as const, label: t('mobileViews.hard') || 'Schwer', color: 'bg-red-500/25 border-red-400/40 text-red-400' },
  ];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={closeOverlay}
    >
      <div
        className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Overlay Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0 flex-1 mr-3">
            <h3 className="text-base font-bold text-white truncate">{overlaySong.title}</h3>
            <p className="text-sm text-white/50 truncate">{overlaySong.artist}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-white/30 font-mono">{formatDurationSec(overlaySong.duration)}</span>
              {overlaySong.genre && <span className="text-xs text-white/25">{overlaySong.genre}</span>}
            </div>
          </div>
          <button
            onClick={closeOverlay}
            className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Game-Mode Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium text-white/40">{t('mobileViews.gameMode') || 'Modus'}:</span>
          <span className={'rounded-lg px-2.5 py-1 text-xs font-bold ' +
            (libGameMode === 'single' ? 'bg-cyan-500/25 text-cyan-400' : libGameMode === 'duel' ? 'bg-red-500/25 text-red-400' : 'bg-pink-500/25 text-pink-400')}>
            {MODE_BUTTONS.find((m) => m.mode === libGameMode)?.icon}{' '}
            {t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '') === MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey
              ? MODE_BUTTONS.find((m) => m.mode === libGameMode)?.fallback
              : t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '')}
          </span>
        </div>

        {/* Schwierigkeit */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
            {t('mobileViews.difficulty') || 'Schwierigkeit'}
          </h4>
          <div className="flex gap-2">
            {DIFF_OPTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => { haptic(); setOvDifficulty(d.id); }}
                className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-all border ' +
                  (ovDifficulty === d.id ? d.color : 'bg-white/5 border-white/10 text-white/50')}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gegner/Partner-Auswahl (nur Duell/Duett) */}
        {needsChallenge && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
              {libGameMode === 'duel'
                ? (t('mobileViews.selectOpponent') || 'Gegner wählen')
                : (t('mobileViews.selectPartner') || 'Duett-Partner wählen')}
            </h4>
            <select
              value={ovPartnerId || ''}
              onChange={(e) => { haptic(); setOvPartnerId(e.target.value || null); }}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white cursor-pointer"
              style={dropdownStyle}
            >
              {allPartners.length > 0 ? (
                <option value="" className="bg-[#1a1a2e] text-white">
                  {t('mobileViews.chooseOpponent') || 'Gegner wählen...'}
                </option>
              ) : (
                <option value="" disabled className="bg-[#1a1a2e] text-white">
                  {t('mobileViews.noOpponentsAvailable') || 'Keine Gegner verfügbar'}
                </option>
              )}
              {allPartners.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Trennlinie */}
        <div className="border-t border-white/10 my-4" />

        {/* Warnung: kein Gegner ausgewaehlt */}
        {missingOpponent && (
          <p className="text-xs text-amber-400 text-center">
            {t('mobile.mirrorDuetHint') || 'Bitte Gegner auswaehlen oder Herausfordern (Chat)'}
          </p>
        )}

        {/* Aktions-Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Zur Queue */}
          <button
            onClick={handleOverlayQueue}
            disabled={ovAdding || missingOpponent}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <span className="text-base">{'\u{1F4CB}'}</span>
            <span>{t('mobileViews.queueTitle') || 'Zur Queue'}</span>
            {ovAdding && <span className="animate-spin text-xs">{'\u23F3'}</span>}
          </button>

          {/* Zur Playlist */}
          <button
            onClick={handleOverlayPlaylist}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-400 active:scale-[0.97] transition-all"
          >
            <span className="text-base">{'\u{1F4FB}'}</span>
            <span>{t('mobile.mirrorPlaylist') || 'Zur Playlist'}</span>
          </button>

          {/* Spiel starten */}
          <button
            onClick={handleOverlayStart}
            disabled={ovAdding || missingOpponent}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/20 text-white active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <span className="text-base">{'\u25B6\uFE0F'}</span>
            <span>{t('mobile.mirrorStartGame') || 'Spiel starten'}</span>
          </button>

          {/* Fuer Party auswaehlen (nur im Party-Setup Library-Modus) */}
          {partyGameMode && (
            <button
              onClick={() => {
                if (!overlaySong) return;
                onSendDesktopCommand(`party_select_song:${overlaySong.id}`);
                closeOverlay();
              }}
              disabled={ovAdding}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/20 text-white active:scale-[0.97] transition-all disabled:opacity-40"
            >
              <span className="text-base">{'\u{1F3B5}'}</span>
              <span>{t('mobile.mirrorPartySelect') || 'F\u00fcr Party ausw\u00e4hlen'}</span>
            </button>
          )}

          {/* Herausfordern (nur Duell/Duett) */}
          {needsChallenge && (
            <button
              onClick={handleOverlayChallenge}
              disabled={ovChallengeSent}
              className={'w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold active:scale-[0.97] transition-all ' +
                (ovChallengeSent
                  ? 'bg-green-500/20 border border-green-400/30 text-green-400'
                  : 'bg-red-500/15 border border-red-400/25 text-red-400')}
            >
              <span className="text-base">{ovChallengeSent ? '\u2705' : '\u2694\uFE0F'}</span>
              <span>{ovChallengeSent
                ? (t('mobile.mirrorChallengeSent') || 'Gesendet!')
                : (t('desktopChat.challenge') || 'Herausfordern (Chat)')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
