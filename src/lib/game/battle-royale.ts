// Battle Royale Mode – barrel export
// Core game creation, scoring, round management, voting, medley, bounty
// Re-exports from sub-modules for types, stats, elimination, and hall-of-fame

// ==================== RE-EXPORTS ====================

// Types & constants
export type {
  PlayerType,
  BattleRoyalePlayer,
  MedleySnippet,
  SongVoteOption,
  BattleRoyaleRound,
  RoundHighlight,
  BattleRoyaleGameStats,
  HallOfFameEntry,
  BattleRoyaleStatus,
  BattleRoyaleGame,
  BattleRoyaleSettings,
  TieBreakState,
} from './battle-royale-types';
export {
  MAX_LOCAL_MIC_PLAYERS,
  MAX_COMPANION_PLAYERS,
  MAX_BATTLE_ROYALE_PLAYERS,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
  TIE_BREAK_EXTENSION_SECONDS,
} from './battle-royale-types';

// Hall of Fame
export { getHallOfFame } from './battle-royale-hall-of-fame';

// Stats & queries & spectator
export {
  getActivePlayers,
  getPlayersByScore,
  submitPrediction,
  getSpectators,
  getEliminationOrder,
  updateGameStats,
  getBattleRoyaleStats,
} from './battle-royale-stats';

// Elimination & round transitions & grand finale
export {
  endRoundAndEliminate,
  endRoundWithoutElimination,
  eliminateWeakestMidRound,
  enterGrandFinale,
  advanceToNextRound,
  detectRoundEndTie,
  resolveTieBreakElimination,
} from './battle-royale-elimination';
export type { EliminationTieSignal } from './battle-royale-elimination';

// ==================== LOCAL IMPORTS ====================

import type {
  BattleRoyaleGame,
  BattleRoyaleRound,
  BattleRoyaleSettings,
  PlayerType,
  SongVoteOption,
  MedleySnippet,
} from './battle-royale-types';
import {
  MIN_BATTLE_ROYALE_PLAYERS,
  MAX_LOCAL_MIC_PLAYERS,
  MAX_COMPANION_PLAYERS,
  MAX_BATTLE_ROYALE_PLAYERS,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
  DIFFICULTY_ORDER,
  ESCALATION_INTERVAL,
  TIE_BREAK_EXTENSION_SECONDS,
} from './battle-royale-types';
import { Difficulty } from '@/types/game';
import { shuffleArray, generateCode, FULL_CODE_CHARS } from '@/lib/utils';
import { getActivePlayers } from './battle-royale-stats';

// ==================== UTILITY ====================

function generateConnectionCode(): string {
  return generateCode(6, FULL_CODE_CHARS);
}

// ==================== GAME CREATION ====================

export function createBattleRoyale(
  players: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    playerType: PlayerType;
    microphoneId?: string;
    stereoChannel?: number;
    connectionCode?: string;
  }>,
  settings: BattleRoyaleSettings = DEFAULT_BATTLE_ROYALE_SETTINGS,
  availableSongIds: string[] = []
): BattleRoyaleGame {
  // Merge with defaults so new fields are always present
  const mergedSettings: BattleRoyaleSettings = {
    ...DEFAULT_BATTLE_ROYALE_SETTINGS,
    ...settings,
  };

  const micPlayers = players.filter(p => p.playerType === 'microphone');
  const companionPlayers = players.filter(p => p.playerType === 'companion');

  if (players.length < MIN_BATTLE_ROYALE_PLAYERS) {
    throw new Error(`Battle Royale requires at least ${MIN_BATTLE_ROYALE_PLAYERS} players`);
  }
  if (players.length > MAX_BATTLE_ROYALE_PLAYERS) {
    throw new Error(`Battle Royale supports maximum ${MAX_BATTLE_ROYALE_PLAYERS} players`);
  }
  if (micPlayers.length > MAX_LOCAL_MIC_PLAYERS) {
    throw new Error(`Maximum ${MAX_LOCAL_MIC_PLAYERS} local microphone players allowed`);
  }
  if (companionPlayers.length > MAX_COMPANION_PLAYERS) {
    throw new Error(`Maximum ${MAX_COMPANION_PLAYERS} companion players allowed`);
  }

  const battleRoyalePlayers = players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    seed: 1,
    eliminated: false,
    lossCount: 0,
    score: 0,
    accuracy: 0,
    totalEvaluatedTicks: 0,
    notesHit: 0,
    notesMissed: 0,
    currentCombo: 0,
    maxCombo: 0,
    eliminationRound: null,
    playerType: p.playerType,
    microphoneId: p.microphoneId,
    stereoChannel: p.stereoChannel,
    connectionCode: p.connectionCode,
    lastPing: p.playerType === 'companion' ? Date.now() : undefined,
  }));

  const songQueue = mergedSettings.randomSongs
    ? shuffleArray([...availableSongIds])
    : [...availableSongIds];

  const emptyStats = {
    highestCombo: 0,
    highestComboPlayerId: null,
    longestSurvival: 0,
    longestSurvivalPlayerId: null,
    bestSingleRoundDelta: 0,
    bestSingleRoundDeltaPlayerId: null,
    bestSingleRoundDeltaRound: 0,
    totalNotesHit: 0,
    totalNotesMissed: 0,
    roundHighlights: [],
  };

  return {
    id: `battleroyale_${Date.now()}`,
    players: battleRoyalePlayers,
    rounds: [],
    currentRound: 0,
    status: 'setup',
    winner: null,
    settings: mergedSettings,
    createdAt: Date.now(),
    songQueue,
    connectionCode: generateConnectionCode(),
    connectedCompanions: companionPlayers.length,

    // #3 No-repeat
    recentlyPlayedSongIds: [],

    // Delta bookkeeping (R19: per-round scores)
    previousRoundScores: {},

    // R19 tie-break showdown
    tieBreak: null,

    // #4 Grand Finale
    isGrandFinale: false,
    finalWins: {},
    grandFinaleIntroShown: false,

    // #7 Dynamic difficulty
    effectiveDifficulty: mergedSettings.difficulty,

    // #1 Medley
    medleySnippetList: [],
    currentSnippetIndex: 0,

    // #2 Song voting
    voteOptions: [],

    // #11 Spectator
    spectatorPredictions: {},
    correctPredictions: {},

    // #12 Stats
    gameStats: emptyStats,
  };
}

// ==================== ROUND DURATION & DIFFICULTY ====================

/**
 * Effective round duration in seconds for the GIVEN round — the single
 * source of truth for every duration-derived behavior (round timer, medley
 * snippet budget, mid-round elimination rhythm). All values come from the
 * Battle Royale settings — there are NO hardcoded intervals:
 *  • grand finale / last duel (2 players) → settings.finalRoundDuration
 *  • otherwise → settings.roundDuration, reduced by the shrinking-timer
 *    setting (never below settings.minRoundDuration)
 */
export function getEffectiveRoundDuration(
  settings: BattleRoyaleSettings,
  roundNumber: number,
  activePlayerCount: number,
  isGrandFinale: boolean
): number {
  // Grand finale always uses final round duration
  if (isGrandFinale || activePlayerCount === 2) {
    return settings.finalRoundDuration;
  }

  let duration = settings.roundDuration;

  // #8 Shrinking timer: reduce by shrinkFactor per round
  if (settings.shrinkingTimer && settings.shrinkFactor > 0) {
    const reduction = (roundNumber - 1) * settings.shrinkFactor;
    duration = Math.max(duration - reduction, settings.minRoundDuration);
  }

  return duration;
}

/** Calculate effective difficulty considering escalating setting */
function getEffectiveDifficulty(
  settings: BattleRoyaleSettings,
  roundNumber: number
): Difficulty {
  if (!settings.escalatingDifficulty) {
    return settings.difficulty;
  }

  const baseIndex = DIFFICULTY_ORDER.indexOf(settings.difficulty);
  const levelsToAdvance = Math.floor((roundNumber - 1) / ESCALATION_INTERVAL);
  const newIndex = Math.min(baseIndex + levelsToAdvance, DIFFICULTY_ORDER.length - 1);
  return DIFFICULTY_ORDER[newIndex];
}

// ==================== BOUNTY → removed (R19) ====================
// The bounty system was REMOVED by user decision (R19): with per-round
// score resets there is no accumulated deficit a booster could fairly
// compensate — see bounty-fairness-analysis (R17) for why the flat ×1.5
// booster eliminated the best singer.

// ==================== TIE-BREAK SHOWDOWN (R19) ====================

/** Detect a tie at the LOWEST score among active players (the players who
 *  would be threatened by the next elimination). Returns the tied player
 *  ids (≥ 2) or null. With per-round scores this includes the all-zero
 *  case (e.g. instrumental intro) — the user's showdown rule applies
 *  uniformly: 10s extension, then coin flip. */
export function findEliminationTie(game: BattleRoyaleGame): string[] | null {
  const activePlayers = getActivePlayers(game);
  if (activePlayers.length < 2) return null;
  const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
  const lowest = sorted[0].score;
  const tied = sorted.filter(p => p.score === lowest);
  return tied.length >= 2 ? tied.map(p => p.id) : null;
}

/** Start a tie-break showdown: the tied players get a fixed 10-second
 *  extension to break the tie by singing (coin flip afterwards if still
 *  tied). Pure state change — the song keeps playing. */
export function startTieBreak(
  game: BattleRoyaleGame,
  tiedPlayerIds: string[],
  seconds: number = TIE_BREAK_EXTENSION_SECONDS,
): BattleRoyaleGame {
  return {
    ...game,
    tieBreak: {
      until: Date.now() + seconds * 1000,
      playerIds: tiedPlayerIds,
    },
  };
}

// ==================== SONG SELECTION HELPERS ====================

/** Add a song ID to the recent plays list */
export function addToRecentPlays(game: BattleRoyaleGame, songId: string): string[] {
  if (!game.settings.noRepeatProtection) return game.recentlyPlayedSongIds;
  const updated = [...game.recentlyPlayedSongIds, songId];
  // Keep only the last noRepeatCount entries
  return updated.slice(-game.settings.noRepeatCount);
}

// ==================== SONG VOTING (#2) ====================

/** Enter voting phase with 3 song options */
export function startVotingPhase(
  game: BattleRoyaleGame,
  options: Array<{ songId: string; songName: string }>
): BattleRoyaleGame {
  if (game.settings.songSelection !== 'vote') return game;

  const voteOptions: SongVoteOption[] = options.map(opt => ({
    songId: opt.songId,
    songName: opt.songName,
    votes: 0,
    votedPlayerIds: [],
  }));

  return {
    ...game,
    status: 'voting',
    voteOptions,
  };
}

/** Submit a vote from a player */
export function submitVote(
  game: BattleRoyaleGame,
  playerId: string,
  songIndex: number
): BattleRoyaleGame {
  if (game.status !== 'voting') return game;
  if (songIndex < 0 || songIndex >= game.voteOptions.length) return game;

  // Check if player already voted
  for (const opt of game.voteOptions) {
    if (opt.votedPlayerIds.includes(playerId)) return game;
  }

  const updatedOptions = game.voteOptions.map((opt, i) => {
    if (i === songIndex) {
      return {
        ...opt,
        votes: opt.votes + 1,
        votedPlayerIds: [...opt.votedPlayerIds, playerId],
      };
    }
    return opt;
  });

  return { ...game, voteOptions: updatedOptions };
}

/** Resolve vote: select the song with the most votes, random tiebreaker */
export function resolveVote(game: BattleRoyaleGame): { game: BattleRoyaleGame; songId: string; songName: string } | null {
  if (game.status !== 'voting' || game.voteOptions.length === 0) return null;

  const maxVotes = Math.max(...game.voteOptions.map(o => o.votes));
  const topOptions = game.voteOptions.filter(o => o.votes === maxVotes);
  const winner = topOptions[Math.floor(Math.random() * topOptions.length)];

  return {
    game: { ...game, status: 'setup', voteOptions: [] },
    songId: winner.songId,
    songName: winner.songName,
  };
}

// ==================== MEDLEY MODE (#1) ====================

/** Get the current medley snippet (if in medley mode) */
export function getCurrentMedleySnippet(game: BattleRoyaleGame): MedleySnippet | null {
  if (game.medleySnippetList.length === 0) return null;
  return game.medleySnippetList[game.currentSnippetIndex] ?? null;
}

/** Advance to the next medley snippet */
export function advanceToNextSnippet(game: BattleRoyaleGame): BattleRoyaleGame {
  if (game.medleySnippetList.length === 0) return game;

  const nextIndex = game.currentSnippetIndex + 1;
  if (nextIndex >= game.medleySnippetList.length) return game;

  return {
    ...game,
    currentSnippetIndex: nextIndex,
  };
}

/** Calculate snippet duration from total round duration and number of snippets */
export function calculateSnippetDuration(totalDuration: number, snippetCount: number): number {
  if (snippetCount <= 0) return totalDuration;
  return Math.floor(totalDuration / snippetCount);
}

// ==================== ROUND MANAGEMENT ====================

/** Fixed length of one medley snippet in seconds (user rule 6.3). */
const MEDLEY_SNIPPET_SECONDS = 30;

export function startRound(
  game: BattleRoyaleGame,
  songId: string,
  songName: string,
  medleySnippets?: Array<{ songId: string; songName: string }>,
  /** Full song length in seconds — random/vote rounds play the COMPLETE
   *  song (user rule 6.3), so the round timer must follow the song, not the
   *  configured roundDuration. */
  songDurationSec?: number
): BattleRoyaleGame {
  if (game.status !== 'setup') return game;

  const activePlayers = getActivePlayers(game);
  if (activePlayers.length < 2) return game;

  const isFinalRound = activePlayers.length === 2 && !game.isGrandFinale;
  const isGrandFinaleRound = game.isGrandFinale;

  // Calculate effective difficulty (#7)
  const effectiveDifficulty = getEffectiveDifficulty(game.settings, game.currentRound + 1);

  // Calculate effective base duration (#8) — for medley rounds this is the
  // ROUND BUDGET the snippet count is derived from.
  const baseDuration = getEffectiveRoundDuration(
    game.settings,
    game.currentRound + 1,
    activePlayers.length,
    isGrandFinaleRound
  );

  // Determine round type
  // Note: 'short' and 'full' round types currently have no behavioral difference in game logic;
  // they exist for potential future UI/display customization.
  const isMedleyRound = game.settings.medleyMode && !!medleySnippets && medleySnippets.length > 1;
  let roundType: BattleRoyaleRound['roundType'] = 'short';
  if (isGrandFinaleRound) {
    roundType = 'grand-finale';
  } else if (isMedleyRound) {
    roundType = 'medley';
  } else {
    // random / vote rounds play the FULL song (user rule 6.3)
    roundType = 'full';
  }

  // Round duration — every branch derives from the SETTINGS (no hardcoded
  // intervals, user request 2.2-R2):
  //  • medley → 30s snippets, count derived from the base budget
  //    (roundDuration; 60s ⇒ 2 snippets, 90s ⇒ 3, … capped at 6). Finale
  //    medley rounds use finalRoundDuration as their budget.
  //  • random/vote FINAL rounds (grand finale, or the last duel with 2
  //    players) → settings.finalRoundDuration caps the round — the finale
  //    length is configured, NOT the full song (user request 2.2-R2).
  //    A shorter song still ends earlier via its own 'ended' event.
  //  • random/vote normal rounds → the song's own length (+5s tail buffer
  //    so the audio 'ended' event never races the round timer); the
  //    ELIMINATION rhythm inside these rounds is the configured interval
  //    (see getEffectiveRoundDuration / the mid-round elimination ticker).
  //  • fallback (no duration known) → the configured base duration
  let duration: number;
  const snippetList: MedleySnippet[] = [];
  const currentSnippetIndex = 0;
  if (isMedleyRound && medleySnippets) {
    // Medley selection plays snippets in EVERY round — including grand
    // finale rounds (which keep their 'grand-finale' roundType for the UI).
    const snippetCount = Math.max(2, Math.min(6, Math.floor(baseDuration / MEDLEY_SNIPPET_SECONDS)));
    for (const snippet of medleySnippets.slice(0, snippetCount)) {
      snippetList.push({
        songId: snippet.songId,
        songName: snippet.songName,
        duration: MEDLEY_SNIPPET_SECONDS,
      });
    }
    // Duration follows the snippets ACTUALLY used (pool may be smaller than
    // the planned count) — never a longer round than there are snippets for.
    duration = Math.max(1, snippetList.length) * MEDLEY_SNIPPET_SECONDS;
  } else if (isGrandFinaleRound || isFinalRound) {
    // 2.2-R2: the finale length comes from the settings (finalRoundDuration),
    // not the full song. The round timer caps the duel; a song that ends
    // earlier closes the round via its 'ended' event.
    duration = baseDuration;
  } else if (songDurationSec && songDurationSec > 0) {
    // +5s tail buffer: the audio 'ended' event never races the round timer,
    // and PlayingView's 3s fade-out only starts AFTER the song is over
    // (never dampening the song's own final second).
    duration = Math.ceil(songDurationSec) + 5;
  } else {
    duration = baseDuration;
  }

  // R19 (user decision): EVERY round is a fresh start — scores of all
  // active players reset to 0 at round start ("Reset nach dem Song"). A
  // round/song is one coherent performance; nobody dies from an accumulated
  // deficit. Career-wide notesHit/notesMissed/maxCombo stay for the stats.
  // NOTE: an ACTIVE tie-break showdown survives a round change on purpose
  // (the rhythm path force-resolves it with the scores of the song where
  // the tie happened — before this reset runs for the next round).
  const resetScores = true;
  const updatedPlayers = game.players.map(p => {
    if (!p.eliminated) {
      return {
        ...p,
        currentCombo: 0,
        accuracy: 0,
        totalEvaluatedTicks: 0,
        ...(resetScores ? { score: 0 } : {}),
      };
    }
    return p;
  });

  // Snapshot current scores for the round-delta bookkeeping (R19: this is
  // 0 for every active player after the reset — deltas = round points).
  // Eliminated players keep their frozen score → their delta stays 0 in
  // all following rounds.
  const previousRoundScores: Record<string, number> = {};
  for (const player of updatedPlayers) {
    previousRoundScores[player.id] = player.score;
  }

  // Track the played song for no-repeat protection (#3)
  const updatedRecentSongs = addToRecentPlays(game, songId);

  const round: BattleRoyaleRound = {
    roundNumber: game.currentRound + 1,
    songId,
    songName,
    duration,
    startTime: Date.now(),
    endTime: null,
    eliminatedPlayerId: null,
    roundType,
    effectiveDifficulty,
    roundScoreDeltas: {},
  };

  return {
    ...game,
    players: updatedPlayers,
    rounds: [...game.rounds, round],
    currentRound: game.currentRound + 1,
    // DO-NOT-CHANGE (amended, user rule 6.4): Round 1 still starts in
    // 'countdown' — the countdown gives the media loading hook time to
    // buffer audio/video before play() is called at game start. Every
    // FOLLOWING round starts DIRECTLY in 'playing': eliminations must not
    // interrupt the game (no blackscreen, no new countdown). The media hook
    // gates playback on mediaLoaded, so the next song starts as soon as it
    // is buffered; the eliminated player's card shows the blinking-X →
    // grayed-out treatment in the meantime.
    status: game.rounds.length >= 1 ? 'playing' : 'countdown',
    effectiveDifficulty,

    // #3 No-repeat
    recentlyPlayedSongIds: updatedRecentSongs,

    // R19 delta bookkeeping
    previousRoundScores,

    // #1 Medley
    medleySnippetList: snippetList,
    currentSnippetIndex,
  };
}

// ==================== SCORING ====================

export function updatePlayerScore(
  game: BattleRoyaleGame,
  playerId: string,
  scoreDelta: number,
  tickAccuracy: number,
  notesHitDelta: number = 0,
  notesMissedDelta: number = 0,
  comboDelta: number = 0
): BattleRoyaleGame {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || game.players[playerIndex].eliminated) {
    return game;
  }

  const player = game.players[playerIndex];
  const newTickCount = player.totalEvaluatedTicks + 1;
  const newAccuracy = player.totalEvaluatedTicks === 0
    ? tickAccuracy
    : player.accuracy + (tickAccuracy - player.accuracy) / newTickCount;

  const updatedPlayer = {
    ...player,
    score: player.score + scoreDelta,
    accuracy: newAccuracy,
    totalEvaluatedTicks: newTickCount,
    notesHit: player.notesHit + notesHitDelta,
    notesMissed: player.notesMissed + notesMissedDelta,
    currentCombo: player.currentCombo + comboDelta,
    maxCombo: Math.max(player.maxCombo, player.currentCombo + comboDelta),
  };

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = updatedPlayer;

  return {
    ...game,
    players: updatedPlayers,
  };
}
