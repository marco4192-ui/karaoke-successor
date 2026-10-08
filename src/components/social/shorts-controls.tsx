'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from '@/lib/i18n/translations';
import { VIDEO_STYLES, CAMERA_POSITIONS, type VideoStyle, type CameraPosition } from './shorts-types';

/** R44/5.7: shared pressed-state feedback for every interactive element in
 *  the ShareBox area (transform feedback on :active + quick transition). */
const PRESSED = 'active:scale-95 transition-all duration-150';

// ---------------------------------------------------------------------------
// CameraControls – camera source buttons + position selector
//
// R44/5.4: BOTH source buttons ("Use device camera" / "Mobile camera") render
// in a NEUTRAL style — no more pink gradient that looked pre-selected. ONLY
// the ACTIVE source gets a tint: local camera = pink, mobile camera = cyan,
// each with a ● live dot / ✓ indicator. Clicking the active button toggles it
// off (replaces the former separate turn-off/disconnect row → compact).
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
  /** R44: slim single-row layout for the ShareBox (no nested Card bloat). */
  compact?: boolean;
  /** R60/4: Companion-Share-Overlay — blendet die „📲 Mobile Camera”-
   *  Option aus (der Desktop-Flow, der eine COMPANION-Kamera anfragt, ist
   *  auf dem Handy selbst sinnlos — dort ist „Use Device Camera” die
   *  lokale Kamera). */
  hideMobileCameraOption?: boolean;
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
  compact,
  hideMobileCameraOption,
}: CameraControlsProps) {
  const { t } = useTranslation();

  const cameraPositionLabel = (pos: CameraPosition) =>
    t(`shortsCreator.cameraPosition${pos.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`);

  // Neutral by default — ONLY the active source is tinted (R44/5.4)
  const localBtnClass = hasCamera
    ? 'border-pink-500/60 bg-pink-500/15 text-pink-300 hover:bg-pink-500/25'
    : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20';
  const mobileBtnClass = mobileCameraConnected
    ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
    : 'border-white/10 bg-white/10 text-white/70 hover:bg-white/20';

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3 p-3 rounded-xl bg-white/5 border border-white/10'}>
      {/* Camera source — both buttons always visible; active = tinted + dot */}
      <div className="flex gap-1.5">
        <Button
          onClick={hasCamera ? onStopCamera : onStartLocalCamera}
          size="sm"
          variant="outline"
          aria-pressed={hasCamera}
          title={hasCamera ? t('shortsCreator.turnOff') : undefined}
          className={`flex-1 min-w-0 text-xs ${PRESSED} ${localBtnClass}`}
        >
          {hasCamera && (
            <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shrink-0" aria-hidden />
          )}
          <span className="truncate">{t('shortsCreator.useDeviceCamera')}</span>
          {hasCamera && <span className="ml-1.5 shrink-0" aria-hidden>✓</span>}
        </Button>
        {!hideMobileCameraOption && (
          <Button
            onClick={mobileCameraConnected ? () => onSetMobileCameraConnected(false) : onRequestMobileCamera}
            size="sm"
            variant="outline"
            disabled={isRequestingMobileCamera}
            aria-pressed={mobileCameraConnected}
            title={mobileCameraConnected ? t('shortsCreator.disconnectMobile') : undefined}
            className={`flex-1 min-w-0 text-xs ${PRESSED} ${mobileBtnClass}`}
          >
            {mobileCameraConnected && (
              <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" aria-hidden />
            )}
            <span className="truncate">
              {isRequestingMobileCamera ? t('shortsCreator.connecting') : t('shortsCreator.mobileCamera')}
            </span>
            {mobileCameraConnected && <span className="ml-1.5 shrink-0" aria-hidden>✓</span>}
          </Button>
        )}
      </div>

      {cameraError && (
        <p className="text-[11px] text-red-400 leading-snug">{cameraError}</p>
      )}

      {/* Camera position chips (only while a local camera feed is active) */}
      {hasCamera && (
        <div className="flex gap-1 flex-wrap items-center">
          <span className={`text-white/50 mr-0.5 shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {t('shortsCreator.position')}:
          </span>
          {CAMERA_POSITIONS.map((pos) => (
            <button
              key={pos.id}
              onClick={() => onSetCameraPosition(pos.id)}
              aria-pressed={cameraPosition === pos.id}
              className={`${compact ? 'px-2 py-0.5 rounded-full text-[10px]' : 'px-2 py-1 rounded text-xs'} ${PRESSED} ${
                cameraPosition === pos.id
                  ? 'bg-cyan-500 text-black font-medium'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {cameraPositionLabel(pos.id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StyleSelector – visual-theme picker chips
// ---------------------------------------------------------------------------

interface StyleSelectorProps {
  style: VideoStyle;
  onSetStyle: (style: VideoStyle) => void;
  /** R44: condensed single-row chips for the ShareBox. */
  compact?: boolean;
}

export function StyleSelector({ style, onSetStyle, compact }: StyleSelectorProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-white/50 shrink-0">{t('shortsCreator.style')}:</span>
        {VIDEO_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSetStyle(s.id)}
            aria-pressed={style === s.id}
            className={`px-2 py-0.5 rounded-full text-[11px] ${PRESSED} ${
              style === s.id
                ? 'ring-1 ring-cyan-500 bg-cyan-500/15 text-cyan-300 font-medium'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-white/60 text-sm">{t('shortsCreator.style')}</label>
      <div className="flex gap-2 flex-wrap">
        {VIDEO_STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSetStyle(s.id)}
            aria-pressed={style === s.id}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${PRESSED} ${
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
  /** R44: condensed single row (label + slider side by side). */
  compact?: boolean;
}

export function DurationSlider({ duration, onSetDuration, compact }: DurationSliderProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/50 shrink-0">
          {t('shortsCreator.duration').replace('{n}', String(duration))}
        </span>
        <Slider
          value={[duration]}
          onValueChange={([v]) => onSetDuration(v)}
          min={5}
          max={60}
          step={5}
          className="flex-1"
        />
      </div>
    );
  }

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
  compact?: boolean;
}

export function RecordingProgress({ progress, compact }: RecordingProgressProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px] text-white/60">
          <span>{t('shortsCreator.recording')}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

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
  compact?: boolean;
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
  compact,
}: RecordingActionsProps) {
  const { t } = useTranslation();
  const size = compact ? 'sm' : 'default';

  return (
    <div className="flex gap-2">
      {!hasRecording && !isRecording && (
        <Button
          onClick={onStartRecording}
          size={size}
          className={`flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 ${PRESSED}`}
        >
          {t('shortsCreator.record').replace('{n}', String(duration))}
        </Button>
      )}

      {isRecording && (
        <Button
          onClick={onStopRecording}
          size={size}
          className={`flex-1 bg-white/10 text-white hover:bg-white/20 ${PRESSED}`}
        >
          {t('shortsCreator.stop')}
        </Button>
      )}

      {hasRecording && (
        <>
          <Button
            onClick={onResetRecording}
            size={size}
            variant="outline"
            className={`border-white/20 text-white hover:bg-white/10 ${PRESSED}`}
          >
            {t('shortsCreator.new')}
          </Button>
          <Button
            onClick={onDownloadVideo}
            size={size}
            className={`flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 ${PRESSED}`}
          >
            {t('shortsCreator.download')}
          </Button>
          <Button
            onClick={onShareVideo}
            size={size}
            variant="outline"
            className={`flex-1 border-white/20 text-white hover:bg-white/10 ${PRESSED}`}
          >
            {t('shortsCreator.share')}
          </Button>
        </>
      )}
    </div>
  );
}
