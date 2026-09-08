'use client';

import { Badge } from '@/components/ui/badge';
import type { Difficulty } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

export type { Difficulty } from '@/types/game';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { bg: string; text: string; border: string; glow: string }> = {
  easy: {
    bg: 'bg-green-500/20',
    text: 'text-green-300',
    border: 'border-green-400/40',
    glow: '0 0 12px rgba(74,222,128,0.25)',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-300',
    border: 'border-yellow-400/40',
    glow: '0 0 12px rgba(250,204,21,0.25)',
  },
  hard: {
    bg: 'bg-red-500/20',
    text: 'text-red-300',
    border: 'border-red-400/40',
    glow: '0 0 12px rgba(248,113,113,0.25)',
  },
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'song.easy',
  medium: 'song.medium',
  hard: 'song.hard',
};

/**
 * Universal difficulty badge display — READ-ONLY.
 * Purely informational: no click handler, no cycling (the difficulty is
 * configured in the party setup, not changed mid-game via the badge).
 */
export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const { t } = useTranslation();
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const label = t(DIFFICULTY_LABELS[difficulty]);

  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold px-2.5 py-0.5 border select-none cursor-default flex items-center h-10 ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ boxShadow: cfg.glow }}
      title={label}
      aria-label={label}
      data-testid="hud-difficulty-badge"
    >
      {label}
    </Badge>
  );
}
