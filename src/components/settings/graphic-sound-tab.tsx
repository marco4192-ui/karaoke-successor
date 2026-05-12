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
  performanceMode: 'full' | 'low';
  setPerformanceMode: (value: 'full' | 'low') => void;
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
  performanceMode,
  setPerformanceMode,
  masterVolume,
  setMasterVolume,
  youtubeQuality,
  setYoutubeQuality,
  tx,
  setHasChanges,
}: GraphicSoundTabProps) {
  const isLowPerf = performanceMode === 'low';

  return (
    <div className="space-y-6">
      {/* Performance Mode */}
      <Card className={`bg-white/5 border-white/10 ${isLowPerf ? 'border-orange-500/50' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            {tx('settingsGraphicSound.performanceMode')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.performanceModeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settingsGraphicSound.lowPerfMode')}</h4>
              <p className="text-sm text-white/60">{tx('settingsGraphicSound.lowPerfModeDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = isLowPerf ? 'full' : 'low';
                setPerformanceMode(newValue);
                setItem(StorageKeys.PERFORMANCE_MODE, newValue);
                window.dispatchEvent(new CustomEvent('settingsChange', { detail: { performanceMode: newValue } }));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                isLowPerf ? 'bg-orange-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isLowPerf ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          {isLowPerf && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm space-y-1">
              <p className="font-medium text-orange-300">{tx('settingsGraphicSound.lowPerfFeatures')}</p>
              <ul className="text-white/60 space-y-0.5 ml-4 list-disc">
                <li>{tx('settingsGraphicSound.featureSplitScreen')}</li>
                <li>{tx('settingsGraphicSound.featureNoteStyles')}</li>
                <li>{tx('settingsGraphicSound.featureAccuracy')}</li>
                <li>{tx('settingsGraphicSound.featureParticles')}</li>
                <li>{tx('settingsGraphicSound.featureSpectrogram')}</li>
                <li>{tx('settingsGraphicSound.featureComboFire')}</li>
                <li>{tx('settingsGraphicSound.featureScorePopups')}</li>
                <li>{tx('settingsGraphicSound.featureWebcam')}</li>
                <li>{tx('settingsGraphicSound.featureAnimatedBg')}</li>
                <li>{tx('settingsGraphicSound.featureYoutubeBg')}</li>
                <li>{tx('settingsGraphicSound.featureEnergyViz')}</li>
              </ul>
              <p className="text-white/80 mt-2 font-medium">{tx('settingsGraphicSound.remainAvailable')}</p>
              <ul className="text-green-400/80 space-y-0.5 ml-4 list-disc">
                <li>{tx('settingsGraphicSound.remainCore')}</li>
                <li>{tx('settingsGraphicSound.remainPitch')}</li>
                <li>{tx('settingsGraphicSound.remainLyrics')}</li>
                <li>{tx('settingsGraphicSound.remainPractice')}</li>
                <li>{tx('settingsGraphicSound.remainAudioEffects')}</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

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
