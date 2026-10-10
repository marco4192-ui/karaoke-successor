'use client';

// ===================== Party-Setup-Mirror — Singing Device Assignment =====================
//
// Drei Device-Assignment-Blöcke des Party-Setup-Mirrors (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX + Handler-Bodies unverändert; die State-
// Setter kommen als Props unter denselben Namen herein, Bedingungen
// [selectedPlayers.length > 0 / deviceMode] bleiben im Orchestrator).

import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { haptic, tOr } from './utils';
import { SectionHeader } from './ui-controls';
import type {
  DesktopMic,
  DeviceAssignmentMode,
  PartySetupProfile,
} from './types';

export interface DeviceAssignmentSectionProps {
  selectedPlayers: string[];
  activeProfiles: PartySetupProfile[];
  deviceMode: DeviceAssignmentMode;
  micCount: number;
  connectedIds: Set<string>;
  deviceAssignments: Record<string, 'mic' | 'companion'>;
  micAssignments: Record<string, string>;
  desktopMics: DesktopMic[];
  setDeviceAssignments: Dispatch<SetStateAction<Record<string, 'mic' | 'companion'>>>;
  setMicAssignments: Dispatch<SetStateAction<Record<string, string>>>;
}

export function DeviceAssignmentSection({
  selectedPlayers,
  activeProfiles,
  deviceMode,
  micCount,
  connectedIds,
  deviceAssignments,
  micAssignments,
  desktopMics,
  setDeviceAssignments,
  setMicAssignments,
}: DeviceAssignmentSectionProps) {
  const { t } = useTranslation();
  return (
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
  );
}

export interface SharedMicSectionProps {
  desktopMics: DesktopMic[];
  selectedMicId: string | null;
  setSelectedMicId: Dispatch<SetStateAction<string | null>>;
}

export function SharedMicSection({ desktopMics, selectedMicId, setSelectedMicId }: SharedMicSectionProps) {
  const { t } = useTranslation();
  return (
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
  );
}

export interface AllCompanionNoticeProps {
  selectedPlayers: string[];
  connectedIds: Set<string>;
  activeProfiles: PartySetupProfile[];
}

export function AllCompanionNotice({ selectedPlayers, connectedIds, activeProfiles }: AllCompanionNoticeProps) {
  const { t } = useTranslation();
  return (
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
  );
}
