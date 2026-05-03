'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNativeAudio } from '@/hooks/use-native-audio';
import type { AudioDeviceInfo } from '@/lib/audio/native-audio';

export function AudioOutputSection() {
  const {
    enabled,
    setEnabled,
    deviceId,
    setDeviceId,
    devices,
    refreshDevices,
    loading,
  } = useNativeAudio();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (devices.length > 0) setError(null);
  }, [devices]);

  // Group devices by host
  const groupedDevices = devices.reduce<Record<string, AudioDeviceInfo[]>>((acc, device) => {
    if (!acc[device.host_name]) acc[device.host_name] = [];
    acc[device.host_name].push(device);
    return acc;
  }, {});

  const hasAsioDevices = Object.keys(groupedDevices).some(
    (host) => host.toUpperCase().includes('ASIO')
  );

  const currentDevice = devices.find((d) => d.id === deviceId);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Audio Output
        </CardTitle>
        <CardDescription>
          Select your audio output device. ASIO devices offer low-latency output for professional audio interfaces.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <div>
            <h4 className="font-medium">Native Audio Output</h4>
            <p className="text-sm text-white/60">
              Use native audio output instead of browser audio. Required for ASIO support.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
              enabled ? 'bg-cyan-500' : 'bg-white/20'
            }`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${enabled ? 'left-8' : 'left-1'}`} />
          </button>
        </div>

        {enabled && (
          <>
            {/* Device Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Output Device</label>
                <button
                  type="button"
                  onClick={() => refreshDevices()}
                  disabled={loading}
                  className="text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Scanning...' : '↻ Refresh'}
                </button>
              </div>

              {error ? (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              ) : devices.length === 0 ? (
                <div className="p-3 bg-white/5 rounded-lg text-white/60 text-sm">
                  {loading ? 'Scanning for devices...' : 'No audio devices found.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedDevices).map(([hostName, hostDevices]) => (
                    <div key={hostName}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          hostName.toUpperCase().includes('ASIO')
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-white/50'
                        }`}>
                          {hostName}
                        </span>
                        {hostName.toUpperCase().includes('ASIO') && (
                          <span className="text-xs text-green-400/70">Low-Latency</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {hostDevices.map((device) => (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => setDeviceId(device.id)}
                            className={`w-full text-left p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                              deviceId === device.id
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">{device.name}</span>
                              {deviceId === device.id && (
                                <span className="text-cyan-400 text-xs ml-2">✓ Active</span>
                              )}
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-white/50">
                              <span>{device.default_sample_rate} Hz</span>
                              <span>{device.max_channels}ch</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Device Info */}
            {currentDevice && (
              <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                <h4 className="text-sm font-medium text-cyan-400 mb-1">Current Device</h4>
                <p className="text-sm text-white/80">{currentDevice.name}</p>
                <div className="flex gap-4 mt-1 text-xs text-white/50">
                  <span>Backend: {currentDevice.host_name}</span>
                  <span>Sample Rate: {currentDevice.default_sample_rate} Hz</span>
                  <span>Channels: {currentDevice.max_channels}</span>
                </div>
              </div>
            )}

            {/* ASIO Info Notice */}
            {hasAsioDevices && (
              <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-400">
                  ✓ ASIO devices detected. Native audio output is active for low-latency playback.
                </p>
              </div>
            )}

            {!hasAsioDevices && (
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400/80">
                  No ASIO devices detected. Your audio interface drivers may not be installed, or the ASIO SDK was not available at build time. Using WASAPI as fallback (still low-latency).
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
