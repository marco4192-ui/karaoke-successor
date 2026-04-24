'use client';

import { useMemo } from 'react';
import {
  TournamentBracket,
  TournamentMatch,
  TournamentPlayer,
  getMatchesForRound,
  getPlayableMatches,
} from '@/lib/game/tournament';

// Layout constants — compact match cards with comfortable spacing between columns
const MATCH_W = 100;
const MATCH_W_FINAL = 120;
const MATCH_W_FIRST_ROUND = 195; // Wider for horizontal (side-by-side) layout
const COL_GAP = 40;
const FINAL_GAP = 44;
const ROUND_LABEL_H = 22; // space for round labels above bracket
const MIN_UNIT_SPACING = 70; // minimum vertical spacing between adjacent first-round match centres (prevents card overlap)

interface ButterflyBracketProps {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (match: TournamentMatch) => void;
}

/** Get a human-readable round name */
function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return '🏆 Final';
  if (round === totalRounds - 1) return 'Semi-Finals';
  if (round === totalRounds - 2 && totalRounds >= 4) return 'Quarter-Finals';
  if (round === totalRounds - 3 && totalRounds >= 5) return 'Round of 16';
  return `Round ${round}`;
}

/** Recursively compute the vertical center Y for a match at (round, position).
 *  In the butterfly layout only firstRoundCount/2 round-1 matches are visible per side,
 *  so round 1 uses matchesPerSide as the divisor to get adequate spacing.
 *  Later rounds average their feeder centres automatically. */
function computeCenterY(
  round: number,
  pos: number,
  totalRounds: number,
  bracketH: number,
): number {
  const firstRoundCount = Math.pow(2, totalRounds - 1);
  const matchesPerSide = firstRoundCount / 2;
  if (round === 1) {
    const unit = bracketH / matchesPerSide;
    return (pos + 0.5) * unit;
  }
  const c1 = computeCenterY(round - 1, pos * 2, totalRounds, bracketH);
  const c2 = computeCenterY(round - 1, pos * 2 + 1, totalRounds, bracketH);
  return (c1 + c2) / 2;
}

// ─── Main Component ──────────────────────────────────────────────

export function TournamentBracketButterfly({
  bracket,
  currentMatch,
  onPlayMatch,
}: ButterflyBracketProps) {
  const playableMatches = getPlayableMatches(bracket);
  const firstRoundCount = Math.pow(2, bracket.totalRounds - 1);
  const matchesPerSide = firstRoundCount / 2;

  // Dynamic spacing – compact vertical spacing to prevent oversized brackets.
  // matchesPerSide drives both the spacing and the height calculation because
  // computeCenterY now uses matchesPerSide as the divisor for round 1.
  const matchSpacing = Math.max(70, Math.min(100, 500 / matchesPerSide));

  // effectiveHeight must be >= matchesPerSide * MIN_UNIT_SPACING to prevent overlap.
  const rawEffectiveH = matchesPerSide * matchSpacing;
  const neededEffectiveH = matchesPerSide * MIN_UNIT_SPACING;
  const effectiveH = Math.max(rawEffectiveH, neededEffectiveH);
  const bracketH = effectiveH + ROUND_LABEL_H;

  // Final match Y position: ~30% from top (not hardcoded pixel, relative to bracket height)
  // This places the final roughly 20% lower than the previous fixed 50px
  const FINAL_Y = bracketH * 0.30;

  // Memoised helper (adds top padding for round labels)
  const getCY = (round: number, pos: number) =>
    computeCenterY(round, pos, bracket.totalRounds, bracketH - ROUND_LABEL_H) + ROUND_LABEL_H;

  // ── Split rounds into left (top-half), right (bottom-half, reversed) and final ──
  const { leftRounds, rightRounds, finalMatch } = useMemo(() => {
    const left: { rn: number; matches: TournamentMatch[] }[] = [];
    const right: { rn: number; matches: TournamentMatch[] }[] = [];
    let fm: TournamentMatch | null = null;

    for (let r = 1; r <= bracket.totalRounds; r++) {
      const matches = getMatchesForRound(bracket, r);
      if (r === bracket.totalRounds) {
        fm = matches[0] || null;
        continue;
      }
      const mid = Math.floor(matches.length / 2);
      left.push({ rn: r, matches: matches.slice(0, mid) });
      right.push({ rn: r, matches: matches.slice(mid) });
    }

    // Reverse right side so columns go inner→outer (semi nearest to center)
    return { leftRounds: left, rightRounds: [...right].reverse(), finalMatch: fm };
  }, [bracket]);

  // ── Compute column X-positions ──
  const nLeft = leftRounds.length;

  // Determine width per column based on round number
  const colWidth = (rn: number) => rn === 1 ? MATCH_W_FIRST_ROUND : MATCH_W;

  // Compute left X positions cumulatively
  const leftXStarts: number[] = [];
  let cumX = 0;
  for (let i = 0; i < nLeft; i++) {
    leftXStarts.push(cumX);
    cumX += colWidth(leftRounds[i].rn) + COL_GAP;
  }
  const leftX = (i: number) => leftXStarts[i] || 0;

  const leftEnd = nLeft > 0 ? leftX(nLeft - 1) + colWidth(leftRounds[nLeft - 1].rn) : 0;
  const centerX = leftEnd + FINAL_GAP;
  const rightX = (j: number) =>
    centerX + MATCH_W_FINAL + FINAL_GAP + j * (MATCH_W + COL_GAP);

  const nRight = rightRounds.length;
  // Right side last round (outermost) may be round 1 (first round) → wider
  const rightLastWidth = nRight > 0 && rightRounds[nRight - 1].rn === 1 ? MATCH_W_FIRST_ROUND : MATCH_W;
  const totalW =
    nRight > 0 ? rightX(nRight - 1) + rightLastWidth : centerX + MATCH_W_FINAL;

  // ── SVG connector paths ──
  const svgPaths = useMemo(() => {
    const p: string[] = [];

    // ─ Left side: outer column i feeds into inner column i+1 ─
    for (let i = 0; i < leftRounds.length - 1; i++) {
      const outer = leftRounds[i];
      const inner = leftRounds[i + 1];
      const oX = leftX(i);
      const oW = colWidth(outer.rn);
      const iX = leftX(i + 1);
      const jx = oX + oW + COL_GAP / 2;

      for (const mIn of inner.matches) {
        const f1 = outer.matches.find((m) => m.position === mIn.position * 2);
        const f2 = outer.matches.find((m) => m.position === mIn.position * 2 + 1);
        if (!f1 || !f2) continue;

        const y1 = getCY(outer.rn, f1.position);
        const y2 = getCY(outer.rn, f2.position);
        const yt = getCY(inner.rn, mIn.position);

        // Vertical line between the two feeders
        p.push(`M ${jx} ${y1} L ${jx} ${y2}`);
        // Feeder 1 → junction
        p.push(`M ${oX + oW} ${y1} L ${jx} ${y1}`);
        // Feeder 2 → junction
        p.push(`M ${oX + oW} ${y2} L ${jx} ${y2}`);
        // Junction → target
        p.push(`M ${jx} ${yt} L ${iX} ${yt}`);
      }
    }

    // ─ Left semi → Final (final at top) ─
    if (leftRounds.length > 0 && finalMatch) {
      const semi = leftRounds[nLeft - 1].matches[0];
      if (semi) {
        const sy = getCY(leftRounds[nLeft - 1].rn, semi.position);
        const fy = FINAL_Y;
        const semiW = colWidth(leftRounds[nLeft - 1].rn);
        p.push(`M ${leftX(nLeft - 1) + semiW} ${sy} L ${centerX} ${fy}`);
      }
    }

    // ─ Right side: outer column (i+1) feeds into inner column (i) ─
    for (let i = 0; i < rightRounds.length - 1; i++) {
      const inner = rightRounds[i]; // nearer to centre
      const outer = rightRounds[i + 1]; // farther right

      const iColX = rightX(i);
      const oColX = rightX(i + 1);
      const jx = iColX + MATCH_W + COL_GAP / 2;

      for (const mIn of inner.matches) {
        const f1 = outer.matches.find((m) => m.position === mIn.position * 2);
        const f2 = outer.matches.find((m) => m.position === mIn.position * 2 + 1);
        if (!f1 || !f2) continue;

        // Remap positions to top-half equivalent for right side
        const y1 = getCY(outer.rn, f1.position - outer.matches.length);
        const y2 = getCY(outer.rn, f2.position - outer.matches.length);
        const yt = getCY(inner.rn, mIn.position - inner.matches.length);

        // Vertical between feeders
        p.push(`M ${jx} ${y1} L ${jx} ${y2}`);
        // Feeder 1 left edge → junction
        p.push(`M ${oColX} ${y1} L ${jx} ${y1}`);
        // Feeder 2 left edge → junction
        p.push(`M ${oColX} ${y2} L ${jx} ${y2}`);
        // Junction → inner right edge
        p.push(`M ${jx} ${yt} L ${iColX + MATCH_W} ${yt}`);
      }
    }

    // ─ Right semi → Final (final at top) ─
    if (rightRounds.length > 0 && finalMatch) {
      const semi = rightRounds[0].matches[0];
      if (semi) {
        const sy = getCY(rightRounds[0].rn, semi.position - rightRounds[0].matches.length);
        const fy = FINAL_Y;
        p.push(`M ${centerX + MATCH_W_FINAL} ${fy} L ${rightX(0)} ${sy}`);
      }
    }

    return p;
  }, [
    leftRounds,
    rightRounds,
    finalMatch,
    nLeft,
    bracketH,
    centerX,
    getCY,
    leftX,
    rightX,
  ]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div>
      <div
        className="relative mx-auto"
        style={{ width: totalW, height: bracketH }}
      >
        {/* SVG connector lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalW}
          height={bracketH}
          style={{ zIndex: 0 }}
        >
          {svgPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={2}
              fill="none"
            />
          ))}
        </svg>

        {/* ── Left side: top-half columns (outer → inner) ── */}
        {leftRounds.map((rd, i) => {
          const w = colWidth(rd.rn);
          const isFirstRound = rd.rn === 1;
          return (
            <div
              key={`L${i}`}
              className="absolute top-0"
              style={{ left: leftX(i), width: w, height: bracketH }}
            >
              <div className="absolute left-0 right-0 text-center text-[11px] text-white/40 font-medium select-none"
                style={{ top: 4 }}>
                {getRoundName(rd.rn, bracket.totalRounds)}
              </div>
              {rd.matches.map((m) => {
                const cy = getCY(rd.rn, m.position);
                return (
                  <div
                    key={m.id}
                    className="absolute"
                    style={{
                      top: cy,
                      transform: 'translateY(-50%)',
                      width: w,
                      zIndex: 1,
                    }}
                  >
                    <MatchCard
                      match={m}
                      isCurrent={currentMatch?.id === m.id}
                      isPlayable={playableMatches.some((pm) => pm.id === m.id)}
                      onPlay={() => onPlayMatch(m)}
                      done={bracket.status === 'completed'}
                      isFirstRound={isFirstRound}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* ── Centre: Final ── */}
        {finalMatch && (
          <div
            className="absolute top-0"
            style={{ left: centerX, width: MATCH_W_FINAL, height: bracketH }}
          >
            <div className="absolute left-0 right-0 text-center text-sm text-amber-400 font-bold select-none"
              style={{ top: 4 }}>
              {getRoundName(bracket.totalRounds, bracket.totalRounds)}
            </div>
            <div
              className="absolute"
              style={{ top: FINAL_Y, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/20 to-amber-500/10 rounded-xl blur-xl -m-4" />
                <div style={{ transform: 'scale(1.08)' }}>
                  <MatchCard
                    match={finalMatch}
                    isCurrent={currentMatch?.id === finalMatch.id}
                    isPlayable={playableMatches.some((pm) => pm.id === finalMatch.id)}
                    onPlay={() => onPlayMatch(finalMatch)}
                    done={bracket.status === 'completed'}
                    isFinal
                    isFirstRound={bracket.totalRounds === 1}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Right side: bottom-half columns (inner → outer) ── */}
        {rightRounds.map((rd, i) => {
          const isFirstRound = rd.rn === 1;
          const w = isFirstRound ? MATCH_W_FIRST_ROUND : MATCH_W;
          return (
            <div
              key={`R${i}`}
              className="absolute top-0"
              style={{ left: rightX(i), width: w, height: bracketH }}
            >
              <div className="absolute left-0 right-0 text-center text-[11px] text-white/40 font-medium select-none"
                style={{ top: 4 }}>
                {getRoundName(rd.rn, bracket.totalRounds)}
              </div>
              {rd.matches.map((m) => {
                // Remap right-side positions to top-half equivalent
                const displayPos = m.position - rd.matches.length;
                const cy = getCY(rd.rn, displayPos);
                return (
                  <div
                    key={m.id}
                    className="absolute"
                    style={{
                      top: cy,
                      transform: 'translateY(-50%)',
                      width: w,
                      zIndex: 1,
                    }}
                  >
                    <MatchCard
                      match={m}
                      isCurrent={currentMatch?.id === m.id}
                      isPlayable={playableMatches.some((pm) => pm.id === m.id)}
                      onPlay={() => onPlayMatch(m)}
                      done={bracket.status === 'completed'}
                      isFirstRound={isFirstRound}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Match Card (compact) ──────────────────────────────────────

function MatchCard({
  match,
  isCurrent,
  isPlayable,
  onPlay,
  done,
  isFinal = false,
  isFirstRound = false,
}: {
  match: TournamentMatch;
  isCurrent: boolean;
  isPlayable: boolean;
  onPlay: () => void;
  done: boolean;
  isFinal?: boolean;
  /** Use horizontal layout (side-by-side) for first-round matches */
  isFirstRound?: boolean;
}) {
  // BYE match
  if (match.isBye && match.player1) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-md p-1.5">
        <div className="text-[9px] text-white/40">BYE</div>
        <SmallPlayer player={match.player1} />
        <div className="text-[9px] text-green-400">Advanced →</div>
      </div>
    );
  }

  const clickable = isPlayable && !done;

  // Horizontal layout for first-round matches: Player 1 vs Player 2 side-by-side
  if (isFirstRound) {
    return (
      <div
        className={`rounded-lg transition-all overflow-hidden ${
          isCurrent && !done
            ? 'bg-gradient-to-r from-cyan-500/30 via-transparent to-purple-500/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
            : match.completed
              ? 'bg-white/10 border border-green-500/30'
              : isPlayable
                ? 'bg-white/5 border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40'
                : 'bg-white/5 border border-white/10 opacity-60'
        } ${clickable ? 'hover:scale-105 cursor-pointer' : ''}`}
        onClick={clickable ? onPlay : undefined}
      >
        <div className="flex items-center gap-1 px-1.5 py-1.5">
          {/* Player 1 */}
          <div
            className={`flex-1 flex items-center gap-1 rounded px-1 py-0.5 ${
              match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''
            }`}
          >
            <SmallPlayer player={match.player1} />
            {match.completed && (
              <span className={`text-xs font-bold ml-auto ${match.winner?.id === match.player1?.id ? 'text-green-400' : 'text-white/60'}`}>
                {match.score1}
              </span>
            )}
          </div>

          {/* VS divider */}
          <div className="text-white/40 text-[9px] font-bold px-0.5 shrink-0">VS</div>

          {/* Player 2 */}
          <div
            className={`flex-1 flex items-center gap-1 rounded px-1 py-0.5 ${
              match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''
            }`}
          >
            <SmallPlayer player={match.player2} />
            {match.completed && (
              <span className={`text-xs font-bold ml-auto ${match.winner?.id === match.player2?.id ? 'text-green-400' : 'text-white/60'}`}>
                {match.score2}
              </span>
            )}
          </div>
        </div>

        {/* Winner badge */}
        {match.winner && (
          <div className="text-[9px] text-center text-amber-400 font-medium bg-amber-500/10 rounded py-0.5">
            🏆 {match.winner.name}
          </div>
        )}

        {/* Playable indicator */}
        {isPlayable && !match.completed && !done && (
          <div className="text-[9px] text-center text-cyan-400 font-medium pb-0.5">
            ▶ Play →
          </div>
        )}
      </div>
    );
  }

  // Vertical layout (default for later rounds and final)
  return (
    <div
      className={`rounded-md p-1.5 transition-all overflow-hidden ${
        isCurrent && !done
          ? 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 shadow-lg shadow-cyan-500/20'
          : match.completed
            ? 'bg-white/10 border border-green-500/30'
            : isPlayable
              ? 'bg-white/5 border border-white/20 cursor-pointer hover:bg-white/10 hover:border-white/40'
              : 'bg-white/5 border border-white/10 opacity-60'
      } ${clickable ? 'hover:scale-105 cursor-pointer' : ''}`}
      onClick={clickable ? onPlay : undefined}
    >
      {/* Player 1 */}
      <div
        className={`flex items-center gap-1 p-0.5 rounded text-xs min-w-0 ${
          match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''
        }`}
      >
        <SmallPlayer player={match.player1} />
        {match.completed && (
          <span
            className={`ml-auto text-xs font-bold ${
              match.winner?.id === match.player1?.id
                ? 'text-green-400'
                : 'text-white/60'
            }`}
          >
            {match.score1}
          </span>
        )}
      </div>

      {/* VS divider */}
      <div className="text-center text-white/30 text-[9px] my-0.5 flex items-center justify-center gap-1">
        <div className="flex-1 h-px bg-white/10" />
        <span>VS</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Player 2 */}
      <div
        className={`flex items-center gap-1 p-0.5 rounded text-xs min-w-0 ${
          match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''
        }`}
      >
        <SmallPlayer player={match.player2} />
        {match.completed && (
          <span
            className={`ml-auto text-xs font-bold ${
              match.winner?.id === match.player2?.id
                ? 'text-green-400'
                : 'text-white/60'
            }`}
          >
            {match.score2}
          </span>
        )}
      </div>

      {/* Winner badge */}
      {match.winner && (
        <div className="text-[9px] text-center text-amber-400 font-medium bg-amber-500/10 rounded py-0.5">
          🏆 {match.winner.name}
        </div>
      )}

      {/* Playable indicator */}
      {isPlayable && !match.completed && !done && (
        <div className="text-[9px] text-center text-cyan-400 font-medium">
          ▶ Play →
        </div>
      )}
    </div>
  );
}

// ─── Small player row ──────────────────────────────────────────

function SmallPlayer({ player }: { player: TournamentPlayer | null }) {
  if (!player) {
    return (
      <div className="flex items-center gap-1 text-[11px]">
        <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
        <span className="text-white/30 truncate">TBD</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[11px] min-w-0">
      {player.avatar ? (
        <img
          src={player.avatar}
          alt={player.name}
          className="w-5 h-5 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0"
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate min-w-0">{player.name}</span>
    </div>
  );
}
