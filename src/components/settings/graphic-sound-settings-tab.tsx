/**
 * Graphic / Sound Settings Tab
 * Video settings, theme selection, note display, lyrics style
 */
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { THEMES, applyTheme, Theme } from '@/lib/game/themes';
import { useTranslation } from '@/lib/i18n/translations';

// Icons
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

interface GraphicSoundSettingsTabProps {
  bgVideo: boolean;
  useAnimatedBg: boolean;
  currentThemeId: string;
  lyricsStyle: string;
  noteDisplayStyle: string;
  noteShapeStyle: string;
  previewVolume: number;
  onBgVideoChange: (enabled: boolean) => void;
  onAnimatedBgChange: (enabled: boolean) => void;
  onThemeChange: (theme: Theme) => void;
  onLyricsStyleChange: (style: string) => void;
  onNoteDisplayStyleChange: (style: string) => void;
  onNoteShapeStyleChange: (style: string) => void;
  onPreviewVolumeChange: (volume: number) => void;
}

export function GraphicSoundSettingsTab({
  bgVideo,
  useAnimatedBg,
  currentThemeId,
  lyricsStyle,
  noteDisplayStyle,
  noteShapeStyle,
  previewVolume,
  onBgVideoChange,
  onAnimatedBgChange,
  onThemeChange,
  onLyricsStyleChange,
  onNoteDisplayStyleChange,
  onNoteShapeStyleChange,
  onPreviewVolumeChange,
}: GraphicSoundSettingsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
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
              <h4 className="font-medium">{t('settings.backgroundVideo')}</h4>
              <p className="text-sm text-white/60">{t('settings.backgroundVideoDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => onBgVideoChange(!bgVideo)}
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
              onClick={() => onAnimatedBgChange(!useAnimatedBg)}
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
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="w-5 h-5 text-purple-400" />
            {t('settings.themeSettings')}
          </CardTitle>
          <CardDescription>{t('settings.themeSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() => onThemeChange(theme)}
                className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
                  currentThemeId === theme.id
                    ? 'border-cyan-500 bg-cyan-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div 
                  className="w-full h-8 rounded mb-2"
                  style={{ background: theme.background }}
                />
                <div className="font-medium text-sm">{theme.name}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Note Display Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Note Display</CardTitle>
          <CardDescription>Customize how notes are displayed during gameplay</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Note Display Style */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Note Display Style</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'classic', name: 'Classic' },
                { id: 'modern', name: 'Modern' },
                { id: 'minimal', name: 'Minimal' },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onNoteDisplayStyleChange(style.id)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                    noteDisplayStyle === style.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Note Shape */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Note Shape</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'rounded', name: 'Rounded' },
                { id: 'square', name: 'Square' },
                { id: 'pill', name: 'Pill' },
              ].map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => onNoteShapeStyleChange(shape.id)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                    noteShapeStyle === shape.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {shape.name}
                </button>
              ))}
            </div>
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
            <label className="text-sm text-white/60 mb-2 block">{t('settings.lyricsStyle')}</label>
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
                  onClick={() => onLyricsStyleChange(style.id)}
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
      
      {/* Audio Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Audio Settings</CardTitle>
          <CardDescription>Preview volume and audio preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Preview Volume</label>
              <span className="text-sm text-white/60">{previewVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={previewVolume}
              onChange={(e) => onPreviewVolumeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GraphicSoundSettingsTab;
