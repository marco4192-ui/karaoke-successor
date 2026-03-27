'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useShortsCreator } from './use-shorts-creator';
import { drawShortsFrame } from './shorts-canvas-renderer';
import { ShortsCreatorProps, VIDEO_STYLES, CAMERA_POSITIONS } from './types';

export function ShortsCreator({ song, score, gameResult, audioUrl, onClose }: ShortsCreatorProps) {
  const {
    canvasRef,
    videoRef,
    cameraVideoRef,
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
    setDuration,
    setStyle,
    setCameraPosition,
    setProgress,
    requestMobileCamera,
    startLocalCamera,
    stopCamera,
    startRecording,
    stopRecording,
    downloadVideo,
    shareVideo,
    resetRecording,
  } = useShortsCreator(song, score, audioUrl);

  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      
      if (canvas && ctx) {
        drawShortsFrame(
          ctx,
          canvas,
          timestamp,
          song,
          score,
          style,
          styleConfig,
          cameraPosition,
          hasCamera,
          cameraVideoRef.current,
          isRecording,
          duration,
          recordingStartTime,
          setProgress
        );
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [song, score, style, styleConfig, cameraPosition, hasCamera, isRecording, duration, recordingStartTime, canvasRef, cameraVideoRef, setProgress]);

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
