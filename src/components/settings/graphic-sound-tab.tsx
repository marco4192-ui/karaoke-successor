'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AudioOutputSection } from '@/components/settings/audio-output-section';
import { StorageKeys, getNumber, setItem, getString } from '@/lib/storage';

interface GraphicSoundTabProps {
  previewVolume: number;
  setPreviewVolume: (_value: number) => void;
  micSensitivity: number;
  setMicSensitivity: (_value: number) => void;
  masterVolume: number;
  setMasterVolume: (_value: number) => void;
  youtubeQuality: string;
  setYoutubeQuality: (_value: string) => void;
  tx: (_key: string) => string;
  setHasChanges: (_value: boolean) => void;
}

export function GraphicSoundTab({
  previewVolume,
  setPreviewVolume,
  micSensitivity,
  setMicSensitivity,
  masterVolume,
  setMasterVolume,
  youtubeQuality,
  setYoutubeQuality,
  tx,
  setHasChanges,
}: GraphicSoundTabProps) {
  return (
    <div className="space-y-6">
      {/* Audio Output / ASIO Device Selection */}
      <AudioOutputSection />

      {/* Audio Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settings.audioSettings')}</CardTitle>
          <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Master Volume */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">{tx('settingsGraphicSound.masterVolume')}</label>
              <span className="text-sm text-cyan-400">{masterVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolume}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setMasterVolume(v);
                setHasChanges(true);
              }}
              className="w-full accent-cyan-500"
            />
            <p className="text-xs text-white/40">{tx('settingsGraphicSound.masterVolumeDesc')}</p>
          </div>

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

      {/* YouTube Quality */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settingsGraphicSound.youtubeQuality')}</CardTitle>
          <CardDescription>{tx('settingsGraphicSound.youtubeQualityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'default', name: tx('settingsGraphicSound.youtubeQualityAuto') },
              { id: 'hd1080', name: tx('settingsGraphicSound.youtubeQuality1080') },
              { id: 'hd720', name: tx('settingsGraphicSound.youtubeQuality720') },
              { id: 'large', name: tx('settingsGraphicSound.youtubeQuality480') },
              { id: 'medium', name: tx('settingsGraphicSound.youtubeQuality360') },
            ].map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setYoutubeQuality(q.id);
                  setItem(StorageKeys.YOUTUBE_QUALITY, q.id);
                  window.dispatchEvent(new CustomEvent('settingsChange', { detail: { youtubeQuality: q.id } }));
                  setHasChanges(true);
                }}
                className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                  youtubeQuality === q.id
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                    : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                }`}
              >
                {q.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
