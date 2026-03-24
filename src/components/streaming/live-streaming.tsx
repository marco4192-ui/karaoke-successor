'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface LiveStreamingProps {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  gameCanvas?: HTMLCanvasElement | null;
  audioStream?: MediaStream | null;
}

export type StreamingPlatform = 'twitch' | 'youtube' | 'tiktok' | 'facebook' | 'custom';

interface PlatformInfo {
  id: StreamingPlatform;
  name: string;
  icon: string;
  color: string;
  serverUrl: string;
  requiresKey: boolean;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'twitch',
    name: 'Twitch',
    icon: '📺',
    color: '#9146FF',
    serverUrl: 'rtmps://live.twitch.tv/app',
    requiresKey: true,
  },
  {
    id: 'youtube',
    name: 'YouTube Live',
    icon: '▶️',
    color: '#FF0000',
    serverUrl: 'rtmp://a.rtmp.youtube.com/live2',
    requiresKey: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok LIVE',
    icon: '🎵',
    color: '#00F2EA',
    serverUrl: 'rtmp://push.tiktok.com/live',
    requiresKey: true,
  },
  {
    id: 'facebook',
    name: 'Facebook Live',
    icon: '📘',
    color: '#1877F2',
    serverUrl: 'rtmps://live-api-s.facebook.com:443/rtmp',
    requiresKey: true,
  },
  {
    id: 'custom',
    name: 'Custom RTMP',
    icon: '🔌',
    color: '#6B7280',
    serverUrl: '',
    requiresKey: true,
  },
];

export function LiveStreamingPanel({ onStreamStart, onStreamEnd, gameCanvas, audioStream }: LiveStreamingProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<StreamingPlatform>('twitch');
  const [streamKey, setStreamKey] = useState('');
  const [customServerUrl, setCustomServerUrl] = useState('');
  const [streamTitle, setStreamTitle] = useState('Karaoke Session');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [gameAudioEnabled, setGameAudioEnabled] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const platform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraEnabled(true);
    } catch {
      setError('Could not access camera');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraEnabled(false);
  }, []);

  // Create combined stream with game, camera, and audio
  const createCombinedStream = useCallback(async () => {
    const tracks: MediaStreamTrack[] = [];
    
    // Game canvas video
    if (gameCanvas) {
      const canvasStream = gameCanvas.captureStream(30);
      tracks.push(...canvasStream.getVideoTracks());
    }
    
    // Camera video (overlay)
    if (cameraEnabled && cameraStreamRef.current && !gameCanvas) {
      tracks.push(...cameraStreamRef.current.getVideoTracks());
    }
    
    // Audio tracks
    if (audioStream && gameAudioEnabled) {
      tracks.push(...audioStream.getAudioTracks());
    }
    
    // Microphone audio
    if (micEnabled) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tracks.push(...micStream.getAudioTracks());
      } catch {
        console.log('Microphone not available for streaming');
      }
    }
    
    return new MediaStream(tracks);
  }, [gameCanvas, audioStream, cameraEnabled, gameAudioEnabled, micEnabled]);

  // Start streaming
  const startStream = useCallback(async () => {
    if (!streamKey && platform.requiresKey) {
      setError('Stream key is required');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Create combined media stream
      const stream = await createCombinedStream();
      combinedStreamRef.current = stream;
      
      // Simulate stream start (real RTMP requires server-side component)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create MediaRecorder for local recording/streaming simulation
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 6000000,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      
      setIsStreaming(true);
      setIsConnecting(false);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);
      
      onStreamStart?.();
      
      // Store stream config
      localStorage.setItem('lastStreamConfig', JSON.stringify({
        platform: selectedPlatform,
        streamKey,
        streamTitle,
        customServerUrl,
      }));
      
    } catch {
      setError('Failed to start stream. Please check your devices.');
      setIsConnecting(false);
    }
  }, [streamKey, platform.requiresKey, createCombinedStream, selectedPlatform, streamTitle, customServerUrl, onStreamStart]);

  // Stop streaming
  const stopStream = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsStreaming(false);
    setStreamDuration(0);
    onStreamEnd?.();
  }, [onStreamEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      stopCamera();
    };
  }, [stopStream, stopCamera]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎬 Live Streaming
          {isStreaming && (
            <Badge className="bg-red-500 animate-pulse">
              LIVE {formatDuration(streamDuration)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Stream your karaoke session to popular platforms</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Selection */}
        <div className="space-y-2">
          <label className="text-sm text-white/60">Platform</label>
          <div className="grid grid-cols-5 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => !isStreaming && setSelectedPlatform(p.id)}
                disabled={isStreaming}
                className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                  selectedPlatform === p.id
                    ? 'ring-2 ring-offset-2 ring-offset-gray-900'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: `${p.color}20`,
                  border: selectedPlatform === p.id ? `2px solid ${p.color}` : 'none',
                }}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="text-xs text-white/80">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stream Settings */}
        {!isStreaming && (
          <>
            <div className="space-y-2">
              <label className="text-sm text-white/60">Stream Title</label>
              <Input
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="My Karaoke Session"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/60">Stream Key</label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter your stream key..."
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-white/40">
                Get your stream key from {platform.name}&apos;s dashboard
              </p>
            </div>

            {selectedPlatform === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm text-white/60">RTMP Server URL</label>
                <Input
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="rtmp://your-server.com/live"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            )}
          </>
        )}

        {/* Source Controls */}
        <div className="flex gap-2 flex-wrap">
          <Badge
            className={`cursor-pointer ${cameraEnabled ? 'bg-green-500' : 'bg-white/10 border border-white/20'}`}
            onClick={() => cameraEnabled ? stopCamera() : startCamera()}
          >
            📹 Camera {cameraEnabled ? 'On' : 'Off'}
          </Badge>
          <Badge
            className={`cursor-pointer ${micEnabled ? 'bg-green-500' : 'bg-white/10 border border-white/20'}`}
            onClick={() => setMicEnabled(!micEnabled)}
          >
            🎤 Mic {micEnabled ? 'On' : 'Off'}
          </Badge>
          <Badge
            className={`cursor-pointer ${gameAudioEnabled ? 'bg-green-500' : 'bg-white/10 border border-white/20'}`}
            onClick={() => setGameAudioEnabled(!gameAudioEnabled)}
          >
            🎵 Game Audio {gameAudioEnabled ? 'On' : 'Off'}
          </Badge>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stream Actions */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <Button
              onClick={startStream}
              disabled={isConnecting || (platform.requiresKey && !streamKey)}
              className="flex-1 bg-red-500 hover:bg-red-400"
            >
              {isConnecting ? '🔄 Connecting...' : '🔴 Go Live'}
            </Button>
          ) : (
            <Button
              onClick={stopStream}
              className="flex-1 bg-white/10 text-white hover:bg-white/20"
            >
              ⏹️ End Stream
            </Button>
          )}
        </div>

        {/* Stream Info */}
        {isStreaming && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-cyan-400">{formatDuration(streamDuration)}</div>
              <div className="text-xs text-white/60">Duration</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-green-400">●</div>
              <div className="text-xs text-white/60">Status</div>
            </div>
            <div className="p-2 bg-white/5 rounded-lg">
              <div className="text-2xl">{platform.icon}</div>
              <div className="text-xs text-white/60">Platform</div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="text-xs text-white/40 bg-white/5 p-3 rounded-lg">
          <strong>💡 Note:</strong> Direct RTMP streaming from browser requires a media server.
          For production use, consider using OBS or a WebRTC-based solution.
        </div>
      </CardContent>
    </Card>
  );
}

// Quick stream button for inline use
export function QuickStreamButton({ 
  onStreamChange 
}: { 
  onStreamChange?: (isLive: boolean) => void;
}) {
  const [isLive, setIsLive] = useState(false);
  
  const toggleStream = useCallback(() => {
    const newState = !isLive;
    setIsLive(newState);
    onStreamChange?.(newState);
  }, [isLive, onStreamChange]);
  
  return (
    <Button
      onClick={toggleStream}
      className={`${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-700'} text-white`}
      size="sm"
    >
      {isLive ? '🔴 LIVE' : '🎥 Stream'}
    </Button>
  );
}
