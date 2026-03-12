'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Song, HighscoreEntry, GameResult } from '@/types/game';

interface ShortsCreatorProps {
  song: Song;
  score: HighscoreEntry;
  gameResult?: GameResult;
  audioUrl?: string;
  onClose?: () => void;
}

type VideoStyle = 'neon' | 'retro' | 'minimal' | 'gradient';

const VIDEO_STYLES: { id: VideoStyle; name: string; bg: string; accent: string }[] = [
  { id: 'neon', name: 'Neon', bg: '#0a0a0a', accent: '#00ffff' },
  { id: 'retro', name: 'Retro', bg: '#1a0a2e', accent: '#ff00ff' },
  { id: 'minimal', name: 'Minimal', bg: '#ffffff', accent: '#000000' },
  { id: 'gradient', name: 'Gradient', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', accent: '#ffffff' },
];

type CameraPosition = 'pip-top-right' | 'pip-top-left' | 'pip-bottom-right' | 'pip-bottom-left' | 'fullscreen' | 'none';

const CAMERA_POSITIONS: { id: CameraPosition; name: string }[] = [
  { id: 'pip-top-right', name: 'Top Right' },
  { id: 'pip-top-left', name: 'Top Left' },
  { id: 'pip-bottom-right', name: 'Bottom Right' },
  { id: 'pip-bottom-left', name: 'Bottom Left' },
  { id: 'fullscreen', name: 'Full Screen' },
  { id: 'none', name: 'No Camera' },
];

export function ShortsCreator({ song, score, gameResult, audioUrl, onClose }: ShortsCreatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

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

  const styleConfig = VIDEO_STYLES.find(s => s.id === style) || VIDEO_STYLES[0];

  // Request mobile camera from companion app
  const requestMobileCamera = useCallback(async () => {
    setIsRequestingMobileCamera(true);
    try {
      // Signal to mobile app to start camera
      await fetch('/api/mobile?action=requestCameraStart', { method: 'POST' });
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

  // Draw frame on canvas
  const drawFrame = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    if (styleConfig.bg.startsWith('linear-gradient')) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = styleConfig.bg;
    }
    ctx.fillRect(0, 0, width, height);

    // Animated background particles
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(timestamp / 1000 + i) * 0.5 + 0.5) * width;
      const y = (Math.cos(timestamp / 800 + i * 2) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 20 + Math.sin(timestamp / 500 + i) * 10, 0, Math.PI * 2);
      ctx.fillStyle = styleConfig.accent;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw camera feed (PiP or fullscreen)
    if (hasCamera && cameraPosition !== 'none' && cameraVideoRef.current) {
      const camVideo = cameraVideoRef.current;
      
      if (cameraPosition === 'fullscreen') {
        // Full screen camera with overlay
        ctx.globalAlpha = 0.9;
        ctx.drawImage(camVideo, 0, 0, width, height);
        ctx.globalAlpha = 1;
        
        // Dark overlay for text readability
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, height - 300, width, 300);
      } else {
        // Picture-in-Picture
        const pipWidth = 280;
        const pipHeight = 500;
        const margin = 20;
        
        let pipX = margin;
        let pipY = margin;
        
        switch (cameraPosition) {
          case 'pip-top-right':
            pipX = width - pipWidth - margin;
            break;
          case 'pip-bottom-left':
            pipY = height - pipHeight - margin;
            break;
          case 'pip-bottom-right':
            pipX = width - pipWidth - margin;
            pipY = height - pipHeight - margin;
            break;
        }
        
        // PiP border
        ctx.fillStyle = styleConfig.accent;
        ctx.beginPath();
        ctx.roundRect(pipX - 4, pipY - 4, pipWidth + 8, pipHeight + 8, 20);
        ctx.fill();
        
        // PiP video
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pipX, pipY, pipWidth, pipHeight, 16);
        ctx.clip();
        ctx.drawImage(camVideo, pipX, pipY, pipWidth, pipHeight);
        ctx.restore();
      }
    }

    // Score circle (skip if fullscreen camera)
    if (cameraPosition !== 'fullscreen') {
      const scoreScale = 1 + Math.sin(timestamp / 200) * 0.05;
      ctx.save();
      ctx.translate(width / 2, height / 3);
      ctx.scale(scoreScale, scoreScale);
      
      // Outer ring
      ctx.strokeStyle = styleConfig.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.stroke();
      
      // Score text
      ctx.fillStyle = styleConfig.accent;
      ctx.font = 'bold 80px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(score.score.toLocaleString(), 0, 0);
      
      ctx.restore();
    } else {
      // Smaller score for fullscreen camera mode
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(score.score.toLocaleString(), width / 2, height - 200);
    }

    // Song title
    ctx.fillStyle = style === 'minimal' ? '#000000' : '#ffffff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    
    const titleY = cameraPosition === 'fullscreen' ? height - 140 : height / 2 + 60;
    ctx.fillText(song.title.substring(0, 20), width / 2, titleY);
    
    ctx.fillStyle = style === 'minimal' ? '#666666' : '#aaaaaa';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText(song.artist.substring(0, 25), width / 2, titleY + 40);

    // Stats bar
    const statsY = cameraPosition === 'fullscreen' ? height - 80 : height / 2 + 160;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = style === 'minimal' ? '#000000' : '#ffffff';
    
    ctx.textAlign = 'left';
    ctx.fillText(`🎯 ${score.accuracy.toFixed(1)}%`, width / 4, statsY);
    ctx.fillText(`⚡ ${score.maxCombo}x`, width / 2, statsY);
    ctx.textAlign = 'right';
    ctx.fillText(score.difficulty.toUpperCase(), (width * 3) / 4, statsY);

    // Rating badge
    const ratingColors: Record<string, string> = {
      perfect: '#ffd700',
      excellent: '#00ff88',
      good: '#00d9ff',
      okay: '#a0a0a0',
      poor: '#ff4444',
    };
    ctx.fillStyle = ratingColors[score.rating] || styleConfig.accent;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.rating.toUpperCase() + '!', width / 2, cameraPosition === 'fullscreen' ? height - 30 : height - 100);

    // App branding
    ctx.fillStyle = style === 'minimal' ? '#cccccc' : '#ffffff66';
    ctx.font = '20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Karaoke Successor', width / 2, cameraPosition === 'fullscreen' ? 30 : height - 40);

    // Progress bar (during recording)
    if (isRecording && duration > 0 && recordingStartTime > 0) {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      const progressPercent = Math.min(elapsed / duration, 1);
      
      ctx.fillStyle = style === 'minimal' ? '#00000033' : '#ffffff33';
      ctx.fillRect(0, height - 8, width, 8);
      ctx.fillStyle = styleConfig.accent;
      ctx.fillRect(0, height - 8, width * progressPercent, 8);
      
      setProgress(progressPercent * 100);
    }
  }, [song, score, style, styleConfig, cameraPosition, hasCamera, isRecording, duration, recordingStartTime]);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = (timestamp: number) => {
      drawFrame(timestamp);
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [drawFrame]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

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
    if (!recordedBlob) return;

    const link = document.createElement('a');
    link.href = recordedUrl!;
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

  return (
    <div className="space-y-4">
      {/* Canvas Preview */}
      <div className="relative mx-auto" style={{ maxWidth: 360 }}>
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          className="w-full rounded-xl border border-white/10"
          style={{ aspectRatio: '9/16' }}
        />
        
        {/* Hidden camera video element */}
        <video
          ref={cameraVideoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">REC</span>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      {!recordedBlob && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              📹 Camera
              {hasCamera && <Badge className="bg-green-500/30 text-green-400">Active</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Camera Source */}
            <div className="flex gap-2">
              {!hasCamera ? (
                <>
                  <Button 
                    onClick={startLocalCamera}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
                  >
                    📱 Use Device Camera
                  </Button>
                  <Button 
                    onClick={requestMobileCamera}
                    size="sm"
                    variant="outline"
                    className="flex-1 border-white/20 text-white"
                    disabled={isRequestingMobileCamera}
                  >
                    {isRequestingMobileCamera ? 'Connecting...' : '📲 Mobile Camera'}
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={stopCamera} size="sm" variant="outline" className="flex-1 border-white/20 text-white">
                    Turn Off
                  </Button>
                </>
              )}
            </div>
            
            {cameraError && (
              <p className="text-xs text-red-400">{cameraError}</p>
            )}
            
            {/* Camera Position */}
            {hasCamera && (
              <div className="space-y-2">
                <label className="text-xs text-white/60">Position</label>
                <div className="flex gap-1 flex-wrap">
                  {CAMERA_POSITIONS.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => setCameraPosition(pos.id)}
                      className={`px-2 py-1 rounded text-xs transition-all ${
                        cameraPosition === pos.id
                          ? 'bg-cyan-500 text-black'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {pos.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duration Slider */}
      {!recordedBlob && (
        <div className="space-y-2">
          <label className="text-white/60 text-sm">Duration: {duration}s</label>
          <Slider
            value={[duration]}
            onValueChange={([v]) => setDuration(v)}
            min={5}
            max={60}
            step={5}
            className="w-full"
          />
        </div>
      )}

      {/* Style Selection */}
      {!recordedBlob && (
        <div className="space-y-2">
          <label className="text-white/60 text-sm">Style</label>
          <div className="flex gap-2 flex-wrap">
            {VIDEO_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  style === s.id
                    ? 'ring-2 ring-cyan-500 bg-white/10'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progress */}
      {isRecording && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/60">
            <span>Recording...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!recordedBlob && !isRecording && (
          <Button 
            onClick={startRecording}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400"
          >
            🔴 Record ({duration}s)
          </Button>
        )}
        
        {isRecording && (
          <Button 
            onClick={stopRecording}
            className="flex-1 bg-white/10 text-white"
          >
            ⏹️ Stop
          </Button>
        )}

        {recordedBlob && (
          <>
            <Button onClick={resetRecording} variant="outline" className="border-white/20 text-white">
              🔄 New
            </Button>
            <Button onClick={downloadVideo} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500">
              📥 Download
            </Button>
            <Button onClick={shareVideo} variant="outline" className="flex-1 border-white/20 text-white">
              📤 Share
            </Button>
          </>
        )}
      </div>

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
