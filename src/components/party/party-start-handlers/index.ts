import type { StartHandlerContext } from './types';
import { startTournament } from './start-tournament';
import { startBattleRoyale } from './start-battle-royale';
import { startMedley } from './start-medley';
import { startPassTheMic } from './start-pass-the-mic';
import { startCompanionSingalong } from './start-companion-singalong';
import { startCompetitive } from './start-competitive';
import { startRateMySong } from './start-rate-my-song';
import { startDuelDuet } from './start-duel-duet';

export { startTournament } from './start-tournament';
export { startBattleRoyale } from './start-battle-royale';
export { startMedley } from './start-medley';
export { startPassTheMic } from './start-pass-the-mic';
export { startCompanionSingalong } from './start-companion-singalong';
export { startCompetitive } from './start-competitive';
export { startRateMySong } from './start-rate-my-song';
export { startDuelDuet } from './start-duel-duet';
export type { StartHandlerContext } from './types';

/**
 * Dispatcher: routes the `onStartGame` callback to the correct handler
 * based on the selected game mode.
 */
export async function dispatchStartGame(ctx: StartHandlerContext): Promise<void> {
  const { mode, setScreen } = ctx;

  switch (mode) {
    case 'tournament':
      await startTournament(ctx);
      break;
    case 'battle-royale':
      await startBattleRoyale(ctx);
      break;
    case 'medley':
      await startMedley(ctx);
      break;
    case 'pass-the-mic':
      await startPassTheMic(ctx);
      break;
    case 'companion-singalong':
      await startCompanionSingalong(ctx);
      break;
    case 'missing-words':
    case 'blind':
      await startCompetitive(ctx);
      break;
    case 'rate-my-song':
      await startRateMySong(ctx);
      break;
    case 'duel':
    case 'duet':
      await startDuelDuet(ctx);
      break;
    default:
      // Other modes: go to library for song selection
      setScreen('library');
  }
}
