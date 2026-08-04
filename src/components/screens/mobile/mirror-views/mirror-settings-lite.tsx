'use client';

import React, { useState, useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSettingsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Navigations-Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Akkordeon-Einträge =====================

interface AccordionItem {
  id: string;
  icon: string;
  labelKey: string;
  fallback: string;
  descriptionKey: string;
}

const SETTINGS_SECTIONS: AccordionItem[] = [
  { id: 'general',      icon: '⚙️',  labelKey: 'settings.tabGeneral',        fallback: 'General',        descriptionKey: 'mobile.mirrorSettingsDescGeneral' },
  { id: 'gameplay',     icon: '🎮',  labelKey: 'settingsTabs.gameplay',    fallback: 'Gameplay',       descriptionKey: 'mobile.mirrorSettingsDescGameplay' },
  { id: 'appearance',   icon: '🎨',  labelKey: 'settingsTabs.appearance',  fallback: 'Appearance',     descriptionKey: 'mobile.mirrorSettingsDescAppearance' },
  { id: 'graphicsound',icon: '🔊',  labelKey: 'settingsTabs.graphicSound',fallback: 'Graphics & Sound', descriptionKey: 'mobile.mirrorSettingsDescGraphicSound' },
  { id: 'microphone',   icon: '🎤',  labelKey: 'settingsTabs.microphone',  fallback: 'Microphone',     descriptionKey: 'mobile.mirrorSettingsDescMicrophone' },
  { id: 'mobile',       icon: '📱',  labelKey: 'settingsTabs.mobileCompanion', fallback: 'Companion',   descriptionKey: 'mobile.mirrorSettingsDescMobile' },
  { id: 'webcam',       icon: '📷',  labelKey: 'settingsTabs.webcam',      fallback: 'Webcam',        descriptionKey: 'mobile.mirrorSettingsDescWebcam' },
  { id: 'library',      icon: '📁',  labelKey: 'settings.tabLibrary',     fallback: 'Library',        descriptionKey: 'mobile.mirrorSettingsDescLibrary' },
  { id: 'about',        icon: 'ℹ️',  labelKey: 'settings.tabAbout',       fallback: 'About',          descriptionKey: 'mobile.mirrorSettingsDescAbout' },
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
    const [openId, setOpenId] = useState<string | null>(null);

    const handleToggle = useCallback(
      (id: string) => {
        haptic();
        setOpenId((prev) => (prev === id ? null : id));
      },
      [],
    );

    const handleSelect = useCallback(
      (id: string) => {
        haptic();
        // Sende den Tab-Namen als Command an den Desktop
        onSendDesktopCommand(`settings_tab:${id}`);
      },
      [onSendDesktopCommand],
    );

    return (
      <div className="flex flex-col gap-2 px-4 pb-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-3xl">⚙️</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorSettings')}
          </h2>
          <p className="text-xs text-white/40 text-center">
            {t('mobile.mirrorSettingsDesc')}
          </p>
        </div>

        {/* Akkordeon-Liste */}
        <div className="flex flex-col gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const isOpen = openId === section.id;
            return (
              <div
                key={section.id}
                className={
                  'rounded-xl border overflow-hidden transition-colors ' +
                  (isOpen
                    ? 'bg-white/10 border-cyan-400/30'
                    : 'bg-white/5 border-white/10')
                }
              >
                {/* Toggle-Button */}
                <button
                  onClick={() => handleToggle(section.id)}
                  className={
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left ' +
                    'active:scale-[0.99] transition-transform'
                  }
                >
                  <span className="text-xl leading-none shrink-0">{section.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {t(section.labelKey) === section.labelKey
                        ? section.fallback
                        : t(section.labelKey)}
                    </p>
                    {isOpen && (
                      <p className="text-[11px] text-white/40 mt-0.5">{t(section.descriptionKey)}</p>
                    )}
                  </div>
                  <span
                    className={
                      'text-white/40 text-xs transition-transform duration-200 shrink-0 ' +
                      (isOpen ? 'rotate-180' : '')
                    }
                  >
                    ▼
                  </span>
                </button>

                {/* Aufklapp-Inhalt */}
                {isOpen && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => handleSelect(section.id)}
                      className={
                        'w-full rounded-lg p-3 text-center text-sm font-semibold ' +
                        'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
                        'active:scale-[0.97] transition-transform'
                      }
                    >
                      {t('mobile.mirrorOpenOnDesktop')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
