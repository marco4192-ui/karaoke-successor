'use client';

/**
 * R72/A: outlier badge — shown next to the verified badge on song boards
 * when the server stored soft anti-cheat flags (ac_flags) for an entry.
 * A flag is NOT a rejection: the score stays on the board, but users can
 * see that it is statistically conspicuous (e.g. 'stale_proof',
 * 'near_max_low_accuracy', 'new_profile_top10').
 */
export function OutlierFlagBadge({ flags }: { flags?: string[] | null }) {
  if (!flags || flags.length === 0) return null;
  return (
    <span
      className="inline-flex items-center text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-1.5 py-0.5"
      title={`⚠ ${flags.join(', ')}`}
      aria-label="flagged as outlier"
      data-testid="outlier-flag-badge"
    >
      ⚠
    </span>
  );
}
