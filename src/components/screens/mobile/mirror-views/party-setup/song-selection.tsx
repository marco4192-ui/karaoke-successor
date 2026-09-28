'use client';

// ===================== Party-Setup-Mirror — Song-Auswahl =====================
//
// SONG-AUSWAHL-Block des Party-Setup-Mirrors (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX unverändert;
// modeInfo.songSelectionOptions → songSelectionOptions,
// handleSongSelectClick → onSelect).

import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from './utils';
import { SONG_SEL_CONFIG } from './constants';
import { SectionHeader } from './ui-controls';

export interface SongSelectionSectionProps {
  songSelectionOptions: string[];
  songSelection: string;
  canStart: boolean;
  onSelect: (opt: string) => void;
}

export function SongSelectionSection({ songSelectionOptions, songSelection, canStart, onSelect }: SongSelectionSectionProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SectionHeader>
        {t('unifiedSetup.songSelection') || 'Song-Auswahl'}
      </SectionHeader>
      <div className="flex gap-2">
        {songSelectionOptions.map((opt) => {
          const cfg = SONG_SEL_CONFIG[opt];
          if (!cfg) return null;
          const isActive = songSelection === opt;
          const optLabel = tOr(t, cfg.labelKey, cfg.fallback);
          const enabled = canStart;
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
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
  );
}
