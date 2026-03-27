'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getMultiMicrophoneManager,
  ExtendedMicConfig,
  MAX_MICROPHONES,
} from '@/lib/audio/microphone-manager';
import { MicIcon, PlusIcon, InfoIcon } from './mic-settings-icons';
import { MicrophoneCard } from './microphone-card';

interface MicrophoneSettingsPanelProps {
  onSettingsChange?: (settings: Record<string, ExtendedMicConfig>) => void;
}

export function MicrophoneSettingsPanel({
  onSettingsChange,
}: MicrophoneSettingsPanelProps) {
  const [devices, setDevices] = useState<any[]>([]);
  const [assignedMics, setAssignedMics] = useState<any[]>([]);
  const [expandedMics, setExpandedMics] = useState<Set<string>>(new Set());
  const [isAddingMic, setIsAddingMic] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  const micManager = getMultiMicrophoneManager();

  // Load available devices
  useEffect(() => {
    micManager.getMicrophones().then(setDevices);
    micManager.onDevices(setDevices);
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
    setExpandedMics((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Handle updating config
  const handleUpdateConfig = async (id: string, config: Partial<ExtendedMicConfig>) => {
    await micManager.updateExtendedConfig(id, config);

    const allConfigs: Record<string, ExtendedMicConfig> = {};
    assignedMics.forEach((mic: any) => {
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
    setExpandedMics((prev) => {
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
              <strong className="text-white">🎤 Bis zu 4 Mikrofone:</strong> Jedes Mikrofon hat eigene
              Einstellungen.
            </p>
            <p>
              <strong className="text-white">⚙️ UltraStar/SingStar-Standard:</strong> Optimal für
              Pitch-Detection vorkonfiguriert.
            </p>
            <p>
              <strong className="text-white">📝 Individuelle Namen:</strong> Klicken Sie auf den Namen
              zum Bearbeiten.
            </p>
            <ul className="text-xs text-white/50 mt-3 space-y-1">
              <li>
                • <strong>AGC (Auto Gain Control)</strong> sollte AUS sein für präzise Pitch-Erkennung
              </li>
              <li>
                • <strong>Echo Cancellation</strong> und <strong>Noise Suppression</strong> sollten AN
                sein
              </li>
              <li>
                • <strong>FFT Size 4096</strong> ist optimal für Pitch-Detection
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Microphones */}
      {assignedMics.map((mic: any) => (
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
              <div className="flex items-center gap-2">
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger className="flex-1 bg-white/10 border-white/20">
                    <SelectValue placeholder="Mikrofon wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device: any) => (
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
            ) : (
              <button
                onClick={() => setIsAddingMic(true)}
                className="w-full flex items-center justify-center gap-2 py-4 text-white/60 hover:text-white transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>
                  Mikrofon {assignedMics.length + 1} hinzufügen ({MAX_MICROPHONES - assignedMics.length}{' '}
                  von {MAX_MICROPHONES} verfügbar)
                </span>
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
