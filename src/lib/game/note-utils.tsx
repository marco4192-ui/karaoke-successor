import React from 'react';
import { Note, LyricLine } from '@/types/game';
import { StorageKeys, getString } from '@/lib/storage';
import {
  getNoteColorProfile,
  resolveNoteColors,
  getNoteDisplayMode,
  getSealedHitColor,
  hexToRgbaPrefix,
  SEALED_GOLD_COLOR,
  SEALED_BONUS_COLOR,
  DEFAULT_SEALED_HIT_COLOR,
  EXACT_NOTE_COLORS,
} from '@/lib/game/note-color-profiles';

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

/** Convert a hex color (#rrggbb) to an rgba string with the given alpha. Non-hex colors pass through. */
function hexWithAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Which rendering pipeline a note bar uses:
 * - 'modern' (default): the user's global note display setting
 *   ('sealed' = uniform hit colour + red misses + heat-seal animation, or
 *   'exact' = fixed 5-colour quality code dunkelgrün/grün/hellgrün/gelb/orange).
 * - 'legacy': the classic quality-graduated profile rendering — reserved for
 *   modes with MORE than two simultaneous singers (Battle Royale, Medley
 *   Contest) where per-player colour coding must stay intact.
 */
export type NoteRenderMode = 'modern' | 'legacy';

/**
 * Get note display style classes based on display mode.
 * Currently only 'tick-fill-singstar' is supported — all other
 * display styles have been removed in favor of this Singstar-style
 * segmented tick rendering.
 *
 * renderMode:
 * - 'modern' (default) — honours the user's NOTE_DISPLAY_MODE setting:
 *     • 'sealed': ONE uniform hit colour (options: NOTE_SEALED_HIT_COLOR;
 *       golden notes seal in gold, bonus notes in magenta). While the
 *       singer is on pitch, the sing line acts as a LASER/BURNER head
 *       ("note-laser-head") burning colour into the note; when they
 *       miss, the beam cuts out ("Aussetzer" — a scorched dark gap) and
 *       the sung pitch shows as a red ghost mark at the singer's actual
 *       pitch, so they can see where they ARE vs. where the note is.
 *       Re-hitting re-ignites the laser with a flash and the burn
 *       continues from that point.
 *     • 'exact': same laser fill, but hits are graded with the fixed
 *       5-colour code (hellgrün Perfect / grün Great / dunkelgrün
 *       Good-Okay) and miss ghosts are gelb (≤ 1 semitone) or orange.
 * - 'legacy' — the classic profile-based quality rendering (Battle Royale /
 *   Medley Contest keep this so multi-singer colour coding stays intact).
 */
export function getNoteDisplayStyleClasses(
  _displayStyle: string,
  _accuracy: number = 1,
  isGolden: boolean = false,
  isBonus: boolean = false,
  performanceSamples?: Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null; playerColor?: string }>,
  targetPitch?: number,
  pitchStats?: PitchStats,
  visibleTop?: number,
  visibleRange?: number,
  /** 0-1: fraction of the note the singline has passed (left-to-right fill) */
  fillFraction: number = 1,
  /** Note start time in ms (for time-based segment mapping) */
  noteStartTime?: number,
  /** Note duration in ms (for time-based segment mapping) */
  noteDuration?: number,
  /** Container height in px (for exact ghost-bar pitch positioning) */
  containerHeight?: number,
  /** Optional per-singer tint (Medley): pre-colors the unsung note track in the singer's color */
  playerTint?: string,
  /** Rendering pipeline: 'modern' (sealed/exact setting) or 'legacy' (BR / Medley) */
  renderMode: NoteRenderMode = 'modern',
): {
  additionalClasses: string;
  inlineStyle: React.CSSProperties;
  overlayElement: React.ReactNode | null;
  /** Optional past-note opacity hint (sealed mode dims missed notes less aggressively) */
  pastOpacity?: number;
} {
  // Singstar-style tick fill: The note fills from LEFT to RIGHT like a
  // progress bar as the singline passes over it. Only the portion the
  // singline has already passed shows hit/miss colours; the rest remains
  // as a dim "unreached" track. This prevents the confusing "rolling"
  // effect where segments appeared to shift as new samples arrived.
  //
  // Time-based segment mapping: each segment covers a fixed time slice
  // of the note (~50 ms). Adding new samples for later time slices no
  // longer shifts earlier segments, eliminating flicker.
  //
  // Missed ticks create a GAP in the note bar, and a pale "ghost bar"
  // appears at the actual sung pitch (above or below) so the singer
  // sees where they are vs. where they need to be.

  const samples = performanceSamples || [];
  const clampedFill = Math.max(0, Math.min(1, fillFraction));

  // Segment count: one per ~50 ms of note duration, clamped 4-24
  const segCount = noteDuration
    ? Math.max(4, Math.min(24, Math.round(noteDuration / 50)))
    : Math.max(4, Math.min(24, samples.length));
  const segDur = (noteDuration ?? 0) / segCount;
  const nStart = noteStartTime ?? 0;

  // ── Laser / burner state ───────────────────────────────────────
  // While the singer is ON pitch the sing line burns colour into the
  // note like a laser head. When they miss, the beam cuts out
  // (Aussetzer); when they hit again it re-ignites with a flash.
  // currentTime is reconstructed exactly from the fill fraction.
  const approxNow = nStart + clampedFill * (noteDuration ?? 0);
  let lastSample: { time: number; hit: boolean; sungPitch: number | null } | null = null;
  for (const s of samples) {
    if (s.time <= approxNow + 1) lastSample = { time: s.time, hit: s.hit, sungPitch: s.sungPitch ?? null };
  }
  const isNoteActive = clampedFill > 0 && clampedFill < 1;
  const isBurning = isNoteActive
    && lastSample !== null
    && lastSample.hit
    && (approxNow - lastSample.time) <= 300;

  // How many segments the singline has fully passed
  const reachedFloat = clampedFill * segCount;
  const reachedCount = Math.floor(reachedFloat);
  const partialFill = reachedFloat - reachedCount;

  // ── Colour palette & display mode resolution ──────────────
  // Modern modes: 'sealed' (uniform hit colour + red misses) or 'exact'
  // (fixed 5-colour code). Legacy: profile-based quality gradations.
  const isLegacy = renderMode === 'legacy';
  const displayMode = isLegacy ? null : getNoteDisplayMode();
  const isSealed = displayMode === 'sealed';
  const isExact = displayMode === 'exact';

  const profile = getNoteColorProfile(getString(StorageKeys.NOTE_COLOR_PROFILE));
  const isSpecialNote = isGolden || isBonus;
  // Sealed: no per-quality colours at all — one uniform hit colour
  // (golden notes seal in gold, bonus notes in magenta to preserve semantics).
  const sealedHit = isSealed
    ? (isGolden ? SEALED_GOLD_COLOR : isBonus ? SEALED_BONUS_COLOR : getSealedHitColor())
    : null;
  const hitColors = sealedHit
    ? null
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.hitColors
      : resolveNoteColors(profile, isGolden, isBonus).hitColors;
  const hitGlows = sealedHit
    ? null
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.hitGlows
      : resolveNoteColors(profile, isGolden, isBonus).hitGlows;
  const glowTint = sealedHit
    ? hexToRgbaPrefix(sealedHit)
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.glowTint
      : resolveNoteColors(profile, isGolden, isBonus).glowTint;
  const missGap       = 'rgba(255, 255, 255, 0.02)';
  const missGapBorder = 'rgba(255, 255, 255, 0.05)';
  // Per-singer tint (Medley): the unsung track shows the snippet singer's
  // color so all players can sing against one clearly-owned note stream.
  const tint        = playerTint && playerTint.startsWith('#') ? playerTint : null;
  const unreachedBg = tint ? hexWithAlpha(tint, 0.22) : 'rgba(255, 255, 255, 0.08)';
  const unreachedBdr = tint ? hexWithAlpha(tint, 0.45) : 'rgba(255, 255, 255, 0.14)';
  // Sealed neutral track: modes without performance data (PTM/CPTM lanes)
  // must NOT render "missed" red — no samples simply means "no data".
  const hasAnySamples = samples.length > 0;
  const isNoteComplete = clampedFill >= 1 && hasAnySamples;

  // ── Time-based segment → sample mapping ────────────────────────
  const segData: Array<{
    hit: boolean;
    accuracy: number;
    displayType: string;
    sungPitch: number | null;
  }> = [];

  for (let i = 0; i < segCount; i++) {
    const segStart = nStart + i * segDur;
    const segEnd   = segStart + segDur;

    // Filter samples that fall into this segment's time window
    const segSamples = noteDuration !== undefined && noteDuration > 0
      ? samples.filter(s => s.time >= segStart && s.time < segEnd)
      : samples.slice(
          Math.floor((i / segCount) * samples.length),
          Math.ceil(((i + 1) / segCount) * samples.length),
        );

    if (segSamples.length === 0) {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: null });
      continue;
    }

    const bestHit = segSamples.reduce(
      (best, s) => (s.hit && s.accuracy > best.accuracy ? s : best),
      segSamples[0],
    );
    const anyHit  = segSamples.some(s => s.hit);
    const lastSung = segSamples[segSamples.length - 1];

    if (anyHit) {
      let dt = 'Okay';
      if (bestHit.accuracy > 0.95) dt = 'Perfect';
      else if (bestHit.accuracy > 0.8) dt = 'Great';
      else if (bestHit.accuracy > 0.6) dt = 'Good';
      segData.push({ hit: true, accuracy: bestHit.accuracy, displayType: dt, sungPitch: null });
    } else {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: lastSung.sungPitch ?? null });
    }
  }

  // ── Hit ratio (only reached segments) ──────────────────────────
  const reachedSegs = segData.slice(0, reachedCount);
  const hitRatio = reachedSegs.length > 0
    ? reachedSegs.filter(s => s.hit).length / reachedSegs.length
    : 0;
  const hasHits = hitRatio > 0;

  // ── Ghost marks for missed segments within the reached area ────
  // Misses are ALWAYS visible, at the pitch where they were actually
  // sung (same pitch-to-Y formula as NoteBlock) — the singer sees where
  // they ARE vs. where the note is. Consecutive missed segments with a
  // similar pitch merge into ONE continuous bar ("you were HERE for
  // this stretch") instead of confetti fragments.
  //   • sealed: ghosts are always red (miss = red, fixed)
  //   • exact:  gelb (≤ 1 semitone off) / orange (farther)
  //   • legacy: yellow / orange / vivid red by distance
  // Medley: samples may carry a playerColor — every player's missed
  // ticks then appear in THAT player's color so spectators see whose
  // wrong notes are whose.
  const ghostBars: Array<{ startIdx: number; endIdx: number; yOffset: number; color: string }> = [];
  let liveMissGhost: { leftPercent: number; yOffset: number; color: string } | null = null;
  if (targetPitch !== undefined && pitchStats && visibleTop !== undefined && visibleRange !== undefined) {
    const pr = pitchStats.pitchRange || 1;
    const cH = containerHeight || 800;

    // Pre-compute target pitch Y position (percent of container)
    const targetY = visibleTop + visibleRange - ((targetPitch - pitchStats.minPitch) / pr) * visibleRange;
    const sungYOffset = (sungPitch: number) => {
      const sungY = visibleTop + visibleRange - ((sungPitch - pitchStats.minPitch) / pr) * visibleRange;
      return ((sungY - targetY) / 100) * cH;
    };
    const missColor = (sungPitch: number) => {
      let rawDiff = Math.abs(sungPitch - targetPitch) % 12;
      if (rawDiff > 6) rawDiff = 12 - rawDiff;
      return isSealed
        ? 'rgba(255, 65, 65, 0.80)'
        : isExact
          ? (rawDiff > 1
              ? EXACT_NOTE_COLORS.farMissGhost
              : EXACT_NOTE_COLORS.nearMissGhost)
          : (rawDiff > 2
              ? 'rgba(255, 30, 30, 0.85)'
              : rawDiff > 1
                ? 'rgba(255, 120, 0, 0.80)'
                : 'rgba(255, 230, 0, 0.75)');
    };

    const hasPlayerColors = noteDuration !== undefined && noteDuration > 0
      && samples.some(s => s.playerColor);

    if (hasPlayerColors) {
      // Per-player marks: one ghost bar per (segment, player), colored in
      // the responsible player's base color, at their sung pitch.
      const perSegPlayer = new Map<string, { segIdx: number; sungPitch: number; color: string }>();
      for (const s of samples) {
        if (s.hit || s.sungPitch == null || !s.playerColor) continue;
        const segIdx = Math.floor((s.time - nStart) / segDur);
        if (segIdx < 0 || segIdx >= reachedCount || segIdx >= segCount) continue;
        perSegPlayer.set(`${segIdx}:${s.playerColor}`, { segIdx, sungPitch: s.sungPitch, color: s.playerColor });
      }
      for (const g of perSegPlayer.values()) {
        ghostBars.push({ startIdx: g.segIdx, endIdx: g.segIdx, yOffset: sungYOffset(g.sungPitch), color: g.color });
      }
    } else {
      // Include the front segment while it is being sung so the ghost
      // appears instantly (not only after the segment fully passed).
      const scanEnd = Math.min(reachedCount + (partialFill > 0 ? 1 : 0), segData.length);
      type Run = { startIdx: number; sumPitch: number; n: number; lastPitch: number };
      let run: Run | null = null;
      const flushRun = () => {
        if (!run) return;
        const meanPitch = run.sumPitch / run.n;
        ghostBars.push({
          startIdx: run.startIdx,
          endIdx: run.startIdx + run.n - 1,
          yOffset: sungYOffset(meanPitch),
          color: missColor(meanPitch),
        });
        run = null;
      };
      for (let si = 0; si < scanEnd; si++) {
        const seg = segData[si];
        if (!seg.hit && seg.sungPitch !== null) {
          // Continue the run while the pitch stays within ~1.5 semitones
          if (run && Math.abs(seg.sungPitch - run.lastPitch) <= 1.5) {
            run.sumPitch += seg.sungPitch;
            run.n++;
            run.lastPitch = seg.sungPitch;
          } else {
            flushRun();
            run = { startIdx: si, sumPitch: seg.sungPitch, n: 1, lastPitch: seg.sungPitch };
          }
        } else {
          // A hit (or silence) breaks the miss run
          flushRun();
        }
      }
      flushRun();
    }

    // ── Live "you are HERE" marker ────────────────────────────────
    // While the note is active and currently being MISSED off-pitch,
    // a pulsing dot follows the singer's pitch in real time.
    if (
      isNoteActive && !isBurning && lastSample !== null
      && !lastSample.hit && lastSample.sungPitch !== null
      && (approxNow - lastSample.time) <= 300
    ) {
      liveMissGhost = {
        leftPercent: clampedFill * 100,
        yOffset: sungYOffset(lastSample.sungPitch),
        color: isSealed ? 'rgba(255, 65, 65, 0.95)' : missColor(lastSample.sungPitch),
      };
    }
  }

  const glowColor = glowTint;

  // Type-safe render values (the null branches only occur in sealed mode,
  // where the quality palettes are never read — and vice versa).
  const sealedUniform = sealedHit ?? DEFAULT_SEALED_HIT_COLOR;
  const qualityColors = hitColors ?? EXACT_NOTE_COLORS.hitColors;
  const qualityGlows = hitGlows ?? EXACT_NOTE_COLORS.hitGlows;

  // ── Render ──────────────────────────────────────────────────────
  const sealDoneClass = isSealed && isNoteComplete ? ' note-seal-complete' : '';

  // Laser head colour: sealed → the uniform burn colour (gold/bonus/magenta
  // preserved); exact/legacy → the quality colour of the segment being burned.
  const laserColor = sealedHit
    ? sealedHit
    : (segData[Math.min(reachedCount, segData.length - 1)]?.hit
        ? qualityColors[segData[Math.min(reachedCount, segData.length - 1)].displayType as keyof typeof qualityColors] || qualityColors.Okay
        : qualityColors.Okay);

  return {
    additionalClasses: `overflow-visible${sealDoneClass}`,
    inlineStyle: {
      backgroundImage: tint
        ? `linear-gradient(135deg, ${hexWithAlpha(tint, 0.10)} 0%, ${hexWithAlpha(tint, 0.05)} 100%)`
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(120, 160, 200, 0.04) 100%)',
      backgroundColor: tint ? hexWithAlpha(tint, 0.10) : 'rgba(100, 130, 160, 0.08)',
      border: tint
        ? `1.5px solid ${hexWithAlpha(tint, 0.40)}`
        : '1.5px solid rgba(255, 255, 255, 0.16)',
      boxShadow: hasHits
        ? `0 0 ${6 + hitRatio * 14}px ${glowColor}${hitRatio * 0.5}), 0 0 ${2 + hitRatio * 6}px ${glowColor}${hitRatio * 0.3}), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.18)`
        : 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.2)',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
    },
    ...(isSealed ? { pastOpacity: hasHits ? 0.85 : 0.5 } : {}),
    overlayElement: (
      <>
        {/* Segments: unreached (dim) → reached+hit (coloured) / reached+miss (gap) */}
        <div className="absolute inset-y-0 left-0 right-0 flex" style={{ gap: '1px', padding: '2px 3px' }}>
          {segData.map((seg, idx) => {
            const isUnreached  = idx > reachedCount;
            const isAtFront    = idx === reachedCount;

            let bgColor: string;
            let borderCol: string;
            let clipPath: string | undefined;
            let segGlow: string | undefined;
            let bgImage: string | undefined;
            let animClass = '';

            if (isSealed) {
              // ── SEALED: laser/burner fill ──
              if (isUnreached || !hasAnySamples) {
                // Unreached track — or "no performance data" (PTM/CPTM lanes),
                // which must stay neutral instead of reading as "missed".
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
              } else if (seg.hit) {
                // Burned-in fill: uniform hit colour
                bgColor   = sealedUniform;
                borderCol = 'rgba(255, 255, 255, 0.30)';
                segGlow   = `0 0 8px ${hexWithAlpha(sealedUniform, 0.55)}`;
                // Freshly burned segments right behind the laser head glow
                // hotter while cooling down (only while the note is active).
                if (isNoteActive && idx >= reachedCount - 3) {
                  bgImage = `linear-gradient(90deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0) 70%), ${sealedUniform}`;
                  segGlow = `0 0 12px ${hexWithAlpha(sealedUniform, 0.8)}, inset 0 0 5px rgba(255, 255, 255, 0.30)`;
                }
              } else {
                // Aussetzer: the beam cut out — a scorched dark gap. The exact
                // pitch that was sung instead shows in the ghost mark above/
                // below the note (see ghostBars).
                bgColor   = 'rgba(140, 21, 21, 0.32)';
                borderCol = 'rgba(255, 65, 65, 0.28)';
                segGlow   = 'inset 0 1px 3px rgba(0, 0, 0, 0.35)';
              }

              if (isAtFront && partialFill > 0 && partialFill < 1) {
                clipPath = `inset(0 ${(1 - partialFill) * 100}% 0 0)`;
                if (seg.hit && isBurning) {
                  // Molten edge: the burn front sheen right under the laser head
                  bgImage = `linear-gradient(90deg, rgba(255, 255, 255, ${(0.45 + 0.35 * partialFill).toFixed(2)}) 0%, rgba(255, 255, 255, 0.10) 45%, rgba(255, 255, 255, 0) 75%)`;
                }
              } else if (isAtFront && partialFill <= 0) {
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
                segGlow   = undefined;
              }

              // Burn-in flash: fires exactly when a segment first gets
              // burned (hit) — including the re-ignition after an Aussetzer.
              if (hasAnySamples && seg.hit && (idx < reachedCount || (isAtFront && partialFill > 0))) {
                animClass = 'note-seal-seg';
              }
            } else {
              // ── EXACT / LEGACY: quality-graduated segments (gap = miss) ──
              if (isUnreached) {
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
              } else if (seg.hit) {
                bgColor   = qualityColors[seg.displayType as keyof typeof qualityColors] || qualityColors.Okay;
                borderCol = 'transparent';
                segGlow   = qualityGlows[seg.displayType as keyof typeof qualityGlows];
              } else {
                bgColor   = missGap;
                borderCol = missGapBorder;
              }

              // The segment exactly at the fill front may be partially visible
              if (isAtFront && partialFill > 0 && partialFill < 1) {
                clipPath = `inset(0 ${(1 - partialFill) * 100}% 0 0)`;
              } else if (isAtFront && partialFill <= 0) {
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
                segGlow   = undefined;
              }
            }

            return (
              <div
                key={idx}
                className={`flex-1 rounded-sm ${animClass}`}
                style={{
                  backgroundColor: bgColor,
                  backgroundImage: bgImage,
                  border: `1px solid ${borderCol}`,
                  clipPath,
                  boxShadow: segGlow,
                  transition: 'background-color 60ms linear, box-shadow 60ms linear, background-image 200ms ease-out',
                }}
              />
            );
          })}
        </div>

        {/* ── Laser / burner head ──
            Mounted exactly while the singer is ON pitch over an active
            note: a white-hot core at the sing line that burns colour
            into the note. Unmounts on a miss (Aussetzer), re-ignites
            with a flash when the hit resumes (mount animation). */}
        {isBurning && (
          <div
            className="note-laser-head"
            style={{
              left: `${clampedFill * 100}%`,
              '--laser-color': laserColor,
              '--laser-glow': hexWithAlpha(laserColor, 0.55),
            } as React.CSSProperties}
          >
            <span className="note-laser-core" />
            <span className="note-laser-spark s1" />
            <span className="note-laser-spark s2" />
            <span className="note-laser-spark s3" />
          </div>
        )}

        {/* Ghost marks: missed notes shown at the pitch where they were
            actually sung — merged into continuous runs */}
        {(ghostBars.length > 0 || liveMissGhost) && (
          <div className="absolute pointer-events-none" style={{ inset: 0, overflow: 'visible' }}>
            {ghostBars.map((bar) => {
              const segW    = 100 / segData.length;
              const span    = bar.endIdx - bar.startIdx + 1;
              const barLeft = segW * bar.startIdx + segW * 0.1;
              const barW    = segW * span - segW * 0.2;
              return (
                <div
                  key={`ghost-${bar.startIdx}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${barLeft}%`,
                    top: '50%',
                    width: `${barW}%`,
                    height: span > 1 ? '16px' : '18px',
                    transform: `translateY(-50%) translateY(${bar.yOffset}px)`,
                    backgroundColor: bar.color,
                    opacity: 0.9,
                    boxShadow: `0 0 8px ${bar.color}`,
                  }}
                />
              );
            })}

            {/* Live "you are HERE" marker: pulsing dot at the singer's
                current pitch while the note is being missed off-pitch */}
            {liveMissGhost && (
              <div
                className="note-ghost-live"
                style={{
                  left: `${liveMissGhost.leftPercent}%`,
                  top: '50%',
                  transform: `translate(-50%, -50%) translateY(${liveMissGhost.yOffset}px)`,
                  '--live-color': liveMissGhost.color,
                } as React.CSSProperties}
              >
                <span className="note-ghost-live-dot" />
              </div>
            )}
          </div>
        )}
      </>
    ),
  };
}

// ===================== MULTI-PLAYER STRIPS OVERLAY =====================

/** One player lane in the multi-player strips rendering (Medley Contest). */
export interface NoteStripPlayer {
  id: string;
  /** The player's SINGLE base color — used for unreached/hit/ghost rendering. */
  color: string;
  /** That player's performance samples for ONE note (time = absolute song ms). */
  samples: Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>;
}

/**
 * Multi-player note overlay (Medley Contest, Fix 6):
 *
 * Renders N stacked HORIZONTAL per-player strips inside ONE note bar —
 * strip i occupies the i-th vertical slice (top→bottom) — so every hit is
 * shown in the RESPONSIBLE player's single color:
 *   • unreached: player color @ 0.22 bg / 0.45 border
 *   • hit:       player color SOLID + glow (freshly burned = white sheen)
 *   • miss:      scorched dark gap (same values as the sealed Aussetzer)
 * Golden notes use the gold color for ALL players, bonus notes magenta.
 *
 * ONE shared white-hot laser head (note-laser-head class) spans the full
 * bar height while ANY player's latest sample (≤300ms) is a hit. Misses
 * additionally render ghost bars at the player's ACTUAL sung pitch (offset
 * from the target pitch line) in the PLAYER's color, merged into runs of
 * consecutive segments with similar pitch — plus a live pulsing
 * "you are HERE" dot per player currently missing off-pitch.
 *
 * @returns the overlay element (to be mounted inside the note container)
 *   and `hitGlow` — the strongest player color that has hits (for the note
 *   container's box-shadow) or null.
 */
export function getMultiPlayerNoteOverlay(
  players: NoteStripPlayer[],
  noteStartTime: number,
  noteDuration: number,
  fillFraction: number,
  isGolden: boolean,
  isBonus: boolean,
  targetPitch: number,
  pitchStats: { minPitch: number; pitchRange: number },
  visibleTop: number,
  visibleRange: number,
  containerHeight: number,
): { overlayElement: React.ReactNode; hitGlow: string | null } {
  const N = players.length;
  if (N === 0) return { overlayElement: null, hitGlow: null };

  // ── Same time-based segment math as the sealed mode ──
  const dur = noteDuration > 0 ? noteDuration : 1;
  const segCount = Math.max(4, Math.min(24, Math.round(dur / 50)));
  const segDur = dur / segCount;
  const nStart = noteStartTime;
  const clampedFill = Math.max(0, Math.min(1, fillFraction));
  const approxNow = nStart + clampedFill * dur;
  const isNoteActive = clampedFill > 0 && clampedFill < 1;
  const reachedFloat = clampedFill * segCount;
  const reachedCount = Math.floor(reachedFloat);
  const partialFill = reachedFloat - reachedCount;

  // Strip color: golden/bonus semantics apply to ALL players' strips.
  const stripColor = (p: NoteStripPlayer): string =>
    isGolden ? SEALED_GOLD_COLOR : isBonus ? SEALED_BONUS_COLOR : p.color;

  // ── Per-player per-segment classification (O(samples) per player) ──
  const segInfo = players.map(p => {
    const hit = new Array<boolean>(segCount).fill(false);
    const lastMissPitch = new Array<number | null>(segCount).fill(null);
    for (const s of p.samples) {
      const idx = Math.floor((s.time - nStart) / segDur);
      if (idx < 0 || idx >= segCount) continue;
      if (s.hit) hit[idx] = true;
      else if (s.sungPitch != null) lastMissPitch[idx] = s.sungPitch;
    }
    return { hit, lastMissPitch };
  });

  // ── Per-player laser / live-miss state ──
  type LastSample = { time: number; hit: boolean; sungPitch: number | null } | null;
  const playerLast: LastSample[] = players.map(p => {
    let last: LastSample = null;
    for (const s of p.samples) {
      if (s.time <= approxNow + 1) last = { time: s.time, hit: s.hit, sungPitch: s.sungPitch ?? null };
    }
    return last;
  });
  let anyBurning = false;
  const liveMiss: Array<{ color: string; sungPitch: number }> = [];
  players.forEach((p, i) => {
    const l = playerLast[i];
    if (!l || !isNoteActive || (approxNow - l.time) > 300) return;
    if (l.hit) anyBurning = true;
    else if (l.sungPitch !== null) liveMiss.push({ color: stripColor(p), sungPitch: l.sungPitch });
  });

  // ── Ghost-bar pitch math (identical to the single-player branch) ──
  const pr = pitchStats.pitchRange || 1;
  const targetY = visibleTop + visibleRange - ((targetPitch - pitchStats.minPitch) / pr) * visibleRange;
  const sungYOffset = (sungPitch: number) => {
    const sungY = visibleTop + visibleRange - ((sungPitch - pitchStats.minPitch) / pr) * visibleRange;
    return ((sungY - targetY) / 100) * containerHeight;
  };

  // ── Ghost runs: consecutive missed segments with similar pitch, per player ──
  interface GhostRun { playerId: string; startIdx: number; endIdx: number; yOffset: number; color: string; }
  const ghostRuns: GhostRun[] = [];
  const scanEnd = Math.min(reachedCount + (partialFill > 0 ? 1 : 0), segCount);
  players.forEach((p, pi) => {
    const color = stripColor(p);
    const { hit, lastMissPitch } = segInfo[pi];
    type Run = { startIdx: number; sumPitch: number; n: number; lastPitch: number };
    let run: Run | null = null;
    const flushRun = () => {
      if (!run) return;
      ghostRuns.push({
        playerId: p.id,
        startIdx: run.startIdx,
        endIdx: run.startIdx + run.n - 1,
        yOffset: sungYOffset(run.sumPitch / run.n),
        color,
      });
      run = null;
    };
    for (let si = 0; si < scanEnd; si++) {
      const missPitch = lastMissPitch[si];
      if (missPitch !== null && !hit[si]) {
        // Continue the run while the pitch stays within ~1.5 semitones
        if (run && Math.abs(missPitch - run.lastPitch) <= 1.5) {
          run.sumPitch += missPitch;
          run.n++;
          run.lastPitch = missPitch;
        } else {
          flushRun();
          run = { startIdx: si, sumPitch: missPitch, n: 1, lastPitch: missPitch };
        }
      } else {
        // A hit (or silence) breaks the miss run
        flushRun();
      }
    }
    flushRun();
  });

  // ── hitGlow: the strongest player color that has hits ──
  let hitGlow: string | null = null;
  let bestHits = 0;
  players.forEach((p, i) => {
    let h = 0;
    const limit = Math.min(reachedCount, segCount);
    for (let idx = 0; idx < limit; idx++) if (segInfo[i].hit[idx]) h++;
    if (h > bestHits) { bestHits = h; hitGlow = stripColor(p); }
  });

  // ── Render: N stacked strips + shared laser head + ghosts ──
  const stripH = 100 / N;
  const segW = 100 / segCount;
  const overlayElement = (
    <>
      {players.map((p, i) => {
        const color = stripColor(p);
        const hasAny = p.samples.length > 0;
        const hit = segInfo[i].hit;
        return (
          <div
            key={p.id}
            className="absolute left-0 right-0"
            style={{
              top: `${stripH * i}%`,
              // 1px gap between strips (bottom strip stays flush)
              height: i < N - 1 ? `calc(${stripH}% - 1px)` : `${stripH}%`,
            }}
          >
            <div className="absolute inset-0 flex" style={{ gap: '1px', padding: '1px 2px' }}>
              {hit.map((segHit, idx) => {
                const isUnreached = idx > reachedCount;
                const isAtFront = idx === reachedCount;

                let bgColor: string;
                let borderCol: string;
                let clipPath: string | undefined;
                let segGlow: string | undefined;
                let bgImage: string | undefined;
                let animClass = '';

                if (isUnreached || !hasAny) {
                  // Unreached track — or "this player never attempted the
                  // note" — stays a dim track in the player's color.
                  bgColor = hexWithAlpha(color, 0.22);
                  borderCol = hexWithAlpha(color, 0.45);
                } else if (segHit) {
                  // Burned-in fill: the player's color, SOLID
                  bgColor = color;
                  borderCol = 'rgba(255, 255, 255, 0.30)';
                  segGlow = `0 0 8px ${hexWithAlpha(color, 0.55)}`;
                  // Freshly burned segments right behind the laser head glow
                  // hotter while cooling down (only while the note is active).
                  if (isNoteActive && idx >= reachedCount - 3) {
                    bgImage = `linear-gradient(90deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0) 70%), ${color}`;
                    segGlow = `0 0 12px ${hexWithAlpha(color, 0.8)}, inset 0 0 5px rgba(255, 255, 255, 0.30)`;
                  }
                  animClass = 'note-seal-seg';
                } else {
                  // Aussetzer: scorched dark gap (same values as sealed mode)
                  bgColor = 'rgba(140, 21, 21, 0.32)';
                  borderCol = 'rgba(255, 65, 65, 0.28)';
                  segGlow = 'inset 0 1px 3px rgba(0, 0, 0, 0.35)';
                }

                if (isAtFront && partialFill > 0 && partialFill < 1) {
                  clipPath = `inset(0 ${(1 - partialFill) * 100}% 0 0)`;
                } else if (isAtFront && partialFill <= 0) {
                  bgColor = hexWithAlpha(color, 0.22);
                  borderCol = hexWithAlpha(color, 0.45);
                  segGlow = undefined;
                }

                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm ${animClass}`}
                    style={{
                      backgroundColor: bgColor,
                      backgroundImage: bgImage,
                      border: `1px solid ${borderCol}`,
                      clipPath,
                      boxShadow: segGlow,
                      transition: 'background-color 60ms linear, box-shadow 60ms linear, background-image 200ms ease-out',
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ONE shared laser head at the fill front, spanning the full bar
          height — white-hot neutral while ANY player is on pitch. */}
      {anyBurning && (
        <div
          className="note-laser-head"
          style={{
            left: `${clampedFill * 100}%`,
            height: '100%',
            '--laser-color': '#ffffff',
            '--laser-glow': 'rgba(255, 255, 255, 0.55)',
          } as React.CSSProperties}
        >
          <span className="note-laser-core" style={{ height: '86%' }} />
          <span className="note-laser-spark s1" />
          <span className="note-laser-spark s2" />
          <span className="note-laser-spark s3" />
        </div>
      )}

      {/* Ghost marks per player: missed notes at the pitch where they were
          actually sung, in the PLAYER's color — merged into runs. */}
      {(ghostRuns.length > 0 || liveMiss.length > 0) && (
        <div className="absolute pointer-events-none" style={{ inset: 0, overflow: 'visible' }}>
          {ghostRuns.map(run => {
            const span = run.endIdx - run.startIdx + 1;
            const barLeft = segW * run.startIdx + segW * 0.1;
            const barW = segW * span - segW * 0.2;
            return (
              <div
                key={`ghost-${run.playerId}-${run.startIdx}`}
                className="absolute rounded-full"
                style={{
                  left: `${barLeft}%`,
                  top: '50%',
                  width: `${barW}%`,
                  height: span > 1 ? '10px' : '12px',
                  transform: `translateY(-50%) translateY(${run.yOffset}px)`,
                  backgroundColor: run.color,
                  opacity: 0.9,
                  boxShadow: `0 0 8px ${run.color}`,
                }}
              />
            );
          })}

          {/* Live "you are HERE" markers: one pulsing dot per player that is
              currently missing off-pitch, colored by that player. */}
          {liveMiss.map((m, i) => (
            <div
              key={`live-${i}`}
              className="note-ghost-live"
              style={{
                left: `${clampedFill * 100}%`,
                top: '50%',
                transform: `translate(-50%, -50%) translateY(${sungYOffset(m.sungPitch)}px)`,
                '--live-color': m.color,
              } as React.CSSProperties}
            >
              <span className="note-ghost-live-dot" />
            </div>
          ))}
        </div>
      )}
    </>
  );

  return { overlayElement, hitGlow };
}

/**
 * Calculate note background classes based on note type and color profile
 */
export function getNoteBackgroundClasses(isGolden: boolean, isBonus: boolean): string {
  if (isGolden) {
    return 'bg-gradient-to-r from-yellow-400 to-orange-500';
  }
  if (isBonus) {
    return 'bg-gradient-to-r from-pink-500 to-purple-500';
  }
  const profile = getNoteColorProfile(getString(StorageKeys.NOTE_COLOR_PROFILE));
  return profile.lowPerfGradient;
}

/**
 * Calculate note box shadow based on active state and type
 */
export function getNoteBoxShadow(isActive: boolean, isGolden: boolean): string {
  if (!isActive) return 'none';
  if (isGolden) {
    return '0 0 30px rgba(251, 191, 36, 0.7)';
  }
  const profile = getNoteColorProfile(getString(StorageKeys.NOTE_COLOR_PROFILE));
  return profile.lowPerfActiveGlow;
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

  const paddedMin = Math.max(0, minPitch - padding);
  const paddedMax = Math.min(127, maxPitch + padding);

  return {
    minPitch: paddedMin,
    maxPitch: paddedMax,
    pitchRange: Math.max(12, paddedMax - paddedMin),
  };
}

// Game display constants
export const SING_LINE_POSITION = 20;
export const NOTE_WINDOW = 4000;
export const VISIBLE_TOP = 8;
const VISIBLE_BOTTOM = 85;
export const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

/**
 * Get visible notes within a time window using binary search.
 */
export function getVisibleNotes(
  notes: Array<Note & { lineIndex: number; line: LyricLine }> | undefined | null,
  currentTime: number,
  noteWindow: number
): Array<Note & { lineIndex: number; line: LyricLine }> {
  if (!notes || notes.length === 0) return [];

  const searchWindowStart = currentTime - 20000;
  const filterWindowStart = currentTime - 5000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

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
