'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

// Imports from extracted components (also re-exported for backward compatibility)
import { SongHighscoreModal } from '@/components/results/song-highscore-modal';
import { ScoreVisualization } from '@/components/results/score-visualization';
import type { VisualizationMode } from '@/components/results/score-visualization';
import { getCountryFlag, TrophyIcon, MAX_POINTS_PER_SONG } from '@/components/results/constants';
export { SongHighscoreModal, ScoreVisualization };
export type { VisualizationMode };
export { getCountryFlag, TrophyIcon, MAX_POINTS_PER_SONG };

// Internal imports from extracted components
import { UploadStatus } from '@/components/results/upload-status';
import { SongLeaderboardPreview } from '@/components/results/song-leaderboard-preview';
import { ShareSection } from '@/components/results/share-section';
import { QueueNextSong } from '@/components/results/queue-next-song';
import { ReplayModal } from '@/components/results/replay-modal';

// Extracted hooks
import { useReplayLoading } from './use-replay-loading';
import { useQueueNextSong } from './use-queue-next-song';
import { usePostGameProcessing } from './use-post-game-processing';

// Extracted UI components
import { ResultsRatingHeader } from './results-rating-header';
import { ResultsActions } from './results-actions';

// ===================== RESULTS SCREEN =====================
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores, setGameMode } = useGameStore();

  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [showReplay, setShowReplay] = useState(false);

  const results = gameState.results;
  const song = gameState.currentSong;

  // ---- Extracted hooks ----
  const { replayRecord } = useReplayLoading();
  const { nextQueueItem, handlePlayFromQueue } = useQueueNextSong(onPlayAgain);
  const { uploadStatus, uploadMessage } = usePostGameProcessing({
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
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Song title */}
      <div className="text-center mb-4">
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* Rating header — single or multiplayer */}
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

      {/* Score Visualization with multiple modes */}
      <ScoreVisualization
        score={playerResult.score}
        maxScore={MAX_POINTS_PER_SONG}
        accuracy={playerResult.accuracy}
        notesHit={playerResult.notesHit}
        notesMissed={playerResult.notesMissed}
        maxCombo={playerResult.maxCombo}
        rating={playerResult.rating}
        player2Score={player2Result?.score}
        player2Accuracy={player2Result?.accuracy}
        player2NotesHit={player2Result?.notesHit}
        player2NotesMissed={player2Result?.notesMissed}
        player2MaxCombo={player2Result?.maxCombo}
        player2Rating={player2Result?.rating}
        isDuel={isDuel}
      />

      {/* Upload Status */}
      <UploadStatus
        onlineEnabled={onlineEnabled}
        uploadStatus={uploadStatus}
        uploadMessage={uploadMessage}
      />

      {/* Song Leaderboard Preview */}
      <SongLeaderboardPreview
        songHighscores={songHighscores}
        activeProfileId={activeProfileId}
        currentPlayerRank={currentPlayerRank}
        onViewAll={() => setShowHighscoreModal(true)}
      />

      {/* Share Section — only for single player (duel/duet doesn't make sense to share a single player stat) */}
      {!isMultiplayer && (
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
        />
      )}

      {/* Actions */}
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
      />

      {/* Next Song from Queue - Companion Queue Integration */}
      <QueueNextSong
        nextQueueItem={nextQueueItem}
        onPlay={handlePlayFromQueue}
      />

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
