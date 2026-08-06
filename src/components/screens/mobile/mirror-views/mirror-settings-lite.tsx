'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSettingsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Sektionen =====================

interface SettingsSection {
  id: string;
  icon: string;
  labelKey: string;
  fallback: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general',      icon: '⚙️',  labelKey: 'settings.tabGeneral',        fallback: 'General' },
  { id: 'gameplay',     icon: '🎮',  labelKey: 'settingsTabs.gameplay',    fallback: 'Gameplay' },
  { id: 'appearance',   icon: '🎨',  labelKey: 'settingsTabs.appearance',  fallback: 'Appearance' },
  { id: 'graphicsound',icon: '🔊',  labelKey: 'settingsTabs.graphicSound',fallback: 'Graphics & Sound' },
  { id: 'microphone',   icon: '🎤',  labelKey: 'settingsTabs.microphone',  fallback: 'Microphone' },
  { id: 'mobile',       icon: '📱',  labelKey: 'settingsTabs.mobileCompanion', fallback: 'Companion' },
  { id: 'webcam',       icon: '📷',  labelKey: 'settingsTabs.webcam',      fallback: 'Webcam' },
  { id: 'library',      icon: '📁',  labelKey: 'settings.tabLibrary',     fallback: 'Library' },
  { id: 'about',        icon: 'ℹ️',  labelKey: 'settings.tabAbout',       fallback: 'About' },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorSettingsLite = React.memo<MirrorSettingsLiteProps>(
  function MirrorSettingsLite({ onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleSelect = useCallback(
      (id: string) => {
        haptic();
        onSendDesktopCommand(`settings_tab:${id}`);
      },
      [onSendDesktopCommand],
    );

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">⚙️</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorSettings')}
          </h2>
        </div>

        {/* Settings-Buttons als flache Liste */}
        <div className="flex flex-col gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const label = t(section.labelKey) === section.labelKey
              ? section.fallback
              : t(section.labelKey);
            return (
              <button
                key={section.id}
                onClick={() => handleSelect(section.id)}
                className={
                  'flex items-center gap-3 rounded-xl px-4 py-3.5 text-left ' +
                  'bg-white/5 border border-white/10 ' +
                  'active:scale-[0.98] active:bg-white/10 transition-all'
                }
              >
                <span className="text-lg leading-none shrink-0">{section.icon}</span>
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="ml-auto text-white/30 text-xs">→</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
