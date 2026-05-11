'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface WebcamButtonProps {
  /** Ref to collect active streams (for cleanup by parent) */
  activeWebcamStreamsRef: React.MutableRefObject<MediaStream[]>;
}

/**
 * Universal webcam toggle button with floating preview.
 * Based on the PTM inline implementation — simple, clean, effective.
 * Clicking the preview closes it.
 */
export function WebcamButton({ activeWebcamStreamsRef }: WebcamButtonProps) {
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const toggleWebcam = useCallback(() => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
      activeWebcamStreamsRef.current = activeWebcamStreamsRef.current.filter(s => s !== webcamStream);
      setWebcamStream(null);
    } else {
      navigator.mediaDevices?.getUserMedia({ video: true })
        .then(stream => {
          activeWebcamStreamsRef.current.push(stream);
          setWebcamStream(stream);
        })
        .catch(() => {});
    }
  }, [webcamStream, activeWebcamStreamsRef]);

  // Clean up webcam stream on unmount
  const streamRef = useRef(webcamStream);
  streamRef.current = webcamStream;
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        onClick={toggleWebcam}
        className={`rounded-lg w-10 h-10 p-0 text-sm ${
          webcamStream
            ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
            : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        title={webcamStream ? 'Kamera schließen' : 'Kamera'}
      >
        📷
      </Button>

      {/* Floating webcam preview */}
      {webcamStream && (
        <video
          autoPlay
          playsInline
          muted
          ref={(el) => { if (el) el.srcObject = webcamStream; }}
          className="pointer-events-auto fixed bottom-20 right-4 w-[200px] rounded-xl z-[100] border-2 border-white/30 cursor-pointer"
          onClick={toggleWebcam}
          title="Kamera schließen"
        />
      )}
    </>
  );
}
