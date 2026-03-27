import { useState, useRef, useCallback, useEffect } from 'react';
import type { Song, HighscoreEntry } from '@/types/game';
import { apiClient } from '@/lib/api-client';
import { VideoStyle, CameraPosition, VideoStyleConfig, VIDEO_STYLES } from './types';

export function useShortsCreator(
  song: Song,
  score: HighscoreEntry,
  audioUrl?: string
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(15);
  const [style, setStyle] = useState<VideoStyle>('neon');
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('pip-top-right');
  const [progress, setProgress] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingMobileCamera, setIsRequestingMobileCamera] = useState(false);
  const [mobileCameraConnected, setMobileCameraConnected] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const styleConfig: VideoStyleConfig = VIDEO_STYLES.find(s => s.id === style) || VIDEO_STYLES[0];

  // Request mobile camera from companion app
  const requestMobileCamera = useCallback(async () => {
    setIsRequestingMobileCamera(true);
    try {
      await apiClient.post('/api/mobile', { action: 'requestCameraStart' });
      setMobileCameraConnected(true);
    } catch {
      setCameraError('Failed to connect to mobile camera');
    }
    setIsRequestingMobileCamera(false);
  }, []);

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
      setCameraError('Camera access denied');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setHasCamera(false);
    setMobileCameraConnected(false);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    
    // Add audio if available
    if (audioUrl) {
      try {
        const audioContext = new AudioContext();
        const audioElement = new Audio(audioUrl);
        audioElement.currentTime = song.preview?.startTime ? song.preview.startTime / 1000 : 0;
        const source = audioContext.createMediaElementSource(audioElement);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        
        stream.addTrack(destination.stream.getAudioTracks()[0]);
        audioRef.current = audioElement;
      } catch {
        console.log('Audio capture not available');
      }
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setProgress(0);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    setRecordingStartTime(Date.now());
    mediaRecorder.start();
    setIsRecording(true);

    // Auto-stop after duration
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, duration * 1000);

    if (audioRef.current) {
      audioRef.current.play();
    }
  }, [audioUrl, duration, song.preview]);

  // Stop recording
  const stopRecording = useCallback(() => {
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
          title: 'My Karaoke Score!',
          text: `I scored ${score.score.toLocaleString()} points on "${song.title}"!`,
          files: [file],
        });
      } catch {
        console.log('Share cancelled');
      }
    } else {
      downloadVideo();
    }
  }, [recordedBlob, score.score, song.title, downloadVideo]);

  // Reset
  const resetRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setProgress(0);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    // Refs
    canvasRef,
    videoRef,
    cameraVideoRef,
    
    // State
    isRecording,
    recordedBlob,
    recordedUrl,
    duration,
    style,
    cameraPosition,
    progress,
    recordingStartTime,
    hasCamera,
    cameraError,
    isRequestingMobileCamera,
    styleConfig,
    
    // Setters
    setDuration,
    setStyle,
    setCameraPosition,
    setProgress,
    
    // Actions
    requestMobileCamera,
    startLocalCamera,
    stopCamera,
    startRecording,
    stopRecording,
    downloadVideo,
    shareVideo,
    resetRecording,
  };
}
