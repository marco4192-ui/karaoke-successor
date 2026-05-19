'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { VIDEO_STYLES, CAMERA_POSITIONS, type VideoStyle, type CameraPosition } from './shorts-types';

// ---------------------------------------------------------------------------
// CameraControls – camera source buttons + position selector
// ---------------------------------------------------------------------------

interface CameraControlsProps {
  hasCamera: boolean;
  mobileCameraConnected: boolean;
  isRequestingMobileCamera: boolean;
  cameraError: string | null;
  cameraPosition: CameraPosition;
  onStartLocalCamera: () => void;
  onRequestMobileCamera: () => void;
  onStopCamera: () => void;
  onSetCameraPosition: (pos: CameraPosition) => void;
  onSetMobileCameraConnected: (connected: boolean) => void;
}

export function CameraControls({
  hasCamera,
  mobileCameraConnected,
  isRequestingMobileCamera,
  cameraError,
  cameraPosition,
  onStartLocalCamera,
  onRequestMobileCamera,
  onStopCamera,
  onSetCameraPosition,
  onSetMobileCameraConnected,
}: CameraControlsProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {t('shortsCreator.camera')}
          {hasCamera && <Badge className="bg-green-500/30 text-green-400">{t('shortsCreator.active')}</Badge>}
          {mobileCameraConnected && <Badge className="bg-blue-500/30 text-blue-400">{t('shortsCreator.mobileConnected')}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Camera Source */}
        <div className="flex gap-2">
          {!hasCamera ? (
            <>
              <Button
                onClick={onStartLocalCamera}
                size="sm"
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
              >
                {t('shortsCreator.useDeviceCamera')}
              </Button>
              <Button
                onClick={onRequestMobileCamera}
                size="sm"
                variant="outline"
                className="flex-1 border-white/20 text-white"
                disabled={isRequestingMobileCamera}
              >
                {isRequestingMobileCamera ? t('shortsCreator.connecting') : t('shortsCreator.mobileCamera')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onStopCamera} size="sm" variant="outline" className="flex-1 border-white/20 text-white">
                {t('shortsCreator.turnOff')}
              </Button>
              {!mobileCameraConnected && (
                <Button
                  onClick={onRequestMobileCamera}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/20 text-white"
                  disabled={isRequestingMobileCamera}
                >
                  {isRequestingMobileCamera ? t('shortsCreator.connecting') : t('shortsCreator.mobileCamera')}
                </Button>
              )}
              {mobileCameraConnected && (
                <Button
                  onClick={() => onSetMobileCameraConnected(false)}
                  size="sm"
                  variant="outline"
                  className="flex-1 border-red-500/30 text-red-400"
                >
                  {t('shortsCreator.disconnectMobile')}
                </Button>
              )}
            </>
          )}
        </div>

        {cameraError && (
          <p className="text-xs text-red-400">{cameraError}</p>
        )}

        {/* Camera Position */}
        {hasCamera && (
          <div className="space-y-2">
            <label className="text-xs text-white/60">{t('shortsCreator.position')}</label>
            <div className="flex gap-1 flex-wrap">
              {CAMERA_POSITIONS.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => onSetCameraPosition(pos.id)}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    cameraPosition === pos.id
                      ? 'bg-cyan-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {t(`shortsCreator.cameraPosition${pos.id.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StyleSelector – visual‑theme picker buttons
// ---------------------------------------------------------------------------

interface StyleSelectorProps {
  style: VideoStyle;
  onSetStyle: (style: VideoStyle) => void;
}

export function StyleSelector({ style, onSetStyle }: StyleSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-white/60 text-sm">{t('shortsCreator.style')}</label>
      <div className="flex gap-2 flex-wrap">
        {VIDEO_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSetStyle(s.id)}
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
  );
}

// ---------------------------------------------------------------------------
// DurationSlider – recording length control
// ---------------------------------------------------------------------------

interface DurationSliderProps {
  duration: number;
  onSetDuration: (duration: number) => void;
}

export function DurationSlider({ duration, onSetDuration }: DurationSliderProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-white/60 text-sm">{t('shortsCreator.duration').replace('{n}', String(duration))}</label>
      <Slider
        value={[duration]}
        onValueChange={([v]) => onSetDuration(v)}
        min={5}
        max={60}
        step={5}
        className="w-full"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordingProgress – progress bar shown while recording
// ---------------------------------------------------------------------------

interface RecordingProgressProps {
  progress: number;
}

export function RecordingProgress({ progress }: RecordingProgressProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-white/60">
        <span>{t('shortsCreator.recording')}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordingActions – record / stop / download / share / new buttons
// ---------------------------------------------------------------------------

interface RecordingActionsProps {
  hasRecording: boolean;
  isRecording: boolean;
  duration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onResetRecording: () => void;
  onDownloadVideo: () => void;
  onShareVideo: () => void;
}

export function RecordingActions({
  hasRecording,
  isRecording,
  duration,
  onStartRecording,
  onStopRecording,
  onResetRecording,
  onDownloadVideo,
  onShareVideo,
}: RecordingActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2">
      {!hasRecording && !isRecording && (
        <Button
          onClick={onStartRecording}
          className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400"
        >
          {t('shortsCreator.record').replace('{n}', String(duration))}
        </Button>
      )}

      {isRecording && (
        <Button
          onClick={onStopRecording}
          className="flex-1 bg-white/10 text-white"
        >
          {t('shortsCreator.stop')}
        </Button>
      )}

      {hasRecording && (
        <>
          <Button onClick={onResetRecording} variant="outline" className="border-white/20 text-white">
            {t('shortsCreator.new')}
          </Button>
          <Button onClick={onDownloadVideo} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500">
            {t('shortsCreator.download')}
          </Button>
          <Button onClick={onShareVideo} variant="outline" className="flex-1 border-white/20 text-white">
            {t('shortsCreator.share')}
          </Button>
        </>
      )}
    </div>
  );
}
