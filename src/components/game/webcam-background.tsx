'use client';

import React, { useRef, useEffect } from 'react';
import { useWebcamBackground } from './use-webcam-background';
import { getFilterStyle } from './webcam-types';
import type { WebcamBackgroundConfig, WebcamSizeMode } from './webcam-types';

// Re-export types, defaults, and utilities for backward compatibility
export type { WebcamSizeMode, WebcamPosition, WebcamFilter, WebcamBackgroundConfig } from './webcam-types';
export { DEFAULT_WEBCAM_CONFIG, saveWebcamConfig, loadWebcamConfig } from './webcam-types';

// Re-export hook
export { useWebcamBackground } from './use-webcam-background';

// Re-export UI components
export { WebcamSettingsPanel, WebcamQuickControls, WebcamIcon } from './webcam-settings-panel';

// ===================== Webcam Background Component =====================

interface WebcamBackgroundProps {
  config: WebcamBackgroundConfig;
  onConfigChange?: (_config: Partial<WebcamBackgroundConfig>) => void;
  className?: string;
}

export function WebcamBackground({ config, onConfigChange: _onConfigChange, className }: WebcamBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    stream, 
    isLoading, 
    error, 
    devices: _devices,
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

export default WebcamBackground;
