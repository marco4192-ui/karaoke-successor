'use client';

/**
 * Sub-components for MedleySetup
 *
 * ToggleSwitch — generic on/off toggle
 * InputModeToggle — Feature #2: switch between local mic and companion app
 * CompanionProfile — type used by both MedleySetup and InputModeToggle
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== COMPANION PROFILE TYPE =====================

export interface CompanionProfile {
  id: string;
  name: string;
  color?: string;
}

// ===================== TOGGLE COMPONENT =====================

export function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-white/20'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ===================== INPUT MODE TOGGLE (Feature #2) =====================

export function InputModeToggle({
  profileId,
  currentMode,
  companionProfiles,
  currentMobileClientId,
  onToggle,
  onAssignCompanion,
}: {
  profileId: string;
  currentMode: 'local' | 'mobile';
  companionProfiles: CompanionProfile[];
  currentMobileClientId?: string;
  onToggle: () => void;
  onAssignCompanion: (clientId: string) => void;
}) {
  const { t } = useTranslation();
  const [showCompanionPicker, setShowCompanionPicker] = useState(false);

  if (companionProfiles.length === 0) {
    // No companions available — just show current mode
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${currentMode === 'local' ? 'bg-white/10 text-white/50' : 'bg-emerald-500/20 text-emerald-400'}`}>
        {currentMode === 'local' ? '🎤' : '📱'}
      </span>
    );
  }

  if (currentMode === 'mobile' && currentMobileClientId) {
    const cp = companionProfiles.find(c => c.id === currentMobileClientId);
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          📱 {cp?.name || 'Companion'}
        </span>
        <button
          onClick={() => { onToggle(); setShowCompanionPicker(false); }}
          className="text-white/30 hover:text-white/60 text-xs"
        >✕</button>
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setShowCompanionPicker(!showCompanionPicker); }}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${currentMode === 'local' ? 'bg-white/10 text-white/50 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
      >
        {t('medley.inputMode')}: {currentMode === 'local' ? t('medley.localMic').split(' ')[0] : t('medley.companionMode').split(' ')[0]}
      </button>
      {showCompanionPicker && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg z-50 min-w-[160px]">
          <button
            onClick={() => { onToggle(); setShowCompanionPicker(false); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-t-lg"
          >
            🎤 {t('medley.localMic')}
          </button>
          {companionProfiles.map(cp => (
            <button
              key={cp.id}
              onClick={() => {
                if (currentMode !== 'mobile') onToggle();
                onAssignCompanion(cp.id);
                setShowCompanionPicker(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-white/10 rounded-b-lg last:rounded-b-lg"
            >
              📱 {cp.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
