'use client';

/**
 * Rate my Song starting screen — extracted 1:1 from party-game-screens.tsx
 * (task R9). Self-contained (reads party + game store itself, exactly like in
 * the original file); only the `export` keyword was added so
 * rate-my-song-screens.tsx can render it.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { PartyStartingScreen } from '@/components/game/party-starting-screen';
import type { Screen } from '@/types/screens';

// ===================== RATE MY SONG STARTING SCREEN =====================
// Mode starting screen between "Ready to Play" and the actual game screen.
// Shows mode name, singers (boxes) and the song (unless randomly selected).
export function RmsStartingScreen({ setScreen }: { setScreen: (_s: Screen) => void }) {
  const { t } = useTranslation();
  const party = usePartyStore();
  const profiles = useGameStore((s) => s.profiles);
  const currentSong = useGameStore((s) => s.gameState.currentSong);

  const songSelection = party.unifiedSetupResult?.songSelection;
  // Song name only shown when it was explicitly chosen (library/vote)
  const showSong = (songSelection === 'library' || songSelection === 'vote') ? currentSong : null;

  const players: import('@/components/game/party-starting-screen').PartyStartingPlayer[] = (party.rateMySongPlayerIds ?? [])
    .map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      const setupPlayer = party.unifiedSetupResult?.players?.find(p => p.id === id);
      return {
        id,
        name: profile?.name ?? setupPlayer?.name ?? `P${index + 1}`,
        avatar: profile?.avatar ?? setupPlayer?.avatar,
        color: profile?.color ?? setupPlayer?.color ?? '#FF6B6B',
        micName: setupPlayer?.micName,
        playerType: setupPlayer?.playerType,
        isStartPlayer: index === 0,
      };
    });

  return (
    <PartyStartingScreen
      modeIcon="⭐"
      modeTitle={t('gameModes.rateMySong.title')}
      modeColor="from-amber-500 to-orange-500"
      players={players}
      song={showSong}
      subtitle={party.rateMySongSettings?.duration === 'short' ? t('modeSettings.short60s') : undefined}
      startPlayerLabel={t('partyStarting.startsFirst')}
      onStart={() => setScreen('game')}
      testId="rate-my-song-starting-screen"
    />
  );
}

