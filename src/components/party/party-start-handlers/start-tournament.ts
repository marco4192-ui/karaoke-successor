import type { StartHandlerContext } from './types';
import { createTournament, type TournamentPlayer, type TournamentSettings } from '@/lib/game/tournament';

export async function startTournament(ctx: StartHandlerContext): Promise<void> {
  const { result, party, setScreen, toast, t } = ctx;
  const s = result.settings as { maxPlayers?: number; shortMode?: boolean; tournamentType?: string; tiebreakMode?: string; dynamicDifficulty?: boolean; songSelectionMode?: string; seedingMode?: string; filterGenre?: string; filterLanguage?: string };

  const rawMaxPlayers = s.maxPlayers || 8;
  const shortMode = s.shortMode !== false;
  const tournamentPlayers: TournamentPlayer[] = result.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    eliminated: false,
    lossCount: 0,
    seed: i + 1,
  }));
  // Clamp to nearest valid tournament size: 2, 4, 8, 16, or 32
  const validSizes = [2, 4, 8, 16, 32] as const;
  const maxPlayers = validSizes.reduce((prev, curr) =>
    Math.abs(curr - rawMaxPlayers) < Math.abs(prev - rawMaxPlayers) ? curr : prev
  );
  const settings: TournamentSettings = {
    maxPlayers,
    songDuration: shortMode ? 60 : 180,
    randomSongs: true,
    difficulty: result.difficulty,
    tournamentType: (s.tournamentType as 'single' | 'double') ?? 'single',
    tiebreakMode: (s.tiebreakMode as 'coinflip' | 'accuracy' | 'combo' | 'goldenmic') ?? 'accuracy',
    dynamicDifficulty: s.dynamicDifficulty ?? false,
    songSelectionMode: (s.songSelectionMode as 'random' | 'vote') ?? 'random',
    seedingMode: (s.seedingMode as 'random' | 'strength') ?? 'random',
    filterGenre: s.filterGenre || 'all',
    filterLanguage: s.filterLanguage || 'all',
  };
  // Validate player count before creating tournament
  const playerCount = tournamentPlayers.length;
  if (playerCount < 2) {
    toast({
      title: t('partySetup.tournamentError'),
      description: t('partySetup.minPlayersRequired').replace('{n}', String(playerCount)),
      variant: 'destructive',
    });
    return;
  }
  if (playerCount > maxPlayers) {
    toast({
      title: t('partySetup.tournamentError'),
      description: t('partySetup.tournamentMaxPlayers').replace(/\{n\}/g, String(maxPlayers)),
      variant: 'destructive',
    });
    return;
  }
  try {
    const bracket = createTournament(tournamentPlayers, settings);
    party.setTournamentBracket(bracket);
    party.setTournamentSongDuration(settings.songDuration);
    setScreen('tournament-game');
  } catch (err) {
    toast({
      title: t('partySetup.tournamentError'),
      description: err instanceof Error ? err.message : t('partySetup.tournamentCreateError'),
      variant: 'destructive',
    });
  }
}
