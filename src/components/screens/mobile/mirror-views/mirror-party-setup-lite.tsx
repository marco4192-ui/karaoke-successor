'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorPartySetupLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
  availableProfiles: any[];
}

// ===================== Typen =====================

type Difficulty = 'easy' | 'medium' | 'hard';
type InputMode = 'microphone' | 'companion' | 'mixed';

interface PartyModeInfo {
  command: string;
  icon: string;
  labelKey: string;
  fallback: string;
  color: string;
  minPlayers: number;
  maxPlayers: number;
  supportsCompanionApp: boolean;
  forceInputMode?: InputMode;
  sharedMic: boolean;
  /** Mirrors the desktop's Singing Device Assignment mode */
  deviceAssignmentMode: 'shared-mic' | 'exclusive' | 'flexible' | 'none';
  settings: ModeSettingConfig[];
  songSelectionOptions: string[];
}

interface ModeSettingConfig {
  key: string;
  labelKey: string;
  fallback: string;
  descKey?: string;
  descFallback?: string;
  type: 'slider' | 'toggle' | 'select';
  min?: number;
  max?: number;
  step?: number;
  defaultValue: string | number | boolean;
  unit?: string;
  options?: { value: string | number; labelKey: string; fallback: string }[];
}

// ===================== Party-Mode-Konfiguration =====================

const PARTY_MODE_INFO: Record<string, PartyModeInfo> = {
  'pass-the-mic': {
    command: 'start_ptm', icon: '\u{1F3A4}', labelKey: 'party.passTheMic', fallback: 'Pass the Mic',
    color: 'from-cyan-500 to-blue-500', minPlayers: 2, maxPlayers: 8,
    supportsCompanionApp: false, forceInputMode: 'microphone', sharedMic: true, deviceAssignmentMode: 'shared-mic',
    settings: [],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
  },
  'companion-singalong': {
    command: 'start_companion_singalong', icon: '\u{1F4F1}', labelKey: 'party.companionSingalong', fallback: 'Companion Singalong',
    color: 'from-emerald-500 to-teal-500', minPlayers: 2, maxPlayers: 8,
    supportsCompanionApp: true, forceInputMode: 'companion', sharedMic: false, deviceAssignmentMode: 'none',
    settings: [
      { key: 'minTurnDuration', labelKey: 'modeSettings.minTurnDuration', fallback: 'Min. Runden-Dauer', type: 'slider', min: 5, max: 30, step: 5, defaultValue: 15, unit: 's' },
      { key: 'maxTurnDuration', labelKey: 'modeSettings.maxTurnDuration', fallback: 'Max. Runden-Dauer', type: 'slider', min: 30, max: 90, step: 5, defaultValue: 45, unit: 's' },
      { key: 'blinkWarning', labelKey: 'modeSettings.blinkWarning', fallback: 'Blink-Warnung', descKey: 'modeSettings.blinkWarningDesc', descFallback: 'Warnzeit vor Wechsel', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['library', 'random', 'vote', 'medley'],
  },
  'medley': {
    command: 'start_medley', icon: '\u{1F3B5}', labelKey: 'party.medleyContest', fallback: 'Medley Contest',
    color: 'from-purple-500 to-pink-500', minPlayers: 2, maxPlayers: 4,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'exclusive',
    settings: [
      { key: 'playMode', labelKey: 'modeSettings.playMode', fallback: 'Spielmodus', type: 'select',
        options: [
          { value: 'ffa', labelKey: 'modeSettings.ffa', fallback: 'FFA (Alle vs Alle)' },
          { value: 'team', labelKey: 'modeSettings.team', fallback: 'Team (1v1 / 2v2)' },
          { value: 'elimination', labelKey: 'modeSettings.elimination', fallback: 'Elimination' },
        ], defaultValue: 'ffa' },
      { key: 'teamSize', labelKey: 'modeSettings.teamSize', fallback: 'Team-Groesse', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1v1Snippets', fallback: '1v1 (5 Snippets)' },
          { value: 2, labelKey: 'modeSettings.2v2Snippets', fallback: '2v2 (4 Snippets)' },
        ], defaultValue: 1 },
      { key: 'snippetDuration', labelKey: 'modeSettings.snippetDuration', fallback: 'Snippet-Dauer', type: 'slider', min: 15, max: 60, step: 5, defaultValue: 30, unit: 's' },
      { key: 'transitionTime', labelKey: 'modeSettings.transitionTime', fallback: 'Ueberblendzeit', type: 'slider', min: 1, max: 5, step: 1, defaultValue: 3, unit: 's' },
    ],
    songSelectionOptions: ['random'],
  },
  'missing-words': {
    command: 'start_missing_words', icon: '\u{1F4DD}', labelKey: 'party.missingWords', fallback: 'Missing Words',
    color: 'from-orange-500 to-red-500', minPlayers: 1, maxPlayers: 4,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'missingWordFrequency', labelKey: 'modeSettings.missingWordFrequency', fallback: 'Frequenz', type: 'select',
        options: [
          { value: 'light', labelKey: 'modeSettings.mwLight', fallback: 'Leicht (15%)' },
          { value: 'normal', labelKey: 'modeSettings.mwNormal', fallback: 'Normal (30%)' },
          { value: 'hard', labelKey: 'modeSettings.mwHard', fallback: 'Schwer (60%)' },
          { value: 'insane', labelKey: 'modeSettings.mwInsane', fallback: 'Verrueckt (90%)' },
        ], defaultValue: 'normal' },
      { key: 'granularity', labelKey: 'modeSettings.missingGranularity', fallback: 'Versteck-Modus', type: 'select',
        options: [
          { value: 'word', labelKey: 'modeSettings.mwWords', fallback: 'Woerter' },
          { value: 'passage', labelKey: 'modeSettings.mwPassages', fallback: 'Passagen' },
          { value: 'both', labelKey: 'modeSettings.mwBoth', fallback: 'Beides' },
        ], defaultValue: 'passage' },
      { key: 'hardcoreMissingWords', labelKey: 'modeSettings.hardcoreMode', fallback: 'Hardcore', descKey: 'modeSettings.mwHardcoreModeDesc', descFallback: 'Versteckte Woerter bleiben bis zum Ende verborgen', type: 'toggle', defaultValue: false },
      { key: 'escalating', labelKey: 'modeSettings.escalating', fallback: 'Steigernd', descKey: 'modeSettings.mwEscalatingDesc', descFallback: 'Frequenz steigt pro Runde', type: 'toggle', defaultValue: false },
      { key: 'bestOf', labelKey: 'modeSettings.bestOf', fallback: 'Best of', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1Round', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
          { value: 7, labelKey: 'modeSettings.bestOf7', fallback: 'Best of 7' },
        ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
  },
  'blind': {
    command: 'start_blind', icon: '\u{1F648}', labelKey: 'party.blindKaraoke', fallback: 'Blind Karaoke',
    color: 'from-green-500 to-teal-500', minPlayers: 1, maxPlayers: 4,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'blindFrequency', labelKey: 'modeSettings.blindFrequency', fallback: 'Blind-Frequenz', type: 'select',
        options: [
          { value: 'light', labelKey: 'modeSettings.blindLight', fallback: 'Leicht (15%)' },
          { value: 'normal', labelKey: 'modeSettings.blindNormal', fallback: 'Normal (30%)' },
          { value: 'hard', labelKey: 'modeSettings.blindHard', fallback: 'Schwer (60%)' },
          { value: 'insane', labelKey: 'modeSettings.blindInsane', fallback: 'Verrueckt (90%)' },
        ], defaultValue: 'normal' },
      { key: 'hardcore', labelKey: 'modeSettings.hardcoreMode', fallback: 'Hardcore', descKey: 'modeSettings.hardcoreModeDesc', descFallback: 'Text versteckt wenn Noten sichtbar', type: 'toggle', defaultValue: false },
      { key: 'escalating', labelKey: 'modeSettings.escalating', fallback: 'Steigernd', type: 'toggle', defaultValue: false },
      { key: 'bestOf', labelKey: 'modeSettings.bestOf', fallback: 'Best of', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.1Round', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
          { value: 7, labelKey: 'modeSettings.bestOf7', fallback: 'Best of 7' },
        ], defaultValue: 3 },
    ],
    songSelectionOptions: ['random'],
  },
  'tournament': {
    command: 'start_tournament', icon: '\u{1F3C6}', labelKey: 'party.tournamentMode', fallback: 'Tournament',
    color: 'from-amber-500 to-yellow-500', minPlayers: 2, maxPlayers: 32,
    supportsCompanionApp: false, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'maxPlayers', labelKey: 'modeSettings.bracketSize', fallback: 'Turnier-Groesse', type: 'select',
        options: [
          { value: 2, labelKey: 'modeSettings.bracket2', fallback: '2 - Duell' },
          { value: 4, labelKey: 'modeSettings.bracket4', fallback: '4 Spieler' },
          { value: 8, labelKey: 'modeSettings.bracket8', fallback: '8 Spieler' },
          { value: 16, labelKey: 'modeSettings.bracket16', fallback: '16 Spieler' },
          { value: 32, labelKey: 'modeSettings.bracket32', fallback: '32 Spieler' },
        ], defaultValue: 8 },
      { key: 'shortMode', labelKey: 'modeSettings.shortMode', fallback: 'Kurz-Modus', descKey: 'modeSettings.shortModeDesc', descFallback: 'Jedes Match dauert nur 60 Sekunden', type: 'toggle', defaultValue: true },
      { key: 'tournamentType', labelKey: 'tournament.type', fallback: 'Turnier-Typ', type: 'select',
        options: [
          { value: 'single', labelKey: 'modeSettings.singleElimination', fallback: 'Single Elimination' },
          { value: 'double', labelKey: 'modeSettings.doubleElimination', fallback: 'Double Elimination' },
        ], defaultValue: 'single' },
      { key: 'tiebreakMode', labelKey: 'tournament.tiebreak', fallback: 'Tiebreak', type: 'select',
        options: [
          { value: 'coinflip', labelKey: 'modeSettings.coinFlip', fallback: 'Muenzwurf' },
          { value: 'accuracy', labelKey: 'modeSettings.accuracy', fallback: 'Genauigkeit' },
          { value: 'combo', labelKey: 'modeSettings.maxCombo', fallback: 'Max. Combo' },
          { value: 'goldenmic', labelKey: 'modeSettings.goldenMic', fallback: 'Golden Mic' },
        ], defaultValue: 'accuracy' },
      { key: 'dynamicDifficulty', labelKey: 'tournament.dynamicDifficulty', fallback: 'Dynamische Schwierigkeit', type: 'toggle', defaultValue: false },
      { key: 'songSelectionMode', labelKey: 'tournament.songSelection', fallback: 'Song-Auswahl', type: 'select',
        options: [
          { value: 'random', labelKey: 'modeSettings.random', fallback: 'Zufall' },
          { value: 'vote', labelKey: 'modeSettings.vote', fallback: 'Abstimmung' },
        ], defaultValue: 'random' },
      { key: 'seedingMode', labelKey: 'tournament.seeding', fallback: 'Seeding', type: 'select',
        options: [
          { value: 'random', labelKey: 'modeSettings.random', fallback: 'Zufall' },
          { value: 'strength', labelKey: 'modeSettings.byStrength', fallback: 'Nach Staerke' },
        ], defaultValue: 'random' },
    ],
    songSelectionOptions: ['random'],
  },
  'battle-royale': {
    command: 'start_br', icon: '\u{1F451}', labelKey: 'party.battleRoyaleTitle', fallback: 'Battle Royale',
    color: 'from-red-600 to-pink-600', minPlayers: 2, maxPlayers: 24,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'exclusive',
    settings: [
      { key: 'roundDuration', labelKey: 'modeSettings.roundDuration', fallback: 'Runden-Dauer', type: 'slider', min: 30, max: 180, step: 15, defaultValue: 60, unit: 's' },
      { key: 'finalRoundDuration', labelKey: 'modeSettings.finalRoundDuration', fallback: 'Finale-Dauer', type: 'slider', min: 60, max: 300, step: 30, defaultValue: 120, unit: 's' },
      { key: 'medleyMode', labelKey: 'modeSettings.medleyMode', fallback: 'Medley-Modus', descKey: 'modeSettings.medleyModeDesc', descFallback: 'Mehrere Song-Snippets pro Runde', type: 'toggle', defaultValue: false },
      { key: 'grandFinaleBestOf', labelKey: 'modeSettings.grandFinale', fallback: 'Grosses Finale', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.normalFinal', fallback: 'Normales Finale' },
          { value: 3, labelKey: 'modeSettings.bestOf3', fallback: 'Best of 3' },
          { value: 5, labelKey: 'modeSettings.bestOf5', fallback: 'Best of 5' },
        ], defaultValue: 1 },
      { key: 'bountyEnabled', labelKey: 'modeSettings.bountySystem', fallback: 'Bounty-System', descKey: 'modeSettings.bountySystemDesc', descFallback: 'Punkte-Multiplikator fuer den Fuehrenden', type: 'toggle', defaultValue: true },
      { key: 'bountyMultiplier', labelKey: 'modeSettings.bountyMultiplier', fallback: 'Bounty-Multiplikator', type: 'slider', min: 1.2, max: 3, step: 0.1, defaultValue: 1.5, unit: 'x' },
      { key: 'escalatingDifficulty', labelKey: 'modeSettings.escalatingDifficulty', fallback: 'Steigende Schwierigkeit', type: 'toggle', defaultValue: false },
      { key: 'shrinkingTimer', labelKey: 'modeSettings.shrinkingTimer', fallback: 'Schrumpfender Timer', type: 'toggle', defaultValue: false },
      { key: 'noRepeatProtection', labelKey: 'modeSettings.noRepeatProtection', fallback: 'Kein-Wiederholung-Schutz', type: 'toggle', defaultValue: true },
    ],
    songSelectionOptions: ['random', 'vote'],
  },
  'rate-my-song': {
    command: 'start_rate_my_song', icon: '\u{2B50}', labelKey: 'party.rateMySongTitle', fallback: 'Rate My Song',
    color: 'from-amber-500 to-orange-500', minPlayers: 1, maxPlayers: 2,
    supportsCompanionApp: true, sharedMic: false, deviceAssignmentMode: 'flexible',
    settings: [
      { key: 'duration', labelKey: 'modeSettings.duration', fallback: 'Dauer', type: 'select',
        options: [
          { value: 'short', labelKey: 'modeSettings.short60s', fallback: 'Kurz (60s)' },
          { value: 'normal', labelKey: 'modeSettings.normalDuration', fallback: 'Normal' },
        ], defaultValue: 'normal' },
      { key: 'seriesRounds', labelKey: 'modeSettings.seriesRounds', fallback: 'Runden', type: 'select',
        options: [
          { value: 1, labelKey: 'modeSettings.round1', fallback: '1 Runde' },
          { value: 3, labelKey: 'modeSettings.rounds3', fallback: '3 Runden' },
          { value: 5, labelKey: 'modeSettings.rounds5', fallback: '5 Runden' },
          { value: 7, labelKey: 'modeSettings.rounds7', fallback: '7 Runden' },
        ], defaultValue: 1 },
      { key: 'categoriesEnabled', labelKey: 'modeSettings.categories', fallback: 'Kategorien', descKey: 'modeSettings.categoriesDesc', descFallback: '4 Bewertungskategorien', type: 'toggle', defaultValue: true },
      { key: 'challengesEnabled', labelKey: 'modeSettings.challenges', fallback: 'Challenges', descKey: 'modeSettings.challengesDesc', descFallback: 'Zufaellige Challenges vor jeder Runde', type: 'toggle', defaultValue: false },
      { key: 'bettingEnabled', labelKey: 'modeSettings.betting', fallback: 'Wetten', descKey: 'modeSettings.bettingDesc', descFallback: 'Publikum kann Punkte tippen', type: 'toggle', defaultValue: false },
    ],
    songSelectionOptions: ['library', 'random'],
  },
};

// ===================== Schwierigkeits-Optionen =====================

const DIFFICULTIES: { id: Difficulty; labelKey: string; fallback: string; color: string }[] = [
  { id: 'easy', labelKey: 'difficulty.easy', fallback: 'Leicht', color: 'bg-green-500/25 border-green-400/40 text-green-400' },
  { id: 'medium', labelKey: 'difficulty.medium', fallback: 'Normal', color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
  { id: 'hard', labelKey: 'difficulty.hard', fallback: 'Schwer', color: 'bg-red-500/25 border-red-400/40 text-red-400' },
];

// ===================== Song-Auswahl-Buttons =====================

const SONG_SEL_CONFIG: Record<string, { icon: string; fallback: string; labelKey: string }> = {
  library: { icon: '\u{1F4DA}', fallback: 'Bibliothek', labelKey: 'unifiedSetup.fromLibrary' },
  random:  { icon: '\u{1F3B2}', fallback: 'Zufall', labelKey: 'unifiedSetup.randomSong' },
  vote:    { icon: '\u{1F5F3}\uFE0F', fallback: 'Abstimmung', labelKey: 'unifiedSetup.voteSongs' },
  medley:  { icon: '\u{1F3B5}', fallback: 'Medley', labelKey: 'unifiedSetup.medleyMix' },
};

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Wiederverwendbare UI-Bausteine =====================

/** Section header with gradient accent bar (unified visual hierarchy) */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
      <span className="w-1 h-3.5 rounded-full bg-gradient-to-b from-cyan-400 to-purple-500 shrink-0" aria-hidden="true" />
      {children}
    </h3>
  );
}

/** Mobile-freundlicher Toggle-Switch */
function Toggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => { haptic(); onToggle(!value); }}
      className={'relative w-11 h-6 rounded-full shrink-0 transition-colors ' + (value ? 'bg-cyan-500' : 'bg-white/20')}
    >
      <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ' + (value ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/** Dropdown fuer Select-Einstellungen */
function SelectDropdown({ options, value, onChange }: {
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (v: string | number | boolean) => void;
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => { haptic(); const raw = e.target.value; if (raw === 'true') { onChange(true); } else if (raw === 'false') { onChange(false); } else if (raw === '') { onChange(raw); } else { const n = Number(raw); onChange(isNaN(n) ? raw : n); } }}
      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px',
      }}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)} className="bg-[#1a1a2e] text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Mobile-freundlicher Drag-Slider (range input) — wie in der Main-App (user request item 12) */
function DragSlider({ value, min, max, step, unit, onChange }: {
  value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => haptic()}
        className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-cyan-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,0.5)]
          [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-400 [&::-moz-range-thumb]:border-0"
        aria-label={String(value)}
      />
      <span className="shrink-0 min-w-[52px] text-right text-sm font-mono font-semibold text-cyan-400 tabular-nums">
        {Math.round(value * 10) / 10}{unit || ''}
      </span>
    </div>
  );
}

// ===================== Component =====================

export function MirrorPartySetupLite({ gameState, onSendDesktopCommand, availableProfiles: _availableProfiles }: MirrorPartySetupLiteProps) {
    const { t } = useTranslation();
    const modeKey = gameState.partyGameMode || '';
    const modeInfo = PARTY_MODE_INFO[modeKey];

    // DO-NOT-CHANGE: Lade ALLE Host-Profile direkt vom hostprofiles-Endpoint,
    // da der availableProfiles-Prop nur unbeanspruchte Profile enthaelt
    // (von getopponents), aber fuer die Party-Playerauswahl alle Profile
    // auf dem Desktop gebraucht werden.
    const [allHostProfiles, setAllHostProfiles] = useState<Array<{
      id: string; name: string; avatar?: string; color: string; isActive?: boolean;
    }>>([]);
    const [profilesLoading, setProfilesLoading] = useState(false);

    useEffect(() => {
      if (!modeInfo) return;
      let cancelled = false;
      setProfilesLoading(true);
      fetch('/api/mobile?action=hostprofiles')
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d.success) return;
          // hostprofiles gibt alle Desktop-Profile zurueck
          const profiles = (d.profiles || []).map((p: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            color: p.color,
            isActive: p.isActive !== false,
          }));
          if (!cancelled) setAllHostProfiles(profiles);
        })
        .catch(() => { /* ignore */ })
        .finally(() => { if (!cancelled) setProfilesLoading(false); });
      return () => { cancelled = true; };
    }, [modeInfo?.command]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lokaler State fuer das gesamte Setup
    // Initialize difficulty from the desktop's global setting (synced via gamestate)
    const [difficulty, setDifficulty] = React.useState<Difficulty>(
      (gameState.difficulty as Difficulty) || 'medium'
    );
    // Sync difficulty when the desktop global setting changes
    React.useEffect(() => {
      if (gameState.difficulty && gameState.difficulty !== difficulty) {
        setDifficulty(gameState.difficulty as Difficulty);
      }
    }, [gameState.difficulty]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [settings, setSettings] = useState<Record<string, any>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [songSelection, setSongSelection] = useState<string>('random');
    const [inputMode, setInputMode] = useState<InputMode>('microphone');
    const [error, setError] = useState<string | null>(null);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [configSent, setConfigSent] = useState(false);

    // ── Singing Device Assignment state (user request items 4 + 7) ──
    const [deviceAssignments, setDeviceAssignments] = useState<Record<string, 'mic' | 'companion'>>({});
    const [micAssignments, setMicAssignments] = useState<Record<string, string>>({});
    const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
    // ── Song filter state (user request item 4) ──
    const [filterGenre, setFilterGenre] = useState('all');
    const [filterLanguage, setFilterLanguage] = useState('all');
    const [filterReleaseYear, setFilterReleaseYear] = useState('all');
    const [filterCombined, setFilterCombined] = useState(true);

    // ── LIVE SETUP MIRROR (user request item 7) ──────────────────────────
    // Desktop-pushed setup state — the mirror renders and edits the SAME
    // state the desktop shows. Incoming pushes apply field-by-field (diff
    // guard → no echo loop); outgoing user edits push party_apply_config
    // to the desktop instantly (push, not poll).
    const setup = gameState.partySetupState;
    const desktopMics = React.useMemo(() => setup?.mics ?? [], [setup?.mics]);
    const micCount = desktopMics.length;
    const connectedIds = React.useMemo(
      () => new Set<string>(setup?.connectedProfileIds ?? []),
      [setup?.connectedProfileIds]
    );
    const deviceMode = modeInfo?.deviceAssignmentMode
      ?? (modeInfo?.sharedMic ? 'shared-mic' : modeInfo?.forceInputMode === 'companion' ? 'none' : 'flexible');

    // Timestamp of the last sync-IN — live pushes skip briefly after it so
    // applying desktop state does not immediately echo back.
    const lastSyncInAt = React.useRef(0);

    // Apply desktop pushes (diff-guarded)
    React.useEffect(() => {
      if (!setup) return;
      lastSyncInAt.current = Date.now();
      // Extract values first — TS narrowing of `setup` does not survive
      // into the setState callbacks below.
      const su = setup;
      const ids = su.selectedPlayers.map(p => p.id);
      const suDifficulty = su.difficulty;
      const suSettings = su.settings;
      const suDeviceAssignments = su.deviceAssignments;
      const suMicAssignments = su.micAssignments;
      const suSongSelection = su.songSelection;
      const suFilterGenre = su.filterGenre;
      const suFilterLanguage = su.filterLanguage;
      const suFilterReleaseYear = su.filterReleaseYear;
      const suFilterCombined = su.filterCombined;
      const suSelectedMicId = su.selectedMicId;
      setSelectedPlayers(prev => (prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids));
      if (suDifficulty) setDifficulty(prev => (prev === suDifficulty ? prev : suDifficulty));
      if (suSettings && Object.keys(suSettings).length > 0) {
        setSettings(prev => {
          const merged = { ...prev, ...suSettings };
          const changed = Object.keys(merged).some(k => prev[k] !== merged[k]);
          return changed ? merged : prev;
        });
      }
      if (suDeviceAssignments) {
        setDeviceAssignments(prev => (JSON.stringify(prev) === JSON.stringify(suDeviceAssignments) ? prev : suDeviceAssignments));
      }
      if (suMicAssignments) {
        setMicAssignments(prev => (JSON.stringify(prev) === JSON.stringify(suMicAssignments) ? prev : suMicAssignments));
      }
      if (suSongSelection) {
        setSongSelection(prev => (prev === suSongSelection ? prev : suSongSelection));
      }
      if (typeof suFilterGenre === 'string') setFilterGenre(prev => (prev === suFilterGenre ? prev : suFilterGenre));
      if (typeof suFilterLanguage === 'string') setFilterLanguage(prev => (prev === suFilterLanguage ? prev : suFilterLanguage));
      if (typeof suFilterReleaseYear === 'string') setFilterReleaseYear(prev => (prev === suFilterReleaseYear ? prev : suFilterReleaseYear));
      if (typeof suFilterCombined === 'boolean') setFilterCombined(prev => (prev === suFilterCombined ? prev : suFilterCombined));
      if (suSelectedMicId !== undefined) {
        setSelectedMicId(prev => (prev === (suSelectedMicId ?? null) ? prev : (suSelectedMicId ?? null)));
      }
    }, [setup]);

    // ── LIVE PUSH OUT: every companion edit reaches the desktop instantly ──
    React.useEffect(() => {
      // Nothing selected yet → nothing meaningful to push (avoid overwriting
      // the desktop with the mirror's initial defaults)
      if (selectedPlayers.length === 0) return;
      // Skip when this change came from a desktop sync-in (echo guard)
      if (Date.now() - lastSyncInAt.current < 600) return;
      const timer = setTimeout(() => {
        const config = JSON.stringify({
          mode: modeKey,
          players: selectedPlayers,
          difficulty,
          settings,
          deviceAssignments,
          micAssignments,
          // Live song selection only for non-navigating methods — library/vote
          // navigate the desktop and are only sent on the explicit start tap
          songSelection: (songSelection === 'random' || songSelection === 'medley') ? songSelection : undefined,
          filterGenre,
          filterLanguage,
          filterReleaseYear,
          filterCombined,
          ...(deviceMode === 'shared-mic' && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: desktopMics.find(m => m.id === selectedMicId)?.name } : {}),
        });
        onSendDesktopCommand(`party_apply_config:${config}`);
      }, 300);
      return () => clearTimeout(timer);
    }, [
      selectedPlayers, difficulty, settings, deviceAssignments, micAssignments,
      songSelection, filterGenre, filterLanguage, filterReleaseYear, filterCombined,
      selectedMicId, modeKey, onSendDesktopCommand, deviceMode, desktopMics,
    ]);

    // Initiale Settings aus Config setzen (nur beim ersten Laden des Modus)
    const initializedModeRef = React.useRef('');
    React.useEffect(() => {
      if (!modeInfo || initializedModeRef.current === modeInfo.command) return;
      initializedModeRef.current = modeInfo.command;
      const init: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
      modeInfo.settings.forEach((s) => { init[s.key] = s.defaultValue; });
      setSettings(init);
      setInputMode(modeInfo.forceInputMode || (modeInfo.supportsCompanionApp ? 'mixed' : 'microphone'));
      setSelectedPlayers([]);
      setError(null);
      // Song-Auswahl: Default auf erste verfuegbare Option
      if (modeInfo.songSelectionOptions.length > 0) {
        setSongSelection(modeInfo.songSelectionOptions[0]);
      }
      setConfigSent(false);
    }, [modeInfo?.command]); // eslint-disable-line react-hooks/exhaustive-deps

    // DO-NOT-CHANGE: Nutze die direkt geladenen Host-Profile statt des Props,
    // da der Prop nur unbeanspruchte Profile enthaelt.
    const activeProfiles = useMemo(() => {
      if (allHostProfiles.length > 0) {
        return allHostProfiles.filter((p) => p.isActive !== false);
      }
      // Fallback auf den Prop (sollte selten vorkommen)
      if (!Array.isArray(_availableProfiles)) return [];
      return _availableProfiles.filter((p: any) => p.isActive !== false); // eslint-disable-line @typescript-eslint/no-explicit-any
    }, [allHostProfiles, _availableProfiles]);

    // Player-Toggle (setzt auch eine Default-Device-Wahl wie auf dem Desktop)
    const handleTogglePlayer = useCallback((profileId: string) => {
      haptic();
      setSelectedPlayers((prev) => {
        if (prev.includes(profileId)) {
          setDeviceAssignments((devPrev) => {
            const updated = { ...devPrev };
            delete updated[profileId];
            return updated;
          });
          setMicAssignments((micPrev) => {
            const updated: Record<string, string> = {};
            for (const [mic, pid] of Object.entries(micPrev)) {
              if (pid !== profileId) updated[mic] = pid;
            }
            return updated;
          });
          return prev.filter((id) => id !== profileId);
        }
        if (prev.length >= (modeInfo?.maxPlayers || 8)) {
          setError(`Max. ${modeInfo?.maxPlayers || 8} Spieler`);
          return prev;
        }
        setError(null);
        // Default device: flexible with >=2 mics → mic; otherwise companion
        const defaultDevice: 'mic' | 'companion' =
          (deviceMode === 'none') ? 'companion'
          : (deviceMode === 'flexible' && micCount < 2 && prev.length > 0) ? 'companion'
          : 'mic';
        setDeviceAssignments((devPrev) => ({ ...devPrev, [profileId]: defaultDevice }));
        return [...prev, profileId];
      });
    }, [modeInfo?.maxPlayers, deviceMode, micCount]);

    // Setting aendern
    const handleSettingChange = useCallback((key: string, value: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      haptic();
      setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleDifficulty = useCallback((d: Difficulty) => {
      haptic();
      setDifficulty(d);
    }, []);

    // DO-NOT-CHANGE: Zurueck mit Leave-Bestaetigungs-Popup (wie Desktop-App)
    const handleBack = useCallback(() => {
      haptic();
      setShowLeaveDialog(true);
    }, []);

    const handleLeaveConfirm = useCallback(() => {
      setShowLeaveDialog(false);
      onSendDesktopCommand('party_cancel');
    }, [onSendDesktopCommand]);

    const handleLeaveCancel = useCallback(() => {
      haptic();
      setShowLeaveDialog(false);
    }, []);

    // DO-NOT-CHANGE: Config an Desktop senden (mit songSelection).
    // Der Desktop wendet die Config an und triggert automatisch
    // die Songauswahl (random=sofort, library=navigiert, vote=Abstimmung).
    const sendConfig = useCallback((targetSongSelection: string) => {
      if (!modeInfo) return;
      if (selectedPlayers.length < modeInfo.minPlayers) {
        setError(`Min. ${modeInfo.minPlayers} ${t('party.players') || 'Spieler'} erforderlich`);
        return;
      }
      haptic();
      setConfigSent(true);
      setError(null);
      const config = JSON.stringify({
        mode: modeKey,
        players: selectedPlayers,
        difficulty,
        settings,
        inputMode,
        deviceAssignments,
        micAssignments,
        songSelection: targetSongSelection,
        filterGenre,
        filterLanguage,
        filterReleaseYear,
        filterCombined,
        ...(deviceMode === 'shared-mic' && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: desktopMics.find(m => m.id === selectedMicId)?.name } : {}),
      });
      onSendDesktopCommand(`party_apply_config:${config}`);
    }, [modeInfo, modeKey, selectedPlayers, difficulty, settings, inputMode, deviceAssignments, micAssignments, filterGenre, filterLanguage, filterReleaseYear, filterCombined, deviceMode, selectedMicId, desktopMics, t, onSendDesktopCommand]);

    const label = tOr(t, modeInfo?.labelKey || '', modeInfo?.fallback || '');
    const canStart = modeInfo ? selectedPlayers.length >= modeInfo.minPlayers : false;

    // Song-Auswahl-Klick: nur State setzen, NICHT senden.
    // Das Senden passiert erst beim Klick auf die Start-Leiste.
    const handleSongSelectClick = useCallback((opt: string) => {
      haptic();
      setSongSelection(opt);
      setConfigSent(false);
    }, []);

    // Start-Leiste Klick: sendet Config mit der aktuell gewaehlten Songauswahl
    const handleStartBarClick = useCallback(() => {
      if (!canStart || !modeInfo) return;
      haptic();
      sendConfig(songSelection);
    }, [canStart, modeInfo, songSelection, sendConfig]);

    // -------- Alle Hooks MUSS vor dem fruehen Return stehen (Rules of Hooks) --------
    const renderLeaveDialog = useCallback(() => {
      if (!showLeaveDialog) return null;
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleLeaveCancel}>
          <div className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{'\u26A0\uFE0F'}</div>
              <h2 className="text-lg font-bold text-white">{t('dialogs.partyLeaveTitle') || 'Party-Modus verlassen?'}</h2>
              <p className="text-sm text-white/50 mt-2">
                {t('dialogs.partyLeaveDesc') || 'Du bist dabei, den Party-Modus zu verlassen.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLeaveCancel}
                className="flex-1 py-3 rounded-xl font-medium bg-white/10 text-white active:bg-white/20 transition-all text-sm"
              >
                {t('dialogs.back') || 'Zurueck'}
              </button>
              <button
                onClick={handleLeaveConfirm}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
              >
                {t('dialogs.endParty') || 'Verlassen'}
              </button>
            </div>
          </div>
        </div>
      );
    }, [showLeaveDialog, handleLeaveCancel, handleLeaveConfirm, t]);

    // -------- Loading State --------
    if (!modeInfo) {
      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          <div className="flex items-center gap-2 py-2">
            <span className="text-2xl">{'\u{1F3AE}'}</span>
            <h2 className="text-lg font-semibold text-white">{t('party.title')}</h2>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl animate-pulse">{'\u{23F3}'}</span>
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

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${modeInfo.color} text-xl shadow-lg`}>{modeInfo.icon}</div>
            <h2 className="text-lg font-semibold text-white">{label}</h2>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/60 tabular-nums">
            {selectedPlayers.length}/{modeInfo.maxPlayers}
          </span>
        </div>

        {/* Zurueck-Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-left bg-white/5 border border-white/10 active:scale-[0.98] active:bg-white/10 transition-all"
        >
          <span className="text-sm">{'\u2190'}</span>
          <span className="text-sm font-medium text-white/70">{t('mobile.mirrorBackToParty') || 'Zurueck zu Party-Modi'}</span>
        </button>

        {/* Fehler-Meldung */}
        {error ? (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : null}

        {/* -------- SPIELER-AUSWAHL -------- */}
        <div>
          <SectionHeader>
            {t('partySetup.players') || 'Spieler'} ({selectedPlayers.length}/{modeInfo.minPlayers}-{modeInfo.maxPlayers})
          </SectionHeader>
          <div className="grid grid-cols-2 gap-2">
            {activeProfiles.map((profile: any, idx: number) => {
              const isSelected = selectedPlayers.includes(profile.id);
              const colors = ['#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#F97316'];
              const color = profile.color || colors[idx % colors.length];
              return (
                <button
                  key={profile.id}
                  onClick={() => handleTogglePlayer(profile.id)}
                  className={'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left active:scale-[0.97] transition-all border ' +
                    (isSelected
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/5 opacity-60')}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: color + '40', border: `2px solid ${isSelected ? color : 'transparent'}` }}
                  >
                    {isSelected
                      ? '\u2713'
                      : profile.avatar
                        ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                        : (profile.name?.[0] || '?')}
                  </div>
                  <span className="text-sm font-medium text-white truncate">{profile.name || 'Player'}</span>
                </button>
              );
            })}
          </div>
          {activeProfiles.length === 0 && !profilesLoading ? (
            <p className="text-xs text-white/30 text-center py-3">
              {t('mobile.mirrorProfileNoProfiles') || 'Keine Profile auf dem Desktop vorhanden'}
            </p>
          ) : null}
          {profilesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
              <span className="ml-2 text-xs text-white/40">{t('mobile.mirrorLoadingProfiles') || 'Profile laden...'}</span>
            </div>
          ) : null}
        </div>

        {/* -------- SINGING DEVICE ASSIGNMENT (user request items 3+4) -------- */}
        {selectedPlayers.length > 0 && (deviceMode === 'exclusive' || deviceMode === 'flexible') ? (
          <div>
            <SectionHeader>
              {tOr(t, 'unifiedSetup.singingDeviceAssignment', 'Singing Device Assignment')}
            </SectionHeader>
            {deviceMode === 'flexible' && micCount >= 2 ? (
              <p className="text-[11px] text-white/40 mb-2 px-1">
                {tOr(t, 'unifiedSetup.deviceMultiMicHint', 'Duell-Modus: Mikrofone werden geteilt — kein festes Mikro pro Spieler.').replace('{n}', String(micCount))}
              </p>
            ) : null}
            {deviceMode === 'flexible' && micCount === 1 ? (
              <p className="text-[11px] text-white/40 mb-2 px-1">
                {tOr(t, 'unifiedSetup.deviceSingleMicHint', 'Nur ein Mikrofon — einem Spieler zuweisen, alle anderen per Companion-App.')}
              </p>
            ) : null}
            {deviceMode === 'flexible' && micCount === 0 ? (
              <p className="text-[11px] text-amber-300/80 mb-2 px-1">
                {tOr(t, 'unifiedSetup.deviceNoMicsHint', 'Kein Mikrofon angeschlossen — alle Spieler müssen per Companion-App singen.')}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              {selectedPlayers.map((playerId) => {
                const profile = activeProfiles.find((p) => p.id === playerId);
                if (!profile) return null;
                const choice = deviceAssignments[playerId] === 'companion' ? 'companion' : 'mic';
                const isCompanion = choice === 'companion';
                const isCompanionConnected = connectedIds.has(playerId);
                const currentMicEntry = Object.entries(micAssignments).find(([, pid]) => pid === playerId);
                const currentMicId = currentMicEntry?.[0];
                const takenByOther = (micId: string) => {
                  const holder = micAssignments[micId];
                  return !!holder && holder !== playerId;
                };
                const noFixedMic = deviceMode === 'flexible' && micCount >= 2;
                return (
                  <div
                    key={playerId}
                    data-testid={`mirror-sda-${profile.name}`}
                    className={'flex items-center gap-2.5 rounded-xl px-3 py-2.5 border ' +
                      (isCompanion && !isCompanionConnected
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-white/5 border-white/10')}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: (profile.color || '#06B6D4') + '40', border: '2px solid ' + (isCompanion ? (isCompanionConnected ? '#10B981' : 'transparent') : (profile.color || '#06B6D4')) }}
                    >
                      {profile.name?.[0] || '?'}
                    </div>
                    <span className="text-sm font-medium text-white truncate min-w-[70px] flex-1">{profile.name}</span>
                    <select
                      value={noFixedMic ? (isCompanion ? '' : 'auto') : (currentMicId || '')}
                      disabled={deviceMode === 'flexible' && micCount === 0}
                      onChange={(e) => {
                        haptic();
                        if (noFixedMic) {
                          setDeviceAssignments((prev) => ({ ...prev, [playerId]: e.target.value === 'auto' ? 'mic' : 'companion' }));
                          return;
                        }
                        if (e.target.value) {
                          // Assign the mic (moves it from any previous holder)
                          setMicAssignments((prev) => {
                            const updated: Record<string, string> = {};
                            for (const [mic, pid] of Object.entries(prev)) {
                              if (pid !== playerId && mic !== e.target.value) updated[mic] = pid;
                            }
                            updated[e.target.value] = playerId;
                            return updated;
                          });
                          setDeviceAssignments((prev) => ({ ...prev, [playerId]: 'mic' }));
                        } else {
                          if (currentMicId) {
                            setMicAssignments((prev) => {
                              const updated = { ...prev };
                              delete updated[currentMicId];
                              return updated;
                            });
                          }
                          setDeviceAssignments((prev) => ({ ...prev, [playerId]: 'companion' }));
                        }
                      }}
                      className="flex-1 min-w-0 appearance-none bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white disabled:opacity-40"
                      aria-label={`Device: ${profile.name}`}
                    >
                      {noFixedMic ? (
                        <>
                          <option value="auto">{'\u{1F3A4}'} {tOr(t, 'unifiedSetup.deviceMicAuto', 'Mikrofon (automatisch)')}</option>
                          <option value="">{tOr(t, 'unifiedSetup.deviceChooseMic', '— Mikrofon wählen —')}</option>
                        </>
                      ) : (
                        <>
                          <option value="">{tOr(t, 'unifiedSetup.deviceChooseMic', '— Mikrofon wählen —')}</option>
                          {desktopMics.map((mic) => (
                            <option key={mic.id} value={mic.id}>
                              {'\u{1F3A4}'} {mic.name}{takenByOther(mic.id) ? ` — ${tOr(t, 'unifiedSetup.deviceMicTaken', 'belegt')}` : ''}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        haptic();
                        if (isCompanion) {
                          setDeviceAssignments((prev) => ({ ...prev, [playerId]: 'mic' }));
                        } else {
                          if (currentMicId) {
                            setMicAssignments((prev) => {
                              const updated = { ...prev };
                              delete updated[currentMicId];
                              return updated;
                            });
                          }
                          setDeviceAssignments((prev) => ({ ...prev, [playerId]: 'companion' }));
                        }
                      }}
                      aria-pressed={isCompanion}
                      className={'shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold border active:scale-95 transition-all ' +
                        (isCompanion
                          ? 'bg-purple-500/25 border-purple-400/50 text-purple-300'
                          : 'bg-white/5 border-white/10 text-white/50')}
                    >
                      <span>{'\u{1F4F1}'}</span>
                      <span>{tOr(t, 'unifiedSetup.deviceCompanion', 'App')}</span>
                      {isCompanion && !isCompanionConnected && (
                        <span className="text-[9px] text-amber-400">{tOr(t, 'unifiedSetup.deviceNotConnected', 'noch nicht verbunden')}</span>
                      )}
                      {isCompanion && isCompanionConnected && (
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* PTM: shared mic dropdown (Singing Device Assignment, mode C) */}
        {deviceMode === 'shared-mic' && selectedPlayers.length > 0 ? (
          <div>
            <SectionHeader>
              {tOr(t, 'unifiedSetup.singingDeviceAssignment', 'Singing Device Assignment')}
            </SectionHeader>
            <select
              value={selectedMicId || ''}
              onChange={(e) => { haptic(); setSelectedMicId(e.target.value || null); }}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
              aria-label={tOr(t, 'unifiedSetup.microphoneSelection', 'Mikrofon')}
            >
              <option value="">{tOr(t, 'unifiedSetup.selectMicrophone', '— Mikrofon auswählen —')}</option>
              {desktopMics.map((mic) => (
                <option key={mic.id} value={mic.id}>{'\u{1F3A4}'} {mic.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-white/40 mt-1.5 px-1">{tOr(t, 'unifiedSetup.micSharedDesc', 'Dieses Mikrofon wird weitergegeben.')}</p>
            {!selectedMicId ? (
              <p className="text-[11px] text-amber-300/80 mt-1 px-1">{tOr(t, 'unifiedSetup.deviceNeedSharedMic', 'Wähle das gemeinsame Mikrofon, um zu starten')}</p>
            ) : null}
          </div>
        ) : null}

        {/* CPTM: no device assignment — all players must be companion-connected (mode D) */}
        {deviceMode === 'none' && selectedPlayers.length > 0 ? (
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 px-3 py-2.5">
            <p className="text-xs font-semibold text-purple-300">
              {'\u{1F4F1}'} {tOr(t, 'unifiedSetup.deviceNeedAllCompanion', 'Alle Spieler müssen per Companion-App verbunden sein')}
            </p>
            {selectedPlayers.some((pid) => !connectedIds.has(pid)) ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedPlayers.filter((pid) => !connectedIds.has(pid)).map((pid) => {
                  const profile = activeProfiles.find((p) => p.id === pid);
                  if (!profile) return null;
                  return (
                    <span key={pid} className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                      {'\u26A0'} {profile.name} — {tOr(t, 'unifiedSetup.deviceNotConnected', 'noch nicht verbunden')}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* -------- SCHWIERIGKEIT -------- */}
        <div>
          <SectionHeader>
            {t('partySetup.difficulty') || 'Schwierigkeit'}
          </SectionHeader>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => {
              const isActive = difficulty === d.id;
              const dLabel = tOr(t, d.labelKey, d.fallback);
              return (
                <button
                  key={d.id}
                  onClick={() => handleDifficulty(d.id)}
                  className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform border ' + (isActive ? d.color : 'bg-white/5 border-white/10 text-white/50')}
                >{dLabel}</button>
              );
            })}
          </div>
        </div>

        {/* Input-Modus entfernt (user request item 2 — keine nützliche Funktion) */}

        {/* -------- MODUS-SPEZIFISCHE EINSTELLUNGEN -------- */}
        {modeInfo.settings.length > 0 ? (
          <div>
            <SectionHeader>
              {t('unifiedSetup.settings') || 'Einstellungen'}
            </SectionHeader>
            <div className="flex flex-col gap-2.5">
              {modeInfo.settings.map((setting) => {
                const currentValue = settings[setting.key] ?? setting.defaultValue;
                const sLabel = tOr(t, setting.labelKey, setting.fallback);
                const sDesc = setting.descKey ? tOr(t, setting.descKey, setting.descFallback || '') : null;

                if (setting.type === 'select' && setting.options) {
                  return (
                    <div key={setting.key} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-white">{sLabel}</span>
                      </div>
                      {sDesc ? <p className="text-[11px] text-white/30 mb-2">{sDesc}</p> : null}
                      <SelectDropdown
                        options={setting.options.map((o) => ({ value: o.value, label: tOr(t, o.labelKey, o.fallback) }))}
                        value={currentValue}
                        onChange={(v) => handleSettingChange(setting.key, v)}
                      />
                    </div>
                  );
                }

                if (setting.type === 'toggle') {
                  return (
                    <div key={setting.key} className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-3">
                      <div className="min-w-0 mr-3">
                        <span className="text-sm font-medium text-white">{sLabel}</span>
                        {sDesc ? <p className="text-[11px] text-white/30 mt-0.5">{sDesc}</p> : null}
                      </div>
                      <Toggle
                        value={!!currentValue}
                        onToggle={(v) => handleSettingChange(setting.key, v)}
                      />
                    </div>
                  );
                }

                if (setting.type === 'slider' && setting.min !== undefined) {
                  return (
                    <div key={setting.key} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-white">{sLabel}</span>
                        <span className="text-xs font-mono text-cyan-400">{currentValue}{setting.unit || ''}</span>
                      </div>
                      <DragSlider
                        value={Number(currentValue)}
                        min={setting.min}
                        max={setting.max ?? 999}
                        step={setting.step || 1}
                        unit={setting.unit}
                        onChange={(v) => handleSettingChange(setting.key, v)}
                      />
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ) : null}

        {/* -------- SONG-FILTER (user request item 4 — wie in der Desktop-Ansicht) -------- */}
        <div>
          <SectionHeader>
            {tOr(t, 'unifiedSetup.songFilter', 'Song-Filter')}
          </SectionHeader>
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[11px] text-white/40 mb-1 block px-1">
                {tOr(t, 'unifiedSetup.genre', 'Genre')}
              </label>
              <select
                value={filterGenre}
                onChange={(e) => { haptic(); setFilterGenre(e.target.value); }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="all">{tOr(t, 'unifiedSetup.allGenres', 'Alle Genres')}</option>
                {(setup?.availableGenres ?? []).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block px-1">
                {tOr(t, 'unifiedSetup.language', 'Sprache')}
              </label>
              <select
                value={filterLanguage}
                onChange={(e) => { haptic(); setFilterLanguage(e.target.value); }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="all">{tOr(t, 'unifiedSetup.allLanguages', 'Alle Sprachen')}</option>
                {(setup?.availableLanguages ?? []).map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/40 mb-1 block px-1">
                {tOr(t, 'unifiedSetup.releaseYear', 'Erscheinungsjahr')}
              </label>
              <select
                value={filterReleaseYear}
                onChange={(e) => { haptic(); setFilterReleaseYear(e.target.value); }}
                className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="all">{tOr(t, 'unifiedSetup.allYears', 'Alle Jahre')}</option>
                {(setup?.availableYears ?? []).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="text-xs text-white/60">{tOr(t, 'unifiedSetup.filterLogic', 'Filter-Logik')}</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { haptic(); setFilterCombined(true); }}
                  className={'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border active:scale-95 transition-all ' +
                    (filterCombined ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/50')}
                >
                  {tOr(t, 'unifiedSetup.combined', 'Kombiniert')}
                </button>
                <button
                  type="button"
                  onClick={() => { haptic(); setFilterCombined(false); }}
                  className={'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border active:scale-95 transition-all ' +
                    (!filterCombined ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' : 'bg-white/5 border-white/10 text-white/50')}
                >
                  {tOr(t, 'unifiedSetup.independent', 'Unabhängig')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* -------- SONG-AUSWAHL -------- */}
        <div>
          <SectionHeader>
            {t('unifiedSetup.songSelection') || 'Song-Auswahl'}
          </SectionHeader>
          <div className="flex gap-2">
            {modeInfo.songSelectionOptions.map((opt) => {
              const cfg = SONG_SEL_CONFIG[opt];
              if (!cfg) return null;
              const isActive = songSelection === opt;
              const optLabel = tOr(t, cfg.labelKey, cfg.fallback);
              const enabled = canStart;
              return (
                <button
                  key={opt}
                  onClick={() => handleSongSelectClick(opt)}
                  disabled={!enabled}
                  className={'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-semibold active:scale-95 transition-all border ' +
                    (enabled
                      ? (isActive ? 'bg-purple-500/25 border-purple-400/40 text-purple-400 shadow-lg shadow-purple-500/25' : 'bg-white/5 border-white/10 text-white/50')
                      : 'bg-white/3 border-white/5 text-white/20 cursor-not-allowed')}
                >
                  <span>{cfg.icon}</span>
                  <span>{optLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* -------- START-LEISTE (bleibt grau bis alle Einstellungen komplett, wird dann zum Start-Button) -------- */}
        {/* Library-Song-Bestaetigung (Desktop hat einen Song aus der Bibliothek vorausgewaehlt) */}
        {gameState.partyLibrarySong ? (
          <div className="rounded-xl bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-500/30 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-xl shrink-0">
                {'\u{1F3B5}'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-400 font-medium uppercase tracking-wider">{t('unifiedSetup.songSelected') || 'Song ausgewaehlt'}</p>
                <h3 className="text-white font-bold text-sm truncate">{gameState.partyLibrarySong.title}</h3>
                <p className="text-white/50 text-xs truncate">{gameState.partyLibrarySong.artist}</p>
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
        ) : null}
        <button
          type="button"
          onClick={handleStartBarClick}
          disabled={!canStart}
          className={'rounded-xl border px-4 py-3 transition-all active:scale-[0.98] text-left ' +
            (canStart
              ? `bg-gradient-to-r ${modeInfo.color} border-0 shadow-lg cursor-pointer`
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
                  {t('unifiedSetup.errorMinPlayers').replace('{n}', String(modeInfo.minPlayers))}
                </p>
              ) : null}
              {canStart ? (
                <p className="text-xs text-white/70 mt-0.5">
                  {selectedPlayers.length} {t('party.players') || 'Spieler'}{' \u2022 '}{tOr(t, DIFFICULTIES.find((d) => d.id === difficulty)?.labelKey || '', difficulty === 'easy' ? 'Leicht' : difficulty === 'medium' ? 'Normal' : 'Schwer')}
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
        {/* Leave-Bestaetigungsdialog via Portal */}
        {renderLeaveDialog()}
      </div>
    );
}MirrorPartySetupLite.displayName = 'MirrorPartySetupLite';
