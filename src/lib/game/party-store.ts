// Party Game State Store — extracted from page.tsx global state
// Manages state for Tournament, Battle Royale, Pass the Mic, Companion, Medley, etc.

import { create } from 'zustand';
import { Song } from '@/types/game';
import type { GameMode } from '@/types/game';
import type { TournamentBracket, TournamentMatch } from '@/lib/game/tournament';
import type { GameSetupResult } from '@/components/game/unified-party-setup';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type {
  MedleySong,
  MedleyPlayer,
  MedleySettings,
  SnippetMatchup,
  MedleyRoundResult,
} from '@/components/game/medley/medley-types';
import type { CompetitiveGame } from '@/lib/game/competitive-words-blind';
import type { CompanionRoundResult } from '@/components/game/companion-singalong-screen';

/** Per-player result for a single Pass-the-Mic round (song). */
export interface PassTheMicRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  /** Per-player scores keyed by player id. */
  playerScores: Record<string, { score: number; notesHit: number; notesMissed: number; maxCombo: number }>;
}

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
  // Series history: accumulated scores across multiple Pass-the-Mic songs
  passTheMicSeriesHistory: PassTheMicRoundResult[];
  setPassTheMicSeriesHistory: (history: PassTheMicRoundResult[]) => void;

  // Companion Sing-A-Long
  companionPlayers: any[];
  setCompanionPlayers: (players: any[]) => void;
  companionSong: Song | null;
  setCompanionSong: (song: Song | null) => void;
  companionSettings: any;
  setCompanionSettings: (settings: any) => void;
  // Series history: accumulated scores across multiple Companion Sing-A-Long songs
  companionSeriesHistory: CompanionRoundResult[];
  setCompanionSeriesHistory: (history: CompanionRoundResult[]) => void;

  // Medley Contest
  medleyPlayers: MedleyPlayer[];
  setMedleyPlayers: (players: MedleyPlayer[]) => void;
  medleySongs: MedleySong[];
  setMedleySongs: (songs: MedleySong[]) => void;
  medleySettings: MedleySettings | null;
  setMedleySettings: (settings: MedleySettings | null) => void;
  medleyMatches: SnippetMatchup[];
  setMedleyMatches: (matches: SnippetMatchup[]) => void;
  medleySeriesHistory: MedleyRoundResult[];
  setMedleySeriesHistory: (history: MedleyRoundResult[]) => void;

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

  // Pause / Leave dialog management (shared between page.tsx and party components)
  pauseDialogAction: null | 'song-pause' | 'party-leave';
  setPauseDialogAction: (action: null | 'song-pause' | 'party-leave') => void;

  // Flag set by party mode components to indicate a song is currently playing
  // (used by page.tsx to decide which dialog to show on Escape)
  isSongPlaying: boolean;
  setIsSongPlaying: (v: boolean) => void;

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
  passTheMicSeriesHistory: [] as PassTheMicRoundResult[],
  setPassTheMicSeriesHistory: (passTheMicSeriesHistory) => set({ passTheMicSeriesHistory }),

  // Companion Sing-A-Long
  companionPlayers: [],
  setCompanionPlayers: (companionPlayers) => set({ companionPlayers }),
  companionSong: null,
  setCompanionSong: (companionSong) => set({ companionSong }),
  companionSettings: null,
  setCompanionSettings: (companionSettings) => set({ companionSettings }),
  companionSeriesHistory: [] as CompanionRoundResult[],
  setCompanionSeriesHistory: (companionSeriesHistory) => set({ companionSeriesHistory }),

  // Medley Contest
  medleyPlayers: [] as MedleyPlayer[],
  setMedleyPlayers: (medleyPlayers) => set({ medleyPlayers }),
  medleySongs: [] as MedleySong[],
  setMedleySongs: (medleySongs) => set({ medleySongs }),
  medleySettings: null as MedleySettings | null,
  setMedleySettings: (medleySettings) => set({ medleySettings }),
  medleyMatches: [] as SnippetMatchup[],
  setMedleyMatches: (medleyMatches) => set({ medleyMatches }),
  medleySeriesHistory: [] as MedleyRoundResult[],
  setMedleySeriesHistory: (medleySeriesHistory) => set({ medleySeriesHistory }),

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

  // Pause / Leave dialog
  pauseDialogAction: null as null | 'song-pause' | 'party-leave',
  setPauseDialogAction: (pauseDialogAction) => set({ pauseDialogAction }),
  isSongPlaying: false,
  setIsSongPlaying: (isSongPlaying) => set({ isSongPlaying }),

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
    passTheMicSeriesHistory: [] as PassTheMicRoundResult[],
    companionPlayers: [],
    companionSong: null,
    companionSettings: null,
    companionSeriesHistory: [] as CompanionRoundResult[],
    medleyPlayers: [] as MedleyPlayer[],
    medleySongs: [] as MedleySong[],
    medleySettings: null as MedleySettings | null,
    medleyMatches: [] as SnippetMatchup[],
    medleySeriesHistory: [] as MedleyRoundResult[],
    competitiveGame: null,
    rateMySongSettings: null,
    rateMySongPlayerIds: [],
    librarySelectedSong: null,
    selectedGameMode: null,
    unifiedSetupResult: null,
    votingSongs: [],
    pauseDialogAction: null,
    isSongPlaying: false,
  }),
}));
