'use client';

/**
 * Timeline toolbar (transport bar) — play/pause, skip, time slider, playback
 * rates, duet-split toggle, beat-snap magnet and the zoom controls.
 * Extracted verbatim from the Timeline component's JSX (R2 refactor); the
 * two inline state calls (setDuetSplit / zoom handlers) became the
 * onToggleDuetSplit / onZoom* props with identical behaviour.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, ZoomIn, ZoomOut, RotateCcw, SkipBack, SkipForward, Gauge, Magnet, Columns2 } from 'lucide-react';
import { EDITOR_PLAYBACK_RATES } from '@/hooks/use-editor-playback';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from '@/lib/i18n/translations';
import { MIN_ZOOM, MAX_ZOOM } from './timeline-constants';
import { formatTime } from './timeline-utils';

interface TimelineToolbarProps {
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  playbackRate: number;
  onPlaybackRateChange?: (_rate: number) => void;
  onTimeChange: (_time: number) => void;
  onPlayPause: () => void;
  /** Duet/trio/quartet notes exist → show the split-view toggle. */
  hasPlayerNotes: boolean;
  /** Split view active (both vocal tracks on separate pitch ladders). */
  duetSplit: boolean;
  /** Toggle the split view (was inline setDuetSplit(prev => !prev)). */
  onToggleDuetSplit: () => void;
  snapEnabled: boolean;
  onToggleSnap?: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export function TimelineToolbar({
  currentTime,
  totalDuration,
  isPlaying,
  playbackRate,
  onPlaybackRateChange,
  onTimeChange,
  onPlayPause,
  hasPlayerNotes,
  duetSplit,
  onToggleDuetSplit,
  snapEnabled,
  onToggleSnap,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: TimelineToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-900 border-b border-slate-700">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onTimeChange(0)}
        className="text-slate-400 hover:text-white"
      >
        <SkipBack className="w-4 h-4" />
      </Button>

      <Button
        size="sm"
        variant="default"
        onClick={onPlayPause}
        className={cn(
          'w-10 h-10 rounded-full',
          isPlaying ? 'bg-purple-600 hover:bg-purple-700' : 'bg-cyan-600 hover:bg-cyan-700'
        )}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        onClick={() => onTimeChange(totalDuration)}
        className="text-slate-400 hover:text-white"
      >
        <SkipForward className="w-4 h-4" />
      </Button>

      <div className="flex-1 flex items-center gap-2 px-4">
        <span className="text-cyan-400 font-mono text-sm min-w-[80px]">
          {formatTime(currentTime)}
        </span>
        <Slider
          value={[currentTime]}
          max={totalDuration}
          step={100}
          onValueChange={([value]) => onTimeChange(value)}
          className="flex-1"
          hideThumb
        />
        <span className="text-slate-400 font-mono text-sm min-w-[80px]">
          {formatTime(totalDuration)}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Playback speed selector */}
        <div className="flex items-center gap-0.5 mr-1">
          <Gauge className="w-3 h-3 text-slate-500" />
          {EDITOR_PLAYBACK_RATES.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={playbackRate === value ? 'default' : 'ghost'}
              className={cn(
                'h-7 px-1.5 text-[10px]',
                playbackRate === value
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'text-slate-400 hover:text-white'
              )}
              onClick={() => onPlaybackRateChange?.(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <span className="text-slate-600 text-xs mx-1">|</span>

        {/* Duet split view — both vocal tracks on separate pitch ladders */}
        {hasPlayerNotes && (
          <Button
            size="sm"
            variant={duetSplit ? 'default' : 'ghost'}
            onClick={onToggleDuetSplit}
            title={t('editor.timeline.duetSplit')}
            aria-pressed={duetSplit}
            data-testid="editor-duet-split-toggle"
            className={duetSplit
              ? 'bg-purple-600 hover:bg-purple-700 text-white'
              : 'text-slate-400 hover:text-white'}
          >
            <Columns2 className="w-4 h-4" />
          </Button>
        )}

        {/* Beat snap toggle (magnet) */}
        {onToggleSnap && (
          <Button
            size="sm"
            variant={snapEnabled ? 'default' : 'ghost'}
            onClick={onToggleSnap}
            title={t('editor.timeline.snap')}
            className={snapEnabled
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
              : 'text-slate-400 hover:text-white'}
            data-testid="editor-snap-toggle"
          >
            <Magnet className="w-4 h-4" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={onZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="text-slate-400 hover:text-white"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-slate-400 text-xs min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="text-slate-400 hover:text-white"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onZoomReset}
          className="text-slate-400 hover:text-white"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
