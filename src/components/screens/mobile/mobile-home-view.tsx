import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GameState, QueueItem, MobileView } from './mobile-types';

interface HomeViewProps {
  gameState: GameState;
  queue: QueueItem[];
  onNavigate: (view: MobileView) => void;
}

export function MobileHomeView({ gameState, queue, onNavigate }: HomeViewProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Now Playing */}
      {gameState.currentSong && (
        <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
          <CardContent className="py-4">
            <p className="text-xs text-white/60 mb-1">Now Playing</p>
            <p className="font-semibold text-lg">{gameState.currentSong.title}</p>
            <p className="text-white/60">{gameState.currentSong.artist}</p>
          </CardContent>
        </Card>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onNavigate('mic')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">🎤</span>
          <span className="text-sm">Sing</span>
        </button>
        <button 
          onClick={() => onNavigate('songs')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">🎵</span>
          <span className="text-sm">Songs</span>
        </button>
        <button 
          onClick={() => onNavigate('queue')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">📋</span>
          <span className="text-sm">Queue</span>
          {queue.length > 0 && (
            <Badge className="ml-2 bg-cyan-500">{queue.length}</Badge>
          )}
        </button>
        <button 
          onClick={() => onNavigate('remote')}
          className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl p-4 text-center hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors border border-purple-500/30"
        >
          <span className="text-3xl mb-2 block">🎮</span>
          <span className="text-sm font-medium">Remote</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">👤</span>
          <span className="text-sm">Profile</span>
        </button>
        <button 
          onClick={() => onNavigate('jukebox')}
          className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
        >
          <span className="text-3xl mb-2 block">📻</span>
          <span className="text-sm">Jukebox</span>
        </button>
      </div>
      
      {/* Queue Preview */}
      {queue.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Up Next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {queue.slice(0, 3).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
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
