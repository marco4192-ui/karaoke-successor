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
  const { devices, hasPermission: _hasPermission, refreshDevices } = useWebcamBackground();
  
  const sizeOptions: { value: WebcamSizeMode; label: string; description: string }[] = [
    { value: 'fullscreen', label: 'Fullscreen', description: 'Fill entire background' },
    { value: '2:10', label: '20%', description: 'Small strip (20% height)' },
    { value: '3:10', label: '30%', description: 'Medium strip (30% height)' },
    { value: '4:10', label: '40%', description: 'Large strip (40% height)' },
  ];
  
  const positionOptions: { value: WebcamPosition; label: string }[] = [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
  ];
  
  const filterOptions: { value: WebcamFilter; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'contrast', label: 'Contrast' },
    { value: 'brightness', label: 'Brightness' },
    { value: 'saturate', label: 'Vibrant' },
    { value: 'blur', label: 'Blur' },
  ];
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className={compact ? 'py-3' : undefined}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          <WebcamIcon className="w-5 h-5 text-cyan-400" />
          Webcam Background
          {config.enabled && <Badge className="bg-green-500/30 text-green-400 text-xs">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm text-white">Enable Webcam</Label>
            <p className="text-xs text-white/40">Film singers while they perform</p>
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
              <Label className="text-xs text-white/60">Camera Device</Label>
              <Select
                value={config.deviceId || 'default'}
                onValueChange={(value) => onConfigChange({ deviceId: value === 'default' ? null : value })}
              >
                <SelectTrigger className="w-full bg-gray-800 border-white/20 text-white">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-white/20">
                  <SelectItem value="default">Default Camera</SelectItem>
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
                🔄 Refresh devices
              </button>
            </div>
            
            {/* Size Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-white/60">Size</Label>
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
                <Label className="text-xs text-white/60">Position</Label>
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
              <Label className="text-sm text-white">Mirror (Selfie Mode)</Label>
              <Switch
                checked={config.mirrored}
                onCheckedChange={(checked) => onConfigChange({ mirrored: checked })}
              />
            </div>
            
            {/* Filter Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-white/60">Filter</Label>
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
                <Label className="text-xs text-white/60">Opacity</Label>
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
              <Label className="text-sm text-white">Show Border</Label>
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
        title={config.enabled ? 'Disable Webcam' : 'Enable Webcam'}
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
            <option value="fullscreen">Fullscreen</option>
            <option value="2:10">20%</option>
            <option value="3:10">30%</option>
            <option value="4:10">40%</option>
          </select>
          
          {/* Position Quick Select */}
          {config.sizeMode !== 'fullscreen' && (
            <select
              value={config.position}
              onChange={(e) => onConfigChange({ position: e.target.value as WebcamPosition })}
              className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white"
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          )}
          
          {/* Camera Device Select */}
          <select
            value={config.deviceId || 'default'}
            onChange={(e) => onConfigChange({ deviceId: e.target.value === 'default' ? null : e.target.value })}
            className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white min-w-[120px]"
          >
            <option value="default">Default Camera</option>
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
            title={config.mirrored ? 'Disable Mirror' : 'Enable Mirror (Selfie Mode)'}
          >
            🪞
          </button>
        </>
      )}
    </div>
  );
}
