'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScoreBarometerView,
  ScoreSpeedometerView,
  ScoreRadarView,
  ScoreTableView,
  ScoreComparisonView,
} from './score-views';

type VisualizationMode = 'table' | 'barometer' | 'speedometer' | 'radar' | 'comparison';

interface ScoreVisualizationProps {
  score: number;
  maxScore: number;
  accuracy: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  rating: string;
  player2Score?: number;
  player2Accuracy?: number;
  player2NotesHit?: number;
  player2NotesMissed?: number;
  player2MaxCombo?: number;
  player2Rating?: string;
  isDuel?: boolean;
}

export function ScoreVisualization({
  score,
  maxScore,
  accuracy,
  notesHit,
  notesMissed,
  maxCombo,
  rating,
  player2Score,
  player2Accuracy,
  player2NotesHit,
  player2NotesMissed,
  player2MaxCombo,
  player2Rating,
  isDuel,
}: ScoreVisualizationProps) {
  const [mode, setMode] = useState<VisualizationMode>('barometer');

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Score Analysis</CardTitle>
          <div className="flex gap-1">
            {(['barometer', 'speedometer', 'radar', 'table', 'comparison'] as VisualizationMode[]).map((m) => (
              <Button
                key={m}
                variant={mode === m ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode(m)}
                className={`text-xs px-2 ${mode === m ? 'bg-purple-500' : 'text-white/60'}`}
              >
                {m === 'table' ? '📊' : m === 'barometer' ? '🌡️' : m === 'speedometer' ? '🎯' : m === 'radar' ? '🕸️' : '⚔️'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === 'barometer' && (
          <ScoreBarometerView
            score={score}
            maxScore={maxScore}
            accuracy={accuracy}
            notesHit={notesHit}
            notesMissed={notesMissed}
            maxCombo={maxCombo}
            rating={rating}
            player2Score={player2Score}
            player2Accuracy={player2Accuracy}
            player2MaxCombo={player2MaxCombo}
            isDuel={isDuel}
          />
        )}

        {mode === 'speedometer' && (
          <ScoreSpeedometerView
            score={score}
            maxScore={maxScore}
            rating={rating}
            player2Score={player2Score}
            isDuel={isDuel}
          />
        )}

        {mode === 'radar' && (
          <ScoreRadarView
            score={score}
            maxScore={maxScore}
            accuracy={accuracy}
            notesHit={notesHit}
            notesMissed={notesMissed}
            maxCombo={maxCombo}
            rating={rating}
            player2Score={player2Score}
            player2Accuracy={player2Accuracy}
            player2NotesHit={player2NotesHit}
            player2NotesMissed={player2NotesMissed}
            player2MaxCombo={player2MaxCombo}
            player2Rating={player2Rating}
            isDuel={isDuel}
          />
        )}

        {mode === 'table' && (
          <ScoreTableView
            score={score}
            maxScore={maxScore}
            accuracy={accuracy}
            notesHit={notesHit}
            notesMissed={notesMissed}
            maxCombo={maxCombo}
            rating={rating}
            player2Score={player2Score}
            player2Accuracy={player2Accuracy}
            player2NotesHit={player2NotesHit}
            player2NotesMissed={player2NotesMissed}
            player2MaxCombo={player2MaxCombo}
            player2Rating={player2Rating}
            isDuel={isDuel}
          />
        )}

        {mode === 'comparison' && (
          <ScoreComparisonView
            score={score}
            accuracy={accuracy}
            notesHit={notesHit}
            maxCombo={maxCombo}
            player2Score={player2Score}
            player2Accuracy={player2Accuracy}
            player2NotesHit={player2NotesHit}
            player2MaxCombo={player2MaxCombo}
            isDuel={isDuel}
          />
        )}
      </CardContent>
    </Card>
  );
}
