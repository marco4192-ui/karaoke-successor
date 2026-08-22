import type { StartHandlerContext } from './types';
import { createBattleRoyale, type BattleRoyaleSettings } from '@/lib/game/battle-royale';

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
  // Battle Royale allows max 4 microphone players + 20 companion players.
  // The unified setup marks all players as 'microphone', so we need to
  // auto-convert excess players (>4) to 'companion' type.
  const MIC_LIMIT = 4;
  const mappedPlayers = result.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    playerType: p.playerType === 'companion' ? 'companion' as const : (i < MIC_LIMIT ? 'microphone' as const : 'companion' as const),
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
    countdownDuration: s.countdownDuration ?? 3,
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