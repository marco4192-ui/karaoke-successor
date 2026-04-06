'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Theme } from '@/lib/game/themes';
import { THEMES } from '@/lib/game/themes';
import { MusicIcon, PaletteIcon } from '@/components/settings/settings-icons';
import { AudioOutputSection } from '@/components/settings/audio-output-section';

interface GraphicSoundTabProps {
  bgVideo: boolean;
  setBgVideo: (value: boolean) => void;
  useAnimatedBg: boolean;
  setUseAnimatedBg: (value: boolean) => void;
  currentThemeId: string;
  handleThemeChange: (theme: Theme) => void;
  noteDisplayStyle: string;
  setNoteDisplayStyle: (value: string) => void;
  noteShapeStyle: string;
  setNoteShapeStyle: (value: string) => void;
  previewVolume: number;
  setPreviewVolume: (value: number) => void;
  micSensitivity: number;
  setMicSensitivity: (value: number) => void;
  lyricsStyle: string;
  setLyricsStyle: (value: string) => void;
  tx: (key: string) => string;
  setHasChanges: (value: boolean) => void;
}

export function GraphicSoundTab({
  bgVideo,
  setBgVideo,
  useAnimatedBg,
  setUseAnimatedBg,
  currentThemeId,
  handleThemeChange,
  noteDisplayStyle,
  setNoteDisplayStyle,
  noteShapeStyle,
  setNoteShapeStyle,
  previewVolume,
  setPreviewVolume,
  micSensitivity,
  setMicSensitivity,
  lyricsStyle,
  setLyricsStyle,
  tx,
  setHasChanges,
}: GraphicSoundTabProps) {
  return (
    <div className="space-y-6">
      {/* Audio Output / ASIO Device Selection */}
      <AudioOutputSection />

      {/* Video Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MusicIcon className="w-5 h-5 text-cyan-400" />
            Video Settings
          </CardTitle>
          <CardDescription>Background video and visual settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Background Video Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
              <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBgVideo(!bgVideo);
                localStorage.setItem('karaoke-bg-video', String(!bgVideo));
                window.dispatchEvent(new CustomEvent('settingsChange'));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                bgVideo ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          
          {/* Animated Background Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">Animated Background</h4>
              <p className="text-sm text-white/60">Use animated backgrounds instead of videos. Recommended for low-performance systems.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = !useAnimatedBg;
                setUseAnimatedBg(newValue);
                localStorage.setItem('karaoke-animated-bg', String(newValue));
                window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: newValue } }));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                useAnimatedBg ? 'bg-purple-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useAnimatedBg ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>
      
      {/* Theme Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            <PaletteIcon className="w-5 h-5 text-purple-400" />
            {tx('settings.themeSettings')}
          </CardTitle>
          <CardDescription className="theme-adaptive-text-secondary">{tx('settings.themeSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Presets from themes.ts */}
          <div>
            <label className="text-sm theme-adaptive-text-secondary mb-3 block">{tx('settings.colorTheme')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeChange(theme)}
                  className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${
                    currentThemeId === theme.id
                      ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50' 
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div 
                    className="w-full h-8 rounded-lg mb-2"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                  />
                  <span className="text-sm font-medium theme-adaptive-text">{theme.name}</span>
                  <p className="text-xs theme-adaptive-text-secondary truncate">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Note Display Style */}
          <div>
            <label className="text-sm theme-adaptive-text-secondary mb-2 block">Noten-Darstellung</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'classic', name: 'Klassisch', icon: '➡️', desc: 'UltraStar-Stil' },
                { id: 'fill-level', name: 'Füllstand', icon: '📊', desc: 'Lücken bei Fehlern' },
                { id: 'color-feedback', name: 'Farb-Feedback', icon: '🎨', desc: 'Farbe nach Treffgenauigkeit' },
                { id: 'glow-intensity', name: 'Glow-Intensität', icon: '✨', desc: 'Helligkeit zeigt Qualität' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setNoteDisplayStyle(style.id);
                    localStorage.setItem('karaoke-note-style', style.id);
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteDisplayStyle: style.id } }));
                    setHasChanges(true);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteDisplayStyle === style.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                  }`}
                >
                  <span className="text-lg">{style.icon}</span>
                  <span className="font-medium">{style.name}</span>
                  <span className="text-xs theme-adaptive-text-secondary">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Note Shape Style */}
          <div>
            <label className="text-sm theme-adaptive-text-secondary mb-2 block">Notenform</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'rounded', name: 'Abgerundet', icon: '🔵', desc: 'Weiche Kanten' },
                { id: 'sharp', name: 'Eckig', icon: '🔷', desc: 'Kantige Form' },
                { id: 'pill', name: 'Pille', icon: '💊', desc: 'Oval-Form' },
                { id: 'diamond', name: 'Raute', icon: '💎', desc: 'Diamant-Form' },
              ].map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    setNoteShapeStyle(shape.id);
                    localStorage.setItem('karaoke-note-shape', shape.id);
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteShapeStyle: shape.id } }));
                    setHasChanges(true);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteShapeStyle === shape.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                  }`}
                >
                  <span className="text-lg">{shape.icon}</span>
                  <span className="font-medium">{shape.name}</span>
                  <span className="text-xs theme-adaptive-text-secondary">{shape.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Audio Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settings.audioSettings')}</CardTitle>
          <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview Volume */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">{tx('settings.previewVolume')}</label>
              <span className="text-sm text-cyan-400">{previewVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={previewVolume}
              onChange={(e) => {
                setPreviewVolume(parseInt(e.target.value));
                setHasChanges(true);
              }}
              className="w-full accent-cyan-500"
            />
          </div>
          
          {/* Mic Sensitivity */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">{tx('settings.micSensitivity')}</label>
              <span className="text-sm text-cyan-400">{micSensitivity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={micSensitivity}
              onChange={(e) => {
                setMicSensitivity(parseInt(e.target.value));
                setHasChanges(true);
              }}
              className="w-full accent-purple-500"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Lyrics Display Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Lyrics Display</CardTitle>
          <CardDescription>Customize how lyrics are displayed during gameplay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="text-sm text-white/60 mb-2 block">{tx('settings.lyricsStyle')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'classic', name: 'Classic' },
                { id: 'concert', name: 'Concert' },
                { id: 'retro', name: 'Retro' },
                { id: 'neon', name: 'Neon' },
                { id: 'minimal', name: 'Minimal' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setLyricsStyle(style.id);
                    setHasChanges(true);
                  }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                    lyricsStyle === style.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
