'use client';

import { useMemo } from 'react';
import {
  TournamentBracket,
  TournamentMatch,
  TournamentPlayer,
  getMatchesForRound,
  getPlayableMatches,
} from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';

// ─── Layout constants (base design — the whole bracket is uniformly scaled to fit) ───
// Reference viewport: 1920×1080 (HD). Cards are deliberately sized for good
// readability at scale 1 and grow/shrink with the available space (responsive).
const MATCH_W = 134;          // vertical card width (rounds ≥ 2)
const MATCH_W_FINAL = 164;    // final card width
const MATCH_W_FIRST = 256;    // first-round card width (horizontal player layout)
const VERT_H = 88;            // FIXED height of vertical cards → deterministic spacing
const FIRST_H = 46;           // FIXED height of first-round / BYE cards
const COL_GAP = 36;           // horizontal gap between round columns
const FINAL_GAP = 44;         // gap around the final column
const ROUND_LABEL_H = 26;     // reserved space for the round label above each column

// Minimum vertical distance between adjacent first-round card CENTRES.
// Guarantees ZERO overlap: round-1 cards are FIRST_H tall and 1 unit apart,
// round-2 cards are VERT_H tall and 2 units apart (≥ VERT_H + gap).
const MIN_UNIT = Math.max(FIRST_H + 10, (VERT_H + 14) / 2);
const MAX_UNIT = 320;         // airy spacing when only a few matches remain

// Fallback aspect used before the viewport has been measured (≈ HD minus chrome)
const FALLBACK_AVAIL = { w: 1600, h: 760 };

interface ButterflyBracketProps {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (_match: TournamentMatch) => void;
  /** Measured size of the area the bracket may occupy. Drives the responsive
   *  vertical match spacing so the bracket fills the screen at any size. */
  availSize?: { w: number; h: number } | null;
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
  const matchesPerSide = Math.max(1, firstRoundCount / 2);
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
  availSize,
}: ButterflyBracketProps) {
  const { t } = useTranslation();
  const playableMatches = getPlayableMatches(bracket);
  const firstRoundCount = Math.pow(2, bracket.totalRounds - 1);
  const matchesPerSide = Math.max(1, firstRoundCount / 2);

  // ── Split rounds into left (top-half), right (bottom-half, reversed) and final ──
  // Filter to winners bracket only (single elimination uses this component)
  const { leftRounds, rightRounds, finalMatch } = useMemo(() => {
    const left: { rn: number; matches: TournamentMatch[] }[] = [];
    const right: { rn: number; matches: TournamentMatch[] }[] = [];
    let fm: TournamentMatch | null = null;

    for (let r = 1; r <= bracket.totalRounds; r++) {
      // For single elimination, bracketType may be undefined; for DE, filter winners
      const matches = getMatchesForRound(bracket, r, 'winners').length > 0
        ? getMatchesForRound(bracket, r, 'winners')
        : getMatchesForRound(bracket, r);
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
  const nRight = rightRounds.length;

  // Determine width per column based on round number
  const colWidth = (rn: number) => (rn === 1 ? MATCH_W_FIRST : MATCH_W);

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

  // Right side last round (outermost) may be round 1 (first round) → wider
  const rightLastWidth = nRight > 0 && rightRounds[nRight - 1].rn === 1 ? MATCH_W_FIRST : MATCH_W;
  const totalW =
    nRight > 0 ? rightX(nRight - 1) + rightLastWidth : centerX + MATCH_W_FINAL;

  // ── Responsive vertical spacing ──
  // The bracket should FILL the screen: its natural aspect ratio is matched to
  // the available area, then the parent scales it uniformly to fit both dims.
  // With few matches the unit grows (big, airy cards); with many (32 players)
  // it shrinks to the minimum that still guarantees zero card overlap.
  const avail = availSize ?? FALLBACK_AVAIL;
  const hasSides = nLeft > 0 || nRight > 0;
  const balancedH = hasSides ? avail.h * (totalW / avail.w) : VERT_H + 2 * 46;
  const targetUnit = hasSides ? (balancedH - ROUND_LABEL_H) / matchesPerSide : MIN_UNIT;
  const unit = Math.min(MAX_UNIT, Math.max(MIN_UNIT, targetUnit));
  const bracketH = hasSides
    ? matchesPerSide * unit + ROUND_LABEL_H
    : balancedH;

  // Final match sits at the vertical CENTRE — both semis meet it on a
  // horizontal line (classic butterfly) and no dead space is left below.
  const FINAL_Y = ROUND_LABEL_H + (bracketH - ROUND_LABEL_H) / 2;

  // Memoised helper (adds top padding for round labels)
  const getCY = (round: number, pos: number) =>
    computeCenterY(round, pos, bracket.totalRounds, bracketH - ROUND_LABEL_H) + ROUND_LABEL_H;

  /** Get a human-readable round name */
  const getRoundName = (round: number, totalRounds: number): string => {
    if (round === totalRounds) return t('tournament.final');
    if (round === totalRounds - 1) return t('tournament.semiFinals');
    if (round === totalRounds - 2 && totalRounds >= 4) return t('tournament.quarterFinals');
    if (round === totalRounds - 3 && totalRounds >= 5) return t('tournament.roundOf16');
    return t('tournament.roundOf').replace('{n}', String(round));
  };

  // ── SVG connector paths ──
  const svgPaths = useMemo(() => {
    const p: Array<{ d: string; kind: 'default' | 'won' | 'playable' }> = [];
    const playableIds = new Set(playableMatches.map(m => m.id));

    const strokeFor = (target: TournamentMatch): 'default' | 'won' | 'playable' => {
      if (target.completed) return 'won';
      if (playableIds.has(target.id)) return 'playable';
      return 'default';
    };

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
        const kind = strokeFor(mIn);

        // Vertical line between the two feeders
        p.push({ d: `M ${jx} ${y1} L ${jx} ${y2}`, kind });
        // Feeder 1 → junction
        p.push({ d: `M ${oX + oW} ${y1} L ${jx} ${y1}`, kind });
        // Feeder 2 → junction
        p.push({ d: `M ${oX + oW} ${y2} L ${jx} ${y2}`, kind });
        // Junction → target
        p.push({ d: `M ${jx} ${yt} L ${iX} ${yt}`, kind });
      }
    }

    // ─ Left semi → Final ─
    if (leftRounds.length > 0 && finalMatch) {
      const semi = leftRounds[nLeft - 1].matches[0];
      if (semi) {
        const sy = getCY(leftRounds[nLeft - 1].rn, semi.position);
        const fy = FINAL_Y;
        const semiW = colWidth(leftRounds[nLeft - 1].rn);
        p.push({ d: `M ${leftX(nLeft - 1) + semiW} ${sy} L ${centerX} ${fy}`, kind: strokeFor(finalMatch) });
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
        const kind = strokeFor(mIn);

        // Vertical between feeders
        p.push({ d: `M ${jx} ${y1} L ${jx} ${y2}`, kind });
        // Feeder 1 left edge → junction
        p.push({ d: `M ${oColX} ${y1} L ${jx} ${y1}`, kind });
        // Feeder 2 left edge → junction
        p.push({ d: `M ${oColX} ${y2} L ${jx} ${y2}`, kind });
        // Junction → inner right edge
        p.push({ d: `M ${jx} ${yt} L ${iColX + MATCH_W} ${yt}`, kind });
      }
    }

    // ─ Right semi → Final ─
    if (rightRounds.length > 0 && finalMatch) {
      const semi = rightRounds[0].matches[0];
      if (semi) {
        const sy = getCY(rightRounds[0].rn, semi.position - rightRounds[0].matches.length);
        const fy = FINAL_Y;
        p.push({ d: `M ${centerX + MATCH_W_FINAL} ${fy} L ${rightX(0)} ${sy}`, kind: strokeFor(finalMatch) });
      }
    }

    return p;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- layout helpers derive from bracketH/totalW which are in deps via bracket & availSize
  }, [
    leftRounds,
    rightRounds,
    finalMatch,
    nLeft,
    bracketH,
    centerX,
    availSize,
    playableMatches,
    bracket,
  ]);

  const strokeColor = (kind: 'default' | 'won' | 'playable') =>
    kind === 'won'
      ? 'rgba(74, 222, 128, 0.45)'
      : kind === 'playable'
        ? 'rgba(34, 211, 238, 0.5)'
        : 'rgba(255, 255, 255, 0.18)';

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
          {svgPaths.map((path, i) => (
            <path
              key={i}
              d={path.d}
              stroke={strokeColor(path.kind)}
              strokeWidth={path.kind === 'default' ? 2 : 2.5}
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
              <div className="absolute left-0 right-0 text-center text-[11px] text-white/45 font-medium select-none"
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
            <div className="absolute left-0 right-0 text-center text-xs text-amber-400 font-bold select-none"
              style={{ top: 4 }}>
              {getRoundName(bracket.totalRounds, bracket.totalRounds)}
            </div>
            <div
              className="absolute"
              style={{ top: FINAL_Y, left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-yellow-500/25 to-amber-500/15 rounded-xl blur-xl -m-4" />
                <div style={{ transform: 'scale(1.1)' }}>
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
          const w = isFirstRound ? MATCH_W_FIRST : MATCH_W;
          return (
            <div
              key={`R${i}`}
              className="absolute top-0"
              style={{ left: rightX(i), width: w, height: bracketH }}
            >
              <div className="absolute left-0 right-0 text-center text-[11px] text-white/45 font-medium select-none"
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

// ─── Match Card ──────────────────────────────────────────────
// All variants have a FIXED height (VERT_H / FIRST_H) so the spacing math
// above can guarantee that adjacent cards never overlap.

function MatchCard({
  match,
  isCurrent,
  isPlayable,
  onPlay,
  done,
  isFirstRound = false,
  isFinal = false,
}: {
  match: TournamentMatch;
  isCurrent: boolean;
  isPlayable: boolean;
  onPlay: () => void;
  done: boolean;
  /** Use horizontal layout (side-by-side) for first-round matches */
  isFirstRound?: boolean;
  isFinal?: boolean;
}) {
  const { t } = useTranslation();
  const clickable = isPlayable && !done && !match.completed;

  const cardState = isCurrent && !done && !match.completed
    ? 'current'
    : match.completed
      ? 'completed'
      : isPlayable
        ? 'playable'
        : 'pending';

  const boxClasses = `relative rounded-lg border transition-all select-none ${
    cardState === 'current'
      ? 'border-2 border-cyan-400 bg-gradient-to-br from-cyan-500/25 via-purple-500/15 to-cyan-500/25 shadow-lg shadow-cyan-500/30'
      : cardState === 'completed'
        ? isFinal
          ? 'border-green-400/50 bg-green-500/10 shadow-md shadow-green-500/10'
          : 'border-green-500/40 bg-white/10'
        : cardState === 'playable'
          ? 'border-cyan-400/40 bg-white/5 cursor-pointer hover:bg-white/10 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/20'
          : 'border-white/10 bg-white/5 opacity-45'
    } ${isFinal && cardState !== 'completed' ? 'border-amber-500/60 shadow-lg shadow-amber-500/20' : ''}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onPlay();
    }
  };

  // BYE match — single slim row
  if (match.isBye && match.player1) {
    return (
      <div
        className="rounded-lg border border-white/10 bg-white/[0.03] flex items-center gap-2 px-2"
        style={{ width: isFirstRound ? MATCH_W_FIRST : MATCH_W, height: FIRST_H }}
        title={`${t('tournament.bye')} — ${match.player1.name}`}
      >
        <span className="shrink-0 text-[9px] font-bold tracking-wider text-white/35 border border-white/15 rounded px-1 py-0.5">
          {t('tournament.bye')}
        </span>
        <SmallPlayer player={match.player1} />
        <span className="ml-auto shrink-0 text-[10px] text-green-400/80 font-medium">
          ✓ {t('tournament.advanced')}
        </span>
      </div>
    );
  }

  // ── Horizontal first-round card: both players side-by-side in one row ──
  if (isFirstRound) {
    return (
      <div
        className={`${boxClasses} ${clickable ? 'hover:scale-[1.03]' : ''}`}
        style={{ width: MATCH_W_FIRST, height: FIRST_H }}
        onClick={clickable ? onPlay : undefined}
        onKeyDown={handleKeyDown}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : -1}
        aria-label={matchLabel(match, t)}
      >
        <div className="flex items-center gap-1 px-2 h-full">
          <FirstRoundPlayerRow match={match} which={1} />
          <div className="shrink-0 text-white/35 text-[9px] font-bold px-0.5">{t('tournament.vs')}</div>
          <FirstRoundPlayerRow match={match} which={2} />
        </div>
        {clickable && <PlayBadge />}
      </div>
    );
  }

  // ── Vertical card (rounds ≥ 2 + final) ──
  return (
    <div
      className={`${boxClasses} flex flex-col justify-center gap-0.5 px-1.5 py-1 ${clickable ? 'hover:scale-[1.03]' : ''}`}
      style={{ width: isFinal ? MATCH_W_FINAL : MATCH_W, height: VERT_H }}
      onClick={clickable ? onPlay : undefined}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : -1}
      aria-label={matchLabel(match, t)}
    >
      <PlayerRow match={match} which={1} />
      <div className="flex items-center justify-center gap-1 h-3.5 text-white/30">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[9px] font-bold tracking-wider">{t('tournament.vs')}</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>
      <PlayerRow match={match} which={2} />
      {clickable && <PlayBadge />}
    </div>
  );
}

function matchLabel(match: TournamentMatch, t: (_k: string) => string): string {
  return `${match.player1?.name ?? t('tournament.tbd')} ${t('tournament.vs')} ${match.player2?.name ?? t('tournament.tbd')}`;
}

/** Small pulsing ▶ badge that marks playable cards (replaces the old text row). */
function PlayBadge() {
  return (
    <div
      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center shadow shadow-cyan-500/60 animate-pulse pointer-events-none"
      aria-hidden="true"
    >
      ▶
    </div>
  );
}

// ─── Player row (vertical card) ──────────────────────────────

function PlayerRow({ match, which }: { match: TournamentMatch; which: 1 | 2 }) {
  const { t } = useTranslation();
  const player = which === 1 ? match.player1 : match.player2;
  const score = which === 1 ? match.score1 : match.score2;
  const isWinner = match.completed && !!match.winner && match.winner.id === player?.id;

  return (
    <div className={`flex items-center gap-1.5 rounded-md px-1.5 h-[30px] min-w-0 ${isWinner ? 'bg-green-500/25' : ''}`}>
      {player ? (
        <>
          {player.avatar ? (
            <img
              src={player.avatar}
              alt=""
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/20"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 border border-white/15"
              style={{ backgroundColor: player.color }}
              aria-hidden="true"
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          {isWinner && <span className="text-[10px] shrink-0" aria-hidden="true">👑</span>}
          <span className={`text-xs truncate min-w-0 ${isWinner ? 'font-bold text-green-300' : 'font-medium'}`}>
            {player.name}
          </span>
        </>
      ) : (
        <>
          <div className="w-6 h-6 rounded-full bg-white/10 shrink-0 border border-dashed border-white/20" aria-hidden="true" />
          <span className="text-xs text-white/30 truncate">{t('tournament.tbd')}</span>
        </>
      )}
      {match.completed && (
        <span className={`ml-auto shrink-0 text-xs font-bold ${isWinner ? 'text-green-400' : 'text-white/50'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Player row (horizontal first-round card) ─────────────────

function FirstRoundPlayerRow({ match, which }: { match: TournamentMatch; which: 1 | 2 }) {
  const { t } = useTranslation();
  const player = which === 1 ? match.player1 : match.player2;
  const score = which === 1 ? match.score1 : match.score2;
  const isWinner = match.completed && !!match.winner && match.winner.id === player?.id;

  return (
    <div className={`flex-1 flex items-center gap-1.5 rounded-md px-1.5 h-[32px] min-w-0 ${isWinner ? 'bg-green-500/25' : ''}`}>
      {player ? (
        <>
          {player.avatar ? (
            <img
              src={player.avatar}
              alt=""
              className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/20"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 border border-white/15"
              style={{ backgroundColor: player.color }}
              aria-hidden="true"
            >
              {player.name.charAt(0).toUpperCase()}
            </div>
          )}
          {isWinner && <span className="text-[10px] shrink-0" aria-hidden="true">👑</span>}
          <span className={`text-xs truncate min-w-0 ${isWinner ? 'font-bold text-green-300' : 'font-medium'}`}>
            {player.name}
          </span>
        </>
      ) : (
        <span className="text-xs text-white/30 truncate">{t('tournament.tbd')}</span>
      )}
      {match.completed && (
        <span className={`ml-auto shrink-0 text-xs font-bold ${isWinner ? 'text-green-400' : 'text-white/50'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

// ─── Small player row (BYE card) ──────────────────────────────

function SmallPlayer({ player }: { player: TournamentPlayer | null }) {
  if (!player) return null;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {player.avatar ? (
        <img
          src={player.avatar}
          alt=""
          className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/20"
        />
      ) : (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 border border-white/15"
          style={{ backgroundColor: player.color }}
          aria-hidden="true"
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs font-medium truncate min-w-0">{player.name}</span>
    </div>
  );
}
