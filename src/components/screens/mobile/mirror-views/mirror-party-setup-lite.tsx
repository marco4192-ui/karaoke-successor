'use client';

// ===================== Companion-Mirror: Unified Party Setup (Orchestrator) =====================
//
// R6-Auslagerung: Die DOM-/Logik-Blöcke leben in fokussierten Modulen im
// Ordner ./party-setup/ (types, constants, utils, ui-controls,
// use-host-profiles, player-selection, device-assignment, mode-settings,
// song-filter-section, song-selection, start-flow, leave-dialog).
// Dieser Orchestrator besitzt weiterhin den kompletten Live-Setup-Mirror-
// State (Sync-IN diff-guarded, Push-OUT mit Echo-Guard, Modus-Init), alle
// Handler (handleTogglePlayer, sendConfig, Start-Flow) und die Komposition.
// NULL Verhaltensänderung — Effect-Bodies, Dep-Arrays, JSX, data-testids
// und i18n-Keys sind unverändert übernommen.

import React, { useCallback, useState } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { PARTY_MODE_INFO } from './party-setup/constants';
import { haptic, tOr } from './party-setup/utils';
import { useHostProfiles } from './party-setup/use-host-profiles';
import { PlayerSelectionSection } from './party-setup/player-selection';
import { DeviceAssignmentSection, SharedMicSection, AllCompanionNotice } from './party-setup/device-assignment';
import { DifficultySection, ModeSettingsSection } from './party-setup/mode-settings';
import { SongFilterSection } from './party-setup/song-filter-section';
import { SongSelectionSection } from './party-setup/song-selection';
import { LibrarySongBanner, StartBar } from './party-setup/start-flow';
import { LeaveDialog } from './party-setup/leave-dialog';
import type { Difficulty, InputMode } from './party-setup/types';

// ===================== Props =====================

interface MirrorPartySetupLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
  availableProfiles: any[];
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
    const { activeProfiles, profilesLoading } = useHostProfiles(modeInfo, _availableProfiles);

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
    // Era/decade filter (decade start year, e.g. '1980') — for themed parties
    const [filterEra, setFilterEra] = useState('all');
    const [filterCombined, setFilterCombined] = useState(true);
    // Free-text filter (artist/title, fuzzy) — mirrors the desktop Song Filter search
    const [filterSearch, setFilterSearch] = useState('');

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
      const suFilterEra = su.filterEra;
      const suFilterCombined = su.filterCombined;
      const suFilterSearch = su.filterSearch;
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
      if (typeof suFilterEra === 'string') setFilterEra(prev => (prev === suFilterEra ? prev : suFilterEra));
      if (typeof suFilterCombined === 'boolean') setFilterCombined(prev => (prev === suFilterCombined ? prev : suFilterCombined));
      if (typeof suFilterSearch === 'string') setFilterSearch(prev => (prev === suFilterSearch ? prev : suFilterSearch));
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
          filterEra,
          filterCombined,
          filterSearch,
          ...(deviceMode === 'shared-mic' && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: desktopMics.find(m => m.id === selectedMicId)?.name } : {}),
        });
        onSendDesktopCommand(`party_apply_config:${config}`);
      }, 300);
      return () => clearTimeout(timer);
    }, [
      selectedPlayers, difficulty, settings, deviceAssignments, micAssignments,
      songSelection, filterGenre, filterLanguage, filterReleaseYear, filterEra, filterCombined, filterSearch,
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
        filterEra,
        filterCombined,
        filterSearch,
        ...(deviceMode === 'shared-mic' && selectedMicId ? { sharedMicId: selectedMicId, sharedMicName: desktopMics.find(m => m.id === selectedMicId)?.name } : {}),
      });
      onSendDesktopCommand(`party_apply_config:${config}`);
    }, [modeInfo, modeKey, selectedPlayers, difficulty, settings, inputMode, deviceAssignments, micAssignments, filterGenre, filterLanguage, filterReleaseYear, filterEra, filterCombined, filterSearch, deviceMode, selectedMicId, desktopMics, t, onSendDesktopCommand]);

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
      // Explicit start tap: after the desktop applied the config, trigger the
      // desktop's Ready-to-Play button via the existing `party_start` command.
      // The config needs ~500ms to apply (desktop applies it, then marks the
      // song selection after a 200ms timeout) — retry covers slower devices.
      if (songSelection === 'random' || songSelection === 'medley') {
        setTimeout(() => onSendDesktopCommand('party_start'), 700);
        setTimeout(() => onSendDesktopCommand('party_start'), 1500);
      }
    }, [canStart, modeInfo, songSelection, sendConfig, onSendDesktopCommand]);

    // -------- Alle Hooks MUSS vor dem fruehen Return stehen (Rules of Hooks) --------
    const renderLeaveDialog = useCallback(() => {
      if (!showLeaveDialog) return null;
      return (
        <LeaveDialog t={t} onCancel={handleLeaveCancel} onConfirm={handleLeaveConfirm} />
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
            {t('mobile.mirrorBackToParty') || 'Zurueck zu Party-Modi'}
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
          {/* Arrow comes from the i18n string (all locales ship '\u2190 ...') —
              do NOT add a hardcoded one, it would render double. */}
          <span className="text-sm font-medium text-white/70">{t('mobile.mirrorBackToParty') || 'Zurueck zu Party-Modi'}</span>
        </button>

        {/* Fehler-Meldung */}
        {error ? (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : null}

        {/* -------- SPIELER-AUSWAHL -------- */}
        <PlayerSelectionSection
          selectedPlayers={selectedPlayers}
          minPlayers={modeInfo.minPlayers}
          maxPlayers={modeInfo.maxPlayers}
          activeProfiles={activeProfiles}
          profilesLoading={profilesLoading}
          onTogglePlayer={handleTogglePlayer}
        />

        {/* -------- SINGING DEVICE ASSIGNMENT (user request items 3+4) -------- */}
        {selectedPlayers.length > 0 && (deviceMode === 'exclusive' || deviceMode === 'flexible') ? (
          <DeviceAssignmentSection
            selectedPlayers={selectedPlayers}
            activeProfiles={activeProfiles}
            deviceMode={deviceMode}
            micCount={micCount}
            connectedIds={connectedIds}
            deviceAssignments={deviceAssignments}
            micAssignments={micAssignments}
            desktopMics={desktopMics}
            setDeviceAssignments={setDeviceAssignments}
            setMicAssignments={setMicAssignments}
          />
        ) : null}

        {/* PTM: shared mic dropdown (Singing Device Assignment, mode C) */}
        {deviceMode === 'shared-mic' && selectedPlayers.length > 0 ? (
          <SharedMicSection desktopMics={desktopMics} selectedMicId={selectedMicId} setSelectedMicId={setSelectedMicId} />
        ) : null}

        {/* CPTM: no device assignment — all players must be companion-connected (mode D) */}
        {deviceMode === 'none' && selectedPlayers.length > 0 ? (
          <AllCompanionNotice selectedPlayers={selectedPlayers} connectedIds={connectedIds} activeProfiles={activeProfiles} />
        ) : null}

        {/* -------- SCHWIERIGKEIT -------- */}
        <DifficultySection difficulty={difficulty} onDifficultyChange={handleDifficulty} />

        {/* Input-Modus entfernt (user request item 2 — keine nützliche Funktion) */}

        {/* -------- MODUS-SPEZIFISCHE EINSTELLUNGEN -------- */}
        {modeInfo.settings.length > 0 ? (
          <ModeSettingsSection modeSettings={modeInfo.settings} values={settings} onSettingChange={handleSettingChange} />
        ) : null}

        {/* -------- MOTTO-PARTY (R24): while active, ALL search fields and filters
            are hidden and replaced by the motto banner (like the desktop) -------- */}
        <SongFilterSection
          setup={setup}
          filterSearch={filterSearch}
          filterGenre={filterGenre}
          filterLanguage={filterLanguage}
          filterReleaseYear={filterReleaseYear}
          filterEra={filterEra}
          filterCombined={filterCombined}
          setFilterSearch={setFilterSearch}
          setFilterGenre={setFilterGenre}
          setFilterLanguage={setFilterLanguage}
          setFilterReleaseYear={setFilterReleaseYear}
          setFilterEra={setFilterEra}
          setFilterCombined={setFilterCombined}
        />

        {/* -------- SONG-AUSWAHL -------- */}
        <SongSelectionSection
          songSelectionOptions={modeInfo.songSelectionOptions}
          songSelection={songSelection}
          canStart={canStart}
          onSelect={handleSongSelectClick}
        />

        {/* -------- START-LEISTE (bleibt grau bis alle Einstellungen komplett, wird dann zum Start-Button) -------- */}
        {/* Library-Song-Bestaetigung (Desktop hat einen Song aus der Bibliothek vorausgewaehlt) */}
        {gameState.partyLibrarySong ? (
          <LibrarySongBanner
            partyLibrarySong={gameState.partyLibrarySong}
            onSendDesktopCommand={onSendDesktopCommand}
          />
        ) : null}
        <StartBar
          canStart={canStart}
          configSent={configSent}
          selectedCount={selectedPlayers.length}
          difficulty={difficulty}
          songSelection={songSelection}
          modeColor={modeInfo.color}
          minPlayers={modeInfo.minPlayers}
          onStart={handleStartBarClick}
        />
        {/* Leave-Bestaetigungsdialog via Portal */}
        {renderLeaveDialog()}
      </div>
    );
}MirrorPartySetupLite.displayName = 'MirrorPartySetupLite';
