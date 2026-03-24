'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { KEYBOARD_SHORTCUTS, formatShortcut, KeyboardShortcut } from '@/lib/game/keyboard-shortcuts';
import { PRACTICE_MODE_DEFAULTS, PLAYBACK_RATES, PracticeModeConfig } from '@/lib/game/practice-mode';

interface SettingsProps {
  onClose?: () => void;
}

export function SettingsPanel({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('audio');
  const [theme, setTheme] = useState<string>(getStoredTheme()?.id || 'neon-nights');
  const [volume, setVolume] = useState(80);
  const [micVolume, setMicVolume] = useState(100);
  const [reverbAmount, setReverbAmount] = useState(30);
  const [echoAmount, setEchoAmount] = useState(20);
  const [practiceConfig, setPracticeConfig] = useState<PracticeModeConfig>(PRACTICE_MODE_DEFAULTS);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Apply theme when changed
  useEffect(() => {
    const selectedTheme = THEMES.find(t => t.id === theme);
    if (selectedTheme) {
      applyTheme(selectedTheme);
    }
  }, [theme]);

  const themeGrid = (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`p-4 rounded-xl border-2 transition-all ${
            theme === t.id 
              ? 'border-cyan-400 bg-cyan-400/10' 
              : 'border-white/10 hover:border-white/30'
          }`}
        >
          <div 
            className="w-full h-12 rounded-lg mb-2"
            style={{ background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.secondary})` }}
          />
          <p className="font-medium text-sm">{t.name}</p>
          <p className="text-xs text-white/50">{t.description}</p>
        </button>
      ))}
    </div>
  );

  const audioSettings = (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium">Master Volume</label>
          <span className="text-sm text-white/60">{volume}%</span>
        </div>
        <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} max={100} step={1} />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium">Microphone Volume</label>
          <span className="text-sm text-white/60">{micVolume}%</span>
        </div>
        <Slider value={[micVolume]} onValueChange={([v]) => setMicVolume(v)} max={100} step={1} />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium">Reverb Effect</label>
          <span className="text-sm text-white/60">{reverbAmount}%</span>
        </div>
        <Slider value={[reverbAmount]} onValueChange={([v]) => setReverbAmount(v)} max={100} step={1} />
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium">Echo Effect</label>
          <span className="text-sm text-white/60">{echoAmount}%</span>
        </div>
        <Slider value={[echoAmount]} onValueChange={([v]) => setEchoAmount(v)} max={100} step={1} />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Pitch Guide Voice</label>
        <Switch checked={practiceConfig.pitchGuideEnabled} onCheckedChange={(c) => setPracticeConfig(p => ({ ...p, pitchGuideEnabled: c }))} />
      </div>
    </div>
  );

  const practiceSettings = (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Default Playback Speed</label>
        <div className="flex flex-wrap gap-2">
          {PLAYBACK_RATES.map(rate => (
            <Button
              key={rate.value}
              size="sm"
              variant={practiceConfig.playbackRate === rate.value ? 'default' : 'outline'}
              onClick={() => setPracticeConfig(p => ({ ...p, playbackRate: rate.value }))}
              className={practiceConfig.playbackRate === rate.value ? 'bg-cyan-500' : ''}
            >
              {rate.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Pitch Guide Volume</label>
        <Slider 
          value={[practiceConfig.pitchGuideVolume * 100]} 
          onValueChange={([v]) => setPracticeConfig(p => ({ ...p, pitchGuideVolume: v / 100 }))} 
          max={100} 
          step={1} 
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Loop Sections</label>
        <Switch checked={practiceConfig.loopEnabled} onCheckedChange={(c) => setPracticeConfig(p => ({ ...p, loopEnabled: c }))} />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Visual Aids</label>
        <Switch checked={practiceConfig.visualAidsEnabled} onCheckedChange={(c) => setPracticeConfig(p => ({ ...p, visualAidsEnabled: c }))} />
      </div>
      
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Auto-Play Target Notes</label>
        <Switch checked={practiceConfig.autoPlayEnabled} onCheckedChange={(c) => setPracticeConfig(p => ({ ...p, autoPlayEnabled: c }))} />
      </div>
    </div>
  );

  const shortcutCategories = ['navigation', 'gameplay', 'audio', 'system'] as const;
  
  const shortcutsContent = (
    <div className="space-y-4">
      {shortcutCategories.map(category => (
        <div key={category}>
          <h4 className="font-medium mb-2 capitalize">{category}</h4>
          <div className="space-y-1">
            {KEYBOARD_SHORTCUTS.filter(s => s.category === category).map(shortcut => (
              <div key={shortcut.id} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
                <span className="text-sm">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">
                  {formatShortcut(shortcut)}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="bg-gray-900/80 border-white/10 text-white max-w-2xl w-full max-h-[80vh] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/10">
        <CardTitle>Settings</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-transparent border-b border-white/10 rounded-none p-0">
            <TabsTrigger value="audio" className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent">Audio</TabsTrigger>
            <TabsTrigger value="visual" className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent">Visual</TabsTrigger>
            <TabsTrigger value="practice" className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent">Practice</TabsTrigger>
            <TabsTrigger value="shortcuts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent">Shortcuts</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            <div className="p-4">
              <TabsContent value="audio" className="mt-0">{audioSettings}</TabsContent>
              <TabsContent value="visual" className="mt-0">{themeGrid}</TabsContent>
              <TabsContent value="practice" className="mt-0">{practiceSettings}</TabsContent>
              <TabsContent value="shortcuts" className="mt-0">{shortcutsContent}</TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
