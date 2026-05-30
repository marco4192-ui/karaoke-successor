'use client';

import { Button } from '@/components/ui/button';
import { TrophyIcon } from '@/components/results/constants';

interface ResultsActionsProps {
  onShowHighscores: () => void;
  hasReplay: boolean;
  onShowReplay: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
  scoresLabel: string;
  replayLabel: string;
  playAgainLabel: string;
  backToHomeLabel: string;
}

/**
 * Action bar displayed at the bottom of the results screen:
 * Scores, Replay, Play Again, and Back to Home buttons.
 */
export function ResultsActions({
  onShowHighscores,
  hasReplay,
  onShowReplay,
  onPlayAgain,
  onHome,
  scoresLabel,
  replayLabel,
  playAgainLabel,
  backToHomeLabel,
}: ResultsActionsProps) {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        variant="outline"
        onClick={onShowHighscores}
        className="border-[#ffd60a]/50 text-[#ffd60a] hover:bg-[#ffd60a]/10 hover:shadow-[0_0_12px_rgba(255,214,10,0.2)] px-4 transition-shadow"
      >
        <TrophyIcon className="w-4 h-4 mr-2" /> {scoresLabel}
      </Button>
      {hasReplay && (
        <Button
          variant="outline"
          onClick={onShowReplay}
          className="border-[#00e5ff]/50 text-[#00e5ff] hover:bg-[#00e5ff]/10 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] px-4 transition-shadow"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {replayLabel}
        </Button>
      )}
      <Button onClick={onPlayAgain} className="bg-gradient-to-r from-[#00e5ff] to-[#bf5af2] px-8 shadow-[0_0_20px_rgba(0,229,255,0.3)] hover:shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-shadow text-white font-bold">
        {playAgainLabel}
      </Button>
      <Button variant="outline" onClick={onHome} className="border-[#00e5ff]/30 text-[#00e5ff] px-8 hover:bg-[#00e5ff]/10 hover:shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-shadow">
        {backToHomeLabel}
      </Button>
    </div>
  );
}
