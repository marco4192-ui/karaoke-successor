'use client';

import { Badge } from '@/components/ui/badge';

type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  onCycleDifficulty?: () => void;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; bg: string; text: string; border: string }> = {
  easy:   { label: 'Leicht', bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30' },
  medium: { label: 'Mittel', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  hard:   { label: 'Schwer', bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30' },
};

/**
 * Universal difficulty badge display.
 * When onCycleDifficulty is provided, clicking cycles through easy → medium → hard.
 * Otherwise, it's a read-only display.
 */
export function DifficultyBadge({ difficulty, onCycleDifficulty }: DifficultyBadgeProps) {
  const cfg = DIFFICULTY_CONFIG[difficulty];

  return (
    <Badge
      variant="outline"
      onClick={onCycleDifficulty}
      className={`text-[10px] px-2 py-0.5 border-white/20 select-none hover:opacity-80 ${
        onCycleDifficulty ? 'cursor-pointer' : 'cursor-default'
      } ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      {cfg.label}
    </Badge>
  );
}
