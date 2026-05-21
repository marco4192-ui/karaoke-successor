'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { Song, HighscoreEntry } from '@/types/game';
import type { VideoStyle, CameraPosition } from './shorts-types';
import { useCanvasRenderer, ShortsCanvas } from './shorts-canvas';
import {
  CameraControls,
  StyleSelector,
  DurationSlider,
  RecordingProgress,
  RecordingActions,
} from './shorts-controls';

interface ShortsCreatorProps {
  song: Song;
  score: HighscoreEntry;
  audioUrl?: string;
}

export function ShortsCreator({ song, score, audioUrl }: ShortsCreatorProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Cleanup on unmount: revoke blob URL, close AudioContext, clear timers
  useEffect(() => {
    return () => {
      if (recordedUrl?.startsWith('blob:')) URL.revokeObjectURL(recordedUrl);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [recordedUrl]);

  const [duration, setDuration] = useState(15);
  const [style, setStyle] = useState<VideoStyle>('neon');
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('pip-top-right');
  const [progress, setProgress] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingMobileCamera, setIsRequestingMobileCamera] = useState(false);
  const [mobileCameraConnected, setMobileCameraConnected] = useState(false);

  // -----------------------------------------------------------------------
  // Canvas renderer hook — handles drawFrame + animation loop
  // -----------------------------------------------------------------------
  useCanvasRenderer({
    canvasRef,
    cameraVideoRef,
    song,
    score,
    style,
    cameraPosition,
    hasCamera,
    isRecording,
    duration,
    recordingStartTime,
    onProgress: setProgress,
  });

  // -----------------------------------------------------------------------
  // Camera management
  // -----------------------------------------------------------------------

  // Request mobile camera from companion app
  const requestMobileCamera = useCallback(async () => {
    setIsRequestingMobileCamera(true);
    try {
      // Signal to mobile app to start camera
      await fetch('/api/mobile?action=requestCameraStart', { method: 'POST' });
      setMobileCameraConnected(true);
    } catch {
      setCameraError(t('shortsCreator.errorMobileCamera'));
    }
    setIsRequestingMobileCamera(false);
  }, [t]);

  // Use local camera
  const startLocalCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 720, height: 1280 },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setCameraError(null);
    } catch {
      setCameraError(t('shortsCreator.errorCameraAccess'));
    }
  }, [t]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setHasCamera(false);
    setMobileCameraConnected(false);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // -----------------------------------------------------------------------
  // Recording logic
  // -----------------------------------------------------------------------

  // Start recording
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);

    // Add audio if available
    if (audioUrl) {
      try {
        // Close any previous AudioContext before creating a new one
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const audioElement = new Audio(audioUrl);
        audioElement.crossOrigin = 'anonymous';
        audioElement.currentTime = song.preview?.startTime ? song.preview.startTime / 1000 : 0;
        const source = audioContext.createMediaElementSource(audioElement);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);

        stream.addTrack(destination.stream.getAudioTracks()[0]);
        audioRef.current = audioElement;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[ShortsCreator] Audio setup for recording failed:', error);
      }
    }

    // Select best supported mimeType
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setProgress(0);

      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Close AudioContext after recording to free resources
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    setRecordingStartTime(Date.now());
    mediaRecorder.start();
    setIsRecording(true);

    // Auto-stop after duration (track timer for cleanup)
    autoStopTimerRef.current = setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      autoStopTimerRef.current = null;
    }, duration * 1000);

    if (audioRef.current) {
      audioRef.current.play();
    }
  }, [audioUrl, duration, song.preview, t]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Download video
  const downloadVideo = useCallback(() => {
    if (!recordedBlob || !recordedUrl) return;

    const link = document.createElement('a');
    link.href = recordedUrl;
    link.download = `karaoke-${song.title.replace(/[^a-z0-9]/gi, '-')}.webm`;
    link.click();
  }, [recordedBlob, recordedUrl, song.title, t]);

  // Share video
  const shareVideo = useCallback(async () => {
    if (!recordedBlob) return;

    const file = new File([recordedBlob], 'karaoke-score.webm', { type: 'video/webm' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: t('scoreCardSocial.shareTitle'),
          text: `I scored ${score.score.toLocaleString()} points on "${song.title}"!`,
          files: [file],
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[ShortsCreator] Share cancelled or failed:', error);
      }
    } else {
      downloadVideo();
    }
  }, [recordedBlob, score.score, song.title, downloadVideo, t]);

  // Reset
  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setProgress(0);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Canvas Preview */}
      <ShortsCanvas
        canvasRef={canvasRef}
        cameraVideoRef={cameraVideoRef}
        isRecording={isRecording}
      />

      {/* Camera Controls */}
      {!recordedBlob && (
        <CameraControls
          hasCamera={hasCamera}
          mobileCameraConnected={mobileCameraConnected}
          isRequestingMobileCamera={isRequestingMobileCamera}
          cameraError={cameraError}
          cameraPosition={cameraPosition}
          onStartLocalCamera={startLocalCamera}
          onRequestMobileCamera={requestMobileCamera}
          onStopCamera={stopCamera}
          onSetCameraPosition={setCameraPosition}
          onSetMobileCameraConnected={setMobileCameraConnected}
        />
      )}

      {/* Duration Slider */}
      {!recordedBlob && (
        <DurationSlider
          duration={duration}
          onSetDuration={setDuration}
        />
      )}

      {/* Style Selection */}
      {!recordedBlob && (
        <StyleSelector
          style={style}
          onSetStyle={setStyle}
        />
      )}

      {/* Progress */}
      {isRecording && (
        <RecordingProgress progress={progress} />
      )}

      {/* Actions */}
      <RecordingActions
        hasRecording={!!recordedBlob}
        isRecording={isRecording}
        duration={duration}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onResetRecording={resetRecording}
        onDownloadVideo={downloadVideo}
        onShareVideo={shareVideo}
      />

      {/* Video Preview */}
      {recordedUrl && (
        <video
          ref={videoRef}
          src={recordedUrl}
          controls
          className="w-full rounded-xl border border-white/10"
          style={{ aspectRatio: '9/16', maxHeight: 400 }}
        />
      )}
    </div>
  );
}
