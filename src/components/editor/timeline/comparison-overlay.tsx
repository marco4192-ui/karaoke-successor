'use client';

/**
 * MIDI/KAR comparison overlay (3.5) — ghost reference notes.
 *
 * - ComparisonLayer: hollow, dashed outline blocks in the SAME coordinate
 *   space as NoteBlock (beat → x via the current song's bpm/gap, pitch → y),
 *   pointer-events-none and painted BELOW the real notes, per pitch lane.
 *   Pure editor state — never serialized, never exported.
 * - ComparisonLegend: the non-blocking legend chip (pointer-events-none
 *   except the ✕ clear button, which removes the reference entirely).
 *
 * Both were inline JSX of the Timeline component before the R2 refactor;
 * markup and coordinate math are unchanged.
 */
import React from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { X } from 'lucide-react';
import type { PitchLane, TimelineComparisonNote } from './timeline-types';
import { LEFT_GUTTER } from './timeline-constants';

interface ComparisonLayerProps {
  comparisonNotes: Array<TimelineComparisonNote>;
  /** Lane whose pitch window filters/scales the ghost blocks. */
  lane: PitchLane;
  /** GAP of the current song (beat 0 anchor, ms). */
  gap: number;
  /** Milliseconds per beat of the current song (15000/BPM). */
  detailBeatDuration: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  /** Full viewport width (cull check for off-screen blocks). */
  viewportWidth: number;
}

export function ComparisonLayer({
  comparisonNotes,
  lane,
  gap,
  detailBeatDuration,
  pixelsPerSecond,
  scrollOffset,
  viewportWidth,
}: ComparisonLayerProps) {
  return (
    <div
      className="absolute inset-0 ml-8 pointer-events-none"
      aria-hidden
      data-testid="editor-comparison-layer"
    >
      {comparisonNotes
        .filter(cn => cn.pitch >= lane.minPitch && cn.pitch <= lane.maxPitch)
        .map((cn, i) => {
          // Inverse of the export formula: beat n sits at GAP + n·15000/BPM
          const startMs = gap + cn.beat * detailBeatDuration;
          const startX = (startMs / 1000) * pixelsPerSecond - scrollOffset;
          const width = Math.max(6, (cn.lengthBeats * detailBeatDuration / 1000) * pixelsPerSecond);
          const blockHeight = Math.min(lane.pitchHeight - 1, Math.round(lane.pitchHeight * 0.96) + 4);
          // 2px vertical offset keeps overlaps with real notes readable
          const y = (lane.maxPitch - cn.pitch) * lane.pitchHeight + (lane.pitchHeight - blockHeight) / 2 + 2;
          if (startX + width < 0 || startX > viewportWidth) return null;
          return (
            <div
              key={`cmp-${i}`}
              className="absolute rounded border-2 border-dashed border-amber-500/70 bg-amber-500/5 opacity-60"
              style={{
                left: `${startX}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${blockHeight}px`,
              }}
            />
          );
        })}
    </div>
  );
}

interface ComparisonLegendProps {
  /** Remove the comparison reference entirely (✕ in the chip). */
  onClearComparison?: () => void;
}

export function ComparisonLegend({ onClearComparison }: ComparisonLegendProps) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute z-30 flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-md border border-amber-400/50 bg-amber-500/15 text-amber-300 text-[10px] font-semibold tracking-wide backdrop-blur-sm pointer-events-none"
      style={{ top: 4, left: LEFT_GUTTER + 8 }}
      data-testid="editor-comparison-legend"
    >
      <span
        className="w-3.5 h-2 rounded-sm border border-dashed border-amber-400/80 bg-amber-500/10"
        aria-hidden
      />
      {t('editor.midiImport.comparisonLegend')}
      {onClearComparison && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClearComparison();
          }}
          className="pointer-events-auto p-0.5 rounded hover:bg-amber-500/30 text-amber-300 transition-colors"
          title={t('editor.midiImport.comparisonClear')}
          aria-label={t('editor.midiImport.comparisonClear')}
          data-testid="editor-comparison-clear"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
