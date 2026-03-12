'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGlobalKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useGameStore, selectQueue, selectProfiles, selectActiveProfile } from '@/lib/game/store';
import { getAllSongs, addSong, addSongs, reloadLibrary, getAllSongsAsync, updateSong, clearCustomSongs } from '@/lib/game/song-library';
import { 
  getPlaylists, 
  createPlaylist, 
  deletePlaylist, 
  addSongToPlaylist, 
  removeSongFromPlaylist, 
  getPlaylistSongs,
  getPlaylistById,
  toggleFavorite,
  isFavorite,
  initializePlaylists,
  Playlist
} from '@/lib/playlist-manager';
import { ImportScreen } from '@/components/import/import-screen';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { ScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';
import { KaraokeEditor } from '@/components/editor/karaoke-editor';
import { AIAssistantPanel } from '@/components/editor/panels/ai-assistant-panel';
import { 
  Song, 
  Player, 
  Difficulty, 
  GameMode, 
  LyricLine, 
  Note,
  DIFFICULTY_SETTINGS,
  SCORE_VALUES,
  PLAYER_COLORS,
  midiToNoteName,
  frequencyToMidi,
  PlayerProfile,
  HighscoreEntry,
  getRankTitle,
  RANKING_TITLES
} from '@/types/game';
import { ACHIEVEMENT_DEFINITIONS, unlockAchievement, checkAchievement, getRarityColor, getCategoryIcon } from '@/lib/game/achievements';
import { PRACTICE_MODE_DEFAULTS, PLAYBACK_RATES, PitchGuidePlayer, PracticeModeConfig } from '@/lib/game/practice-mode';
import { StarPowerBar, PerformanceDisplay } from '@/components/game/game-enhancements';
import { NoteLane } from '@/components/game/note-lane';
import { ScoreDisplay } from '@/components/game/score-display';
import { registerServiceWorker, isPWAInstalled, promptPWAInstall, initPWAInstall, canInstallPWA, onInstallAvailabilityChange, isTauriMode as checkIsTauriMode } from '@/lib/game/pwa';
import { AudioEffectsEngine } from '@/lib/audio/audio-effects';
import { leaderboardService } from '@/lib/api/leaderboard-service';
import { createShareableCard, generateShareText, downloadScoreCard, shareScoreCard, getShareUrls } from '@/lib/game/share-results';
import { createEmptyPerformanceStats, updatePerformanceStats, calculatePerformanceRating, getPerformanceGrade, formatPlayTime, getPerformanceTrend } from '@/lib/game/performance-analytics';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { createDuelMatch, updateDuelScore, determineDuelWinner, generateRoomCode, MultiplayerPlayer, DuelMatch } from '@/lib/game/multiplayer';
import { getMicrophoneManager, getMultiMicrophoneManager, MicrophoneDevice, MicrophoneStatus, AssignedMicrophone } from '@/lib/audio/microphone-manager';
import { useTranslation, LANGUAGE_NAMES, LANGUAGE_FLAGS, Language } from '@/lib/i18n/translations';
import { TournamentSetupScreen, TournamentBracketView } from '@/components/game/tournament-screen';
import { BattleRoyaleSetupScreen, BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import { TournamentBracket, TournamentMatch } from '@/lib/game/tournament';
import { BattleRoyaleGame as BattleRoyaleGameState } from '@/lib/game/battle-royale';
import { MusicReactiveBackground, AnimatedGradientBackground } from '@/components/game/music-reactive-background';
import { 
  getDailyChallenge, 
  getPlayerDailyStats, 
  getXPLevel, 
  getTimeUntilReset, 
  isChallengeCompletedToday,
  XP_REWARDS,
  DAILY_BADGES,
} from '@/lib/game/daily-challenge';
import { 
  WebcamBackground, 
  WebcamSettingsPanel, 
  WebcamQuickControls,
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { LiveStreamingPanel, QuickStreamButton } from '@/components/streaming/live-streaming';
import { OnlineLobby } from '@/components/multiplayer/online-lobby';
import { 
  RANKS, 
  TITLES, 
  CHALLENGE_MODES, 
  getRankForXP, 
  getLevelForXP, 
  getExtendedStats, 
  saveExtendedStats, 
  updateStatsAfterGame,
  calculateSongXP,
  ExtendedPlayerStats,
  getRarityColor as getRarityColorProgression
} from '@/lib/game/player-progression';

// QR Code generator (simple version)
function generateQRCode(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

// ===================== PITCH CLASS UTILITIES (UltraStar-style relative pitch) =====================
// UltraStar/SingStar use "pitch class" for scoring - notes are compared modulo 12 (one octave)
// This means singing C3 instead of C4 still counts as correct (same note, different octave)

/**
 * Get the pitch class (0-11) from a MIDI note number
 * Pitch class represents the note name regardless of octave (C=0, C#=1, ... B=11)
 * IMPORTANT: Rounds to nearest integer before computing pitch class
 * This ensures that slight pitch detection variations (e.g., 60.2 or 59.8) are correctly mapped
 */
function getPitchClass(midiNote: number): number {
  return ((Math.round(midiNote) % 12) + 12) % 12; // Round and ensure positive result
}

/**
 * Calculate the relative pitch difference between two MIDI notes
 * Uses UltraStar-style octave wrapping: notes in the same pitch class have 0 difference
 * Maximum difference is 6 semitones (half an octave)
 * 
 * Examples:
 * - C4 vs C5 = 0 (same pitch class, different octave)
 * - C4 vs C#4 = 1 (one semitone apart)
 * - C4 vs B3 = 1 (wrapping around the octave: C(0) to B(11) = min(11, 12-11) = 1)
 * - C4 vs G4 = 5 (five semitones apart)
 * - C4 vs F#4 = 6 (six semitones = triton, maximum distance)
 */
function getRelativePitchDiff(sungNote: number, targetNote: number): number {
  const sungClass = getPitchClass(sungNote);
  const targetClass = getPitchClass(targetNote);
  
  // Calculate the shortest distance on the pitch class circle
  // Example: C (0) to G (7) = min(7, 12-7) = 5 semitones
  let diff = Math.abs(sungClass - targetClass);
  if (diff > 6) {
    diff = 12 - diff;
  }
  
  return diff;
}

// Maximum points per song (for normalized scoring to 10,000)
const MAX_POINTS_PER_SONG = 10000;

// Scoring tick interval in milliseconds (how often we evaluate pitch)
const SCORING_TICK_INTERVAL = 100; // 100ms = 10 evaluations per second

// Multipliers for different note types
const GOLDEN_NOTE_MULTIPLIER = 5;      // Golden notes get 5x points
const PERFECT_NOTE_MULTIPLIER = 2;     // Perfect notes (all ticks hit) get 2x bonus
const PERFECT_GOLDEN_MULTIPLIER = 10;  // Perfect golden notes: 5x × 2x = 10x

/**
 * NEW SCORING SYSTEM: Duration-based scoring
 * 
 * Each note is divided into "ticks" based on its duration.
 * Every tick is evaluated independently throughout the note's duration.
 * 
 * Scoring formula:
 * - Total note ticks = sum of all note durations (in beats)
 * - Golden note ticks = sum of golden note durations
 * - Normal note ticks = total - golden
 * 
 * Perfect score calculation:
 * - Normal perfect = normal ticks × 2 (perfect bonus)
 * - Golden perfect = golden ticks × 10 (5× golden × 2× perfect)
 * - Perfect score = (normal × 2) + (golden × 10)
 * - Points per tick = 10000 / perfect_score_base
 * 
 * Each tick awards points based on pitch accuracy.
 * Perfect note bonus (2x) when ALL ticks of a note are hit correctly.
 * Golden notes get 5x multiplier.
 * Perfect golden notes get 10x total (5× × 2×).
 */

interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean; // All ticks hit
}

interface ScoringMetadata {
  totalNoteTicks: number;      // Sum of all note durations in beats
  goldenNoteTicks: number;     // Sum of golden note durations
  normalNoteTicks: number;     // total - golden
  perfectScoreBase: number;    // (normal × 2) + (golden × 5)
  pointsPerTick: number;       // 10000 / perfectScoreBase
}

/**
 * Calculate scoring metadata for a song
 * This pre-computes the values needed for duration-based scoring
 */
function calculateScoringMetadata(notes: Array<{ duration: number; isGolden: boolean }>, beatDuration: number): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;
  
  for (const note of notes) {
    // Duration in beats (each tick = 1 beat worth of time)
    const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) {
      goldenNoteTicks += ticksInNote;
    }
  }
  
  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  
  // Perfect score = normal ticks × 2 + golden ticks × 10 (5× golden × 2× perfect)
  const perfectScoreBase = (normalNoteTicks * PERFECT_NOTE_MULTIPLIER) + (goldenNoteTicks * PERFECT_GOLDEN_MULTIPLIER);
  
  // Points per tick to reach 10000 on perfect song
  const pointsPerTick = perfectScoreBase > 0 ? MAX_POINTS_PER_SONG / perfectScoreBase : 1;
  
  return {
    totalNoteTicks,
    goldenNoteTicks,
    normalNoteTicks,
    perfectScoreBase,
    pointsPerTick
  };
}

/**
 * Evaluate a single tick of a note
 * Returns accuracy (0-1) and whether it counts as a hit
 */
function evaluateTick(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty
): { accuracy: number; isHit: boolean; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' } {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  
  // For hard mode, require exact pitch (no octave tolerance)
  const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
  
  if (relativeDiff > effectiveTolerance) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }
  
  // Calculate accuracy (1.0 = perfect, decreases with pitch difference)
  const accuracy = 1 - (relativeDiff / (effectiveTolerance + 1));
  
  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';
  
  if (accuracy > 0.95) {
    displayType = 'Perfect';
  } else if (accuracy > 0.8) {
    displayType = 'Great';
  } else if (accuracy > 0.6) {
    displayType = 'Good';
  } else if (accuracy > 0.4) {
    displayType = 'Okay';
  }
  
  return { accuracy, isHit: true, displayType };
}

/**
 * Calculate points for a tick hit
 * Difficulty affects scoring through noteScoreMultiplier
 */
function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
  difficulty: Difficulty
): number {
  if (accuracy <= 0) return 0;
  
  const settings = DIFFICULTY_SETTINGS[difficulty];
  let points = pointsPerTick * accuracy * settings.noteScoreMultiplier;
  
  // Golden notes get 5x multiplier
  if (isGolden) {
    points *= GOLDEN_NOTE_MULTIPLIER;
  }
  
  return points;
}

/**
 * Calculate bonus points when a note is completed
 * Returns bonus points if all ticks were hit (perfect note)
 * 
 * Perfect normal note: 2x bonus (total 2x)
 * Perfect golden note: 10x total (5x during singing + 5x bonus = 10x)
 */
function calculateNoteCompletionBonus(
  noteProgress: NoteProgress,
  pointsPerTick: number
): number {
  // Only award bonus if ALL ticks were hit
  if (noteProgress.ticksHit < noteProgress.totalTicks) {
    return 0;
  }
  
  // Perfect note bonus: double the points for this note
  // Points already earned during singing = ticksHit × pointsPerTick × (golden ? 5 : 1)
  // Bonus = same amount again (effectively 2x total for normal, 10x for golden)
  const basePoints = noteProgress.totalTicks * pointsPerTick;
  
  if (noteProgress.isGolden) {
    // Golden notes: 5x during singing + 5x bonus = 10x total
    return basePoints * GOLDEN_NOTE_MULTIPLIER;
  } else {
    // Normal notes: 1x during singing + 1x bonus = 2x total
    return basePoints;
  }
}

/**
 * Legacy function for backward compatibility
 * Calculate points based on pitch accuracy with UltraStar-style scoring
 */
function calculatePoints(
  sungNote: number, 
  targetNote: number, 
  difficulty: Difficulty,
  combo: number,
  isGolden: boolean,
  isBonus: boolean,
  totalNotes: number = 100 // For score normalization
): { points: number; hitType: 'perfect' | 'good' | 'okay' | 'miss'; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; octaveBonus: boolean } {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  
  // Check if octave bonus applies (sang correct pitch class but different octave)
  const octaveDiff = Math.abs(Math.round(sungNote) - Math.round(targetNote));
  const isOctaveJump = relativeDiff === 0 && octaveDiff >= 12;
  
  // For hard mode, require exact pitch (no octave tolerance)
  const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
  
  // Calculate normalized base points so max score = 10,000
  // Each note is worth roughly MAX_POINTS_PER_SONG / totalNotes
  const baseNoteValue = Math.max(10, Math.floor(MAX_POINTS_PER_SONG / Math.max(totalNotes, 50)));
  
  let points = 0;
  let hitType: 'perfect' | 'good' | 'okay' | 'miss' = 'miss';
  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';
  
  if (relativeDiff <= effectiveTolerance) {
    // Calculate accuracy (1.0 = perfect, decreases with pitch difference)
    const accuracy = 1 - (relativeDiff / (effectiveTolerance + 1));
    
    if (accuracy > 0.95) {
      // Perfect - exact pitch match
      points = baseNoteValue * settings.noteScoreMultiplier;
      hitType = 'perfect';
      displayType = 'Perfect';
    } else if (accuracy > 0.8) {
      // Great - very close pitch
      points = Math.floor(baseNoteValue * 0.75 * settings.noteScoreMultiplier);
      hitType = 'perfect'; // Treat as perfect for combo purposes
      displayType = 'Great';
    } else if (accuracy > 0.6) {
      // Good - acceptable pitch
      points = Math.floor(baseNoteValue * 0.5 * settings.noteScoreMultiplier);
      hitType = 'good';
      displayType = 'Good';
    } else if (accuracy > 0.4) {
      // Okay - barely acceptable
      points = Math.floor(baseNoteValue * 0.25 * settings.noteScoreMultiplier);
      hitType = 'okay';
      displayType = 'Okay';
    }
    
    // Apply combo bonus (max 50% bonus at high combos)
    if (points > 0) {
      const comboMultiplier = 1 + Math.min(0.5, combo * 0.02 * (settings.comboMultiplier - 1));
      points = Math.floor(points * comboMultiplier);
      
      // Golden note bonus (50% extra)
      if (isGolden) {
        points = Math.floor(points * 1.5);
      }
      
      // Bonus note multiplier (freestyle notes)
      if (isBonus) {
        points = Math.floor(points * 1.25);
      }
      
      // Reduce points for octave jumps (still counts, but slightly lower)
      if (isOctaveJump) {
        points = Math.floor(points * 0.85);
      }
    }
  }
  
  return { points: Math.floor(points), hitType, displayType, octaveBonus: isOctaveJump };
}

// Screen types
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'editor' | 'online';

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  // All hooks must be called before any conditional returns
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [screen, setScreen] = useState<Screen>('home');
  const [importedSongs, setImportedSongs] = useState<Song[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { gameState, setSong, setDifficulty, setGameMode, addPlayer, updatePlayer, createProfile, profiles, activeProfileId, setActiveProfile, queue, addToQueue, removeFromQueue, highscores, getTopHighscores } = useGameStore();
  
  // Tournament state
  const [tournamentBracket, setTournamentBracket] = useState<TournamentBracket | null>(null);
  const [tournamentSongDuration, setTournamentSongDuration] = useState(60);
  const [currentTournamentMatch, setCurrentTournamentMatch] = useState<TournamentMatch | null>(null);
  
  // Battle Royale state
  const [battleRoyaleGame, setBattleRoyaleGame] = useState<BattleRoyaleGameState | null>(null);
  
  // Toggle fullscreen function
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    onSearch: () => setScreen('library'),
    onFullscreen: toggleFullscreen,
    onLibrary: () => setScreen('library'),
    onSettings: () => setScreen('settings'),
    onEscape: () => {
      if (isFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else {
        setScreen('home');
      }
    },
  });
  
  useEffect(() => {
    // Check URL parameters for mobile mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('mobile') !== null) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setIsMobileClient(true));
    }
  }, []);
  
  // PWA Registration
  useEffect(() => {
    initPWAInstall();
    registerServiceWorker();
  }, []);
  
  // Apply stored theme on app start
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      applyTheme(storedTheme);
    }
    
    // Listen for theme changes from settings
    const handleThemeChange = () => {
      const theme = getStoredTheme();
      if (theme) {
        applyTheme(theme);
      }
    };
    
    window.addEventListener('themeChanged', handleThemeChange);
    window.addEventListener('themeChange', handleThemeChange);
    
    return () => {
      window.removeEventListener('themeChanged', handleThemeChange);
      window.removeEventListener('themeChange', handleThemeChange);
    };
  }, []);
  
  const addImportedSong = (song: Song) => {
    setImportedSongs(prev => [...prev, song]);
  };
  
  // Render mobile client view if in mobile mode
  if (isMobileClient) {
    return <MobileClientView />;
  }
  
  return (
    <div 
      className="min-h-screen text-white theme-container"
      style={{
        background: `linear-gradient(135deg, var(--theme-background, #0a0a1a) 0%, var(--theme-background-secondary, #1a1a2e) 50%, color-mix(in srgb, var(--theme-primary, #00ffff) 15%, transparent) 100%)`,
        color: 'var(--theme-text, #ffffff)',
        fontFamily: 'var(--theme-font, Inter, sans-serif)',
      }}
    >
      {/* Navigation - Hidden in fullscreen mode */}
      {!isFullscreen && (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => setScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <MusicIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Karaoke Successor
              </span>
            </button>
            
            <div className="flex items-center gap-2">
              <NavButton active={screen === 'library'} onClick={() => setScreen('library')}>
                <LibraryIcon className="w-5 h-5" /> Library
              </NavButton>
              <NavButton active={screen === 'party'} onClick={() => setScreen('party')}>
                <PartyIcon className="w-5 h-5" /> Party
              </NavButton>
              <NavButton active={screen === 'dailyChallenge'} onClick={() => setScreen('dailyChallenge')}>
                <StarIcon className="w-5 h-5" /> Challenges
              </NavButton>
              <NavButton active={screen === 'queue'} onClick={() => setScreen('queue')}>
                <QueueIcon className="w-5 h-5" /> Queue
                {queue.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queue.length}</Badge>
                )}
              </NavButton>
              <NavButton active={screen === 'character'} onClick={() => setScreen('character')}>
                <UserIcon className="w-5 h-5" /> Characters
              </NavButton>
              <NavButton active={screen === 'highscores'} onClick={() => setScreen('highscores')}>
                <TrophyIcon className="w-5 h-5" /> Highscores
              </NavButton>
              <NavButton active={screen === 'achievements'} onClick={() => setScreen('achievements')}>
                <TrophyIcon className="w-5 h-5" /> Achievements
              </NavButton>
              <NavButton active={screen === 'jukebox'} onClick={() => setScreen('jukebox')}>
                <MusicIcon className="w-5 h-5" /> Jukebox
              </NavButton>
              <NavButton active={screen === 'settings'} onClick={() => setScreen('settings')}>
                <SettingsIcon className="w-5 h-5" /> Settings
              </NavButton>
              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white/70 hover:text-white hover:bg-white/10"
                title="Toggle Fullscreen (F11)"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Fullscreen Exit Button - Only visible in fullscreen mode */}
      {isFullscreen && (
        <button
          onClick={() => document.exitFullscreen().catch(() => {})}
          className="fixed top-4 right-4 z-50 p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:bg-black/70 hover:border-white/40 transition-all group"
          title="Exit Fullscreen (ESC)"
        >
          <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <main className={`${isFullscreen ? 'pt-4' : 'pt-20'} pb-8 px-4 min-h-screen`}>
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'library' && <LibraryScreen onSelectSong={(song) => { setSong(song); setScreen('game'); }} initialGameMode={gameState.gameMode} />}
        {screen === 'game' && <GameScreen onEnd={() => setScreen('results')} onBack={() => setScreen('library')} />}
        {screen === 'party' && (
          <PartyScreen 
            onSelectMode={(mode) => { 
              if (mode === 'tournament') {
                setScreen('tournament');
              } else if (mode === 'battle-royale') {
                setScreen('battle-royale');
              } else if (mode === 'online') {
                setScreen('online');
              } else {
                setGameMode(mode); 
                setScreen('library'); 
              }
            }} 
          />
        )}
        
        {/* Tournament Setup Screen */}
        {screen === 'tournament' && (
          <TournamentSetupScreen
            profiles={profiles}
            songs={getAllSongs()}
            onStartTournament={(bracket, songDuration) => {
              setTournamentBracket(bracket);
              setTournamentSongDuration(songDuration);
              setScreen('tournament-game');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Tournament Game Screen */}
        {screen === 'tournament-game' && tournamentBracket && (
          <TournamentBracketView
            bracket={tournamentBracket}
            currentMatch={currentTournamentMatch}
            onPlayMatch={(match) => {
              setCurrentTournamentMatch(match);
              setGameMode('tournament');
              // Set a random song for the match
              const songs = getAllSongs();
              if (songs.length > 0) {
                const randomSong = songs[Math.floor(Math.random() * songs.length)];
                setSong(randomSong);
                setScreen('game');
              }
            }}
            songs={getAllSongs()}
            shortMode={tournamentSongDuration === 60}
          />
        )}
        
        {/* Battle Royale Setup Screen */}
        {screen === 'battle-royale' && (
          <BattleRoyaleSetupScreen
            profiles={profiles}
            songs={getAllSongs()}
            onStartGame={(game) => {
              setBattleRoyaleGame(game);
              setScreen('battle-royale-game');
            }}
            onBack={() => setScreen('party')}
          />
        )}
        
        {/* Battle Royale Game Screen */}
        {screen === 'battle-royale-game' && battleRoyaleGame && (
          <BattleRoyaleGameView
            game={battleRoyaleGame}
            songs={getAllSongs()}
            onUpdateGame={(game) => setBattleRoyaleGame(game)}
            onEndGame={() => {
              setBattleRoyaleGame(null);
              setScreen('home');
            }}
          />
        )}
        {screen === 'character' && <CharacterScreen />}
        {screen === 'queue' && <QueueScreen />}
        {screen === 'mobile' && <MobileScreen />}
        {screen === 'highscores' && <HighscoreScreen />}
        {screen === 'results' && <ResultsScreen onPlayAgain={() => setScreen('library')} onHome={() => setScreen('home')} />}
        {screen === 'settings' && <SettingsScreen />}
        {screen === 'jukebox' && <JukeboxScreen onBack={() => setScreen('home')} />}
        {screen === 'achievements' && <AchievementsScreen />}
        {screen === 'dailyChallenge' && <DailyChallengeScreen onPlayChallenge={(song) => { setSong(song); setScreen('game'); }} />}
        {screen === 'editor' && <EditorScreen onBack={() => setScreen('library')} />}
        {screen === 'online' && <OnlineMultiplayerScreen onBack={() => setScreen('party')} />}
      </main>
    </div>
  );
}

// ===================== NAV BUTTON =====================
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-white/20 text-white' 
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// ===================== ICONS =====================
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PartyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5.8 11.3L2 22l10.7-3.8" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 15c-1.5 1-2.5 2.5-3 4.5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

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

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function WebcamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

// ===================== HOME SCREEN =====================
function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  
  // Get song count from library
  const songCount = useMemo(() => {
    return getAllSongs().length;
  }, []);
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/30">
          <MusicIcon className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Karaoke Successor
        </h1>
        <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
          The ultimate karaoke experience. Sing your heart out with real-time pitch detection, 
          compete with friends, and enjoy party games!
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-6 text-lg"
            onClick={() => onNavigate('library')}
          >
            <PlayIcon className="w-5 h-5 mr-2" /> Start Singing
          </Button>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white px-8 py-6 text-lg border-2 border-pink-400/50"
            onClick={() => onNavigate('party')}
          >
            <PartyIcon className="w-5 h-5 mr-2" /> Party Mode
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-cyan-400">{songCount}</div>
            <div className="text-white/60 text-sm">Songs Available</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-400">{profiles.length}</div>
            <div className="text-white/60 text-sm">Characters Created</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-pink-400">5</div>
            <div className="text-white/60 text-sm">Party Games</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-400">3</div>
            <div className="text-white/60 text-sm">Difficulty Levels</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardContent className="pt-6">
          <PerformanceDisplay />
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <MicIcon className="w-6 h-6" /> Real-Time Pitch Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Advanced YIN algorithm detects your singing pitch in real-time with high accuracy. 
              See your voice visualized as you sing!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <PartyIcon className="w-6 h-6" /> Party Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Pass the Mic, Medley Contest, Missing Words, Duel Mode, and Blind Karaoke - 
              endless entertainment for your parties!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <PhoneIcon className="w-6 h-6" /> Mobile Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Use your smartphone as a microphone or remote control! 
              Simply scan the QR code to connect.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Select Profile */}
      {profiles.length > 0 && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Select Your Character</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeProfileId === profile.id 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      profile.name[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
              <button
                onClick={() => onNavigate('character')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                  +
                </div>
                <span className="text-white/60">Create New</span>
              </button>
            </div>
            {profiles.filter(p => p.isActive === false).length > 0 && (
              <p className="text-xs text-white/40 mt-3">
                {profiles.filter(p => p.isActive === false).length} inactive profile(s) hidden. Enable them in Character settings.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== CREATE PLAYLIST FORM =====================
function CreatePlaylistForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), description.trim() || undefined);
    onSuccess();
  };
  
  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-sm text-white/60 mb-2 block">Playlist Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Playlist"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-white/60 mb-2 block">Description (optional)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this playlist about?"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
        >
          Create Playlist
        </Button>
      </div>
    </div>
  );
}

// ===================== LIBRARY SCREEN =====================
// View modes for the library
type LibraryViewMode = 'grid' | 'folder' | 'playlists';
type LibraryGroupBy = 'none' | 'artist' | 'title' | 'genre' | 'language' | 'folder';

// Song Card Component
function SongCard({ 
  song, 
  previewSong, 
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs 
}: { 
  song: Song;
  previewSong: Song | null;
  onSongClick: (song: Song) => void;
  onPreviewStart: (song: Song) => void;
  onPreviewStop: () => void;
  previewVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
}) {
  return (
    <div 
      className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
      onClick={() => onSongClick(song)}
      onMouseEnter={() => onPreviewStart(song)}
      onMouseLeave={onPreviewStop}
    >
      {/* Cover Image / Video Preview */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
        {/* Static Cover Image */}
        {song.coverImage && (
          <img 
            src={song.coverImage} 
            alt={song.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {/* Video Preview - Local Video */}
        {song.videoBackground && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={song.videoBackground}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id ? 'opacity-100' : 'opacity-0'
            }`}
            // Mute only if there's a separate audio file; unmute for videos with embedded audio
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            loop
            playsInline
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {/* Video Preview - YouTube */}
        {song.youtubeUrl && previewSong?.id === song.id && (
          <div className="absolute inset-0 w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(song.youtubeUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(song.youtubeUrl)}&controls=0&showinfo=0&rel=0&modestbranding=1&start=${Math.floor((song.preview?.startTime || 0) / 1000)}`}
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        )}
        
        {/* Fallback Music Icon */}
        {!song.coverImage && !song.videoBackground && !song.youtubeUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        {/* Play indicator on hover - only show if no video */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 
          previewSong?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {song.hasEmbeddedAudio && (
            <Badge className="bg-purple-500/80 text-xs">Video</Badge>
          )}
        </div>
        
        {/* Duration */}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/60 text-xs">
            {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
          </Badge>
        </div>
      </div>
      
      {/* Song Info */}
      <div className="p-3">
        <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
        <p className="text-xs text-white/60 truncate">{song.artist}</p>
      </div>
    </div>
  );
}

// Helper function to get the first letter group for folder view
function getLetterGroup(name: string): string {
  if (!name) return '#';
  const firstChar = name.trim().charAt(0).toUpperCase();
  
  // Check if starts with "The "
  if (name.trim().toLowerCase().startsWith('the ')) {
    return 'The';
  }
  
  // Check if it's a letter A-Z
  if (firstChar >= 'A' && firstChar <= 'Z') {
    return firstChar;
  }
  
  // Everything else goes to #
  return '#';
}

// Helper function to group songs
function groupSongs(songs: Song[], groupBy: LibraryGroupBy): Map<string, Song[]> {
  const groups = new Map<string, Song[]>();
  
  songs.forEach(song => {
    let key: string;
    
    switch (groupBy) {
      case 'artist':
        key = getLetterGroup(song.artist);
        break;
      case 'title':
        key = getLetterGroup(song.title);
        break;
      case 'genre':
        key = song.genre || 'Unknown';
        break;
      case 'language':
        key = song.language || 'unknown';
        break;
      case 'folder':
        // Get the TOP-LEVEL folder only (parent folder of the song's folder)
        // Songs are typically in: BaseFolder/ArtistFolder/SongFolder/song.txt
        // We want to show only: ArtistFolder (the first level after base)
        if (song.folderPath) {
          const parts = song.folderPath.split('/').filter(p => p.length > 0);
          // Only show the first subfolder level (not the song's immediate folder)
          // If path is "Artist/Album/Song", show "Artist"
          // If path is "Artist/Song", show "Artist"
          // If path is "Song", show "Root"
          if (parts.length >= 2) {
            // Skip the last part (song folder) and take the first meaningful parent
            key = parts[0];
          } else if (parts.length === 1) {
            // Single folder - could be an artist folder with songs directly
            key = parts[0];
          } else {
            key = 'Root';
          }
        } else if (song.storageFolder) {
          // For storage folder, extract top-level folder
          const parts = song.storageFolder.split('/').filter(p => p.length > 0);
          key = parts.length > 0 ? parts[0] : 'Root';
        } else {
          key = 'Root';
        }
        break;
      default:
        key = 'All';
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(song);
  });
  
  return groups;
}

// Get sorted folder keys
function getSortedFolderKeys(groups: Map<string, Song[]>, groupBy: LibraryGroupBy): string[] {
  const keys = Array.from(groups.keys());
  
  if (groupBy === 'artist' || groupBy === 'title') {
    // Sort: A-Z first, then "The", then "#"
    return keys.sort((a, b) => {
      if (a === '#' && b !== '#') return 1;
      if (b === '#' && a !== '#') return -1;
      if (a === 'The' && b !== 'The' && b !== '#') return 1;
      if (b === 'The' && a !== 'The' && a !== '#') return -1;
      return a.localeCompare(b);
    });
  }
  
  return keys.sort((a, b) => a.localeCompare(b));
}

function LibraryScreen({ onSelectSong, initialGameMode }: { onSelectSong: (song: Song) => void; initialGameMode?: GameMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [highscoreSong, setHighscoreSong] = useState<Song | null>(null);
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadedSongs, setLoadedSongs] = useState<Song[]>([]);
  // Custom YouTube background video state
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles, setGameMode, highscores } = useGameStore();
  
  // New view mode state
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [groupBy, setGroupBy] = useState<LibraryGroupBy>('none');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<string[]>([]);
  
  // Playlist state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  
  // Initialize playlists on mount
  useEffect(() => {
    initializePlaylists();
    setPlaylists(getPlaylists());
  }, []);
  
  // Refresh playlists when viewMode changes to playlists
  useEffect(() => {
    if (viewMode === 'playlists') {
      setPlaylists(getPlaylists());
      // Update favorite song IDs
      const favs = new Set<string>();
      const allPlaylists = getPlaylists();
      const favorites = allPlaylists.find(p => p.id === 'system-favorites');
      if (favorites) {
        favorites.songIds.forEach(id => favs.add(id));
      }
      setFavoriteSongIds(favs);
    }
  }, [viewMode]);
  
  // Load songs asynchronously on mount and when library changes
  useEffect(() => {
    const loadSongs = async () => {
      setSongsLoading(true);
      try {
        const songs = await getAllSongsAsync();
        setLoadedSongs(songs);
      } catch (error) {
        console.error('Failed to load songs:', error);
        // Fallback to sync version
        setLoadedSongs(getAllSongs());
      } finally {
        setSongsLoading(false);
      }
    };
    loadSongs();
  }, [libraryVersion]);
  
  // Song start modal state - use initialGameMode if it's a party mode
  const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel' && initialGameMode !== 'duet';
  const [startOptions, setStartOptions] = useState<{
    difficulty: Difficulty;
    mode: 'single' | 'duel' | 'duet' | GameMode;
    players: string[];
    partyMode?: GameMode;
  }>({
    difficulty: 'medium',
    mode: initialGameMode === 'duel' ? 'duel' : initialGameMode === 'duet' ? 'duet' : 'single',
    players: [],
    partyMode: isPartyMode ? initialGameMode : undefined,
  });
  
  // Load default difficulty from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-default-difficulty');
    if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
      setStartOptions(prev => ({ ...prev, difficulty: saved }));
    }
  }, []);
  
  // Get library settings from store (persistent) - initialize with defaults to avoid hydration mismatch
  const [settings, setSettings] = useState<{
    sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
    sortOrder: 'asc' | 'desc';
    filterDifficulty: Difficulty | 'all';
    filterGenre: string;
    filterLanguage: string;
    filterDuet: boolean;
  }>({
    sortBy: 'title' as const,
    sortOrder: 'asc' as const,
    filterDifficulty: 'all' as const,
    filterGenre: 'all',
    filterLanguage: 'all',
    filterDuet: false,
  });
  
  // Load settings from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-library-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);
  
  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('karaoke-library-settings', JSON.stringify(settings));
  }, [settings]);
  
  // Listen for difficulty changes from settings
  useEffect(() => {
    const handleDifficultyChange = () => {
      const saved = localStorage.getItem('karaoke-default-difficulty');
      if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
        setStartOptions(prev => ({
          ...prev,
          difficulty: saved as Difficulty
        }));
      }
    };
    window.addEventListener('storage', handleDifficultyChange);
    window.addEventListener('settingsChange', handleDifficultyChange);
    return () => {
      window.removeEventListener('storage', handleDifficultyChange);
      window.removeEventListener('settingsChange', handleDifficultyChange);
    };
  }, []);
  
  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [previewAudio]);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerQueueCount = queue.filter(item => item.playerId === activeProfileId).length;

  // Preview handlers
  const handlePreviewStart = useCallback((song: Song) => {
    // Allow preview even without audioUrl if there's video
    if (!song.audioUrl && !song.videoBackground && !song.youtubeUrl) return;
    
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Delay before starting preview
    previewTimeoutRef.current = setTimeout(() => {
      // Stop any existing preview
      if (previewAudio) {
        previewAudio.pause();
      }
      
      // Stop all existing videos first
      previewVideoRefs.current.forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
      
      // Create new audio for preview (if audio exists)
      if (song.audioUrl) {
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Start from preview time if available
        if (song.preview) {
          audio.currentTime = song.preview.startTime / 1000;
        }
        
        audio.src = song.audioUrl;
        audio.play().catch(() => {});
        
        setPreviewAudio(audio);
      }
      
      // Start video preview (if local video exists)
      if (song.videoBackground) {
        const videoEl = previewVideoRefs.current.get(song.id);
        if (videoEl) {
          // Set start time from preview if available
          if (song.preview) {
            videoEl.currentTime = song.preview.startTime / 1000;
          }
          // For videos with embedded audio, unmute the video
          if (song.hasEmbeddedAudio && !song.audioUrl) {
            videoEl.muted = false;
          }
          videoEl.play().catch(() => {});
        }
      }
      
      setPreviewSong(song);
    }, 500); // 500ms delay before preview starts
  }, [previewAudio]);
  
  const handlePreviewStop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (previewAudio) {
      previewAudio.pause();
    }
    // Stop all preview videos
    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    setPreviewSong(null);
  }, [previewAudio]);

  const filteredSongs = useMemo(() => {
    let songs = loadedSongs;
    
    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      songs = songs.filter(s => 
        s.title.toLowerCase().includes(lowerQuery) ||
        s.artist.toLowerCase().includes(lowerQuery) ||
        s.genre?.toLowerCase().includes(lowerQuery) ||
        s.album?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Difficulty filter
    if (settings.filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === settings.filterDifficulty);
    }
    
    // Genre filter - reads from #Genre: tag in txt files
    if (settings.filterGenre && settings.filterGenre !== 'all') {
      songs = songs.filter(s => s.genre === settings.filterGenre);
    }
    
    // Language filter - reads from #Language: tag in txt files
    if (settings.filterLanguage && settings.filterLanguage !== 'all') {
      songs = songs.filter(s => s.language === settings.filterLanguage);
    }
    
    // Duet filter - show only duet songs when enabled
    if (settings.filterDuet) {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
    }
    
    // Duet mode filter - show only duet-compatible songs when in duet mode (NOT duel mode)
    // Duet mode: Two players sing different parts (need duet songs)
    // Duel mode: Two players compete on the same song (any song works)
    if (startOptions.mode === 'duet') {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
    }
    
    // Sort
    songs = [...songs].sort((a, b) => {
      let comparison = 0;
      switch (settings.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'dateAdded':
          comparison = (b.dateAdded || 0) - (a.dateAdded || 0);
          break;
      }
      return settings.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return songs;
  }, [loadedSongs, searchQuery, settings, startOptions.mode]);
  
  // Get unique genres from loaded songs (read from #Genre: in txt files)
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [loadedSongs]);
  
  // Get unique languages from loaded songs (read from #Language: in txt files)
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.language) langSet.add(s.language);
    });
    return ['all', ...Array.from(langSet).sort()];
  }, [loadedSongs]);
  
  // Group songs for folder view
  const groupedSongs = useMemo(() => {
    if (groupBy === 'none' || viewMode === 'grid') {
      return new Map<string, Song[]>();
    }
    return groupSongs(filteredSongs, groupBy);
  }, [filteredSongs, groupBy, viewMode]);
  
  // Get songs for current folder
  const currentFolderSongs = useMemo(() => {
    if (!currentFolder || groupBy === 'none') {
      return filteredSongs;
    }
    return groupedSongs.get(currentFolder) || [];
  }, [currentFolder, groupBy, filteredSongs, groupedSongs]);
  
  // Get display name for a group key
  const getGroupDisplayName = (key: string): string => {
    if (groupBy === 'language') {
      return LANGUAGE_NAMES[key] || key;
    }
    return key;
  };
  
  // Handle folder navigation
  const handleOpenFolder = (folder: string) => {
    setCurrentFolder(folder);
    setFolderBreadcrumb(prev => [...prev, folder]);
  };
  
  const handleBackFolder = () => {
    setFolderBreadcrumb(prev => prev.slice(0, -1));
    setCurrentFolder(folderBreadcrumb.length > 1 ? folderBreadcrumb[folderBreadcrumb.length - 2] : null);
  };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderBreadcrumb([]);
    } else {
      setCurrentFolder(folderBreadcrumb[index]);
      setFolderBreadcrumb(folderBreadcrumb.slice(0, index + 1));
    }
  };

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    setStartOptions({
      difficulty: song.difficulty,
      mode: initialGameMode === 'duel' ? 'duel' : 'single',
      players: activeProfileId ? [activeProfileId] : [],
      partyMode: isPartyMode ? initialGameMode : undefined,
    });
    setShowSongModal(true);
  };

  const handleStartGame = () => {
    if (!selectedSong) return;
    
    // Check if player selection is required (multiple active profiles)
    const activeProfiles = profiles.filter(p => p.isActive !== false);
    const needsPlayerSelection = activeProfiles.length > 1;
    
    // For single mode with multiple profiles, ensure a player is selected
    if (startOptions.mode === 'single' && needsPlayerSelection) {
      if (startOptions.players.length === 0) {
        return; // No player selected
      }
      // Set the selected player as active
      setActiveProfile(startOptions.players[0]);
    }
    
    // For duel mode, ensure 2 players are selected
    if (startOptions.mode === 'duel' && startOptions.players.length < 2) {
      return;
    }
    
    // For duet mode, need 2 players as well
    if (startOptions.mode === 'duet' && startOptions.players.length < 2) {
      return;
    }
    
    setDifficulty(startOptions.difficulty);
    // Set the game mode - use party mode if available, otherwise use the selected mode
    if (startOptions.partyMode) {
      setGameMode(startOptions.partyMode);
    } else if (startOptions.mode === 'duel') {
      setGameMode('duel');
    } else if (startOptions.mode === 'duet') {
      setGameMode('duet');
    } else {
      setGameMode('standard');
    }
    setShowSongModal(false);
    
    // Pass song with custom YouTube background if set
    if (customYoutubeId) {
      onSelectSong({
        ...selectedSong,
        videoBackground: `https://www.youtube.com/watch?v=${customYoutubeId}`,
        youtubeId: customYoutubeId,
      });
    } else {
      onSelectSong(selectedSong);
    }
  };

  const handleAddToQueue = (song: Song) => {
    if (activeProfileId && playerQueueCount < 3) {
      addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
    }
  };

  return (
    <div className="w-[90%] mx-auto max-w-[1800px]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Music Library</h1>
          <p className="text-white/60">
            {songsLoading ? 'Loading songs...' : `${loadedSongs.length} songs available`}
          </p>
        </div>
        {/* Fullscreen Toggle */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all group"
          title="Toggle Fullscreen (F11)"
        >
          <svg className="w-5 h-5 text-white/60 group-hover:text-cyan-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      </div>

      {/* Loading indicator */}
      {songsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      )}

      {/* Search and Filters */}
      {!songsLoading && (
        <div className="space-y-4 mb-6">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                id="song-search"
                name="song-search"
                placeholder="Search songs, artists, or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            
            {/* Sort dropdown */}
            <select
              value={`${settings.sortBy}-${settings.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [typeof settings.sortBy, typeof settings.sortOrder];
                setSettings(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="title-asc" className="bg-gray-800 text-white">Title (A-Z)</option>
              <option value="title-desc" className="bg-gray-800 text-white">Title (Z-A)</option>
              <option value="artist-asc" className="bg-gray-800 text-white">Artist (A-Z)</option>
              <option value="artist-desc" className="bg-gray-800 text-white">Artist (Z-A)</option>
              <option value="dateAdded-desc" className="bg-gray-800 text-white">Recently Added</option>
            </select>
          </div>
          
          {/* Filter Row - Genre, Language, and Duet in same row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Genre Filter - reads from #Genre: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🎸 Genre:</span>
              <select
                value={settings.filterGenre || 'all'}
                onChange={(e) => setSettings(prev => ({ ...prev, filterGenre: e.target.value }))}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
                ))}
              </select>
            </div>
            
            {/* Language Filter - reads from #Language: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🌍 Language:</span>
              <select
                value={settings.filterLanguage || 'all'}
                onChange={(e) => setSettings(prev => ({ ...prev, filterLanguage: e.target.value }))}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableLanguages.map(l => (
                  <option key={l} value={l} className="bg-gray-800 text-white">{l === 'all' ? 'All Languages' : (LANGUAGE_NAMES[l] || l)}</option>
                ))}
              </select>
            </div>
            
            {/* Duet Filter Toggle - in same row as other filters */}
            <button
              onClick={() => setSettings(prev => ({ ...prev, filterDuet: !prev.filterDuet }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                settings.filterDuet 
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>🎭</span>
              <span>Duet</span>
            </button>
            
            {/* Active Filters Display */}
            {(settings.filterGenre !== 'all' || settings.filterLanguage !== 'all' || settings.filterDuet) && (
              <button
                onClick={() => setSettings(prev => ({ ...prev, filterGenre: 'all', filterLanguage: 'all', filterDuet: false }))}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                ✕ Clear filters
              </button>
            )}
          </div>
          
          {/* View Mode and Group By Options */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => { setViewMode('grid'); setGroupBy('none'); setCurrentFolder(null); setFolderBreadcrumb([]); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' && groupBy === 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Grid
                </div>
              </button>
              <button
                onClick={() => { setViewMode('playlists'); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'playlists' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  Playlists
                </div>
              </button>
            </div>
            
            <span className="text-white/30">|</span>
            
            {/* Group By Options */}
            <span className="text-white/40 text-sm">Group by:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'artist', label: 'Artist A-Z', icon: '🎤' },
                { value: 'title', label: 'Title A-Z', icon: '🎵' },
                { value: 'genre', label: 'Genre', icon: '🎸' },
                { value: 'language', label: 'Language', icon: '🌍' },
                { value: 'folder', label: 'Folder', icon: '📁' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setViewMode('folder');
                    setGroupBy(option.value as LibraryGroupBy);
                    setCurrentFolder(null);
                    setFolderBreadcrumb([]);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    groupBy === option.value && viewMode === 'folder' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          {viewMode === 'folder' && folderBreadcrumb.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                All
              </button>
              {folderBreadcrumb.map((folder, index) => (
                <React.Fragment key={index}>
                  <span className="text-white/30">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`transition-colors ${
                      index === folderBreadcrumb.length - 1 
                        ? 'text-white font-medium' 
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    {getGroupDisplayName(folder)}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Song Grid or Folder View or Playlist View */}
      {!songsLoading && (
        <>
          {viewMode === 'playlists' ? (
            // Playlist View
            <div className="space-y-6">
              {/* Back button if viewing playlist songs */}
              {selectedPlaylist && (
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Playlists
                </button>
              )}
              
              {!selectedPlaylist ? (
                // Show all playlists
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      {playlists.length} Playlist{playlists.length !== 1 ? 's' : ''}
                    </h2>
                    <Button
                      onClick={() => setShowCreatePlaylistModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Playlist
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {playlists.map((playlist) => {
                      const playlistSongs = getPlaylistSongs(playlist.id, loadedSongs);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => setSelectedPlaylist(playlist)}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-left group relative"
                        >
                          {/* System playlist badge */}
                          {playlist.isSystem && (
                            <div className="absolute top-2 right-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                              System
                            </div>
                          )}
                          
                          {/* Cover Image */}
                          <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center">
                            {playlistSongs.length > 0 && playlistSongs[0].coverImage ? (
                              <img src={playlistSongs[0].coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MusicIcon className="w-12 h-12 text-white/30" />
                            )}
                          </div>
                          
                          {/* Playlist Name */}
                          <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                          <p className="text-xs text-white/40">{playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}</p>
                          
                          {/* Delete button for non-system playlists */}
                          {!playlist.isSystem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${playlist.name}"?`)) {
                                  deletePlaylist(playlist.id);
                                  setPlaylists(getPlaylists());
                                }
                              }}
                              className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                              title="Delete playlist"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Show songs in selected playlist
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
                      {selectedPlaylist.description && (
                        <p className="text-white/60 text-sm">{selectedPlaylist.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          songs.forEach(song => {
                            if (activeProfileId && queue.filter(q => q.playerId === activeProfileId).length < 3) {
                              addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
                            }
                          });
                        }}
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                        disabled={!activeProfileId}
                      >
                        <QueueIcon className="w-4 h-4 mr-2" />
                        Add to Queue
                      </Button>
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          if (songs.length > 0) {
                            // Navigate to jukebox with these songs
                            localStorage.setItem('jukebox-playlist', JSON.stringify(songs.map(s => s.id)));
                            // Could also set screen to jukebox here
                          }
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                      >
                        <PlayIcon className="w-4 h-4 mr-2" />
                        Play in Jukebox
                      </Button>
                    </div>
                  </div>
                  
                  {getPlaylistSongs(selectedPlaylist.id, loadedSongs).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60">This playlist is empty</p>
                      <p className="text-white/40 text-sm mt-2">Add songs from the library</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {getPlaylistSongs(selectedPlaylist.id, loadedSongs).map((song) => (
                        <div key={song.id} className="relative group">
                          <SongCard 
                            song={song}
                            previewSong={previewSong}
                            onSongClick={handleSongClick}
                            onPreviewStart={handlePreviewStart}
                            onPreviewStop={handlePreviewStop}
                            previewVideoRefs={previewVideoRefs}
                          />
                          {/* Remove from playlist button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSongFromPlaylist(selectedPlaylist.id, song.id);
                              setPlaylists(getPlaylists());
                              setSelectedPlaylist(getPlaylistById(selectedPlaylist.id));
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10"
                            title="Remove from playlist"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No songs found</p>
              <p className="text-white/40 text-sm">Try a different search or import some songs</p>
            </div>
          ) : viewMode === 'grid' || (viewMode === 'folder' && currentFolder) ? (
            // Grid View (either plain grid or folder contents)
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {currentFolderSongs.map((song) => (
                <SongCard 
                  key={song.id}
                  song={song}
                  previewSong={previewSong}
                  onSongClick={handleSongClick}
                  onPreviewStart={handlePreviewStart}
                  onPreviewStop={handlePreviewStop}
                  previewVideoRefs={previewVideoRefs}
                />
              ))}
            </div>
          ) : (
            // Folder View - Show Folders
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {getSortedFolderKeys(groupedSongs, groupBy).map((folderKey) => {
                const songs = groupedSongs.get(folderKey) || [];
                const displayName = getGroupDisplayName(folderKey);
                
                return (
                  <button
                    key={folderKey}
                    onClick={() => handleOpenFolder(folderKey)}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
                  >
                    {/* Folder Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
                      <FolderIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    
                    {/* Folder Name */}
                    <h3 className="font-semibold text-white truncate">{displayName}</h3>
                    <p className="text-xs text-white/40">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
                    
                    {/* Preview covers */}
                    <div className="flex -space-x-2 mt-3">
                      {songs.slice(0, 4).map((song, i) => (
                        <div 
                          key={song.id}
                          className="w-8 h-8 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 border-2 border-gray-900 overflow-hidden"
                          style={{ zIndex: 4 - i }}
                        >
                          {song.coverImage ? (
                            <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MusicIcon className="w-4 h-4 text-white/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {songs.length > 4 && (
                        <div className="w-8 h-8 rounded bg-black/50 border-2 border-gray-900 flex items-center justify-center text-xs text-white/60">
                          +{songs.length - 4}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Song Start Modal */}
      {showSongModal && selectedSong && (
        <Dialog open={showSongModal} onOpenChange={setShowSongModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedSong.title}</DialogTitle>
              <DialogDescription className="text-white/60">{selectedSong.artist}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Cover Preview */}
              <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30">
                {selectedSong.coverImage ? (
                  <img src={selectedSong.coverImage} alt={selectedSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-16 h-16 text-white/30" />
                  </div>
                )}
              </div>
              
              {/* Difficulty Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setStartOptions(prev => ({ ...prev, difficulty: diff }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.difficulty === diff 
                          ? diff === 'easy' ? 'bg-green-500 text-white' 
                            : diff === 'medium' ? 'bg-yellow-500 text-black'
                            : 'bg-red-500 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div className="text-sm font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                      <div className="text-xs opacity-70">
                        {diff === 'easy' ? '±2 Tones' : diff === 'medium' ? '±1 Tone' : 'Exact'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Mode Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Mode</label>
                {startOptions.partyMode ? (
                  // Show party mode info
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {startOptions.partyMode === 'pass-the-mic' ? '🎤' :
                           startOptions.partyMode === 'companion-singalong' ? '📱' :
                           startOptions.partyMode === 'medley' ? '🎵' :
                           startOptions.partyMode === 'missing-words' ? '📝' :
                           startOptions.partyMode === 'blind' ? '🙈' : '🎮'}
                        </span>
                        <div>
                          <div className="font-bold text-white">
                            {startOptions.partyMode === 'pass-the-mic' ? 'Pass the Mic' :
                             startOptions.partyMode === 'companion-singalong' ? 'Companion Sing-A-Long' :
                             startOptions.partyMode === 'medley' ? 'Medley Contest' :
                             startOptions.partyMode === 'missing-words' ? 'Missing Words' :
                             startOptions.partyMode === 'blind' ? 'Blind Karaoke' : startOptions.partyMode}
                          </div>
                          <div className="text-xs text-white/60">Party Mode Active</div>
                        </div>
                      </div>
                      {/* Reset button to exit party mode */}
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, partyMode: undefined, mode: 'single' }))}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        title="Reset to Single Mode"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Regular single/duel/duet selection
                  // Duet mode only shows if song is a duet song
                  // Single and Duel are hidden/grayed when Duet is available
                  <div className={`grid ${selectedSong?.isDuet ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {/* Duet Mode - Only show for duet songs */}
                    {selectedSong?.isDuet ? (
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duet' }))}
                        className={`py-3 rounded-lg font-medium transition-all ${
                          startOptions.mode === 'duet' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`
                      }
                      >
                        <span className="text-lg">🎭</span>
                        <div className="text-sm">Duet Mode</div>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setStartOptions(prev => ({ ...prev, mode: 'single' }))}
                          className={`py-3 rounded-lg font-medium transition-all ${
                            startOptions.mode === 'single' 
                              ? 'bg-cyan-500 text-white' 
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          <MicIcon className="w-5 h-5 mx-auto mb-1" />
                          <div className="text-sm">Single</div>
                        </button>
                        <button
                          onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duel' }))}
                          className={`py-3 rounded-lg font-medium transition-all ${
                            startOptions.mode === 'duel' 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          <span className="text-lg">⚔️</span>
                          <div className="text-sm">Duel</div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Player Selection (for Single mode - when multiple active profiles) */}
              {startOptions.mode === 'single' && profiles.filter(p => p.isActive !== false).length > 1 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select Player</label>
                  <div className="grid grid-cols-2 gap-2">
                    {profiles.filter(p => p.isActive !== false).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => setStartOptions(prev => ({ ...prev, players: [profile.id] }))}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players[0] === profile.id 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            profile.name[0]
                          )}
                        </div>
                        <span className="text-sm truncate">{profile.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Player Selection (for Duel mode) */}
              {startOptions.mode === 'duel' && profiles.filter(p => p.isActive !== false).length >= 2 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select 2 Players</label>
                  <div className="grid grid-cols-2 gap-2">
                    {profiles.filter(p => p.isActive !== false).slice(0, 4).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          const players = startOptions.players.includes(profile.id)
                            ? startOptions.players.filter(id => id !== profile.id)
                            : startOptions.players.length < 2
                              ? [...startOptions.players, profile.id]
                              : startOptions.players;
                          setStartOptions(prev => ({ ...prev, players }));
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players.includes(profile.id) 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            profile.name[0]
                          )}
                        </div>
                        <span className="text-sm truncate">{profile.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Player Selection (for Duet mode) */}
              {startOptions.mode === 'duet' && profiles.filter(p => p.isActive !== false).length >= 2 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select 2 Players (P1 & P2)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {profiles.filter(p => p.isActive !== false).slice(0, 4).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          const players = startOptions.players.includes(profile.id)
                            ? startOptions.players.filter(id => id !== profile.id)
                            : startOptions.players.length < 2
                              ? [...startOptions.players, profile.id]
                              : startOptions.players;
                          setStartOptions(prev => ({ ...prev, players }));
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players.includes(profile.id) 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            profile.name[0]
                          )}
                        </div>
                        <span className="text-sm truncate">{profile.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Song Info */}
              <div className="text-xs text-white/40 space-y-1">
                <p>BPM: {selectedSong.bpm} | Duration: {Math.floor(selectedSong.duration / 60000)}:{String(Math.floor((selectedSong.duration % 60000) / 1000)).padStart(2, '0')}</p>
                {selectedSong.genre && <p>Genre: {selectedSong.genre}</p>}
              </div>
              
              {/* Custom YouTube Background Video */}
              <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                    </svg>
                    Background Video (Optional)
                  </label>
                  {customYoutubeId && (
                    <button
                      onClick={() => setCustomYoutubeId(null)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL..."
                    value={customYoutubeUrl}
                    onChange={(e) => setCustomYoutubeUrl(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    onClick={() => {
                      const id = extractYouTubeId(customYoutubeUrl);
                      if (id) {
                        setCustomYoutubeId(id);
                      }
                    }}
                    disabled={!extractYouTubeId(customYoutubeUrl)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/40 text-white text-sm rounded transition-colors"
                  >
                    Set
                  </button>
                </div>
                {customYoutubeId && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Video set! Will play as background during singing.
                  </p>
                )}
                <p className="text-xs text-white/40 mt-2">
                  Add a YouTube music video to play in the background while you sing.
                </p>
              </div>

              {/* Local Highscore Preview */}
              {(() => {
                const songScores = highscores.filter(h => h.songId === selectedSong.id).sort((a, b) => b.score - a.score);
                const topScore = songScores[0];
                if (topScore) {
                  return (
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white/60">Your Best:</span>
                        <span className="text-sm font-bold text-cyan-400">{topScore.score.toLocaleString()}</span>
                        <span className="text-xs text-white/40">({topScore.accuracy.toFixed(1)}%)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-purple-400 hover:text-purple-300"
                        onClick={() => {
                          setHighscoreSong(selectedSong);
                          setShowHighscoreModal(true);
                        }}
                      >
                        View All →
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Favorite Button */}
              <Button 
                variant="outline" 
                onClick={() => {
                  const added = toggleFavorite(selectedSong.id);
                  setPlaylists(getPlaylists());
                  // Update favorite IDs
                  const favs = new Set<string>();
                  const allPlaylists = getPlaylists();
                  const favorites = allPlaylists.find(p => p.id === 'system-favorites');
                  if (favorites) {
                    favorites.songIds.forEach(id => favs.add(id));
                  }
                  setFavoriteSongIds(favs);
                }}
                className={favoriteSongIds.has(selectedSong.id) 
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30" 
                  : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                }
              >
                <StarIcon className="w-4 h-4 mr-2" filled={favoriteSongIds.has(selectedSong.id)} />
                {favoriteSongIds.has(selectedSong.id) ? 'Favorited' : 'Favorite'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setHighscoreSong(selectedSong);
                  setShowHighscoreModal(true);
                }}
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <TrophyIcon className="w-4 h-4 mr-2" /> Scores
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  addToQueue(selectedSong, activeProfileId, profiles.find(p => p.id === activeProfileId)?.name || 'Player');
                  setShowSongModal(false);
                }}
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                <QueueIcon className="w-4 h-4 mr-2" /> Queue
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSongToAddToPlaylist(selectedSong);
                  setShowAddToPlaylistModal(true);
                }}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                Add to Playlist
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSongModal(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartGame}
                disabled={
                  // Single mode: need player selection if multiple profiles
                  (startOptions.mode === 'single' && 
                   profiles.filter(p => p.isActive !== false).length > 1 && 
                   startOptions.players.length === 0) ||
                  // Duet mode: need 2 players selected
                  (startOptions.mode === 'duet' && 
                   startOptions.players.length < 2) ||
                  // Duel mode: need 2 players selected
                  (startOptions.mode === 'duel' && 
                   startOptions.players.length < 2)
                }
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4 mr-2" /> Start
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Song Highscore Modal */}
      {highscoreSong && (
        <SongHighscoreModal
          song={highscoreSong}
          isOpen={showHighscoreModal}
          onClose={() => {
            setShowHighscoreModal(false);
            setHighscoreSong(null);
          }}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <Dialog open={showCreatePlaylistModal} onOpenChange={setShowCreatePlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Give your playlist a name and optionally a description
              </DialogDescription>
            </DialogHeader>
            <CreatePlaylistForm 
              onClose={() => setShowCreatePlaylistModal(false)}
              onSuccess={() => {
                setPlaylists(getPlaylists());
                setShowCreatePlaylistModal(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && songToAddToPlaylist && (
        <Dialog open={showAddToPlaylistModal} onOpenChange={setShowAddToPlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Select a playlist to add "{songToAddToPlaylist.title}" to
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
              {playlists.filter(p => !p.isSystem || p.id !== 'system-favorites' || !p.songIds.includes(songToAddToPlaylist.id)).map((playlist) => {
                const isInPlaylist = playlist.songIds.includes(songToAddToPlaylist.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      if (!isInPlaylist) {
                        addSongToPlaylist(playlist.id, songToAddToPlaylist.id);
                        setPlaylists(getPlaylists());
                        setShowAddToPlaylistModal(false);
                        setSongToAddToPlaylist(null);
                      }
                    }}
                    disabled={isInPlaylist}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      isInPlaylist 
                        ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center flex-shrink-0">
                      {playlist.isSystem ? (
                        <span className="text-lg">
                          {playlist.id === 'system-favorites' ? '⭐' : 
                           playlist.id === 'system-recently-played' ? '🕐' : '🔥'}
                        </span>
                      ) : (
                        <MusicIcon className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{playlist.name}</div>
                      <div className="text-xs text-white/40">{playlist.songIds.length} songs</div>
                    </div>
                    {isInPlaylist && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
              {playlists.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <p>No playlists yet</p>
                  <Button 
                    onClick={() => {
                      setShowAddToPlaylistModal(false);
                      setShowCreatePlaylistModal(true);
                    }}
                    className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    Create Your First Playlist
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setSongToAddToPlaylist(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setShowCreatePlaylistModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ===================== LYRIC LINE DISPLAY =====================
// Shows lyrics with karaoke-style color progression
// Shows the COMPLETE LINE at once (line ends with "-" in txt file)
// Supports different lyrics styles from settings and note display modes
function LyricLineDisplay({ 
  line, 
  currentTime, 
  playerColor,
  noteDisplayStyle = 'classic',
  notePerformance = new Map()
}: { 
  line: LyricLine; 
  currentTime: number; 
  playerColor: string;
  noteDisplayStyle?: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
}) {
  // Get lyrics style from localStorage - initialize with default to avoid hydration mismatch
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const initialLoadDone = useRef(false);
  
  // Load initial value and listen for style changes
  useEffect(() => {
    const handleStyleChange = () => {
      const style = localStorage.getItem('karaoke-lyrics-style') || 'classic';
      setLyricsStyle(style);
    };
    
    // Load initial value on first effect run
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      handleStyleChange();
    }
    
    window.addEventListener('storage', handleStyleChange);
    // Also check periodically for changes (since storage events only fire in other tabs)
    const interval = setInterval(handleStyleChange, 1000);
    return () => {
      window.removeEventListener('storage', handleStyleChange);
      clearInterval(interval);
    };
  }, []);
  
  // Calculate note fill level based on performance (for fill-level mode)
  const getNoteFillLevel = (noteId: string, isActive: boolean): number => {
    if (!isActive) return 1; // Past notes show full
    const samples = notePerformance.get(noteId) || [];
    if (samples.length === 0) return 0;
    // Calculate fill based on recent hits
    const recentSamples = samples.slice(-5);
    const hitRate = recentSamples.filter(s => s.hit).length / recentSamples.length;
    return hitRate;
  };
  
  // Get accuracy color for color-feedback mode
  const getAccuracyColor = (noteId: string, isSung: boolean): string => {
    if (!isSung) return 'text-white/50';
    const samples = notePerformance.get(noteId) || [];
    if (samples.length === 0) return 'text-white/70';
    
    const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
    if (avgAccuracy > 0.9) return 'text-green-400'; // Perfect
    if (avgAccuracy > 0.7) return 'text-cyan-400';  // Great
    if (avgAccuracy > 0.5) return 'text-blue-400';  // Good
    if (avgAccuracy > 0.3) return 'text-orange-400'; // Okay
    return 'text-red-400'; // Miss
  };
  
  // Get glow intensity based on accuracy (for glow-intensity mode)
  const getGlowIntensity = (noteId: string, isSung: boolean): React.CSSProperties => {
    if (!isSung) return {};
    const samples = notePerformance.get(noteId) || [];
    if (samples.length === 0) return {};
    
    const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
    const intensity = avgAccuracy * 40; // 0-40px glow
    const color = avgAccuracy > 0.7 ? 'rgba(34, 197, 94,' : avgAccuracy > 0.4 ? 'rgba(34, 211, 238,' : 'rgba(239, 68, 68,';
    
    return {
      textShadow: `0 0 ${intensity}px ${color}${avgAccuracy})`,
    };
  };
  
  // Style configurations - each word can be: sung, active, or upcoming
  const getStyleClasses = (isSung: boolean, isActive: boolean) => {
    switch (lyricsStyle) {
      case 'concert':
        // Concert style: Big bold with dramatic glow
        return {
          textClass: isSung ? 'text-yellow-400' : isActive ? 'text-white' : 'text-white/40',
          fontClass: isSung || isActive ? 'font-black text-3xl md:text-4xl' : 'font-bold text-2xl md:text-3xl',
          shadowStyle: isSung 
            ? { textShadow: `0 0 30px rgba(255, 200, 0, 0.9), 0 0 60px rgba(255, 200, 0, 0.5)` }
            : isActive 
            ? { textShadow: '0 0 20px rgba(255, 255, 255, 0.8)' }
            : {}
        };
      case 'retro':
        // Retro style: Green terminal text with scanline effect
        return {
          textClass: isSung ? 'text-green-400' : isActive ? 'text-green-300' : 'text-green-700',
          fontClass: 'font-mono text-2xl md:text-3xl',
          shadowStyle: isSung 
            ? { textShadow: `0 0 10px rgba(34, 197, 94, 0.9), 0 0 20px rgba(34, 197, 94, 0.5)` }
            : {}
        };
      case 'neon':
        // Neon style: Pink and cyan alternating glow
        return {
          textClass: isSung ? 'text-pink-400' : isActive ? 'text-cyan-400' : 'text-white/40',
          fontClass: 'font-bold text-2xl md:text-3xl',
          shadowStyle: isSung 
            ? { textShadow: `0 0 20px rgba(236, 72, 153, 0.9), 0 0 40px rgba(236, 72, 153, 0.6)` }
            : isActive 
            ? { textShadow: '0 0 20px rgba(34, 211, 238, 0.8)' }
            : {}
        };
      case 'minimal':
        // Minimal style: Clean, no shadows
        return {
          textClass: isSung ? 'text-white' : isActive ? 'text-white/90' : 'text-white/40',
          fontClass: 'font-medium text-2xl md:text-3xl',
          shadowStyle: {}
        };
      case 'classic':
      default:
        // Classic style: Original karaoke look
        return {
          textClass: isSung ? '' : isActive ? 'text-white' : 'text-white/50',
          fontClass: isSung || isActive ? 'font-bold text-2xl md:text-3xl' : 'font-normal text-2xl md:text-3xl',
          shadowStyle: isSung 
            ? { color: playerColor, textShadow: `0 0 15px ${playerColor}80` }
            : isActive 
            ? { textShadow: '0 0 10px rgba(255,255,255,0.5)' }
            : {}
        };
    }
  };
  
  // Show ALL notes of the complete line - no sliding window
  // UltraStar format: trailing space in lyric = word boundary, no space = syllable
  // IMPORTANT: Use inline-block spans to preserve exact spacing from txt file
  // IMPORTANT: Hyphens in lyrics should be rendered with special styling for line breaks
  return (
    <span className="text-2xl md:text-3xl font-bold text-center inline" style={{ whiteSpace: 'pre-wrap' }}>
      {line.notes.map((note, idx) => {
        // Use startTime as noteId to match checkNoteHits (startTime is unique per note)
        const noteId = note.id || `note-${note.startTime}`;
        const noteEnd = note.startTime + note.duration;
        const isSung = currentTime >= noteEnd;
        const isActive = currentTime >= note.startTime && currentTime < noteEnd;
        
        // Get base style classes from lyricsStyle (concert, retro, neon, etc.)
        const { textClass, fontClass, shadowStyle } = getStyleClasses(isSung, isActive);
        
        // Apply note display mode styling - these are ADDITIVE to the base styles
        let finalTextClass = textClass;
        let finalShadowStyle = { ...shadowStyle };
        let fillClipStyle: React.CSSProperties = {};
        
        // Note: noteDisplayStyle only applies to SUNG notes (past notes)
        // This shows performance feedback after the note was sung
        if (noteDisplayStyle === 'fill-level' && isSung) {
          // Fill-level mode: Show how much of the note was hit correctly
          const fillLevel = getNoteFillLevel(noteId, false);
          if (fillLevel < 1) {
            fillClipStyle = {
              background: `linear-gradient(90deg, ${playerColor} ${fillLevel * 100}%, rgba(255,255,255,0.3) ${fillLevel * 100}%)`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            };
          }
        } else if (noteDisplayStyle === 'color-feedback' && isSung) {
          // Color-feedback mode: Color based on accuracy (green=perfect, cyan=great, blue=good, orange=ok, red=miss)
          const samples = notePerformance.get(noteId) || [];
          if (samples.length > 0) {
            const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
            if (avgAccuracy > 0.9) finalTextClass = 'text-green-400';
            else if (avgAccuracy > 0.7) finalTextClass = 'text-cyan-400';
            else if (avgAccuracy > 0.5) finalTextClass = 'text-blue-400';
            else if (avgAccuracy > 0.3) finalTextClass = 'text-orange-400';
            else finalTextClass = 'text-red-400';
          }
        } else if (noteDisplayStyle === 'glow-intensity' && isSung) {
          // Glow-intensity mode: Glow intensity based on accuracy
          const samples = notePerformance.get(noteId) || [];
          if (samples.length > 0) {
            const avgAccuracy = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
            const intensity = avgAccuracy * 50;
            const glowColor = avgAccuracy > 0.7 ? '34, 197, 94' : avgAccuracy > 0.4 ? '34, 211, 238' : '239, 68, 68';
            finalShadowStyle = {
              ...shadowStyle,
              textShadow: `0 0 ${intensity}px rgba(${glowColor}, ${avgAccuracy}), 0 0 ${intensity * 2}px rgba(${glowColor}, ${avgAccuracy * 0.5})`,
            };
          }
        }
        
        // Render the lyric text exactly as stored (spaces preserved by whiteSpace: 'pre-wrap')
        // Handle hyphenated syllables: if lyric ends with hyphen, it's a syllable break
        let displayLyric = note.lyric || '';
        
        // Preserve trailing spaces - they indicate word boundaries
        // Also handle the case where spaces might have been trimmed
        return (
          <span key={noteId} className="inline-block" style={{ marginRight: 0 }}>
            <span 
              className={`inline-block ${fontClass} ${finalTextClass} transition-all duration-100`}
              style={{ ...finalShadowStyle, ...fillClipStyle, display: 'inline-block' }}
            >
              {displayLyric}
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ===================== GAME SCREEN =====================
function GameScreen({ onEnd, onBack }: { onEnd: () => void; onBack: () => void }) {
  const { gameState, setSong, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults, setGameMode } = useGameStore();
  const { isInitialized, isListening, pitchResult, initialize, start, stop, setDifficulty: setPitchDifficulty } = usePitchDetector();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [scoreEvents, setScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [volume, setVolume] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [youtubeTime, setYoutubeTime] = useState(0); // Track YouTube video time
  
  // Settings from localStorage - initialize with defaults to avoid hydration mismatch
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(true);
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [useAnimatedBackground, setUseAnimatedBackground] = useState(false); // New setting for animations only
  
  // Load initial settings and listen for changes
  useEffect(() => {
    // Load initial values from localStorage
    setShowBackgroundVideo(localStorage.getItem('karaoke-bg-video') !== 'false');
    setShowPitchGuide(localStorage.getItem('karaoke-show-pitch-guide') !== 'false');
    setNoteDisplayStyle(localStorage.getItem('karaoke-note-style') || 'classic');
    setUseAnimatedBackground(localStorage.getItem('karaoke-animated-bg') === 'true');
    
    const handleSettingsChange = (e?: Event) => {
      // Handle custom event with detail
      if (e && 'detail' in e) {
        const detail = (e as CustomEvent).detail;
        if (detail.showPitchGuide !== undefined) {
          setShowPitchGuide(detail.showPitchGuide);
        }
        if (detail.noteDisplayStyle !== undefined) {
          setNoteDisplayStyle(detail.noteDisplayStyle);
        }
        if (detail.useAnimatedBackground !== undefined) {
          setUseAnimatedBackground(detail.useAnimatedBackground);
        }
      }
      // Always refresh from localStorage
      setShowBackgroundVideo(localStorage.getItem('karaoke-bg-video') !== 'false');
      setShowPitchGuide(localStorage.getItem('karaoke-show-pitch-guide') !== 'false');
      setNoteDisplayStyle(localStorage.getItem('karaoke-note-style') || 'classic');
      setUseAnimatedBackground(localStorage.getItem('karaoke-animated-bg') === 'true');
    };
    window.addEventListener('storage', handleSettingsChange);
    window.addEventListener('settingsChange', handleSettingsChange);
    const interval = setInterval(handleSettingsChange, 500);
    return () => {
      window.removeEventListener('storage', handleSettingsChange);
      window.removeEventListener('settingsChange', handleSettingsChange);
      clearInterval(interval);
    };
  }, []);
  
  // Practice mode state
  const [practiceMode, setPracticeMode] = useState<PracticeModeConfig>(PRACTICE_MODE_DEFAULTS);
  const [showPracticeControls, setShowPracticeControls] = useState(false);
  
  // Challenge mode state - read from localStorage when game starts
  const [activeChallenge, setActiveChallenge] = useState<typeof CHALLENGE_MODES[0] | null>(() => {
    if (typeof window !== 'undefined') {
      const savedChallengeId = localStorage.getItem('karaoke-challenge-mode');
      if (savedChallengeId) {
        const challenge = CHALLENGE_MODES.find(c => c.id === savedChallengeId);
        if (challenge) {
          console.log(`[GameScreen] Challenge mode activated: ${challenge.name} (+${challenge.xpReward} XP)`);
          localStorage.removeItem('karaoke-challenge-mode'); // Clear after reading
          return challenge;
        }
      }
    }
    return null;
  });
  
  // Mobile client state
  const [mobilePitch, setMobilePitch] = useState<{ frequency: number | null; note: number | null; volume: number } | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  
  // Audio effects state - defaults to 0% (off)
  const [audioEffects, setAudioEffects] = useState<AudioEffectsEngine | null>(null);
  const [showAudioEffects, setShowAudioEffects] = useState(false);
  const [reverbAmount, setReverbAmount] = useState(0);
  
  // Note display style: 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'
  const [noteDisplayStyle, setNoteDisplayStyle] = useState<string>('classic');
  
  // Note performance tracking for fill-level display
  // Stores accuracy samples per note: noteId -> Array<{ time, accuracy, hit }>
  const [notePerformance, setNotePerformance] = useState<Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>>(new Map());
  const [echoAmount, setEchoAmount] = useState(0);
  
  // Duel mode state
  const [duelMatch, setDuelMatch] = useState<DuelMatch | null>(null);
  const [player2Pitch, setPlayer2Pitch] = useState<number | null>(null);
  const [player2Score, setPlayer2Score] = useState(0);
  
  // Webcam background state - SEPARATE camera for filming singers
  // Initialize with defaults to avoid hydration mismatch
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>({ ...DEFAULT_WEBCAM_CONFIG });
  
  // Live streaming state
  const [showStreamPanel, setShowStreamPanel] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  
  // Player progression state (XP, Level, Rank)
  const [playerStats, setPlayerStats] = useState<ExtendedPlayerStats | null>(null);
  
  // Load player stats after mount
  useEffect(() => {
    const stats = getExtendedStats();
    setPlayerStats(stats);
  }, []);
  
  // Load webcam config from localStorage after mount
  useEffect(() => {
    const savedConfig = loadWebcamConfig();
    setWebcamConfig(savedConfig);
  }, []);
  
  // Update webcam config and save to localStorage
  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);
  
  // Duet mode state - separate tracking for P1 and P2
  const [p1ScoreEvents, setP1ScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [p2ScoreEvents, setP2ScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [p2Volume, setP2Volume] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [p2MaxCombo, setP2MaxCombo] = useState(0);
  const [p2NotesHit, setP2NotesHit] = useState(0);
  const [p2NotesMissed, setP2NotesMissed] = useState(0);
  const [p2DetectedPitch, setP2DetectedPitch] = useState<number | null>(null);
  
  // NEW: Track note progress for duration-based scoring
  // Instead of just marking notes as "processed", we track how many ticks of each note have been evaluated
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p2NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  // Keep legacy refs for backward compatibility
  const processedNotesRef = useRef<Set<string>>(new Set());
  const processedP2NotesRef = useRef<Set<string>>(new Set());
  
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const song = gameState.currentSong;
  
  // Check if this is a duet song (either marked as duet or gameMode is 'duet')
  const isDuetMode = song?.isDuet || gameState.gameMode === 'duet' || gameState.gameMode === 'duel';
  
  // Timing synchronization - user adjustable offset (initialized from song)
  const [timingOffset, setTimingOffset] = useState(0);
  
  // Poll for mobile pitch data
  useEffect(() => {
    if (!song) return;
    
    const pollMobilePitch = async () => {
      try {
        const response = await fetch('/api/mobile?action=getpitch');
        const data = await response.json();
        if (data.success && data.pitch) {
          setMobilePitch(data.pitch.data);
          setHasMobileClient(true);
        }
      } catch {
        // Ignore polling errors
      }
    };
    
    const pollInterval = setInterval(pollMobilePitch, 50); // Poll every 50ms for real-time sync
    
    return () => clearInterval(pollInterval);
  }, [song]);
  
  // Update game state for mobile clients to see
  useEffect(() => {
    if (!song) return;
    
    const updateGameState = async () => {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gamestate',
            payload: {
              currentSong: { id: song.id, title: song.title, artist: song.artist },
              isPlaying: isPlaying,
              currentTime: gameState.currentTime,
            },
          }),
        });
      } catch {
        // Ignore sync errors
      }
    };
    
    // Update on song change and play state change
    updateGameState();
  }, [song, isPlaying, gameState.currentTime]);
  
  // Initialize audio effects when microphone is active
  useEffect(() => {
    if (isPlaying && !audioEffects) {
      const initAudioEffects = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const engine = new AudioEffectsEngine();
          await engine.initialize(stream);
          setAudioEffects(engine);
        } catch (error) {
          console.error('Failed to initialize audio effects:', error);
        }
      };
      initAudioEffects();
    }
    
    return () => {
      if (audioEffects) {
        audioEffects.disconnect();
      }
    };
  }, [isPlaying]);
  
  // ===================== REMOTE CONTROL POLLING =====================
  // Poll for remote commands from mobile companions
  useEffect(() => {
    const pollRemoteCommands = async () => {
      try {
        const response = await fetch('/api/mobile?action=getcommands');
        const data = await response.json();
        
        if (data.success && data.commands && data.commands.length > 0) {
          // Process each command
          for (const cmd of data.commands) {
            console.log('[GameScreen] Remote command received:', cmd.type, 'from', cmd.fromClientName);
            
            switch (cmd.type) {
              case 'play':
                if (audioRef.current && audioRef.current.paused) {
                  audioRef.current.play().catch(() => {});
                }
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {});
                }
                setIsPlaying(true);
                break;
                
              case 'pause':
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                }
                setIsPlaying(false);
                break;
                
              case 'stop':
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                }
                if (videoRef.current) {
                  videoRef.current.pause();
                  videoRef.current.currentTime = 0;
                }
                setIsPlaying(false);
                stop();
                onBack();
                break;
                
              case 'restart':
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => {});
                }
                setIsPlaying(true);
                break;
                
              case 'next':
              case 'skip':
                // End current song and go to results
                stop();
                onEnd();
                break;
                
              case 'previous':
                // Restart song
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
                break;
                
              case 'home':
                stop();
                onBack();
                break;
                
              case 'library':
              case 'queue':
              case 'settings':
                // Navigate to other screens
                stop();
                onBack();
                break;
                
              case 'volume':
                const volumeData = cmd.data as { direction?: string };
                if (audioRef.current) {
                  const currentVolume = audioRef.current.volume;
                  if (volumeData?.direction === 'up') {
                    audioRef.current.volume = Math.min(1, currentVolume + 0.1);
                  } else if (volumeData?.direction === 'down') {
                    audioRef.current.volume = Math.max(0, currentVolume - 0.1);
                  }
                }
                break;
            }
          }
        }
      } catch (error) {
        console.error('[GameScreen] Error polling remote commands:', error);
      }
    };
    
    // Poll every 500ms - always, not just when playing
    const interval = setInterval(pollRemoteCommands, 500);
    return () => clearInterval(interval);
  }, [isPlaying, stop, onBack, onEnd]);
  
  // Initialize duel mode - use useMemo to avoid setState in effect
  const duelMatchValue = useMemo(() => {
    if (gameState.gameMode === 'duel' && song && gameState.players.length >= 2) {
      return createDuelMatch(song, gameState.players[0], gameState.players[1]);
    }
    return null;
  }, [gameState.gameMode, song, gameState.players]);
  
  // Update duelMatch state when the computed value changes
  useEffect(() => {
    setDuelMatch(duelMatchValue);
  }, [duelMatchValue]);
  
  // Custom YouTube video for background (can be set by user)
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  
  // Check if song has YouTube URL (from #VIDEO: tag with URL)
  // Priority: custom YouTube > song.youtubeUrl > videoBackground if URL
  const songYoutubeUrl = song?.youtubeUrl;
  const videoBackground = song?.videoBackground;
  const songYoutubeId = songYoutubeUrl ? extractYouTubeId(songYoutubeUrl) : 
                       (videoBackground && (videoBackground.startsWith('http://') || videoBackground.startsWith('https://')) ? 
                        extractYouTubeId(videoBackground) : null);
  // Use custom YouTube ID if set, otherwise use song's YouTube ID
  const youtubeVideoId = customYoutubeId || songYoutubeId;
  const isYouTube = !!youtubeVideoId;
  
  // Determine if we should use YouTube audio (no separate audio file)
  const useYouTubeAudio = isYouTube && !song?.audioUrl;
  
  // Handle custom YouTube URL input
  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
      setCustomYoutubeUrl(url);
      setShowYoutubeInput(false);
      console.log('[GameScreen] Custom YouTube video set:', extractedId);
    }
  }, []);
  
  // Clear custom YouTube video
  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
    setCustomYoutubeUrl('');
  }, []);
  
  // Handle ad detection callbacks
  const handleAdStart = useCallback(() => {
    console.log('[GameScreen] Ad detected - pausing game');
    setIsAdPlaying(true);
    setAdCountdown(30); // Max 30 seconds for ad
    
    // Pause the game if playing
    if (isPlaying) {
      setIsPlaying(false);
    }
  }, [isPlaying]);
  
  const handleAdEnd = useCallback(() => {
    console.log('[GameScreen] Ad ended - resuming game');
    setIsAdPlaying(false);
    setAdCountdown(0);
    
    // Resume the game
    setIsPlaying(true);
  }, []);
  
  // Ad countdown effect
  useEffect(() => {
    if (isAdPlaying && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdPlaying, adCountdown]);
  
  // Sing line position at 25% from left (like UltraStar/Vocaluxe)
  const SING_LINE_POSITION = 25; // percentage from left
  
  // Fixed time window for note display (in milliseconds)
  // This ensures consistent scrolling speed regardless of BPM
  // 4 seconds = 4000ms window for upcoming notes
  const NOTE_WINDOW = 4000; // Fixed 4 second window
  
  // =====================================================
  // PRE-COMPUTE ALL TIMING DATA ONCE WHEN SONG LOADS
  // This is the KEY optimization - no more per-frame iteration!
  // =====================================================
  const timingData = useMemo(() => {
    if (!song || song.lyrics.length === 0) return null;
    
    // Create flat array of all notes with their line reference
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    // Separate arrays for duet mode
    const p1Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const p2Notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    song.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        const noteWithLine = {
          ...note,
          lineIndex,
          line
        };
        allNotes.push(noteWithLine);
        
        // For duet mode, separate notes by player
        if (isDuetMode) {
          if (note.player === 'P1') {
            p1Notes.push(noteWithLine);
          } else if (note.player === 'P2') {
            p2Notes.push(noteWithLine);
          } else {
            // Notes without player assignment go to both players (or just P1 in single mode)
            p1Notes.push(noteWithLine);
            p2Notes.push(noteWithLine);
          }
        }
      });
    });
    
    // Sort by start time for efficient searching
    allNotes.sort((a, b) => a.startTime - b.startTime);
    p1Notes.sort((a, b) => a.startTime - b.startTime);
    p2Notes.sort((a, b) => a.startTime - b.startTime);
    
    // Create time-sorted lines for binary search
    const sortedLines = [...song.lyrics].sort((a, b) => a.startTime - b.startTime);
    
    // Separate lines by player for duet mode
    const p1Lines = sortedLines.filter(line => line.player === 'P1' || line.player === 'both' || !line.player);
    const p2Lines = sortedLines.filter(line => line.player === 'P2' || line.player === 'both' || !line.player);
    
    // Calculate beat duration for scoring
    const beatDurationMs = song.bpm ? 15000 / song.bpm : 500;
    
    // Calculate scoring metadata for duration-based scoring
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    const p1ScoringMetadata = calculateScoringMetadata(p1Notes, beatDurationMs);
    const p2ScoringMetadata = calculateScoringMetadata(p2Notes, beatDurationMs);
    
    return {
      allNotes,
      sortedLines,
      noteCount: allNotes.length,
      lineCount: sortedLines.length,
      // Duet mode specific data
      p1Notes,
      p2Notes,
      p1Lines,
      p2Lines,
      p1NoteCount: p1Notes.length,
      p2NoteCount: p2Notes.length,
      // Scoring metadata for duration-based scoring
      scoringMetadata,
      p1ScoringMetadata,
      p2ScoringMetadata,
      beatDuration: beatDurationMs,
    };
  }, [song, isDuetMode]);
  
  // Calculate beat duration using the CORRECT UltraStar formula
  // Formula: beatDuration = 15000 / BPM (equivalent to 60000 / (BPM * 4))
  const beatDuration = timingData?.beatDuration || (song?.bpm ? 15000 / song.bpm : 500); // ms per beat
  
  // Calculate pitch range dynamically from pre-computed notes
  // This ensures all notes are visible within the display area
  const pitchStats = useMemo(() => {
    if (!timingData || timingData.allNotes.length === 0) {
      return { minPitch: 48, maxPitch: 72, pitchRange: 24 };
    }
    
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    
    for (const note of timingData.allNotes) {
      minPitch = Math.min(minPitch, note.pitch);
      maxPitch = Math.max(maxPitch, note.pitch);
    }
    
    // Add padding (2 semitones on each side)
    const paddedMin = Math.max(0, minPitch - 2);
    const paddedMax = Math.min(127, maxPitch + 2);
    return { 
      minPitch: paddedMin, 
      maxPitch: paddedMax, 
      pitchRange: Math.max(12, paddedMax - paddedMin) // At least 1 octave
    };
  }, [timingData]);
  
  // Calculate pitch range for P1 specifically (for duet mode)
  const p1PitchStats = useMemo(() => {
    if (!timingData || !timingData.p1Notes || timingData.p1Notes.length === 0) {
      return pitchStats;
    }
    
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    
    for (const note of timingData.p1Notes) {
      minPitch = Math.min(minPitch, note.pitch);
      maxPitch = Math.max(maxPitch, note.pitch);
    }
    
    const paddedMin = Math.max(0, minPitch - 2);
    const paddedMax = Math.min(127, maxPitch + 2);
    return { 
      minPitch: paddedMin, 
      maxPitch: paddedMax, 
      pitchRange: Math.max(12, paddedMax - paddedMin)
    };
  }, [timingData, pitchStats]);
  
  // Calculate pitch range for P2 specifically (for duet mode)
  const p2PitchStats = useMemo(() => {
    if (!timingData || !timingData.p2Notes || timingData.p2Notes.length === 0) {
      return pitchStats;
    }
    
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    
    for (const note of timingData.p2Notes) {
      minPitch = Math.min(minPitch, note.pitch);
      maxPitch = Math.max(maxPitch, note.pitch);
    }
    
    const paddedMin = Math.max(0, minPitch - 2);
    const paddedMax = Math.min(127, maxPitch + 2);
    return { 
      minPitch: paddedMin, 
      maxPitch: paddedMax, 
      pitchRange: Math.max(12, paddedMax - paddedMin)
    };
  }, [timingData, pitchStats]);

  // Vertical pitch display constants (percentage of screen)
  // Leave 8% padding at top (for header) and 15% at bottom (for lyrics)
  const VISIBLE_TOP = 8; // percentage from top
  const VISIBLE_BOTTOM = 85; // percentage from bottom
  const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

  // Initialize media elements on mount
  useEffect(() => {
    if (!song) return;
    
    // Pre-load media
    const loadMedia = async () => {
      setMediaLoaded(false);
      
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      setMediaLoaded(true);
    };
    
    loadMedia();
  }, [song]);

  // Initialize and start game - FIXED: proper countdown with visible numbers
  useEffect(() => {
    if (!song || !mediaLoaded) return;
    
    let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
    
    const initGame = async () => {
      const success = await initialize();
      if (success) {
        // Set pitch detector to current difficulty
        setPitchDifficulty(gameState.difficulty);
        
        start();
        
        // Reset processed notes tracking for new game
        processedNotesRef.current.clear();
        processedP2NotesRef.current.clear();
        // Reset note progress tracking for new game
        noteProgressRef.current.clear();
        p2NoteProgressRef.current.clear();
        
        // Start countdown from 3
        setCountdown(3);
        
        // Use a ref to track countdown value for proper timing
        let currentCount = 3;
        
        countdownIntervalId = setInterval(() => {
          currentCount -= 1;
          
          if (currentCount <= 0) {
            // Clear interval first
            if (countdownIntervalId) {
              clearInterval(countdownIntervalId);
              countdownIntervalId = null;
            }
            
            // Set countdown to 0 to hide it
            setCountdown(0);
            
            // Start playing - do this OUTSIDE of setState to avoid batching issues
            setIsPlaying(true);
            startTimeRef.current = Date.now();
            
            // Start audio/video playback with user interaction context
            const playMedia = async () => {
              try {
                // Calculate start position from #START tag (in milliseconds)
                const startPosition = (song.start || 0) / 1000; // Convert to seconds
                console.log('[GameScreen] Starting media playback at position:', startPosition, 's');
                console.log('[GameScreen] Song info:', {
                  audioUrl: song.audioUrl ? `${song.audioUrl.substring(0, 50)}...` : null,
                  videoBackground: song.videoBackground ? `${song.videoBackground.substring(0, 50)}...` : null,
                  hasEmbeddedAudio: song.hasEmbeddedAudio,
                  storedMedia: song.storedMedia
                });
                
                // PRIORITY 1: Separate audio file (most common case)
                // This is the primary audio source when audioUrl exists
                if (audioRef.current && song.audioUrl) {
                  console.log('[GameScreen] Playing separate audio file');
                  
                  // Check if audio source is valid
                  const audioSrc = audioRef.current.src;
                  if (!audioSrc || audioSrc === '') {
                    console.error('[GameScreen] Audio source is empty');
                    throw new Error('Audio source is empty');
                  }
                  
                  // Validate blob URL by checking if we can load it
                  if (audioSrc.startsWith('blob:')) {
                    console.log('[GameScreen] Validating blob URL:', audioSrc.substring(0, 50));
                    try {
                      // Try to fetch the blob to verify it exists
                      const response = await fetch(audioSrc);
                      if (!response.ok) {
                        console.error('[GameScreen] Blob URL fetch failed:', response.status);
                        throw new Error('Blob URL is invalid or revoked');
                      }
                      const blob = await response.blob();
                      console.log('[GameScreen] Blob validated, size:', blob.size, 'type:', blob.type);
                      if (blob.size === 0) {
                        throw new Error('Blob is empty');
                      }
                    } catch (fetchError) {
                      console.error('[GameScreen] Blob URL validation failed:', fetchError);
                      // Try to reload media from IndexedDB
                      const { getSongMediaUrls } = await import('@/lib/db/media-db');
                      const mediaUrls = await getSongMediaUrls(song.id);
                      if (mediaUrls.audioUrl) {
                        console.log('[GameScreen] Reloaded audio URL from IndexedDB');
                        audioRef.current.src = mediaUrls.audioUrl;
                      } else {
                        throw new Error('Could not reload media from IndexedDB');
                      }
                    }
                  }
                  
                  audioRef.current.currentTime = startPosition;
                  await audioRef.current.play();
                  console.log('[GameScreen] Audio playback started successfully');
                }
                
                // PRIORITY 2: Video with embedded audio (video IS the audio source)
                // Only use this if there's NO separate audioUrl
                else if (song.hasEmbeddedAudio && videoRef.current && !song.audioUrl) {
                  console.log('[GameScreen] Playing video with embedded audio');
                  
                  // Validate video blob URL
                  const videoSrc = videoRef.current.src;
                  if (videoSrc && videoSrc.startsWith('blob:')) {
                    console.log('[GameScreen] Validating video blob URL:', videoSrc.substring(0, 50));
                    try {
                      const response = await fetch(videoSrc);
                      if (!response.ok) {
                        console.error('[GameScreen] Video blob URL fetch failed:', response.status);
                        throw new Error('Video blob URL is invalid');
                      }
                      const blob = await response.blob();
                      console.log('[GameScreen] Video blob validated, size:', blob.size, 'type:', blob.type);
                      if (blob.size === 0) {
                        throw new Error('Video blob is empty');
                      }
                    } catch (fetchError) {
                      console.error('[GameScreen] Video blob URL validation failed:', fetchError);
                      // Try to reload from IndexedDB
                      const { getSongMediaUrls } = await import('@/lib/db/media-db');
                      const mediaUrls = await getSongMediaUrls(song.id);
                      if (mediaUrls.videoUrl) {
                        console.log('[GameScreen] Reloaded video URL from IndexedDB');
                        videoRef.current.src = mediaUrls.videoUrl;
                      } else {
                        throw new Error('Could not reload video from IndexedDB');
                      }
                    }
                  }
                  
                  videoRef.current.currentTime = startPosition;
                  
                  // Browser autoplay policy workaround:
                  // 1. First try unmuted playback (will work if we have user interaction context)
                  // 2. If that fails, start muted and then unmute after playback begins
                  try {
                    videoRef.current.muted = false;
                    await videoRef.current.play();
                    console.log('[GameScreen] Video playback started successfully (unmuted)');
                  } catch (autoplayError) {
                    console.log('[GameScreen] Unmuted autoplay blocked, trying muted then unmute:', autoplayError);
                    // Start muted, then unmute
                    videoRef.current.muted = true;
                    await videoRef.current.play();
                    // Wait a brief moment then unmute
                    setTimeout(() => {
                      if (videoRef.current) {
                        videoRef.current.muted = false;
                        console.log('[GameScreen] Video unmuted after playback started');
                      }
                    }, 100);
                    console.log('[GameScreen] Video playback started successfully (muted -> unmuted)');
                  }
                }
                
                // BACKGROUND VIDEO (muted, synced with audio)
                // This is for videos that should play in background while audio plays
                if (videoRef.current && song.videoBackground && !song.hasEmbeddedAudio) {
                  console.log('[GameScreen] Starting background video (muted)');
                  
                  // Validate background video blob URL
                  const videoSrc = videoRef.current.src;
                  if (videoSrc && videoSrc.startsWith('blob:')) {
                    try {
                      const response = await fetch(videoSrc);
                      if (!response.ok) throw new Error('Background video blob invalid');
                      const blob = await response.blob();
                      if (blob.size === 0) throw new Error('Background video blob empty');
                    } catch (fetchError) {
                      console.error('[GameScreen] Background video blob validation failed:', fetchError);
                      const { getSongMediaUrls } = await import('@/lib/db/media-db');
                      const mediaUrls = await getSongMediaUrls(song.id);
                      if (mediaUrls.videoUrl) {
                        videoRef.current.src = mediaUrls.videoUrl;
                      }
                    }
                  }
                  
                  // Apply videoGap: positive = video starts after audio, so skip ahead in video
                  const videoGapSeconds = (song.videoGap || 0) / 1000;
                  videoRef.current.currentTime = Math.max(0, startPosition - videoGapSeconds);
                  videoRef.current.muted = true; // Background video is always muted
                  videoRef.current.play().catch((e) => {
                    console.log('[GameScreen] Background video autoplay blocked:', e);
                  });
                }
              } catch (error) {
                console.error('[GameScreen] Media playback failed:', error);
                // Try fallback: just start with system time
                setIsPlaying(true);
              }
            };
            playMedia();
          } else {
            // Update countdown state - this will show 2, then 1
            setCountdown(currentCount);
          }
        }, 1000);
      }
    };
    
    initGame();
    
    return () => {
      // Clear countdown interval if still running
      if (countdownIntervalId) {
        clearInterval(countdownIntervalId);
      }
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      // Stop audio/video on cleanup - DON'T clear src, just pause
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      // Reset states
      setIsPlaying(false);
      setCountdown(3);
    };
  }, [song, mediaLoaded, initialize, start, stop]);

  // Check if player hits notes - using NEW duration-based scoring
  // Each note is evaluated throughout its entire duration, not just once
  const checkNoteHits = useCallback((currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number }) => {
    const difficultySettings = DIFFICULTY_SETTINGS[gameState.difficulty];
    if (!song || !pitch.frequency || pitch.volume < difficultySettings.volumeThreshold) return;
    
    const activePlayer = gameState.players[0];
    if (!activePlayer) return;
    
    // In duet mode, only check P1 notes
    const notesToCheck = isDuetMode && timingData?.p1Notes ? timingData.p1Notes : timingData?.allNotes;
    if (!notesToCheck || notesToCheck.length === 0) return;
    
    // Get scoring metadata for duration-based scoring
    const scoringMeta = isDuetMode ? timingData?.p1ScoringMetadata : timingData?.scoringMetadata;
    if (!scoringMeta) return;
    
    const beatDurationMs = timingData?.beatDuration || 500;
    
    // Find current notes using pre-computed timing data
    for (const note of notesToCheck) {
      const noteEnd = note.startTime + note.duration;
      const noteId = note.id || `note-${note.startTime}`;
      
      // Check if we're in the note's time window
      if (currentTime >= note.startTime && currentTime <= noteEnd) {
        // Get or initialize note progress
        let noteProgress = noteProgressRef.current.get(noteId);
        
        if (!noteProgress) {
          // Initialize note progress tracking
          const totalTicks = Math.max(1, Math.round(note.duration / beatDurationMs));
          noteProgress = {
            noteId,
            totalTicks,
            ticksHit: 0,
            ticksEvaluated: 0,
            isGolden: note.isGolden,
            lastEvaluatedTime: currentTime,
            isComplete: false,
            wasPerfect: false,
          };
          noteProgressRef.current.set(noteId, noteProgress);
        }
        
        // Check if we should evaluate a new tick (based on time interval)
        const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
        const tickInterval = beatDurationMs; // One tick per beat
        
        if (timeSinceLastEval >= tickInterval * 0.5) { // Allow some tolerance for timing
          // Evaluate this tick
          const tickResult = evaluateTick(pitch.note!, note.pitch, gameState.difficulty);
          
          // Update note progress
          noteProgress.ticksEvaluated++;
          noteProgress.lastEvaluatedTime = currentTime;
          
          // Track note performance for visual display modes
          setNotePerformance(prev => {
            const newMap = new Map(prev);
            const samples = newMap.get(noteId) || [];
            newMap.set(noteId, [...samples, { time: currentTime, accuracy: tickResult.accuracy, hit: tickResult.isHit }]);
            return newMap;
          });
          
          if (tickResult.isHit) {
            noteProgress.ticksHit++;
            
            // Calculate points for this tick
            const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick, gameState.difficulty);
            
            if (tickPoints > 0) {
              const newCombo = activePlayer.combo + 1;
              
              updatePlayer(activePlayer.id, {
                score: activePlayer.score + Math.floor(tickPoints),
                combo: newCombo,
                maxCombo: Math.max(activePlayer.maxCombo, newCombo),
              });
              
              // Add visual feedback event
              setScoreEvents(prev => [...prev.slice(-10), { 
                type: tickResult.accuracy > 0.95 ? 'perfect' : 'good', 
                displayType: tickResult.displayType,
                points: Math.floor(tickPoints), 
                time: currentTime 
              }]);
              
              if (isDuetMode) {
                setP1ScoreEvents(prev => [...prev.slice(-10), { 
                  type: tickResult.accuracy > 0.95 ? 'perfect' : 'good', 
                  displayType: tickResult.displayType,
                  points: Math.floor(tickPoints), 
                  time: currentTime 
                }]);
              }
            }
          } else {
            // Pitch was wrong - break combo
            updatePlayer(activePlayer.id, {
              combo: 0,
            });
            
            // Add miss event for visual feedback
            setScoreEvents(prev => [...prev.slice(-10), { 
              type: 'miss', 
              displayType: 'Miss',
              points: 0, 
              time: currentTime 
            }]);
            
            if (isDuetMode) {
              setP1ScoreEvents(prev => [...prev.slice(-10), { 
                type: 'miss', 
                displayType: 'Miss',
                points: 0, 
                time: currentTime 
              }]);
            }
          }
        }
        
        break; // Only process one note per frame
      }
      
      // Check if we just passed a note - award completion bonus if all ticks were hit
      if (currentTime > noteEnd) {
        const noteId = note.id || `note-${note.startTime}`;
        const noteProgress = noteProgressRef.current.get(noteId);
        
        if (noteProgress && !noteProgress.isComplete) {
          noteProgress.isComplete = true;
          
          // Count this note as hit or missed
          if (noteProgress.ticksHit > 0) {
            updatePlayer(activePlayer.id, {
              notesHit: activePlayer.notesHit + 1,
            });
          } else {
            updatePlayer(activePlayer.id, {
              notesMissed: activePlayer.notesMissed + 1,
            });
          }
          
          // Check for perfect note bonus (ALL ticks hit)
          if (noteProgress.ticksHit >= noteProgress.totalTicks) {
            noteProgress.wasPerfect = true;
            const bonusPoints = calculateNoteCompletionBonus(noteProgress, scoringMeta.pointsPerTick);
            
            if (bonusPoints > 0) {
              updatePlayer(activePlayer.id, {
                score: activePlayer.score + Math.floor(bonusPoints),
              });
              
              // Add perfect bonus visual feedback
              setScoreEvents(prev => [...prev.slice(-10), { 
                type: 'perfect', 
                displayType: 'Perfect',
                points: Math.floor(bonusPoints), 
                time: currentTime 
              }]);
            }
          }
        }
      }
    }
  }, [song, gameState.difficulty, gameState.players, updatePlayer, timingData, isDuetMode, beatDuration]);
  
  // Check if P2 hits notes (for duet mode) - using NEW duration-based scoring
  const checkP2NoteHits = useCallback((currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number }) => {
    const difficultySettings = DIFFICULTY_SETTINGS[gameState.difficulty];
    if (!song || !pitch.frequency || pitch.volume < difficultySettings.volumeThreshold || !isDuetMode) return;
    
    const notesToCheck = timingData?.p2Notes;
    if (!notesToCheck || notesToCheck.length === 0) return;
    
    // Get scoring metadata for duration-based scoring
    const scoringMeta = timingData?.p2ScoringMetadata;
    if (!scoringMeta) return;
    
    const beatDurationMs = timingData?.beatDuration || 500;
    
    // Find current notes using pre-computed timing data
    for (const note of notesToCheck) {
      const noteEnd = note.startTime + note.duration;
      const noteId = note.id || `p2-note-${note.startTime}`;
      
      // Check if we're in the note's time window
      if (currentTime >= note.startTime && currentTime <= noteEnd) {
        // Get or initialize note progress
        let noteProgress = p2NoteProgressRef.current.get(noteId);
        
        if (!noteProgress) {
          // Initialize note progress tracking
          const totalTicks = Math.max(1, Math.round(note.duration / beatDurationMs));
          noteProgress = {
            noteId,
            totalTicks,
            ticksHit: 0,
            ticksEvaluated: 0,
            isGolden: note.isGolden,
            lastEvaluatedTime: currentTime,
            isComplete: false,
            wasPerfect: false,
          };
          p2NoteProgressRef.current.set(noteId, noteProgress);
        }
        
        // Check if we should evaluate a new tick (based on time interval)
        const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
        const tickInterval = beatDurationMs; // One tick per beat
        
        if (timeSinceLastEval >= tickInterval * 0.5) { // Allow some tolerance for timing
          // Evaluate this tick
          const tickResult = evaluateTick(pitch.note!, note.pitch, gameState.difficulty);
          
          // Update note progress
          noteProgress.ticksEvaluated++;
          noteProgress.lastEvaluatedTime = currentTime;
          
          if (tickResult.isHit) {
            noteProgress.ticksHit++;
            
            // Calculate points for this tick
            const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick, gameState.difficulty);
            
            if (tickPoints > 0) {
              const newCombo = p2Combo + 1;
              setP2Combo(newCombo);
              setP2MaxCombo(prev => Math.max(prev, newCombo));
              setPlayer2Score(prev => prev + Math.floor(tickPoints));
              
              // Add visual feedback event for P2
              setP2ScoreEvents(prev => [...prev.slice(-10), { 
                type: tickResult.accuracy > 0.95 ? 'perfect' : 'good', 
                displayType: tickResult.displayType,
                points: Math.floor(tickPoints), 
                time: currentTime 
              }]);
            }
          } else {
            // Pitch was wrong - break combo
            setP2Combo(0);
            
            // Add miss event for visual feedback
            setP2ScoreEvents(prev => [...prev.slice(-10), { 
              type: 'miss', 
              displayType: 'Miss',
              points: 0, 
              time: currentTime 
            }]);
          }
        }
        
        break; // Only process one note per frame
      }
      
      // Check if we just passed a note - award completion bonus if all ticks were hit
      if (currentTime > noteEnd) {
        const noteId = note.id || `p2-note-${note.startTime}`;
        const noteProgress = p2NoteProgressRef.current.get(noteId);
        
        if (noteProgress && !noteProgress.isComplete) {
          noteProgress.isComplete = true;
          
          // Count this note as hit or missed
          if (noteProgress.ticksHit > 0) {
            setP2NotesHit(prev => prev + 1);
          } else {
            setP2NotesMissed(prev => prev + 1);
          }
          
          // Check for perfect note bonus (ALL ticks hit)
          if (noteProgress.ticksHit >= noteProgress.totalTicks) {
            noteProgress.wasPerfect = true;
            const bonusPoints = calculateNoteCompletionBonus(noteProgress, scoringMeta.pointsPerTick);
            
            if (bonusPoints > 0) {
              setPlayer2Score(prev => prev + Math.floor(bonusPoints));
              
              // Add perfect bonus visual feedback
              setP2ScoreEvents(prev => [...prev.slice(-10), { 
                type: 'perfect', 
                displayType: 'Perfect',
                points: Math.floor(bonusPoints), 
                time: currentTime 
              }]);
            }
          }
        }
      }
    }
  }, [song, gameState.difficulty, timingData, isDuetMode, p2Combo, beatDuration]);

  // Generate results at end
  const generateResults = useCallback(() => {
    const activePlayer = gameState.players[0];
    if (!activePlayer || !song) return;
    
    const totalNotes = song.lyrics.reduce((acc, line) => acc + line.notes.length, 0);
    const accuracy = totalNotes > 0 ? (activePlayer.notesHit / totalNotes) * 100 : 0;
    
    let rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
    if (accuracy >= 95) rating = 'perfect';
    else if (accuracy >= 85) rating = 'excellent';
    else if (accuracy >= 70) rating = 'good';
    else if (accuracy >= 50) rating = 'okay';
    else rating = 'poor';
    
    const results = {
      songId: song.id,
      players: [{
        playerId: activePlayer.id,
        score: activePlayer.score,
        notesHit: activePlayer.notesHit,
        notesMissed: activePlayer.notesMissed,
        accuracy,
        maxCombo: activePlayer.maxCombo,
        rating,
      }],
      playedAt: Date.now(),
      duration: song.duration,
    };
    
    setResults(results);
    
    // Send results to mobile clients for social features
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'results',
        payload: {
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
          score: activePlayer.score,
          accuracy,
          maxCombo: activePlayer.maxCombo,
          rating,
          playedAt: Date.now(),
        },
      }),
    }).catch(() => {});
  }, [gameState.players, song, setResults]);
  
  // End game and cleanup - stops all audio/microphone
  const endGameAndCleanup = useCallback(() => {
    // Stop pitch detection (microphone)
    stop();
    
    // Stop audio effects
    if (audioEffects) {
      audioEffects.disconnect();
      setAudioEffects(null);
    }
    
    // Stop audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop video element
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    
    // Set playing to false
    setIsPlaying(false);
    
    // End game state and generate results
    endGame();
    generateResults();
    
    // Notify mobile clients that song ended
    if (song) {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            currentSong: { id: song.id, title: song.title, artist: song.artist },
            isPlaying: false,
            currentTime: 0,
            songEnded: true,
          },
        }),
      }).catch(() => {});
    }
    
    onEnd();
  }, [stop, audioEffects, endGame, generateResults, onEnd, song]);
  
  // CRITICAL: Cleanup on unmount - stop microphone when leaving GameScreen
  useEffect(() => {
    return () => {
      // Stop pitch detection (microphone) when component unmounts
      stop();
      
      // Stop audio effects
      if (audioEffects) {
        audioEffects.disconnect();
      }
      
      // Stop audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Stop video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      // Cancel any pending animation frames
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [stop, audioEffects]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !song) return;
    
    // Get the start position from #START tag (in milliseconds)
    const startPositionMs = song.start || 0;

    const gameLoop = () => {
      // Use media's currentTime for accurate sync
      let elapsed: number;
      
      // For YouTube videos, use tracked time from player
      if (isYouTube && youtubeTime > 0) {
        elapsed = youtubeTime;
      }
      // PRIORITY: Use audio element time if available (most reliable for scoring)
      else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsed = audioRef.current.currentTime * 1000; // Convert to ms
      }
      // For video with embedded audio (when no separate audio file)
      else if (song.hasEmbeddedAudio && videoRef.current && !videoRef.current.paused) {
        elapsed = videoRef.current.currentTime * 1000; // Convert to ms
      }
      // Fallback to system time (less accurate) - account for start position
      else {
        // Add start position to fallback time so notes are in correct position
        elapsed = (Date.now() - startTimeRef.current) + startPositionMs;
      }
      
      // Apply user-adjustable timing offset
      const adjustedTime = elapsed + timingOffset;
      
      setCurrentTime(adjustedTime);
      
      // Update volume from pitch detection
      if (pitchResult) {
        setVolume(pitchResult.volume);
        setDetectedPitch(pitchResult.frequency);
        
        // Check for note hits for P1
        checkNoteHits(adjustedTime, pitchResult);
      }
      
      // In duet mode, also check P2 note hits
      // For now, use the same pitch detection (simulating second player)
      // In a real implementation, this would use a second microphone via MultiMicrophoneManager
      if (isDuetMode && pitchResult) {
        setP2Volume(pitchResult.volume);
        setP2DetectedPitch(pitchResult.frequency);
        checkP2NoteHits(adjustedTime, pitchResult);
      }
      
      // Check if song ended
      if (adjustedTime >= song.duration) {
        endGameAndCleanup();
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, song, pitchResult, setCurrentTime, setDetectedPitch, checkNoteHits, checkP2NoteHits, endGameAndCleanup, isYouTube, youtubeTime, timingOffset, isDuetMode]);

  // Get upcoming notes - OPTIMIZED with pre-computed data
  const visibleNotes = useMemo(() => {
    if (!timingData) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    // Use the the pre-sorted notes array for efficient filtering
    const notes = timingData.allNotes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    // Binary search to find starting point
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    // Find first note that could be visible
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    // Collect visible notes from starting point
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break; // No more visible notes
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);
  
  // Get upcoming notes for P1 (duet mode)
  const p1VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p1Notes) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    const notes = timingData.p1Notes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);
  
  // Get upcoming notes for P2 (duet mode)
  const p2VisibleNotes = useMemo(() => {
    if (!timingData || !timingData.p2Notes) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    
    const notes = timingData.p2Notes;
    const result: Array<Note & { line: LyricLine }> = [];
    
    let startIdx = 0;
    let endIdx = notes.length - 1;
    let midIdx: number;
    
    while (startIdx <= endIdx) {
      midIdx = Math.floor((startIdx + endIdx) / 2);
      if (notes[midIdx].startTime < windowStart) {
        startIdx = midIdx + 1;
      } else {
        endIdx = midIdx - 1;
      }
    }
    
    for (let i = startIdx; i < notes.length; i++) {
      const note = notes[i];
      const noteEnd = note.startTime + note.duration;
      
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [gameState.currentTime, timingData, NOTE_WINDOW]);

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song selected</p>
        <Button onClick={onBack} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <Button variant="ghost" onClick={() => {
          // Cleanup before leaving - stop microphone and all media
          stop();
          if (audioEffects) {
            audioEffects.disconnect();
          }
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          setIsPlaying(false);
          onBack();
        }} className="text-white/80 hover:text-white hover:bg-white/10">
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          {/* Timing Sync Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40">Sync:</span>
            <button 
              onClick={() => {
                const newOffset = timingOffset - 50;
                setTimingOffset(newOffset);
                if (song) updateSong(song.id, { timingOffset: newOffset });
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white"
            >
              -
            </button>
            <span className={`font-mono ${timingOffset !== 0 ? 'text-yellow-400' : 'text-white/60'}`}>
              {timingOffset > 0 ? '+' : ''}{timingOffset}ms
            </span>
            <button 
              onClick={() => {
                const newOffset = timingOffset + 50;
                setTimingOffset(newOffset);
                if (song) updateSong(song.id, { timingOffset: newOffset });
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white"
            >
              +
            </button>
            {timingOffset !== 0 && (
              <button 
                onClick={() => {
                  setTimingOffset(0);
                  if (song) updateSong(song.id, { timingOffset: 0 });
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/60"
              >
                Reset
              </button>
            )}
          </div>
          {/* Mini Score Display */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">{gameState.players[0]?.score?.toLocaleString() || 0}</span>
              <span className="text-white/40">pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-bold">{gameState.players[0]?.combo || 0}x</span>
              <span className="text-white/40">combo</span>
            </div>
          </div>
          <Badge variant="outline" className="border-white/20 text-white/80">
            {gameState.difficulty.toUpperCase()}
          </Badge>
          
          {/* Webcam Quick Controls */}
          <WebcamQuickControls 
            config={webcamConfig} 
            onConfigChange={updateWebcamConfig}
          />
          
          {/* Live Stream Button */}
          <Button
            onClick={() => setShowStreamPanel(!showStreamPanel)}
            className={`${isLiveStreaming ? 'bg-red-500 animate-pulse' : 'bg-purple-600 hover:bg-purple-500'} text-white`}
            size="sm"
          >
            {isLiveStreaming ? '🔴 LIVE' : '🎥 Stream'}
          </Button>
          
          {/* Active Challenge Mode Indicator */}
          {activeChallenge && (
            <Badge 
              className={`px-3 py-1 text-sm font-bold ${
                activeChallenge.difficulty === 'extreme' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                activeChallenge.difficulty === 'hard' ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' :
                activeChallenge.difficulty === 'medium' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 
                'bg-green-500/30 text-green-300 border border-green-500/50'
              }`}
            >
              {activeChallenge.icon} {activeChallenge.name} (+{activeChallenge.xpReward} XP)
            </Badge>
          )}
        </div>
      </div>
      
      {/* Live Streaming Panel */}
      {showStreamPanel && (
        <div className="absolute top-16 right-4 z-30 w-80">
          <LiveStreamingPanel 
            onStreamStart={() => setIsLiveStreaming(true)}
            onStreamEnd={() => setIsLiveStreaming(false)}
          />
        </div>
      )}

      {/* Star Power Bar */}
      <div className="absolute top-20 left-4 z-20 w-64">
        <StarPowerBar onActivate={() => {
          // Star power activation logic
        }} />
      </div>

      {/* Audio Element - For songs with separate audio file */}
      {/* ALWAYS render audio element if audioUrl exists - this is the primary audio source */}
      {/* Sound priority: 1) Music file (audioUrl) > 2) YouTube audio > 3) Local video audio */}
      {song.audioUrl && (
        <audio 
          ref={audioRef}
          src={song.audioUrl}
          className="hidden"
          onEnded={endGameAndCleanup}
          onError={(e) => {
            const audio = e.currentTarget;
            console.error('[GameScreen] Audio element error:', {
              error: audio.error,
              networkState: audio.networkState,
              readyState: audio.readyState,
              src: audio.src?.substring(0, 50)
            });
          }}
          onCanPlay={() => {
            console.log('[GameScreen] Audio can play, duration:', audioRef.current?.duration);
          }}
          onLoadStart={() => {
            console.log('[GameScreen] Audio load started for:', song.audioUrl?.substring(0, 50));
          }}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (when video has audio but we don't show it) */}
      {/* Case 1: Local video with embedded audio, video disabled */}
      {song.hasEmbeddedAudio && song.videoBackground && !showBackgroundVideo && !isYouTube && !song.audioUrl && (
        <video
          ref={videoRef}
          src={song.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={endGameAndCleanup}
          preload="auto"
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Video Background */}
        {/* YouTube Video - plays with audio when no separate audio file exists */}
        {/* When showBackgroundVideo is true: show video AND play audio from YouTube if no audioUrl */}
        {/* When showBackgroundVideo is false but useYouTubeAudio: still play audio from hidden YouTube */}
        {showBackgroundVideo && isYouTube && youtubeVideoId ? (
          <YouTubePlayer
            videoId={youtubeVideoId}
            videoGap={song.videoGap || 0}
            onReady={() => {}}
            onTimeUpdate={(time) => setYoutubeTime(time)}
            onEnded={endGameAndCleanup}
            onAdStart={handleAdStart}
            onAdEnd={handleAdEnd}
            isPlaying={isPlaying}
            startTime={0}
          />
        ) : /* Hidden YouTube for audio only (video disabled but using YouTube audio) */
        !showBackgroundVideo && isYouTube && youtubeVideoId && useYouTubeAudio ? (
          /* Hidden YouTube player - we need to play it but not show it */
          <div className="hidden">
            <YouTubePlayer
              videoId={youtubeVideoId}
              videoGap={song.videoGap || 0}
              onReady={() => {}}
              onTimeUpdate={(time) => setYoutubeTime(time)}
              onEnded={endGameAndCleanup}
              onAdStart={handleAdStart}
              onAdEnd={handleAdEnd}
              isPlaying={isPlaying}
              startTime={0}
            />
          </div>
        ) : /* Local video file - separate audio (video muted, audio plays separately) */
        showBackgroundVideo && song.videoBackground && !song.hasEmbeddedAudio && !isYouTube ? (
          <video
            key={`video-bg-${song.id}`}
            ref={videoRef}
            src={song.videoBackground}
            className="absolute inset-0 w-full h-full object-cover"
            muted={true}
            playsInline
            autoPlay={false}
            preload="auto"
            onEnded={endGameAndCleanup}
          />
        ) : /* Video with embedded audio - visible AND plays audio */
        showBackgroundVideo && song.videoBackground && song.hasEmbeddedAudio && !isYouTube ? (
          <video
            key={`video-embedded-${song.id}`}
            ref={videoRef}
            src={song.videoBackground}
            className="absolute inset-0 w-full h-full object-cover"
            muted={false}
            playsInline
            autoPlay={false}
            preload="auto"
            onEnded={endGameAndCleanup}
            onLoadedMetadata={(e) => {
              console.log('[GameScreen] Video metadata loaded:', {
                duration: e.currentTarget.duration,
                videoWidth: e.currentTarget.videoWidth,
                videoHeight: e.currentTarget.videoHeight,
                muted: e.currentTarget.muted,
                volume: e.currentTarget.volume
              });
            }}
            onCanPlay={() => {
              console.log('[GameScreen] Video can play - ready for playback');
            }}
          />
        ) : /* Background image from #BACKGROUND: or #COVER: tag */
        showBackgroundVideo && !useAnimatedBackground && (song.backgroundImage || song.coverImage) ? (
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${song.backgroundImage || song.coverImage})`,
            }}
          >
            {/* Dark overlay for better note visibility */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : /* Music-reactive animated background (default fallback or when enabled) */
        useAnimatedBackground ? (
          <MusicReactiveBackground 
            volume={volume} 
            isPlaying={isPlaying} 
            bpm={song.bpm}
            intensity={1}
          />
        ) : (
          <AnimatedGradientBackground 
            volume={volume} 
            isPlaying={isPlaying} 
            bpm={song.bpm}
          />
        )}

        {/* Webcam Background - SEPARATE camera for filming singers */}
        <WebcamBackground 
          config={webcamConfig} 
          onConfigChange={updateWebcamConfig}
        />

        {/* Countdown */}
        {countdown > 0 && (
          <div key={countdown} className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div 
              className="text-9xl font-black text-white drop-shadow-2xl"
              style={{
                animation: 'countdownPop 0.3s ease-out'
              }}
            >
              {countdown}
            </div>
          </div>
        )}
        
        {/* Ad Indicator - Small non-blocking indicator when YouTube ad is playing */}
        {isAdPlaying && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-full border border-yellow-500/50 flex items-center gap-3">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-yellow-400 font-medium">Werbung läuft</span>
              <span className="text-white/60">-</span>
              <span className="text-white/80">Spiel pausiert</span>
              {adCountdown > 0 && (
                <>
                  <span className="text-white/60">-</span>
                  <span className="text-cyan-400 font-bold">{adCountdown}s</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dark Overlay for better note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Duet Mode Split-Screen Note Highway */}
        {isDuetMode ? (
          <div className="absolute inset-0 z-10 flex flex-col">
            {/* ===== PLAYER 1 (TOP HALF - CYAN) ===== */}
            <div className="relative flex-1 border-b-2 border-cyan-500/30 overflow-hidden" style={{ height: '50%' }}>
              {/* P1 Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/20 to-transparent pointer-events-none" />
              
              {/* P1 Pitch Lines */}
              <div className="absolute inset-0">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t border-cyan-500/10"
                    style={{ top: `${(i / 6) * 100}%` }}
                  />
                ))}
              </div>

              {/* P1 Sing Line */}
              <div 
                className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
                style={{ left: `${SING_LINE_POSITION}%` }}
              >
                <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-cyan-500/30" />
              </div>

              {/* P1 Pitch constants - defined at component scope for use in Pitch Indicator */}
              {/* P1 Notes */}
              {(() => {
                // Constants for half-screen pitch calculation - used by both notes and pitch indicator
                const halfVisibleRange = 42;
                const halfVisibleTop = 8;
                
                return <>
                  {p1VisibleNotes.map((note) => {
                    const timeUntilNote = note.startTime - gameState.currentTime;
                    const noteEnd = note.startTime + note.duration;
                    const isActive = gameState.currentTime >= note.startTime && gameState.currentTime <= noteEnd;
                    
                    const distanceFromSingLine = (timeUntilNote / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
                    const x = SING_LINE_POSITION + distanceFromSingLine;
                    
                    const pitchY = halfVisibleTop + halfVisibleRange - ((note.pitch - p1PitchStats.minPitch) / p1PitchStats.pitchRange) * halfVisibleRange;
                    
                    const noteWidthPercent = (note.duration / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
                    const noteHeight = 24;
                    
                    return (
                      <div
                        key={note.id}
                        className={`absolute rounded-md ${
                          note.isGolden 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50' 
                            : note.isBonus 
                            ? 'bg-gradient-to-r from-cyan-400 to-teal-500' 
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                        } ${isActive ? 'ring-2 ring-cyan-300/80 brightness-125' : ''}`}
                        style={{
                          left: `${x}%`,
                          top: `${pitchY}%`,
                          width: `${noteWidthPercent}%`,
                          height: `${noteHeight}px`,
                          transform: 'translateY(-50%)',
                          boxShadow: isActive ? '0 0 15px rgba(34, 211, 238, 0.8)' : 'none',
                          opacity: x > 120 || x < -30 ? 0 : 1,
                        }}
                      />
                    );
                  })}

                  {/* P1 Pitch Indicator */}
                  {pitchResult?.frequency && pitchResult.note && (
                    <div
                      className="absolute z-30 w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/70 flex items-center justify-center ring-2 ring-cyan-300"
                      style={{
                        left: `${SING_LINE_POSITION - 1.5}%`,
                        top: `${halfVisibleTop + halfVisibleRange - ((pitchResult.note - p1PitchStats.minPitch) / p1PitchStats.pitchRange) * halfVisibleRange}%`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <MicIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </>;
              })()}

              {/* P1 Score Display */}
              <div className="absolute top-2 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                    P1
                  </div>
                  <span className="text-lg font-bold text-cyan-400">{gameState.players[0]?.score?.toLocaleString() || 0}</span>
                  <span className="text-xs text-cyan-300/60">{gameState.players[0]?.combo || 0}x</span>
                </div>
              </div>
            </div>

            {/* VS BADGE - Center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
              <div className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold px-5 py-2 rounded-full text-lg shadow-lg ring-4 ring-white/20">
                VS
              </div>
            </div>

            {/* ===== PLAYER 2 (BOTTOM HALF - PINK) ===== */}
            <div className="relative flex-1 overflow-hidden" style={{ height: '50%' }}>
              {/* P2 Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-pink-900/20 to-transparent pointer-events-none" />
              
              {/* P2 Pitch Lines */}
              <div className="absolute inset-0">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-t border-pink-500/10"
                    style={{ top: `${(i / 6) * 100}%` }}
                  />
                ))}
              </div>

              {/* P2 Sing Line */}
              <div 
                className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent via-pink-400 to-transparent shadow-lg shadow-pink-400/50"
                style={{ left: `${SING_LINE_POSITION}%` }}
              >
                <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-pink-500/30" />
              </div>

              {/* P2 Notes */}
              {(() => {
                // Constants for half-screen pitch calculation - used by both notes and pitch indicator
                const halfVisibleRange = 42;
                const halfVisibleTop = 8;
                
                return <>
                  {p2VisibleNotes.map((note) => {
                    const timeUntilNote = note.startTime - gameState.currentTime;
                    const noteEnd = note.startTime + note.duration;
                    const isActive = gameState.currentTime >= note.startTime && gameState.currentTime <= noteEnd;
                    
                    const distanceFromSingLine = (timeUntilNote / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
                    const x = SING_LINE_POSITION + distanceFromSingLine;
                    
                    const pitchY = halfVisibleTop + halfVisibleRange - ((note.pitch - p2PitchStats.minPitch) / p2PitchStats.pitchRange) * halfVisibleRange;
                    
                    const noteWidthPercent = (note.duration / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
                    const noteHeight = 24;
                    
                    return (
                      <div
                        key={`p2-${note.id}`}
                        className={`absolute rounded-md ${
                          note.isGolden 
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50' 
                            : note.isBonus 
                            ? 'bg-gradient-to-r from-pink-400 to-rose-500' 
                            : 'bg-gradient-to-r from-pink-500 to-purple-500'
                        } ${isActive ? 'ring-2 ring-pink-300/80 brightness-125' : ''}`}
                        style={{
                          left: `${x}%`,
                          top: `${pitchY}%`,
                          width: `${noteWidthPercent}%`,
                          height: `${noteHeight}px`,
                          transform: 'translateY(-50%)',
                          boxShadow: isActive ? '0 0 15px rgba(236, 72, 153, 0.8)' : 'none',
                          opacity: x > 120 || x < -30 ? 0 : 1,
                        }}
                      />
                    );
                  })}

                  {/* P2 Pitch Indicator */}
                  {p2DetectedPitch && pitchResult?.note && (
                    <div
                      className="absolute z-30 w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-600 shadow-lg shadow-pink-500/70 flex items-center justify-center ring-2 ring-pink-300"
                      style={{
                        left: `${SING_LINE_POSITION - 1.5}%`,
                        top: `${halfVisibleTop + halfVisibleRange - ((pitchResult.note - p2PitchStats.minPitch) / p2PitchStats.pitchRange) * halfVisibleRange}%`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <MicIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </>;
              })()}

              {/* P2 Score Display */}
              <div className="absolute top-2 left-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-pink-500/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-white">
                    P2
                  </div>
                  <span className="text-lg font-bold text-pink-400">{player2Score.toLocaleString()}</span>
                  <span className="text-xs text-pink-300/60">{p2Combo}x</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ===== SINGLE PLAYER NOTE HIGHWAY (ORIGINAL) ===== */
          <div className="absolute inset-0 z-10">
            {/* Pitch Lines */}
            <div className="absolute inset-0">
              {Array.from({ length: 13 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-white/5"
                  style={{ top: `${(i / 12) * 100}%` }}
                />
              ))}
            </div>

            {/* Sing Line - Vertical marker at 25% from left (like UltraStar/Vocaluxe) */}
            <div 
              className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
              style={{ left: `${SING_LINE_POSITION}%` }}
            >
              <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-white/20" />
              <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 text-xs font-bold whitespace-nowrap">
                SING
              </div>
            </div>

            {/* Notes - Smoothly Moving Right to Left (UltraStar style) */}
            {visibleNotes.map((note) => {
              const timeUntilNote = note.startTime - gameState.currentTime;
              const noteEnd = note.startTime + note.duration;
              const timeUntilEnd = noteEnd - gameState.currentTime;
              const isActive = gameState.currentTime >= note.startTime && gameState.currentTime <= noteEnd;
              
              const distanceFromSingLine = (timeUntilNote / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
              const x = SING_LINE_POSITION + distanceFromSingLine;
              
              const pitchY = VISIBLE_TOP + VISIBLE_RANGE - ((note.pitch - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE;
              
              const noteWidthPercent = (note.duration / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
              const noteHeight = 32;
              
              return (
                <div
                  key={note.id}
                  className={`absolute rounded-md ${
                    note.isGolden 
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50' 
                      : note.isBonus 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                  } ${isActive ? 'ring-2 ring-white/80 brightness-125' : ''}`}
                  style={{
                    left: `${x}%`,
                    top: `${pitchY}%`,
                    width: `${noteWidthPercent}%`,
                    height: `${noteHeight}px`,
                    transform: 'translateY(-50%)',
                    boxShadow: isActive ? '0 0 20px rgba(34, 211, 238, 0.6)' : 'none',
                    opacity: x > 120 || x < -30 ? 0 : 1,
                  }}
                />
              );
            })}

            {/* Detected Pitch Indicator - Ball that moves up/down with voice */}
            {pitchResult?.frequency && pitchResult.note && (
              <div
                className="absolute z-30 w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 flex items-center justify-center"
                style={{
                  left: `${SING_LINE_POSITION - 2}%`,
                  top: `${VISIBLE_TOP + VISIBLE_RANGE - ((pitchResult.note - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE}%`,
                  transform: 'translateY(-50%)',
                }}
              >
                <MicIcon className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Lyrics Display - Karaoke style with color progression */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
            {/* Current Line - Show 2 seconds before it starts */}
            {(() => {
              // Find current or upcoming line (show 2000ms before start)
              const PREVIEW_TIME = 2000; // Show lyrics 2 seconds before singing
              const currentTime = gameState.currentTime;
              
              // First try to find the currently singing line
              let displayLine = timingData?.sortedLines.find(line => 
                currentTime >= line.startTime && currentTime <= line.endTime
              );
              
              // If no active line, find the next upcoming line within preview window
              if (!displayLine && timingData) {
                for (const line of timingData.sortedLines) {
                  if (currentTime >= line.startTime - PREVIEW_TIME && currentTime < line.startTime) {
                    displayLine = line;
                    break;
                  }
                }
              }
              
              if (!displayLine) return null;
              
              // Calculate time until singing starts (for flying animation)
              const timeUntilSing = displayLine.startTime - currentTime;
              const isSinging = currentTime >= displayLine.startTime;
              
              // Flying animation: starts 2 seconds before, lands when singing starts
              const flyProgress = Math.max(0, Math.min(1, 1 - (timeUntilSing / PREVIEW_TIME)));
              const isFlying = !isSinging && timeUntilSing > 0 && timeUntilSing < PREVIEW_TIME;
              
              return (
                <div className="text-2xl md:text-3xl font-bold text-center drop-shadow-lg relative w-full">
                  {/* Flying Line Indicator - Animated ball that moves from screen edge to text position */}
                  {isFlying && (
                    <div 
                      className="fixed top-1/2 -translate-y-1/2 flex items-center pointer-events-none"
                      style={{
                        // Start from left edge of viewport (0), end at center of screen (50%)
                        left: `${flyProgress * 50}%`,
                        transform: 'translateX(-50%) translateY(-50%)',
                        opacity: 0.5 + flyProgress * 0.5,
                        zIndex: 100,
                      }}
                    >
                      <div 
                        className="rounded-full flex items-center justify-center"
                        style={{
                          width: `${12 + flyProgress * 8}px`,
                          height: `${12 + flyProgress * 8}px`,
                          background: 'radial-gradient(circle, rgba(34, 211, 238, 1) 0%, rgba(34, 211, 238, 0.7) 50%, transparent 100%)',
                          boxShadow: `0 0 ${20 + flyProgress * 40}px rgba(34, 211, 238, ${0.6 + flyProgress * 0.4})`,
                          animation: 'pulse 0.4s ease-in-out infinite',
                        }}
                      />
                      <svg 
                        className="text-cyan-400"
                        style={{
                          width: `${16 + flyProgress * 8}px`,
                          height: `${16 + flyProgress * 8}px`,
                          marginLeft: '4px',
                          filter: `drop-shadow(0 0 ${10 + flyProgress * 15}px rgba(34, 211, 238, 0.9))`,
                        }}
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Pulsing indicator during singing */}
                  {isSinging && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2">
                      <div 
                        className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"
                        style={{ boxShadow: '0 0 15px rgba(34, 211, 238, 0.8)' }}
                      />
                    </div>
                  )}
                  
                  <LyricLineDisplay 
                    line={displayLine} 
                    currentTime={currentTime} 
                    playerColor={PLAYER_COLORS[0]}
                    noteDisplayStyle={noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
                    notePerformance={notePerformance}
                  />
                </div>
              );
            })()}
            
            {/* Next Line Preview */}
            {(() => {
              const currentTime = gameState.currentTime;
              if (!timingData) return null;
              
              // Find the line after the current/upcoming one
              let currentLineIndex = -1;
              for (let i = 0; i < timingData.sortedLines.length; i++) {
                const line = timingData.sortedLines[i];
                if (currentTime >= line.startTime - 2000 && currentTime <= line.endTime) {
                  currentLineIndex = i;
                  break;
                }
              }
              
              const nextLine = currentLineIndex >= 0 ? timingData.sortedLines[currentLineIndex + 1] : null;
              if (!nextLine) return null;
              
              // Join notes WITHOUT extra spaces (UltraStar format already has trailing spaces)
              const nextLineText = nextLine.notes.map(n => n.lyric).join('');
              return (
                <p className="text-base md:text-lg text-center text-white/40 mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                  {nextLineText}
                </p>
              );
            })()}
          </div>
        </div>

        {/* Volume Meter */}
        <div className="absolute top-16 right-4 z-20">
          <div className="w-3 h-24 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ height: `${volume * 100}%`, marginTop: `${(1 - volume) * 100}%` }}
            />
          </div>
        </div>

        {/* Duel Mode Split-Screen UI */}
        {gameState.gameMode === 'duel' && duelMatch && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
              {/* Player 1 */}
              <div className="bg-white/5 rounded-xl p-3 border border-cyan-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-sm font-bold">
                    {gameState.players[0]?.name?.[0] || 'P1'}
                  </div>
                  <span className="font-medium">{gameState.players[0]?.name || 'Player 1'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-cyan-400">{gameState.players[0]?.score?.toLocaleString() || 0}</span>
                  <span className="text-purple-400">{gameState.players[0]?.combo || 0}x</span>
                </div>
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all"
                    style={{ width: `${gameState.players[0]?.accuracy || 0}%` }}
                  />
                </div>
              </div>
              
              {/* Player 2 */}
              <div className="bg-white/5 rounded-xl p-3 border border-pink-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm font-bold">
                    {gameState.players[1]?.name?.[0] || 'P2'}
                  </div>
                  <span className="font-medium">{gameState.players[1]?.name || 'Player 2'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-pink-400">{duelMatch.player2?.score?.toLocaleString() || player2Score}</span>
                  <span className="text-purple-400">{duelMatch.player2?.combo || 0}x</span>
                </div>
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-pink-500 transition-all"
                    style={{ width: `${duelMatch.player2?.accuracy || 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* VS Badge */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-lg">
              VS
            </div>
          </div>
        )}

        {/* Audio Effects Button */}
        <button
          onClick={() => setShowAudioEffects(!showAudioEffects)}
          className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          title="Audio Effects"
        >
          🎛️
        </button>

        {/* Audio Effects Panel */}
        {showAudioEffects && (
          <div className="fixed bottom-40 right-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
            <h4 className="font-semibold mb-3">Audio Effects</h4>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-white/60">Reverb: {Math.round(reverbAmount * 100)}%</span>
                <input type="range" min="0" max="100" value={reverbAmount * 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    setReverbAmount(val);
                    audioEffects?.setReverb(val);
                  }}
                  className="w-full accent-purple-500" />
              </div>
              <div>
                <span className="text-xs text-white/60">Echo: {Math.round(echoAmount * 100)}%</span>
                <input type="range" min="0" max="100" value={echoAmount * 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) / 100;
                    setEchoAmount(val);
                    audioEffects?.setDelay(val * 0.5, val * 0.5);
                  }}
                  className="w-full accent-cyan-500" />
              </div>
            </div>
          </div>
        )}
        
        {/* Progress Bar - Full Width Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            style={{ width: `${(gameState.currentTime / song.duration) * 100}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
          {Math.floor(gameState.currentTime / 60000)}:{String(Math.floor((gameState.currentTime % 60000) / 1000)).padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
        </div>
      </div>

      {/* Practice Mode Button */}
      <button
        onClick={() => setShowPracticeControls(!showPracticeControls)}
        className={`fixed bottom-24 left-4 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          practiceMode.enabled ? 'bg-purple-500 ring-2 ring-purple-300' : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        🎯
      </button>

      {/* Practice Controls Panel */}
      {showPracticeControls && (
        <div className="fixed bottom-40 left-4 z-30 w-72 bg-gray-800/95 rounded-xl p-4 border border-white/20">
          <h4 className="font-semibold mb-3">Practice Mode</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={practiceMode.enabled} 
                onChange={(e) => setPracticeMode(p => ({ ...p, enabled: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span className="text-sm">Enable Practice Mode</span>
            </label>
            <div>
              <span className="text-xs text-white/60">Playback Speed: {Math.round(practiceMode.playbackRate * 100)}%</span>
              <input type="range" min="0.5" max="1.5" step="0.05" value={practiceMode.playbackRate}
                onChange={(e) => setPracticeMode(p => ({ ...p, playbackRate: parseFloat(e.target.value) }))}
                className="w-full accent-purple-500" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={practiceMode.pitchGuideEnabled}
                onChange={(e) => setPracticeMode(p => ({ ...p, pitchGuideEnabled: e.target.checked }))}
                className="w-4 h-4 rounded" />
              <span className="text-sm">Pitch Guide</span>
            </label>
          </div>
        </div>
      )}

      {/* Score Events - Enhanced visual feedback with prominent popup */}
      {/* Different colors: Perfect (gold/yellow), Great (green), Good (blue), Okay (orange), Miss (gray) */}
      <div className="fixed top-1/2 right-8 -translate-y-1/2 flex flex-col-reverse gap-3 z-50 pointer-events-none">
        {scoreEvents.slice(-5).map((event, i) => (
          <div
            key={`${event.time}-${i}`}
            className={`px-5 py-3 rounded-xl font-bold text-xl shadow-2xl transform ${
              event.displayType === 'Perfect' ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 text-black ring-4 ring-yellow-200/60' :
              event.displayType === 'Great' ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white ring-2 ring-green-300/40' :
              event.displayType === 'Good' ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white ring-2 ring-blue-300/30' :
              event.displayType === 'Okay' ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white ring-2 ring-orange-300/30' :
              'bg-gradient-to-r from-gray-500 to-gray-700 text-white ring-2 ring-gray-400/30'
            }`}
            style={{
              animation: 'scorePopIn 0.4s ease-out, fadeOut 1.5s ease-in-out forwards',
              animationDelay: `${i * 0.05}s`,
              boxShadow: event.displayType === 'Perfect' 
                ? '0 0 30px rgba(255, 200, 0, 0.7), 0 0 60px rgba(255, 150, 0, 0.4), 0 0 90px rgba(255, 100, 0, 0.2)' 
                : event.displayType === 'Great'
                ? '0 0 25px rgba(34, 197, 94, 0.6), 0 0 50px rgba(34, 197, 94, 0.3)'
                : event.displayType === 'Good'
                ? '0 0 15px rgba(59, 130, 246, 0.5)'
                : event.displayType === 'Okay'
                ? '0 0 15px rgba(249, 115, 22, 0.5)'
                : '0 0 15px rgba(107, 114, 128, 0.5)'
            }}
          >
            <span className="flex items-center gap-2">
              {event.displayType === 'Perfect' && <span className="text-3xl animate-bounce">⭐</span>}
              {event.displayType === 'Great' && <span className="text-2xl">✨</span>}
              {event.displayType === 'Good' && <span className="text-xl">🎵</span>}
              {event.displayType === 'Okay' && <span className="text-xl">🎶</span>}
              {event.displayType === 'Miss' && <span className="text-xl">❌</span>}
              <span className="text-lg">{event.displayType.toUpperCase()}</span>
              {event.points > 0 && <span className="text-2xl font-black">+{event.points}</span>}
            </span>
          </div>
        ))}
      </div>
      
      {/* Total Score Display - Larger, more prominent with max score */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-10 py-4 rounded-2xl border-2 border-white/20 shadow-xl" style={{ boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)' }}>
          <div className="flex flex-col items-center gap-1">
            {/* Main Score */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 drop-shadow-lg">
                {gameState.players[0]?.score?.toLocaleString() || 0}
              </span>
              <span className="text-white/40 text-lg">/ {MAX_POINTS_PER_SONG.toLocaleString()}</span>
            </div>
            
            {/* Combo and Multiplier Row */}
            <div className="flex items-center gap-4 text-sm">
              {gameState.players[0]?.combo && gameState.players[0].combo >= 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-lg">
                    {gameState.players[0].combo}x
                  </span>
                  <span className="text-white/60">COMBO</span>
                  {/* Combo multiplier indicator */}
                  {gameState.players[0].combo >= 5 && (
                    <span className="text-green-400 font-semibold">
                      (+{Math.round(Math.min(0.5, gameState.players[0].combo * 0.02) * 100)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Combo indicator with glow effect */}
      {gameState.players[0]?.combo && gameState.players[0].combo >= 5 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div 
            className="text-4xl font-black animate-pulse"
            style={{
              color: gameState.players[0].combo >= 20 ? '#FFD700' : 
                     gameState.players[0].combo >= 10 ? '#FF6B6B' : '#4ECDC4',
              textShadow: `0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor`,
            }}
          >
            {gameState.players[0].combo}x COMBO! 🔥
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== PARTY SCREEN =====================
function PartyScreen({ onSelectMode }: { onSelectMode: (mode: GameMode) => void }) {
  const partyGames = [
    {
      mode: 'pass-the-mic' as GameMode,
      title: 'Pass the Mic',
      description: 'Take turns singing parts of a song. When the music stops, the next singer takes over!',
      icon: '🎤',
      players: '2-8',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      mode: 'companion-singalong' as GameMode,
      title: 'Companion Sing-A-Long',
      description: 'Your phone randomly lights up - that\'s your cue to sing! No one knows who\'s next until the blink!',
      icon: '📱',
      players: '2-8',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      mode: 'medley' as GameMode,
      title: 'Medley Contest',
      description: 'Sing short snippets of multiple songs in a row. How many can you nail?',
      icon: '🎵',
      players: '1-4',
      color: 'from-purple-500 to-pink-500',
    },
    {
      mode: 'missing-words' as GameMode,
      title: 'Missing Words',
      description: 'Some lyrics disappear! Can you sing the right words at the right time?',
      icon: '📝',
      players: '1-4',
      color: 'from-orange-500 to-red-500',
    },
    {
      mode: 'duet' as GameMode,
      title: 'Duet Mode',
      description: 'Two players sing together! Split-screen with separate note tracks for each vocalist.',
      icon: '🎭',
      players: '2',
      color: 'from-cyan-500 to-pink-500',
      isNew: true,
    },
    {
      mode: 'duel' as GameMode,
      title: 'Duel Mode',
      description: 'Two players sing the same song side by side. Who will score higher?',
      icon: '⚔️',
      players: '2',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      mode: 'blind' as GameMode,
      title: 'Blind Karaoke',
      description: 'Lyrics disappear for certain sections. Can you remember the words?',
      icon: '🙈',
      players: '1-4',
      color: 'from-green-500 to-teal-500',
    },
    {
      mode: 'tournament' as GameMode,
      title: 'Tournament Mode',
      description: 'Single elimination bracket! 4-32 players compete in Sudden-Death matches. Who will be champion?',
      icon: '🏆',
      players: '4-32',
      color: 'from-amber-500 to-yellow-500',
      isNew: true,
    },
    {
      mode: 'battle-royale' as GameMode,
      title: 'Battle Royale',
      description: 'All players sing simultaneously! Lowest score gets eliminated each round. Last singer standing wins!',
      icon: '👑',
      players: '2-8',
      color: 'from-red-600 to-pink-600',
      isNew: true,
    },
    {
      mode: 'online' as GameMode,
      title: 'Online Multiplayer',
      description: 'Play against friends or find opponents online! Create rooms, join matches, and compete globally!',
      icon: '🌐',
      players: '2-8',
      color: 'from-cyan-500 to-purple-600',
      isNew: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Party Games</h1>
        <p className="text-white/60">Choose a game mode for your party!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partyGames.map((game) => (
          <Card 
            key={game.mode}
            className={`bg-gradient-to-br ${game.color} border-0 cursor-pointer hover:scale-105 transition-transform relative`}
            onClick={() => onSelectMode(game.mode)}
          >
            <CardContent className="pt-6">
              {game.isNew && (
                <div className="absolute top-2 right-2 bg-white/90 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  ✨ NEW
                </div>
              )}
              <div className="text-5xl mb-4">{game.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-2">{game.title}</h3>
              <p className="text-white/80 mb-4">{game.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {game.players} players
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Challenge Modes Section */}
      <div className="mt-12 mb-8">
        <h2 className="text-2xl font-bold mb-2">🎯 Challenge Modes</h2>
        <p className="text-white/60 mb-6">Special modifiers for extra XP rewards!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CHALLENGE_MODES.map((challenge) => (
            <Card 
              key={challenge.id}
              className={`bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-all relative ${
                challenge.difficulty === 'extreme' ? 'border-red-500/30' :
                challenge.difficulty === 'hard' ? 'border-orange-500/30' :
                challenge.difficulty === 'medium' ? 'border-yellow-500/30' : 'border-green-500/30'
              }`}
              onClick={() => {
                // Store challenge mode and go to library
                localStorage.setItem('karaoke-challenge-mode', challenge.id);
                onSelectMode('single');
              }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="text-3xl mb-2">{challenge.icon}</div>
                <h4 className="font-bold text-white mb-1">{challenge.name}</h4>
                <p className="text-xs text-white/60 mb-3 line-clamp-2">{challenge.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`text-xs ${
                    challenge.difficulty === 'extreme' ? 'border-red-500 text-red-400' :
                    challenge.difficulty === 'hard' ? 'border-orange-500 text-orange-400' :
                    challenge.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' : 'border-green-500 text-green-400'
                  }`}>
                    {challenge.difficulty.toUpperCase()}
                  </Badge>
                  <span className="text-cyan-400 font-bold text-sm">+{challenge.xpReward} XP</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================== CHARACTER SCREEN =====================
// Country options for selection
const COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
];

function CharacterScreen() {
  const { profiles, createProfile, updateProfile, deleteProfile, activeProfileId, setActiveProfile, onlineEnabled, setOnlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [privacySettings, setPrivacySettings] = useState({
    showOnLeaderboard: true,
    showPhoto: true,
    showCountry: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Player progression state
  const [playerProgression, setPlayerProgression] = useState<ExtendedPlayerStats | null>(() => {
    // Initialize synchronously to avoid effect
    if (typeof window !== 'undefined') {
      return getExtendedStats();
    }
    return null;
  });
  
  // Get active profile's progression info
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerLevel = playerProgression ? getLevelForXP(playerProgression.totalXP) : null;
  const playerRank = playerProgression ? getRankForXP(playerProgression.totalXP) : null;

  const handleCreate = () => {
    if (newName.trim()) {
      const profile = createProfile(newName.trim(), avatarUrl || undefined);
      // Update with privacy settings and country
      updateProfile(profile.id, {
        country: selectedCountry || undefined,
        privacy: privacySettings,
      });
      setNewName('');
      setAvatarUrl('');
      setSelectedCountry('');
      setPrivacySettings({ showOnLeaderboard: true, showPhoto: true, showCountry: true });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePrivacy = (profileId: string, field: string, value: boolean) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      updateProfile(profileId, {
        privacy: {
          ...(profile.privacy || { showOnLeaderboard: true, showPhoto: true, showCountry: true }),
          [field]: value,
        },
      });
    }
  };

  const handleUpdateCountry = (profileId: string, country: string) => {
    updateProfile(profileId, { country: country || undefined });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Character Creation</h1>
        <p className="text-white/60">Create and manage your singer profiles</p>
      </div>

      {/* Online Leaderboard Settings */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="w-5 h-5" />
            Online Leaderboard
          </CardTitle>
          <CardDescription>Connect to the global leaderboard and compete with singers worldwide</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-3">
              <span className="text-white/60">Enable Online:</span>
              <button
                onClick={() => setOnlineEnabled(!onlineEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${onlineEnabled ? 'bg-cyan-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${onlineEnabled ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
            {onlineEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-white/60">Default View:</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setLeaderboardType('local')}
                    size="sm"
                    className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
                  >
                    Local
                  </Button>
                  <Button
                    onClick={() => setLeaderboardType('global')}
                    size="sm"
                    className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
                  >
                    Global
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Progression - XP, Level, Rank */}
      {playerProgression && (
        <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-4xl">{playerRank?.icon || '🎵'}</span>
              <div>
                <div className="text-2xl font-bold">{playerRank?.name || 'Beginner'}</div>
                <div className="text-sm text-white/60">
                  Level {playerLevel?.level || 1} • {playerProgression.totalXP.toLocaleString()} XP
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* XP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Progress to Next Level</span>
                <span className="text-purple-400">{playerLevel?.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                  style={{ width: `${playerLevel?.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>{playerLevel?.currentXP || 0} XP</span>
                <span>{playerLevel?.nextLevelXP || 500} XP needed</span>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-cyan-400">{playerProgression.totalSessions}</div>
                <div className="text-xs text-white/60">Songs Played</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-400">{playerProgression.totalGoldenNotesHit}</div>
                <div className="text-xs text-white/60">Golden Notes</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{playerProgression.currentDailyStreak}</div>
                <div className="text-xs text-white/60">Day Streak</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-400">{playerProgression.challengesCompleted}</div>
                <div className="text-xs text-white/60">Challenges</div>
              </div>
            </div>
            
            {/* Unlocked Titles */}
            {playerProgression.unlockedTitles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-white/60 mb-2">Unlocked Titles</h4>
                <div className="flex flex-wrap gap-2">
                  {playerProgression.unlockedTitles.slice(0, 5).map((titleId) => {
                    const title = TITLES.find(t => t.id === titleId);
                    return title ? (
                      <Badge 
                        key={titleId}
                        className="bg-white/10 border border-white/20"
                        style={{ borderColor: getRarityColorProgression(title.rarity) }}
                      >
                        {title.icon} {title.name}
                      </Badge>
                    ) : null;
                  })}
                  {playerProgression.unlockedTitles.length > 5 && (
                    <Badge className="bg-white/10">+{playerProgression.unlockedTitles.length - 5} more</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create New Character */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle>Create New Character</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 text-sm text-center">Upload<br/>Photo</span>
                )}
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            <div className="flex-1 space-y-4">
              <Input
                id="character-name"
                name="character-name"
                placeholder="Character name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              
              {/* Country Selection */}
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
              >
                <option value="">Select Country (optional)</option>
                {COUNTRY_OPTIONS.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>

              {/* Privacy Settings */}
              {onlineEnabled && (
                <div className="bg-white/5 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-white/80">Privacy Settings</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showOnLeaderboard}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showOnLeaderboard: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-white/70">Show on global leaderboard</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showPhoto}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showPhoto: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-white/70">Show profile photo publicly</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={privacySettings.showCountry}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showCountry: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm text-white/70">Show country flag</span>
                    </label>
                  </div>
                </div>
              )}

              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-gradient-to-r from-cyan-500 to-purple-500">
                Create Character
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Characters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Characters</h2>
        {profiles.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-8 text-center text-white/60">
              No characters yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {profiles.map((profile) => (
              <Card 
                key={profile.id}
                className={`bg-white/5 border-white/10 cursor-pointer transition-all ${
                  activeProfileId === profile.id ? 'ring-2 ring-cyan-500' : ''
                }`}
                onClick={() => setActiveProfile(profile.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                        ) : (
                          profile.name[0].toUpperCase()
                        )}
                      </div>
                      {profile.country && (
                        <span className="text-2xl" title={COUNTRY_OPTIONS.find(c => c.code === profile.country)?.name}>
                          {COUNTRY_OPTIONS.find(c => c.code === profile.country)?.flag || ''}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                        {/* Active/Inactive Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProfile(profile.id, { isActive: !(profile.isActive ?? true) });
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                            (profile.isActive ?? true) 
                              ? 'bg-green-500/30 text-green-300' 
                              : 'bg-red-500/30 text-red-300'
                          }`}
                          title={(profile.isActive ?? true) ? 'Profile is active - click to deactivate' : 'Profile is inactive - click to activate'}
                        >
                          {(profile.isActive ?? true) ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-green-400" />
                              Active
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-red-400" />
                              Inactive
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2 text-sm text-white/60 mb-2">
                        <span>{profile.gamesPlayed} games</span>
                        <span>•</span>
                        <span>{profile.totalScore.toLocaleString()} pts</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {profile.stats.totalNotesHit} notes hit
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {profile.stats.bestCombo} best combo
                        </Badge>
                      </div>

                      {/* Performance Analytics */}
                      <Card className="bg-white/5 border-white/10 mt-4 mb-4">
                        <CardHeader className="pb-2 pt-3">
                          <CardTitle className="text-sm">Performance Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-white/60">Grade:</span>
                              <span className="ml-2 font-bold text-yellow-400">{getPerformanceGrade(createEmptyPerformanceStats())}</span>
                            </div>
                            <div>
                              <span className="text-white/60">Total Play Time:</span>
                              <span className="ml-2">{formatPlayTime(profile.gamesPlayed * 180000)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Per-profile Privacy & Country Settings */}
                      {onlineEnabled && (
                        <div className="bg-white/5 rounded-lg p-3 space-y-3" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-4 items-center">
                            {/* Country Selector */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/50">Country:</span>
                              <select
                                value={profile.country || ''}
                                onChange={(e) => handleUpdateCountry(profile.id, e.target.value)}
                                className="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white"
                              >
                                <option value="">-</option>
                                {COUNTRY_OPTIONS.map(c => (
                                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Privacy Toggles */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleUpdatePrivacy(profile.id, 'showOnLeaderboard', !(profile.privacy?.showOnLeaderboard ?? true))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  (profile.privacy?.showOnLeaderboard ?? true) ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'
                                }`}
                              >
                                <GlobeIcon className="w-3 h-3" />
                                {(profile.privacy?.showOnLeaderboard ?? true) ? 'Visible' : 'Hidden'}
                              </button>
                              <button
                                onClick={() => handleUpdatePrivacy(profile.id, 'showPhoto', !(profile.privacy?.showPhoto ?? true))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  (profile.privacy?.showPhoto ?? true) ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/50'
                                }`}
                              >
                                {profile.avatar ? (
                                  (profile.privacy?.showPhoto ?? true) ? '📷 Shown' : '📷 Hidden'
                                ) : '📷 No photo'}
                              </button>
                              <button
                                onClick={() => handleUpdatePrivacy(profile.id, 'showCountry', !(profile.privacy?.showCountry ?? true))}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                  (profile.privacy?.showCountry ?? true) ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/50'
                                }`}
                              >
                                {profile.country ? (
                                  (profile.privacy?.showCountry ?? true) ? '🏳️ Shown' : '🏳️ Hidden'
                                ) : '🏳️ No country'}
                              </button>
                            </div>
                          </div>

                          {/* Profile Sync Section */}
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <h5 className="text-xs font-medium text-white/70 mb-2 flex items-center gap-2">
                              <CloudUploadIcon className="w-3 h-3" /> Profile Sync
                            </h5>
                            <ProfileSyncSection profile={profile} />
                          </div>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Profile Sync Section Component
function ProfileSyncSection({ profile }: { profile: PlayerProfile }) {
  const [syncCode, setSyncCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateProfile, highscores } = useGameStore();

  // Generate a new sync code
  const generateSyncCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Upload profile to server
  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);
    
    try {
      // Generate sync code if not exists
      const code = profile.syncCode || generateSyncCode();
      
      // Update profile with sync code locally
      updateProfile(profile.id, { syncCode: code });
      
      // Get highscores for this profile
      const profileHighscores: Record<string, HighscoreEntry[]> = {};
      highscores
        .filter(h => h.playerId === profile.id)
        .forEach(h => {
          if (!profileHighscores[h.songId]) {
            profileHighscores[h.songId] = [];
          }
          profileHighscores[h.songId].push(h);
        });
      
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const result = await leaderboardService.uploadProfile(profile, profileHighscores);
      
      if (result.success) {
        setSyncCode(code);
        setMessage({ type: 'success', text: `Profile uploaded! Sync code: ${code}` });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: unknown) {
      console.error('Profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  // Download profile from server
  const handleDownloadProfile = async () => {
    if (!inputCode || inputCode.length !== 8) {
      setMessage({ type: 'error', text: 'Please enter a valid 8-character sync code' });
      return;
    }
    
    setIsDownloading(true);
    setMessage(null);
    
    try {
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const downloadedProfile = await leaderboardService.downloadProfileByCode(inputCode.toUpperCase());
      
      if (downloadedProfile) {
        // Update the local profile with downloaded data
        updateProfile(profile.id, {
          name: downloadedProfile.name,
          avatar: downloadedProfile.avatar || undefined,
          country: downloadedProfile.country || undefined,
          color: downloadedProfile.color,
          stats: downloadedProfile.stats,
          achievements: downloadedProfile.achievements,
          privacy: downloadedProfile.settings.privacy,
          syncCode: downloadedProfile.sync_code,
        });
        
        setMessage({ type: 'success', text: 'Profile synced successfully!' });
        setInputCode('');
      } else {
        throw new Error('Profile not found');
      }
    } catch (error: unknown) {
      console.error('Profile download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download profile. Check the sync code.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Show existing sync code if available */}
      {profile.syncCode && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">Sync Code:</span>
          <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
            {profile.syncCode}
          </code>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUploadProfile}
          disabled={isUploading}
          className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          {isUploading ? (
            <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin mr-1" />
          ) : (
            <CloudUploadIcon className="w-3 h-3 mr-1" />
          )}
          Upload
        </Button>
        
        <div className="flex items-center gap-1">
          <Input
            id="sync-code"
            name="sync-code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Sync code"
            maxLength={8}
            className="h-7 w-28 text-xs bg-white/5 border-white/10"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadProfile}
            disabled={isDownloading || inputCode.length !== 8}
            className="h-7 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {isDownloading ? (
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudDownloadIcon className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Status message */}
      {message && (
        <div className={`text-xs p-2 rounded ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

// Globe Icon for online features
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Language Icon
function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Palette Icon
function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

// Keyboard Icon
function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.001" />
      <path d="M10 8h.001" />
      <path d="M14 8h.001" />
      <path d="M18 8h.001" />
      <path d="M8 12h.001" />
      <path d="M12 12h.001" />
      <path d="M16 12h.001" />
      <path d="M7 16h10" />
    </svg>
  );
}

// Cloud Upload Icon
function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </svg>
  );
}

// Cloud Download Icon
function CloudDownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 17 4 4 4-4" />
    </svg>
  );
}

// ===================== QUEUE SCREEN =====================
function QueueScreen() {
  const { queue, removeFromQueue, reorderQueue, clearQueue, activeProfileId, profiles } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Song Queue</h1>
        <p className="text-white/60">Up next: {queue.length} songs in queue (max 3 per player)</p>
      </div>

      {queue.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <QueueIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No songs in queue. Add songs from the library!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {queue.map((item, index) => (
              <Card key={item.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.song.title}</h3>
                    <p className="text-sm text-white/60">{item.song.artist}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: profiles.find(p => p.id === item.playerId)?.color || '#888' }}
                    >
                      {item.playerName[0]}
                    </div>
                    <span className="text-sm text-white/60">{item.playerName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" onClick={clearQueue} className="border-white/20 text-white">
            Clear Queue
          </Button>
        </>
      )}

      {/* Queue Rules */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Queue Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>• Maximum 3 songs per player at a time</p>
          <p>• Songs play in order they were added</p>
          <p>• You can remove your own songs from the queue</p>
          <p>• Select a character before adding to queue</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MOBILE CLIENT VIEW (Companion App) =====================
type MobileView = 'home' | 'profile' | 'songs' | 'queue' | 'mic' | 'results' | 'jukebox' | 'remote';

interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
}

// ===================== REMOTE CONTROL VIEW =====================
function RemoteControlView({ 
  clientId, 
  profile,
  onBack 
}: { 
  clientId: string | null; 
  profile: MobileProfile | null;
  onBack: () => void;
}) {
  const [remoteState, setRemoteState] = useState<{
    hasControl: boolean;
    lockedBy: string | null;
    lockedByName: string | null;
    isLoading: boolean;
    error: string | null;
  }>({
    hasControl: false,
    lockedBy: null,
    lockedByName: null,
    isLoading: true,
    error: null,
  });
  
  const [commandSent, setCommandSent] = useState<string | null>(null);
  
  // Poll remote control state
  useEffect(() => {
    const pollRemoteState = async () => {
      try {
        const response = await fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`);
        const data = await response.json();
        if (data.success) {
          setRemoteState(prev => ({
            ...prev,
            hasControl: data.remoteControl.iHaveControl,
            lockedBy: data.remoteControl.lockedBy,
            lockedByName: data.remoteControl.lockedByName,
            isLoading: false,
          }));
        }
      } catch {
        setRemoteState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    pollRemoteState();
    const interval = setInterval(pollRemoteState, 2000);
    return () => clearInterval(interval);
  }, [clientId]);
  
  // Acquire remote control
  const acquireControl = async () => {
    if (!clientId) return;
    
    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_acquire',
          clientId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRemoteState(prev => ({
          ...prev,
          hasControl: true,
          lockedBy: clientId,
          lockedByName: data.remoteControl.lockedByName,
          isLoading: false,
        }));
      } else {
        setRemoteState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || 'Failed to acquire control',
        }));
      }
    } catch {
      setRemoteState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Connection error',
      }));
    }
  };
  
  // Release remote control
  const releaseControl = async () => {
    if (!clientId) return;
    
    setRemoteState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_release',
          clientId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRemoteState(prev => ({
          ...prev,
          hasControl: false,
          lockedBy: null,
          lockedByName: null,
          isLoading: false,
        }));
      }
    } catch {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  // Send command
  const sendCommand = async (command: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'restart' | 'home' | 'library' | 'settings') => {
    if (!clientId || !remoteState.hasControl) return;
    
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_command',
          clientId,
          payload: { command },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCommandSent(command);
        setTimeout(() => setCommandSent(null), 1500);
      }
    } catch {
      // Error
    }
  };
  
  // Loading state
  if (remoteState.isLoading && !remoteState.lockedBy) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <h2 className="text-xl font-bold">🎮 Remote Control</h2>
      </div>
      
      {/* Status Card */}
      <Card className={`mb-6 ${remoteState.hasControl ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
        <CardContent className="py-4">
          {remoteState.hasControl ? (
            <div className="text-center">
              <div className="text-3xl mb-2">🎮</div>
              <p className="font-semibold text-cyan-400">You have control!</p>
              <p className="text-sm text-white/40 mt-1">You can now control the main app</p>
              <Button 
                onClick={releaseControl}
                variant="outline"
                className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Release Control
              </Button>
            </div>
          ) : remoteState.lockedBy ? (
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <p className="font-semibold text-orange-400">Control is locked</p>
              <p className="text-sm text-white/40 mt-1">
                {remoteState.lockedByName} is currently controlling the app
              </p>
              <p className="text-xs text-white/30 mt-2">
                Wait for them to release control
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-2">🔓</div>
              <p className="font-semibold text-white/60">Remote control available</p>
              <Button 
                onClick={acquireControl}
                className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500"
                disabled={remoteState.isLoading}
              >
                {remoteState.isLoading ? 'Acquiring...' : 'Take Control'}
              </Button>
              {remoteState.error && (
                <p className="text-red-400 text-sm mt-2">{remoteState.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Remote Control Buttons */}
      <div className={`space-y-4 ${!remoteState.hasControl ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Transport Controls */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Playback Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => sendCommand('previous')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'previous' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⏮️</span>
                <span className="text-xs">Prev</span>
              </Button>
              <Button
                onClick={() => sendCommand('play')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'play' ? 'bg-green-500/30' : ''}`}
              >
                <span className="text-xl">▶️</span>
                <span className="text-xs">Play</span>
              </Button>
              <Button
                onClick={() => sendCommand('pause')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'pause' ? 'bg-yellow-500/30' : ''}`}
              >
                <span className="text-xl">⏸️</span>
                <span className="text-xs">Pause</span>
              </Button>
              <Button
                onClick={() => sendCommand('next')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'next' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⏭️</span>
                <span className="text-xs">Next</span>
              </Button>
            </div>
            
            {/* Stop and Restart */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                onClick={() => sendCommand('stop')}
                variant="outline"
                className={`h-12 flex items-center gap-2 border-red-500/30 ${commandSent === 'stop' ? 'bg-red-500/30' : ''}`}
              >
                <span>⏹️</span>
                <span>Stop</span>
              </Button>
              <Button
                onClick={() => sendCommand('restart')}
                variant="outline"
                className={`h-12 flex items-center gap-2 border-purple-500/30 ${commandSent === 'restart' ? 'bg-purple-500/30' : ''}`}
              >
                <span>🔄</span>
                <span>Restart</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Navigation Controls */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => sendCommand('home')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'home' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">🏠</span>
                <span className="text-xs">Home</span>
              </Button>
              <Button
                onClick={() => sendCommand('library')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'library' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">📚</span>
                <span className="text-xs">Library</span>
              </Button>
              <Button
                onClick={() => sendCommand('settings')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'settings' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⚙️</span>
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Info */}
        <div className="text-center text-xs text-white/40 mt-4">
          <p>Only one device can control the app at a time.</p>
          <p>Commands are sent to the main screen instantly.</p>
        </div>
      </div>
    </div>
  );
}

// ===================== ONLINE MULTIPLAYER SCREEN =====================
function OnlineMultiplayerScreen({ onBack }: { onBack: () => void }) {
  const { setSong, setGameMode } = useGameStore();
  const [showGame, setShowGame] = useState(false);
  const [onlineRoom, setOnlineRoom] = useState<any>(null);
  const [socketRef, setSocketRef] = useState<any>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  const handleStartGame = useCallback((room: any, socket: any, song: Song) => {
    setOnlineRoom(room);
    setSocketRef(socket);
    setSelectedSong(song);
    setSong(song);
    setGameMode('duel');
    setShowGame(true);
  }, [setSong, setGameMode]);
  
  if (showGame && onlineRoom && selectedSong) {
    return (
      <OnlineGameScreen 
        room={onlineRoom}
        socket={socketRef}
        song={selectedSong}
        onEnd={() => {
          setShowGame(false);
          setOnlineRoom(null);
          setSelectedSong(null);
          onBack();
        }}
      />
    );
  }
  
  return (
    <OnlineLobby 
      onStartGame={handleStartGame}
      onBack={onBack}
    />
  );
}

// Online game screen with real-time score synchronization
function OnlineGameScreen({ room, socket, song, onEnd }: { room: any; socket: any; song: Song; onEnd: () => void }) {
  const { gameState, setSong, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults } = useGameStore();
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [scoreEvents, setScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [volume, setVolume] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
  // Opponent state for real-time sync
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentCombo, setOpponentCombo] = useState(0);
  const [opponentAccuracy, setOpponentAccuracy] = useState(0);
  const [opponentName, setOpponentName] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState<any>(null);
  
  // Get opponent info
  const myId = socket?.id;
  const opponent = room.players?.find((p: any) => p.id !== myId);
  
  useEffect(() => {
    if (opponent) {
      setOpponentName(opponent.name);
    }
  }, [opponent]);
  
  // Local player state
  const [localScore, setLocalScore] = useState(0);
  const [localCombo, setLocalCombo] = useState(0);
  const [localAccuracy, setLocalAccuracy] = useState(0);
  
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Initialize game
  useEffect(() => {
    setSong(song);
    initialize();
    
    return () => {
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [song, setSong, initialize, stop]);
  
  // Listen for opponent score updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('opponent-update', (data: { playerId: string; playerName: string; score: number; combo: number; accuracy: number }) => {
      setOpponentScore(data.score);
      setOpponentCombo(data.combo);
      setOpponentAccuracy(data.accuracy);
    });
    
    socket.on('game-ended', (data: { winner: any; players: any[] }) => {
      setGameEnded(true);
      setWinner(data.winner);
      
      // Stop the game
      setIsPlaying(false);
      stop();
      
      // Set results
      const myResult = data.players.find((p: any) => p.id === myId);
      const opponentResult = data.players.find((p: any) => p.id !== myId);
      
      if (myResult) {
        setResults({
          score: myResult.score,
          combo: myResult.combo,
          accuracy: myResult.accuracy,
          notesHit: 0,
          notesMissed: 0,
          perfectNotes: 0,
          greatNotes: 0,
          goodNotes: 0,
          missedNotes: 0,
        });
      }
    });
    
    return () => {
      socket.off('opponent-update');
      socket.off('game-ended');
    };
  }, [socket, myId, stop, setResults]);
  
  // Start game with countdown
  const startGame = useCallback(async () => {
    await start();
    
    // Countdown
    let count = 3;
    setCountdown(count);
    const countdownInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownInterval);
        setIsPlaying(true);
        startTimeRef.current = Date.now();
      }
    }, 1000);
  }, [start]);
  
  // Send score update to server
  const sendScoreUpdate = useCallback((score: number, combo: number, accuracy: number) => {
    if (!socket || !isPlaying) return;
    
    socket.emit('score-update', {
      score,
      combo,
      accuracy,
      notesHit: 0,
      notesMissed: 0
    });
  }, [socket, isPlaying]);
  
  // End game and send final score
  const endGameHandler = useCallback((score: number, combo: number, accuracy: number) => {
    if (!socket) return;
    
    socket.emit('finish-song', {
      score,
      combo,
      accuracy
    });
  }, [socket]);
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🌐 ONLINE</Badge>
          <span className="text-white/60 text-sm">Room: {room.code}</span>
        </div>
        <Button onClick={onEnd} variant="outline" size="sm" className="border-white/20">
          Leave Game
        </Button>
      </div>
      
      {/* Song Info */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-lg">{song.title}</div>
              <div className="text-white/60">{song.artist}</div>
            </div>
            <Badge className="bg-purple-500/20 text-purple-400">
              ⚔️ Duel Mode
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Split Screen Score Display */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* My Score */}
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">YOU</div>
              <div className="text-4xl font-bold text-cyan-400">{Math.round(localScore).toLocaleString()}</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                <div>
                  <span className="text-white/60">Combo: </span>
                  <span className="text-yellow-400 font-medium">{localCombo}x</span>
                </div>
                <div>
                  <span className="text-white/60">Accuracy: </span>
                  <span className="text-green-400 font-medium">{localAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Opponent Score */}
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="py-4">
            <div className="text-center">
              <div className="text-sm text-white/60 mb-1">{opponentName || 'OPPONENT'}</div>
              <div className="text-4xl font-bold text-purple-400">{Math.round(opponentScore).toLocaleString()}</div>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm">
                <div>
                  <span className="text-white/60">Combo: </span>
                  <span className="text-yellow-400 font-medium">{opponentCombo}x</span>
                </div>
                <div>
                  <span className="text-white/60">Accuracy: </span>
                  <span className="text-green-400 font-medium">{opponentAccuracy.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Game Area */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-6">
          {!isPlaying && !gameEnded ? (
            <div className="text-center py-8">
              {countdown > 0 ? (
                <div className="text-6xl font-bold text-cyan-400 animate-pulse">{countdown}</div>
              ) : (
                <>
                  <div className="text-4xl mb-4">🎤</div>
                  <h3 className="text-xl font-bold mb-2">Ready to Sing!</h3>
                  <p className="text-white/60 mb-4">Click the button when you're ready to start</p>
                  <Button 
                    onClick={startGame}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8 py-3 text-lg"
                    disabled={!isInitialized}
                  >
                    <MicIcon className="w-5 h-5 mr-2" /> Start Singing
                  </Button>
                </>
              )}
            </div>
          ) : gameEnded ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">{winner?.id === myId ? '🏆' : '😢'}</div>
              <h3 className="text-2xl font-bold mb-2">
                {winner?.id === myId ? 'You Win!' : `${winner?.name || 'Opponent'} Wins!`}
              </h3>
              <p className="text-white/60 mb-4">
                Final Score: You {Math.round(localScore).toLocaleString()} - {Math.round(opponentScore).toLocaleString()} {opponentName}
              </p>
              <Button 
                onClick={onEnd}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8"
              >
                Back to Lobby
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-2">Singing in Progress!</h3>
              <p className="text-white/60">
                Sing into your microphone. Your score is being synced in real-time!
              </p>
              <div className="mt-4">
                <div className="text-sm text-white/40">Detected Pitch</div>
                <div className="text-2xl font-mono text-cyan-400">
                  {pitchResult?.note ? midiToNoteName(pitchResult.note) : '--'}
                </div>
                <div className="text-sm text-white/40">
                  {pitchResult?.frequency ? `${Math.round(pitchResult.frequency)} Hz` : ''}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Media Player (if audio/video) */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onLoadedData={() => setMediaLoaded(true)}
          onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          className="hidden"
        />
      )}
      
      {song.videoUrl && (
        <video
          ref={videoRef}
          src={song.videoUrl}
          onLoadedData={() => setMediaLoaded(true)}
          className="w-full rounded-lg"
          controls
        />
      )}
      
      {/* YouTube Player */}
      {song.youtubeId && (
        <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
          <YouTubePlayer
            videoId={song.youtubeId}
            isPlaying={isPlaying}
            onTimeUpdate={(time) => {
              setCurrentTime(time);
              // Game logic would go here
            }}
            onEnded={() => endGameHandler(localScore, localCombo, localAccuracy)}
          />
        </div>
      )}
    </div>
  );
}

// ===================== MOBILE CLIENT VIEW =====================
function MobileClientView() {
  // Connection state
  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPitch, setCurrentPitch] = useState<{ frequency: number | null; note: number | null; volume: number }>({ frequency: null, note: null, volume: 0 });
  const [gameState, setGameState] = useState<{ 
    currentSong: { title: string; artist: string } | null; 
    isPlaying: boolean;
    songEnded: boolean;
    queueLength: number;
  }>({ currentSong: null, isPlaying: false, songEnded: false, queueLength: 0 });
  const [currentView, setCurrentView] = useState<MobileView>('home');
  
  // Profile state
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Song library state
  const [songs, setSongs] = useState<MobileSong[]>([]);
  const [songSearch, setSongSearch] = useState('');
  const [songsLoading, setSongsLoading] = useState(true);
  
  // Queue state - max 3 songs per companion
  const [queue, setQueue] = useState<Array<{ id: string; songId: string; songTitle: string; songArtist: string; addedBy: string; status: string }>>([]);
  const [slotsRemaining, setSlotsRemaining] = useState(3);
  const [queueError, setQueueError] = useState<string | null>(null);
  
  // Game results for social features
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [showScoreCard, setShowScoreCard] = useState(false);
  
  // Jukebox wishlist
  const [jukeboxWishlist, setJukeboxWishlist] = useState<Array<{ songId: string; songTitle: string; songArtist: string; addedBy: string }>>([]);
  
  // Camera state for shorts recording
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Audio context and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Available profile colors
  const profileColors = [
    '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', 
    '#10B981', '#EF4444', '#3B82F6', '#F97316'
  ];

  // Connect to the server
  const connect = useCallback(async () => {
    try {
      // First, check if we have a saved connection code to reconnect
      const savedConnectionCode = localStorage.getItem('karaoke-connection-code');
      const savedProfile = localStorage.getItem('karaoke-mobile-profile');
      
      if (savedConnectionCode && savedProfile) {
        // Try to reconnect with existing code
        const reconnectResponse = await fetch(`/api/mobile?action=reconnect&code=${savedConnectionCode}`);
        const reconnectData = await reconnectResponse.json();
        
        if (reconnectData.success) {
          setClientId(reconnectData.clientId);
          setConnectionCode(savedConnectionCode);
          setIsConnected(true);
          if (reconnectData.profile) {
            setProfile(reconnectData.profile);
            setProfileName(reconnectData.profile.name);
            setProfileColor(reconnectData.profile.color);
            setAvatarPreview(reconnectData.profile.avatar || null);
          }
          if (reconnectData.gameState) {
            setGameState({
              currentSong: reconnectData.gameState.currentSong,
              isPlaying: reconnectData.gameState.isPlaying,
              songEnded: reconnectData.gameState.songEnded || false,
              queueLength: reconnectData.gameState.queueLength || 0,
            });
          }
          return; // Successfully reconnected
        }
      }
      
      // Fresh connection
      const response = await fetch('/api/mobile?action=connect');
      const data = await response.json();
      if (data.success) {
        const newClientId = data.clientId;
        const newConnectionCode = data.connectionCode;
        setClientId(newClientId);
        setConnectionCode(newConnectionCode);
        setIsConnected(true);
        
        // Save connection code for reconnection
        localStorage.setItem('karaoke-connection-code', newConnectionCode);
        
        if (data.gameState) {
          setGameState({
            currentSong: data.gameState.currentSong,
            isPlaying: data.gameState.isPlaying,
            songEnded: data.gameState.songEnded || false,
            queueLength: data.gameState.queueLength || 0,
          });
        }
        
        // Load saved profile from localStorage and sync
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setProfile(parsed);
          setProfileName(parsed.name);
          setProfileColor(parsed.color);
          setAvatarPreview(parsed.avatar || null);
          // Sync profile to server after connection
          try {
            const syncResponse = await fetch('/api/mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'profile',
                clientId: newClientId,
                payload: parsed,
              }),
            });
            const syncData = await syncResponse.json();
            if (syncData.connectionCode) {
              setConnectionCode(syncData.connectionCode);
              localStorage.setItem('karaoke-connection-code', syncData.connectionCode);
            }
          } catch {
            // Ignore sync errors
          }
        }
      } else {
        setError('Failed to connect to server');
      }
    } catch {
      setError('Connection failed - is the server running?');
    }
  }, []);

  // Sync profile to server
  const syncProfile = useCallback(async (profileData: MobileProfile) => {
    if (!clientId) return;
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'profile',
          clientId,
          payload: profileData,
        }),
      });
      const data = await response.json();
      if (data.connectionCode) {
        setConnectionCode(data.connectionCode);
        localStorage.setItem('karaoke-connection-code', data.connectionCode);
      }
    } catch {
      // Ignore sync errors
    }
  }, [clientId]);

  // Create profile
  const handleCreateProfile = useCallback(() => {
    if (!profileName.trim()) return;
    
    const newProfile: MobileProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: profileName.trim(),
      avatar: avatarPreview || undefined,
      color: profileColor,
      createdAt: Date.now(),
    };
    
    setProfile(newProfile);
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(newProfile));
    syncProfile(newProfile);
    setCurrentView('home');
  }, [profileName, avatarPreview, profileColor, syncProfile]);

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Load songs from main app
  const loadSongs = useCallback(async () => {
    setSongsLoading(true);
    try {
      const response = await fetch('/api/songs');
      if (response.ok) {
        const data = await response.json();
        setSongs(data.songs || []);
      } else {
        const savedSongs = localStorage.getItem('karaoke-songs');
        if (savedSongs) {
          setSongs(JSON.parse(savedSongs));
        }
      }
    } catch {
      const savedSongs = localStorage.getItem('karaoke-songs');
      if (savedSongs) {
        setSongs(JSON.parse(savedSongs));
      }
    }
    setSongsLoading(false);
  }, []);

  // Add song to queue (max 3 per companion)
  const addToQueue = useCallback(async (song: MobileSong) => {
    if (!profile || !clientId) {
      setCurrentView('profile');
      return;
    }
    
    if (slotsRemaining <= 0) {
      setQueueError('Maximum 3 songs in queue. Wait for a song to finish!');
      setTimeout(() => setQueueError(null), 3000);
      return;
    }
    
    setQueueError(null);
    
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queue',
          clientId,
          payload: {
            songId: song.id,
            songTitle: song.title,
            songArtist: song.artist,
          },
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setQueue(prev => [...prev, {
          id: data.queueItem.id,
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
          addedBy: profile.name,
          status: 'pending',
        }]);
        setSlotsRemaining(data.slotsRemaining ?? Math.max(0, slotsRemaining - 1));
      } else if (data.queueFull) {
        setQueueError('Maximum 3 songs in queue!');
        setSlotsRemaining(0);
        setTimeout(() => setQueueError(null), 3000);
      }
    } catch {
      setQueueError('Failed to add song');
      setTimeout(() => setQueueError(null), 3000);
    }
  }, [profile, clientId, slotsRemaining]);

  // Get queue from server
  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      const data = await response.json();
      if (data.success) {
        const serverQueue = data.queue || [];
        setQueue(serverQueue);
        // Calculate remaining slots
        const pendingCount = serverQueue.filter((q: { status: string }) => q.status === 'pending').length;
        setSlotsRemaining(Math.max(0, 3 - pendingCount));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Load game results for social features
  const loadGameResults = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=results');
      const data = await response.json();
      if (data.success && data.results) {
        setGameResults(data.results);
        setShowScoreCard(true);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Add to Jukebox wishlist
  const addToJukeboxWishlist = useCallback(async (song: MobileSong) => {
    if (!profile || !clientId) {
      setCurrentView('profile');
      return;
    }
    
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'jukebox',
          clientId,
          payload: {
            songId: song.id,
            songTitle: song.title,
            songArtist: song.artist,
          },
        }),
      });
      
      setJukeboxWishlist(prev => [...prev, {
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
        addedBy: profile.name,
      }]);
    } catch {
      // Ignore errors
    }
  }, [profile, clientId]);

  // Load Jukebox wishlist
  const loadJukeboxWishlist = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getjukebox');
      const data = await response.json();
      if (data.success) {
        setJukeboxWishlist(data.wishlist || []);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // YIN pitch detection algorithm
  const yinPitchDetection = useCallback((buffer: Float32Array, sampleRate: number): number | null => {
    const yinBuffer = new Float32Array(buffer.length / 2);
    const yinThreshold = 0.15;
    const yinBufferLength = buffer.length / 2;

    for (let tau = 0; tau < yinBufferLength; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBufferLength; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBufferLength; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    let tauEstimate = -1;
    for (let tau = 2; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < yinThreshold) {
        while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;

    let betterTau: number;
    const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
    const x2 = tauEstimate + 1 < yinBufferLength ? tauEstimate + 1 : tauEstimate;

    if (x0 === tauEstimate) {
      betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
    } else if (x2 === tauEstimate) {
      betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
    } else {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[x2];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    return sampleRate / betterTau;
  }, []);

  // Start microphone and pitch detection
  const startMicrophone = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      setIsListening(true);
      
      const buffer = new Float32Array(analyserRef.current.fftSize);
      
      const detectPitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;
        
        // STOP if song ended
        if (gameState.songEnded || !gameState.isPlaying) {
          // Don't stop immediately, just don't send data
          // The effect will handle stopping
        }
        
        analyserRef.current.getFloatTimeDomainData(buffer);
        
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(1, rms * 5);
        
        const frequency = yinPitchDetection(buffer, audioContextRef.current.sampleRate);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }
        
        setCurrentPitch({ frequency, note, volume });
        
        // Only send pitch if song is playing and not ended
        if (clientId && gameState.isPlaying && !gameState.songEnded && (volume > 0.01 || frequency !== null)) {
          fetch('/api/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pitch',
              clientId,
              payload: {
                frequency,
                note,
                clarity: 0,
                volume,
                timestamp: Date.now(),
              },
            }),
          }).catch(() => {});
        }
        
        animationFrameRef.current = requestAnimationFrame(detectPitch);
      };
      
      detectPitch();
    } catch {
      setError('Microphone access denied');
    }
  }, [clientId, yinPitchDetection, gameState.isPlaying, gameState.songEnded]);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setCurrentPitch({ frequency: null, note: null, volume: 0 });
  }, []);

  // Filter songs by search
  const filteredSongs = useMemo(() => {
    if (!songSearch) return songs;
    const query = songSearch.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query)
    );
  }, [songs, songSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      if (clientId) {
        fetch(`/api/mobile?action=disconnect&clientId=${clientId}`).catch(() => {});
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [clientId, stopMicrophone]);

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected || !clientId) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'heartbeat', clientId }),
        });
      } catch {
        // Ignore heartbeat errors
      }
    };
    
    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isConnected, clientId]);

  // Sync game state periodically and detect song end
  useEffect(() => {
    if (!isConnected) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/mobile?action=gamestate');
        const data = await response.json();
        if (data.success && data.gameState) {
          const prevSongEnded = gameState.songEnded;
          const newSongEnded = data.gameState.songEnded || false;
          const wasPlaying = gameState.isPlaying;
          const nowPlaying = data.gameState.isPlaying;
          
          setGameState({
            currentSong: data.gameState.currentSong,
            isPlaying: data.gameState.isPlaying,
            songEnded: newSongEnded,
            queueLength: data.gameState.queueLength || 0,
          });
          
          // Stop microphone when song ends
          if (!wasPlaying || newSongEnded) {
            if (isListening) {
              stopMicrophone();
            }
          }
          
          // Load game results when song ends
          if (newSongEnded && !prevSongEnded) {
            loadGameResults();
            loadQueue(); // Refresh queue to update slots
          }
        }
      } catch {
        // Ignore sync errors
      }
    }, 1000);
    
    return () => clearInterval(syncInterval);
  }, [isConnected, gameState.isPlaying, gameState.songEnded, isListening, stopMicrophone, loadGameResults, loadQueue]);

  // Load songs when viewing songs tab
  useEffect(() => {
    if (currentView === 'songs' && songs.length === 0) {
      queueMicrotask(() => loadSongs());
    }
  }, [currentView, songs.length, loadSongs]);

  // Load queue periodically
  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => loadQueue());
      const interval = setInterval(() => loadQueue(), 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, loadQueue]);

  // Load Jukebox wishlist when viewing jukebox tab
  useEffect(() => {
    if (currentView === 'jukebox') {
      queueMicrotask(() => loadJukeboxWishlist());
    }
  }, [currentView, loadJukeboxWishlist]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {profile && currentView !== 'home' && (
              <button onClick={() => setCurrentView('home')} className="text-white/60 hover:text-white">
                ← Back
              </button>
            )}
            <h1 className="text-lg font-bold">Karaoke Successor</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Code Badge */}
            {connectionCode && (
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono">
                {connectionCode}
              </Badge>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {profile && (
              <button onClick={() => setCurrentView('profile')} className="w-8 h-8 rounded-full overflow-hidden" style={{ backgroundColor: profile.color }}>
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{profile.name[0]}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
          <p className="text-white/60 mb-4">Connecting to server...</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Button onClick={connect} className="bg-cyan-500 hover:bg-cyan-400">
            Retry Connection
          </Button>
        </div>
      ) : !profile ? (
        /* Profile Creation Screen */
        <div className="p-4 max-w-md mx-auto">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-center">Create Your Profile</CardTitle>
              <p className="text-center text-white/40 text-sm mt-2">Your profile will sync with the main app</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl">📷</span>
                      <p className="text-xs text-white/40 mt-1">Add Photo</p>
                    </div>
                  )}
                </button>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  className="hidden" 
                />
              </div>
              
              {/* Name Input */}
              <div>
                <label htmlFor="profile-name" className="text-sm text-white/60 mb-2 block">Your Name</label>
                <Input
                  id="profile-name"
                  name="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              {/* Color Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Choose Color</label>
                <div className="flex flex-wrap gap-2">
                  {profileColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setProfileColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Create Button */}
              <Button 
                onClick={handleCreateProfile}
                disabled={!profileName.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
              >
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Main Views */
        <div className="pb-20">
          {/* Home View */}
          {currentView === 'home' && (
            <div className="p-4 space-y-4">
              {/* Now Playing */}
              {gameState.currentSong && (
                <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
                  <CardContent className="py-4">
                    <p className="text-xs text-white/60 mb-1">Now Playing</p>
                    <p className="font-semibold text-lg">{gameState.currentSong.title}</p>
                    <p className="text-white/60">{gameState.currentSong.artist}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setCurrentView('mic')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">🎤</span>
                  <span className="text-sm">Sing</span>
                </button>
                <button 
                  onClick={() => setCurrentView('songs')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">🎵</span>
                  <span className="text-sm">Songs</span>
                </button>
                <button 
                  onClick={() => setCurrentView('queue')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">📋</span>
                  <span className="text-sm">Queue</span>
                  {queue.length > 0 && (
                    <Badge className="ml-2 bg-cyan-500">{queue.length}</Badge>
                  )}
                </button>
                <button 
                  onClick={() => setCurrentView('remote')}
                  className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl p-4 text-center hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors border border-purple-500/30"
                >
                  <span className="text-3xl mb-2 block">🎮</span>
                  <span className="text-sm font-medium">Remote</span>
                </button>
                <button 
                  onClick={() => setCurrentView('profile')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">👤</span>
                  <span className="text-sm">Profile</span>
                </button>
                <button 
                  onClick={() => setCurrentView('jukebox')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">📻</span>
                  <span className="text-sm">Jukebox</span>
                </button>
              </div>
              
              {/* Queue Preview */}
              {queue.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Up Next</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {queue.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                        <span className="text-white/40 text-sm">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.songTitle}</p>
                          <p className="text-xs text-white/40">{item.songArtist}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Microphone View */}
          {currentView === 'mic' && (
            <div className="p-4">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center">
                    {/* Volume Indicator */}
                    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-6">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
                        style={{ width: `${currentPitch.volume * 100}%` }}
                      />
                    </div>
                    
                    {/* Pitch Display */}
                    {currentPitch.note !== null && (
                      <div className="text-center mb-6">
                        <div className="text-6xl font-bold text-cyan-400">
                          {midiToNoteName(Math.round(currentPitch.note))}
                        </div>
                        <div className="text-sm text-white/60">
                          {currentPitch.frequency?.toFixed(1)} Hz
                        </div>
                      </div>
                    )}
                    
                    {/* Microphone Button */}
                    <button
                      onClick={isListening ? stopMicrophone : startMicrophone}
                      className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-400 animate-pulse shadow-lg shadow-red-500/50' 
                          : 'bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-purple-500/30'
                      }`}
                    >
                      <MicIcon className="w-20 h-20 text-white" />
                    </button>
                    <p className="mt-6 text-lg text-white/60">
                      {isListening ? 'Tap to stop' : 'Tap to sing'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Songs View */}
          {currentView === 'songs' && (
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Input
                  id="song-search-modal"
                  name="song-search-modal"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  placeholder="Search songs..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              {/* Song List */}
              {songsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
                  <span className="text-white/60">Loading songs...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredSongs.map((song) => (
                    <div 
                      key={song.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      {/* Cover */}
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                        {song.coverImage ? (
                          <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MusicIcon className="w-6 h-6 text-white/30" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-white/40 truncate">{song.artist}</p>
                      </div>
                      
                      {/* Duration */}
                      <span className="text-xs text-white/30">{formatDuration(song.duration)}</span>
                      
                      {/* Add to Queue Button */}
                      <Button
                        size="sm"
                        onClick={() => addToQueue(song)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white px-3"
                      >
                        +
                      </Button>
                    </div>
                  ))}
                  
                  {filteredSongs.length === 0 && (
                    <div className="text-center py-12 text-white/40">
                      No songs found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Queue View */}
          {currentView === 'queue' && (
            <div className="p-4">
              {/* Queue Header with Slots */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Song Queue</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/40">Slots:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((slot) => (
                      <div 
                        key={slot}
                        className={`w-4 h-4 rounded-full ${slot <= slotsRemaining ? 'bg-cyan-500' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Queue Error */}
              {queueError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {queueError}
                </div>
              )}
              
              {queue.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">📋</span>
                  <p>No songs in queue</p>
                  <p className="text-sm mt-2">You can add up to 3 songs</p>
                  <Button 
                    onClick={() => setCurrentView('songs')}
                    variant="outline"
                    className="mt-4 border-white/20 text-white"
                  >
                    Browse Songs
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.filter(q => q.status !== 'completed').map((item, i) => (
                    <div 
                      key={item.id || i}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        item.status === 'playing' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5'
                      }`}
                    >
                      <span className="text-white/40 font-bold w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.songTitle}</p>
                        <p className="text-sm text-white/40">{item.songArtist} • Added by {item.addedBy}</p>
                      </div>
                      {item.status === 'playing' && (
                        <Badge className="bg-cyan-500 text-xs">Playing</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Results View - Social Features */}
          {currentView === 'results' && (
            <div className="p-4 max-w-md mx-auto">
              {gameResults ? (
                <div className="space-y-4">
                  {/* Score Card */}
                  <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
                    <CardContent className="py-6">
                      <div className="text-center">
                        <p className="text-sm text-white/60 mb-1">You just played</p>
                        <h2 className="text-xl font-bold mb-1">{gameResults.songTitle}</h2>
                        <p className="text-white/60">{gameResults.songArtist}</p>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-cyan-400">{gameResults.score.toLocaleString()}</p>
                          <p className="text-xs text-white/40">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-purple-400">{gameResults.accuracy.toFixed(1)}%</p>
                          <p className="text-xs text-white/40">Accuracy</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-yellow-400">{gameResults.maxCombo}x</p>
                          <p className="text-xs text-white/40">Best Combo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold">{gameResults.rating}</p>
                          <p className="text-xs text-white/40">Rating</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Social Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => {
                        // Generate scorecard image
                        // For now, just show a message
                        alert('Score card saved to your photos! (Feature coming soon)');
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                      📸 Save Score Card
                    </Button>
                    <Button 
                      onClick={() => {
                        // Share functionality
                        const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n#KaraokeSuccessor`;
                        if (navigator.share) {
                          navigator.share({ text }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(text);
                          alert('Score copied to clipboard!');
                        }
                      }}
                      variant="outline"
                      className="border-white/20"
                    >
                      📤 Share Score
                    </Button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setCurrentView('home')}
                      variant="outline"
                      className="flex-1 border-white/20"
                    >
                      🏠 Home
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('queue')}
                      variant="outline"
                      className="flex-1 border-white/20"
                    >
                      📋 Queue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">📊</span>
                  <p>No recent results</p>
                  <p className="text-sm mt-2">Sing a song to see your results here!</p>
                  <Button 
                    onClick={() => setCurrentView('home')}
                    variant="outline"
                    className="mt-4 border-white/20"
                  >
                    Go Home
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Jukebox Wishlist View */}
          {currentView === 'jukebox' && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Jukebox Wishlist</h2>
              <p className="text-sm text-white/40 mb-4">Add songs to the jukebox playlist</p>
              
              {/* Quick Add */}
              <Button 
                onClick={() => setCurrentView('songs')}
                variant="outline"
                className="w-full border-white/20 mb-4"
              >
                + Add Songs to Wishlist
              </Button>
              
              {jukeboxWishlist.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">🎵</span>
                  <p>No songs in wishlist</p>
                  <p className="text-sm mt-2">Songs you add will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jukeboxWishlist.map((item, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                    >
                      <span className="text-white/40 font-bold w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.songTitle}</p>
                        <p className="text-sm text-white/40">{item.songArtist} • Added by {item.addedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Remote Control View */}
          {currentView === 'remote' && (
            <RemoteControlView 
              clientId={clientId} 
              profile={profile}
              onBack={() => setCurrentView('home')}
            />
          )}
          
          {/* Profile View */}
          {currentView === 'profile' && (
            <div className="p-4 max-w-md mx-auto">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="py-6">
                  <div className="flex flex-col items-center mb-6">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 hover:border-white/40 transition-colors"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold flex items-center justify-center h-full">{profile.name[0]}</span>
                      )}
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      className="hidden" 
                    />
                    <h2 className="text-xl font-bold mt-4">{profile.name}</h2>
                    {/* Show connection code */}
                    {connectionCode && (
                      <Badge variant="outline" className="mt-2 border-cyan-500/50 text-cyan-400 font-mono">
                        Code: {connectionCode}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Name Edit */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">Name</label>
                      <Input
                        id="edit-profile-name"
                        name="edit-profile-name"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    
                    {/* Color Edit */}
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {profileColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setProfileColor(color)}
                            className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <Button 
                      onClick={() => {
                        const updated = { ...profile, name: profileName, color: profileColor, avatar: avatarPreview || undefined };
                        setProfile(updated);
                        localStorage.setItem('karaoke-mobile-profile', JSON.stringify(updated));
                        syncProfile(updated);
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* Bottom Navigation */}
      {isConnected && profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center p-2 ${currentView === 'home' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-xs mt-1">Home</span>
            </button>
            <button 
              onClick={() => setCurrentView('mic')}
              className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎤</span>
              <span className="text-xs mt-1">Sing</span>
            </button>
            <button 
              onClick={() => setCurrentView('songs')}
              className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎵</span>
              <span className="text-xs mt-1">Songs</span>
            </button>
            <button 
              onClick={() => setCurrentView('remote')}
              className={`flex flex-col items-center p-2 ${currentView === 'remote' ? 'text-purple-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎮</span>
              <span className="text-xs mt-1">Remote</span>
            </button>
            <button 
              onClick={() => setCurrentView('profile')}
              className={`flex flex-col items-center p-2 ${currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">👤</span>
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== MOBILE SCREEN =====================
function MobileScreen() {
  const [localIP, setLocalIP] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<Array<{ 
    id: string; 
    connectionCode: string;
    name: string; 
    hasPitch: boolean;
    profile?: { name: string; avatar?: string; color: string };
    queueCount: number;
  }>>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [ipDetectionAttempts, setIpDetectionAttempts] = useState(0);
  const [mobileQueue, setMobileQueue] = useState<Array<{ id: string; songTitle: string; songArtist: string; companionCode: string; status: string }>>([]);
  
  // Get local IP address via WebRTC - FIXED: Store detected IP, don't fallback to localhost
  useEffect(() => {
    let isMounted = true;
    let detectedIP: string | null = null;
    
    const getLocalIP = async () => {
      try {
        // Try to get local IP via RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        pc.onicecandidate = (event) => {
          if (event?.candidate && isMounted && !detectedIP) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch && ipMatch[1]) {
              const ip = ipMatch[1];
              // Filter out mDNS addresses and localhost
              if (!ip.endsWith('.local') && ip !== '0.0.0.0' && !ip.startsWith('127.')) {
                detectedIP = ip;
                setLocalIP(ip);
                // Store in sessionStorage for persistence across re-renders
                sessionStorage.setItem('karaoke-detected-ip', ip);
                pc.close();
              }
            }
          }
        };
        
        // Check sessionStorage for previously detected IP
        const storedIP = sessionStorage.getItem('karaoke-detected-ip');
        if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
          detectedIP = storedIP;
          setLocalIP(storedIP);
          pc.close();
          return;
        }
        
        // Wait for ICE candidates, but don't fallback to localhost
        setTimeout(() => {
          if (isMounted && !detectedIP) {
            const hostname = window.location.hostname;
            // Only use hostname if it's a valid IP or non-localhost hostname
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              detectedIP = hostname;
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            } else {
              // Increment attempts to show retry option
              setIpDetectionAttempts(prev => prev + 1);
            }
          }
          pc.close();
        }, 5000); // Give more time for ICE candidates
      } catch {
        // Don't set localhost as fallback
        if (isMounted) {
          // Check sessionStorage first
          const storedIP = sessionStorage.getItem('karaoke-detected-ip');
          if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
            setLocalIP(storedIP);
          } else {
            const hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            } else {
              setIpDetectionAttempts(prev => prev + 1);
            }
          }
        }
      }
    };
    
    getLocalIP();
    
    return () => {
      isMounted = false;
    };
  }, [ipDetectionAttempts]);
  
  // Poll for connected clients
  useEffect(() => {
    // Use queueMicrotask to avoid synchronous setState in effect
    queueMicrotask(() => setIsPolling(true));
    
    const pollClients = async () => {
      try {
        const response = await fetch('/api/mobile?action=status');
        const data = await response.json();
        if (data.success) {
          setConnectedClients(data.clients || []);
          setMobileQueue(data.queue || []);
        }
      } catch {
        // Ignore polling errors
      }
    };
    
    pollClients();
    const interval = setInterval(pollClients, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Retry IP detection
  const retryIPDetection = () => {
    sessionStorage.removeItem('karaoke-detected-ip');
    setIpDetectionAttempts(prev => prev + 1);
  };
  
  // Build connection URL with local IP
  const connectionUrl = localIP 
    ? `http://${localIP}:3000?mobile=1`
    : ''; // Don't generate URL without valid IP
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mobile Integration</h1>
        <p className="text-white/60">Use your smartphone as a microphone or remote control</p>
      </div>

      {/* Network Info */}
      <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/60 mb-1">Your LAN IP Address</p>
              <p className="text-2xl font-mono font-bold text-cyan-400">{localIP || 'Detecting...'}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="text-xs text-white/60 mb-1">Port</p>
                <p className="text-2xl font-mono font-bold">3000</p>
              </div>
              {!localIP && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Make sure your phone is connected to the same WiFi network as this computer
          </p>
          {!localIP && ipDetectionAttempts > 0 && (
            <p className="text-xs text-yellow-400 mt-2">
              ⚠️ Could not detect network IP. Try refreshing the page or check your network connection.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Scan to Connect</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            {localIP ? (
              <>
                <div className="bg-white rounded-xl p-4 inline-block mb-4">
                  <img 
                    src={generateQRCode(connectionUrl)} 
                    alt="QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-sm text-white/60 mb-2">Scan this QR code with your phone</p>
                <p className="text-xs text-white/40 break-all font-mono">{connectionUrl}</p>
              </>
            ) : (
              <div className="py-16">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/60 mb-4">Detecting network address...</p>
                <Button 
                  variant="outline"
                  onClick={retryIPDetection}
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  Retry Detection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Devices */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connected Companions
              {isPolling && (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedClients.length === 0 ? (
              <div className="text-center py-8">
                <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p className="text-white/40">No devices connected</p>
                <p className="text-xs text-white/20 mt-2">Scan the QR code to connect your phone</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connectedClients.map((client) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: client.profile?.color || '#06B6D4' }}
                    >
                      {client.profile?.avatar ? (
                        <img src={client.profile.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-bold">
                          {(client.profile?.name || client.name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{client.profile?.name || client.name}</p>
                        <Badge variant="outline" className="text-xs font-mono border-cyan-500/50 text-cyan-400">
                          {client.connectionCode}
                        </Badge>
                      </div>
                      <p className="text-xs text-white/40">
                        Queue: {client.queueCount}/3 songs
                      </p>
                    </div>
                    {client.hasPitch && (
                      <div className="flex items-center gap-1 text-green-400">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs">🎤</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Queue */}
      {mobileQueue.length > 0 && (
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Mobile Queue
              <Badge className="bg-cyan-500">{mobileQueue.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mobileQueue.slice(0, 5).map((item) => (
                <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg ${
                  item.status === 'playing' ? 'bg-cyan-500/20' : 'bg-white/5'
                }`}>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.songTitle}</p>
                    <p className="text-xs text-white/40">{item.songArtist}</p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {item.companionCode}
                  </Badge>
                </div>
              ))}
              {mobileQueue.length > 5 && (
                <p className="text-xs text-white/40 text-center">
                  +{mobileQueue.length - 5} more songs
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="pt-6 text-center">
            <MicIcon className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="font-semibold mb-2">Use as Microphone</h3>
            <p className="text-sm text-white/60">Your phone becomes a high-quality wireless microphone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <LibraryIcon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="font-semibold mb-2">Browse Library</h3>
            <p className="text-sm text-white/60">Scroll through songs and add to queue from your phone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="pt-6 text-center">
            <QueueIcon className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <h3 className="font-semibold mb-2">Manage Queue</h3>
            <p className="text-sm text-white/60">View and manage the song queue remotely</p>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">How to Connect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>1. Make sure your phone is connected to the same WiFi network</p>
          <p>2. Open your phone&apos;s camera app and point it at the QR code</p>
          <p>3. Tap the notification to open the link</p>
          <p>4. Grant microphone permission when prompted</p>
          <p>5. Tap the microphone button to start singing!</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== HIGHSCORE SCREEN =====================
// Country flag helper
function getCountryFlag(code?: string): string {
  if (!code) return '';
  return COUNTRY_OPTIONS.find(c => c.code === code)?.flag || '';
}

// Song Highscore Modal Component
function SongHighscoreModal({ 
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

function HighscoreScreen() {
  const { highscores, profiles, activeProfileId, onlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [globalLeaderboard, setGlobalLeaderboard] = useState<typeof highscores>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

  // Test API connection
  const testConnection = useCallback(async () => {
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const isConnected = await leaderboardService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'failed');
      return isConnected;
    } catch {
      setConnectionStatus('failed');
      return false;
    }
  }, []);

  // Load global leaderboard when switched to global tab
  useEffect(() => {
    if (onlineEnabled && leaderboardType === 'global') {
      setIsLoadingGlobal(true);
      setGlobalError(null);
      
      import('@/lib/api/leaderboard-service').then(({ leaderboardService }) => {
        // First test connection
        leaderboardService.testConnection()
          .then(isConnected => {
            if (!isConnected) {
              throw new Error('Cannot connect to leaderboard server. Please check your internet connection.');
            }
            setConnectionStatus('connected');
            return leaderboardService.getGlobalLeaderboard(50);
          })
          .then(players => {
            // Convert API players to highscore format
            const entries = players.map((p, i): HighscoreEntry => ({
              id: `global-${p.id}`,
              playerId: p.id,
              playerName: p.name,
              playerAvatar: p.avatar,
              playerColor: '#FF6B6B',
              songId: '',
              songTitle: '',
              artist: '',
              score: p.total_score,
              accuracy: 0,
              maxCombo: 0,
              difficulty: 'medium',
              gameMode: 'standard',
              rating: 'good',
              rankTitle: `${p.games_played} games`,
              playedAt: Date.now(),
            }));
            setGlobalLeaderboard(entries);
          })
          .catch(err => {
            setConnectionStatus('failed');
            const errorMsg = err.message || 'Failed to load global leaderboard';
            if (errorMsg.includes('HTTP 500') || errorMsg.includes('500')) {
              setGlobalError('Server error (HTTP 500). The leaderboard service is temporarily unavailable. Please try again later.');
            } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
              setGlobalError('Network error. Please check your internet connection.');
            } else {
              setGlobalError(errorMsg);
            }
          })
          .finally(() => setIsLoadingGlobal(false));
      });
    }
  }, [onlineEnabled, leaderboardType]);

  // Retry loading global leaderboard
  const retryGlobalLoad = useCallback(() => {
    setGlobalError(null);
    setLeaderboardType('global');
  }, [setLeaderboardType]);

  const displayHighscores = leaderboardType === 'global' 
    ? globalLeaderboard 
    : (filter === 'mine' 
      ? highscores.filter(h => h.playerId === activeProfileId)
      : highscores);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          Highscore Leaderboard
        </h1>
        <p className="text-white/60">Top singers and their legendary performances!</p>
      </div>

      {/* Global/Local Toggle */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Local Tab */}
        <Button 
          onClick={() => setLeaderboardType('local')}
          className={leaderboardType === 'local' ? 'bg-cyan-500' : 'bg-white/10'}
        >
          🏠 Local
        </Button>
        
        {/* Global Tab */}
        {onlineEnabled && (
          <Button 
            onClick={() => setLeaderboardType('global')}
            className={leaderboardType === 'global' ? 'bg-purple-500' : 'bg-white/10'}
          >
            🌍 Global
          </Button>
        )}

        {leaderboardType === 'local' && (
          <>
            <div className="w-px bg-white/20 mx-2" />
            <Button 
              onClick={() => setFilter('all')}
              size="sm"
              className={filter === 'all' ? 'bg-white/20' : 'bg-white/5'}
            >
              All Scores
            </Button>
            <Button 
              onClick={() => setFilter('mine')}
              size="sm"
              className={filter === 'mine' ? 'bg-white/20' : 'bg-white/5'}
              disabled={!activeProfileId}
            >
              My Scores
            </Button>
          </>
        )}
      </div>

      {/* Ranking Legend - only for local */}
      {leaderboardType === 'local' && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Ranking Titles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
              {RANKING_TITLES.slice(0, 10).map((rank) => (
                <div key={rank.minScore} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                  <span>{rank.emoji}</span>
                  <span className="truncate">{rank.title.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoadingGlobal && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading global leaderboard...</span>
        </div>
      )}

      {/* Error State */}
      {globalError && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4 text-center">
            <p className="text-red-400 mb-3">{globalError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={retryGlobalLoad} size="sm" className="bg-purple-500 hover:bg-purple-400">
                🔄 Retry
              </Button>
              <Button onClick={() => setLeaderboardType('local')} size="sm" className="bg-white/10">
                Switch to Local
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highscore List */}
      {!isLoadingGlobal && !globalError && displayHighscores.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {leaderboardType === 'global' 
                ? "No global scores yet. Be the first to upload!" 
                : filter === 'mine' 
                  ? "You haven't set any scores yet!" 
                  : "No highscores yet. Be the first to sing!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        !isLoadingGlobal && !globalError && (
          <div className="space-y-2">
            {displayHighscores.slice(0, 50).map((entry, index) => (
              <Card 
                key={entry.id}
                className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors ${
                  index < 3 ? 'border-l-4' : ''
                } ${
                  index === 0 ? 'border-l-yellow-400' :
                  index === 1 ? 'border-l-gray-300' :
                  index === 2 ? 'border-l-orange-400' : ''
                }`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Rank */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                    index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                    'bg-white/10 text-white/60'
                  }`}>
                    {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>

                  {/* Player Info */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                    style={{ backgroundColor: entry.playerColor }}
                  >
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                    ) : (
                      entry.playerName[0].toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{entry.playerName}</span>
                      {leaderboardType === 'local' && (
                        <Badge variant="outline" className={`text-xs ${
                          entry.difficulty === 'easy' ? 'border-green-500 text-green-400' :
                          entry.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' :
                          'border-red-500 text-red-400'
                        }`}>
                          {entry.difficulty}
                        </Badge>
                      )}
                      {leaderboardType === 'global' && entry.playerAvatar === undefined && (
                        <span className="text-xs text-white/40">({entry.rankTitle})</span>
                      )}
                    </div>
                    {entry.songTitle && (
                      <p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>
                    )}
                    {leaderboardType === 'local' && entry.rankTitle && (
                      <p className="text-xs text-white/40">{entry.rankTitle}</p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                    {leaderboardType === 'local' && (
                      <>
                        <div className="text-sm text-white/60">{entry.accuracy.toFixed(1)}% accuracy</div>
                        <div className="text-xs text-white/40">{entry.maxCombo}x max combo</div>
                      </>
                    )}
                    {leaderboardType === 'global' && (
                      <div className="text-xs text-white/40">total points</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ===================== SCORE VISUALIZATION COMPONENTS =====================
type VisualizationMode = 'table' | 'barometer' | 'speedometer' | 'radar' | 'comparison';

// Score Visualization Component with multiple display modes
function ScoreVisualization({ 
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
function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
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
  const playerRank = useMemo(() => {
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
        
        // 🆕 UPDATE PLAYER PROGRESSION (XP, Level, Rank, Titles)
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
        
        // Show XP earned notification if leveled up or got new titles
        if (xpResult.leveledUp) {
          console.log(`🎉 Level Up! Now Level ${xpResult.stats.currentLevel}`);
        }
        if (xpResult.newTitles.length > 0) {
          console.log(`🏆 New Titles Unlocked: ${xpResult.newTitles.join(', ')}`);
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
                const totalNotes = playerResult.notesHit + playerResult.notesMissed;
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
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode, onlineEnabled]);

  if (!results || !song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No results available</p>
        <Button onClick={onHome} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Home</Button>
      </div>
    );
  }

  const playerResult = results.players[0];
  const ratingColors = {
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
    combo: playerResult.combo || 0,
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
        <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating]} mb-4`}>
          <h1 className="text-4xl font-black text-white uppercase">{playerResult.rating}!</h1>
        </div>
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* NEW: Score Visualization with multiple modes */}
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
                  {entry.playerId === activeProfileId && playerRank && (
                    <Badge className="bg-cyan-500/30 text-cyan-300 text-xs">You #{playerRank}</Badge>
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

// ===================== AI ASSETS GENERATOR =====================
function AIAssetsGenerator() {
  const [assetType, setAssetType] = useState<'image' | 'audio'>('image');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<Array<{ type: string; data: string; filename: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  // Preset prompts for common assets
  const imagePresets = [
    { name: 'Title Background', prompt: 'Karaoke game title screen background, neon lights, microphone silhouette on stage, vibrant purple and cyan gradient, musical notes floating, concert stage atmosphere, no text' },
    { name: 'Game Background', prompt: 'Concert stage view from singer perspective, crowd silhouette, spotlights and stage lights, dramatic lighting, purple and blue atmosphere' },
    { name: 'Bronze Rank Badge', prompt: 'bronze microphone badge icon, simple design, warm bronze metallic color, gaming achievement style, clean vector art' },
    { name: 'Silver Rank Badge', prompt: 'silver microphone badge icon, shiny silver metallic color, gaming achievement style, clean vector art' },
    { name: 'Gold Rank Badge', prompt: 'gold microphone badge icon, elegant design, shiny gold metallic color, gaming achievement style, clean vector art' },
    { name: 'Platinum Rank Badge', prompt: 'platinum microphone badge icon, premium design, gleaming platinum metallic color, gaming achievement style, clean vector art' },
    { name: 'Diamond Rank Badge', prompt: 'diamond microphone badge icon, luxury design, sparkling diamond crystal effect, gaming achievement style, clean vector art' },
    { name: 'Achievement Trophy', prompt: 'achievement icon, golden trophy cup with star, winner celebration, gaming style icon, clean design' },
  ];

  const audioPresets = [
    { name: 'Level Up!', text: 'Level Up!' },
    { name: 'High Score!', text: 'New High Score!' },
    { name: 'Challenge Complete!', text: 'Challenge Complete!' },
    { name: 'Perfect Score!', text: 'Perfect Score!' },
    { name: 'Achievement!', text: 'Achievement Unlocked!' },
    { name: 'Welcome!', text: 'Welcome to Karaoke Successor!' },
    { name: 'Get Ready!', text: 'Get ready to sing!' },
    { name: 'Amazing!', text: 'Amazing performance!' },
  ];

  const generateAsset = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (assetType === 'image') {
        if (!prompt.trim()) {
          setError('Please enter a prompt for the image');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'image',
            prompt: prompt,
            filename: `generated-${Date.now()}.png`,
            size: '1024x1024'
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate image');
        }

        setGeneratedAssets(prev => [...prev, { 
          type: 'image', 
          data: data.image, 
          filename: data.filename 
        }]);
      } else {
        if (!text.trim()) {
          setError('Please enter text for the audio');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'audio',
            text: text,
            filename: `audio-${Date.now()}.wav`
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate audio');
        }

        setGeneratedAssets(prev => [...prev, { 
          type: 'audio', 
          data: data.audio, 
          filename: data.filename 
        }]);
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsset = (asset: { type: string; data: string; filename: string }) => {
    const link = document.createElement('a');
    if (asset.type === 'image') {
      link.href = `data:image/png;base64,${asset.data}`;
    } else {
      link.href = `data:audio/wav;base64,${asset.data}`;
    }
    link.download = asset.filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <SparkleIcon className="w-6 h-6 text-purple-400" />
          AI Asset Generator
        </h2>
        <p className="text-white/60">Generate images and audio for your karaoke game using AI</p>
      </div>

      {/* Type Toggle */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Asset Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => setAssetType('image')}
              className={assetType === 'image' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🖼️ Image
            </Button>
            <Button
              onClick={() => setAssetType('audio')}
              className={assetType === 'audio' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🔊 Audio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generator */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{assetType === 'image' ? 'Image Generation' : 'Text-to-Speech'}</CardTitle>
          <CardDescription>
            {assetType === 'image' 
              ? 'Describe the image you want to generate'
              : 'Enter text to convert to speech'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assetType === 'image' ? (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A neon-lit karaoke stage with microphones..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-purple-500"
              />
              {/* Preset Buttons */}
              <div>
                <p className="text-sm text-white/60 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {imagePresets.map((preset) => (
                    <Button
                      key={preset.name}
                      size="sm"
                      variant="outline"
                      onClick={() => setPrompt(preset.prompt)}
                      className="border-white/20 text-white/70 hover:text-white"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., Level Up!"
                className="bg-white/5 border-white/10 text-white"
              />
              {/* Preset Buttons */}
              <div>
                <p className="text-sm text-white/60 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {audioPresets.map((preset) => (
                    <Button
                      key={preset.name}
                      size="sm"
                      variant="outline"
                      onClick={() => setText(preset.text)}
                      className="border-white/20 text-white/70 hover:text-white"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={generateAsset}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <SparkleIcon className="w-4 h-4 mr-2" />
                Generate {assetType === 'image' ? 'Image' : 'Audio'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Assets */}
      {generatedAssets.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Generated Assets</CardTitle>
            <CardDescription>Click to download your generated assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generatedAssets.map((asset, index) => (
                <button
                  key={index}
                  onClick={() => downloadAsset(asset)}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors text-center"
                >
                  {asset.type === 'image' ? (
                    <img 
                      src={`data:image/png;base64,${asset.data}`} 
                      alt={asset.filename}
                      className="w-full aspect-square object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-purple-500/20 rounded-lg mb-2">
                      <span className="text-4xl">🔊</span>
                    </div>
                  )}
                  <p className="text-sm text-white/60 truncate">{asset.filename}</p>
                  <p className="text-xs text-purple-400 mt-1">Click to download</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <SparkleIcon className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">About AI Asset Generation</p>
              <p>Images and audio are generated using AI. For best results:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
                <li>Be specific in your image descriptions</li>
                <li>Include style keywords like "gaming", "neon", "vector"</li>
                <li>Audio supports multiple voices and languages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const { t, language, setLanguage, translations } = useTranslation();
  const { setDifficulty, gameState } = useGameStore();
  
  // Helper to access nested translations with fallback
  const tx = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: unknown = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return typeof result === 'string' ? result : key;
  }, [translations]);
  
  const [activeTab, setActiveTab] = useState<'general' | 'graphicsound' | 'microphone' | 'webcam' | 'library' | 'editor' | 'assets' | 'about'>('general');
  const [songsFolder, setSongsFolder] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [songCount, setSongCount] = useState(0);
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // PWA install state
  const [pwaInstallAvailable, setPwaInstallAvailable] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pwaInstallMessage, setPwaInstallMessage] = useState<string | null>(null);
  
  // Audio/Game settings state
  const [previewVolume, setPreviewVolume] = useState(30);
  const [micSensitivity, setMicSensitivity] = useState(50);
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('medium');
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState<string>('neon-nights');
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const [noteDisplayStyle, setNoteDisplayStyle] = useState<string>('classic');
  const [bgVideo, setBgVideo] = useState<boolean>(true);
  const [useAnimatedBg, setUseAnimatedBg] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Webcam settings state - SEPARATE camera for filming singers
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());
  
  // Update webcam config and save to localStorage
  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);
  
  // Safe localStorage helper
  const safeGetItem = useCallback((key: string, defaultValue: string = ''): string => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);
  
  const safeGetBool = useCallback((key: string, defaultValue: boolean = true): boolean => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const val = localStorage.getItem(key);
      return val === null ? defaultValue : val === 'true';
    } catch {
      return defaultValue;
    }
  }, []);
  
  // Load settings on mount - with safe localStorage access
  useEffect(() => {
    try {
      const savedFolder = safeGetItem('karaoke-songs-folder', '');
      setSongsFolder(savedFolder);
      setSongCount(getAllSongs().length);
    } catch {
      // Ignore errors
    }
    
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setIsTauriDetected(true);
    }
    
    // Check PWA installed status
    setPwaInstalled(isPWAInstalled());
    
    // Subscribe to PWA install availability changes
    const unsubscribe = onInstallAvailabilityChange((available) => {
      setPwaInstallAvailable(available);
    });
    
    // Check current availability
    setPwaInstallAvailable(canInstallPWA());
    
    // Load all settings from localStorage safely
    try {
      const savedPreviewVolume = safeGetItem('karaoke-preview-volume', '30');
      setPreviewVolume(parseInt(savedPreviewVolume) || 30);
      
      const savedMicSensitivity = safeGetItem('karaoke-mic-sensitivity', '50');
      setMicSensitivity(parseInt(savedMicSensitivity) || 50);
      
      const savedDifficulty = safeGetItem('karaoke-default-difficulty', 'medium') as Difficulty;
      if (['easy', 'medium', 'hard'].includes(savedDifficulty)) {
        setDefaultDifficulty(savedDifficulty);
      }
      
      setShowPitchGuide(safeGetBool('karaoke-show-pitch-guide', true));
      setLyricsStyle(safeGetItem('karaoke-lyrics-style', 'classic'));
      setNoteDisplayStyle(safeGetItem('karaoke-note-style', 'classic'));
      setBgVideo(safeGetBool('karaoke-bg-video', true));
      setUseAnimatedBg(safeGetItem('karaoke-animated-bg', 'false') === 'true');
      
      try {
        const storedTheme = getStoredTheme();
        if (storedTheme) setCurrentThemeId(storedTheme.id);
      } catch {
        // Ignore theme errors
      }
    } catch {
      // Ignore any localStorage errors
    }
    
    // Cleanup PWA subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [safeGetItem, safeGetBool]);
  
  // Save songs folder and reload library
  const handleSaveFolder = async () => {
    if (!songsFolder.trim()) {
      alert('Please enter a folder path first.');
      return;
    }
    
    localStorage.setItem('karaoke-songs-folder', songsFolder);
    
    // Clear caches and reload library
    clearCustomSongs();
    reloadLibrary();
    
    // Small delay to allow reload
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newCount = getAllSongs().length;
    setSongCount(newCount);
    setFolderSaveComplete(true);
    
    // Show feedback
    setTimeout(() => setFolderSaveComplete(false), 3000);
  };
  
  // Browse folder (using Tauri dialog if available, otherwise show instructions)
  const handleBrowseFolder = async () => {
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Songs Folder'
        });
        if (selected && typeof selected === 'string') {
          setSongsFolder(selected);
          localStorage.setItem('karaoke-songs-folder', selected);
          clearCustomSongs();
          reloadLibrary();
          setSongCount(getAllSongs().length);
          setFolderSaveComplete(true);
          setTimeout(() => setFolderSaveComplete(false), 3000);
        }
      } catch (e) {
        console.log('Tauri dialog not available:', e);
        alert('Could not open folder picker. Please enter the path manually.');
      }
    } else {
      // Browser mode - show instructions
      alert(
        'Folder picker is only available in the desktop app.\n\n' +
        'In browser mode, please:\n' +
        '1. Enter the full path to your songs folder\n' +
        '2. Click "Save" to apply\n\n' +
        'Note: Browser security restricts direct file system access. ' +
        'Use the Import tab to add songs manually.'
      );
    }
  };
  
  // Handle language change - now properly updates all UI
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate(n => n + 1);
  };
  
  // Handle theme change
  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentThemeId(theme.id);
    setHasChanges(true);
  };
  
  // Handle difficulty change - mark as changed
  const handleDifficultyChange = (diff: Difficulty) => {
    setDefaultDifficulty(diff);
    setHasChanges(true);
  };
  
  // Handle pitch guide toggle - mark as changed
  const handlePitchGuideToggle = (enabled: boolean) => {
    setShowPitchGuide(enabled);
    setHasChanges(true);
  };
  
  // Save all settings to localStorage and dispatch events
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('karaoke-preview-volume', previewVolume.toString());
      localStorage.setItem('karaoke-mic-sensitivity', micSensitivity.toString());
      localStorage.setItem('karaoke-default-difficulty', defaultDifficulty);
      localStorage.setItem('karaoke-show-pitch-guide', showPitchGuide.toString());
      localStorage.setItem('karaoke-lyrics-style', lyricsStyle);
      localStorage.setItem('karaoke-bg-video', bgVideo.toString());
      
      // Apply theme
      const theme = THEMES.find(t => t.id === currentThemeId);
      if (theme) {
        localStorage.setItem('karaoke-theme', JSON.stringify(theme));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }
      
      // Apply to current game state
      setDifficulty(defaultDifficulty);
      
      // Dispatch events for other components
      window.dispatchEvent(new CustomEvent('settingsChange', { 
        detail: { 
          difficulty: defaultDifficulty, 
          showPitchGuide: showPitchGuide,
          lyricsStyle: lyricsStyle,
          bgVideo: bgVideo
        } 
      }));
      
      setHasChanges(false);
      setFolderSaveComplete(true);
      setTimeout(() => setFolderSaveComplete(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  
  // Reset library without deleting highscores
  const handleResetLibrary = async () => {
    if (!confirm('Are you sure you want to reset the song library? This will remove all imported songs, but your highscores will be preserved.')) {
      return;
    }
    
    setIsResetting(true);
    setResetComplete(false);
    
    try {
      // Clear custom songs using the song-library function
      // This clears 'karaoke-successor-custom-songs' from localStorage and clears caches
      clearCustomSongs();
      
      // Find and remove other song-related keys
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        // Remove songs library and imported songs
        if (key.startsWith('karaoke-songs') || key.startsWith('imported-song-') || key === 'karaoke-library') {
          localStorage.removeItem(key);
        }
      }
      
      // Clear the song library cache
      reloadLibrary();
      
      // Small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSongCount(0);
      setResetComplete(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setResetComplete(false), 3000);
    } catch (error) {
      console.error('Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Clear all data including highscores (dangerous!)
  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data including highscores, profiles, and settings. This cannot be undone!\n\nType "DELETE" to confirm.')) {
      return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm complete data reset:');
    if (confirmation !== 'DELETE') {
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Reload the page to reset state
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      setIsResetting(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{tx('settings.title')}</h1>
        <p className="text-white/60">{tx('settings.subtitle')}</p>
      </div>
      
      {/* Tabs - Reorganized according to specification */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'general' ? 'default' : 'outline'}
          onClick={() => setActiveTab('general')}
          className={activeTab === 'general' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <SettingsIcon className="w-4 h-4 mr-2" /> {tx('settings.tabGeneral')}
        </Button>
        <Button
          variant={activeTab === 'graphicsound' ? 'default' : 'outline'}
          onClick={() => setActiveTab('graphicsound')}
          className={activeTab === 'graphicsound' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <MusicIcon className="w-4 h-4 mr-2" /> Graphic / Sound
        </Button>
        <Button
          variant={activeTab === 'microphone' ? 'default' : 'outline'}
          onClick={() => setActiveTab('microphone')}
          className={activeTab === 'microphone' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <MicIcon className="w-4 h-4 mr-2" /> Microphone
        </Button>
        <Button
          variant={activeTab === 'webcam' ? 'default' : 'outline'}
          onClick={() => setActiveTab('webcam')}
          className={activeTab === 'webcam' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <WebcamIcon className="w-4 h-4 mr-2" /> Webcam
        </Button>
        <Button
          variant={activeTab === 'library' ? 'default' : 'outline'}
          onClick={() => setActiveTab('library')}
          className={activeTab === 'library' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <FolderIcon className="w-4 h-4 mr-2" /> {tx('settings.tabLibrary')}
        </Button>
        <Button
          variant={activeTab === 'editor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('editor')}
          className={activeTab === 'editor' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <EditIcon className="w-4 h-4 mr-2" /> Editor
        </Button>
        <Button
          variant={activeTab === 'assets' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assets')}
          className={activeTab === 'assets' ? 'bg-purple-500 text-white' : 'border-white/20 text-white'}
        >
          <SparkleIcon className="w-4 h-4 mr-2" /> AI Asset
        </Button>
        <Button
          variant={activeTab === 'about' ? 'default' : 'outline'}
          onClick={() => setActiveTab('about')}
          className={activeTab === 'about' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <InfoIcon className="w-4 h-4 mr-2" /> {tx('settings.tabAbout')}
        </Button>
      </div>
      
      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Songs Folder */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderIcon className="w-5 h-5 text-cyan-400" />
                {tx('settings.songsFolder')}
              </CardTitle>
              <CardDescription>
                {tx('settings.songsFolderDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  id="songs-folder"
                  name="songs-folder"
                  placeholder="/path/to/your/songs"
                  value={songsFolder}
                  onChange={(e) => setSongsFolder(e.target.value)}
                  className="bg-white/5 border-white/10 text-white flex-1"
                />
                <Button 
                  onClick={handleBrowseFolder}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <FolderIcon className="w-4 h-4 mr-2" /> {tx('settings.browse')}
                </Button>
                <Button 
                  onClick={handleSaveFolder}
                  className="bg-cyan-500 hover:bg-cyan-400"
                >
                  {tx('settings.save')}
                </Button>
              </div>
              <p className="text-xs text-white/40 mt-2">
                This folder path is used for relative song file references. Click "Save" to apply and reload the library.
              </p>
              {/* Folder Save Success Message */}
              {folderSaveComplete && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2 mt-3">
                  <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-green-400 text-sm">Folder saved! Library reloaded with {songCount} songs.</span>
                </div>
              )}
              {!isTauriDetected && (
                <p className="text-xs text-yellow-400/80 mt-2">
                  ⚠️ Folder picker requires the desktop app. In browser, use the Import tab to add songs.
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* Library Stats */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.libraryStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">{songCount}</div>
                  <div className="text-sm text-white/60">{tx('settings.songsInLibrary')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length}
                  </div>
                  <div className="text-sm text-white/60">{tx('settings.highscoreEntries')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Import Songs Section */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudUploadIcon className="w-5 h-5 text-cyan-400" />
                Import Songs
              </CardTitle>
              <CardDescription>
                Import new songs into your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportScreen 
                onImport={(song) => {
                  // Refresh song count after import
                  setSongCount(getAllSongs().length);
                  setFolderSaveComplete(true);
                  setTimeout(() => setFolderSaveComplete(false), 2000);
                }}
                onCancel={() => {}}
              />
            </CardContent>
          </Card>
          
          {/* Reset Library */}
          <Card className="bg-white/5 border-white/10 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <TrashIcon className="w-5 h-5" />
                {tx('settings.dangerZone')}
              </CardTitle>
              <CardDescription>
                These actions cannot be undone easily
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reset Success Message */}
              {resetComplete && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-green-400">Library has been reset successfully!</span>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.resetLibrary')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.resetLibraryDesc')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetLibrary}
                  disabled={isResetting}
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  {isResetting ? (
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <TrashIcon className="w-4 h-4 mr-2" />
                  )}
                  {tx('settings.resetLibrary')}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div>
                  <h4 className="font-medium text-red-400">{tx('settings.clearAll')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.clearAllDesc')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleClearAllData}
                  disabled={isResetting}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {tx('settings.clearAll')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Webcam Tab - SEPARATE camera for filming singers */}
      {activeTab === 'webcam' && (
        <div className="space-y-6">
          <WebcamSettingsPanel 
            config={webcamConfig}
            onConfigChange={updateWebcamConfig}
          />
          
          {/* Webcam Info Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <InfoIcon className="w-5 h-5 text-cyan-400" />
                About Webcam Background
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  <strong className="text-white">📹 Purpose:</strong> The webcam is a <span className="text-cyan-400">SEPARATE camera</span> for filming singers while they perform. It is NOT the streaming/microphone camera.
                </p>
                <p>
                  <strong className="text-white">📐 Size Options:</strong> Choose from Fullscreen (entire background), or proportional overlays (20%, 30%, 40% of screen height).
                </p>
                <p>
                  <strong className="text-white">📍 Position:</strong> Place the webcam strip at the top, bottom, left, or right of the screen.
                </p>
                <p>
                  <strong className="text-white">🪞 Mirror Mode:</strong> Enable selfie-style mirroring for a natural self-view.
                </p>
                <p>
                  <strong className="text-white">🎨 Filters:</strong> Apply visual filters like Grayscale, Sepia, or Vibrant for artistic effects.
                </p>
                <p className="text-xs text-white/40 mt-4">
                  💡 Tip: Use the webcam to record singers and create memorable karaoke moments!
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Webcam Preview Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Preview
              </CardTitle>
              <CardDescription>
                Preview your webcam settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                <WebcamBackground 
                  config={webcamConfig}
                  onConfigChange={updateWebcamConfig}
                />
                {!webcamConfig.enabled && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40">
                    <div className="text-center">
                      <WebcamIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Enable webcam to see preview</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Language Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LanguageIcon className="w-5 h-5 text-cyan-400" />
                {tx('settings.language')}
              </CardTitle>
              <CardDescription>{tx('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
              >
                {Object.entries(LANGUAGE_FLAGS).map(([code, flag]) => (
                  <option key={code} value={code} className="bg-gray-800 text-white">
                    {flag} {LANGUAGE_NAMES[code as Language] || code}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40 mt-2">
                {tx('settings.languageNote')}
              </p>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PaletteIcon className="w-5 h-5 text-purple-400" />
                {tx('settings.themeSettings')}
              </CardTitle>
              <CardDescription>{tx('settings.themeSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Presets from themes.ts */}
              <div>
                <label className="text-sm text-white/60 mb-3 block">{tx('settings.colorTheme')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme)}
                      className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${
                        currentThemeId === theme.id
                          ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50' 
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div 
                        className="w-full h-8 rounded-lg mb-2"
                        style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                      />
                      <span className="text-sm font-medium text-white">{theme.name}</span>
                      <p className="text-xs text-white/40 truncate">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lyrics Style */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">{tx('settings.lyricsStyle')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'classic', name: 'Classic' },
                    { id: 'concert', name: 'Concert' },
                    { id: 'retro', name: 'Retro' },
                    { id: 'neon', name: 'Neon' },
                    { id: 'minimal', name: 'Minimal' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setLyricsStyle(style.id);
                        setHasChanges(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                        lyricsStyle === style.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Display Style */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Noten-Darstellung</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'classic', name: 'Klassisch', icon: '➡️', desc: 'UltraStar-Stil' },
                    { id: 'fill-level', name: 'Füllstand', icon: '📊', desc: 'Lücken bei Fehlern' },
                    { id: 'color-feedback', name: 'Farb-Feedback', icon: '🎨', desc: 'Farbe nach Treffgenauigkeit' },
                    { id: 'glow-intensity', name: 'Glow-Intensität', icon: '✨', desc: 'Helligkeit zeigt Qualität' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setNoteDisplayStyle(style.id);
                        localStorage.setItem('karaoke-note-style', style.id);
                        window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteDisplayStyle: style.id } }));
                        setHasChanges(true);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                        noteDisplayStyle === style.id
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      <span className="font-medium">{style.name}</span>
                      <span className="text-xs text-white/50">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Video Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBgVideo(!bgVideo);
                    localStorage.setItem('karaoke-bg-video', String(!bgVideo));
                    window.dispatchEvent(new CustomEvent('settingsChange'));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    bgVideo 
                      ? 'bg-cyan-500' 
                      : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    bgVideo 
                      ? 'left-8' 
                      : 'left-1'
                  }`} />
                </button>
              </div>
              
              {/* Animated Background Toggle (for low-performance systems) */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">Animated Background</h4>
                  <p className="text-sm text-white/60">Use animated backgrounds instead of videos. Recommended for low-performance systems. Also shows music-reactive effects when no video/background image is available.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !useAnimatedBg;
                    setUseAnimatedBg(newValue);
                    localStorage.setItem('karaoke-animated-bg', String(newValue));
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: newValue } }));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    useAnimatedBg 
                      ? 'bg-purple-500' 
                      : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    useAnimatedBg 
                      ? 'left-8' 
                      : 'left-1'
                  }`} />
                </button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.audioSettings')}</CardTitle>
              <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview Volume */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.previewVolume')}</label>
                  <span className="text-sm text-cyan-400">{previewVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={previewVolume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setPreviewVolume(val);
                    setHasChanges(true);
                  }}
                  className="w-full accent-cyan-500 h-2 rounded-lg appearance-none bg-white/10 cursor-pointer"
                />
                <p className="text-xs text-white/40">{tx('settings.previewVolumeDesc')}</p>
              </div>
              
              {/* Microphone Sensitivity */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.micSensitivity')}</label>
                  <span className="text-sm text-cyan-400">{micSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micSensitivity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setMicSensitivity(val);
                    setHasChanges(true);
                  }}
                  className="w-full accent-cyan-500 h-2 rounded-lg appearance-none bg-white/10 cursor-pointer"
                />
                <p className="text-xs text-white/40">{tx('settings.micSensitivityDesc')}</p>
              </div>
              
              {/* Microphone Selection */}
              <MicrophoneSettingsSection />
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.gameSettings')}</CardTitle>
              <CardDescription>{tx('settings.gameSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-medium">{tx('settings.defaultDifficulty')}</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => handleDifficultyChange(diff)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all capitalize cursor-pointer ${
                        defaultDifficulty === diff
                          ? diff === 'easy' ? 'border-green-500 bg-green-500/20 text-green-400' 
                            : diff === 'medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                            : 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40">{tx('settings.defaultDifficultyDesc')}</p>
              </div>
              
              {/* Show Pitch Guide Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.showPitchGuide')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.showPitchGuideDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePitchGuideToggle(!showPitchGuide)}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    showPitchGuide ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    showPitchGuide ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyboardIcon className="w-5 h-5 text-yellow-400" />
                {tx('settings.keyboardShortcuts')}
              </CardTitle>
              <CardDescription>{tx('settings.keyboardShortcutsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.searchShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">/</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.fullscreenShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">F</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.libraryShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">L</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.settingsShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+,</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.closeShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.searchAltShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+K</kbd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* AI Assets Tab - Generate images and audio with AI */}
      {activeTab === 'assets' && (
        <AIAssetsGenerator />
      )}
      
      {/* Graphic / Sound Tab */}
      {activeTab === 'graphicsound' && (
        <div className="space-y-6">
          {/* Video Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MusicIcon className="w-5 h-5 text-cyan-400" />
                Video Settings
              </CardTitle>
              <CardDescription>Background video and visual settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Background Video Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBgVideo(!bgVideo);
                    localStorage.setItem('karaoke-bg-video', String(!bgVideo));
                    window.dispatchEvent(new CustomEvent('settingsChange'));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    bgVideo ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
              
              {/* Animated Background Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">Animated Background</h4>
                  <p className="text-sm text-white/60">Use animated backgrounds instead of videos. Recommended for low-performance systems.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !useAnimatedBg;
                    setUseAnimatedBg(newValue);
                    localStorage.setItem('karaoke-animated-bg', String(newValue));
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: newValue } }));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    useAnimatedBg ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useAnimatedBg ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* Audio Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.audioSettings')}</CardTitle>
              <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Volume */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.previewVolume')}</label>
                  <span className="text-sm text-cyan-400">{previewVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={previewVolume}
                  onChange={(e) => {
                    setPreviewVolume(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full accent-cyan-500"
                />
              </div>
              
              {/* Mic Sensitivity */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.micSensitivity')}</label>
                  <span className="text-sm text-cyan-400">{micSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micSensitivity}
                  onChange={(e) => {
                    setMicSensitivity(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full accent-purple-500"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Lyrics Display Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Lyrics Display</CardTitle>
              <CardDescription>Customize how lyrics are displayed during gameplay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="text-sm text-white/60 mb-2 block">{tx('settings.lyricsStyle')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'classic', name: 'Classic' },
                    { id: 'concert', name: 'Concert' },
                    { id: 'retro', name: 'Retro' },
                    { id: 'neon', name: 'Neon' },
                    { id: 'minimal', name: 'Minimal' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setLyricsStyle(style.id);
                        setHasChanges(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                        lyricsStyle === style.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Microphone Tab */}
      {activeTab === 'microphone' && (
        <div className="space-y-6">
          <MicrophoneSettingsSection />
          
          {/* Mobile Connection Info */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-cyan-400" />
                Mobile Device as Microphone
              </CardTitle>
              <CardDescription>Use your smartphone as a wireless microphone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-white/70">
                  Connect your mobile device to use it as a wireless microphone. This allows you to sing without being tethered to the computer.
                </p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => window.location.href = window.location.pathname + '?screen=mobile'}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500"
                  >
                    <PhoneIcon className="w-4 h-4 mr-2" /> Open Mobile Setup
                  </Button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  💡 Tip: Scan the QR code from the Mobile screen in the main menu to connect your device.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EditIcon className="w-5 h-5 text-cyan-400" />
                Karaoke Editor Settings
              </CardTitle>
              <CardDescription>Configure the karaoke editor for creating and editing songs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-white/70">
                The Karaoke Editor allows you to create new songs or edit existing ones. You can:
              </p>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  Import audio files and create note tracks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  Edit lyrics and timing with precision
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  Use AI assistance for automatic lyric sync
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  Export songs in UltraStar format
                </li>
              </ul>
              <Button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'editor' }))}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 mt-4"
              >
                <EditIcon className="w-4 h-4 mr-2" /> Open Editor
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  <MusicIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-xl">Karaoke Successor</div>
                  <div className="text-sm text-white/60">{tx('settings.version')} 1.0.0</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4">
                {tx('settings.aboutDesc')}
              </p>
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature1')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature2')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature3')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature4')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature5')}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-cyan-400 font-medium">Next.js 15</div>
                  <div className="text-xs text-white/40">Framework</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-purple-400 font-medium">React</div>
                  <div className="text-xs text-white/40">UI Library</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-pink-400 font-medium">Zustand</div>
                  <div className="text-xs text-white/40">State Management</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-yellow-400 font-medium">Tailwind CSS</div>
                  <div className="text-xs text-white/40">Styling</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Status */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Online Leaderboard</h4>
                  <p className="text-sm text-white/60">Connect to global highscores</p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const connected = await leaderboardService.testConnection();
                    alert(connected ? '✅ Connected to leaderboard!' : '❌ Could not connect to leaderboard');
                  }}
                  className="border-cyan-500/50 text-cyan-400"
                >
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PWA Install - Only show in browser mode (not Tauri) */}
          {!isTauriDetected && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Install App</h4>
                  <p className="text-sm text-white/60">Install for offline access</p>
                </div>
                {pwaInstalled ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="text-sm font-medium">Installed</span>
                  </div>
                ) : pwaInstallAvailable ? (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const result = await promptPWAInstall();
                      setPwaInstallMessage(result.message);
                      if (result.success) {
                        setPwaInstalled(true);
                        setPwaInstallAvailable(false);
                      }
                    }}
                    className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    📲 Install
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-white/40 mb-1">Installation via browser menu</p>
                    <p className="text-xs text-cyan-400">
                      Use "Add to Home Screen" or "Install App" from your browser's menu
                    </p>
                  </div>
                )}
              </div>
              {pwaInstallMessage && (
                <p className={`text-xs mt-2 ${pwaInstalled ? 'text-green-400' : 'text-yellow-400'}`}>
                  {pwaInstallMessage}
                </p>
              )}
            </div>
          )}
          
          {/* Tauri Desktop App Info - Show in Tauri mode */}
          {isTauriDetected && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-green-400">Desktop App Installed</h4>
                  <p className="text-sm text-white/60">This app is running as a native desktop application with full offline support.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Save Button - Fixed at bottom */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-3 rounded-full shadow-lg shadow-cyan-500/30"
          >
            💾 Save Changes
          </Button>
        </div>
      )}
      
      {/* Success notification */}
      {folderSaveComplete && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ Settings saved successfully
        </div>
      )}
    </div>
  );
}

// ===================== MICROPHONE SETTINGS SECTION =====================
function MicrophoneSettingsSection() {
  const { t, translations } = useTranslation();
  const { profiles } = useGameStore();
  const [microphones, setMicrophones] = useState<MicrophoneDevice[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('default');
  const [micStatus, setMicStatus] = useState<MicrophoneStatus | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [micGain, setMicGain] = useState(1.0);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  
  // Multi-microphone state
  const [multiMicEnabled, setMultiMicEnabled] = useState(false);
  const [assignedMics, setAssignedMics] = useState<AssignedMicrophone[]>([]);
  const [selectedMicForAssignment, setSelectedMicForAssignment] = useState<string>('default');
  
  const micManager = useMemo(() => getMicrophoneManager(), []);
  const multiMicManager = useMemo(() => getMultiMicrophoneManager(), []);
  
  // Helper to access nested translations
  const tx = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: unknown = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  }, [translations]);
  
  // Load microphones on mount
  useEffect(() => {
    const loadMics = async () => {
      const devices = await micManager.getMicrophones();
      setMicrophones(devices);
    };
    loadMics();
    
    // Subscribe to status updates
    micManager.onStatus((status) => {
      setMicStatus(status);
    });
    
    return () => {
      micManager.disconnect();
    };
  }, [micManager]);
  
  // Load multi-mic state using useState (not refs) for proper UI updates
  useEffect(() => {
    // Initialize state from manager using queueMicrotask to avoid synchronous setState
    queueMicrotask(() => {
      setMultiMicEnabled(multiMicManager.isMultiMicEnabled());
      setAssignedMics(multiMicManager.getAssignedMicrophones());
    });
    
    // Subscribe to updates and update state
    const handleMultiMicUpdate = () => {
      setMultiMicEnabled(multiMicManager.isMultiMicEnabled());
      setAssignedMics([...multiMicManager.getAssignedMicrophones()]);
    };
    
    multiMicManager.onAssignedMics(handleMultiMicUpdate);
    
    return () => {
      multiMicManager.offAssignedMics(handleMultiMicUpdate);
    };
  }, [multiMicManager]);
  
  // Handle microphone selection (single mic mode)
  const handleSelectMic = async (deviceId: string) => {
    setSelectedMic(deviceId);
    await micManager.connect(deviceId);
  };
  
  // Handle gain change
  const handleGainChange = (gain: number) => {
    setMicGain(gain);
    micManager.setGain(gain);
  };
  
  // Handle audio settings change
  const handleAudioSettings = async () => {
    await micManager.updateConfig({
      noiseSuppression,
      echoCancellation,
      gain: micGain,
    });
  };
  
  // Test microphone
  const handleTestMic = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Connect if not connected
    if (!micStatus?.isConnected) {
      await micManager.connect(selectedMic);
    }
    
    const result = await micManager.testMicrophone(2000);
    setTestResult(result);
    setIsTesting(false);
  };
  
  // Toggle multi-mic mode
  const handleToggleMultiMic = (enabled: boolean) => {
    setMultiMicEnabled(enabled);
    multiMicManager.setMultiMicEnabled(enabled);
  };
  
  // Add microphone assignment
  const handleAddMic = async () => {
    if (!selectedMicForAssignment) return;
    await multiMicManager.assignMicrophone(selectedMicForAssignment);
    // Update state immediately after assignment
    setAssignedMics([...multiMicManager.getAssignedMicrophones()]);
  };
  
  // Remove microphone assignment
  const handleRemoveMic = async (micId: string) => {
    await multiMicManager.unassignMicrophone(micId);
    // Update state immediately after removal
    setAssignedMics([...multiMicManager.getAssignedMicrophones()]);
  };
  
  // Assign mic to player
  const handleAssignToPlayer = (micId: string, playerId: string, playerName: string) => {
    multiMicManager.updatePlayerAssignment(micId, playerId, playerName);
    // Update state immediately after assignment change
    setAssignedMics([...multiMicManager.getAssignedMicrophones()]);
  };
  
  // Get unassigned microphones (not already assigned)
  const unassignedMics = microphones.filter(
    mic => !assignedMics.some(assigned => assigned.deviceId === mic.deviceId)
  );
  
  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
      <h4 className="font-medium flex items-center gap-2">
        <MicIcon className="w-4 h-4" /> {tx('mic.title')}
      </h4>
      
      {/* Multi-Microphone Toggle */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <div>
          <span className="text-sm font-medium">{tx('mic.multiMic')}</span>
          <p className="text-xs text-white/40">{tx('mic.multiMicDesc')}</p>
        </div>
        <button
          type="button"
          onClick={() => handleToggleMultiMic(!multiMicEnabled)}
          className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
            multiMicEnabled ? 'bg-cyan-500' : 'bg-white/20'
          }`}
        >
          <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
            multiMicEnabled ? 'left-8' : 'left-1'
          }`} />
        </button>
      </div>
      
      {/* Multi-Microphone Mode */}
      {multiMicEnabled ? (
        <div className="space-y-4">
          {/* Add Microphone */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">{tx('mic.addMic')}</label>
            <div className="flex gap-2">
              <select
                value={selectedMicForAssignment}
                onChange={(e) => setSelectedMicForAssignment(e.target.value)}
                className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
              >
                <option value="default" className="bg-gray-800 text-white">{tx('mic.defaultMic')}</option>
                {unassignedMics.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId} className="bg-gray-800 text-white">
                    {mic.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAddMic}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400"
              >
                + {tx('mic.addMic')}
              </Button>
            </div>
          </div>
          
          {/* Assigned Microphones List */}
          {assignedMics.length > 0 ? (
            <div className="space-y-3">
              {assignedMics.map((mic, index) => (
                <div key={mic.id} className="bg-white/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${mic.status.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium">{mic.deviceName}</span>
                      {mic.playerName && (
                        <Badge variant="secondary" className="text-xs">
                          {mic.playerName}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMic(mic.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {tx('mic.removeMic')}
                    </Button>
                  </div>
                  
                  {/* Player Assignment */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-white/40">{tx('mic.assignToPlayer')}:</label>
                    <select
                      value={mic.playerId || ''}
                      onChange={(e) => {
                        const player = profiles.find(p => p.id === e.target.value);
                        handleAssignToPlayer(mic.id, e.target.value, player?.name || '');
                      }}
                      className="flex-1 bg-gray-800 border border-white/10 rounded px-2 py-1 text-white text-xs appearance-none cursor-pointer hover:border-cyan-500/50"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '12px', paddingRight: '20px' }}
                    >
                      <option value="" className="bg-gray-800 text-white">-- {tx('mic.assignToPlayer')} --</option>
                      {profiles.filter(p => p.isActive !== false).map((profile) => (
                        <option key={profile.id} value={profile.id} className="bg-gray-800 text-white">
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Volume Level */}
                  {mic.status.isConnected && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">{tx('mic.level')}:</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                          style={{ width: `${mic.status.volume * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Gain Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-xs text-white/40">{tx('mic.gain')}</label>
                      <span className="text-xs text-white/40">{Math.round(mic.config.gain * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      value={mic.config.gain * 100}
                      onChange={(e) => {
                        const gain = parseInt(e.target.value) / 100;
                        multiMicManager.setGain(mic.id, gain);
                      }}
                      className="w-full accent-purple-500 h-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-white/40 text-sm">
              {microphones.length === 0 ? tx('mic.noMicsFound') : 'Click "Add Microphone" to assign a microphone'}
            </div>
          )}
        </div>
      ) : (
        // Single Microphone Mode (original)
        <>
          {/* Microphone Selection */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">{tx('mic.selectDevice')}</label>
            <select
              value={selectedMic}
              onChange={(e) => handleSelectMic(e.target.value)}
              className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="default" className="bg-gray-800 text-white">{tx('mic.defaultMic')}</option>
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId} className="bg-gray-800 text-white">
                  {mic.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Microphone Status */}
          {micStatus && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${micStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{micStatus.deviceName}</span>
              {micStatus.isConnected && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-white/40">{tx('mic.level')}:</span>
                  <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
                      style={{ width: `${micStatus.volume * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Gain Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm text-white/60">{tx('mic.gain')}</label>
              <span className="text-sm text-white/40">{Math.round(micGain * 100)}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              value={micGain * 100}
              onChange={(e) => handleGainChange(parseInt(e.target.value) / 100)}
              onBlur={handleAudioSettings}
              className="w-full accent-purple-500"
            />
          </div>
          
          {/* Audio Processing Toggles */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => {
                  setNoiseSuppression(e.target.checked);
                  handleAudioSettings();
                }}
                className="rounded"
              />
              <div>
                <span className="text-sm">{tx('mic.noiseSuppression')}</span>
                <p className="text-xs text-white/40">{tx('mic.noiseSuppressionDesc')}</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={echoCancellation}
                onChange={(e) => {
                  setEchoCancellation(e.target.checked);
                  handleAudioSettings();
                }}
                className="rounded"
              />
              <div>
                <span className="text-sm">{tx('mic.echoCancellation')}</span>
                <p className="text-xs text-white/40">{tx('mic.echoCancellationDesc')}</p>
              </div>
            </label>
          </div>
          
          {/* Test Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestMic}
              disabled={isTesting}
              className="border-cyan-500/50 text-cyan-400"
            >
              {isTesting ? tx('mic.testing') : tx('mic.test')}
            </Button>
            
            {testResult && (
              <span className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.message}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===================== JUKEBOX SCREEN =====================
function JukeboxScreen({ onBack }: { onBack: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('all');
  // Custom YouTube video for Jukebox
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hidePlaylist, setHidePlaylist] = useState(false); // Toggle to hide playlist in fullscreen
  const [showLyrics, setShowLyrics] = useState(false); // Sing-Along Mode: Show lyrics overlay
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0); // Current lyric line index
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load songs asynchronously with media URL restoration
  const [songs, setSongs] = useState<Song[]>([]);
  
  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);
  
  // Get unique genres and artists
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [songs]);
  
  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    songs.forEach(s => {
      if (s.artist) artistSet.add(s.artist);
    });
    return Array.from(artistSet).sort();
  }, [songs]);
  
  // Filter songs
  const filteredSongs = useMemo(() => {
    let filtered = songs;
    if (filterGenre !== 'all') {
      filtered = filtered.filter(s => s.genre === filterGenre);
    }
    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [songs, filterGenre, filterArtist, searchQuery]);
  
  // Generate playlist
  const generatePlaylist = useCallback(() => {
    if (filteredSongs.length === 0) return;
    
    let newPlaylist = [...filteredSongs];
    if (shuffle) {
      // Fisher-Yates shuffle
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
    setCurrentSong(newPlaylist[0] || null);
  }, [filteredSongs, shuffle]);
  
  // Play next song
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= playlist.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentIndex(nextIndex);
    setCurrentSong(playlist[nextIndex]);
  }, [playlist, currentIndex, repeat]);
  
  // Play previous song
  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
    
    setCurrentIndex(prevIndex);
    setCurrentSong(playlist[prevIndex]);
  }, [playlist, currentIndex]);
  
  // Handle video end
  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSong) {
      // Restart current song
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  }, [repeat, currentSong, playNext]);
  
  // Start jukebox
  const startJukebox = () => {
    generatePlaylist();
    setIsPlaying(true);
  };
  
  // Stop jukebox
  const stopJukebox = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // CRITICAL: Cleanup on unmount - stop all media when leaving Jukebox
  useEffect(() => {
    return () => {
      // Stop video - DON'T clear src, just pause and reset
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      // Stop audio - DON'T clear src, just pause and reset
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      // Clear playlist state
      setPlaylist([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      setIsPlaying(false);
    };
  }, []);
  
  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentSong]);
  
  // Auto-play when song changes - FIXED: properly start audio/video playback
  useEffect(() => {
    if (isPlaying && currentSong) {
      // Small delay to allow refs to be set
      const playTimer = setTimeout(() => {
        // Determine if video has embedded audio (should play with sound)
        const videoHasEmbeddedAudio = currentSong.hasEmbeddedAudio || !currentSong.audioUrl;
        
        // Play video if available
        if (currentSong.videoBackground && videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
        
        // Play separate audio only if there's a dedicated audioUrl and video doesn't have embedded audio
        if (currentSong.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 100);
      return () => clearTimeout(playTimer);
    }
  }, [isPlaying, currentSong]);
  
  // Track current lyric line based on time (for Sing-Along Mode)
  useEffect(() => {
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;
    
    const updateCurrentLyric = () => {
      // Get current time from audio or video
      const currentTime = (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000; // Convert to ms
      
      // Find the current lyric line
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };
    
    const interval = setInterval(updateCurrentLyric, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [showLyrics, currentSong]);
  
  // Up next songs
  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);
  
  
  return (
    <div ref={containerRef} className={`max-w-6xl mx-auto ${isFullscreen ? 'fixed inset-0 z-50 bg-black flex' : ''}`}>
      {/* Fullscreen Header Overlay */}
      {isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-cyan-400 text-sm font-medium">NOW PLAYING</span>
            <h2 className="text-xl font-bold text-white">{currentSong?.title}</h2>
            <span className="text-white/60">{currentSong?.artist}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sing-Along Mode: Lyrics Toggle */}
            <Button 
              variant="outline" 
              onClick={() => setShowLyrics(!showLyrics)} 
              className={`border-white/20 ${showLyrics ? 'bg-purple-500/50 border-purple-500' : 'text-white'}`}
            >
              🎤 Lyrics
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setHidePlaylist(!hidePlaylist)} 
              className="border-white/20 text-white"
            >
              {hidePlaylist ? '📖 Show Playlist' : '📖 Hide Playlist'}
            </Button>
            <Button variant="outline" onClick={toggleFullscreen} className="border-white/20 text-white">
              ⤓ Exit Fullscreen
            </Button>
            <Button variant="outline" onClick={onBack} className="border-white/20 text-white">
              ← Back
            </Button>
          </div>
        </div>
      )}
      
      {/* Normal mode header */}
      {!isFullscreen && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🎵 Jukebox Mode</h1>
            <p className="text-white/60">
              {isPlaying ? `${playlist.length} songs in playlist` : 'Sit back and enjoy the music!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack} className="border-white/20 text-white">
              ← Back
            </Button>
          </div>
        </div>
      )}
      
      {/* Search and Filters */}
      {!isPlaying && (
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              id="library-search"
              name="library-search"
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              {genres.map(g => (
                <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
              ))}
            </select>
            
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="" className="bg-gray-800 text-white">All Artists</option>
              {artists.map(a => (
                <option key={a} value={a} className="bg-gray-800 text-white">{a}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`p-2 rounded-lg transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Song count and start button */}
          <div className="flex items-center justify-between">
            <p className="text-white/60">{filteredSongs.length} songs found</p>
            <Button
              onClick={startJukebox}
              disabled={filteredSongs.length === 0}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50"
            >
              <PlayIcon className="w-4 h-4 mr-2" /> Start Jukebox
            </Button>
          </div>
        </div>
      )}
      
      {/* Now Playing / Setup */}
      {isPlaying && currentSong ? (
        <div className={`flex-1 flex ${isFullscreen ? 'flex-row' : 'flex-col space-y-6'}`}>
          {/* Video Player */}
          <div className={`${isFullscreen ? (hidePlaylist ? 'flex-1' : 'w-[75%] h-full') : 'flex-1'}`}>
            <Card className={`bg-black/50 border-white/10 overflow-hidden ${isFullscreen ? 'h-full rounded-none' : ''}`}>
              <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
                {/* Video Background */}
                {/* Custom YouTube video takes priority */}
                {customYoutubeId ? (
                  <YouTubePlayer
                    videoId={customYoutubeId}
                    videoGap={0}
                    onReady={() => {}}
                    onTimeUpdate={(time) => setYoutubeTime(time)}
                    onEnded={handleMediaEnd}
                    onAdStart={() => setIsAdPlaying(true)}
                    onAdEnd={() => setIsAdPlaying(false)}
                    isPlaying={isPlaying}
                    startTime={0}
                  />
                ) : currentSong.videoBackground ? (
                  <video
                    ref={videoRef}
                    src={currentSong.videoBackground}
                    className="absolute inset-0 w-full h-full object-cover"
                    // Mute video only if there's a separate audio file AND video doesn't have embedded audio
                    muted={!!currentSong.audioUrl && !currentSong.hasEmbeddedAudio}
                    loop={false}
                    onEnded={handleMediaEnd}
                    playsInline
                  />
                ) : currentSong.youtubeUrl ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${extractYouTubeId(currentSong.youtubeUrl)}?autoplay=1&mute=0&controls=0&showinfo=0&rel=0`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                    {currentSong.coverImage ? (
                      <img src={currentSong.coverImage} alt={currentSong.title} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <MusicIcon className="w-32 h-32 text-white/30" />
                    )}
                  </div>
                )}
                
                {/* Audio element for songs with separate audio file */}
                {/* Only render separate audio if there's an audioUrl and it's NOT the same as videoBackground */}
                {currentSong.audioUrl && !currentSong.hasEmbeddedAudio && (
                  <audio
                    ref={audioRef}
                    src={currentSong.audioUrl}
                    onEnded={handleMediaEnd}
                  />
                )}
                
                {/* Sing-Along Mode: Lyrics Overlay */}
                {showLyrics && currentSong.lyrics && currentSong.lyrics.length > 0 && (
                  <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
                    <div className="text-center max-w-4xl px-8">
                      {/* Previous line (faded) */}
                      {currentLyricIndex > 0 && (
                        <p className="text-white/40 text-lg md:text-xl mb-2 transition-opacity">
                          {currentSong.lyrics[currentLyricIndex - 1]?.text}
                        </p>
                      )}
                      {/* Current line (highlighted) */}
                      <p className="text-white text-2xl md:text-4xl font-bold drop-shadow-lg animate-pulse">
                        {currentSong.lyrics[currentLyricIndex]?.text}
                      </p>
                      {/* Next line (faded) */}
                      {currentLyricIndex < currentSong.lyrics.length - 1 && (
                        <p className="text-white/40 text-lg md:text-xl mt-2 transition-opacity">
                          {currentSong.lyrics[currentLyricIndex + 1]?.text}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Overlay with song info - only show in non-fullscreen */}
                {!isFullscreen && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-cyan-400 text-sm font-medium">NOW PLAYING</p>
                        <h2 className="text-3xl font-bold text-white">{currentSong.title}</h2>
                        <p className="text-white/70 text-lg">{currentSong.artist}</p>
                      </div>
                      
                      {/* Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={playPrevious}
                          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoRef.current.paused) {
                                videoRef.current.play();
                              } else {
                                videoRef.current.pause();
                              }
                            }
                            if (audioRef.current) {
                              if (audioRef.current.paused) {
                                audioRef.current.play();
                              } else {
                                audioRef.current.pause();
                              }
                            }
                          }}
                          className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
                        >
                          <PlayIcon className="w-8 h-8 text-white ml-1" />
                        </button>
                        
                        <button
                          onClick={playNext}
                          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                        >
                          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fullscreen button in normal mode */}
                {!isFullscreen && (
                  <button
                    onClick={toggleFullscreen}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                  >
                    ⤢ Fullscreen
                  </button>
                )}
              </div>
            </Card>
          </div>
          
          {/* Controls Bar - only in normal mode */}
          {!isFullscreen && (
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={`p-2 rounded-lg transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>
                
                <button
                  onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
                  className={`p-2 rounded-lg transition-colors ${repeat !== 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 1l4 4-4 4" />
                    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <path d="M7 23l-4-4 4-4" />
                    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {repeat === 'one' && <span className="absolute text-xs">1</span>}
                </button>
                
                {/* Sing-Along Mode: Show Lyrics Toggle */}
                <button
                  onClick={() => setShowLyrics(!showLyrics)}
                  className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showLyrics ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
                  title="Sing-Along Mode: Show Lyrics"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span className="text-xs">Lyrics</span>
                </button>
              </div>
              
              {/* Volume */}
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-24 accent-cyan-500"
                />
              </div>
              
              <Button variant="outline" onClick={stopJukebox} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                Stop Jukebox
              </Button>
            </div>
          )}
          
          {/* Playlist Sidebar - in fullscreen mode combined with controls */}
          {upNext.length > 0 && !hidePlaylist && (
            <div className={`${isFullscreen ? 'w-[25%] h-full flex flex-col bg-black/80' : ''}`}>
              <Card className={`bg-white/5 border-white/10 ${isFullscreen ? 'flex-1 rounded-none border-0 flex flex-col' : ''}`}>
                <CardHeader className={isFullscreen ? 'pb-2 border-b border-white/10' : ''}>
                  <CardTitle className="text-lg flex items-center justify-between">
                    Up Next
                    {isFullscreen && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShuffle(!shuffle)}
                          className={`p-1.5 rounded transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className={isFullscreen ? 'flex-1 overflow-y-auto p-2' : ''}>
                  <div className="space-y-2">
                    {upNext.map((song, index) => (
                      <button
                        key={song.id}
                        onClick={() => {
                          const songIndex = playlist.findIndex(s => s.id === song.id);
                          if (songIndex !== -1) {
                            setCurrentIndex(songIndex);
                            setCurrentSong(playlist[songIndex]);
                          }
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span className="text-white/40 w-5 text-center text-sm">{index + 1}</span>
                        <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                          {song.coverImage ? (
                            <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MusicIcon className="w-5 h-5 text-white/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate text-sm">{song.title}</p>
                          <p className="text-white/60 text-xs truncate">{song.artist}</p>
                        </div>
                        <span className="text-white/40 text-xs">
                          {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
                        </span>
                      </button>
                    ))}
                  </div>
                </CardContent>
                {/* Fullscreen mode controls at bottom of playlist */}
                {isFullscreen && (
                  <div className="p-3 border-t border-white/10 space-y-3">
                    {/* Volume */}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-500"
                      />
                    </div>
                    {/* Stop button */}
                    <Button variant="outline" onClick={stopJukebox} className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
                      Stop Jukebox
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      ) : (
        /* Setup Screen */
        <div className="space-y-6">
          {/* Filter Options */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Playlist Settings</CardTitle>
              <CardDescription>Customize your music experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Genre Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Filter by Genre</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>
                      {genre === 'all' ? 'All Genres' : genre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Artist Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Filter by Artist</label>
                <select
                  value={filterArtist}
                  onChange={(e) => setFilterArtist(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">All Artists</option>
                  {artists.map(artist => (
                    <option key={artist} value={artist}>{artist}</option>
                  ))}
                </select>
              </div>
              
              {/* Options */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffle}
                    onChange={(e) => setShuffle(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Shuffle</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'none'}
                    onChange={() => setRepeat('none')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">No Repeat</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'all'}
                    onChange={() => setRepeat('all')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Repeat All</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'one'}
                    onChange={() => setRepeat('one')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Repeat One</span>
                </label>
              </div>
              
              {/* Song count */}
              <div className="text-center py-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-cyan-400">{filteredSongs.length}</p>
                <p className="text-white/60 text-sm">songs available</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Custom YouTube Background Video */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                Background Video (Optional)
              </CardTitle>
              <CardDescription>Add a YouTube video to play in the background</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste YouTube URL..."
                  value={customYoutubeUrl}
                  onChange={(e) => setCustomYoutubeUrl(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => {
                    const id = extractYouTubeId(customYoutubeUrl);
                    if (id) {
                      setCustomYoutubeId(id);
                    }
                  }}
                  disabled={!extractYouTubeId(customYoutubeUrl)}
                  className="px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-white/10 disabled:text-white/40 text-white rounded-lg transition-colors"
                >
                  Set
                </button>
              </div>
              {customYoutubeId && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Video set! Will play during Jukebox.
                  </p>
                  <button
                    onClick={() => {
                      setCustomYoutubeId(null);
                      setCustomYoutubeUrl('');
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Start Button */}
          <Button
            onClick={startJukebox}
            disabled={filteredSongs.length === 0}
            className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white"
          >
            <PlayIcon className="w-6 h-6 mr-2" /> Start Jukebox
          </Button>
          
          {filteredSongs.length === 0 && (
            <p className="text-center text-white/60">
              No songs match your filters. Try different settings or import some songs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ===================== ACHIEVEMENTS SCREEN =====================
function AchievementsScreen() {
  const { profiles, activeProfileId } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  const unlockedIds = new Set(activeProfile?.achievements.map(a => a.id) || []);
  
  const filteredAchievements = ACHIEVEMENT_DEFINITIONS.filter(a => {
    if (filter === 'unlocked' && !unlockedIds.has(a.id)) return false;
    if (filter === 'locked' && unlockedIds.has(a.id)) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    return true;
  });
  
  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter(a => unlockedIds.has(a.id)).length;
  const totalXP = ACHIEVEMENT_DEFINITIONS
    .filter(a => unlockedIds.has(a.id))
    .reduce((sum, a) => sum + (a.reward?.xp || 0), 0);
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏆 Achievements</h1>
        <p className="text-white/60">Unlock achievements by playing!</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length}</div>
            <div className="text-sm text-white/60">Unlocked</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-cyan-400">{totalXP}</div>
            <div className="text-sm text-white/60">XP Earned</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">{Math.round(unlockedCount / ACHIEVEMENT_DEFINITIONS.length * 100)}%</div>
            <div className="text-sm text-white/60">Completion</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-cyan-500' : 'border-white/20 text-white'}>
          All
        </Button>
        <Button variant={filter === 'unlocked' ? 'default' : 'outline'} onClick={() => setFilter('unlocked')}
          className={filter === 'unlocked' ? 'bg-green-500' : 'border-white/20 text-white'}>
          Unlocked
        </Button>
        <Button variant={filter === 'locked' ? 'default' : 'outline'} onClick={() => setFilter('locked')}
          className={filter === 'locked' ? 'bg-red-500' : 'border-white/20 text-white'}>
          Locked
        </Button>
        <span className="border-l border-white/20 mx-2" />
        {['all', 'performance', 'progression', 'social', 'special'].map(cat => (
          <Button key={cat} variant={categoryFilter === cat ? 'default' : 'outline'} 
            onClick={() => setCategoryFilter(cat)}
            className={categoryFilter === cat ? 'bg-purple-500' : 'border-white/20 text-white text-xs'}>
            {cat === 'all' ? 'All' : cat}
          </Button>
        ))}
      </div>
      
      {/* Achievement Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const rarityColor = getRarityColor(achievement.rarity);
          
          return (
            <Card key={achievement.id} className={`bg-white/5 border-white/10 ${isUnlocked ? 'ring-2 ring-yellow-500/50' : 'opacity-60'}`}>
              <CardContent className="pt-4">
                <div className="text-center mb-2">
                  <span className="text-3xl" style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                    {achievement.icon}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-center" style={{ color: isUnlocked ? rarityColor : 'inherit' }}>
                  {achievement.name}
                </h3>
                <p className="text-xs text-white/60 text-center mt-1">{achievement.description}</p>
                {isUnlocked && achievement.reward && (
                  <div className="mt-2 text-center text-xs text-yellow-400">
                    +{achievement.reward.xp} XP
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ===================== DAILY CHALLENGE SCREEN =====================
// ===================== DAILY CHALLENGE SCREEN =====================
function DailyChallengeScreen({ onPlayChallenge }: { onPlayChallenge: (song: Song) => void }) {
  const { profiles, activeProfileId } = useGameStore();
  const [activeTab, setActiveTab] = useState<'challenge' | 'leaderboard' | 'badges'>('challenge');
  
  // Get challenge and stats from new system
  const challenge = getDailyChallenge();
  const playerStats = getPlayerDailyStats();
  const levelInfo = getXPLevel(playerStats.totalXP);
  const timeLeft = getTimeUntilReset();
  
  // Challenge descriptions
  const challengeDescriptions: Record<string, string> = {
    score: `Score ${challenge.target.toLocaleString()}+ points in a single song`,
    accuracy: `Achieve ${challenge.target}%+ accuracy`,
    combo: `Get a ${challenge.target}+ note combo`,
    songs: `Complete ${challenge.target} songs today`,
    perfect_notes: `Hit ${challenge.target}+ perfect notes`,
  };
  
  // Check if already completed today
  const completedToday = isChallengeCompletedToday();
  
  // Sort leaderboard by score
  const sortedLeaderboard = [...challenge.entries].sort((a, b) => b.score - a.score);
  
  // Get active profile
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">⭐ Daily Challenge</h1>
        <p className="text-white/60">Complete daily challenges to earn XP and build your streak!</p>
      </div>
      
      {/* Level & XP Progress */}
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-purple-400">Lv.{levelInfo.level}</div>
              <div>
                <div className="text-sm font-medium">{levelInfo.title}</div>
                <div className="text-xs text-white/60">{playerStats.totalXP.toLocaleString()} XP</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">Next Level</div>
              <div className="text-sm font-medium">{levelInfo.nextLevel.toLocaleString()} XP</div>
            </div>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${levelInfo.progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Streak & Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border-orange-500/30">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-orange-400">{playerStats.currentStreak}</div>
            <div className="text-xs text-white/60">Day Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-amber-400">{playerStats.longestStreak}</div>
            <div className="text-xs text-white/60">Best Streak</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-green-400">{playerStats.totalCompleted}</div>
            <div className="text-xs text-white/60">Completed</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'challenge' ? 'default' : 'outline'}
          onClick={() => setActiveTab('challenge')}
          className={activeTab === 'challenge' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🎯 Challenge
        </Button>
        <Button
          variant={activeTab === 'leaderboard' ? 'default' : 'outline'}
          onClick={() => setActiveTab('leaderboard')}
          className={activeTab === 'leaderboard' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🏆 Leaderboard
        </Button>
        <Button
          variant={activeTab === 'badges' ? 'default' : 'outline'}
          onClick={() => setActiveTab('badges')}
          className={activeTab === 'badges' ? 'bg-gradient-to-r from-cyan-500 to-purple-500' : 'border-white/20'}
        >
          🎖️ Badges
        </Button>
      </div>
      
      {/* Challenge Tab */}
      {activeTab === 'challenge' && (
        <Card className={`bg-white/5 border-white/10 ${completedToday ? 'ring-2 ring-green-500' : ''}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{completedToday ? '✅ Challenge Complete!' : '🎯 Today\'s Challenge'}</span>
              <Badge variant="outline" className="border-cyan-500 text-cyan-400">
                +{XP_REWARDS.CHALLENGE_COMPLETE} XP
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{challengeDescriptions[challenge.type] || 'Complete the challenge!'}</p>
            
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/60">Target</span>
                <span className="font-medium">{challenge.target.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${completedToday ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                  style={{ width: completedToday ? '100%' : '0%' }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-white/60">
                Resets in: {timeLeft.hours}h {timeLeft.minutes}m
              </div>
              {!completedToday && (
                <Button 
                  onClick={() => {
                    const songs = getAllSongs();
                    if (songs.length > 0) {
                      const randomSong = songs[Math.floor(Math.random() * songs.length)];
                      onPlayChallenge(randomSong);
                    }
                  }} 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500"
                >
                  Play Now
                </Button>
              )}
            </div>
            
            {!completedToday && playerStats.currentStreak > 0 && (
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="text-sm text-orange-400">
                  🔥 Streak Bonus: +{XP_REWARDS.STREAK_BONUS_BASE * playerStats.currentStreak} XP ({playerStats.currentStreak} days)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>🏆 Today&apos;s Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedLeaderboard.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎯</div>
                <p>No entries yet! Be the first to complete today&apos;s challenge!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedLeaderboard.slice(0, 10).map((entry, idx) => (
                  <div 
                    key={entry.playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      idx === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                      idx === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                      idx === 2 ? 'bg-orange-700/20 border border-orange-700/30' :
                      'bg-white/5'
                    }`}
                  >
                    <div className="text-xl font-bold w-8">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: entry.playerColor }}
                      >
                        {entry.playerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{entry.playerName}</div>
                      <div className="text-xs text-white/60">
                        {entry.accuracy.toFixed(1)}% accuracy • {entry.combo} max combo
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.score.toLocaleString()}</div>
                      <div className="text-xs text-white/40">points</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 text-center text-sm text-white/40">
              {challenge.totalParticipants} participant{challenge.totalParticipants !== 1 ? 's' : ''} today
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Badges Tab */}
      {activeTab === 'badges' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>🎖️ Your Badges ({playerStats.badges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {playerStats.badges.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎖️</div>
                <p>Complete challenges to earn badges!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {playerStats.badges.map((badge) => (
                  <div 
                    key={badge.id}
                    className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg text-center"
                  >
                    <div className="text-3xl mb-2">{badge.icon}</div>
                    <div className="font-medium text-amber-400">{badge.name}</div>
                    <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                    <div className="text-xs text-white/40 mt-2">
                      {new Date(badge.unlockedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white/60 mb-3">Available Badges</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 opacity-50">
                {Object.values(DAILY_BADGES)
                  .filter(b => !playerStats.badges.some(pb => pb.id === b.id))
                  .slice(0, 6)
                  .map((badge) => (
                    <div 
                      key={badge.id}
                      className="p-4 bg-white/5 border border-white/10 rounded-lg text-center grayscale"
                    >
                      <div className="text-3xl mb-2">{badge.icon}</div>
                      <div className="font-medium">{badge.name}</div>
                      <div className="text-xs text-white/60 mt-1">{badge.description}</div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== EDITOR SCREEN =====================
// Common genres and languages for quick selection
const COMMON_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Dance',
  'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Latin', 'Metal',
  'Punk', 'Indie', 'Folk', 'Classical', 'Soundtrack', 'Musical',
  'Schlager', 'Deutsch-Pop', 'Volksmusik', 'K-Pop', 'J-Pop'
];

const COMMON_LANGUAGES = [
  { code: 'en', name: 'Englisch' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Spanisch' },
  { code: 'fr', name: 'Französisch' },
  { code: 'it', name: 'Italienisch' },
  { code: 'pt', name: 'Portugiesisch' },
  { code: 'ja', name: 'Japanisch' },
  { code: 'ko', name: 'Koreanisch' },
  { code: 'zh', name: 'Chinesisch' },
  { code: 'ru', name: 'Russisch' },
  { code: 'nl', name: 'Niederländisch' },
  { code: 'pl', name: 'Polnisch' },
  { code: 'tr', name: 'Türkisch' },
  { code: 'ar', name: 'Arabisch' },
  { code: 'sv', name: 'Schwedisch' },
  { code: 'la', name: 'Latein' },
];

// Genre/Language Editor Component
function GenreLanguageEditor({ 
  song, 
  onUpdate 
}: { 
  song: Song; 
  onUpdate: (updates: Partial<Song>) => void;
}) {
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [customGenre, setCustomGenre] = useState(song.genre || '');
  const [customLanguage, setCustomLanguage] = useState(song.language || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleGenreSelect = (genre: string) => {
    setCustomGenre(genre);
    onUpdate({ genre });
    setShowGenreDropdown(false);
  };

  const handleLanguageSelect = (code: string) => {
    setCustomLanguage(code);
    onUpdate({ language: code });
    setShowLanguageDropdown(false);
  };

  const handleCustomGenreChange = (value: string) => {
    setCustomGenre(value);
    onUpdate({ genre: value });
  };

  const handleCustomLanguageChange = (value: string) => {
    setCustomLanguage(value);
    onUpdate({ language: value });
  };

  const handleSaveToTxt = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Update the song in the library
      const updatedSong = { 
        ...song, 
        genre: customGenre || undefined,
        language: customLanguage || undefined 
      };
      updateSong(song.id, updatedSong);
      
      // Generate new txt content with genre/language
      const { generateUltraStarTxt } = await import('@/lib/parsers/ultrastar-parser');
      const txtContent = generateUltraStarTxt(updatedSong);
      
      // In browser environment, download the file
      // In Tauri environment, save to the original file location
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          
          const filePath = await save({
            defaultPath: `${song.title} - ${song.artist}.txt`,
            filters: [{ name: 'UltraStar TXT', extensions: ['txt'] }],
          });
          
          if (filePath) {
            await writeTextFile(filePath, txtContent);
            setSaveMessage('✅ Datei gespeichert!');
          }
        } catch (e) {
          console.error('Tauri save error:', e);
          // Fallback to download
          downloadTxtFile(txtContent, song);
        }
      } else {
        // Browser: download the file
        downloadTxtFile(txtContent, song);
        setSaveMessage('✅ Datei heruntergeladen!');
      }
      
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setSaveMessage('❌ Fehler beim Speichern');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const downloadTxtFile = (content: string, song: Song) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title} - ${song.artist}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          🏷️ Metadaten ergänzen
        </CardTitle>
        <CardDescription>
          Genre und Sprache für diesen Song hinzufügen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Genre Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Genre</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🎸 {customGenre || 'Genre auswählen...'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showGenreDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Button>
              {showGenreDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {COMMON_GENRES.map(genre => (
                      <button
                        key={genre}
                        onClick={() => handleGenreSelect(genre)}
                        className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          customGenre === genre 
                            ? 'bg-cyan-500 text-white' 
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Oder eigenes Genre eingeben..."
            value={customGenre}
            onChange={(e) => handleCustomGenreChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Language Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Sprache</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Button
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                variant="outline"
                className="w-full justify-between border-white/20 text-white"
              >
                <span className="flex items-center gap-2">
                  🌐 {COMMON_LANGUAGES.find(l => l.code === customLanguage)?.name || customLanguage || 'Sprache auswählen...'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Button>
              {showLanguageDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    {COMMON_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`w-full px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                          customLanguage === lang.code 
                            ? 'bg-purple-500 text-white' 
                            : 'hover:bg-white/10 text-white/80'
                        }`}
                      >
                        {lang.name} ({lang.code})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Input
            placeholder="Oder eigenen Sprachcode eingeben (z.B. 'en', 'de')..."
            value={customLanguage}
            onChange={(e) => handleCustomLanguageChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Current Status */}
        <div className="flex gap-4 text-sm">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.genre ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.genre ? '✅' : '❌'} Genre: {song.genre || 'nicht gesetzt'}
          </div>
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${song.language ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {song.language ? '✅' : '❌'} Sprache: {song.language || 'nicht gesetzt'}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <Button
            onClick={handleSaveToTxt}
            disabled={isSaving || (!customGenre && !customLanguage)}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Speichere...
              </>
            ) : (
              <>
                💾 Änderungen in TXT-Datei speichern
              </>
            )}
          </Button>
          {saveMessage && (
            <p className={`text-center mt-2 text-sm ${saveMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {saveMessage}
            </p>
          )}
          <p className="text-xs text-white/40 text-center mt-2">
            Fügt #GENRE: und #LANGUAGE: Tags in die TXT-Datei ein
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EditorScreen({ onBack }: { onBack: () => void }) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [songs] = useState<Song[]>(() => getAllSongs());
  const { setSong } = useGameStore();
  const [filterMode, setFilterMode] = useState<'all' | 'no-genre' | 'no-language' | 'incomplete'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter songs based on filter mode and search
  const filteredSongs = useMemo(() => {
    let filtered = songs;
    
    // Apply filter mode
    switch (filterMode) {
      case 'no-genre':
        filtered = filtered.filter(s => !s.genre);
        break;
      case 'no-language':
        filtered = filtered.filter(s => !s.language);
        break;
      case 'incomplete':
        filtered = filtered.filter(s => !s.genre || !s.language);
        break;
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [songs, filterMode, searchQuery]);

  // Count songs without genre/language
  const songsWithoutGenre = songs.filter(s => !s.genre).length;
  const songsWithoutLanguage = songs.filter(s => !s.language).length;
  const incompleteSongs = songs.filter(s => !s.genre || !s.language).length;

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
  };

  const handleSave = (updatedSong: Song) => {
    updateSong(updatedSong.id, updatedSong);
    setSelectedSong(null);
  };

  const handleSongMetadataUpdate = (updates: Partial<Song>) => {
    if (selectedSong) {
      setSelectedSong({ ...selectedSong, ...updates } as Song);
    }
  };

  return (
    <div className="w-full h-full">
      {!selectedSong ? (
        <div className="space-y-6 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Karaoke Editor</h1>
              <p className="text-white/60">Bearbeite Songs mit KI-Unterstützung</p>
            </div>
            <Button onClick={onBack} variant="outline" className="border-white/20">
              ← Zurück
            </Button>
          </div>

          {/* Filter Section */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                🔍 Songs filtern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <Input
                placeholder="Songs suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setFilterMode('all')}
                  variant={filterMode === 'all' ? 'default' : 'outline'}
                  className={filterMode === 'all' ? 'bg-cyan-500' : 'border-white/20 text-white'}
                  size="sm"
                >
                  Alle ({songs.length})
                </Button>
                <Button
                  onClick={() => setFilterMode('no-genre')}
                  variant={filterMode === 'no-genre' ? 'default' : 'outline'}
                  className={filterMode === 'no-genre' ? 'bg-orange-500' : 'border-white/20 text-white'}
                  size="sm"
                >
                  🎸 Kein Genre ({songsWithoutGenre})
                </Button>
                <Button
                  onClick={() => setFilterMode('no-language')}
                  variant={filterMode === 'no-language' ? 'default' : 'outline'}
                  className={filterMode === 'no-language' ? 'bg-purple-500' : 'border-white/20 text-white'}
                  size="sm"
                >
                  🌐 Keine Sprache ({songsWithoutLanguage})
                </Button>
                <Button
                  onClick={() => setFilterMode('incomplete')}
                  variant={filterMode === 'incomplete' ? 'default' : 'outline'}
                  className={filterMode === 'incomplete' ? 'bg-red-500' : 'border-white/20 text-white'}
                  size="sm"
                >
                  ⚠️ Unvollständig ({incompleteSongs})
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Song auswählen ({filteredSongs.length} Songs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredSongs.map(song => (
                  <button
                    key={song.id}
                    onClick={() => handleSelectSong(song)}
                    className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {song.coverImage ? (
                        <img src={song.coverImage} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                          🎵
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-white/60 truncate">{song.artist}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">{song.bpm} BPM</Badge>
                      <Badge variant="outline" className="text-xs">{song.lyrics.reduce((a, l) => a + l.notes.length, 0)} Notes</Badge>
                      {!song.genre && (
                        <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400">Kein Genre</Badge>
                      )}
                      {!song.language && (
                        <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">Keine Sprache</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {filteredSongs.length === 0 && (
                <div className="text-center py-12 text-white/40">
                  <div className="text-4xl mb-2">📝</div>
                  <p>Keine Songs gefunden</p>
                  <p className="text-sm">Versuche andere Filterkriterien</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-5rem)]">
          {/* Editor - Full width with AI Panel integrated */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <KaraokeEditor
              song={selectedSong}
              onSave={handleSave}
              onCancel={() => setSelectedSong(null)}
            />
          </div>

          {/* Right Sidebar - AI Assistant + Genre/Language Editor */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-white/10 p-4 space-y-4">
            {/* Genre/Language Editor */}
            <GenreLanguageEditor 
              song={selectedSong}
              onUpdate={handleSongMetadataUpdate}
            />
            
            {/* AI Assistant Panel */}
            <AIAssistantPanel
              song={selectedSong}
              onSongUpdate={(updates) => setSelectedSong({ ...selectedSong, ...updates } as Song)}
              onLyricsUpdate={(lyrics) => setSelectedSong({ ...selectedSong, lyrics } as Song)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
