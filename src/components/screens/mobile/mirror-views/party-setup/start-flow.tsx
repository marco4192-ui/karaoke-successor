'use client';

// ===================== Party-Setup-Mirror — Start-Flow =====================
//
// START-LEISTE des Party-Setup-Mirrors: Library-Song-Bestätigung (Desktop
// hat einen Song vorausgewählt) + Start-Leiste (bleibt grau bis alle
// Einstellungen komplett, wird dann zum Start-Button).
// R6-Auslagerung aus mirror-party-setup-lite.tsx — JSX unverändert;
// handleStartBarClick → onStart, modeInfo.color/minPlayers → Props,
// selectedPlayers.length → selectedCount.

import { useTranslation } from '@/lib/i18n/translations';
import { haptic, tOr } from './utils';
import { DIFFICULTIES, SONG_SEL_CONFIG } from './constants';
import type { Difficulty } from './types';

export interface LibrarySongBannerProps {
  partyLibrarySong: { id: string; title: string; artist: string };
  onSendDesktopCommand: (command: string) => void;
}

export function LibrarySongBanner({ partyLibrarySong, onSendDesktopCommand }: LibrarySongBannerProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xl shrink-0">
          {'\u{1F3B5}'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-green-400 font-medium uppercase tracking-wider">{t('unifiedSetup.songSelected') || 'Song ausgewaehlt'}</p>
          <h3 className="text-white font-bold text-sm truncate">{partyLibrarySong.title}</h3>
          <p className="text-white/50 text-xs truncate">{partyLibrarySong.artist}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            haptic();
            onSendDesktopCommand('party_start');
          }}
          className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white active:scale-95 transition-all shadow-lg"
        >
          {'\u25B6'} {t('unifiedSetup.startGame') || 'Starten'}
        </button>
      </div>
    </div>
  );
}

export interface StartBarProps {
  canStart: boolean;
  configSent: boolean;
  selectedCount: number;
  difficulty: Difficulty;
  songSelection: string;
  modeColor: string;
  minPlayers: number;
  onStart: () => void;
}

export function StartBar({
  canStart,
  configSent,
  selectedCount,
  difficulty,
  songSelection,
  modeColor,
  minPlayers,
  onStart,
}: StartBarProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!canStart}
      className={'rounded-xl border px-4 py-3 transition-all active:scale-[0.98] text-left ' +
        (canStart
          ? `bg-gradient-to-r ${modeColor} border-0 shadow-lg cursor-pointer`
          : 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed')}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={'text-sm font-bold ' + (canStart ? 'text-white' : 'text-white/50')}>
            {canStart
              ? (t('unifiedSetup.readyToPlay') || 'Bereit zum Spielen!')
              : (t('partySetup.players') || 'Spieler auswaehlen')}
          </p>
          {!canStart ? (
            <p className="text-xs text-white/30 mt-0.5">
              {t('unifiedSetup.errorMinPlayers').replace('{n}', String(minPlayers))}
            </p>
          ) : null}
          {canStart ? (
            <p className="text-xs text-white/70 mt-0.5">
              {selectedCount} {t('party.players') || 'Spieler'}{' \u2022 '}{tOr(t, DIFFICULTIES.find((d) => d.id === difficulty)?.labelKey || '', difficulty === 'easy' ? 'Leicht' : difficulty === 'medium' ? 'Normal' : 'Schwer')}
              {' \u2022 '}{tOr(t, SONG_SEL_CONFIG[songSelection]?.labelKey || '', SONG_SEL_CONFIG[songSelection]?.fallback || songSelection)}
              {configSent ? ' \u2022 ' + (t('mobile.mirrorChallengeSent') || 'Gesendet!') : ''}
            </p>
          ) : null}
        </div>
        {canStart ? (
          <span className="text-2xl">{'\u25B6'}</span>
        ) : null}
      </div>
    </button>
  );
}
