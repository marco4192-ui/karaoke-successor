'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  MicrophoneDevice, 
  MicrophoneConfig, 
  MicrophoneStatus,
  getMicrophoneManager 
} from '@/lib/audio/microphone-manager';

interface MicrophoneSettingsProps {
  onConnected?: () => void;
}

const micManager = getMicrophoneManager();

export function MicrophoneSettings({ onConnected }: MicrophoneSettingsProps) {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [config, setConfig] = useState<MicrophoneConfig>(() => micManager.getConfig());
  const [status, setStatus] = useState<MicrophoneStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    micManager.getMicrophones().then(setDevices);
    micManager.onStatus(setStatus);
    micManager.onDevices(setDevices);
    return () => { micManager.destroy(); };
  }, []);

  const handleConnect = useCallback(async (deviceId?: string) => {
    const success = await micManager.connect(deviceId);
    if (success && onConnected) onConnected();
    setConfig(micManager.getConfig());
  }, [onConnected]);

  const handleDisconnect = useCallback(async () => {
    await micManager.disconnect();
  }, []);

  const handleTest = useCallback(async () => {
    if (!status?.isConnected) await handleConnect();
    setIsTesting(true);
    setTestResult(null);
    const result = await micManager.testMicrophone(3000);
    setTestResult(result);
    setIsTesting(false);
  }, [status?.isConnected, handleConnect]);

  const updateConfig = useCallback((updates: Partial<MicrophoneConfig>) => {
    micManager.updateConfig(updates);
    setConfig(micManager.getConfig());
  }, []);

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎤 Microphone
            {status?.isConnected && <Badge className="bg-green-500">Connected</Badge>}
          </CardTitle>
          <CardDescription>Select and configure your microphone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Input Device</label>
            {devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => handleConnect(device.deviceId)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${
                  config?.deviceId === device.deviceId
                    ? 'bg-cyan-500/20 border border-cyan-500/50'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${config?.deviceId === device.deviceId ? 'bg-cyan-500' : 'bg-white/30'}`} />
                <span className="text-sm">{device.label}</span>
              </button>
            ))}
            <Button variant="outline" size="sm" className="mt-2 border-white/20 text-white" onClick={() => micManager.getMicrophones()}>
              Refresh Devices
            </Button>
          </div>

          {status?.isConnected && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Input Level</span>
                <span>{Math.round((status.volume || 0) * 100)}%</span>
              </div>
              <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all" style={{ width: `${(status.volume || 0) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {status?.isConnected ? (
              <Button variant="destructive" onClick={handleDisconnect} className="flex-1">Disconnect</Button>
            ) : (
              <Button onClick={() => handleConnect()} className="flex-1 bg-cyan-500 hover:bg-cyan-400">Connect Microphone</Button>
            )}
            <Button variant="outline" onClick={handleTest} disabled={isTesting} className="border-white/20 text-white">
              {isTesting ? 'Testing...' : 'Test Mic'}
            </Button>
          </div>

          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <p className={testResult.success ? 'text-green-400' : 'text-red-400'}>{testResult.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle>Audio Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm text-white/60">Input Gain</label>
              <span className="text-sm">{((config?.gain || 1) * 100).toFixed(0)}%</span>
            </div>
            <Slider value={[(config?.gain || 1) * 100]} onValueChange={([v]) => updateConfig({ gain: v / 100 })} min={10} max={300} step={5} />
          </div>

          <div className="space-y-3">
            {[
              { label: 'Noise Suppression', desc: 'Reduce background noise', key: 'noiseSuppression' as const },
              { label: 'Echo Cancellation', desc: 'Prevent feedback loops', key: 'echoCancellation' as const },
              { label: 'Auto Gain Control', desc: 'Automatically adjust volume', key: 'autoGainControl' as const },
            ].map(({ label, desc, key }) => (
              <div key={key} className="flex items-center justify-between">
                <div><p className="text-sm">{label}</p><p className="text-xs text-white/40">{desc}</p></div>
                <Switch checked={config?.[key] ?? true} onCheckedChange={(c) => updateConfig({ [key]: c })} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle>Supported Microphones</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🎤', title: 'USB Mics', desc: 'Blue Yeti, AT2020' },
              { icon: '🎮', title: 'SingStar Mics', desc: 'PS2/PS3 dongles' },
              { icon: '🔌', title: '3.5mm Jack', desc: 'Headset mics' },
              { icon: '📱', title: 'Mobile', desc: 'Phone as mic' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-sm">{title}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
