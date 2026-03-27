'use client';

// Re-export all webcam components from modular files
export {
  // Types
  type WebcamBackgroundConfig,
  type WebcamSizeMode,
  type WebcamPosition,
  type WebcamFilter,
  DEFAULT_WEBCAM_CONFIG,
  saveWebcamConfig,
  loadWebcamConfig,
  
  // Hook
  useWebcamBackground,
  
  // Components
  WebcamBackground,
  WebcamSettingsPanel,
  WebcamQuickControls,
} from '@/components/webcam';

// Import for the wrapper component
import { 
  WebcamBackgroundConfig, 
  useWebcamBackground,
  WebcamBackground as WebcamBackgroundComponent,
} from '@/components/webcam';
import { useEffect, useRef } from 'react';

// Wrapper component for backwards compatibility
interface WebcamBackgroundWrapperProps {
  config: WebcamBackgroundConfig;
  onConfigChange?: (config: Partial<WebcamBackgroundConfig>) => void;
  className?: string;
}

function WebcamBackgroundWrapper({ 
  config, 
  onConfigChange, 
  className 
}: WebcamBackgroundWrapperProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { 
    stream, 
    isLoading, 
    error, 
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
  
  if (!config.enabled) {
    return null;
  }
  
  return (
    <WebcamBackgroundComponent
      config={config}
      stream={stream}
      isLoading={isLoading}
      error={error}
      className={className}
    />
  );
}

// Default export for backwards compatibility
export default WebcamBackgroundWrapper;
