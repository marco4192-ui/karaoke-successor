'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameState, QueueItem, MobileView } from './mobile-types';
import { MobileLeaderboard } from './mobile-leaderboard';

interface HomeViewProps {
  gameState: GameState;
  queue: QueueItem[];
  onNavigate: (_view: MobileView) => void;
}

export function MobileHomeView({ gameState, queue, onNavigate }: HomeViewProps) {
  const { t } = useTranslation();

  // Map screen names to display labels
  const screenLabel = gameState.currentScreen
    ? {
        home: t('mobileViews.screenHome'), library: t('mobileViews.screenLibrary'), party: t('mobileViews.screenParty'), 'party-setup': t('mobileViews.screenPartySetup'),
        queue: t('mobileViews.screenQueue'), profile: t('mobileViews.screenProfile'), highscores: t('mobileViews.screenHighscores'),
        achievements: t('mobileViews.screenAchievements'), jukebox: t('mobileViews.screenJukebox'), settings: t('mobileViews.screenSettings'),
        editor: t('mobileViews.screenEditor'), game: t('mobileViews.screenGame'), 'dailyChallenge': t('mobileViews.screenChallenge'),
        online: t('mobileViews.screenOnline'), results: t('mobileViews.screenResults'), 'tournament-game': t('mobileViews.screenTournament'),
        'battle-royale-game': t('mobileViews.screenBattleRoyale'), 'pass-the-mic-game': t('mobileViews.screenPassTheMic'),
        'medley-game': t('mobileViews.screenMedley'), 'missing-words-game': t('mobileViews.screenMissingWords'),
        'blind-game': t('mobileViews.screenBlindKaraoke'), 'companion-singalong-game': t('mobileViews.screenSingAlong'),
      }[gameState.currentScreen] || `📱 ${gameState.currentScreen}`
    : null;

  const modeLabel = gameState.gameMode
    ? {
        standard: t('mobileViews.modeSingle'), duel: t('mobileViews.modeDuel'), duet: t('mobileViews.modeDuet'),
        'pass-the-mic': t('mobileViews.modePassTheMic'), 'companion-singalong': t('mobileViews.modeSingAlong'),
        'companion-pass-the-mic': t('mobileViews.modeCPTM'), medley: t('mobileViews.modeMedley'),
        'missing-words': t('mobileViews.modeMissingWords'), blind: t('mobileViews.modeBlindKaraoke'),
        tournament: t('mobileViews.modeTournament'), 'battle-royale': t('mobileViews.modeBattleRoyale'),
        'rate-my-song': t('mobileViews.modeRateMySong'), online: t('mobileViews.modeOnline'),
      }[gameState.gameMode] || gameState.gameMode
    : null;

  return (
    <div className="p-4 space-y-4">
      {/* Desktop Status Banner */}
      {gameState.currentScreen && (
        <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/10">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/40">{t('mobileViews.desktopScreen') || 'Desktop'}</p>
            <p className="text-sm font-medium truncate">{screenLabel}</p>
          </div>
          {modeLabel && (
            <Badge className="bg-purple-500/30 text-purple-300 border border-purple-500/50 text-xs shrink-0">
              {modeLabel}
            </Badge>
          )}
        </div>
      )}

      {/* Now Playing */}
      {gameState.currentSong ? (
        <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
          <CardContent className="py-4">
            <p className="text-xs text-white/60 mb-1">{t('mobileViews.nowPlaying')}</p>
            <p className="font-semibold text-lg">{gameState.currentSong.title}</p>
            <p className="text-white/60">{gameState.currentSong.artist}</p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-white/20 text-sm py-4">{t('mobileViews.nothingPlaying')}</p>
      )}

      {/* Live Leaderboard (shown during companion singalong) */}
      <MobileLeaderboard gameState={gameState} />
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onNavigate('mic')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">🎤</span>
          <span className="text-sm">{t('mobileViews.sing')}</span>
        </button>
        <button 
          onClick={() => onNavigate('songs')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">🎵</span>
          <span className="text-sm">{t('mobileViews.songs')}</span>
        </button>
        <button 
          onClick={() => onNavigate('queue')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">📋</span>
          <span className="text-sm">{t('mobileViews.queue')}</span>
          {queue.length > 0 && (
            <Badge className="ml-2 bg-cyan-500">{queue.length}</Badge>
          )}
        </button>
        <button 
          onClick={() => onNavigate('remote')}
          className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl p-4 text-center hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors border border-purple-500/30"
        >
          <span className="text-3xl mb-2 block">🎮</span>
          <span className="text-sm font-medium">{t('mobileViews.remote')}</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">👤</span>
          <span className="text-sm">{t('mobileViews.profile')}</span>
        </button>
        <button 
          onClick={() => onNavigate('jukebox')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">📻</span>
          <span className="text-sm">{t('mobileViews.jukebox')}</span>
        </button>
      </div>
      
      {/* Queue Preview */}
      {queue.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('mobileViews.upNext')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.slice(0, 3).map((item, i) => (
              <div key={item.id || i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                <span className="text-white/40 text-sm">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.songTitle}</p>
                  <p className="text-xs text-white/40">{item.songArtist}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
