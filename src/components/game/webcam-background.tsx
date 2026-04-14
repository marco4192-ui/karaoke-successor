'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// ===================== Webcam Background Types =====================

export type WebcamSizeMode = 
  | 'fullscreen'    // Webcam fills entire background
  | '2:10'          // 20% of height (horizontal strip)
  | '3:10'          // 30% of height
  | '4:10';         // 40% of height

export type WebcamPosition = 
  | 'top'           // Top horizontal strip
  | 'bottom'        // Bottom horizontal strip
  | 'left'          // Left vertical strip
  | 'right';        // Right vertical strip

export type WebcamFilter = 
  | 'none'          // No filter
  | 'grayscale'     // Black and white
  | 'sepia'         // Vintage sepia tone
  | 'contrast'      // High contrast
  | 'brightness'    // Increased brightness
  | 'saturate'      // Vibrant colors
  | 'blur';         // Blur effect (for background)

export interface WebcamBackgroundConfig {
  enabled: boolean;
  sizeMode: WebcamSizeMode;
  position: WebcamPosition;
  deviceId: string | null;    // Selected camera device
  mirrored: boolean;          // Mirror the camera horizontally (selfie mode)
  opacity: number;            // 0-1 opacity for blending
  borderRadius: number;       // Border radius in pixels
  showBorder: boolean;        // Show border around webcam
  borderColor: string;        // Border color
  filter: WebcamFilter;       // Visual filter
  zIndex: number;             // Layer order
}

export const DEFAULT_WEBCAM_CONFIG: WebcamBackgroundConfig = {
  enabled: false,
  sizeMode: '2:10',
  position: 'bottom',
  deviceId: null,
  mirrored: true,
  opacity: 1,
  borderRadius: 16,
  showBorder: true,
  borderColor: 'rgba(0, 255, 255, 0.5)',
  filter: 'none',
  zIndex: 5,
};

// LocalStorage key for webcam config
const WEBCAM_CONFIG_KEY = 'karaoke-webcam-config';

// Save webcam config to localStorage
export function saveWebcamConfig(config: WebcamBackgroundConfig): void {
  try {
    localStorage.setItem(WEBCAM_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save webcam config:', e);
  }
}

// Load webcam config from localStorage
export function loadWebcamConfig(): WebcamBackgroundConfig {
  // Check if running in browser (not SSR)
  if (typeof window === 'undefined') {
    return { ...DEFAULT_WEBCAM_CONFIG };
  }
  
  try {
    const saved = localStorage.getItem(WEBCAM_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_WEBCAM_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load webcam config:', e);
  }
  return { ...DEFAULT_WEBCAM_CONFIG };
}

// ===================== Webcam Background Hook =====================

export function useWebcamBackground(deviceId: string | null = null) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Get available video devices
  const refreshDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, []);
  
  // Start webcam
  const startWebcam = useCallback(async (preferredDeviceId?: string | null) => {
    setIsLoading(true);
    setError(null);
    
    // Determine which device ID to use
    const targetDeviceId = preferredDeviceId || deviceId;
    
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user', // Default to front camera
          deviceId: targetDeviceId ? { exact: targetDeviceId } : undefined,
        },
        audio: false, // No audio from webcam - this is a SEPARATE camera for filming
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);
      
      // Refresh device list after getting permission
      await refreshDevices();
      
      return mediaStream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      setHasPermission(false);
      
      if (errorMessage.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errorMessage.includes('not found')) {
        setError('No camera found. Please connect a camera and try again.');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, refreshDevices]);
  
  // Stop webcam
  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);
  
  // Switch camera device
  const switchDevice = useCallback(async (newDeviceId: string) => {
    stopWebcam();
    return await startWebcam(newDeviceId);
  }, [stopWebcam, startWebcam]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  // Initial device list
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);
  
  return {
    stream,
    isLoading,
    error,
    devices,
    hasPermission,
    startWebcam,
    stopWebcam,
    switchDevice,
    refreshDevices,
  };
}

// ===================== Filter Styles Helper =====================

function getFilterStyle(filter: WebcamFilter): string {
  switch (filter) {
    case 'grayscale':
      return 'grayscale(100%)';
    case 'sepia':
      return 'sepia(80%)';
    case 'contrast':
      return 'contrast(150%)';
    case 'brightness':
      return 'brightness(130%)';
    case 'saturate':
      return 'saturate(180%)';
    case 'blur':
      return 'blur(3px)';
    case 'none':
    default:
      return 'none';
  }
}

// ===================== Webcam Background Component =====================

interface WebcamBackgroundProps {
  config: WebcamBackgroundConfig;
  onConfigChange?: (config: Partial<WebcamBackgroundConfig>) => void;
  className?: string;
}

export function WebcamBackground({ config, onConfigChange, className }: WebcamBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    stream, 
    isLoading, 
    error, 
    devices, 
    startWebcam, 
    stopWebcam, 
    switchDevice 
  } = useWebcamBackground(config.deviceId);
  
  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  // Handle enabled state changes
  useEffect(() => {
    if (config.enabled && !stream && !isLoading) {
      startWebcam(config.deviceId);
    } else if (!config.enabled && stream) {
      stopWebcam();
    }
  }, [config.enabled, config.deviceId, stream, isLoading, startWebcam, stopWebcam]);
  
  // Handle device changes
  useEffect(() => {
    if (config.enabled && config.deviceId && stream) {
      const currentDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (currentDeviceId !== config.deviceId) {
        switchDevice(config.deviceId);
      }
    }
  }, [config.deviceId, config.enabled, stream, switchDevice]);
  
  // Calculate position and size based on mode
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      opacity: config.opacity,
      zIndex: config.zIndex,
      overflow: 'hidden',
      objectFit: 'cover',
      borderRadius: config.borderRadius,
      border: config.showBorder ? `2px solid ${config.borderColor}` : 'none',
      boxShadow: config.showBorder ? `0 0 20px ${config.borderColor}` : 'none',
      filter: getFilterStyle(config.filter),
      backgroundColor: '#000',
    };
    
    // Calculate dimensions based on size mode and position
    const sizeMap: Record<WebcamSizeMode, string> = {
      'fullscreen': '100%',
      '2:10': '20%',
      '3:10': '30%',
      '4:10': '40%',
    };
    
    const sizeValue = sizeMap[config.sizeMode];
    
    if (config.sizeMode === 'fullscreen') {
      return {
        ...base,
        inset: 0,
        width: '100%',
        height: '100%',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
      };
    }
    
    // For horizontal strips (top/bottom)
    if (config.position === 'top' || config.position === 'bottom') {
      return {
        ...base,
        width: '100%',
        height: sizeValue,
        left: 0,
        right: 0,
        top: config.position === 'top' ? 0 : 'auto',
        bottom: config.position === 'bottom' ? 0 : 'auto',
        ...(config.position === 'top' ? { borderRadius: '0 0 16px 16px' } : { borderRadius: '16px 16px 0 0' }),
      };
    }
    
    // For vertical strips (left/right)
    return {
      ...base,
      height: '100%',
      width: sizeValue,
      top: 0,
      bottom: 0,
      left: config.position === 'left' ? 0 : 'auto',
      right: config.position === 'right' ? 0 : 'auto',
      ...(config.position === 'left' ? { borderRadius: '0 16px 16px 0' } : { borderRadius: '16px 0 0 16px' }),
    };
  };
  
  if (!config.enabled) {
    return null;
  }
  
  return (
    <div className={className}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          ...getPositionStyles(),
          transform: config.mirrored ? 'scaleX(-1)' : 'none',
        }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          style={{ zIndex: config.zIndex + 1 }}
        >
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center"
          style={{ zIndex: config.zIndex + 1 }}
        >
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}

// ===================== Webcam Settings Panel =====================

interface WebcamSettingsPanelProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (config: Partial<WebcamBackgroundConfig>) => void;
  compact?: boolean;
}

export function WebcamSettingsPanel({ config, onConfigChange, compact = false }: WebcamSettingsPanelProps) {
  const { devices, hasPermission, refreshDevices } = useWebcamBackground();
  
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
  onConfigChange: (config: Partial<WebcamBackgroundConfig>) => void;
}

export function WebcamQuickControls({ config, onConfigChange }: WebcamQuickControlsProps) {
  const { devices, refreshDevices } = useWebcamBackground();
  
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

// ===================== Webcam Icon =====================

function WebcamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Camera body */}
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

export default WebcamBackground;
