'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GamepadIcon } from '@/components/settings/settings-icons';
import { StorageKeys, getBool, getJson, setBool, setJson, getString, setItem } from '@/lib/storage';

interface GameplayTabProps {
  tx: (_key: string) => string;
  setHasChanges: (_value: boolean) => void;
}

function SettingToggle({ label, description, value, onToggle }: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (_value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
      <div>
        <h4 className="font-medium">{label}</h4>
        <p className="text-sm text-white/60">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onToggle(!value)}
        className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
          value ? 'bg-cyan-500' : 'bg-white/20'
        }`}
      >
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${value ? 'left-8' : 'left-1'}`} />
      </button>
    </div>
  );
}

export function GameplayTab({ tx, setHasChanges }: GameplayTabProps) {
  const [showScore, setShowScore] = useState(true);
  const [showParticles, setShowParticles] = useState(true);
  const [showCombo, setShowCombo] = useState(true);
  const [replayEnabled, setReplayEnabled] = useState(true);
  const [autoFullscreen, setAutoFullscreen] = useState(false);

  useEffect(() => {
    setShowScore(getBool(StorageKeys.SHOW_SCORE, true));
    setShowParticles(getBool(StorageKeys.SHOW_PARTICLES, true));
    setShowCombo(getBool(StorageKeys.SHOW_COMBO, true));
    setReplayEnabled(getJson<boolean>(StorageKeys.REPLAY_ENABLED, true));
    setAutoFullscreen(getBool(StorageKeys.AUTO_FULLSCREEN, false));
  }, []);

  const saveSetting = (key: string, value: boolean | string) => {
    if (typeof value === 'boolean') {
      setBool(key, value);
    } else {
      setItem(key, value);
    }
    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { [key]: value } }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GamepadIcon className="w-5 h-5 text-green-400" />
            {tx('settingsGameplay.title')}
          </CardTitle>
          <CardDescription>{tx('settingsGameplay.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingToggle
            label={tx('settingsGameplay.scoring')}
            description={tx('settingsGameplay.scoringDesc')}
            value={showScore}
            onToggle={(v) => { setShowScore(v); saveSetting(StorageKeys.SHOW_SCORE, v); }}
          />
          <SettingToggle
            label={tx('settingsGameplay.particles')}
            description={tx('settingsGameplay.particlesDesc')}
            value={showParticles}
            onToggle={(v) => { setShowParticles(v); saveSetting(StorageKeys.SHOW_PARTICLES, v); }}
          />
          <SettingToggle
            label={tx('settingsGameplay.combo')}
            description={tx('settingsGameplay.comboDesc')}
            value={showCombo}
            onToggle={(v) => { setShowCombo(v); saveSetting(StorageKeys.SHOW_COMBO, v); }}
          />
          <SettingToggle
            label={tx('settingsGameplay.replay')}
            description={tx('settingsGameplay.replayDesc')}
            value={replayEnabled}
            onToggle={(v) => { setReplayEnabled(v); setJson(StorageKeys.REPLAY_ENABLED, v); setHasChanges(true); }}
          />
          <SettingToggle
            label={tx('settingsGameplay.autoFullscreen')}
            description={tx('settingsGameplay.autoFullscreenDesc')}
            value={autoFullscreen}
            onToggle={(v) => { setAutoFullscreen(v); saveSetting(StorageKeys.AUTO_FULLSCREEN, v); }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
