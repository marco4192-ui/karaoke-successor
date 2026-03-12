'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { Note, LyricLine, DuetPlayer, Player, DIFFICULTY_SETTINGS, midiToNoteName } from '@/types/game';

// ===================== Duet Mode Types =====================

export interface DuetModeConfig {
  enabled: boolean;
  layout: 'horizontal' | 'vertical'; // Horizontal: top/bottom, Vertical: left/right
  showBothLyrics: boolean; // Show other player's lyrics dimmed
  p1Color: string;
  p2Color: string;
  p1Name: string;
  p2Name: string;
}

export const DEFAULT_DUET_CONFIG: DuetModeConfig = {
  enabled: false,
  layout: 'horizontal',
  showBothLyrics: true,
  p1Color: '#4ECDC4', // Teal
  p2Color: '#FF6B6B', // Red/Coral
  p1Name: 'Player 1',
  p2Name: 'Player 2',
};

// ===================== Duet Pitch Lane Component =====================

interface DuetPitchLaneProps {
  player: DuetPlayer;
  lyrics: LyricLine[];
  currentTime: number;
  detectedPitch: number | null;
  playerData: Player;
  color: string;
  playerName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  windowMs?: number; // How much time to show (default 5000ms)
  showLyrics: boolean;
  isActive: boolean; // Is this player currently singing?
}

export function DuetPitchLane({
  player,
  lyrics,
  currentTime,
  detectedPitch,
  playerData,
  color,
  playerName,
  difficulty,
  windowMs = 5000,
  showLyrics = true,
  isActive = true,
}: DuetPitchLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settings = DIFFICULTY_SETTINGS[difficulty];
  
  // Filter lyrics for this player
  const playerLyrics = useMemo(() => {
    return lyrics.filter(line => {
      if (!line.player) return true; // No player specified = both
      if (line.player === 'both') return true;
      return line.player === player;
    });
  }, [lyrics, player]);
  
  // Get visible notes in time window
  const visibleNotes = useMemo(() => {
    const notes: Array<Note & { lineIndex: number; noteIndex: number }> = [];
    
    playerLyrics.forEach((line, lineIndex) => {
      line.notes.forEach((note, noteIndex) => {
        // Check if note belongs to this player
        if (note.player && note.player !== player && note.player !== 'both') return;
        
        const noteEnd = note.startTime + note.duration;
        // Show notes that are within the window
        if (noteEnd >= currentTime - 500 && note.startTime <= currentTime + windowMs) {
          notes.push({ ...note, lineIndex, noteIndex });
        }
      });
    });
    
    return notes;
  }, [playerLyrics, currentTime, windowMs, player]);
  
  // Get current line for lyrics display
  const currentLine = useMemo(() => {
    for (const line of playerLyrics) {
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        return line;
      }
    }
    return null;
  }, [playerLyrics, currentTime]);
  
  // Get next line for preview
  const nextLine = useMemo(() => {
    for (const line of playerLyrics) {
      if (line.startTime > currentTime) {
        return line;
      }
    }
    return null;
  }, [playerLyrics, currentTime]);
  
  // Get pitch range for display
  const pitchRange = useMemo(() => {
    if (visibleNotes.length === 0) {
      return { min: 48, max: 72 }; // Default C3-C5
    }
    const pitches = visibleNotes.map(n => n.pitch);
    const min = Math.min(...pitches) - 3;
    const max = Math.max(...pitches) + 3;
    return { min, max };
  }, [visibleNotes]);
  
  // Draw the pitch lane
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, `${color}15`);
    bgGradient.addColorStop(1, `${color}05`);
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw pitch grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const pitchRangeSize = pitchRange.max - pitchRange.min;
    for (let p = pitchRange.min; p <= pitchRange.max; p++) {
      const y = height - ((p - pitchRange.min) / pitchRangeSize) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw time indicator line (current position)
    const timeIndicatorX = width * 0.2; // 20% from left
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(timeIndicatorX, 0);
    ctx.lineTo(timeIndicatorX, height);
    ctx.stroke();
    
    // Draw notes
    const pixelsPerMs = (width * 0.8) / windowMs; // 80% of width for notes window
    
    visibleNotes.forEach(note => {
      const noteStartX = timeIndicatorX + (note.startTime - currentTime) * pixelsPerMs;
      const noteWidth = Math.max(note.duration * pixelsPerMs, 2);
      const noteY = height - ((note.pitch - pitchRange.min) / pitchRangeSize) * height;
      const noteHeight = 8;
      
      // Skip notes that are too far left or right
      if (noteStartX + noteWidth < 0 || noteStartX > width) return;
      
      // Determine if note is past, current, or future
      const isPast = note.startTime + note.duration < currentTime;
      const isCurrent = note.startTime <= currentTime && note.startTime + note.duration >= currentTime;
      
      // Note color based on state
      let noteColor = color;
      let opacity = 0.8;
      
      if (isPast) {
        // Check if hit or missed (simplified)
        noteColor = playerData.notesHit > playerData.notesMissed ? '#22c55e' : '#ef4444';
        opacity = 0.5;
      } else if (isCurrent) {
        noteColor = color;
        opacity = 1;
      }
      
      if (note.isGolden) {
        noteColor = '#ffd700';
      }
      
      // Draw note bar
      ctx.fillStyle = noteColor;
      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.roundRect(noteStartX, noteY - noteHeight / 2, noteWidth, noteHeight, 4);
      ctx.fill();
      
      // Draw lyric text below note
      if (showLyrics && noteStartX > 0 && noteStartX < width) {
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.globalAlpha = 0.8;
        ctx.fillText(note.lyric, noteStartX, noteY + noteHeight + 12);
      }
      
      ctx.globalAlpha = 1;
    });
    
    // Draw detected pitch indicator
    if (detectedPitch && isActive) {
      const pitchY = height - ((detectedPitch - pitchRange.min) / pitchRangeSize) * height;
      
      // Only draw if in range
      if (pitchY > 0 && pitchY < height) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(timeIndicatorX, pitchY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Pitch name label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(midiToNoteName(Math.round(detectedPitch)), timeIndicatorX + 10, pitchY + 4);
        ctx.globalAlpha = 1;
      }
    }
  }, [visibleNotes, currentTime, detectedPitch, color, windowMs, pitchRange, showLyrics, isActive, playerData]);
  
  return (
    <div className={`relative flex-1 ${isActive ? '' : 'opacity-50'}`}>
      {/* Player Header */}
      <div 
        className="absolute top-0 left-0 right-0 z-10 px-3 py-1 flex items-center justify-between"
        style={{ backgroundColor: `${color}30` }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-bold" style={{ color }}>
            {playerName}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/60">
            Score: <span className="text-white font-bold">{playerData.score.toLocaleString()}</span>
          </span>
          <span className="text-white/60">
            Combo: <span className="text-white font-bold">{playerData.combo}x</span>
          </span>
          <span className="text-white/60">
            <span className="text-white font-bold">{playerData.accuracy.toFixed(1)}%</span>
          </span>
        </div>
      </div>
      
      {/* Pitch Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full h-full"
        style={{ minHeight: '150px' }}
      />
      
      {/* Lyrics Display */}
      {showLyrics && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          {currentLine && (
            <p className="text-lg text-center font-medium text-white">
              {currentLine.text}
            </p>
          )}
          {nextLine && !currentLine && (
            <p className="text-sm text-center text-white/50">
              ♪ {nextLine.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== Duet Mode Container =====================

interface DuetModeContainerProps {
  lyrics: LyricLine[];
  currentTime: number;
  players: [Player, Player]; // Exactly 2 players for duet
  detectedPitches: [number | null, number | null]; // P1 and P2 pitches
  config: DuetModeConfig;
  difficulty: 'easy' | 'medium' | 'hard';
  activePlayer?: DuetPlayer; // Which player's turn it is (for 'both' lines)
}

export function DuetModeContainer({
  lyrics,
  currentTime,
  players,
  detectedPitches,
  config,
  difficulty,
  activePlayer,
}: DuetModeContainerProps) {
  const layoutClass = config.layout === 'horizontal' 
    ? 'flex-col' 
    : 'flex-row';
  
  // Determine which player is active for the current line
  const currentLine = useMemo(() => {
    for (const line of lyrics) {
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        return line;
      }
    }
    return null;
  }, [lyrics, currentTime]);
  
  // Determine active players based on current line
  const p1Active = useMemo(() => {
    if (!currentLine) return true;
    if (!currentLine.player) return true;
    if (currentLine.player === 'both') return true;
    return currentLine.player === 'P1';
  }, [currentLine]);
  
  const p2Active = useMemo(() => {
    if (!currentLine) return true;
    if (!currentLine.player) return true;
    if (currentLine.player === 'both') return true;
    return currentLine.player === 'P2';
  }, [currentLine]);
  
  return (
    <div className={`flex ${layoutClass} h-full w-full gap-1`}>
      {/* Player 1 Lane */}
      <DuetPitchLane
        player="P1"
        lyrics={lyrics}
        currentTime={currentTime}
        detectedPitch={detectedPitches[0]}
        playerData={players[0]}
        color={config.p1Color}
        playerName={config.p1Name}
        difficulty={difficulty}
        showLyrics={config.showBothLyrics}
        isActive={p1Active}
      />
      
      {/* Divider */}
      <div 
        className="flex-shrink-0"
        style={{ 
          width: config.layout === 'vertical' ? '2px' : '100%',
          height: config.layout === 'horizontal' ? '2px' : '100%',
          background: `linear-gradient(${config.layout === 'horizontal' ? '90deg' : '0deg'}, ${config.p1Color}, ${config.p2Color})`
        }}
      />
      
      {/* Player 2 Lane */}
      <DuetPitchLane
        player="P2"
        lyrics={lyrics}
        currentTime={currentTime}
        detectedPitch={detectedPitches[1]}
        playerData={players[1]}
        color={config.p2Color}
        playerName={config.p2Name}
        difficulty={difficulty}
        showLyrics={config.showBothLyrics}
        isActive={p2Active}
      />
    </div>
  );
}

// ===================== Helper Functions =====================

// Check if a song has duet data
export function isDuetSong(lyrics: LyricLine[]): boolean {
  for (const line of lyrics) {
    if (line.player && line.player !== 'both') {
      return true;
    }
    for (const note of line.notes) {
      if (note.player && note.player !== 'both') {
        return true;
      }
    }
  }
  return false;
}

// Auto-detect duet player assignment from UltraStar format
// In UltraStar, P1/P2 is typically marked with special note types or metadata
export function detectDuetAssignments(lyrics: LyricLine[]): LyricLine[] {
  let currentPlayer: DuetPlayer = 'P1';
  
  return lyrics.map(line => {
    // Check if line has explicit player assignment
    if (line.player) {
      currentPlayer = line.player;
      return line;
    }
    
    // Auto-assign based on pattern (alternating lines is common in duets)
    const assignedPlayer = currentPlayer;
    
    // Toggle player for next line (if not 'both')
    if (currentPlayer === 'P1') {
      currentPlayer = 'P2';
    } else if (currentPlayer === 'P2') {
      currentPlayer = 'P1';
    }
    
    return {
      ...line,
      player: assignedPlayer,
      notes: line.notes.map(note => ({
        ...note,
        player: assignedPlayer,
      })),
    };
  });
}
