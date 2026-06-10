import { useState, useEffect } from 'react';
import { StorageKeys, getJsonOptional } from '@/lib/storage';

export interface ActiveMic {
  id: string;
  deviceId: string;
  customName: string;
  deviceName: string;
}

/**
 * Returns mics from MULTI_MIC_CONFIG whose underlying audio device
 * is currently connected / enumerated by the browser.
 *
 * Initialises synchronously from localStorage to avoid a flash of
 * empty content, then asynchronously verifies each mic's deviceId
 * against navigator.mediaDevices.enumerateDevices().  Subscribes to
 * the "devicechange" event so the list updates when a mic is plugged
 * in or removed at runtime.
 */
export function useActiveMics(): ActiveMic[] {
  const [activeMics, setActiveMics] = useState<ActiveMic[]>(() => {
    try {
      const parsed = getJsonOptional<{
        assignedMics?: Array<{
          id: string;
          deviceId?: string;
          customName?: string;
          deviceName?: string;
        }>;
      }>(StorageKeys.MULTI_MIC_CONFIG);
      if (parsed?.assignedMics?.length) {
        return parsed.assignedMics.map(m => ({
          id: m.id,
          deviceId: m.deviceId || '',
          customName: m.customName || '',
          deviceName: m.deviceName || '',
        }));
      }
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    let cancelled = false;

    const filterConnected = async () => {
      try {
        const parsed = getJsonOptional<{
          assignedMics?: Array<{
            id: string;
            deviceId?: string;
            customName?: string;
            deviceName?: string;
          }>;
        }>(StorageKeys.MULTI_MIC_CONFIG);

        if (!parsed?.assignedMics?.length) {
          if (!cancelled) setActiveMics([]);
          return;
        }

        let devices = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devices.some(d => d.kind === 'audioinput' && d.label);
        if (!hasLabels) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            devices = await navigator.mediaDevices.enumerateDevices();
          } catch {
            // Permission denied — cannot verify, keep current list
            return;
          }
        }

        const availableIds = new Set(
          devices.filter(d => d.kind === 'audioinput').map(d => d.deviceId),
        );

        if (cancelled) return;

        const connected = parsed.assignedMics
          .filter(m => m.deviceId && availableIds.has(m.deviceId))
          .map(m => ({
            id: m.id,
            deviceId: m.deviceId || '',
            customName: m.customName || '',
            deviceName: m.deviceName || '',
          }));

        setActiveMics(prev => {
          // Only update if the list actually changed
          if (prev.length === connected.length && prev.every((m, i) => m.id === connected[i].id)) {
            return prev;
          }
          return connected;
        });
      } catch {
        // Ignore enumeration errors
      }
    };

    filterConnected();

    const handler = () => filterConnected();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, []);

  return activeMics;
}