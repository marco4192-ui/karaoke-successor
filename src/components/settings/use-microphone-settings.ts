'use client';

import { useState, useEffect } from 'react';
import {
  MicrophoneDevice,
  ExtendedMicConfig,
  AssignedMicrophone,
  getMultiMicrophoneManager,
} from '@/lib/audio/microphone-manager';

export interface MicrophoneSettingsPanelProps {
  onSettingsChange?: (settings: Record<string, ExtendedMicConfig>) => void;
}

export function useMicrophoneSettings(onSettingsChange?: MicrophoneSettingsPanelProps['onSettingsChange']) {
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
    return () => {};
  }, []);

  // Subscribe to assigned mics changes
  useEffect(() => {
    setAssignedMics(micManager.getAssignedMicrophones());
    micManager.onAssignedMics(setAssignedMics);
    return () => { micManager.offAssignedMics(); };
  }, []);

  const handleAddMicrophone = async () => {
    if (!micManager.canAddMicrophone()) return;
    setIsAddingMic(true);
    try {
      await micManager.assignMicrophone(selectedDeviceId);
      setSelectedDeviceId('default');
    } catch (error) {
      console.error('Failed to add microphone:', error);
    }
    setIsAddingMic(false);
  };

  const handleRemoveMicrophone = async (id: string) => {
    await micManager.unassignMicrophone(id);
    setExpandedMics(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleUpdateConfig = async (id: string, config: Partial<ExtendedMicConfig>) => {
    await micManager.updateExtendedConfig(id, config);
    const allConfigs: Record<string, ExtendedMicConfig> = {};
    assignedMics.forEach(mic => {
      allConfigs[mic.id] = mic.id === id ? { ...mic.config, ...config } : mic.config;
    });
    onSettingsChange?.(allConfigs);
  };

  const handleUpdateName = (id: string, name: string) => {
    micManager.updateCustomName(id, name);
  };

  const toggleExpanded = (id: string) => {
    setExpandedMics(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleApplyOptimalToAll = async () => {
    await micManager.applyOptimalSettingsToAll();
  };

  const handleRefreshDevices = () => {
    micManager.getMicrophones();
  };

  return {
    devices,
    assignedMics,
    expandedMics,
    isAddingMic,
    selectedDeviceId,
    setSelectedDeviceId,
    setIsAddingMic,
    handleAddMicrophone,
    handleRemoveMicrophone,
    handleUpdateConfig,
    handleUpdateName,
    toggleExpanded,
    handleApplyOptimalToAll,
    handleRefreshDevices,
  };
}
