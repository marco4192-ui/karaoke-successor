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

export function PartyScreen({ onSelectMode }: PartyScreenProps) {
  const { t } = useTranslation();

  const partyGames: PartyGame[] = [
    {
      mode: 'pass-the-mic',
      titleKey: 'party.passTheMic',
      descKey: 'party.passTheMicDesc',
      icon: '🎤',
      players: '2-8',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      mode: 'companion-singalong',
      titleKey: 'party.companionSingalong',
      descKey: 'party.companionSingalongDesc',
      icon: '📱',
      players: '2-8',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      mode: 'medley',
      titleKey: 'party.medleyContest',
      descKey: 'party.medleyContestDesc',
      icon: '🎵',
      players: '2-4',
      color: 'from-purple-500 to-pink-500',
    },
    {
      mode: 'missing-words',
      titleKey: 'party.missingWords',
      descKey: 'party.missingWordsDesc',
      icon: '📝',
      players: '1-4',
      color: 'from-orange-500 to-red-500',
    },
    {
      mode: 'blind',
      titleKey: 'party.blindKaraoke',
      descKey: 'party.blindKaraokeDesc',
      icon: '🙈',
      players: '1-4',
      color: 'from-green-500 to-teal-500',
    },
    {
      mode: 'tournament',
      titleKey: 'party.tournamentMode',
      descKey: 'party.tournamentModeDesc',
      icon: '🏆',
      players: '2-32',
      color: 'from-amber-500 to-yellow-500',
      isNew: true,
    },
    {
      mode: 'battle-royale',
      titleKey: 'party.battleRoyaleTitle',
      descKey: 'party.battleRoyaleDesc',
      icon: '👑',
      players: '2-24',
      color: 'from-red-600 to-pink-600',
      isNew: true,
    },
    {
      mode: 'rate-my-song',
      titleKey: 'party.rateMySongTitle',
      descKey: 'party.rateMySongDesc',
      icon: '⭐',
      players: '1-2',
      color: 'from-amber-500 to-orange-500',
      isNew: true,
    },
    {
      mode: 'online',
      titleKey: 'party.onlineMultiplayerTitle',
      descKey: 'party.onlineMultiplayerDesc',
      icon: '🌐',
      players: '2-8',
      color: 'from-cyan-500 to-purple-600',
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('party.title')}</h1>
        <p className="text-white/60">{t('party.subtitle')}</p>
      </div>

      <div {...containerProps} className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {partyGames.map((game, index) => (
          <Card 
            key={game.mode}
            className={`party-tile bg-gradient-to-br ${game.color} border-0 cursor-pointer hover:scale-105 transition-transform relative focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:outline-none`}
            onClick={() => onSelectMode(game.mode)}
            {...getItemProps(index)}
            data-testid={`party-mode-${game.mode}`}
          >
            <CardContent className="pt-6">
              {game.isNew && (
                <div className="absolute top-2 right-2 bg-white/90 text-black text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  ✨ {t('party.newBadge')}
                </div>
              )}
              <div className="text-5xl mb-4">{game.icon}</div>
              <h3 className="tile-text-white text-2xl font-bold text-white mb-2">{t(game.titleKey)}</h3>
              <p className="tile-text-white text-white/80 mb-4">{t(game.descKey)}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="tile-text-white bg-white/20 text-white">
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
