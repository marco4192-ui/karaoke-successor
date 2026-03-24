'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/lib/game/store';
import { Song, Player, GameMode, HighscoreEntry } from '@/types/game';
import { getExtendedStats, updateStatsAfterGame, saveExtendedStats, calculateSongXP, getLevelForXP } from '@/lib/game/player-progression';
import { createShareableCard, downloadScoreCard, shareScoreCard } from '@/lib/game/share-results';
import { ScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';

// Constants
const MAX_POINTS_PER_SONG = 10000;

// Country options for flag display
const COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = [
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
];

// Icons
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// Country flag helper
export function getCountryFlag(code?: string): string {
  if (!code) return '';
  return COUNTRY_OPTIONS.find(c => c.code === code)?.flag || '';
}

// Song Highscore Modal Component
export function SongHighscoreModal({ 
  song, 
  isOpen, 
  onClose 
}: { 
  song: Song; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const { highscores, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [globalScores, setGlobalScores] = useState<HighscoreEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get local highscores for this song
  const localScores = useMemo(() => 
    highscores
      .filter(h => h.songId === song.id)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    [highscores, song.id]
  );

  // Load global scores when tab is active
  useEffect(() => {
    if (isOpen && onlineEnabled && leaderboardType === 'global') {
      setIsLoading(true);
      setError(null);
      
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        leaderboardService.getSongLeaderboard(song.id, 10)
          .then(scores => {
            const entries = scores.map((s): HighscoreEntry => ({
              id: String(s.id),
              playerId: s.player_id,
              playerName: s.player_name || 'Unknown',
              playerAvatar: s.player_avatar,
              playerColor: '#FF6B6B',
              songId: song.id,
              songTitle: song.title,
              artist: song.artist,
              score: s.score,
              accuracy: s.max_score > 0 ? (s.score / s.max_score) * 100 : 0,
              maxCombo: s.max_combo,
              difficulty: s.difficulty === 1 ? 'easy' : s.difficulty === 2 ? 'medium' : 'hard',
              gameMode: s.game_mode as GameMode,
              rating: 'good',
              rankTitle: '',
              playedAt: new Date(s.created_at).getTime(),
            }));
            setGlobalScores(entries);
          })
          .catch(err => setError(err.message || 'Failed to load'))
          .finally(() => setIsLoading(false));
      });
    }
  }, [isOpen, onlineEnabled, leaderboardType, song.id, song.title, song.artist]);

  const displayScores = leaderboardType === 'global' ? globalScores : localScores;

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            {song.title}
          </DialogTitle>
          <DialogDescription className="text-white/60 text-sm">{song.artist} - Highscores</DialogDescription>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={() => setLeaderboardType('local')}
            size="sm"
            className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
          >
            🏠 Local ({localScores.length})
          </Button>
          {onlineEnabled && (
            <Button 
              onClick={() => setLeaderboardType('global')}
              size="sm"
              className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🌍 Global
            </Button>
          )}
        </div>

        {/* Score List */}
        <ScrollArea className="flex-1 -mx-6">
          <div className="px-6 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mr-2" />
                <span className="text-white/60">Loading...</span>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8 text-red-400">{error}</div>
            )}
            
            {!isLoading && !error && displayScores.length === 0 && (
              <div className="text-center py-8 text-white/60">
                {leaderboardType === 'global' 
                  ? 'No global scores yet. Be the first!'
                  : 'No local scores yet. Play this song!'}
              </div>
            )}
            
            {!isLoading && !error && displayScores.map((entry, index) => (
              <div 
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  index < 3 ? 'bg-white/10' : 'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-300 text-black' :
                  index === 2 ? 'bg-orange-500 text-black' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                {/* Player */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                  style={{ backgroundColor: entry.playerColor }}
                >
                  {entry.playerAvatar ? (
                    <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                  ) : (
                    entry.playerName[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{entry.playerName}</div>
                  {leaderboardType === 'local' && (
                    <div className="text-xs text-white/40">{entry.accuracy.toFixed(1)}% • {entry.maxCombo}x combo</div>
                  )}
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                  <div className="text-xs text-white/40">
                    {leaderboardType === 'local' ? entry.difficulty : 'pts'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="pt-4">
          <Button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===================== SCORE VISUALIZATION COMPONENTS =====================
type VisualizationMode = 'table' | 'barometer' | 'speedometer' | 'radar' | 'comparison';

// Score Visualization Component with multiple display modes
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
}: { 
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
}) {
  const [mode, setMode] = useState<VisualizationMode>('barometer');
  
  const percentage = (score / maxScore) * 100;
  const player2Percentage = player2Score ? (player2Score / maxScore) * 100 : 0;
  
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
        {/* MODE: Barometer / Füllstandsanzeige */}
        {mode === 'barometer' && (
          <div className="space-y-6">
            {/* Main Score Barometer */}
            <div className="relative">
              <div className="text-center mb-4">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {score.toLocaleString()}
                </span>
                <span className="text-white/40 ml-2">/ {maxScore.toLocaleString()}</span>
              </div>
              
              {/* Thermometer-style barometer */}
              <div className="relative h-12 bg-gradient-to-r from-red-500/30 via-yellow-500/30 via-green-500/30 to-cyan-500/30 rounded-full overflow-hidden border border-white/20">
                {/* Score marker */}
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000 flex items-center justify-end pr-2"
                  style={{ width: `${Math.min(100, percentage)}%` }}
                >
                  {percentage > 20 && (
                    <span className="text-white font-bold text-sm">{percentage.toFixed(1)}%</span>
                  )}
                </div>
                
                {/* Grade markers */}
                <div className="absolute inset-0 flex items-center pointer-events-none">
                  <div className="w-1/5 border-r border-white/20 h-full" />
                  <div className="w-1/5 border-r border-white/20 h-full" />
                  <div className="w-1/5 border-r border-white/20 h-full" />
                  <div className="w-1/5 border-r border-white/20 h-full" />
                </div>
              </div>
              
              {/* Grade labels */}
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>0</span>
                <span className="text-red-400">Poor</span>
                <span className="text-orange-400">Okay</span>
                <span className="text-blue-400">Good</span>
                <span className="text-green-400">Excellent</span>
                <span className="text-yellow-400">Perfect</span>
              </div>
            </div>
            
            {/* Duel Comparison */}
            {isDuel && player2Score !== undefined && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-sm font-semibold mb-3 text-center">⚔️ Duel Comparison</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Player 1 */}
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center mx-auto mb-2 font-bold">P1</div>
                    <div className="text-2xl font-bold text-cyan-400">{score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">{accuracy.toFixed(1)}% accuracy</div>
                    <div className="text-xs text-white/40">{maxCombo}x max combo</div>
                  </div>
                  {/* Player 2 */}
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center mx-auto mb-2 font-bold">P2</div>
                    <div className="text-2xl font-bold text-pink-400">{player2Score.toLocaleString()}</div>
                    <div className="text-xs text-white/40">{player2Accuracy?.toFixed(1)}% accuracy</div>
                    <div className="text-xs text-white/40">{player2MaxCombo}x max combo</div>
                  </div>
                </div>
                {/* Win indicator */}
                <div className="mt-4 text-center">
                  <span className={`px-4 py-1 rounded-full text-sm font-bold ${
                    score > player2Score ? 'bg-cyan-500/30 text-cyan-300' :
                    score < player2Score ? 'bg-pink-500/30 text-pink-300' :
                    'bg-purple-500/30 text-purple-300'
                  }`}>
                    {score > player2Score ? '🏆 P1 WINS!' : score < player2Score ? '🏆 P2 WINS!' : '🤝 DRAW!'}
                  </span>
                </div>
              </div>
            )}
            
            {/* Sub-statistics barometer */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-white/40 mb-1">Notes Hit</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${notesHit + notesMissed > 0 ? (notesHit / (notesHit + notesMissed)) * 100 : 0}%` }} />
                </div>
                <div className="text-xs text-green-400 mt-1">{notesHit} / {notesHit + notesMissed}</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Accuracy</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${accuracy}%` }} />
                </div>
                <div className="text-xs text-cyan-400 mt-1">{accuracy.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1">Max Combo</div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, (maxCombo / Math.max(notesHit, 1)) * 100)}%` }} />
                </div>
                <div className="text-xs text-purple-400 mt-1">{maxCombo}x</div>
              </div>
            </div>
          </div>
        )}
        
        {/* MODE: Speedometer / Tacho */}
        {mode === 'speedometer' && (
          <div className="flex flex-col items-center py-4">
            <div className="relative w-64 h-32">
              {/* Speedometer background */}
              <svg viewBox="0 0 200 100" className="w-full h-full">
                {/* Background arc */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                {/* Colored sections */}
                <path d="M 20 100 A 80 80 0 0 1 60 35" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
                <path d="M 60 35 A 80 80 0 0 1 100 20" fill="none" stroke="#f97316" strokeWidth="20" strokeLinecap="round" />
                <path d="M 100 20 A 80 80 0 0 1 140 35" fill="none" stroke="#22c55e" strokeWidth="20" strokeLinecap="round" />
                <path d="M 140 35 A 80 80 0 0 1 180 100" fill="none" stroke="#06b6d4" strokeWidth="20" strokeLinecap="round" />
                
                {/* Needle */}
                <g transform={`rotate(${(percentage / 100) * 180 - 90}, 100, 100)`}>
                  <line x1="100" y1="100" x2="100" y2="25" stroke="url(#needleGradient)" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="100" cy="100" r="8" fill="white" />
                </g>
                
                <defs>
                  <linearGradient id="needleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Score display */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <div className="text-3xl font-black text-white">{score.toLocaleString()}</div>
                <div className="text-xs text-white/40">/ {maxScore.toLocaleString()}</div>
              </div>
            </div>
            
            {/* Rating badge */}
            <div className={`mt-4 px-6 py-2 rounded-full font-bold text-lg ${
              rating === 'perfect' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black' :
              rating === 'excellent' ? 'bg-gradient-to-r from-green-400 to-cyan-500 text-white' :
              rating === 'good' ? 'bg-gradient-to-r from-blue-400 to-purple-500 text-white' :
              rating === 'okay' ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white' :
              'bg-gradient-to-r from-red-400 to-red-600 text-white'
            }`}>
              {rating.toUpperCase()}
            </div>
            
            {/* Duel speedometers */}
            {isDuel && player2Score !== undefined && (
              <div className="mt-6 grid grid-cols-2 gap-8 w-full">
                <div className="text-center">
                  <div className="text-sm text-cyan-400 font-semibold">Player 1</div>
                  <div className="text-xl font-bold">{score.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-pink-400 font-semibold">Player 2</div>
                  <div className="text-xl font-bold">{player2Score.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* MODE: Radar / Spider Chart */}
        {mode === 'radar' && (
          <div className="flex flex-col items-center py-4">
            <svg viewBox="0 0 200 200" className="w-64 h-64">
              {/* Background circles */}
              {[0.2, 0.4, 0.6, 0.8, 1].map((r, i) => (
                <polygon
                  key={i}
                  points={Array.from({ length: 5 }, (_, j) => {
                    const angle = (j * 72 - 90) * (Math.PI / 180);
                    return `${100 + r * 70 * Math.cos(angle)},${100 + r * 70 * Math.sin(angle)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              ))}
              
              {/* Axis lines */}
              {Array.from({ length: 5 }, (_, i) => {
                const angle = (i * 72 - 90) * (Math.PI / 180);
                return (
                  <line
                    key={i}
                    x1="100"
                    y1="100"
                    x2={100 + 70 * Math.cos(angle)}
                    y2={100 + 70 * Math.sin(angle)}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Data polygon - Player 1 */}
              <polygon
                points={[
                  { label: 'Score', value: percentage / 100 },
                  { label: 'Accuracy', value: accuracy / 100 },
                  { label: 'Combo', value: Math.min(1, maxCombo / Math.max(notesHit, 1)) },
                  { label: 'Consistency', value: notesHit + notesMissed > 0 ? notesHit / (notesHit + notesMissed) : 0 },
                  { label: 'Rating', value: rating === 'perfect' ? 1 : rating === 'excellent' ? 0.8 : rating === 'good' ? 0.6 : rating === 'okay' ? 0.4 : 0.2 },
                ].map((d, i) => {
                  const angle = (i * 72 - 90) * (Math.PI / 180);
                  return `${100 + d.value * 70 * Math.cos(angle)},${100 + d.value * 70 * Math.sin(angle)}`;
                }).join(' ')}
                fill="rgba(6, 182, 212, 0.3)"
                stroke="rgba(6, 182, 212, 0.8)"
                strokeWidth="2"
              />
              
              {/* Player 2 polygon (if duel) */}
              {isDuel && player2Score !== undefined && (
                <polygon
                  points={[
                    { value: player2Percentage / 100 },
                    { value: (player2Accuracy || 0) / 100 },
                    { value: Math.min(1, (player2MaxCombo || 0) / Math.max(player2NotesHit || 1, 1)) },
                    { value: (player2NotesHit || 0) + (player2NotesMissed || 0) > 0 ? (player2NotesHit || 0) / ((player2NotesHit || 0) + (player2NotesMissed || 0)) : 0 },
                    { value: player2Rating === 'perfect' ? 1 : player2Rating === 'excellent' ? 0.8 : player2Rating === 'good' ? 0.6 : player2Rating === 'okay' ? 0.4 : 0.2 },
                  ].map((d, i) => {
                    const angle = (i * 72 - 90) * (Math.PI / 180);
                    return `${100 + d.value * 70 * Math.cos(angle)},${100 + d.value * 70 * Math.sin(angle)}`;
                  }).join(' ')}
                  fill="rgba(236, 72, 153, 0.2)"
                  stroke="rgba(236, 72, 153, 0.6)"
                  strokeWidth="2"
                />
              )}
              
              {/* Labels */}
              {['Score', 'Accuracy', 'Combo', 'Consistency', 'Rating'].map((label, i) => {
                const angle = (i * 72 - 90) * (Math.PI / 180);
                return (
                  <text
                    key={label}
                    x={100 + 85 * Math.cos(angle)}
                    y={100 + 85 * Math.sin(angle)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white/60 text-xs"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>
            
            {/* Legend */}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                <span className="text-xs text-white/60">Player 1</span>
              </div>
              {isDuel && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-pink-500" />
                  <span className="text-xs text-white/60">Player 2</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* MODE: Classic Table */}
        {mode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-white/40 font-normal">Category</th>
                  <th className="text-right py-2 px-3 text-white/40 font-normal">Player 1</th>
                  {isDuel && <th className="text-right py-2 px-3 text-white/40 font-normal">Player 2</th>}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Final Score</td>
                  <td className="py-2 px-3 text-right font-bold text-cyan-400">{score.toLocaleString()}</td>
                  {isDuel && <td className="py-2 px-3 text-right font-bold text-pink-400">{player2Score?.toLocaleString()}</td>}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Max Score</td>
                  <td className="py-2 px-3 text-right text-white/60">{maxScore.toLocaleString()}</td>
                  {isDuel && <td className="py-2 px-3 text-right text-white/60">{maxScore.toLocaleString()}</td>}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Rating</td>
                  <td className="py-2 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      rating === 'perfect' ? 'bg-yellow-500/30 text-yellow-300' :
                      rating === 'excellent' ? 'bg-green-500/30 text-green-300' :
                      rating === 'good' ? 'bg-blue-500/30 text-blue-300' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {rating.toUpperCase()}
                    </span>
                  </td>
                  {isDuel && <td className="py-2 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      player2Rating === 'perfect' ? 'bg-yellow-500/30 text-yellow-300' :
                      player2Rating === 'excellent' ? 'bg-green-500/30 text-green-300' :
                      player2Rating === 'good' ? 'bg-blue-500/30 text-blue-300' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {player2Rating?.toUpperCase()}
                    </span>
                  </td>}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Notes Hit</td>
                  <td className="py-2 px-3 text-right text-green-400">{notesHit}</td>
                  {isDuel && <td className="py-2 px-3 text-right text-green-400">{player2NotesHit}</td>}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Notes Missed</td>
                  <td className="py-2 px-3 text-right text-red-400">{notesMissed}</td>
                  {isDuel && <td className="py-2 px-3 text-right text-red-400">{player2NotesMissed}</td>}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 px-3">Accuracy</td>
                  <td className="py-2 px-3 text-right text-cyan-400">{accuracy.toFixed(1)}%</td>
                  {isDuel && <td className="py-2 px-3 text-right text-pink-400">{player2Accuracy?.toFixed(1)}%</td>}
                </tr>
                <tr>
                  <td className="py-2 px-3">Max Combo</td>
                  <td className="py-2 px-3 text-right text-purple-400">{maxCombo}x</td>
                  {isDuel && <td className="py-2 px-3 text-right text-purple-400">{player2MaxCombo}x</td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        
        {/* MODE: Comparison (Duel focused) */}
        {mode === 'comparison' && (
          <div className="space-y-4">
            {/* Score comparison bar */}
            <div>
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>Player 1</span>
                <span>Score Battle</span>
                <span>Player 2</span>
              </div>
              <div className="relative h-8 bg-white/5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-end pr-2"
                  style={{ width: `${score + (player2Score || 0) > 0 ? (score / (score + (player2Score || 1))) * 100 : 50}%` }}
                >
                  <span className="text-xs font-bold text-white">{score.toLocaleString()}</span>
                </div>
                <div 
                  className="bg-gradient-to-l from-pink-500 to-pink-400 flex items-center justify-start pl-2"
                  style={{ width: `${score + (player2Score || 0) > 0 ? ((player2Score || 0) / (score + (player2Score || 1))) * 100 : 50}%` }}
                >
                  <span className="text-xs font-bold text-white">{player2Score?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Stat comparison */}
            {isDuel && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="space-y-2">
                  <div className="text-cyan-400 font-semibold">P1</div>
                  <div className={`py-1 rounded ${accuracy > (player2Accuracy || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                    {accuracy.toFixed(1)}%
                  </div>
                  <div className={`py-1 rounded ${maxCombo > (player2MaxCombo || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                    {maxCombo}x
                  </div>
                  <div className={`py-1 rounded ${notesHit > (player2NotesHit || 0) ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                    {notesHit}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-white/40 font-semibold">Stat</div>
                  <div className="py-1 text-white/60">Accuracy</div>
                  <div className="py-1 text-white/60">Combo</div>
                  <div className="py-1 text-white/60">Notes</div>
                </div>
                <div className="space-y-2">
                  <div className="text-pink-400 font-semibold">P2</div>
                  <div className={`py-1 rounded ${(player2Accuracy || 0) > accuracy ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
                    {player2Accuracy?.toFixed(1)}%
                  </div>
                  <div className={`py-1 rounded ${(player2MaxCombo || 0) > maxCombo ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
                    {player2MaxCombo}x
                  </div>
                  <div className={`py-1 rounded ${(player2NotesHit || 0) > notesHit ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-white/40'}`}>
                    {player2NotesHit}
                  </div>
                </div>
              </div>
            )}
            
            {/* Winner announcement */}
            <div className="text-center py-4">
              <div className={`inline-block px-6 py-3 rounded-xl ${
                score > (player2Score || 0) ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 border border-cyan-500/50' :
                score < (player2Score || 0) ? 'bg-gradient-to-r from-pink-500/20 to-pink-400/20 border border-pink-500/50' :
                'bg-gradient-to-r from-purple-500/20 to-purple-400/20 border border-purple-500/50'
              }`}>
                <span className="text-2xl">
                  {score > (player2Score || 0) ? '🏆' : score < (player2Score || 0) ? '🏆' : '🤝'}
                </span>
                <span className="ml-2 font-bold">
                  {score > (player2Score || 0) ? 'Player 1 Wins!' : score < (player2Score || 0) ? 'Player 2 Wins!' : 'Draw!'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== RESULTS SCREEN =====================
export function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { gameState, resetGame, addHighscore, profiles, activeProfileId, onlineEnabled, updateProfile, highscores } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const results = gameState.results;
  const song = gameState.currentSong;

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

  // Save highscore when results are shown (only once)
  useEffect(() => {
    if (results && song && activeProfileId && !savedToHighscoreRef.current) {
      const playerResult = results.players[0];
      const profile = profiles.find(p => p.id === activeProfileId);
      
      if (profile && playerResult) {
        // Save to local highscore
        addHighscore({
          playerId: profile.id,
          playerName: profile.name,
          playerAvatar: profile.avatar,
          playerColor: profile.color,
          songId: song.id,
          songTitle: song.title,
          artist: song.artist,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          difficulty: gameState.difficulty,
          gameMode: gameState.gameMode,
          rating: playerResult.rating,
        });
        savedToHighscoreRef.current = true;
        
        // UPDATE PLAYER PROGRESSION (XP, Level, Rank, Titles)
        const currentStats = getExtendedStats();
        const xpResult = updateStatsAfterGame(currentStats, {
          songId: song.id,
          songTitle: song.title,
          genre: song.genre,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          perfectNotes: Math.floor(playerResult.notesHit * 0.6),
          goldenNotes: 0, // Would need to track this during gameplay
          difficulty: gameState.difficulty,
          mode: gameState.gameMode,
          duration: song.duration,
        });
        saveExtendedStats(xpResult.stats);
        
        // UPDATE ACTIVE PROFILE XP AND LEVEL (character-based progression)
        const earnedXP = calculateSongXP(
          playerResult.score,
          playerResult.accuracy,
          playerResult.maxCombo,
          Math.floor(playerResult.notesHit * 0.6),
          0, // goldenNotes - would need to track during gameplay
          undefined // challengeMode
        );
        const currentProfileXP = profile.xp || 0;
        const newTotalXP = currentProfileXP + earnedXP;
        const levelInfo = getLevelForXP(newTotalXP);
        updateProfile(profile.id, {
          xp: newTotalXP,
          level: levelInfo.level,
        });
        
        // Show XP earned notification if leveled up or got new titles
        if (xpResult.leveledUp) {
          // Level up happened
        }
        if (xpResult.newTitles.length > 0) {
          // New titles unlocked
        }

        // Upload to global leaderboard if enabled and player allows it
        if (onlineEnabled && (profile.privacy?.showOnLeaderboard ?? true)) {
          setUploadStatus('uploading');
          
          import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
            // First, ensure player is registered/updated
            const playerPromise = leaderboardService.savePlayer(profile);
            
            // Then, register the song
            const songPromise = leaderboardService.registerSong(song);
            
            // Wait for both, then submit score
            Promise.all([playerPromise, songPromise])
              .then(() => {
                // Calculate notes stats from game state
                const perfectNotes = Math.floor(playerResult.notesHit * 0.6); // Estimate
                const goodNotes = Math.floor(playerResult.notesHit * 0.4); // Estimate
                
                return leaderboardService.submitScore(
                  profile,
                  song,
                  playerResult.score,
                  10000, // maxScore baseline
                  {
                    perfectNotes,
                    goodNotes,
                    missedNotes: playerResult.notesMissed,
                    maxCombo: playerResult.maxCombo,
                  },
                  gameState.difficulty,
                  gameState.gameMode
                );
              })
              .then((result) => {
                setUploadStatus('success');
                if (result.is_new_high_score) {
                  setUploadMessage('🎉 New global high score!');
                } else {
                  setUploadMessage(`Uploaded! Rank #${result.rank}`);
                }
              })
              .catch((err) => {
                setUploadStatus('error');
                setUploadMessage(err.message || 'Upload failed');
              });
          });
        }
      }
    }
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled, updateProfile]);

  if (!results || !song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No results available</p>
        <Button onClick={onHome} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Home</Button>
      </div>
    );
  }

  const playerResult = results.players[0];
  const ratingColors: Record<string, string> = {
    perfect: 'from-yellow-400 to-orange-500',
    excellent: 'from-green-400 to-cyan-500',
    good: 'from-blue-400 to-purple-500',
    okay: 'from-gray-400 to-gray-500',
    poor: 'from-red-400 to-red-600',
  };

  // Get active profile for display
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  // Create Player object for ScoreDisplay
  const playerForDisplay: Player = {
    id: 'current',
    name: activeProfile?.name || 'Player',
    score: playerResult.score,
    combo: 0,
    maxCombo: playerResult.maxCombo,
    accuracy: playerResult.accuracy,
    notesHit: playerResult.notesHit,
    notesMissed: playerResult.notesMissed,
    color: activeProfile?.color || '#FF6B6B',
    avatar: activeProfile?.avatar,
    starPower: 0,
    isStarPowerActive: false,
    notes: [],
    totalNotes: playerResult.notesHit + playerResult.notesMissed,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-4`}>
          <h1 className="text-4xl font-black text-white uppercase">{playerResult.rating}!</h1>
        </div>
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* Score Visualization with multiple modes */}
      <ScoreVisualization
        score={playerResult.score}
        maxScore={MAX_POINTS_PER_SONG}
        accuracy={playerResult.accuracy}
        notesHit={playerResult.notesHit}
        notesMissed={playerResult.notesMissed}
        maxCombo={playerResult.maxCombo}
        rating={playerResult.rating}
      />

      {/* Upload Status */}
      {onlineEnabled && uploadStatus !== 'idle' && (
        <Card className={`mb-8 ${
          uploadStatus === 'uploading' ? 'bg-blue-500/10 border-blue-500/30' :
          uploadStatus === 'success' ? 'bg-green-500/10 border-green-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <CardContent className="py-4 flex items-center justify-center gap-3">
            {uploadStatus === 'uploading' && (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-blue-400">Uploading to global leaderboard...</span>
              </>
            )}
            {uploadStatus === 'success' && (
              <span className="text-green-400">{uploadMessage}</span>
            )}
            {uploadStatus === 'error' && (
              <span className="text-red-400">⚠️ {uploadMessage}</span>
            )}
          </CardContent>
        </Card>
      )}

      {/* Song Highscores Preview */}
      {songHighscores.length > 0 && (
        <Card className="bg-white/5 border-white/10 mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                Song Leaderboard
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHighscoreModal(true)}
                className="text-purple-400 hover:text-purple-300"
              >
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {songHighscores.slice(0, 3).map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    entry.playerId === activeProfileId ? 'bg-cyan-500/20' : 'bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-300 text-black' :
                    index === 2 ? 'bg-orange-500 text-black' :
                    'bg-white/10'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="flex-1 text-sm truncate">{entry.playerName}</span>
                  <span className="text-sm font-bold text-cyan-400">{entry.score.toLocaleString()}</span>
                  {entry.playerId === activeProfileId && currentPlayerRank && (
                    <Badge className="bg-cyan-500/30 text-cyan-300 text-xs">You #{currentPlayerRank}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  score={{
                    id: 'current',
                    playerId: activeProfileId || '',
                    playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                    playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                    playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                    songId: song.id,
                    songTitle: song.title,
                    artist: song.artist,
                    score: playerResult.score,
                    accuracy: playerResult.accuracy,
                    maxCombo: playerResult.maxCombo,
                    difficulty: gameState.difficulty,
                    gameMode: gameState.gameMode,
                    rating: playerResult.rating,
                    rankTitle: '',
                    playedAt: Date.now(),
                  }}
                  playerName={profiles.find(p => p.id === activeProfileId)?.name || 'Player'}
                  playerAvatar={profiles.find(p => p.id === activeProfileId)?.avatar}
                />
              )}
            </TabsContent>
            
            <TabsContent value="video">
              {song && playerResult && (
                <ShortsCreator
                  song={song}
                  score={{
                    id: 'current',
                    playerId: activeProfileId || '',
                    playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                    playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                    songId: song.id,
                    songTitle: song.title,
                    artist: song.artist,
                    score: playerResult.score,
                    accuracy: playerResult.accuracy,
                    maxCombo: playerResult.maxCombo,
                    difficulty: gameState.difficulty,
                    gameMode: gameState.gameMode,
                    rating: playerResult.rating,
                    rankTitle: '',
                    playedAt: Date.now(),
                  }}
                  audioUrl={song.audioUrl}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Share Buttons */}
      <div className="flex gap-2 justify-center mb-4">
        <Button
          variant="outline"
          onClick={() => {
            if (playerResult && song) {
              const card = createShareableCard({
                id: '',
                playerId: '',
                playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                songId: song.id,
                songTitle: song.title,
                artist: song.artist,
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                difficulty: gameState.difficulty,
                gameMode: gameState.gameMode,
                rating: playerResult.rating,
                rankTitle: '',
                playedAt: Date.now(),
              });
              downloadScoreCard(card);
            }
          }}
          className="border-purple-500/50 text-purple-400"
        >
          📥 Download Card
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            if (playerResult && song) {
              const card = createShareableCard({
                id: '',
                playerId: '',
                playerName: profiles.find(p => p.id === activeProfileId)?.name || 'Player',
                playerAvatar: profiles.find(p => p.id === activeProfileId)?.avatar,
                playerColor: profiles.find(p => p.id === activeProfileId)?.color || '#FF6B6B',
                songId: song.id,
                songTitle: song.title,
                artist: song.artist,
                score: playerResult.score,
                accuracy: playerResult.accuracy,
                maxCombo: playerResult.maxCombo,
                difficulty: gameState.difficulty,
                gameMode: gameState.gameMode,
                rating: playerResult.rating,
                rankTitle: '',
                playedAt: Date.now(),
              });
              const success = await shareScoreCard(card);
              if (!success) {
                alert('Sharing not supported. Card downloaded instead.');
                downloadScoreCard(card);
              }
            }
          }}
          className="border-cyan-500/50 text-cyan-400"
        >
          📤 Share Score
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button 
          variant="outline"
          onClick={() => setShowHighscoreModal(true)}
          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-4"
        >
          <TrophyIcon className="w-4 h-4 mr-2" /> Scores
        </Button>
        <Button onClick={() => { resetGame(); onPlayAgain(); }} className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8">
          Play Again
        </Button>
        <Button variant="outline" onClick={() => { resetGame(); onHome(); }} className="border-white/20 text-white px-8">
          Back to Home
        </Button>
      </div>

      {/* Song Highscore Modal */}
      {song && (
        <SongHighscoreModal
          song={song}
          isOpen={showHighscoreModal}
          onClose={() => setShowHighscoreModal(false)}
        />
      )}
    </div>
  );
}
