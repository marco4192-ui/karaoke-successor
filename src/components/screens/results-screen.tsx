'use client';

import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

// Imports from extracted components (also re-exported for backward compatibility)
import { SongHighscoreModal } from '@/components/results/song-highscore-modal';
import { MAX_POINTS_PER_SONG } from '@/components/results/constants';
export { SongHighscoreModal };


// Internal imports from extracted components
import { UploadStatus } from '@/components/results/upload-status';
import { SongLeaderboardPreview } from '@/components/results/song-leaderboard-preview';
import { ShareSection } from '@/components/results/share-section';
import { ReplayModal } from '@/components/results/replay-modal';
import { ResultsStatsPanel } from '@/components/results/results-stats-panel';

// Extracted hooks
import { useReplayLoading } from './use-replay-loading';
import { useQueueNextSong } from './use-queue-next-song';
import { usePostGameProcessing } from './use-post-game-processing';

// Extracted UI components
import { ResultsRatingHeader } from './results-rating-header';
import { ResultsActions } from './results-actions';

// ===================== RESULTS SCREEN =====================
/**
 * R42 — one-screen results layout (1920×1080 base, no scrolling):
 *
 *   ┌ Song title ────────────────────────── upload status ┐
 *   │ LEFT: rating · stats · leaderboard  │ RIGHT: ShareBox │
 *   └ [Queue next] [Scores] [Replay] [Play again] [End]    ┘
 *
 * Formerly a long scrolling stack of five visualization modes, a huge share
 * section with six loose buttons and action blocks scattered across three
 * separate areas (user feedback 2.1–2.5).
 */
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores, setGameMode } = useGameStore();

  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  // Listen for remote companion action commands (scores, play_again)
  useEffect(() => {
    const handleRemoteAction = (e: Event) => {
      const { action } = (e as CustomEvent).detail;
      if (action === 'scores') setShowHighscoreModal(true);
      if (action === 'play_again') { resetGame(); onPlayAgain(); }
    };
    window.addEventListener('remote-results-action', handleRemoteAction);
    return () => window.removeEventListener('remote-results-action', handleRemoteAction);
  }, [resetGame, onPlayAgain]);

  const results = gameState.results;
  const song = gameState.currentSong;

  // ---- Extracted hooks ----
  const { replayRecord } = useReplayLoading();
  const { nextQueueItem, handlePlayFromQueue } = useQueueNextSong(onPlayAgain);
  const { uploadStatus, uploadMessage, isVerified } = usePostGameProcessing({
    results,
    song,
    activeProfileId,
    profiles,
    gameState,
    addHighscore,
    onlineEnabled,
    updateProfile,
    t,
  });

  // Get song highscores for comparison
  const songHighscores = useMemo(() => {
    if (!song) return [];
    return highscores
      .filter(h => h.songId === song.id)
      .sort((a, b) => b.score - a.score);
  }, [highscores, song]);

  // Find player's rank on this song
  const currentPlayerRank = useMemo(() => {
    if (!song || !activeProfileId) return null;
    const index = songHighscores.findIndex(h => h.playerId === activeProfileId);
    return index >= 0 ? index + 1 : null;
  }, [songHighscores, activeProfileId, song]);

  const isDuel = gameState.gameMode === 'duel';
  const isDuet = gameState.gameMode === 'duet';
  const isMultiplayer = isDuel || isDuet;

  if (!results || !song || !results.players || results.players.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">{t('resultsScreen.noResults')}</p>
        <Button onClick={onHome} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">{t('results.backToHome')}</Button>
      </div>
    );
  }

  const playerResult = results.players[0];
  const player2Result = results.players[1] || null;

  // Get active profile for display
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const player2Profile = player2Result ? profiles.find(p => p.id === player2Result.playerId) : null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
      {/* ── Header row: song title (left) + upload status (right) ── */}
      <div className="flex items-start justify-between gap-4 mb-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl xl:text-2xl font-bold text-white truncate">{song.title}</h2>
          <p className="text-white/60 text-sm truncate">{song.artist}</p>
        </div>
        <div className="shrink-0 pt-1">
          <UploadStatus
            onlineEnabled={onlineEnabled}
            uploadStatus={uploadStatus}
            uploadMessage={uploadMessage}
            isVerified={isVerified}
            compact
          />
        </div>
      </div>

      {/* ── Main area: essentials left, share box right ── */}
      <div className="flex-1 min-h-0 grid gap-4 xl:gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* LEFT column — the essential evaluation */}
        <div className="min-h-0 flex flex-col gap-3 xl:gap-4">
          <ResultsRatingHeader
            isMultiplayer={isMultiplayer}
            isDuel={isDuel}
            isDuet={isDuet}
            playerResult={playerResult}
            player2Result={player2Result}
            activeProfileName={activeProfile?.name || ''}
            player2ProfileName={player2Profile?.name}
            duetPlayerNames={song.duetPlayerNames}
            playerLabel={t('resultsScreen.player')}
            drawLabel={t('results.draw')}
            t={t}
          />

          <ResultsStatsPanel
            playerResult={playerResult}
            player2Result={player2Result}
            player1Name={activeProfile?.name || t('resultsScreen.player')}
            player2Name={player2Profile?.name}
            isDuel={isDuel}
            maxScore={MAX_POINTS_PER_SONG}
            durationSeconds={results.duration}
            difficulty={gameState.difficulty}
            isBlindMode={results.isBlindMode}
          />

          <SongLeaderboardPreview
            songHighscores={songHighscores}
            song={song}
            activeProfileId={activeProfileId}
            currentPlayerRank={currentPlayerRank}
            onViewAll={() => setShowHighscoreModal(true)}
            compact
          />
        </div>

        {/* RIGHT column — the social-media box (single player only) */}
        <div className="min-h-0 flex flex-col">
          {!isMultiplayer ? (
            <ShareSection
              song={song}
              playerResult={{
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                notesHit: playerResult.notesHit,
                notesMissed: playerResult.notesMissed,
                rating: playerResult.rating,
              }}
              activeProfileId={activeProfileId}
              playerName={activeProfile?.name || t('resultsScreen.player')}
              playerAvatar={activeProfile?.avatar}
              playerColor={activeProfile?.color || '#FF6B6B'}
              difficulty={gameState.difficulty}
              gameMode={gameState.gameMode}
              compact
            />
          ) : (
            /* Multiplayer: keep the right column calm — duet/duet stats already
               live in the left column; a single-player share card makes no sense. */
            <div className="hidden lg:flex flex-col items-center justify-center text-center text-white/30 gap-3 p-6">
              <span className="text-5xl" aria-hidden>{isDuel ? '⚔️' : '🎤'}</span>
              <p className="text-sm max-w-xs">{isDuel ? t('resultsScreen.duelShareHint') : t('resultsScreen.duetShareHint')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bundled actions at the END of the screen (2.4) ── */}
      <div className="mt-4 shrink-0 pb-1">
        <ResultsActions
          onShowHighscores={() => setShowHighscoreModal(true)}
          hasReplay={!!replayRecord}
          onShowReplay={() => setShowReplay(true)}
          onPlayAgain={() => { resetGame(); onPlayAgain(); }}
          onHome={() => { resetGame(); setGameMode('standard'); onHome(); }}
          scoresLabel={t('resultsScreen.scores')}
          replayLabel={t('resultsScreen.replay')}
          playAgainLabel={t('results.playAgain')}
          backToHomeLabel={t('results.backToHome')}
          queueNext={nextQueueItem ? { songTitle: nextQueueItem.songTitle, songArtist: nextQueueItem.songArtist } : null}
          onPlayQueueNext={handlePlayFromQueue}
        />
      </div>

      {/* Song Highscore Modal */}
      {song && (
        <SongHighscoreModal
          song={song}
          isOpen={showHighscoreModal}
          onClose={() => setShowHighscoreModal(false)}
        />
      )}

      {/* Replay Modal */}
      {replayRecord && (
        <ReplayModal
          isOpen={showReplay}
          onClose={() => setShowReplay(false)}
          replay={replayRecord}
          originalAudioUrl={song?.audioUrl}
        />
      )}
    </div>
  );
}
