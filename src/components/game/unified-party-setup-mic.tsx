'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerProfile } from '@/types/game';
import type { PlayerDeviceChoice } from './unified-party-setup.types';
import { StorageKeys, getJsonOptional } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== SHARED HELPERS =====================

/** Saved mic entry shape from MULTI_MIC_CONFIG */
interface SavedMic {
  id: string;
  customName?: string;
  deviceName?: string;
}

function micDisplayName(mic: SavedMic): string {
  return mic.customName || mic.deviceName || mic.id;
}

// ===================== SINGLE MIC SELECTOR (shared mic: PTM) =====================

export function SingleMicSelector({
  selectedMicId,
  onMicChange,
}: {
  selectedMicId: string | null;
  onMicChange: (_micId: string, _micName: string) => void;
}) {
  const { t } = useTranslation();

  // Load savedMics synchronously from localStorage to avoid initial render
  // with empty list (which resets the selectedMicId to default)
  const [savedMics, setSavedMics] = useState<Array<{ id: string; customName: string; deviceName: string }>>(() => {
    const parsed = getJsonOptional<{ assignedMics?: Array<{ id: string; customName?: string; deviceName?: string }> }>(StorageKeys.MULTI_MIC_CONFIG);
    if (parsed) {
      return (parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
        id: m.id,
        customName: m.customName || '',
        deviceName: m.deviceName || '',
      }));
    }
    return [];
  });

  // Re-sync savedMics when component remounts (e.g., navigating back from game)
  React.useEffect(() => {
    const parsed = getJsonOptional<{ assignedMics?: Array<{ id: string; customName?: string; deviceName?: string }> }>(StorageKeys.MULTI_MIC_CONFIG);
    if (parsed) {
      const mics = (parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
        id: m.id,
        customName: m.customName || '',
        deviceName: m.deviceName || '',
      }));
      setSavedMics(prev => {
        if (prev.length === mics.length && prev.every((m, i) => m.id === mics[i].id)) return prev;
        return mics;
      });
    }
  }, []);

  // Ensure the currently selected mic is in savedMics (may be missing if mic
  // was configured in a different session or mic config was modified).
  // If found, also update the display name from the mic config.
  const micOptions = React.useMemo(() => {
    const ids = new Set(savedMics.map(m => m.id));
    if (selectedMicId && !ids.has(selectedMicId)) {
      // Selected mic not in list — add a placeholder entry so the
      // select dropdown shows the correct value instead of the placeholder.
      return [
        ...savedMics,
        { id: selectedMicId, customName: '', deviceName: selectedMicId },
      ];
    }
    return savedMics;
  }, [savedMics, selectedMicId]);

  // Derive display name for the currently selected mic
  const selectedMicDisplayName = selectedMicId
    ? savedMics.find(m => m.id === selectedMicId)?.customName
      || savedMics.find(m => m.id === selectedMicId)?.deviceName
      || selectedMicId
    : null;

  // Hints (computed inline — no conditional hook calls)
  const noMics = savedMics.length === 0;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          {t('unifiedSetup.singingDeviceAssignment')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <select
            value={selectedMicId || ''}
            onChange={(e) => {
              const mic = savedMics.find(m => m.id === e.target.value);
              if (mic) {
                onMicChange(mic.id, mic.customName || mic.deviceName);
              }
            }}
            className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            data-testid="sda-shared-mic-select"
          >
            <option value="">
              {selectedMicDisplayName
                ? `${selectedMicDisplayName}`
                : t('unifiedSetup.selectMicrophone')}
            </option>
            {micOptions.map(mic => (
              <option key={mic.id} value={mic.id}>
                {mic.customName || mic.deviceName}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-white/40 mt-2">
          {t('unifiedSetup.micSharedDesc')}
        </p>
        {noMics ? (
          <p className="text-xs text-yellow-400 mt-3">{t('unifiedSetup.noMicsConfigured')}</p>
        ) : !selectedMicId ? (
          <p className="text-xs text-amber-300 mt-3">{t('unifiedSetup.deviceNeedSharedMic')}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ===================== SINGING DEVICE ASSIGNMENT =====================

interface SingingDeviceAssignmentProps {
  /** 'exclusive': every mic only once (Battle Royal, Medley)
   *  'flexible': duels — no fixed mic with ≥2 mics (Missing Words, Blind,
   *  Tournament, Rate my Song, Duel) */
  mode: 'exclusive' | 'flexible';
  selectedPlayers: string[];
  profiles: PlayerProfile[];
  savedMics: Array<{ id: string; customName?: string; deviceName?: string }>;
  micAssignments: Record<string, string>;
  deviceAssignments: Record<string, PlayerDeviceChoice>;
  connectedProfileIds: Set<string>;
  onAssignMic: (_micId: string, _playerId: string) => void;
  onRemoveMic: (_micId: string) => void;
  onSetPlayerDevice: (_playerId: string, _choice: PlayerDeviceChoice) => void;
}

/**
 * Unified "Singing Device Assignment" panel (replaces the old
 * MicAssignmentPanel + InputModeSelector combo).
 *
 * Per player row: mic dropdown + Companion-App button.
 *  - exclusive: taken mics are disabled (grayed out); every player needs
 *    their own device (mic or connected companion) before the game can start.
 *  - flexible (duel modes): with ≥2 mics players sing without a fixed mic;
 *    with exactly 1 mic it can be assigned to ONE player (others companion).
 *    Companion players must be connected — otherwise a "not connected yet"
 *    marker is shown.
 */
export function SingingDeviceAssignment({
  mode,
  selectedPlayers,
  profiles,
  savedMics,
  micAssignments,
  deviceAssignments,
  connectedProfileIds,
  onAssignMic,
  onRemoveMic,
  onSetPlayerDevice,
}: SingingDeviceAssignmentProps) {
  const { t } = useTranslation();
  const micCount = savedMics.length;
  const flexibleNoFixedMic = mode === 'flexible' && micCount >= 2;
  const singleMic = mode === 'flexible' && micCount === 1 ? savedMics[0] : null;

  // Mic ids currently taken (assigned to a player)
  const usedMicIds = new Set(Object.keys(micAssignments));
  const companionCount = selectedPlayers.filter(pid => deviceAssignments[pid] === 'companion').length;
  const micPlayerCount = selectedPlayers.length - companionCount;

  // Mode hint line under the header
  const modeHint = (() => {
    if (mode === 'flexible') {
      if (micCount >= 2) return t('unifiedSetup.deviceMultiMicHint').replace('{n}', String(micCount));
      if (micCount === 1) return t('unifiedSetup.deviceSingleMicHint');
      return t('unifiedSetup.deviceNoMicsHint');
    }
    return t('unifiedSetup.singingDeviceAssignmentDesc');
  })();

  return (
    <Card className="bg-white/5 border-white/10 mb-6" data-testid="singing-device-assignment">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          {t('unifiedSetup.singingDeviceAssignment')}
          <span className="ml-auto text-xs text-white/40 font-normal tabular-nums">
            {t('unifiedSetup.deviceMicCount')
              .replace('{n}', String(micPlayerCount))
              .replace('{m}', String(companionCount))}
          </span>
        </CardTitle>
        <p className="text-xs text-white/40 mt-1">{modeHint}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {selectedPlayers.map((playerId) => {
            const profile = profiles.find(p => p.id === playerId);
            if (!profile) return null;

            const choice: PlayerDeviceChoice = deviceAssignments[playerId] === 'companion' ? 'companion' : 'mic';
            const isCompanion = choice === 'companion';
            const isCompanionConnected = connectedProfileIds.has(playerId);

            // Current mic of this player
            const currentMicEntry = Object.entries(micAssignments).find(([, pid]) => pid === playerId);
            const currentMicId = currentMicEntry?.[0];

            // In flexible single-mic mode the mic can only be held by one player;
            // others can still select it — assignment moves it automatically.
            const micDropdownDisabled = mode === 'flexible' && micCount === 0;

            return (
              <div
                key={playerId}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isCompanion && !isCompanionConnected
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
                data-testid={`sda-row-${profile.name}`}
              >
                {/* Avatar + name */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium text-sm truncate min-w-[80px] flex-1 sm:flex-none sm:w-32">{profile.name}</span>

                {/* Mic dropdown */}
                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                  <select
                    value={flexibleNoFixedMic ? (isCompanion ? '' : 'auto') : (currentMicId || '')}
                    disabled={micDropdownDisabled}
                    onChange={(e) => {
                      if (flexibleNoFixedMic) {
                        // 'auto' → mic player; '' → companion
                        onSetPlayerDevice(playerId, e.target.value === 'auto' ? 'mic' : 'companion');
                        return;
                      }
                      if (e.target.value) {
                        onAssignMic(e.target.value, playerId);
                      } else {
                        if (currentMicId) onRemoveMic(currentMicId);
                        onSetPlayerDevice(playerId, 'companion');
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`${t('unifiedSetup.singingDeviceAssignment')}: ${profile.name}`}
                  >
                    {flexibleNoFixedMic ? (
                      <>
                        <option value="auto">🎤 {t('unifiedSetup.deviceMicAuto')}</option>
                        <option value="">{t('unifiedSetup.deviceChooseMic')}</option>
                      </>
                    ) : (
                      <>
                        <option value="">
                          {mode === 'flexible' && singleMic
                            ? `${micDisplayName(singleMic)}${usedMicIds.has(singleMic.id) && micAssignments[singleMic.id] !== playerId ? ` — ${t('unifiedSetup.deviceMicTaken')}` : ''}`
                            : t('unifiedSetup.deviceChooseMic')}
                        </option>
                        {mode === 'flexible' && singleMic
                          ? (
                            <option value={singleMic.id}>
                              🎤 {micDisplayName(singleMic)}
                            </option>
                          )
                          : savedMics.map(mic => {
                            const takenByOther = usedMicIds.has(mic.id) && micAssignments[mic.id] !== playerId;
                            return (
                              <option
                                key={mic.id}
                                value={mic.id}
                                // disabled options can't be selected — but we render them
                                // grayed in the dropdown to visualize "already in use"
                                disabled={takenByOther}
                              >
                                🎤 {micDisplayName(mic)}{takenByOther ? ` — ${t('unifiedSetup.deviceMicTaken')}` : ''}
                              </option>
                            );
                          })}
                      </>
                    )}
                  </select>
                </div>

                {/* Companion button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCompanion) {
                      // Switch back to mic (dropdown handles concrete mic choice)
                      onSetPlayerDevice(playerId, 'mic');
                    } else {
                      onSetPlayerDevice(playerId, 'companion');
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold border transition-all shrink-0 ${
                    isCompanion
                      ? 'bg-purple-500/25 border-purple-400/50 text-purple-200 ring-1 ring-purple-400/40'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                  data-testid={`sda-companion-${profile.name}`}
                  aria-pressed={isCompanion}
                >
                  <span aria-hidden="true">📱</span>
                  <span>{t('unifiedSetup.deviceCompanion')}</span>
                  {isCompanion && !isCompanionConnected && (
                    <span className="ml-1 flex items-center gap-1 text-[10px] text-amber-400 font-medium whitespace-nowrap">
                      <span aria-hidden="true">⚠</span>
                      {t('unifiedSetup.deviceNotConnected')}
                    </span>
                  )}
                  {isCompanion && isCompanionConnected && (
                    <span className="ml-1 inline-block w-2 h-2 rounded-full bg-emerald-400" aria-label={t('unifiedSetup.connected')} />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Status hints */}
        {savedMics.length === 0 && (
          <p className="text-xs text-white/40 mt-3">
            {t('unifiedSetup.noMicsConfigured')}
          </p>
        )}
        {mode === 'flexible' && micCount === 0 && (
          <p className="text-xs text-amber-300 mt-3">
            {t('unifiedSetup.deviceNoMicsHint')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
