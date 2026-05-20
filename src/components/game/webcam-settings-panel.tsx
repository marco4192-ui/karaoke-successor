'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWebcamBackground } from './use-webcam-background';
import type { WebcamBackgroundConfig, WebcamSizeMode, WebcamPosition, WebcamFilter } from './webcam-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Webcam Icon =====================

export function WebcamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Camera body */}
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

// ===================== Webcam Settings Panel =====================

interface WebcamSettingsPanelProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (_config: Partial<WebcamBackgroundConfig>) => void;
  compact?: boolean;
}

export function WebcamSettingsPanel({ config, onConfigChange, compact = false }: WebcamSettingsPanelProps) {
  // TODO: This creates an independent hook instance separate from the actual
  // webcam background being rendered. Device list and permission state may
  // diverge from the active WebcamBackground. Consider passing these as props instead.
  const { t } = useTranslation();
  const { devices, hasPermission: _hasPermission, refreshDevices } = useWebcamBackground();
  
  const sizeOptions: { value: WebcamSizeMode; label: string; description: string }[] = [
    { value: 'fullscreen', label: t('webcamSettings.fullscreen'), description: t('webcamSettings.fullscreenDesc') },
    { value: '2:10', label: t('webcamSettings.smallStrip'), description: t('webcamSettings.smallStripDesc') },
    { value: '3:10', label: t('webcamSettings.mediumStrip'), description: t('webcamSettings.mediumStripDesc') },
    { value: '4:10', label: t('webcamSettings.largeStrip'), description: t('webcamSettings.largeStripDesc') },
  ];
  
  const positionOptions: { value: WebcamPosition; label: string }[] = [
    { value: 'top', label: t('webcamSettings.top') },
    { value: 'bottom', label: t('webcamSettings.bottom') },
    { value: 'left', label: t('webcamSettings.left') },
    { value: 'right', label: t('webcamSettings.right') },
  ];
  
  const filterOptions: { value: WebcamFilter; label: string }[] = [
    { value: 'none', label: t('webcamSettings.filterNone') },
    { value: 'grayscale', label: t('webcamSettings.filterGrayscale') },
    { value: 'sepia', label: t('webcamSettings.filterSepia') },
    { value: 'contrast', label: t('webcamSettings.filterContrast') },
    { value: 'brightness', label: t('webcamSettings.filterBrightness') },
    { value: 'saturate', label: t('webcamSettings.filterVibrant') },
    { value: 'blur', label: t('webcamSettings.filterBlur') },
  ];
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className={compact ? 'py-3' : undefined}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          <WebcamIcon className="w-5 h-5 text-cyan-400" />
          {t('webcamSettings.title')}
          {config.enabled && <Badge className="bg-green-500/30 text-green-400 text-xs">{t('webcamSettings.active')}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-white">{t('webcamSettings.enableWebcam')}</Label>
            <p className="text-xs text-white/40">{t('webcamSettings.enableWebcamDesc')}</p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => onConfigChange({ 
              enabled: checked,
              sizeMode: checked && config.sizeMode === 'fullscreen' ? '2:10' : config.sizeMode,
            })}
          />
        </div>
        
        {config.enabled && (
          <>
            {/* Device Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-white/60">{t('webcamSettings.cameraDevice')}</Label>
              <Select
                value={config.deviceId || 'default'}
                onValueChange={(value) => onConfigChange({ deviceId: value === 'default' ? null : value })}
              >
                <SelectTrigger className="w-full bg-gray-800 border-white/20 text-white">
                  <SelectValue placeholder={t('webcamSettings.selectCamera')} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/20">
                  <SelectItem value="default">{t('webcamSettings.defaultCamera')}</SelectItem>
                  {devices.filter(d => d.deviceId).map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={refreshDevices}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                {t('webcamSettings.refreshDevices')}
              </button>
            </div>
            
            {/* Size Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-white/60">{t('webcamSettings.size')}</Label>
              <div className="grid grid-cols-4 gap-1">
                {sizeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onConfigChange({ sizeMode: option.value })}
                    className={`px-2 py-1.5 rounded text-xs transition-all ${
                      config.sizeMode === option.value
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Position (for non-fullscreen modes) */}
            {config.sizeMode !== 'fullscreen' && (
              <div className="space-y-2">
                <Label className="text-xs text-white/60">{t('webcamSettings.position')}</Label>
                <div className="grid grid-cols-4 gap-1">
                  {positionOptions.map(option => (
                    <button
                      key={option.value}
                      onClick={() => onConfigChange({ position: option.value })}
                      className={`px-2 py-1.5 rounded text-xs transition-all ${
                        config.position === option.value
                          ? 'bg-cyan-500 text-black'
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Mirror Toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white">{t('webcamSettings.mirror')}</Label>
              <Switch
                checked={config.mirrored}
                onCheckedChange={(checked) => onConfigChange({ mirrored: checked })}
              />
            </div>
            
            {/* Filter Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-white/60">{t('webcamSettings.filter')}</Label>
              <div className="grid grid-cols-4 gap-1">
                {filterOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onConfigChange({ filter: option.value })}
                    className={`px-2 py-1.5 rounded text-xs transition-all ${
                      config.filter === option.value
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Opacity Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-white/60">{t('webcamSettings.opacity')}</Label>
                <span className="text-xs text-white/40">{Math.round(config.opacity * 100)}%</span>
              </div>
              <Slider
                value={[config.opacity]}
                onValueChange={([v]) => onConfigChange({ opacity: v })}
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            
            {/* Border Options */}
            <div className="flex items-center justify-between">
              <Label className="text-sm text-white">{t('webcamSettings.showBorder')}</Label>
              <Switch
                checked={config.showBorder}
                onCheckedChange={(checked) => onConfigChange({ showBorder: checked })}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== Webcam Quick Controls (for GameScreen Header) =====================

interface WebcamQuickControlsProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (_config: Partial<WebcamBackgroundConfig>) => void;
}

export function WebcamQuickControls({ config, onConfigChange }: WebcamQuickControlsProps) {
  const { t } = useTranslation();
  const { devices, refreshDevices: _refreshDevices } = useWebcamBackground();
  
  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
      {/* Enable/Disable */}
      <button
        onClick={() => onConfigChange({ 
          enabled: !config.enabled,
          sizeMode: !config.enabled && config.sizeMode === 'fullscreen' ? '2:10' : config.sizeMode,
        })}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          config.enabled 
            ? 'bg-cyan-500 text-white' 
            : 'bg-white/10 text-white/60 hover:bg-white/20'
        }`}
        title={config.enabled ? t('webcamSettings.disableWebcam') : t('webcamSettings.enableWebcamTooltip')}
      >
        <WebcamIcon className="w-4 h-4" />
      </button>
      
      {config.enabled && (
        <>
          {/* Size Quick Select */}
          <select
            value={config.sizeMode}
            onChange={(e) => onConfigChange({ sizeMode: e.target.value as WebcamSizeMode })}
            className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white"
          >
            <option value="fullscreen">{t('webcamSettings.fullscreen')}</option>
            <option value="2:10">{t('webcamSettings.smallStrip')}</option>
            <option value="3:10">{t('webcamSettings.mediumStrip')}</option>
            <option value="4:10">{t('webcamSettings.largeStrip')}</option>
          </select>
          
          {/* Position Quick Select */}
          {config.sizeMode !== 'fullscreen' && (
            <select
              value={config.position}
              onChange={(e) => onConfigChange({ position: e.target.value as WebcamPosition })}
              className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white"
            >
              <option value="top">{t('webcamSettings.top')}</option>
              <option value="bottom">{t('webcamSettings.bottom')}</option>
              <option value="left">{t('webcamSettings.left')}</option>
              <option value="right">{t('webcamSettings.right')}</option>
            </select>
          )}
          
          {/* Camera Device Select */}
          <select
            value={config.deviceId || 'default'}
            onChange={(e) => onConfigChange({ deviceId: e.target.value === 'default' ? null : e.target.value })}
            className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white min-w-[120px]"
          >
            <option value="default">{t('webcamSettings.defaultCamera')}</option>
            {devices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          
          {/* Mirror Toggle */}
          <button
            onClick={() => onConfigChange({ mirrored: !config.mirrored })}
            className={`px-2 py-1 rounded text-xs transition-all ${
              config.mirrored 
                ? 'bg-purple-500/30 text-purple-300' 
                : 'bg-white/10 text-white/60'
            }`}
            title={config.mirrored ? t('webcamSettings.disableMirror') : t('webcamSettings.enableMirrorTooltip')}
          >
            🪞
          </button>
        </>
      )}
    </div>
  );
}
