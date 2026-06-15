'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerProfile } from '@/types/game';
import type { InputMode } from './unified-party-setup.types';
import { INPUT_MODE_CONFIG } from './unified-party-setup.types';
import { StorageKeys, getJsonOptional } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n/translations';
import { useRovingFocus } from '@/hooks/use-roving-focus';

// ===================== SINGLE MIC SELECTOR =====================

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

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          {t('unifiedSetup.microphoneSelection')}
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
        {savedMics.length === 0 && (
          <p className="text-xs text-yellow-400 mt-3">
            {t('unifiedSetup.noMicsConfigured')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== INPUT MODE SELECTOR =====================

export function InputModeSelector({
  inputMode,
  onInputModeChange,
  supportsCompanionApp,
  forceInputMode,
}: {
  inputMode: InputMode;
  onInputModeChange: (_mode: InputMode) => void;
  supportsCompanionApp?: boolean;
  forceInputMode?: InputMode;
}) {
  const { t } = useTranslation();

  const modes: InputMode[] = supportsCompanionApp
    ? ['microphone', 'companion', 'mixed']
    : ['microphone'];

  const { containerProps: modeContainerProps, getItemProps: getModeProps } = useRovingFocus({
    itemCount: forceInputMode ? 0 : modes.length,
    columns: modes.length <= 1 ? 1 : 3,
    onSelect: (index) => !forceInputMode && onInputModeChange(modes[index]),
    orientation: 'list',
    role: 'listbox',
    ariaLabel: t('unifiedSetup.inputMode'),
  });

  // If input mode is forced (e.g. companion-singalong requires companion-only),
  // don't show the selector at all.
  if (forceInputMode) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          {t('unifiedSetup.inputMode')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" {...modeContainerProps}>
          {modes.map((mode, index) => {
            const modeConfig = INPUT_MODE_CONFIG[mode];
            const isActive = inputMode === mode;
            return (
              <button
                key={mode}
                {...getModeProps(index)}
                onClick={() => onInputModeChange(mode)}
                className={`p-4 rounded-xl text-left transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  isActive
                    ? `${modeConfig.color} text-white ring-2 ring-white/30`
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="text-2xl mb-1">{modeConfig.icon}</div>
                <div className="font-bold text-sm">{modeConfig.labelKey ? t(modeConfig.labelKey) : modeConfig.label}</div>
                <div className="text-xs opacity-70 mt-1">{modeConfig.descriptionKey ? t(modeConfig.descriptionKey) : modeConfig.description}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ===================== MIC ASSIGNMENT PANEL =====================

export function MicAssignmentPanel({
  selectedPlayers,
  profiles,
  micAssignments,
  onAssignMic,
  onRemoveMic,
}: {
  selectedPlayers: string[];
  profiles: PlayerProfile[];
  micAssignments: Record<string, string>;
  onAssignMic: (_micId: string, _playerId: string) => void;
  onRemoveMic: (_micId: string) => void;
  inputMode?: InputMode;
}) {
  const { t } = useTranslation();

  // Load saved mic configs from localStorage
  const [savedMics, setSavedMics] = useState<Array<{ id: string; customName: string; deviceName: string }>>([]);

  React.useEffect(() => {
    try {
      const parsed = getJsonOptional<{ assignedMics?: Array<{ id: string; customName?: string; deviceName?: string }> }>(StorageKeys.MULTI_MIC_CONFIG);
      if (parsed) {
        setSavedMics((parsed.assignedMics || []).map((m: { id: string; customName?: string; deviceName?: string }) => ({
          id: m.id,
          customName: m.customName ?? '',
          deviceName: m.deviceName ?? '',
        })));
      }
    } catch { /* ignore */ }
  }, []);

  const micPlayers = selectedPlayers;

  const usedMicIds = new Set(Object.keys(micAssignments));

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🎤</span>
          {t('unifiedSetup.micAssignment')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {micPlayers.map((playerId) => {
            const profile = profiles.find(p => p.id === playerId);
            if (!profile) return null;

            const currentMicEntry = Object.entries(micAssignments).find(([, pid]) => pid === playerId);
            const currentMicId = currentMicEntry?.[0];
            const currentMic = currentMicId ? savedMics.find(m => m.id === currentMicId) : null;

            return (
              <div key={playerId} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="font-medium text-sm truncate min-w-[80px]">{profile.name}</span>
                <span className="text-white/40 text-xs">→</span>
                <select
                  value={currentMicId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssignMic(e.target.value, playerId);
                    } else {
                      if (currentMicId) onRemoveMic(currentMicId);
                    }
                  }}
                  className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">{t('unifiedSetup.noMicAssigned')}</option>
                  {savedMics
                    .filter(m => !usedMicIds.has(m.id) || m.id === currentMicId)
                    .map(mic => (
                      <option key={mic.id} value={mic.id}>
                        {mic.customName || mic.deviceName}
                      </option>
                    ))
                  }
                </select>
                {currentMic && (
                  <button
                    onClick={() => currentMicId && onRemoveMic(currentMicId)}
                    className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                    title={t('unifiedSetup.removeAssignment')}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {savedMics.length === 0 && (
          <p className="text-xs text-white/40 mt-3">
            {t('unifiedSetup.noMicsConfigured')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
