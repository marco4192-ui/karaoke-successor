'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameResults } from './mobile-types';

interface MobilePhotoBoothProps {
  gameResults: GameResults | null;
  onClose: () => void;
}

type CameraState = 'loading' | 'active' | 'error' | 'unavailable' | 'denied';
type BoothPhase = 'camera' | 'preview';

function ratingToStars(rating: string): string {
  const r = rating.toLowerCase();
  if (r === 'perfect') return '⭐⭐⭐⭐⭐';
  if (r === 'excellent') return '⭐⭐⭐⭐';
  if (r === 'good') return '⭐⭐⭐';
  if (r === 'okay') return '⭐⭐';
  return '⭐';
}

function ratingColorClass(rating: string): string {
  const r = rating.toLowerCase();
  if (r === 'perfect') return 'text-yellow-400';
  if (r === 'excellent') return 'text-green-400';
  if (r === 'good') return 'text-cyan-400';
  if (r === 'okay') return 'text-gray-400';
  return 'text-red-400';
}

export function MobilePhotoBooth({ gameResults, onClose }: MobilePhotoBoothProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>('loading');
  const [boothPhase, setBoothPhase] = useState<BoothPhase>('camera');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      // Check if getUserMedia is available
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraState('unavailable');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 1920 },
          },
        });

        if (cancelled) {
          // Clean up stream if component unmounted while waiting
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraState('active');
      } catch (err) {
        if (cancelled) return;

        const error = err as DOMException;
        if (
          error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError'
        ) {
          setCameraState('denied');
        } else {
          setCameraState('unavailable');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      // Stop camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Cleanup on close
  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (capturedDataUrl) {
      URL.revokeObjectURL(capturedDataUrl);
    }
    onClose();
  }, [onClose, capturedDataUrl]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 1920;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the camera (front-facing selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Draw score card overlay at bottom
    if (gameResults) {
      const cardHeight = Math.round(canvas.height * 0.28);
      const cardY = canvas.height - cardHeight;
      const padding = Math.round(canvas.width * 0.05);

      // Semi-transparent background
      const gradient = ctx.createLinearGradient(0, cardY, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.15, 'rgba(0, 0, 0, 0.75)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, cardY, canvas.width, cardHeight);

      // Song title
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(canvas.width * 0.055)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      const maxTitleWidth = canvas.width - padding * 2;
      let titleText = gameResults.songTitle;
      if (ctx.measureText(titleText).width > maxTitleWidth) {
        while (ctx.measureText(titleText + '…').width > maxTitleWidth && titleText.length > 0) {
          titleText = titleText.slice(0, -1);
        }
        titleText += '…';
      }
      ctx.fillText(titleText, padding, cardY + padding * 1.8);

      // Artist
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${Math.round(canvas.width * 0.038)}px Arial, sans-serif`;
      ctx.fillText(gameResults.songArtist, padding, cardY + padding * 2.8);

      // Score
      ctx.fillStyle = '#22d3ee'; // cyan-400
      ctx.font = `bold ${Math.round(canvas.width * 0.09)}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(gameResults.score.toLocaleString(), padding, cardY + padding * 5);

      // Stats row
      const statsY = cardY + padding * 6.5;
      ctx.font = `${Math.round(canvas.width * 0.035)}px Arial, sans-serif`;
      ctx.fillStyle = '#ffffff';

      const accuracy = (gameResults.accuracy != null && !isNaN(gameResults.accuracy)
        ? gameResults.accuracy
        : 0).toFixed(1);
      ctx.fillText(`🎯 ${accuracy}%`, padding, statsY);
      ctx.fillText(`⚡ ${gameResults.maxCombo}x combo`, padding + canvas.width * 0.3, statsY);

      // Rating
      const rating = gameResults.rating?.toUpperCase() || '';
      if (rating) {
        ctx.fillStyle = '#facc15'; // yellow-400
        ctx.font = `bold ${Math.round(canvas.width * 0.045)}px Arial, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`${rating}!`, canvas.width - padding, cardY + padding * 5);
      }

      // Stars
      const stars = ratingToStars(gameResults.rating || '');
      ctx.font = `${Math.round(canvas.width * 0.055)}px Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(stars, canvas.width - padding, cardY + padding * 2);

      // #KaraokeEleven watermark
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = `bold ${Math.round(canvas.width * 0.03)}px Arial, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('#KaraokeEleven', canvas.width - padding, cardY + padding * 7.5);

      ctx.textAlign = 'left';
    }

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedDataUrl(dataUrl);
    setBoothPhase('preview');
  }, [gameResults]);

  const handleRetake = useCallback(() => {
    if (capturedDataUrl) {
      URL.revokeObjectURL(capturedDataUrl);
      setCapturedDataUrl(null);
    }
    setBoothPhase('camera');
  }, [capturedDataUrl]);

  const handleSave = useCallback(() => {
    if (!capturedDataUrl) return;

    const link = document.createElement('a');
    link.download = `karaoke-selfie-${Date.now()}.png`;
    link.href = capturedDataUrl;
    link.click();
  }, [capturedDataUrl]);

  const handleShare = useCallback(async () => {
    if (!capturedDataUrl) return;

    try {
      const response = await fetch(capturedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'karaoke-selfie.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: gameResults
            ? `${t('mobilePhotoBooth.title')} — ${gameResults.songTitle}`
            : t('mobilePhotoBooth.title'),
          text: gameResults
            ? `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}"! #KaraokeEleven`
            : '#KaraokeEleven',
          files: [file],
        });
      } else {
        // Fallback to download
        handleSave();
      }
    } catch (err) {
      // User cancelled or share not supported — fall back to save
      handleSave();
    }
  }, [capturedDataUrl, gameResults, t, handleSave]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 text-white text-xl backdrop-blur-sm"
        aria-label="Close"
      >
        ✕
      </button>

      {/* No results state */}
      {!gameResults && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center text-white/60 px-6">
            <span className="text-5xl mb-4 block">📸</span>
            <p className="text-lg">{t('mobilePhotoBooth.noResults')}</p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-white text-sm"
            >
              {t('mobileViews.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Camera error states */}
      {cameraState === 'denied' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center text-white/60 px-6 max-w-xs">
            <span className="text-5xl mb-4 block">📷</span>
            <p className="text-lg font-medium text-red-400">
              {t('mobilePhotoBooth.cameraError')}
            </p>
            <p className="text-sm mt-2">
              Please allow camera access in your browser settings and try again.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-white text-sm"
            >
              {t('mobileViews.cancel')}
            </button>
          </div>
        </div>
      )}

      {cameraState === 'unavailable' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center text-white/60 px-6 max-w-xs">
            <span className="text-5xl mb-4 block">📵</span>
            <p className="text-lg font-medium text-yellow-400">
              {t('mobilePhotoBooth.cameraUnavailable')}
            </p>
            <p className="text-sm mt-2">
              Your device doesn&apos;t support camera access.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-white text-sm"
            >
              {t('mobileViews.cancel')}
            </button>
          </div>
        </div>
      )}

      {cameraState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <div className="text-center text-white/60">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {/* Camera phase */}
      {boothPhase === 'camera' && cameraState === 'active' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover -scale-x-100"
          />

          {/* Score card overlay at bottom */}
          {gameResults && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="bg-gradient-to-t from-black/85 via-black/70 to-transparent pt-16 pb-4 px-5">
                {/* Song info */}
                <p className="text-white/60 text-xs mb-0.5">
                  {t('mobileViews.youJustPlayed')}
                </p>
                <h2 className="text-white text-lg font-bold truncate">
                  {gameResults.songTitle}
                </h2>
                <p className="text-white/50 text-sm truncate">
                  {gameResults.songArtist}
                </p>

                {/* Score and stats */}
                <div className="flex items-end justify-between mt-3">
                  <div>
                    <p className="text-cyan-400 text-3xl font-bold">
                      {gameResults.score.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-xs">
                      {t('mobileViews.score')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg">
                      {ratingToStars(gameResults.rating || '')}
                    </p>
                    <p className={`text-sm font-bold uppercase ${ratingColorClass(gameResults.rating || '')}`}>
                      {gameResults.rating || ''}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 mt-2 text-xs text-white/70">
                  <span>
                    🎯 {(gameResults.accuracy != null && !isNaN(gameResults.accuracy)
                      ? gameResults.accuracy
                      : 0).toFixed(1)}%
                  </span>
                  <span>⚡ {gameResults.maxCombo}x</span>
                  <span className="ml-auto text-white/30 text-[10px]">
                    #KaraokeEleven
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Capture button */}
          <div className="absolute bottom-44 left-1/2 -translate-x-1/2 z-10">
            <button
              onClick={handleCapture}
              className="w-18 h-18 rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/50 active:scale-95 transition-transform"
              style={{ width: '4.5rem', height: '4.5rem' }}
              aria-label={t('mobilePhotoBooth.capture')}
            >
              <div
                className="w-16 h-16 rounded-full border-[3px] border-gray-300 flex items-center justify-center"
                style={{ width: '4rem', height: '4rem' }}
              >
                <div className="w-14 h-14 rounded-full bg-white" style={{ width: '3.5rem', height: '3.5rem' }} />
              </div>
            </button>
          </div>
        </>
      )}

      {/* Preview phase */}
      {boothPhase === 'preview' && capturedDataUrl && (
        <>
          <img
            src={capturedDataUrl}
            alt="Selfie with score"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Controls at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent pt-12 pb-6 px-5">
            {/* Retake */}
            <button
              onClick={handleRetake}
              className="w-full mb-3 py-3 rounded-xl bg-white/15 text-white font-medium text-base backdrop-blur-sm active:bg-white/25 transition-colors"
            >
              🔄 {t('mobilePhotoBooth.retake')}
            </button>

            {/* Save and Share */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold text-base active:opacity-80 transition-opacity"
              >
                💾 {t('mobilePhotoBooth.save')}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 py-3 rounded-xl bg-white/15 text-white font-bold text-base backdrop-blur-sm active:bg-white/25 transition-colors"
              >
                📤 {t('mobilePhotoBooth.share')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
