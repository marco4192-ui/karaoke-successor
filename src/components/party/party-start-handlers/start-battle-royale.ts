import type { StartHandlerContext } from './types';
import { createBattleRoyale, MAX_LOCAL_MIC_PLAYERS, type BattleRoyaleSettings } from '@/lib/game/battle-royale';

export async function startBattleRoyale(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, toast, t, filteredSongs } = ctx;
  const s = result.settings as {
    roundDuration?: number; finalRoundDuration?: number; medleyMode?: boolean;
    songSelection?: string; noRepeatProtection?: boolean; grandFinaleBestOf?: 1 | 3 | 5;
    bountyEnabled?: boolean; bountyMultiplier?: number; escalatingDifficulty?: boolean;
    shrinkingTimer?: boolean; shrinkFactor?: number; minRoundDuration?: number;
    showNoteHighway?: boolean;
    showVideoBackground?: boolean; countdownDuration?: number;
  };
  // Battle Royale allows up to 4 simultaneous local microphone players
  // (MAX_LOCAL_MIC_PLAYERS) plus companion players.
  // Item 8.2 FIX: count MICROPHONE players separately — the old index-based
  // check (`i < MIC_LIMIT`) let any companion player at a lower index consume
  // a mic slot, so e.g. [companion, mic1, mic2, mic3, mic4] silently converted
  // the 4th mic into a Companion App ("only 3 mics accepted"). Mic players now
  // keep their mic up to the limit; only genuinely excess mic players
  // (more players than mic slots) fall back to 'companion'.
  let micSlotUsed = 0;
  const mappedPlayers = result.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    // Preserve the exclusive device assignment from the unified setup:
    // each mic player keeps THEIR configured microphone (4 mics at once work).
    microphoneId: p.micId,
    stereoChannel: p.stereoChannel,
    playerType: p.playerType === 'companion'
      ? 'companion' as const
      : (micSlotUsed++ < MAX_LOCAL_MIC_PLAYERS ? 'microphone' as const : 'companion' as const),
  }));

  const brSettings: BattleRoyaleSettings = {
    roundDuration: s.roundDuration ?? 60,
    finalRoundDuration: s.finalRoundDuration ?? 120,
    randomSongs: true,
    medleyMode: s.medleyMode ?? false,
    medleySnippets: 3,
    difficulty: result.difficulty,
    eliminationAnimation: true,
    songSelection: (s.songSelection as 'random' | 'vote') ?? 'random',
    noRepeatProtection: s.noRepeatProtection ?? true,
    noRepeatCount: 10,
    grandFinaleBestOf: (s.grandFinaleBestOf as 1 | 3 | 5) ?? 1,
    bountyEnabled: s.bountyEnabled ?? true,
    bountyMultiplier: s.bountyMultiplier ?? 1.5,
    escalatingDifficulty: s.escalatingDifficulty ?? false,
    shrinkingTimer: s.shrinkingTimer ?? false,
    shrinkFactor: s.shrinkFactor ?? 5,
    minRoundDuration: s.minRoundDuration ?? 30,
    showNoteHighway: s.showNoteHighway ?? true,
    showVideoBackground: s.showVideoBackground ?? true,
    countdownDuration: s.countdownDuration ?? 5,
    // Host-voted song from the unified party setup (setup-level "Vote"):
    // round 1 uses exactly this song.
    ...(result.selectedSong ? { firstRoundSongId: result.selectedSong.id, firstRoundSongTitle: result.selectedSong.title } : {}),
  };
  try {
    const game = createBattleRoyale(mappedPlayers, brSettings, filteredSongs.map(s => s.id));
    party.setBattleRoyaleGame(game);
    setScreen('battle-royale-game');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PartySetup] Failed to create battle royale:', err);
    toast({ title: t('partySetup.battleRoyaleStartError').replace('{error}', err instanceof Error ? err.message : String(err)) });
  }
}