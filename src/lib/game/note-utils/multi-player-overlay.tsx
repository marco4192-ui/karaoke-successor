/**
 * Multi-player strips overlay (Medley Contest) — N stacked per-player
 * strips inside ONE note bar.
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx.
 */
import type React from 'react';
import { SEALED_GOLD_COLOR, SEALED_BONUS_COLOR } from '@/lib/game/note-color-profiles';
import { hexWithAlpha } from './color-utils';

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
 *   • no data:   neutral dim track (R15 — see the segment bridging below)
 * Golden notes use the gold color for ALL players, bonus notes magenta.
 *
 * R15 (user request 1.1 — "Notenblöcke füllen sich nicht immer vollständig"):
 * The visual samples arrive on the 60ms scoring tick, but segments cover
 * ~50ms — aliasing leaves sample-less segments that used to render as
 * scorched MISS gaps even though the player was on pitch (score fine,
 * blocks full of holes). Two fixes:
 *   1. Segments with NO sample are NEUTRAL (dim track) — "no data" is not
 *      "missed". Only segments with real miss samples show the gap.
 *   2. Short holes (≤3 segments ≈ 150ms) directly after a HIT inherit that
 *      hit — bridging tick aliasing and short detector dropouts, matching
 *      the 200ms scoring pitch-hold from R14.
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

/** Max sample-less segments after a hit that inherit it (≈150ms at 50ms/seg). */
const STRIP_BRIDGE_MAX_GAPS = 3;

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
  // R15 (1.1): `hasSample` separates "no data" (neutral) from "missed"
  // (scorched) — see the header comment for the full rationale.
  const segInfo = players.map(p => {
    const hit = new Array<boolean>(segCount).fill(false);
    const lastMissPitch = new Array<number | null>(segCount).fill(null);
    const hasSample = new Array<boolean>(segCount).fill(false);
    for (const s of p.samples) {
      const idx = Math.floor((s.time - nStart) / segDur);
      if (idx < 0 || idx >= segCount) continue;
      hasSample[idx] = true;
      if (s.hit) hit[idx] = true;
      else if (s.sungPitch != null) lastMissPitch[idx] = s.sungPitch;
    }
    // Bridge short sample-less holes after a HIT (tick aliasing / short
    // detector dropout while the player keeps singing) — they inherit it.
    let holeLen = 0;
    let lastSampledHit = false;
    for (let i = 0; i < segCount; i++) {
      if (hasSample[i]) {
        holeLen = 0;
        lastSampledHit = hit[i];
        continue;
      }
      holeLen++;
      if (holeLen <= STRIP_BRIDGE_MAX_GAPS && lastSampledHit) {
        hit[i] = true;
      }
    }
    return { hit, lastMissPitch, hasSample };
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
        const segHasSample = segInfo[i].hasSample;
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
                } else if (!segHasSample[idx]) {
                  // R15 (1.1): no sample in this segment — tick aliasing,
                  // detector dropout or silence. NEUTRAL dim track, NOT a
                  // scorched miss gap: "no data" ≠ "missed".
                  bgColor = hexWithAlpha(color, 0.22);
                  borderCol = hexWithAlpha(color, 0.45);
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
