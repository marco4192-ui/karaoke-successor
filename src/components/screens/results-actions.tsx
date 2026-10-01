'use client';

import { Button } from '@/components/ui/button';
import { TrophyIcon } from '@/components/results/constants';
import { useTranslation } from '@/lib/i18n/translations';

interface QueueNextInfo {
  songTitle: string;
  songArtist: string;
}

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
  /** R42: next queue song — rendered as the leading segment of the SAME
   *  bottom bar so all actions live in one place (user request 2.4). */
  queueNext?: QueueNextInfo | null;
  onPlayQueueNext?: () => void;
}

/**
 * R42 — ONE bundled action bar at the end of the results screen:
 * [▶ Next from queue] [🏆 Scores] [▶ Replay] [Play again] [End].
 * Formerly the queue card, the four action buttons and the queue-next card
 * were three separate blocks spread across the screen.
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
  queueNext,
  onPlayQueueNext,
}: ResultsActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      {/* Queue segment — compact inline chip, not a separate card */}
      {queueNext && onPlayQueueNext && (
        <div
          className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-4 py-2"
          data-testid="results-queue-next"
        >
          <span className="text-xl shrink-0" aria-hidden>📋</span>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] uppercase tracking-wide text-white/40 leading-tight">{t('queueNextSong.label')}</p>
            <p className="text-sm font-semibold truncate leading-tight">
              {queueNext.songTitle}
              <span className="text-white/40 font-normal"> · {queueNext.songArtist}</span>
            </p>
          </div>
          <Button
            size="sm"
            onClick={onPlayQueueNext}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 shrink-0"
          >
            ▶ {t('queueNextSong.playNext')}
          </Button>
        </div>
      )}

      {/* Main actions — always the LAST row of the screen */}
      <div className="flex flex-wrap gap-2 sm:gap-3 justify-center items-center">
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
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
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
    </div>
  );
}
