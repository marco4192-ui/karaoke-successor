'use client';

import { Badge } from '@/components/ui/badge';
import type { Difficulty } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

export type { Difficulty } from '@/types/game';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  onCycleDifficulty?: () => void;
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
 * Universal difficulty badge display.
 * When onCycleDifficulty is provided, clicking cycles through easy → medium → hard.
 * Otherwise, it's a read-only display.
 */
export function DifficultyBadge({ difficulty, onCycleDifficulty }: DifficultyBadgeProps) {
  const { t } = useTranslation();
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const label = t(DIFFICULTY_LABELS[difficulty]);

  return (
    <Badge
      variant="outline"
      onClick={onCycleDifficulty}
      className={`text-[10px] font-semibold px-2.5 py-0.5 border select-none hover:opacity-80 ${
        onCycleDifficulty ? 'cursor-pointer hover:scale-105' : 'cursor-default'
      } ${cfg.bg} ${cfg.text} ${cfg.border}`}
      style={{ boxShadow: cfg.glow, transition: 'opacity 150ms, transform 150ms' }}
      title={onCycleDifficulty ? label : undefined}
    >
      {label}
    </Badge>
  );
}
