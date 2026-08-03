import React from 'react';
import { Note, LyricLine } from '@/types/game';

// Note shape style type
export type NoteShapeStyle = 'rounded' | 'sharp' | 'pill' | 'music-note' | 'star' | 'circle' | 'hexagon' | 'triangle';

// Note display style type
export type NoteDisplayStyle = 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity' | 'hit-fill' | 'tick-fill-singstar' | 'trail-effect' | 'retro-bars' | 'particle-fade';

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

// ---- Note shape configuration (shared between NoteBlock and NoteLane) ----

interface NoteShapeConfig {
  style: React.CSSProperties;
  /** Active-class for standard note blocks */
  activeClass: string;
  /** Active-class for the lane (larger ring/offset) */
  laneActiveClass: string;
  /** Override for lane-specific borderRadius (if any) */
  laneBorderRadius?: string;
}

const NOTE_SHAPE_CONFIGS: Record<NoteShapeStyle, NoteShapeConfig> = {
  sharp: {
    style: {
      clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/80 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-125',
  },
  pill: {
    style: {
      borderRadius: '9999px',
      border: 'none',
      transition: 'border-radius 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/60 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-110',
  },
  'music-note': {
    style: {
      clipPath: 'polygon(0% 35%, 5% 15%, 15% 0%, 25% 0%, 30% 15%, 30% 35%, 100% 20%, 100% 35%, 30% 50%, 30% 65%, 25% 100%, 15% 100%, 5% 85%, 0% 65%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'brightness-110',
    laneActiveClass: 'brightness-110',
  },
  star: {
    style: {
      clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      transition: 'clip-path 0.3s ease',
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5)) drop-shadow(0 1px 0 rgba(255,255,255,0.08))',
    },
    activeClass: 'brightness-125',
    laneActiveClass: 'brightness-125',
  },
  circle: {
    style: {
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)',
      transition: 'clip-path 0.3s ease',
      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.15))',
    },
    activeClass: 'ring-2 ring-white/70 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-110',
  },
  hexagon: {
    style: {
      clipPath: 'polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/80 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-125',
  },
  triangle: {
    style: {
      clipPath: 'polygon(0% 50%, 25% 0%, 100% 0%, 100% 100%, 25% 100%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'brightness-110',
    laneActiveClass: 'brightness-125',
  },
  rounded: {
    style: {
      borderRadius: '10px',
      border: '1.5px solid rgba(255,255,255,0.25)',
      boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.22), 0 3px 6px rgba(0,0,0,0.3)',
      transition: 'border-radius 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/80 brightness-125',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-125',
    laneBorderRadius: '14px',
  },
};

/**
 * Get note shape classes based on theme setting.
 * Used by NoteBlock (game screen notes).
 */
export function getNoteShapeClasses(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  const cfg = NOTE_SHAPE_CONFIGS[noteStyle] ?? NOTE_SHAPE_CONFIGS.rounded;
  return { baseClass: '', activeClass: cfg.activeClass, style: { ...cfg.style } };
}

/**
 * Get note shape classes for the note lane (active notes with larger ring/offset).
 */
export function getNoteShapeClassesForLane(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  const cfg = NOTE_SHAPE_CONFIGS[noteStyle] ?? NOTE_SHAPE_CONFIGS.rounded;
  const style: React.CSSProperties = { ...cfg.style };
  if (cfg.laneBorderRadius) style.borderRadius = cfg.laneBorderRadius;
  return { baseClass: '', activeClass: cfg.laneActiveClass, style };
}

/**
 * Get note display style classes based on display mode
 * Controls how notes are visually rendered (fill-level, color-feedback, glow-intensity)
 * Each mode provides a clearly distinct and visually appealing effect.
 */
export function getNoteDisplayStyleClasses(
  displayStyle: NoteDisplayStyle,
  accuracy: number = 1, // 0-1, how accurate the player is
  isGolden: boolean = false,
  isBonus: boolean = false,
  performanceSamples?: Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>,
  targetPitch?: number,
  pitchStats?: PitchStats,
  visibleTop?: number,
  visibleRange?: number,
): {
  additionalClasses: string;
  inlineStyle: React.CSSProperties;
  overlayElement: React.ReactNode | null;
} {
  switch (displayStyle) {
    case 'fill-level': {
      // Fill-level: The note is an empty shell (dark outline) that fills
      // from left to right based on singing accuracy. Clear color difference
      // between filled (bright color) and unfilled (dark) portions.
      const fillColor = isGolden
        ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.9), rgba(251, 191, 36, 0.6))'
        : isBonus
          ? 'linear-gradient(90deg, rgba(236, 72, 153, 0.9), rgba(236, 72, 153, 0.6))'
          : 'linear-gradient(90deg, rgba(34, 211, 238, 0.9), rgba(59, 130, 246, 0.6))';
      // NOTE: Do NOT add 'relative' here — it would override the
      // NoteBlock's 'absolute' positioning, causing notes to wander
      // vertically. 'absolute' already establishes a containing block
      // for the child overlay divs, so 'relative' is not needed.
      return {
        additionalClasses: 'overflow-hidden',
        // Override the Tailwind gradient background to show empty shell.
        // backgroundImage: 'none' clears the Tailwind bg-gradient, while
        // backgroundColor sets the dark shell base. A visible border makes
        // the empty shell clearly distinguishable from the background.
        inlineStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(120, 160, 200, 0.08) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.18)',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.22), 0 3px 6px rgba(0,0,0,0.3)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        },
        overlayElement: (
          <>
            {/* Bright fill overlay — fills from left to right */}
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${accuracy * 100}%`,
                background: fillColor,
                transition: 'width 50ms linear',
                borderTopLeftRadius: 'inherit',
                borderBottomLeftRadius: 'inherit',
              }}
            />
          </>
        )
      };
    }

    case 'color-feedback': {
      // Color-feedback: Note background color shifts from red→orange→yellow→green
      // based on accuracy. Provides immediate visual scoring feedback.
      let bgColor: string;
      let borderColor: string;
      if (accuracy > 0.85) {
        bgColor = 'linear-gradient(90deg, #22c55e, #4ade80)'; // green
        borderColor = 'rgba(34,197,94,0.8)';
      } else if (accuracy > 0.6) {
        bgColor = 'linear-gradient(90deg, #eab308, #facc15)'; // yellow
        borderColor = 'rgba(234,179,8,0.8)';
      } else if (accuracy > 0.35) {
        bgColor = 'linear-gradient(90deg, #f97316, #fb923c)'; // orange
        borderColor = 'rgba(249,115,22,0.8)';
      } else {
        bgColor = 'linear-gradient(90deg, #ef4444, #f87171)'; // red
        borderColor = 'rgba(239,68,68,0.8)';
      }
      // Keep golden/bonus colors for special notes
      const finalBg = isGolden
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : isBonus
          ? 'linear-gradient(90deg, #ec4899, #f472b6)'
          : bgColor;
      return {
        additionalClasses: 'transition-all duration-50 ease-linear',
        inlineStyle: {
          background: finalBg,
          boxShadow: `0 0 12px ${borderColor}, inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.3)`,
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        },
        overlayElement: null
      };
    }

    case 'glow-intensity': {
      // Glow-intensity: Notes start very pale/dim and glow brighter as the player
      // sings accurately. accuracy=0 → barely visible, accuracy=1 → vivid glow.
      const glowIntensity = 0.05 + accuracy * 0.95;
      const glowSpread1 = 2 + accuracy * 30;
      const glowSpread2 = 4 + accuracy * 60;
      const glowColor = isGolden
        ? `rgba(251, 191, 36, ${glowIntensity})`
        : isBonus
          ? `rgba(236, 72, 153, ${glowIntensity})`
          : `rgba(34, 211, 238, ${glowIntensity})`;
      // Inner glow only kicks in at higher accuracy for a satisfying reveal
      const innerGlow = accuracy > 0.4
        ? `inset 0 0 ${4 + accuracy * 16}px rgba(255,255,255,${accuracy * 0.3})`
        : 'none';
      const emptyShadow = accuracy < 0.3
        ? ', inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 6px rgba(0,0,0,0.3)'
        : '';
      return {
        additionalClasses: 'transition-all duration-50 ease-linear',
        inlineStyle: {
          boxShadow: `${innerGlow}, 0 0 ${glowSpread1}px ${glowColor}, 0 0 ${glowSpread2}px ${glowColor}${emptyShadow}`,
          filter: `brightness(${0.5 + accuracy * 0.5}) drop-shadow(0 2px 3px rgba(0,0,0,0.35))`,
        },
        overlayElement: null
      };
    }

    case 'hit-fill': {
      // Hit-fill: Segmented bar where each beat shows hit (filled) or miss (empty)
      const samples = performanceSamples || [];
      const segmentCount = Math.max(4, Math.min(12, samples.length || 4));
      const hitColor = isGolden
        ? 'rgba(251, 191, 36, 0.95)'
        : isBonus
          ? 'rgba(236, 72, 153, 0.95)'
          : 'rgba(34, 211, 238, 0.95)';
      const missColor = 'rgba(255, 255, 255, 0.08)';

      // Build segments: map samples to segments
      const segments: Array<{ hit: boolean }> = [];
      for (let i = 0; i < segmentCount; i++) {
        // Check if any sample in this segment's time range was a hit
        const segmentHit = samples.length > 0
          ? samples.some((s, idx) => {
              // Distribute samples across segments
              const segStart = (i / segmentCount) * samples.length;
              const segEnd = ((i + 1) / segmentCount) * samples.length;
              return idx >= segStart && idx < segEnd && s.hit;
            })
          : false;
        segments.push({ hit: segmentHit });
      }

      const hitRatio = segments.filter(s => s.hit).length / segments.length;

      return {
        additionalClasses: 'overflow-hidden',
        inlineStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(120, 160, 200, 0.06) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.15)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: hitRatio > 0.5
            ? `0 0 ${6 + hitRatio * 8}px rgba(34, 211, 238, ${hitRatio * 0.4}), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2)`
            : 'inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.25)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        },
        overlayElement: (
          <div className="absolute inset-y-0 left-0 right-0 flex" style={{ gap: '1px', padding: '2px' }}>
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="flex-1 rounded-sm"
                style={{
                  backgroundColor: seg.hit ? hitColor : missColor,
                  transition: 'background-color 50ms linear',
                }}
              />
            ))}
          </div>
        )
      };
    }

    case 'trail-effect': {
      // Trail-effect: A directional gradient that creates a "comet tail" effect.
      // The right edge (closest to sing line) is bright, fading to transparent
      // toward the left (already-passed portion). Intensity scales with accuracy.
      const trailColor = isGolden
        ? 'rgba(251, 191, 36, '
        : isBonus
          ? 'rgba(236, 72, 153, '
          : 'rgba(34, 211, 238, ';
      const trailAlpha = Math.max(0.05, accuracy);
      return {
        additionalClasses: 'overflow-hidden',
        inlineStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(120, 160, 200, 0.06) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.15)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.25)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        },
        overlayElement: (
          <div
            className="absolute inset-y-0 left-0 right-0"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${trailColor}${trailAlpha * 0.2}) 40%, ${trailColor}${trailAlpha * 0.6}) 70%, ${trailColor}${trailAlpha * 0.95}) 100%)`,
              transition: 'background 50ms linear',
            }}
          />
        )
      };
    }

    case 'retro-bars': {
      // Retro-bars: A vertical bar meter (like an arcade health bar) at the
      // bottom of the note. Fills from bottom to top based on accuracy.
      // Segmented for a classic retro look.
      const barColor = isGolden
        ? '#fbbf24'
        : isBonus
          ? '#ec4899'
          : '#22d3ee';
      const barSegments = 5;
      const filledSegments = Math.round(accuracy * barSegments);
      return {
        additionalClasses: 'overflow-hidden',
        inlineStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(120, 160, 200, 0.06) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.15)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          boxShadow: accuracy > 0.6
            ? `0 0 8px ${barColor}40, inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.25)`
            : 'inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.25)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        },
        overlayElement: (
          <div className="absolute bottom-0 left-0 right-0 flex gap-px" style={{ padding: '2px', height: '100%' }}>
            {Array.from({ length: barSegments }).map((_, idx) => {
              const segFill = idx >= (barSegments - filledSegments);
              return (
                <div
                  key={idx}
                  className="flex-1 rounded-sm"
                  style={{
                    backgroundColor: segFill ? barColor : 'rgba(255, 255, 255, 0.06)',
                    transition: 'background-color 50ms linear',
                  }}
                />
              );
            })}
          </div>
        )
      };
    }

    case 'particle-fade': {
      // Particle-fade: Hit notes dissolve into floating particles.
      // As accuracy increases, particles appear brighter and more opaque.
      // Past notes with hits get a dissolving effect via reduced opacity + scale.
      const particleColor = isGolden
        ? 'rgba(251, 191, 36, '
        : isBonus
          ? 'rgba(236, 72, 153, '
          : 'rgba(34, 211, 238, ';
      const alpha = 0.1 + accuracy * 0.9;
      // Generate deterministic particle positions using accuracy as seed
      const particleCount = Math.floor(3 + accuracy * 5);
      const particles = Array.from({ length: particleCount }).map((_, i) => {
        const left = ((i * 37 + 13) % 90) + 5; // Pseudo-random distribution
        const top = ((i * 53 + 7) % 70) + 15;
        const size = 2 + ((i * 19) % 4);
        const delay = (i * 0.15) % 1;
        return { left, top, size, delay };
      });
      return {
        additionalClasses: accuracy > 0.15 ? 'overflow-hidden' : '',
        inlineStyle: {
          background: accuracy > 0.1
            ? `linear-gradient(90deg, ${particleColor}${alpha * 0.3}), ${particleColor}${alpha * 0.8}))`
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(120, 160, 200, 0.06) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.15)',
          opacity: accuracy > 0.1 ? 0.7 + accuracy * 0.3 : 0.45,
          filter: accuracy > 0.7
            ? `blur(${Math.max(0, (1 - accuracy) * 2)}px) drop-shadow(0 1px 2px rgba(0,0,0,0.3))`
            : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2), 0 3px 5px rgba(0,0,0,0.25)',
        },
        overlayElement: accuracy > 0.1 ? (
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  width: `${p.size + 2}px`,
                  height: `${p.size + 2}px`,
                  backgroundColor: `${particleColor}${alpha * 0.9})`,
                  boxShadow: `0 0 ${p.size * 3}px ${particleColor}${alpha * 0.6})`,
                  animation: `particleFade ${0.6 + accuracy * 0.8}s ease-out ${p.delay}s infinite alternate`,
                  opacity: Math.min(1, accuracy + 0.3),
                }}
              />
            ))}
          </div>
        ) : null
      };
    }

    case 'tick-fill-singstar': {
      // Singstar-style tick fill: Each visual tick is a segment that fills
      // when hit (color-coded by accuracy) or stays empty when missed.
      // Missed ticks with a recorded sungPitch show a small indicator dot
      // offset vertically to show WHERE the singer actually was.
      //
      // With high-rate visual sampling (~50ms intervals), we now get
      // 8-20 samples per typical note, giving smooth real-time filling.
      const samples = performanceSamples || [];

      // Segment count based on note duration (50ms per tick), clamped to
      // a readable range. This ensures consistent segment density across
      // different note lengths, independent of how many samples have arrived.
      // NOTE_DURATION is NOT directly available here, so we derive it from
      // the number of 50ms-interval samples. With the new visual sampler,
      // samples arrive at ~50ms intervals, so samples.length * 50 ≈ duration.
      // We use the larger of: actual sample count, or a minimum based on
      // a reasonable assumption (4 segments minimum for any visible note).
      const segmentCount = Math.max(4, Math.min(24, samples.length));

      const hitColorPerfect = isGolden ? '#fbbf24' : isBonus ? '#f472b6' : '#34d399';
      const hitColorGreat = isGolden ? '#f59e0b' : isBonus ? '#ec4899' : '#22d3ee';
      const hitColorGood = isGolden ? '#d97706' : isBonus ? '#db2777' : '#3b82f6';
      const hitColorOkay = isGolden ? '#92400e' : isBonus ? '#9d174d' : '#6366f1';
      const missColor = 'rgba(255, 255, 255, 0.05)';
      const missBorder = 'rgba(255, 255, 255, 0.10)';

      // Map samples to segments: distribute samples evenly across segments.
      // With high-rate sampling, we often have more samples than segments.
      // Each segment aggregates the samples that fall within its time slice.
      const segData: Array<{
        hit: boolean;
        accuracy: number;
        displayType: string;
        sungPitch: number | null;
      }> = [];
      for (let i = 0; i < segmentCount; i++) {
        // Calculate which samples belong to this segment
        const segStart = (i / segmentCount) * samples.length;
        const segEnd = ((i + 1) / segmentCount) * samples.length;
        const segSamples = samples.slice(Math.floor(segStart), Math.ceil(segEnd));

        if (segSamples.length === 0) {
          segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: null });
          continue;
        }

        // Aggregate: if ANY sample in this segment was a hit, the segment shows as hit.
        // Use the best accuracy in the segment for the color.
        // For missed segments, record the last sung pitch for deviation dots.
        const bestHit = segSamples.reduce((best, s) => s.hit && s.accuracy > best.accuracy ? s : best, segSamples[0]);
        const anyHit = segSamples.some(s => s.hit);
        const lastSung = segSamples[segSamples.length - 1];

        if (anyHit) {
          let dt: string = 'Okay';
          if (bestHit.accuracy > 0.95) dt = 'Perfect';
          else if (bestHit.accuracy > 0.8) dt = 'Great';
          else if (bestHit.accuracy > 0.6) dt = 'Good';
          segData.push({ hit: true, accuracy: bestHit.accuracy, displayType: dt, sungPitch: null });
        } else {
          segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: lastSung.sungPitch ?? null });
        }
      }

      const hitRatio = segData.filter(s => s.hit).length / segData.length;
      const hasHits = hitRatio > 0;

      // Calculate deviation dots for missed segments that have a recorded sung pitch.
      // These dots appear OUTSIDE the note at the actual pitch height the singer
      // produced, showing how far off they were.
      const deviationDots: Array<{ segmentIndex: number; yOffset: number; color: string }> = [];
      if (targetPitch !== undefined && pitchStats && visibleTop !== undefined && visibleRange !== undefined) {
        const pr = pitchStats.pitchRange || 1;
        for (let si = 0; si < segData.length; si++) {
          const seg = segData[si];
          if (!seg.hit && seg.sungPitch !== null) {
            // Octave-wrapped difference (same as evaluateTick uses)
            let rawDiff = Math.abs(seg.sungPitch - targetPitch) % 12;
            if (rawDiff > 6) rawDiff = 12 - rawDiff;
            // Convert semitone diff to pixel offset.
            // Each semitone spans (visibleRange / pr) percent of the container.
            const pxPerSemitone = (visibleRange / pr) * 0.5; // 0.5 = scale down for subtlety
            const yDiff = (seg.sungPitch > targetPitch ? -1 : 1) * rawDiff * pxPerSemitone;
            // Clamp to prevent extreme offsets
            const clampedY = Math.max(-32, Math.min(32, yDiff));
            // Color: red if far off (>2 st), orange if moderate (>1 st), yellow if close
            const color = rawDiff > 2
              ? 'rgba(239, 68, 68, 0.85)'
              : rawDiff > 1
                ? 'rgba(249, 115, 22, 0.8)'
                : 'rgba(234, 179, 8, 0.75)';
            deviationDots.push({ segmentIndex: si, yOffset: clampedY, color });
          }
        }
      }

      // Compute glow based on overall hit ratio
      const glowColor = isGolden ? 'rgba(251, 191, 36,' : isBonus ? 'rgba(236, 72, 153,' : 'rgba(34, 211, 238,';

      return {
        additionalClasses: 'overflow-visible',
        inlineStyle: {
          backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(120, 160, 200, 0.04) 100%)',
          backgroundColor: 'rgba(100, 130, 160, 0.12)',
          border: '1.5px solid rgba(255, 255, 255, 0.16)',
          boxShadow: hasHits
            ? `0 0 ${4 + hitRatio * 10}px ${glowColor}${hitRatio * 0.35}), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18)`
            : 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.2)',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
        },
        overlayElement: (
          <>
            {/* Tick segments */}
            <div className="absolute inset-y-0 left-0 right-0 flex" style={{ gap: '1px', padding: '2px 3px' }}>
              {segData.map((seg, idx) => {
                let bgColor: string;
                if (!seg.hit) {
                  bgColor = missColor;
                } else {
                  switch (seg.displayType) {
                    case 'Perfect': bgColor = hitColorPerfect; break;
                    case 'Great': bgColor = hitColorGreat; break;
                    case 'Good': bgColor = hitColorGood; break;
                    default: bgColor = hitColorOkay;
                  }
                }
                const borderCol = seg.hit ? 'transparent' : missBorder;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-sm"
                    style={{
                      backgroundColor: bgColor,
                      border: `1px solid ${borderCol}`,
                      transition: 'background-color 40ms linear, border-color 40ms linear',
                    }}
                  />
                );
              })}
            </div>
            {/* Deviation dots for missed ticks — shows where the singer actually was */}
            {deviationDots.length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
                {deviationDots.map((dot) => {
                  const segWidth = 100 / segData.length;
                  const centerX = segWidth * dot.segmentIndex + segWidth / 2;
                  return (
                    <div
                      key={`dot-${dot.segmentIndex}`}
                      className="absolute rounded-full"
                      style={{
                        left: `${centerX}%`,
                        top: '50%',
                        width: '5px',
                        height: '5px',
                        transform: `translate(-50%, calc(-50% + ${dot.yOffset}px))`,
                        backgroundColor: dot.color,
                        boxShadow: `0 0 3px ${dot.color}`,
                        opacity: 0.85,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        ),
      };
    }

    case 'classic':
    default:
      return {
        additionalClasses: '',
        inlineStyle: {},
        overlayElement: null
      };
  }
}

/**
 * Calculate note background classes based on note type
 */
export function getNoteBackgroundClasses(isGolden: boolean, isBonus: boolean): string {
  if (isGolden) {
    return 'bg-gradient-to-r from-yellow-400 to-orange-500';
  }
  if (isBonus) {
    return 'bg-gradient-to-r from-pink-500 to-purple-500';
  }
  return 'bg-gradient-to-r from-cyan-500 to-blue-500';
}

/**
 * Calculate note box shadow based on active state and type
 */
export function getNoteBoxShadow(isActive: boolean, isGolden: boolean): string {
  if (!isActive) return 'none';
  if (isGolden) {
    return '0 0 30px rgba(251, 191, 36, 0.7)';
  }
  return '0 0 25px rgba(34, 211, 238, 0.7)';
}

/**
 * Calculate vertical position for a pitch value
 */
export function calculatePitchY(pitch: number, windowHeight: number): number {
  const pitchOffset = pitch - BASE_PITCH;
  return windowHeight - ((pitchOffset / PITCH_RANGE) * windowHeight);
}

/**
 * Note position data for rendering
 */
export interface NotePositionData {
  noteId: string;
  x: number;
  width: number;
  pitchY: number;
  isActive: boolean;
  isPast: boolean;
  lyric: string;
  isGolden: boolean;
  isBonus: boolean;
}

/**
 * Pitch statistics for display range calculation
 */
export interface PitchStats {
  minPitch: number;
  maxPitch: number;
  pitchRange: number;
}

/**
 * Default pitch stats (fallback when no notes available)
 */
const DEFAULT_PITCH_STATS: PitchStats = {
  minPitch: 48,
  maxPitch: 72,
  pitchRange: 24,
};

/**
 * Calculate pitch range statistics from an array of notes
 * Used to determine the vertical display range for note highway
 * 
 * @param notes - Array of notes with pitch property
 * @param padding - Semitones to add as padding (default: 2)
 * @returns PitchStats with minPitch, maxPitch, and pitchRange
 */
export function calculatePitchStats(
  notes: Array<{ pitch: number }> | null | undefined,
  padding: number = 2
): PitchStats {
  if (!notes || notes.length === 0) {
    return DEFAULT_PITCH_STATS;
  }
  
  let minPitch = Infinity;
  let maxPitch = -Infinity;
  
  for (const note of notes) {
    minPitch = Math.min(minPitch, note.pitch);
    maxPitch = Math.max(maxPitch, note.pitch);
  }
  
  // Add padding and clamp to valid MIDI range (0-127)
  const paddedMin = Math.max(0, minPitch - padding);
  const paddedMax = Math.min(127, maxPitch + padding);
  
  return {
    minPitch: paddedMin,
    maxPitch: paddedMax,
    pitchRange: Math.max(12, paddedMax - paddedMin), // At least 1 octave
  };
}

// Game display constants — defined once, outside any component
export const SING_LINE_POSITION = 20; // percentage from left (like UltraStar/Vocaluxe)
export const NOTE_WINDOW = 4000; // Fixed 4 second window for upcoming notes
export const VISIBLE_TOP = 8; // percentage from top (padding for header)
const VISIBLE_BOTTOM = 85; // percentage from bottom (padding for lyrics)
export const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

/**
 * Get visible notes within a time window using binary search.
 * Extracted from game-screen.tsx to eliminate triple code duplication.
 *
 * @param notes - Pre-sorted array of notes (sorted by startTime)
 * @param currentTime - Current playback time in ms
 * @param noteWindow - Time window in ms to look ahead
 * @returns Filtered array of notes visible in the current window
 */
export function getVisibleNotes(
  notes: Array<Note & { lineIndex: number; line: LyricLine }> | undefined | null,
  currentTime: number,
  noteWindow: number
): Array<Note & { lineIndex: number; line: LyricLine }> {
  if (!notes || notes.length === 0) return [];

  // Binary search look-behind: must be large enough to include notes whose
  // START is far in the past but whose BODY (duration) still extends on-screen.
  // A note's right-edge position is: singLinePos + (noteEnd - t) / noteWindow * 100.
  // We keep notes until their right edge passes the -30% render cull, which
  // requires noteEnd > t - 2000.  For a note with duration D, startTime > t - 2000 - D.
  // We use 20 s as a safe upper bound so the binary search never skips a visible note.
  // The actual data filtering happens in the loop below (filterWindowStart).
  const searchWindowStart = currentTime - 20000;

  // Data filter: notes are removed 5 s after their end, which places their
  // right edge well past the left screen edge. 5 s post-end ensures even
  // very long ballad notes (which may extend far left of the sing line)
  // are fully visible until they exit the screen.
  const filterWindowStart = currentTime - 5000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

  // Binary search to find the first note that could be visible
  let startIdx = 0;
  let endIdx = notes.length - 1;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (notes[midIdx].startTime < searchWindowStart) {
      startIdx = midIdx + 1;
    } else {
      endIdx = midIdx - 1;
    }
  }

  // Collect visible notes from the starting point
  for (let i = startIdx; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.startTime + note.duration;

    if (note.startTime > windowEnd) break;
    if (noteEnd >= filterWindowStart) {
      result.push(note);
    }
  }

  return result;
}
