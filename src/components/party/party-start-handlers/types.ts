import type { PartyStore } from '@/lib/game/party-store';
import type { GameSetupResult, GameModeSettingsMap } from '@/components/game/unified-party-setup.types';
import type { GameMode, Difficulty, Song } from '@/types/game';
import type { Screen } from '@/types/screens';
import type { Player } from '@/types/game';

/** Context passed to every start-handler */
export interface StartHandlerContext {
  result: GameSetupResult;
  mode: GameMode;
  party: PartyStore;
  setGameMode: (_mode: GameMode) => void;
  setDifficulty: (_d: Difficulty) => void;
  setSong: (_song: Song | null) => void;
  resetGame: () => void;
  addPlayer: (_p: Pick<Player, 'id' | 'name' | 'avatar' | 'color'>) => void;
  setPlayers: (_players: Player[]) => void;
  setScreen: (_s: Screen) => void;
  toast: (opts: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  t: (key: string) => string;
  filteredSongs: Song[];
}

export type { GameSetupResult, GameModeSettingsMap };
