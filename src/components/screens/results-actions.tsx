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
        className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-4"
      >
        <TrophyIcon className="w-4 h-4 mr-2" /> {scoresLabel}
      </Button>
      {hasReplay && (
        <Button
          variant="outline"
          onClick={onShowReplay}
          className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-4"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {replayLabel}
        </Button>
      )}
      <Button onClick={onPlayAgain} className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8">
        {playAgainLabel}
      </Button>
      <Button variant="outline" onClick={onHome} className="border-white/20 text-white px-8">
        {backToHomeLabel}
      </Button>
    </div>
  );
}
