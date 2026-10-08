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
  /**
   * R44: compact layout for the results ShareBox —
   *  · the 9:16 canvas is sized by the AVAILABLE HEIGHT (never clipped),
   *  · controls are condensed to single rows,
   *  · a finished recording REPLACES the live canvas in the same slot
   *    (R44/5.6) and hides all configuration controls.
   */
  compact?: boolean;
  /** R60/4: Companion-Share-Overlay — hides the „📲 Mobile Camera” option
   *  (that button asks the DESKTOP to request a companion camera, which is
   *  meaningless ON the companion itself; its local camera is the „Use
   *  Device Camera” button). Desktop default: shown. */
  hideMobileCameraOption?: boolean;
}

export function ShortsCreator({ song, score, compact, hideMobileCameraOption }: ShortsCreatorProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Cleanup on unmount: revoke blob URL, clear timers
  useEffect(() => {
    return () => {
      if (recordedUrl?.startsWith('blob:')) URL.revokeObjectURL(recordedUrl);
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
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

  // R44/5.6: when the finished recording is dismissed ("Neu"), the live
  // canvas remounts with a FRESH <video> element — re-attach the still-open
  // camera stream so the PiP keeps working without re-requesting permission.
  useEffect(() => {
    if (!recordedUrl && cameraStreamRef.current && cameraVideoRef.current && !cameraVideoRef.current.srcObject) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
      // Explicit play(): some environments don't honor autoplay on a
      // re-attached srcObject — muted play() is always allowed.
      cameraVideoRef.current.play().catch(() => {});
    }
  }, [recordedUrl]);

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
        // Explicit play(): muted autoplay is allowed everywhere and avoids
        // headless/strict-policy environments leaving the feed paused.
        cameraVideoRef.current.play().catch(() => {});
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
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
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
  //
  // R44/5.8: the MediaRecorder captures the CANVAS STREAM ONLY — a silent
  // video. ALL audio capture was removed (AudioContext, Audio element,
  // MediaElementSource, addTrack) to avoid shipping copyrighted music in
  // shared clips (see the 🔇 note under the ShareBox action grid).
  // -----------------------------------------------------------------------

  // Start recording
  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);

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
  }, [duration]);

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
  }, [recordedBlob, recordedUrl, song.title]);

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
  const hasRecording = !!recordedBlob;

  return (
    <div className={compact ? 'h-full flex flex-col min-h-0 gap-2' : 'space-y-4'}>
      {/* Canvas slot — the live preview, OR the finished recording taking
          its place (R44/5.6: replace instead of appending below).
          Compact: the slot is a relative anchor and the 9:16 media lives in
          an OUT-OF-FLOW layer (absolute inset-0) — its intrinsic 1280px
          min-content height must not blow up the results height chain. */}
      <div className={compact ? 'relative flex-1 min-h-0' : undefined}>
        {recordedUrl ? (
          compact ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <video
                ref={videoRef}
                src={recordedUrl}
                controls
                className="max-h-full w-auto max-w-full rounded-xl border border-white/10"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={recordedUrl}
              controls
              className="w-full rounded-xl border border-white/10"
              style={{ aspectRatio: '9/16', maxHeight: 400 }}
            />
          )
        ) : (
          <ShortsCanvas
            canvasRef={canvasRef}
            cameraVideoRef={cameraVideoRef}
            isRecording={isRecording}
            compact={compact}
          />
        )}
      </div>

      {/* Live configuration — hidden entirely once a recording exists
          (R44/5.6): only the action row (Neu/Download/Share) remains. */}
      {!hasRecording && (
        <>
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
            hideMobileCameraOption={hideMobileCameraOption}
            compact={compact}
          />
          <DurationSlider
            duration={duration}
            onSetDuration={setDuration}
            compact={compact}
          />
          <StyleSelector
            style={style}
            onSetStyle={setStyle}
            compact={compact}
          />
        </>
      )}

      {/* Progress (while recording) */}
      {isRecording && <RecordingProgress progress={progress} compact={compact} />}

      {/* Actions */}
      <RecordingActions
        hasRecording={hasRecording}
        isRecording={isRecording}
        duration={duration}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onResetRecording={resetRecording}
        onDownloadVideo={downloadVideo}
        onShareVideo={shareVideo}
        compact={compact}
      />
    </div>
  );
}
