import { useState, useCallback, useEffect } from 'react';

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
