'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorPartyLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Party-Modi =====================

interface PartyMode {
  command: string;
  icon: string;
  labelKey: string;
  fallback: string;
  players: string;
  color: string;
  isNew?: boolean;
}

const PARTY_MODES: PartyMode[] = [
  { command: 'start_ptm',                icon: '🎤',  labelKey: 'party.passTheMic',           fallback: 'Pass the Mic',       players: '2-8',   color: 'from-cyan-500/20 to-blue-500/20 border-cyan-400/20' },
  { command: 'start_companion_singalong', icon: '📱',  labelKey: 'party.companionSingalong',    fallback: 'Companion Singalong', players: '2-8',   color: 'from-emerald-500/20 to-teal-500/20 border-emerald-400/20' },
  { command: 'start_medley',             icon: '🎵',  labelKey: 'party.medleyContest',         fallback: 'Medley Contest',     players: '2-4',   color: 'from-purple-500/20 to-pink-500/20 border-purple-400/20' },
  { command: 'start_missing_words',      icon: '📝',  labelKey: 'party.missingWords',          fallback: 'Missing Words',       players: '1-4',   color: 'from-orange-500/20 to-red-500/20 border-orange-400/20' },
  { command: 'start_blind',              icon: '🙈',  labelKey: 'party.blindKaraoke',          fallback: 'Blind Karaoke',       players: '1-4',   color: 'from-green-500/20 to-teal-500/20 border-green-400/20' },
  { command: 'start_tournament',         icon: '🏆',  labelKey: 'party.tournamentMode',        fallback: 'Tournament',          players: '2-32',  color: 'from-amber-500/20 to-yellow-500/20 border-amber-400/20', isNew: true },
  { command: 'start_br',                 icon: '👑',  labelKey: 'party.battleRoyaleTitle',     fallback: 'Battle Royale',       players: '2-24',  color: 'from-red-600/20 to-pink-600/20 border-red-400/20', isNew: true },
  { command: 'start_rate_my_song',       icon: '⭐',  labelKey: 'party.rateMySongTitle',      fallback: 'Rate My Song',        players: '1-2',   color: 'from-amber-500/20 to-orange-500/20 border-amber-400/20', isNew: true },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorPartyLite({ onSendDesktopCommand }: MirrorPartyLiteProps) {
    const { t } = useTranslation();

    const handleStart = useCallback(
      (mode: PartyMode) => {
        haptic();
        onSendDesktopCommand(mode.command);
      },
      [onSendDesktopCommand],
    );

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">🎉</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorPartyMode')}
          </h2>
        </div>

        {/* Game Mode Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {PARTY_MODES.map((mode) => {
            const label = t(mode.labelKey) === mode.labelKey ? mode.fallback : t(mode.labelKey);
            return (
              <button
                key={mode.command}
                onClick={() => handleStart(mode)}
                className={
                  'relative flex flex-col items-center gap-1.5 rounded-xl p-4 text-left ' +
                  'bg-gradient-to-br border active:scale-95 transition-transform '
                  + mode.color
                }
              >
                {mode.isNew && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-white/90 text-black px-1.5 py-0.5 rounded-full">
                    NEW
                  </span>
                )}
                <span className="text-2xl leading-none">{mode.icon}</span>
                <span className="text-sm font-semibold text-white leading-tight">{label}</span>
                <span className="text-[10px] text-white/50">{mode.players} {t('party.players')}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
}MirrorPartyLite.displayName = 'MirrorPartyLite';
