'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  getMultiMicrophoneManager,
  MicrophoneDevice,
  ExtendedMicConfig,
  AssignedMicrophone,
  OPTIMAL_EXTENDED_CONFIG,
  MAX_MICROPHONES,
} from '@/lib/audio/microphone-manager';

// Icons
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// Preset configurations
const MIC_PRESETS = {
  optimal: {
    name: 'Optimal (Empfohlen)',
    description: 'Beste Einstellungen für UltraStar/SingStar',
    settings: OPTIMAL_EXTENDED_CONFIG,
  },
  lowLatency: {
    name: 'Niedrige Latenz',
    description: 'Minimale Verzögerung',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 2048,
      latency: 'interactive' as const,
      smoothingFactor: 0.3,
    },
  },
  highAccuracy: {
    name: 'Hohe Genauigkeit',
    description: 'Präzise Pitch-Detection',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      fftSize: 8192,
      smoothingFactor: 0.7,
      yinThreshold: 0.12,
    },
  },
  noisy: {
    name: 'Laute Umgebung',
    description: 'Mehr Noise-Suppression',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      noiseSuppression: true,
      yinThreshold: 0.20,
      volumeThreshold: 0.05,
      clarityThreshold: 0.6,
    },
  },
  bass: {
    name: 'Tiefe Stimmen (Bass)',
    description: 'Optimiert für tiefe Stimmen',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 60,
      maxFrequency: 500,
    },
  },
  soprano: {
    name: 'Hohe Stimmen (Sopran)',
    description: 'Optimiert für hohe Stimmen',
    settings: {
      ...OPTIMAL_EXTENDED_CONFIG,
      minFrequency: 150,
      maxFrequency: 1200,
    },
  },
};

interface MicrophoneSettingsPanelProps {
  onSettingsChange?: (settings: Record<string, ExtendedMicConfig>) => void;
}

// Single Microphone Card Component
function MicrophoneCard({
  mic,
  devices,
  onUpdateConfig,
  onUpdateName,
  onRemove,
  isExpanded,
  onToggleExpand,
}: {
  mic: AssignedMicrophone;
  devices: MicrophoneDevice[];
  onUpdateConfig: (id: string, config: Partial<ExtendedMicConfig>) => void;
  onUpdateName: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(mic.customName);
  
  const config = mic.config;
  const volume = mic.status.volume;
  const peak = mic.status.peak;
  const isConnected = mic.status.isConnected;

  // Check optimal settings
  const getSettingsStatus = () => {
    const issues: string[] = [];
    
    if (config.autoGainControl) {
      issues.push('AGC sollte AUS sein');
    }
    if (!config.echoCancellation) {
      issues.push('Echo Cancellation sollte AN sein');
    }
    if (!config.noiseSuppression) {
      issues.push('Noise Suppression sollte AN sein');
    }
    if (config.fftSize < 2048) {
      issues.push('FFT Size zu klein');
    }
    
    return {
      isOptimal: issues.length === 0,
      issues,
    };
  };

  const status = getSettingsStatus();

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
      customName: mic.customName, // Preserve name
      deviceId: mic.config.deviceId, // Preserve device
    });
  };

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
                  <Input
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-8 w-40 bg-white/10 border-white/20"
                    autoFocus
                  />
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
              <SettingsIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
              {devices.filter(d => d.deviceId).map((device) => (
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
                    onValueChange={(v) => updateSetting('latency', v as 'interactive' | 'balanced' | 'playback')}
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
                  max={0.30}
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
                  max={0.20}
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
                <Button size="sm" variant="outline" onClick={() => applyPreset('bass')} className="border-white/20 text-xs">
                  🎤 Bass
                </Button>
                <Button size="sm" variant="outline" onClick={() => applyPreset('soprano')} className="border-white/20 text-xs">
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
                  <span className="text-xs">{config.manualLatencyOffset > 0 ? '+' : ''}{config.manualLatencyOffset} ms</span>
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

export function MicrophoneSettingsPanel({
  onSettingsChange,
}: MicrophoneSettingsPanelProps) {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [assignedMics, setAssignedMics] = useState<AssignedMicrophone[]>([]);
  const [expandedMics, setExpandedMics] = useState<Set<string>>(new Set());
  const [isAddingMic, setIsAddingMic] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  
  const micManager = getMultiMicrophoneManager();
  
  // Load available devices
  useEffect(() => {
    micManager.getMicrophones().then(setDevices);
    micManager.onDevices(setDevices);
    
    return () => {
      // Cleanup handled by manager
    };
  }, []);
  
  // Subscribe to assigned mics changes
  useEffect(() => {
    setAssignedMics(micManager.getAssignedMicrophones());
    micManager.onAssignedMics(setAssignedMics);
    
    return () => {
      micManager.offAssignedMics();
    };
  }, []);
  
  // Handle adding a new microphone
  const handleAddMicrophone = async () => {
    if (!micManager.canAddMicrophone()) {
      return;
    }
    
    setIsAddingMic(true);
    try {
      await micManager.assignMicrophone(selectedDeviceId);
      setSelectedDeviceId('default');
    } catch (error) {
      console.error('Failed to add microphone:', error);
    }
    setIsAddingMic(false);
  };
  
  // Handle removing a microphone
  const handleRemoveMicrophone = async (id: string) => {
    await micManager.unassignMicrophone(id);
    setExpandedMics(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  
  // Handle updating config
  const handleUpdateConfig = async (id: string, config: Partial<ExtendedMicConfig>) => {
    await micManager.updateExtendedConfig(id, config);
    
    // Notify parent
    const allConfigs: Record<string, ExtendedMicConfig> = {};
    assignedMics.forEach(mic => {
      allConfigs[mic.id] = mic.id === id ? { ...mic.config, ...config } : mic.config;
    });
    onSettingsChange?.(allConfigs);
  };
  
  // Handle updating name
  const handleUpdateName = (id: string, name: string) => {
    micManager.updateCustomName(id, name);
  };
  
  // Toggle expanded state
  const toggleExpanded = (id: string) => {
    setExpandedMics(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Apply optimal settings to all mics
  const handleApplyOptimalToAll = async () => {
    await micManager.applyOptimalSettingsToAll();
  };
  
  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-cyan-400" />
            Mikrofon-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-white/70">
            <p>
              <strong className="text-white">🎤 Bis zu 4 Mikrofone:</strong> Jedes Mikrofon hat eigene Einstellungen.
            </p>
            <p>
              <strong className="text-white">⚙️ UltraStar/SingStar-Standard:</strong> Optimal für Pitch-Detection vorkonfiguriert.
            </p>
            <p>
              <strong className="text-white">📝 Individuelle Namen:</strong> Klicken Sie auf den Namen zum Bearbeiten.
            </p>
            <ul className="text-xs text-white/50 mt-3 space-y-1">
              <li>• <strong>AGC (Auto Gain Control)</strong> sollte AUS sein für präzise Pitch-Erkennung</li>
              <li>• <strong>Echo Cancellation</strong> und <strong>Noise Suppression</strong> sollten AN sein</li>
              <li>• <strong>FFT Size 4096</strong> ist optimal für Pitch-Detection</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* Assigned Microphones */}
      {assignedMics.map((mic) => (
        <MicrophoneCard
          key={mic.id}
          mic={mic}
          devices={devices}
          onUpdateConfig={handleUpdateConfig}
          onUpdateName={handleUpdateName}
          onRemove={handleRemoveMicrophone}
          isExpanded={expandedMics.has(mic.id)}
          onToggleExpand={() => toggleExpanded(mic.id)}
        />
      ))}
      
      {/* Add Microphone Button */}
      {assignedMics.length < MAX_MICROPHONES && (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="py-6">
            {isAddingMic ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                    <SelectTrigger className="flex-1 bg-white/10 border-white/20">
                      <SelectValue placeholder="Mikrofon wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.filter(d => d.deviceId).map((device) => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                          {device.isDefault && ' (Standard)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddMicrophone} className="bg-green-500 hover:bg-green-400">
                    Hinzufügen
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddingMic(false)}
                    className="border-white/20"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingMic(true)}
                className="w-full flex items-center justify-center gap-2 py-4 text-white/60 hover:text-white transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Mikrofon {assignedMics.length + 1} hinzufügen ({MAX_MICROPHONES - assignedMics.length} von {MAX_MICROPHONES} verfügbar)</span>
              </button>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Max microphones reached */}
      {assignedMics.length >= MAX_MICROPHONES && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center">
          <p className="text-cyan-400 text-sm">
            ✓ Maximale Anzahl von {MAX_MICROPHONES} Mikrofonen erreicht
          </p>
        </div>
      )}
      
      {/* Quick Actions */}
      {assignedMics.length > 0 && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleApplyOptimalToAll}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            ⚡ Optimale Einstellungen auf alle anwenden
          </Button>
          <Button 
            variant="outline" 
            onClick={() => micManager.getMicrophones()}
            className="border-white/20 text-white hover:bg-white/10"
          >
            🔄 Geräte aktualisieren
          </Button>
        </div>
      )}
      
      {/* Supported Microphones Info */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-sm">Unterstützte Mikrofone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🎤', title: 'USB Mics', desc: 'Blue Yeti, AT2020' },
              { icon: '🎮', title: 'SingStar Mics', desc: 'PS2/PS3 Dongles' },
              { icon: '🔌', title: '3.5mm Jack', desc: 'Headset Mics' },
              { icon: '📱', title: 'Mobile', desc: 'Phone as Mic' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-2 bg-white/5 rounded-lg">
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-xs font-medium">{title}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MicrophoneSettingsPanel;
