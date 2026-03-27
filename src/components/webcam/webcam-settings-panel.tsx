'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  WebcamBackgroundConfig, 
  WebcamSizeMode, 
  WebcamPosition, 
  WebcamFilter 
} from './types';

// Webcam Icon Component
function WebcamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

interface WebcamSettingsPanelProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (config: Partial<WebcamBackgroundConfig>) => void;
  devices: MediaDeviceInfo[];
  onRefreshDevices: () => void;
  compact?: boolean;
}

export function WebcamSettingsPanel({ 
  config, 
  onConfigChange, 
  devices, 
  onRefreshDevices,
  compact = false 
}: WebcamSettingsPanelProps) {
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
                  {devices.map(device => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                onClick={onRefreshDevices}
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
