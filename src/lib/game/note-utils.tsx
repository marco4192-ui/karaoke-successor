import React from 'react';
import { Note, LyricLine } from '@/types/game';

// Note shape style type
export type NoteShapeStyle = 'rounded' | 'sharp' | 'pill' | 'music-note' | 'star' | 'circle' | 'hexagon' | 'triangle';

// Note display style type
export type NoteDisplayStyle = 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity' | 'hit-fill' | 'trail-effect' | 'retro-bars' | 'particle-fade';

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
      clipPath: 'polygon(0% 25%, 8% 0%, 25% 0%, 25% 22%, 100% 22%, 100% 78%, 25% 78%, 25% 100%, 8% 100%, 0% 75%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'brightness-110',
    laneActiveClass: 'brightness-110',
  },
  star: {
    style: {
      clipPath: 'polygon(0% 40%, 10% 40%, 15% 15%, 20% 40%, 45% 40%, 50% 5%, 55% 40%, 80% 40%, 85% 15%, 90% 40%, 100% 40%, 100% 60%, 90% 60%, 85% 85%, 80% 60%, 55% 60%, 50% 95%, 45% 60%, 20% 60%, 15% 85%, 10% 60%, 0% 60%)',
      transition: 'clip-path 0.3s ease',
      filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5)) drop-shadow(0 1px 0 rgba(255,255,255,0.08))',
    },
    activeClass: 'brightness-125',
    laneActiveClass: 'brightness-125',
  },
  circle: {
    style: {
      borderRadius: '50%',
      border: '1.5px solid rgba(255,255,255,0.2)',
      transition: 'border-radius 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/70 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-110',
    laneBorderRadius: '50%',
  },
  hexagon: {
    style: {
      clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
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
  performanceSamples?: Array<{ time: number; accuracy: number; hit: boolean }>
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
export const SING_LINE_POSITION = 25; // percentage from left (like UltraStar/Vocaluxe)
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

  const windowStart = currentTime - 1000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

  // Binary search to find the first note that could be visible
  let startIdx = 0;
  let endIdx = notes.length - 1;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (notes[midIdx].startTime < windowStart) {
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
    if (noteEnd >= windowStart) {
      result.push(note);
    }
  }

  return result;
}
