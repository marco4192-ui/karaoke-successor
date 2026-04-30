'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeAlert } from '@/lib/safe-dialog';
import { Song, HighscoreEntry, GameMode, Difficulty } from '@/types/game';
import { createShareableCard, downloadScoreCard, shareScoreCard, copyScoreToClipboard, copyScoreImageToClipboard } from '@/lib/game/share-results';
import { ScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';

interface ShareSectionProps {
  song: Song;
  playerResult: {
    score: number;
    accuracy: number;
    maxCombo: number;
    notesHit: number;
    notesMissed: number;
    rating: string;
  };
  activeProfileId: string | null;
  playerName: string;
  playerAvatar: string | undefined;
  playerColor: string;
  difficulty: Difficulty;
  gameMode: GameMode;
}

export function ShareSection({
  song,
  playerResult,
  activeProfileId,
  playerName,
  playerAvatar,
  playerColor,
  difficulty,
  gameMode,
}: ShareSectionProps) {
  const buildScoreEntry = (): HighscoreEntry => ({
    id: 'current',
    playerId: activeProfileId || '',
    playerName,
    playerAvatar,
    playerColor,
    songId: song.id,
    songTitle: song.title,
    artist: song.artist,
    score: playerResult.score,
    accuracy: playerResult.accuracy,
    maxCombo: playerResult.maxCombo,
    difficulty,
    gameMode,
    rating: playerResult.rating as HighscoreEntry['rating'],
    rankTitle: '',
    playedAt: Date.now(),
  });

  return (
    <>
      {/* Share Section */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            📤 Share Your Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="card" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="card">📸 Score Card</TabsTrigger>
              <TabsTrigger value="video">🎬 Video Short</TabsTrigger>
            </TabsList>
            
            <TabsContent value="card">
              {song && playerResult && (
                <ScoreCard
                  song={song}
                  score={buildScoreEntry()}
                  playerName={playerName}
                  playerAvatar={playerAvatar}
                />
              )}
            </TabsContent>
            
            <TabsContent value="video">
              {song && playerResult && (
                <ShortsCreator
                  song={song}
                  score={buildScoreEntry()}
                  audioUrl={song.audioUrl}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        <Button
          variant="outline"
          onClick={async () => {
            const card = createShareableCard(buildScoreEntry());
            const success = await copyScoreToClipboard(card);
            safeAlert(success ? 'Score text copied!' : 'Failed to copy');
          }}
          className="border-green-500/50 text-green-400"
        >
          📋 Copy Text
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const card = createShareableCard(buildScoreEntry());
            const success = await copyScoreImageToClipboard(card);
            safeAlert(success ? 'Score image copied!' : 'Failed to copy image');
          }}
          className="border-green-500/50 text-green-400"
        >
          🖼️ Copy Image
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const card = createShareableCard(buildScoreEntry());
            downloadScoreCard(card);
          }}
          className="border-purple-500/50 text-purple-400"
        >
          📥 Download Card
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            const card = createShareableCard(buildScoreEntry());
            const success = await shareScoreCard(card);
            if (!success) {
              safeAlert('Sharing not supported. Card downloaded instead.');
              downloadScoreCard(card);
            }
          }}
          className="border-cyan-500/50 text-cyan-400"
        >
          📤 Share Score
        </Button>
      </div>
    </>
  );
}
