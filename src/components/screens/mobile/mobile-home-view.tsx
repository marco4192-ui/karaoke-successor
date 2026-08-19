'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameState, QueueItem, MobileView } from './mobile-types';
import { MobileLeaderboard } from './mobile-leaderboard';

interface HomeViewProps {
  gameState: GameState;
  queue: QueueItem[];
  clientId: string;
  onNavigate: (_view: MobileView) => void;
  onOpenChat: () => void;
}

export function MobileHomeView({ gameState, queue, clientId, onNavigate, onOpenChat }: HomeViewProps) {
  const { t } = useTranslation();
  const [startSending, setStartSending] = useState(false);
  const [configSent, setConfigSent] = useState(false);

  const handleStartGame = async () => {
    setStartSending(true);
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_command',
          clientId,
          payload: { command: 'party_start' },
        }),
      });
      setConfigSent(true);
      setTimeout(() => setConfigSent(false), 2000);
    } finally {
      setStartSending(false);
    }
  };

  // Map screen names to display labels
  const screenLabel = gameState.currentScreen
    ? {
        home: '🏠 Home', library: '📚 Library', party: '🎉 Party', 'party-setup': '🎉 Party Setup',
        queue: '📋 Queue', profile: '👤 Profile', highscores: '🏆 Highscores',
        achievements: '⭐ Achievements', jukebox: '🎵 Jukebox', settings: '⚙️ Settings',
        editor: '📝 Editor', game: '🎮 Game', 'dailyChallenge': '🎯 Challenge',
        online: '🌐 Online', results: '📊 Results', 'tournament-game': '🏆 Tournament',
        'battle-royale-game': '👑 Battle Royale', 'pass-the-mic-game': '🎤 Pass the Mic',
        'medley-game': '🎵 Medley', 'missing-words-game': '📝 Missing Words',
        'blind-game': '🙈 Blind Karaoke', 'companion-singalong-game': '📱 Sing-Along',
      }[gameState.currentScreen] || `📱 ${gameState.currentScreen}`
    : null;

  const modeLabel = gameState.gameMode
    ? {
        standard: '🎤 Single', duel: '⚔️ Duel', duet: '🎭 Duet',
        'pass-the-mic': '🎤 Pass the Mic', 'companion-singalong': '📱 Sing-Along',
        'missing-words': '📝 Missing Words', blind: '🙈 Blind Karaoke',
        tournament: '🏆 Tournament', 'battle-royale': '👑 Battle Royale',
        'rate-my-song': '⭐ Rate My Song', online: '🌐 Online',
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

      {/* Start Game button – shown when desktop is on party-setup with a mode selected */}
      {gameState.currentScreen === 'party-setup' && gameState.partyGameMode && (
        <button
          onClick={handleStartGame}
          disabled={startSending}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl p-4 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/25"
        >
          {startSending ? (
            <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : configSent ? (
            <>
              <span className="text-xl">✅</span>
              <span>{t('mobileViews.configSent')}</span>
            </>
          ) : (
            <>
              <span className="text-xl">🎮</span>
              <span>{t('mobileViews.startGame')}</span>
            </>
          )}
        </button>
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
        <button
          onClick={onOpenChat}
          className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-4 text-center hover:from-cyan-500/30 hover:to-blue-500/30 transition-colors border border-cyan-500/30"
        >
          <span className="text-3xl mb-2 block">💬</span>
          <span className="text-sm font-medium">{t('mobileChat.title')}</span>
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
