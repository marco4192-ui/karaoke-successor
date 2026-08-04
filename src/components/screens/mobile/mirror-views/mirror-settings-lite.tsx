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
  description: string;
}

const SETTINGS_SECTIONS: AccordionItem[] = [
  { id: 'general',      icon: '⚙️',  labelKey: 'settings.tabGeneral',        fallback: 'Allgemein',       description: 'Sprache, Schwierigkeit, Tonhöhenanzeige' },
  { id: 'gameplay',     icon: '🎮',  labelKey: 'settingsTabs.gameplay',    fallback: 'Spielverhalten',  description: 'Scoring-Optionen, Timings, Hilfen' },
  { id: 'appearance',   icon: '🎨',  labelKey: 'settingsTabs.appearance',  fallback: 'Erscheinungsbild', description: 'Theme, Lyrics-Stil, Hintergrund' },
  { id: 'graphicsound',icon: '🔊',  labelKey: 'settingsTabs.graphicSound',fallback: 'Grafik & Ton',    description: 'Lautstärke, Mikrofon, YouTube' },
  { id: 'microphone',   icon: '🎤',  labelKey: 'settingsTabs.microphone',  fallback: 'Mikrofon',       description: 'Eingang, Empfindlichkeit, Presets' },
  { id: 'mobile',       icon: '📱',  labelKey: 'settingsTabs.mobileCompanion', fallback: 'Companion',    description: 'Verbundene Geräte, Fernsteuerung' },
  { id: 'webcam',       icon: '📷',  labelKey: 'settingsTabs.webcam',      fallback: 'Webcam',         description: 'Hintergrund-Kamera-Einstellungen' },
  { id: 'library',      icon: '📁',  labelKey: 'settings.tabLibrary',     fallback: 'Bibliothek',      description: 'Song-Ordner, Scannen, Zurücksetzen' },
  { id: 'about',        icon: 'ℹ️',  labelKey: 'settings.tabAbout',       fallback: 'Über',           description: 'Version, Credits, Lizenzen' },
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
            {t('mobile.mirrorSettings') || 'Einstellungen'}
          </h2>
          <p className="text-xs text-white/40 text-center">
            Wähle eine Kategorie, um sie auf dem Desktop zu öffnen
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
                      <p className="text-[11px] text-white/40 mt-0.5">{section.description}</p>
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
                      Auf Desktop öffnen
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
