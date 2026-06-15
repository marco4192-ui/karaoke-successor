'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Difficulty } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import type { PartyGameConfig, GameSettingConfig } from './unified-party-setup.types';

// ===================== SETTING CONTROL =====================

function SettingControl({
  setting, value, onChange,
}: {
  setting: GameSettingConfig;
  value: string | number | boolean;
  onChange: (_key: string, _value: string | number | boolean) => void;
}) {
  const { t } = useTranslation();
  const label = setting.labelKey ? t(setting.labelKey) : setting.label;
  const description = setting.descriptionKey ? t(setting.descriptionKey) : setting.description;

  switch (setting.type) {
    case 'slider':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">
            {label}: {value}{setting.unit || ''}
          </label>
          <input
            type="range" min={setting.min} max={setting.max} step={setting.step}
            value={typeof value === 'boolean' ? (value ? 1 : 0) : value}
            onChange={(e) => onChange(setting.key, Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>{setting.min}{setting.unit || ''}</span>
            <span>{setting.max}{setting.unit || ''}</span>
          </div>
        </div>
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium">{label}</label>
            {description && <p className="text-sm text-white/60">{description}</p>}
          </div>
          <Button
            variant={value ? 'default' : 'outline'}
            onClick={() => onChange(setting.key, !value)}
            className={value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
          >
            {value ? t('unifiedSetup.on') : t('unifiedSetup.off')}
          </Button>
        </div>
      );
    case 'select':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">{label}</label>
          <div className="flex gap-2 flex-wrap">
            {setting.options?.map(opt => (
              <Button
                key={String(opt.value)}
                variant={value === opt.value ? 'default' : 'outline'}
                onClick={() => onChange(setting.key, opt.value)}
                className={value === opt.value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
              >
                {opt.labelKey ? t(opt.labelKey) : opt.label}
              </Button>
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
}

// ===================== GAME SIDEBAR =====================

export function GameSidebar({ config }: { config: PartyGameConfig }) {
  const { t } = useTranslation();

  // Build extended description from indexed translation keys
  const extendedDesc = useMemo(() => {
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      const key = `extendedDesc.${config.extendedDescriptionKey}.${i}`;
      const val = t(key);
      if (val === key) break; // key not found — t() returns the key itself as fallback
      lines.push(val);
    }
    return lines;
  }, [t, config.extendedDescriptionKey]);

  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-24">
        <Card className={`bg-gradient-to-br ${config.color} border-0`}>
          <CardContent className="pt-6">
            <div className="text-6xl mb-4">{config.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-2">{config.titleKey ? t(config.titleKey) : config.title}</h2>
            <p className="text-white/80 mb-4">{config.descriptionKey ? t(config.descriptionKey) : config.description}</p>
            <div className="bg-black/20 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-white/90 mb-2">🎮 {t('unifiedSetup.howItWorks')}</h3>
              {extendedDesc.map((desc, i) => (
                <p key={i} className="text-sm text-white/70">{desc}</p>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Badge className="bg-white/20 text-white">{config.minPlayers}-{config.maxPlayers} {t('unifiedSetup.playerCountLabel')}</Badge>
              {config.supportsCompanionApp && (
                <Badge className="bg-purple-500/30 text-purple-200">📱 {t('unifiedSetup.companionBadge')}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===================== MOBILE GAME HEADER =====================

export function MobileGameHeader({ config }: { config: PartyGameConfig }) {
  const { t } = useTranslation();
  return (
    <div className="lg:hidden mb-6">
      <Card className={`bg-gradient-to-br ${config.color} border-0`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl">{config.icon}</div>
            <div>
              <h3 className="font-bold text-lg text-white">{config.titleKey ? t(config.titleKey) : config.title}</h3>
              <p className="text-white/80 text-sm">{config.descriptionKey ? t(config.descriptionKey) : config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== SETTINGS PANEL =====================

export function SettingsPanel({
  config, settings, difficulty, onSettingChange, onDifficultyChange,
}: {
  config: PartyGameConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: Record<string, any>;
  difficulty: Difficulty;
  onSettingChange: (_key: string, _value: string | number | boolean) => void;
  onDifficultyChange: (_d: Difficulty) => void;
}) {
  const { t } = useTranslation();
  if (config.settings.length === 0) return null;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><span className="text-xl">⚙️</span>{t('unifiedSetup.gameSettings')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.settings.map(s => (
          <SettingControl key={s.key} setting={s} value={settings[s.key]} onChange={onSettingChange} />
        ))}
        <div className="pt-4 border-t border-white/10">
          <label className="text-sm text-white/60 mb-2 block">{t('unifiedSetup.difficulty')}</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
              <Button
                key={diff}
                variant={difficulty === diff ? 'default' : 'outline'}
                onClick={() => onDifficultyChange(diff)}
                className={difficulty === diff ? `bg-gradient-to-r ${config.color}` : 'border-white/20'}
              >
                {diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
