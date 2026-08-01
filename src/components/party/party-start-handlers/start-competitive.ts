import type { StartHandlerContext } from './types';
import { createCompetitiveGame, type CompetitiveModeType, type CompetitiveSettings } from '@/lib/game/competitive-words-blind';
import type { Screen } from '@/types/screens';
import type { GameModeSettingsMap } from '@/components/game/unified-party-setup.types';

export async function startCompetitive(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, mode } = ctx;
  const s = result.settings as GameModeSettingsMap['missing-words'] & GameModeSettingsMap['blind'];
  const modeType = mode as CompetitiveModeType;
  const freqSetting = s.missingWordFrequency || s.blindFrequency || 'normal';
  const mwFreqMap: Record<string, number> = { light: 0.15, easy: 0.15, normal: 0.30, hard: 0.60, insane: 0.90 };
  const blindFreqMap: Record<string, number> = { light: 0.15, normal: 0.30, hard: 0.60, insane: 0.90 };
  const compSettings: CompetitiveSettings = {
    difficulty: result.difficulty,
    modeType,
    playMode: 'competitive',
    bestOf: ([1, 3, 5, 7].includes(s.bestOf as number) ? s.bestOf : 3) as 1 | 3 | 5 | 7,
    missingWordFrequency: modeType === 'missing-words'
      ? (mwFreqMap[freqSetting] ?? 0.30)
      : 0.30,
    blindFrequency: modeType === 'blind'
      ? (blindFreqMap[freqSetting] ?? 0.30)
      : 0.30,
    hardcore: !!(s.hardcore),
    hardcoreMissingWords: !!(s.hardcoreMissingWords),
    missingWordsGranularity: (s.granularity as 'word' | 'passage' | 'both') || 'passage',
    escalating: !!(s.escalating),
    songSelection: 'smart',
  };
  const compGame = createCompetitiveGame(
    result.players.map(p => p.id),
    result.players.map(p => p.name),
    result.players.map(p => p.avatar),
    compSettings,
  );
  party.setCompetitiveGame(compGame);
  const modeScreen = modeType === 'missing-words' ? 'missing-words-game' : 'blind-game';
  setScreen(modeScreen as Screen);
}
