'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorPartySetupLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Party-Mode-Konfiguration =====================

interface PartyModeInfo {
  command: string;
  icon: string;
  labelKey: string;
  fallback: string;
  color: string;
}

const PARTY_MODE_INFO: Record<string, PartyModeInfo> = {
  'pass-the-mic':         { command: 'start_ptm',                icon: '\u{1F3A4}',  labelKey: 'party.passTheMic',        fallback: 'Pass the Mic',       color: 'from-cyan-500 to-blue-500' },
  'companion-singalong':  { command: 'start_companion_singalong', icon: '\u{1F4F1}',  labelKey: 'party.companionSingalong', fallback: 'Companion Singalong', color: 'from-emerald-500 to-teal-500' },
  'medley':              { command: 'start_medley',             icon: '\u{1F3B5}',  labelKey: 'party.medleyContest',      fallback: 'Medley Contest',     color: 'from-purple-500 to-pink-500' },
  'missing-words':       { command: 'start_missing_words',      icon: '\u{1F4DD}',  labelKey: 'party.missingWords',       fallback: 'Missing Words',       color: 'from-orange-500 to-red-500' },
  'blind':               { command: 'start_blind',              icon: '\u{1F648}',  labelKey: 'party.blindKaraoke',       fallback: 'Blind Karaoke',       color: 'from-green-500 to-teal-500' },
  'tournament':          { command: 'start_tournament',         icon: '\u{1F3C6}',  labelKey: 'party.tournamentMode',     fallback: 'Tournament',          color: 'from-amber-500 to-yellow-500' },
  'battle-royale':       { command: 'start_br',                 icon: '\u{1F451}',  labelKey: 'party.battleRoyaleTitle',  fallback: 'Battle Royale',       color: 'from-red-600 to-pink-600' },
  'rate-my-song':        { command: 'start_rate_my_song',       icon: '\u{2B50}',  labelKey: 'party.rateMySongTitle',   fallback: 'Rate My Song',        color: 'from-amber-500 to-orange-500' },
};

// ===================== Schwierigkeits-Optionen =====================

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { id: Difficulty; labelKey: string; fallback: string; color: string }[] = [
  { id: 'easy',   labelKey: 'difficulty.easy',   fallback: 'Leicht',   color: 'bg-green-500/25 border-green-400/40 text-green-400' },
  { id: 'medium', labelKey: 'difficulty.medium', fallback: 'Normal',   color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
  { id: 'hard',   labelKey: 'difficulty.hard',   fallback: 'Schwer',   color: 'bg-red-500/25 border-red-400/40 text-red-400' },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorPartySetupLite = React.memo<MirrorPartySetupLiteProps>(
  function MirrorPartySetupLite({ gameState, onSendDesktopCommand }) {
    const { t } = useTranslation();
    const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');

    const modeKey = gameState.partyGameMode || '';
    const modeInfo = PARTY_MODE_INFO[modeKey];

    const handleDifficulty = useCallback((d: Difficulty) => {
      haptic();
      setDifficulty(d);
      onSendDesktopCommand(`party_difficulty:${d}`);
    }, [onSendDesktopCommand]);

    const handleBack = useCallback(() => {
      haptic();
      onSendDesktopCommand('party');
    }, [onSendDesktopCommand]);

    const handleStart = useCallback(() => {
      haptic();
      onSendDesktopCommand('party_start');
    }, [onSendDesktopCommand]);

    if (!modeInfo) {
      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          <div className="flex items-center gap-2 py-2">
            <span className="text-2xl">{'\u{1F3AE}'}</span>
            <h2 className="text-lg font-semibold text-white">{t('party.title')}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">{'\u{23F3}'}</span>
            <p className="text-sm text-white/40">{t('mobile.mirrorSetupLoading') || 'Setup wird geladen...'}</p>
          </div>
          <button
            onClick={handleBack}
            className="w-full rounded-lg p-3 text-center text-sm font-medium bg-white/10 border border-white/20 text-white/70 active:scale-[0.98] transition-transform"
          >
            {'\u2190'} {t('mobile.mirrorBackToParty') || 'Zurueck zu Party-Modi'}
          </button>
        </div>
      );
    }

    const label = t(modeInfo.labelKey) === modeInfo.labelKey ? modeInfo.fallback : t(modeInfo.labelKey);

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header mit Modus-Icon und Name */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${modeInfo.color} text-xl`}>{modeInfo.icon}</div>
            <h2 className="text-lg font-semibold text-white">{label}</h2>
          </div>
        </div>

        {/* Zurueck-Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-left bg-white/5 border border-white/10 active:scale-[0.98] active:bg-white/10 transition-all"
        >
          <span className="text-sm">{'\u2190'}</span>
          <span className="text-sm font-medium text-white/70">{t('mobile.mirrorBackToParty') || 'Zurueck zu Party-Modi'}</span>
        </button>

        {/* Schwierigkeit */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">{t('partySetup.difficulty') || 'Schwierigkeit'}</h3>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => {
              const isActive = difficulty === d.id;
              const dLabel = t(d.labelKey) === d.labelKey ? d.fallback : t(d.labelKey);
              return (
                <button
                  key={d.id}
                  onClick={() => handleDifficulty(d.id)}
                  className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform ' + (isActive ? d.color + ' border' : 'bg-white/5 border border-white/10 text-white/50')}
                >{dLabel}</button>
              );
            })}
          </div>
        </div>

        {/* Hinweis: Spieler-Auswahl auf dem Desktop */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">{'\u{1F4BB}'}</span>
            <div>
              <p className="text-sm font-medium text-white/80">{t('mobile.mirrorSetupDesktopHint') || 'Spieler-Auswahl auf dem Desktop'}</p>
              <p className="text-xs text-white/40 mt-1">{t('mobile.mirrorSetupDesktopHintDesc') || 'Waehle Spieler und Einstellungen auf dem Desktop-Bildschirm.'}</p>
            </div>
          </div>
        </div>

        {/* Start-Button */}
        <button
          onClick={handleStart}
          className={'w-full rounded-xl p-4 text-center text-base font-bold active:scale-[0.97] transition-transform bg-gradient-to-r ' + modeInfo.color + ' text-white shadow-lg'}
        >
          {t('partySetup.startGame') || 'Spiel starten'} {'\u25B6'}
        </button>
      </div>
    );
  },
);
