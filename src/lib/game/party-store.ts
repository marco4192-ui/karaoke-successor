// Party Game State Store — extracted from page.tsx global state
// Manages state for Tournament, Battle Royale, Pass the Mic, Companion, Medley, etc.

import { create } from 'zustand';
import { Song } from '@/types/game';
import type { GameMode } from '@/types/game';
import type { TournamentBracket, TournamentMatch } from '@/lib/game/tournament';
import type { GameSetupResult } from '@/components/game/unified-party-setup';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type { MedleySong } from '@/components/game/medley-contest-screen';
import type { CompetitiveGame } from '@/lib/game/competitive-words-blind';

interface PartyStore {
  // Tournament
  tournamentBracket: TournamentBracket | null;
  setTournamentBracket: (bracket: TournamentBracket | null) => void;
  tournamentSongDuration: number;
  setTournamentSongDuration: (duration: number) => void;
  currentTournamentMatch: TournamentMatch | null;
  setCurrentTournamentMatch: (match: TournamentMatch | null) => void;
  tournamentMatchAborted: boolean;
  setTournamentMatchAborted: (aborted: boolean) => void;

  // Battle Royale
  battleRoyaleGame: BattleRoyaleGame | null;
  setBattleRoyaleGame: (game: BattleRoyaleGame | null) => void;

  // Pass the Mic
  passTheMicPlayers: any[];
  setPassTheMicPlayers: (players: any[]) => void;
  passTheMicSong: Song | null;
  setPassTheMicSong: (song: Song | null) => void;
  passTheMicSegments: any[];
  setPassTheMicSegments: (segments: any[]) => void;
  passTheMicSettings: any;
  setPassTheMicSettings: (settings: any) => void;

  // Companion Sing-A-Long
  companionPlayers: any[];
  setCompanionPlayers: (players: any[]) => void;
  companionSong: Song | null;
  setCompanionSong: (song: Song | null) => void;
  companionSettings: any;
  setCompanionSettings: (settings: any) => void;

  // Medley Contest
  medleyPlayers: any[];
  setMedleyPlayers: (players: any[]) => void;
  medleySongs: MedleySong[];
  setMedleySongs: (songs: MedleySong[]) => void;
  medleySettings: any;
  setMedleySettings: (settings: any) => void;

  // Competitive Words/Blind
  competitiveGame: CompetitiveGame | null;
  setCompetitiveGame: (game: CompetitiveGame | null) => void;

  // Rate my Song
  rateMySongSettings: any;
  setRateMySongSettings: (settings: any) => void;
  rateMySongPlayerIds: string[];
  setRateMySongPlayerIds: (ids: string[]) => void;

  // Pre-selected library song (set when user picks from library for pass-the-mic/companion-singalong)
  librarySelectedSong: Song | null;
  setLibrarySelectedSong: (song: Song | null) => void;

  // Unified Party Setup
  selectedGameMode: GameMode | null;
  setSelectedGameMode: (mode: GameMode | null) => void;
  unifiedSetupResult: GameSetupResult | null;
  setUnifiedSetupResult: (result: GameSetupResult | null) => void;
  votingSongs: Song[];
  setVotingSongs: (songs: Song[]) => void;

  // Reset all party state
  resetPartyState: () => void;
}

export const usePartyStore = create<PartyStore>((set) => ({
  // Tournament
  tournamentBracket: null,
  setTournamentBracket: (tournamentBracket) => set({ tournamentBracket }),
  tournamentSongDuration: 60,
  setTournamentSongDuration: (tournamentSongDuration) => set({ tournamentSongDuration }),
  currentTournamentMatch: null,
  setCurrentTournamentMatch: (currentTournamentMatch) => set({ currentTournamentMatch }),
  tournamentMatchAborted: false,
  setTournamentMatchAborted: (tournamentMatchAborted) => set({ tournamentMatchAborted }),

  // Battle Royale
  battleRoyaleGame: null,
  setBattleRoyaleGame: (battleRoyaleGame) => set({ battleRoyaleGame }),

  // Pass the Mic
  passTheMicPlayers: [],
  setPassTheMicPlayers: (passTheMicPlayers) => set({ passTheMicPlayers }),
  passTheMicSong: null,
  setPassTheMicSong: (passTheMicSong) => set({ passTheMicSong }),
  passTheMicSegments: [],
  setPassTheMicSegments: (passTheMicSegments) => set({ passTheMicSegments }),
  passTheMicSettings: null,
  setPassTheMicSettings: (passTheMicSettings) => set({ passTheMicSettings }),

  // Companion Sing-A-Long
  companionPlayers: [],
  setCompanionPlayers: (companionPlayers) => set({ companionPlayers }),
  companionSong: null,
  setCompanionSong: (companionSong) => set({ companionSong }),
  companionSettings: null,
  setCompanionSettings: (companionSettings) => set({ companionSettings }),

  // Medley Contest
  medleyPlayers: [],
  setMedleyPlayers: (medleyPlayers) => set({ medleyPlayers }),
  medleySongs: [] as MedleySong[],
  setMedleySongs: (medleySongs) => set({ medleySongs }),
  medleySettings: null,
  setMedleySettings: (medleySettings) => set({ medleySettings }),

  // Competitive Words/Blind
  competitiveGame: null,
  setCompetitiveGame: (competitiveGame) => set({ competitiveGame }),

  // Rate my Song
  rateMySongSettings: null,
  setRateMySongSettings: (rateMySongSettings) => set({ rateMySongSettings }),
  rateMySongPlayerIds: [],
  setRateMySongPlayerIds: (rateMySongPlayerIds) => set({ rateMySongPlayerIds }),

  // Pre-selected library song
  librarySelectedSong: null,
  setLibrarySelectedSong: (librarySelectedSong) => set({ librarySelectedSong }),

  // Unified Party Setup
  selectedGameMode: null,
  setSelectedGameMode: (selectedGameMode) => set({ selectedGameMode }),
  unifiedSetupResult: null,
  setUnifiedSetupResult: (unifiedSetupResult) => set({ unifiedSetupResult }),
  votingSongs: [],
  setVotingSongs: (votingSongs) => set({ votingSongs }),

  // Reset all party state
  resetPartyState: () => set({
    tournamentBracket: null,
    tournamentSongDuration: 60,
    currentTournamentMatch: null,
    tournamentMatchAborted: false,
    battleRoyaleGame: null,
    passTheMicPlayers: [],
    passTheMicSong: null,
    passTheMicSegments: [],
    passTheMicSettings: null,
    companionPlayers: [],
    companionSong: null,
    companionSettings: null,
    medleyPlayers: [],
    medleySongs: [] as MedleySong[],
    medleySettings: null,
    competitiveGame: null,
    rateMySongSettings: null,
    rateMySongPlayerIds: [],
    librarySelectedSong: null,
    selectedGameMode: null,
    unifiedSetupResult: null,
    votingSongs: [],
  }),
}));
