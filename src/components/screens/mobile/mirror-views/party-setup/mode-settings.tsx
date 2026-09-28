'use client';

// ===================== Party-Setup-Mirror — Schwierigkeit + Modus-Einstellungen =====================
//
// SCHWIERIGKEIT-Block + MODUS-SPEZIFISCHE EINSTELLUNGEN-Block des
// Party-Setup-Mirrors (R6-Auslagerung aus mirror-party-setup-lite.tsx —
// JSX unverändert; handleDifficulty → onDifficultyChange,
// modeInfo.settings → modeSettings, settings-State → values,
// handleSettingChange → onSettingChange).

import { useTranslation } from '@/lib/i18n/translations';
import { tOr } from './utils';
import { DIFFICULTIES } from './constants';
import { SectionHeader, SelectDropdown, Toggle, DragSlider } from './ui-controls';
import type { Difficulty, ModeSettingConfig, ModeSettingValue } from './types';

export interface DifficultySectionProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
}

export function DifficultySection({ difficulty, onDifficultyChange }: DifficultySectionProps) {
  const { t } = useTranslation();
  return (
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
              onClick={() => onDifficultyChange(d.id)}
              className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform border ' + (isActive ? d.color : 'bg-white/5 border-white/10 text-white/50')}
            >{dLabel}</button>
          );
        })}
      </div>
    </div>
  );
}

export interface ModeSettingsSectionProps {
  modeSettings: ModeSettingConfig[];
  values: Record<string, ModeSettingValue>;
  onSettingChange: (key: string, value: ModeSettingValue) => void;
}

export function ModeSettingsSection({ modeSettings, values, onSettingChange }: ModeSettingsSectionProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SectionHeader>
        {t('unifiedSetup.settings') || 'Einstellungen'}
      </SectionHeader>
      <div className="flex flex-col gap-2.5">
        {modeSettings.map((setting) => {
          const currentValue = values[setting.key] ?? setting.defaultValue;
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
                  value={currentValue as string | number}
                  onChange={(v) => onSettingChange(setting.key, v)}
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
                  onToggle={(v) => onSettingChange(setting.key, v)}
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
                  onChange={(v) => onSettingChange(setting.key, v)}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
