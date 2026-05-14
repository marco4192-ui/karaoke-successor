'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { TrashIcon, SettingsIcon, CheckIcon } from '@/components/settings/settings-icons';
import { MicrophoneDevice, ExtendedMicConfig, AssignedMicrophone } from '@/lib/audio/microphone-manager';
import { MIC_PRESETS } from '@/components/settings/microphone-presets';
import { useTranslation } from '@/lib/i18n/translations';

interface MicrophoneCardProps {
  mic: AssignedMicrophone;
  devices: MicrophoneDevice[];
  onUpdateConfig: (_id: string, _config: Partial<ExtendedMicConfig>) => void;
  onUpdateName: (_id: string, _name: string) => void;
  onRemove: (_id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEnableStereoSplit?: (_id: string) => void;
  onDisableStereoSplit?: (_id: string) => void;
}

export function MicrophoneCard({
  mic,
  devices,
  onUpdateConfig,
  onUpdateName,
  onRemove,
  isExpanded,
  onToggleExpand,
  onEnableStereoSplit,
  onDisableStereoSplit,
}: MicrophoneCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(mic.customName);
  const { t } = useTranslation();

  const config = mic.config;
  const volume = mic.status.volume;
  const isConnected = mic.status.isConnected;
  const isStereo = !!mic.stereoPartnerId;
  const isStereoChannel = config.stereoChannel === 'left' || config.stereoChannel === 'right';
  const channelLabel = config.stereoChannel === 'left' ? 'L' : config.stereoChannel === 'right' ? 'R' : '';

  const getSettingsStatus = () => {
    const issues: string[] = [];
    if (config.autoGainControl) issues.push(t('settingsMicrophoneCard.agcShouldBeOff'));
    if (!config.echoCancellation) issues.push(t('settingsMicrophoneCard.echoShouldBeOn'));
    if (!config.noiseSuppression) issues.push(t('settingsMicrophoneCard.noiseShouldBeOn'));
    if (config.fftSize < 2048) issues.push(t('settingsMicrophoneCard.fftTooSmall'));
    return { isOptimal: issues.length === 0, issues };
  };

  const status = getSettingsStatus();

  const handleNameSave = () => {
    onUpdateName(mic.id, tempName);
    setIsEditingName(false);
  };

  const updateSetting = <K extends keyof ExtendedMicConfig>(key: K, value: ExtendedMicConfig[K]) => {
    onUpdateConfig(mic.id, { [key]: value });
  };

  const applyPreset = (presetKey: keyof typeof MIC_PRESETS) => {
    const preset = MIC_PRESETS[presetKey];
    onUpdateConfig(mic.id, { ...preset.settings, customName: mic.customName, deviceId: mic.config.deviceId });
  };

  const volumeColor = volume < 0.3 ? '#22c55e' : volume < 0.7 ? '#eab308' : '#ef4444';
  const volumeColorEnd = volume < 0.3 ? '#22c55e' : volume < 0.7 ? '#f59e0b' : '#dc2626';

  return (
    <Card className={`bg-white/5 border-white/10 ${isConnected ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-500'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
              <span className="text-lg font-bold text-green-400">{mic.playerIndex + 1}</span>
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input value={tempName} onChange={(e) => setTempName(e.target.value)} className="h-8 w-40 bg-white/10 border-white/20" autoFocus />
                  <Button size="sm" onClick={handleNameSave} className="h-8 bg-green-500 hover:bg-green-400">
                    <CheckIcon className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg cursor-pointer hover:text-cyan-400" onClick={() => setIsEditingName(true)}>
                    {mic.customName}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs border-white/20">
                    {t('settingsMicrophoneCard.player').replace('{n}', String(mic.playerIndex + 1))}
                  </Badge>
                  {isStereoChannel && (
                    <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {channelLabel}
                    </Badge>
                  )}
                </div>
              )}
              <CardDescription className="text-xs">
                {mic.deviceName}
                {isConnected && <span className="text-green-400 ml-2">{t('settingsMicrophoneCard.connected')}</span>}
                {isConnected && mic.status.channelCount && mic.status.channelCount >= 2 && !isStereoChannel && (
                  <span className="text-blue-400 ml-2">{t('settingsMicrophoneCard.stereoDevice')}</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleExpand} className="text-white/60 hover:text-white">
              <SettingsIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(mic.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <TrashIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stereo Split Toggle */}
        {isConnected && !isStereoChannel && onEnableStereoSplit && (
          <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="text-sm">{t('settingsMicrophoneCard.stereoSplit')}</div>
              {mic.status.channelCount && mic.status.channelCount >= 2 && (
                <Badge className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30">2ch</Badge>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => onEnableStereoSplit(mic.id)} className="border-blue-500/40 text-xs text-blue-400 hover:bg-blue-500/20">
              {t('settingsMicrophoneCard.stereoSplitEnable')}
            </Button>
          </div>
        )}
        {isConnected && isStereo && onDisableStereoSplit && (
          <div className="flex items-center justify-between p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-sm">{t('settingsMicrophoneCard.stereoSplitActive')}</div>
            <Button size="sm" variant="outline" onClick={() => onDisableStereoSplit(mic.id)} className="border-blue-500/40 text-xs text-blue-400 hover:bg-blue-500/20">
              {t('settingsMicrophoneCard.stereoSplitDisable')}
            </Button>
          </div>
        )}

        {/* Volume Meter */}
        {isConnected && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('settingsMicrophoneCard.level')}</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full transition-all duration-75 rounded-full" style={{ width: `${volume * 100}%`, background: `linear-gradient(90deg, ${volumeColor} 0%, ${volumeColorEnd} 100%)` }} />
            </div>
          </div>
        )}

        {/* Device Selection */}
        <div className="space-y-2">
          <label className="text-sm text-white/60">{t('settingsMicrophoneCard.inputSource')}</label>
          <Select value={config.deviceId} onValueChange={(v) => updateSetting('deviceId', v)}>
            <SelectTrigger className="bg-white/10 border-white/20">
              <SelectValue placeholder={t('settingsMicrophoneCard.selectMic')} />
            </SelectTrigger>
            <SelectContent>
              {devices.filter(d => d.deviceId).map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label}{device.isDefault && ` ${t('settingsMicrophoneCard.default')}`}
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
                <p className="text-sm text-yellow-400 font-medium">{t('settingsMicrophoneCard.settingsNotOptimal')}</p>
                <ul className="text-xs text-white/60 mt-1">
                  {status.issues.slice(0, 2).map((issue, i) => <li key={i}>• {issue}</li>)}
                </ul>
              </div>
              <Button size="sm" onClick={() => applyPreset('optimal')} className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400">
                {t('settingsMicrophoneCard.fix')}
              </Button>
            </div>
          </div>
        )}

        {/* Extended Settings (Collapsible) */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            {/* Presets */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('settingsMicrophoneCard.presets')}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(MIC_PRESETS).map(([key, preset]) => (
                  <button key={key} onClick={() => applyPreset(key as keyof typeof MIC_PRESETS)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all text-left">
                    <div className="font-medium text-xs">{preset.name}</div>
                    <div className="text-xs text-white/40">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Processing */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-cyan-400">{t('settingsMicrophoneCard.audioProcessing')}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.gain')}</label>
                  <span className="text-xs">{(config.gain * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[config.gain]} onValueChange={([v]) => updateSetting('gain', v)} min={0.1} max={3} step={0.1} className="w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <label className="text-xs">{t('settingsMicrophoneCard.echoCancellation')}</label>
                  <Switch checked={config.echoCancellation} onCheckedChange={(v) => updateSetting('echoCancellation', v)} />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <label className="text-xs">{t('settingsMicrophoneCard.noiseSuppression')}</label>
                  <Switch checked={config.noiseSuppression} onCheckedChange={(v) => updateSetting('noiseSuppression', v)} />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div>
                    <label className="text-xs">{t('settingsMicrophoneCard.agc')}</label>
                    {!config.autoGainControl && <span className="text-xs text-green-400 ml-1">✓</span>}
                  </div>
                  <Switch checked={config.autoGainControl} onCheckedChange={(v) => updateSetting('autoGainControl', v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.sampleRate')}</label>
                  <Select value={config.sampleRate.toString()} onValueChange={(v) => updateSetting('sampleRate', parseInt(v))}>
                    <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="44100">{t('settingsMicrophoneCard.sampleRateCd')}</SelectItem>
                      <SelectItem value="48000">{t('settingsMicrophoneCard.sampleRateStudio')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.latencyMode')}</label>
                  <Select value={config.latency} onValueChange={(v) => updateSetting('latency', v as 'interactive' | 'balanced' | 'playback')}>
                    <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interactive">{t('settingsMicrophoneCard.latencyInteractive')}</SelectItem>
                      <SelectItem value="balanced">{t('settingsMicrophoneCard.latencyBalanced')}</SelectItem>
                      <SelectItem value="playback">{t('settingsMicrophoneCard.latencyPlayback')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Pitch Detection */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-purple-400">{t('settingsMicrophoneCard.pitchDetection')}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.yinThreshold')}</label>
                  <span className="text-xs">{config.yinThreshold.toFixed(2)}</span>
                </div>
                <Slider value={[config.yinThreshold]} onValueChange={([v]) => updateSetting('yinThreshold', v)} min={0.05} max={0.30} step={0.01} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/60">{t('settingsMicrophoneCard.fftSize')}</label>
                <Select value={config.fftSize.toString()} onValueChange={(v) => updateSetting('fftSize', parseInt(v))}>
                  <SelectTrigger className="h-8 bg-white/10 border-white/20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1024">{t('settingsMicrophoneCard.fftFast')}</SelectItem>
                    <SelectItem value="2048">{t('settingsMicrophoneCard.fftBalanced')}</SelectItem>
                    <SelectItem value="4096">{t('settingsMicrophoneCard.fftRecommended')}</SelectItem>
                    <SelectItem value="8192">{t('settingsMicrophoneCard.fftVeryAccurate')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.volumeThreshold')}</label>
                  <span className="text-xs">{(config.volumeThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[config.volumeThreshold]} onValueChange={([v]) => updateSetting('volumeThreshold', v)} min={0.01} max={0.20} step={0.01} className="w-full" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.smoothing')}</label>
                  <span className="text-xs">{(config.smoothingFactor * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[config.smoothingFactor]} onValueChange={([v]) => updateSetting('smoothingFactor', v)} min={0} max={0.95} step={0.05} className="w-full" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.clarityThreshold')}</label>
                  <span className="text-xs">{(config.clarityThreshold * 100).toFixed(0)}%</span>
                </div>
                <Slider value={[config.clarityThreshold]} onValueChange={([v]) => updateSetting('clarityThreshold', v)} min={0.3} max={0.9} step={0.05} className="w-full" />
              </div>
            </div>

            {/* Frequency Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-pink-400">{t('settingsMicrophoneCard.frequencyRange')}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.minFrequency')}</label>
                  <span className="text-xs">{config.minFrequency} Hz</span>
                </div>
                <Slider value={[config.minFrequency]} onValueChange={([v]) => updateSetting('minFrequency', v)} min={60} max={200} step={10} className="w-full" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.maxFrequency')}</label>
                  <span className="text-xs">{config.maxFrequency} Hz</span>
                </div>
                <Slider value={[config.maxFrequency]} onValueChange={([v]) => updateSetting('maxFrequency', v)} min={500} max={1500} step={50} className="w-full" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => applyPreset('bass')} className="border-white/20 text-xs">{t('settingsMicrophoneCard.bass')}</Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('soprano')} className="border-white/20 text-xs">{t('settingsMicrophoneCard.soprano')}</Button>
              </div>
            </div>

            {/* Latency Correction */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-orange-400">{t('settingsMicrophoneCard.latencyCorrection')}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-xs text-white/60">{t('settingsMicrophoneCard.manualOffset')}</label>
                  <span className="text-xs">{config.manualLatencyOffset > 0 ? '+' : ''}{config.manualLatencyOffset} ms</span>
                </div>
                <Slider value={[config.manualLatencyOffset]} onValueChange={([v]) => updateSetting('manualLatencyOffset', v)} min={-200} max={200} step={10} className="w-full" />
                <p className="text-xs text-white/40">{t('settingsMicrophoneCard.offsetHelp')}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
