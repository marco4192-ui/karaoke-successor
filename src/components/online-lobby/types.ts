export interface OnlinePlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isReady: boolean;
  isHost: boolean;
  score: number;
  combo: number;
  accuracy: number;
}

export interface OnlineRoom {
  id: string;
  code: string;
  hostId: string;
  players: OnlinePlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  song: {
    id: string;
    title: string;
    artist: string;
    duration: number;
  } | null;
  countdown: number;
  gameMode: 'duel' | 'battle-royale' | 'tournament';
  maxPlayers: number;
}

export type LobbyView = 'menu' | 'create' | 'join' | 'room' | 'finding';
