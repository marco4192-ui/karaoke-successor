'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ===================== SCORE VISUALIZATION COMPONENTS =====================
export type VisualizationMode = 'table' | 'barometer' | 'speedometer' | 'radar' | 'comparison';

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
