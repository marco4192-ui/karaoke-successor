// Multiplayer State Management for Duel Mode
import { Player, Song } from '@/types/game';

export interface MultiplayerState {
  mode: 'local' | 'online';
  status: 'waiting' | 'matching' | 'playing' | 'ended';
  players: MultiplayerPlayer[];
  currentRound: number;
  totalRounds: number;
  countdown: number;
  winner: string | null;
  roomCode: string | null;
  isHost: boolean;
}

export interface MultiplayerPlayer extends Player {
  isReady: boolean;
  isOnline: boolean;
  connectionId?: string;
  roundScores: number[];
  totalScore: number;
}

export interface DuelMatch {
  id: string;
  song: Song;
  player1: MultiplayerPlayer;
  player2: MultiplayerPlayer;
  startTime: number;
  duration: number;
  status: 'waiting' | 'playing' | 'ended';
  winner: string | null;
}

export function createMultiplayerPlayer(player: Player): MultiplayerPlayer {
  return {
    ...player,
    isReady: false,
    isOnline: true,
    roundScores: [],
    totalScore: 0,
  };
}

export function createDuelMatch(
  song: Song,
  player1: Player,
  player2: Player
): DuelMatch {
  return {
    id: `duel-${Date.now()}`,
    song,
    player1: createMultiplayerPlayer(player1),
    player2: createMultiplayerPlayer(player2),
    startTime: Date.now(),
    duration: song.duration,
    status: 'waiting',
    winner: null,
  };
}

export function updateDuelScore(
  match: DuelMatch,
  playerId: string,
  score: number,
  combo: number,
  notesHit: number
): DuelMatch {
  const updates = { score, combo, notesHit, notesMissed: 0, accuracy: 0, starPower: 0, isStarPowerActive: false };
  
  if (match.player1.id === playerId) {
    match.player1 = { ...match.player1, ...updates };
  } else if (match.player2.id === playerId) {
    match.player2 = { ...match.player2, ...updates };
  }
  
  return match;
}

export function determineDuelWinner(match: DuelMatch): string | null {
  if (match.player1.score > match.player2.score) {
    return match.player1.id;
  } else if (match.player2.score > match.player1.score) {
    return match.player2.id;
  }
  return null; // Tie
}

export function endDuelMatch(match: DuelMatch): DuelMatch {
  return {
    ...match,
    status: 'ended',
    winner: determineDuelWinner(match),
  };
}

// Split-screen positioning
export interface SplitScreenConfig {
  player1Area: { x: number; y: number; width: number; height: number };
  player2Area: { x: number; y: number; width: number; height: number };
  dividerPosition: number; // Percentage from top
}

export function getSplitScreenConfig(isVertical: boolean = false): SplitScreenConfig {
  if (isVertical) {
    return {
      player1Area: { x: 0, y: 0, width: 50, height: 100 },
      player2Area: { x: 50, y: 0, width: 50, height: 100 },
      dividerPosition: 50,
    };
  }
  
  return {
    player1Area: { x: 0, y: 0, width: 100, height: 48 },
    player2Area: { x: 0, y: 52, width: 100, height: 48 },
    dividerPosition: 50,
  };
}

// Online multiplayer via WebSocket
export interface OnlineMessage {
  type: 'join' | 'leave' | 'ready' | 'start' | 'score' | 'end' | 'chat';
  payload: unknown;
  senderId: string;
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  hostId: string;
  players: Array<{ id: string; name: string; isReady: boolean }>;
  status: 'waiting' | 'playing' | 'ended';
  currentSong?: Song;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
