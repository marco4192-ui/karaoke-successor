'use client';

import { Button } from '@/components/ui/button';
import { GameSettingConfig } from '@/lib/game/party-game-configs';

interface SettingControlProps {
  setting: GameSettingConfig;
  value: string | number | boolean;
  onChange: (value: string | number | boolean) => void;
}

export function SettingControl({ setting, value, onChange }: SettingControlProps) {
  switch (setting.type) {
    case 'slider':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">
            {setting.label}: {value}
            {setting.unit || ''}
          </label>
          <input
            type="range"
            min={setting.min}
            max={setting.max}
            step={setting.step}
            value={value as number}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>
              {setting.min}
              {setting.unit || ''}
            </span>
            <span>
              {setting.max}
              {setting.unit || ''}
            </span>
          </div>
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="font-medium">{setting.label}</label>
            {setting.description && (
              <p className="text-sm text-white/60">{setting.description}</p>
            )}
          </div>
          <Button
            variant={value ? 'default' : 'outline'}
            onClick={() => onChange(!value)}
            className={value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
          >
            {value ? '✓ On' : 'Off'}
          </Button>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-2">
          <label className="text-sm text-white/60 block">{setting.label}</label>
          <div className="flex gap-2 flex-wrap">
            {setting.options?.map((opt) => (
              <Button
                key={opt.value}
                variant={value === opt.value ? 'default' : 'outline'}
                onClick={() => onChange(opt.value)}
                className={value === opt.value ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
