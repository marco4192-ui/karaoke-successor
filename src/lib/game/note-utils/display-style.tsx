/**
 * Single-note display style pipeline: sealed / exact / legacy / flat render
 * modes for the note highway (the rendering core of note-utils).
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx.
 */
import type React from 'react';
import {
  getNoteColorProfile,
  resolveNoteColors,
  getNoteDisplayMode,
  getSealedHitColor,
  hexToRgbaPrefix,
  SEALED_GOLD_COLOR,
  SEALED_BONUS_COLOR,
  SEALED_RAP_COLOR,
  DEFAULT_SEALED_HIT_COLOR,
  EXACT_NOTE_COLORS,
} from '@/lib/game/note-color-profiles';
import { hexWithAlpha } from './color-utils';
import type { PitchStats } from './pitch-stats';

/**
 * Which rendering pipeline a note bar uses:
 * - 'modern' (default): the user's global note display setting
 *   ('sealed' = uniform hit colour + red misses + heat-seal animation, or
 *   'exact' = fixed 5-colour quality code dunkelgrün/grün/hellgrün/gelb/orange).
 * - 'legacy': the classic quality-graduated profile rendering — reserved for
 *   modes with MORE than two simultaneous singers where per-player colour
 *   coding must stay intact.
 * - 'flat': Battle Royale — notes fill with ONE uniform colour as the sing
 *   line passes them. No pitch data is visualised at all (no quality
 *   gradations, no sung-pitch ghosts) and no performance samples are
 *   needed, making it the cheapest possible pipeline.
 */
export type NoteRenderMode = 'modern' | 'legacy' | 'flat';

/** Default fill colour for 'flat' mode (Battle Royale theme cyan). */
export const FLAT_NOTE_FILL_COLOR = '#22d3ee';

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
 * - 'legacy' — the classic profile-based quality rendering (kept for
 *   multi-singer modes that still encode pitch info).
 * - 'flat' — Battle Royale: notes fill in ONE uniform colour as the sing
 *   line passes (golden → gold, bonus → magenta keep their semantics).
 *   No pitch data is visualised and no samples are required.
 */
export function getNoteDisplayStyleClasses(
  _displayStyle: string,
  _accuracy: number = 1,
  isGolden: boolean = false,
  /** Freestyle note ('F', formerly mislabeled "bonus") — magenta semantics. */
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
  /** Rendering pipeline: 'modern' (sealed/exact setting), 'legacy' or 'flat' (BR) */
  renderMode: NoteRenderMode = 'modern',
  /** Flat mode: the ONE uniform fill colour (defaults to BR cyan) */
  flatFill?: string,
  /** Rap note ('R'/'G' without golden) — emerald timing semantics. Golden rap keeps gold. */
  isRap: boolean = false,
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

  // ── FLAT MODE (Battle Royale) ───────────────────────────────
  // Cheapest possible pipeline: the note fills left-to-right with ONE
  // uniform colour as the sing line passes it. No samples, no segment
  // mapping, no quality colours, no sung-pitch ghosts — zero pitch data
  // is visualised. Early return BEFORE any storage reads / heavy work.
  if (renderMode === 'flat') {
    const fillColor = isGolden
      ? SEALED_GOLD_COLOR
      : isRap
        ? SEALED_RAP_COLOR
        : isBonus
          ? SEALED_BONUS_COLOR
          : (flatFill || FLAT_NOTE_FILL_COLOR);
    const fillPercent = Math.round(clampedFill * 1000) / 10;
    return {
      additionalClasses: 'overflow-hidden',
      inlineStyle: {
        backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(120, 160, 200, 0.04) 100%)',
        backgroundColor: 'rgba(100, 130, 160, 0.08)',
        border: `1.5px solid ${isGolden ? 'rgba(250, 204, 21, 0.55)' : isRap ? 'rgba(0, 230, 118, 0.55)' : isBonus ? 'rgba(232, 121, 249, 0.55)' : 'rgba(255, 255, 255, 0.16)'}`,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.2)',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
      },
      overlayElement: (
        <>
          {/* Uniform fill — grows as the sing line passes the note */}
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: fillColor,
              borderRadius: '2px',
              boxShadow: `inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.25), 0 0 10px ${hexToRgbaPrefix(fillColor)}0.45)`,
            }}
          />
          {/* Laser head at the fill edge while the note is being passed */}
          {clampedFill > 0 && clampedFill < 1 && (
            <div
              className="absolute inset-y-0"
              style={{
                left: `${fillPercent}%`,
                width: '3px',
                marginLeft: '-1.5px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                boxShadow: `0 0 8px ${fillColor}, 0 0 16px ${hexToRgbaPrefix(fillColor)}0.6)`,
              }}
            />
          )}
        </>
      ),
      pastOpacity: 0.55,
    };
  }

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

  // R20-3: the Note-Colors profile SETTING was removed (it only affected
  // the legacy quality pipeline, which no mode renders anymore — sealed/exact
  // display + fixed special-note palettes govern everything). The default
  // 'neon' profile stays as the fixed fallback for the legacy render path.
  const profile = getNoteColorProfile(null);
  const isSpecialNote = isGolden || isBonus || isRap;
  // Sealed: no per-quality colours at all — one uniform hit colour
  // (golden notes seal in gold, rap notes in emerald, freestyle in magenta).
  const sealedHit = isSealed
    ? (isGolden ? SEALED_GOLD_COLOR : isRap ? SEALED_RAP_COLOR : isBonus ? SEALED_BONUS_COLOR : getSealedHitColor())
    : null;
  const hitColors = sealedHit
    ? null
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.hitColors
      : resolveNoteColors(profile, isGolden, isBonus, isRap).hitColors;
  const hitGlows = sealedHit
    ? null
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.hitGlows
      : resolveNoteColors(profile, isGolden, isBonus, isRap).hitGlows;
  const glowTint = sealedHit
    ? hexToRgbaPrefix(sealedHit)
    : isExact && !isSpecialNote
      ? EXACT_NOTE_COLORS.glowTint
      : resolveNoteColors(profile, isGolden, isBonus, isRap).glowTint;
  const missGap       = 'rgba(255, 255, 255, 0.02)';
  const missGapBorder = 'rgba(255, 255, 255, 0.05)';
  // Per-singer tint (Medley): the unsung track shows the snippet singer's
  // color so all players can sing against one clearly-owned note stream.
  const tint        = playerTint && playerTint.startsWith('#') ? playerTint : null;
  // Type pre-recognition (R7): the UNREACHED track carries a soft type tint
  // so singers can SEE what's coming — gold (golden), emerald (rap),
  // magenta (freestyle) — before the sing line reaches the note.
  const typeTintBg  = isGolden ? 'rgba(250, 204, 21, 0.15)'
    : isRap ? 'rgba(0, 230, 118, 0.15)'
      : isBonus ? 'rgba(255, 77, 158, 0.15)'
        : null;
  const typeTintBdr = isGolden ? 'rgba(250, 204, 21, 0.42)'
    : isRap ? 'rgba(0, 230, 118, 0.42)'
      : isBonus ? 'rgba(255, 77, 158, 0.42)'
        : null;
  const unreachedBg = tint ? hexWithAlpha(tint, 0.22) : (typeTintBg ?? 'rgba(255, 255, 255, 0.08)');
  const unreachedBdr = tint ? hexWithAlpha(tint, 0.45) : (typeTintBdr ?? 'rgba(255, 255, 255, 0.14)');
  // Sealed neutral track: modes without performance data (PTM/CPTM lanes)
  // must NOT render "missed" red — no samples simply means "no data".
  const hasAnySamples = samples.length > 0;
  const isNoteComplete = clampedFill >= 1 && hasAnySamples;

  // ── Time-based segment → sample mapping ────────────────────────
  // R15 (user request 1.1 — "Notenblöcke füllen sich nicht immer vollständig"):
  // segments with NO sample used to render as MISS gaps, but the samples
  // arrive on the 60ms scoring tick while segments cover ~50ms — aliasing
  // (plus short detector dropouts) left regular holes in notes that were
  // sung fine. `noData` marks those segments: they render NEUTRAL instead
  // of red, and short holes (≤3 segments ≈ 150ms) right after a HIT inherit
  // that hit (matching the 200ms scoring pitch-hold from R14). Only
  // segments with real miss samples show the scorched gap.
  const segData: Array<{
    hit: boolean;
    accuracy: number;
    displayType: string;
    sungPitch: number | null;
    noData: boolean;
  }> = [];

  let lastSampledHit: { accuracy: number; displayType: string } | null = null;
  let holeLen = 0;
  const SOLO_BRIDGE_MAX_GAPS = 3; // ≤3 empty segments (≈150ms) inherit a hit

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
      holeLen++;
      // Short hole directly after a sampled HIT → inherit it (aliasing /
      // detector dropout bridging). Longer holes stay neutral "no data".
      if (lastSampledHit && holeLen <= SOLO_BRIDGE_MAX_GAPS) {
        segData.push({ hit: true, accuracy: lastSampledHit.accuracy, displayType: lastSampledHit.displayType, sungPitch: null, noData: false });
      } else {
        segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: null, noData: true });
      }
      continue;
    }
    holeLen = 0;

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
      segData.push({ hit: true, accuracy: bestHit.accuracy, displayType: dt, sungPitch: null, noData: false });
      lastSampledHit = { accuracy: bestHit.accuracy, displayType: dt };
    } else {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: lastSung.sungPitch ?? null, noData: false });
      lastSampledHit = null;
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
              } else if (seg.noData) {
                // R15 (1.1): no sample here (tick aliasing / detector dropout
                // / silence) — NEUTRAL track, not a scorched miss gap.
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
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
              } else if (seg.noData) {
                // R15 (1.1): no sample — neutral track, not a miss gap.
                bgColor   = unreachedBg;
                borderCol = unreachedBdr;
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
