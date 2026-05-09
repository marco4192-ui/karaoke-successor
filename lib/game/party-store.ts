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
import type { PassTheMicPlayer, PassTheMicSegment } from '@/components/game/ptm-game-screen';
import type { PassTheMicSettings } from '@/components/game/ptm-game-screen';
import type { CompanionPlayer, CompanionRoundResult } from '@/components/game/companion-singalong-screen';
import type { CompanionSingAlongSettings } from '@/components/game/companion-singalong-screen';
import type { RateMySongSettings } from '@/components/game/rate-my-song-screen';

/** Per-player result for a single Pass-the-Mic round (song). */
export interface PassTheMicRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  /** Per-player scores keyed by player id. */
  playerScores: Record<string, { score: number; notesHit: number; notesMissed: number; maxCombo: number }>;
}

export interface PartyStore {
  // Tournament
  tournamentBracket: TournamentBracket | null;
  setTournamentBracket: (_bracket: TournamentBracket | null) => void;
  tournamentSongDuration: number;
  setTournamentSongDuration: (_duration: number) => void;
  currentTournamentMatch: TournamentMatch | null;
  setCurrentTournamentMatch: (_match: TournamentMatch | null) => void;
  tournamentMatchAborted: boolean;
  setTournamentMatchAborted: (_aborted: boolean) => void;

  // Battle Royale
  battleRoyaleGame: BattleRoyaleGame | null;
  setBattleRoyaleGame: (_game: BattleRoyaleGame | null) => void;

  // Pass the Mic
  passTheMicPlayers: PassTheMicPlayer[];
  setPassTheMicPlayers: (_players: PassTheMicPlayer[]) => void;
  passTheMicSong: Song | null;
  setPassTheMicSong: (_song: Song | null) => void;
  passTheMicSegments: PassTheMicSegment[];
  setPassTheMicSegments: (_segments: PassTheMicSegment[]) => void;
  passTheMicSettings: PassTheMicSettings | null;
  setPassTheMicSettings: (_settings: PassTheMicSettings | null) => void;
  // Series history: accumulated scores across multiple Pass-the-Mic songs
  passTheMicSeriesHistory: PassTheMicRoundResult[];
  setPassTheMicSeriesHistory: (_history: PassTheMicRoundResult[]) => void;
  // PTM Medley snippets (multiple songs for medley mode)
  ptmMedleySnippets: Array<{ song: Song; startTime: number; endTime: number; duration: number }>;
  setPtmMedleySnippets: (_snippets: Array<{ song: Song; startTime: number; endTime: number; duration: number }>) => void;

  // Companion Sing-A-Long
  companionPlayers: CompanionPlayer[];
  setCompanionPlayers: (_players: CompanionPlayer[]) => void;
  companionSong: Song | null;
  setCompanionSong: (_song: Song | null) => void;
  companionSettings: CompanionSingAlongSettings | null;
  setCompanionSettings: (_settings: CompanionSingAlongSettings | null) => void;
  // Series history: accumulated scores across multiple Companion Sing-A-Long songs
  companionSeriesHistory: CompanionRoundResult[];
  setCompanionSeriesHistory: (_history: CompanionRoundResult[]) => void;

  // Medley Contest
  medleyPlayers: MedleyPlayer[];
  setMedleyPlayers: (_players: MedleyPlayer[]) => void;
  medleySongs: MedleySong[];
  setMedleySongs: (_songs: MedleySong[]) => void;
  medleySettings: MedleySettings | null;
  setMedleySettings: (_settings: MedleySettings | null) => void;
  medleyMatches: SnippetMatchup[];
  setMedleyMatches: (_matches: SnippetMatchup[]) => void;
  medleySeriesHistory: MedleyRoundResult[];
  setMedleySeriesHistory: (_history: MedleyRoundResult[]) => void;

  // Competitive Words/Blind
  competitiveGame: CompetitiveGame | null;
  setCompetitiveGame: (_game: CompetitiveGame | null) => void;

  // Rate my Song
  rateMySongSettings: RateMySongSettings | null;
  setRateMySongSettings: (_settings: RateMySongSettings | null) => void;
  rateMySongPlayerIds: string[];
  setRateMySongPlayerIds: (_ids: string[]) => void;

  // PTM song selection mode (how the user originally chose their song: 'random' | 'vote' | 'medley' | 'library')
  // Used to determine what happens when the user clicks "next song" after a round.
  ptmSongSelection: string | null;
  setPtmSongSelection: (_mode: string | null) => void;

  // Pre-selected library song (set when user picks from library for pass-the-mic/companion-singalong)
  librarySelectedSong: Song | null;
  setLibrarySelectedSong: (_song: Song | null) => void;

  // Unified Party Setup
  selectedGameMode: GameMode | null;
  setSelectedGameMode: (_mode: GameMode | null) => void;
  unifiedSetupResult: GameSetupResult | null;
  setUnifiedSetupResult: (_result: GameSetupResult | null) => void;
  votingSongs: Song[];
  setVotingSongs: (_songs: Song[]) => void;

  // Pause / Leave dialog management (shared between page.tsx and party components)
  pauseDialogAction: null | 'song-pause' | 'party-leave';
  setPauseDialogAction: (_action: null | 'song-pause' | 'party-leave') => void;

  // Flag set by party mode components to indicate a song is currently playing
  // (used by page.tsx to decide which dialog to show on Escape)
  isSongPlaying: boolean;
  setIsSongPlaying: (_v: boolean) => void;

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
  ptmMedleySnippets: [] as Array<{ song: Song; startTime: number; endTime: number; duration: number }>,
  setPtmMedleySnippets: (ptmMedleySnippets) => set({ ptmMedleySnippets }),

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

  // PTM song selection mode
  ptmSongSelection: null,
  setPtmSongSelection: (ptmSongSelection) => set({ ptmSongSelection }),

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
    ptmMedleySnippets: [],
    ptmSongSelection: null,
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
