'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  MicrophoneDevice,
  ExtendedMicConfig,
  AssignedMicrophone,
} from '@/lib/audio/microphone-manager';
import { MIC_PRESETS, getSettingsStatus } from '@/lib/audio/mic-presets';
import { MicIcon, PlusIcon, TrashIcon, SettingsIcon, CheckIcon } from './mic-settings-icons';

interface MicrophoneCardProps {
  mic: AssignedMicrophone;
  devices: MicrophoneDevice[];
  onUpdateConfig: (id: string, config: Partial<ExtendedMicConfig>) => void;
  onUpdateName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function MicrophoneCard({
  mic,
  devices,
  onUpdateConfig,
  onUpdateName,
  onRemove,
  isExpanded,
  onToggleExpand,
}: MicrophoneCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(mic.customName);

  const config = mic.config;
  const volume = mic.status.volume;
  const isConnected = mic.status.isConnected;

  const status = getSettingsStatus(config);

  const handleNameSave = () => {
    onUpdateName(mic.id, tempName);
    setIsEditingName(false);
  };

  const updateSetting = <K extends keyof ExtendedMicConfig>(
    key: K,
    value: ExtendedMicConfig[K]
  ) => {
    onUpdateConfig(mic.id, { [key]: value });
  };

  const applyPreset = (presetKey: keyof typeof MIC_PRESETS) => {
    const preset = MIC_PRESETS[presetKey];
    onUpdateConfig(mic.id, {
      ...preset.settings,
      customName: mic.customName,
    deviceId: mic.config.deviceId,
  });
  };

  return (
    <Card
      className={`bg-white/5 border-white/10 ${
        isConnected ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-500'
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isConnected ? 'bg-green-500/20' : 'bg-gray-500/20'
              }`}
            >
              <span className="text-lg font-bold text-green-400">{mic.playerIndex + 1}</span>
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-8 w-40 bg-white/10 border-white/20"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleNameSave}
                    className="h-8 bg-green-500 hover:bg-green-400"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle
                    className="text-lg cursor-pointer hover:text-cyan-400"
                    onClick={() => setIsEditingName(true)}
                  >
                    {mic.customName}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs border-white/20">
                    Spieler {mic.playerIndex + 1}
                  </Badge>
                </div>
              )}
              <CardDescription className="text-xs">
                {mic.deviceName}
                {isConnected && <span className="text-green-400 ml-2">● Verbunden</span>}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="text-white/60 hover:text-white"
            >
              <SettingsIcon
                className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(mic.id)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <TrashIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Volume Meter */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Pegel</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-75 rounded-full"
                style={{
              width: `${volume * 100}%`,
              background: `linear-gradient(90deg,
                  ${volume < 0.3 ? '#22c55e' : volume < 0.7 ? '#eab308' : '#ef4444'} 0%,
                  ${volume < 0.3 ? '#22c55e' : volume < 0.7 ? '#f59e0b' : '#dc2626'} 100%
                )`,
            }}
              />
            </div>
          </div>
        )}

        {/* Device Selection */}
        <div className="space-y-2">
          <label className="text-sm text-white/60">Eingabe-Quelle</label>
          <Select
            value={config.deviceId}
            onValueChange={(v) => updateSetting('deviceId', v)}
          >
            <SelectTrigger className="bg-white/10 border-white/20">
              <SelectValue placeholder="Mikrofon wählen..." />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}
                  {device.isDefault && ' (Standard)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Warning */}
        {!status.isOptimal && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400 font-medium">Einstellungen nicht optimal</p>
                <ul className="text-xs text-white/60 mt-1">
                  {status.issues.slice(0, 2).map((issue, i) => (
                    <li key={i}>• {issue}</li>
                  ))}
                </ul>
              </div>
              <Button
                size="sm"
                onClick={() => applyPreset('optimal')}
                className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
              >
                Reparieren
              </Button>
            </div>
          </div>
        )}

        {/* Extended Settings (Collapsible) */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            {/* Presets */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Presets</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(MIC_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key as keyof typeof MIC_PRESETS)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all text-left"
                  >
                    <div className="font-medium text-xs">{preset.name}</div>
                    <div className="text-xs text-white/40">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Processing */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-cyan-400">Audio-Verarbeitung</h4>

              {/* Gain */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Verstärkung (Gain)</label>
                  <span className="text-xs">{(config.gain * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.gain]}
                  onValueChange={([v]) => updateSetting('gain', v)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="w-full"
                />
              </div>

              {/* Switches */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <label className="text-xs">Echo-Unterdrückung</label>
                  <Switch
                    checked={config.echoCancellation}
                    onCheckedChange={(v) => updateSetting('echoCancellation', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <label className="text-xs">Rausch-Unterdrückung</label>
                  <Switch
                    checked={config.noiseSuppression}
                    onCheckedChange={(v) => updateSetting('noiseSuppression', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <label className="text-xs">AGC</label>
                    {!config.autoGainControl && <span className="text-xs text-green-400 ml-1">✓</span>}
                  </div>
                  <Switch
                    checked={config.autoGainControl}
                    onCheckedChange={(v) => updateSetting('autoGainControl', v)}
                  />
                </div>
              </div>

              {/* Sample Rate & Latency */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Abtastrate</label>
                  <Select
                    value={config.sampleRate.toString()}
                    onValueChange={(v) => updateSetting('sampleRate', parseInt(v))}
                  >
                    <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">44100 Hz (CD)</SelectItem>
                      <SelectItem value="48000">48000 Hz (Studio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">Latenz-Modus</label>
                  <Select
                    value={config.latency}
                    onValueChange={(v) =>
                      updateSetting('latency', v as 'interactive' | 'balanced' | 'playback')
                    }
                  >
                    <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interactive">Interaktiv (~10-20ms)</SelectItem>
                      <SelectItem value="balanced">Ausgewogen (~20-50ms)</SelectItem>
                      <SelectItem value="playback">Wiedergabe (~50-100ms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pitch Detection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-purple-400">Pitch-Detection</h4>

              {/* YIN Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">YIN-Schwellwert</label>
                  <span className="text-xs">{config.yinThreshold.toFixed(2)}</span>
                </div>
                <Slider
                  value={[config.yinThreshold]}
                  onValueChange={([v]) => updateSetting('yinThreshold', v)}
                  min={0.05}
                  max={0.3}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* FFT Size */}
              <div className="space-y-1">
                <label className="text-xs text-white/60">FFT-Größe (Genauigkeit)</label>
                <Select
                  value={config.fftSize.toString()}
                  onValueChange={(v) => updateSetting('fftSize', parseInt(v))}
                >
                  <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024">1024 (schnell)</SelectItem>
                    <SelectItem value="2048">2048 (ausgewogen)</SelectItem>
                    <SelectItem value="4096">4096 (empfohlen)</SelectItem>
                    <SelectItem value="8192">8192 (sehr genau)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Volume Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Lautstärke-Schwellwert</label>
                  <span className="text-xs">{(config.volumeThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.volumeThreshold]}
                  onValueChange={([v]) => updateSetting('volumeThreshold', v)}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  className="w-full"
                />
              </div>

              {/* Smoothing Factor */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Glättungsfaktor</label>
                  <span className="text-xs">{(config.smoothingFactor * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.smoothingFactor]}
                  onValueChange={([v]) => updateSetting('smoothingFactor', v)}
                  min={0}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
              </div>

              {/* Clarity Threshold */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Klarheits-Schwellwert</label>
                  <span className="text-xs">{(config.clarityThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[config.clarityThreshold]}
                  onValueChange={([v]) => updateSetting('clarityThreshold', v)}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  className="w-full"
                />
              </div>
            </div>

            {/* Frequency Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-pink-400">Frequenzbereich</h4>

              {/* Min Frequency */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Min. Frequenz</label>
                  <span className="text-xs">{config.minFrequency} Hz</span>
                </div>
                <Slider
                  value={[config.minFrequency]}
                  onValueChange={([v]) => updateSetting('minFrequency', v)}
                  min={60}
                  max={200}
                  step={10}
                  className="w-full"
                />
              </div>

              {/* Max Frequency */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Max. Frequenz</label>
                  <span className="text-xs">{config.maxFrequency} Hz</span>
                </div>
                <Slider
                  value={[config.maxFrequency]}
                  onValueChange={([v]) => updateSetting('maxFrequency', v)}
                  min={500}
                  max={1500}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Voice Type Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset('bass')}
                  className="border-white/20 text-xs"
                >
                  🎤 Bass
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset('soprano')}
                  className="border-white/20 text-xs"
                >
                  🎤 Sopran
                </Button>
              </div>
            </div>

            {/* Latency Correction */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-orange-400">Latenz-Korrektur</h4>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">Manueller Offset</label>
                  <span className="text-xs">
                    {config.manualLatencyOffset > 0 ? '+' : ''}
                    {config.manualLatencyOffset} ms
                  </span>
                </div>
                <Slider
                  value={[config.manualLatencyOffset]}
                  onValueChange={([v]) => updateSetting('manualLatencyOffset', v)}
                  min={-200}
                  max={200}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-white/40">
                  Negativ = Audio früher, Positiv = Audio später
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
