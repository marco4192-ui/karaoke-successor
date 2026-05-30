'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { useRovingFocus } from '@/hooks/use-roving-focus';
import type { GameMode } from '@/types/game';

interface PartyGame {
  mode: GameMode;
  titleKey: string;
  descKey: string;
  icon: string;
  players: string;
  color: string;
  isNew?: boolean;
}

interface PartyScreenProps {
  onSelectMode: (_mode: GameMode) => void;
}

// Deterministic slight rotations for comic-book feel (one per tile, -2deg to 2deg)
const TILE_ROTATIONS = [-1.8, 1.4, -0.6, 2.0, -1.5, 0.8, -1.2, 1.7, -0.4];

export function PartyScreen({ onSelectMode }: PartyScreenProps) {
  const { t } = useTranslation();

  const partyGames: PartyGame[] = [
    {
      mode: 'pass-the-mic',
      titleKey: 'party.passTheMic',
      descKey: 'party.passTheMicDesc',
      icon: '🎤',
      players: '2-8',
      color: '#00F3B2',
    },
    {
      mode: 'companion-singalong',
      titleKey: 'party.companionSingalong',
      descKey: 'party.companionSingalongDesc',
      icon: '📱',
      players: '2-8',
      color: '#FDE601',
    },
    {
      mode: 'medley',
      titleKey: 'party.medleyContest',
      descKey: 'party.medleyContestDesc',
      icon: '🎵',
      players: '2-4',
      color: '#6B2E77',
    },
    {
      mode: 'missing-words',
      titleKey: 'party.missingWords',
      descKey: 'party.missingWordsDesc',
      icon: '📝',
      players: '1-4',
      color: '#FC6B48',
    },
    {
      mode: 'blind',
      titleKey: 'party.blindKaraoke',
      descKey: 'party.blindKaraokeDesc',
      icon: '🙈',
      players: '1-4',
      color: '#BA279D',
    },
    {
      mode: 'tournament',
      titleKey: 'party.tournamentMode',
      descKey: 'party.tournamentModeDesc',
      icon: '🏆',
      players: '2-32',
      color: '#FDE601',
      isNew: true,
    },
    {
      mode: 'battle-royale',
      titleKey: 'party.battleRoyaleTitle',
      descKey: 'party.battleRoyaleDesc',
      icon: '👑',
      players: '2-24',
      color: '#F939A3',
      isNew: true,
    },
    {
      mode: 'rate-my-song',
      titleKey: 'party.rateMySongTitle',
      descKey: 'party.rateMySongDesc',
      icon: '⭐',
      players: '1-2',
      color: '#FC6B48',
      isNew: true,
    },
    {
      mode: 'online',
      titleKey: 'party.onlineMultiplayerTitle',
      descKey: 'party.onlineMultiplayerDesc',
      icon: '🌐',
      players: '2-8',
      color: '#00F3B2',
      isNew: true,
    },
  ];

  const { containerProps, getItemProps } = useRovingFocus({
    itemCount: partyGames.length,
    columns: 3,
    onSelect: (index) => onSelectMode(partyGames[index].mode),
    loop: true,
    orientation: 'grid',
    ariaLabel: 'Party-Modi',
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
      {/* Comic-book header */}
      <div className="mb-8">
        <h1
          className="text-4xl md:text-5xl font-black mb-2 text-[#FDE601]"
          style={{
            WebkitTextStroke: '2px #000000',
            paintOrder: 'stroke fill',
            textShadow: '3px 3px 0px #000000',
          }}
        >
          {t('party.title')}
        </h1>
        <p className="text-[#FDFEFD]/60 text-lg">{t('party.subtitle')}</p>
      </div>

      <div {...containerProps} className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {partyGames.map((game, index) => (
          <Card
            key={game.mode}
            className={`party-tile border-3 border-black cursor-pointer hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-150 relative focus-visible:ring-2 focus-visible:ring-[#F939A3] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none`}
            style={{
              backgroundColor: game.color,
              boxShadow: '4px 4px 0px #000000',
              transform: `rotate(${TILE_ROTATIONS[index]}deg)`,
            }}
            onClick={() => onSelectMode(game.mode)}
            {...getItemProps(index)}
            data-testid={`party-mode-${game.mode}`}
          >
            <CardContent className="pt-6">
              {game.isNew && (
                <div className="absolute top-2 right-2 bg-[#F939A3] text-black text-xs font-black px-2 py-1 rounded-sm border-2 border-black animate-pulse">
                  ✨ NEW
                </div>
              )}
              <div className="text-6xl mb-4 drop-shadow-sm">{game.icon}</div>
              <h3 className="text-2xl font-black text-black mb-2">{t(game.titleKey)}</h3>
              <p className="text-black/80 mb-4 leading-snug">{t(game.descKey)}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-black text-white font-bold border border-black"
                >
                  {game.players} {t('party.players')}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
