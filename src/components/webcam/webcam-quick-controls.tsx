'use client';

import { 
  WebcamBackgroundConfig, 
  WebcamSizeMode, 
  WebcamPosition 
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

interface WebcamQuickControlsProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (config: Partial<WebcamBackgroundConfig>) => void;
  devices: MediaDeviceInfo[];
}

export function WebcamQuickControls({ config, onConfigChange, devices }: WebcamQuickControlsProps) {
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
