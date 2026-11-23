'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ===================== Webcam Background Hook =====================

// ── R104: shared active-stream registry ──
// The replay recorder reuses the LIVE camera stream via getActiveWebcamStream()
// instead of opening a SECOND getUserMedia session on the same device (which
// doubled camera bandwidth and made exclusive cameras flicker or fail).
let activeWebcamStream: MediaStream | null = null;

/** The webcam stream currently owned by a mounted useWebcamBackground
 *  instance (e.g. the in-game WebcamBackground), or null when off. */
export function getActiveWebcamStream(): MediaStream | null {
  return activeWebcamStream;
}

function registerActiveWebcamStream(stream: MediaStream | null): void {
  activeWebcamStream = stream;
}

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
      // eslint-disable-next-line no-console
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
      // R104: publish the live stream for reuse (replay recorder)
      registerActiveWebcamStream(mediaStream);
      
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
      // R104: clear the shared registry only if WE own the published stream
      // (another hook instance may have started a newer one meanwhile)
      if (getActiveWebcamStream() === stream) registerActiveWebcamStream(null);
      setStream(null);
    }
  }, [stream]);
  
  // Switch camera device
  const switchDevice = useCallback(async (newDeviceId: string) => {
    stopWebcam();
    return await startWebcam(newDeviceId);
  }, [stopWebcam, startWebcam]);
  
  // Cleanup on unmount — use ref to always capture the latest stream,
  // even if stream was set to null before the effect re-ran.
  const streamRef = useRef(stream);
  streamRef.current = stream;
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        // R104: release the shared registry on unmount as well
        if (getActiveWebcamStream() === streamRef.current) registerActiveWebcamStream(null);
      }
    };
  }, []);
  
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
