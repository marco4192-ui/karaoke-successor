import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MusicIcon } from './mobile-icons';
import type { MobileSong, MobileView } from './mobile-types';

interface SongsViewProps {
  songSearch: string;
  onSongSearchChange: (value: string) => void;
  songsLoading: boolean;
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
  selectedGameMode: 'single' | 'duel' | 'duet';
  selectedPartner: { id: string; name: string } | null;
  availablePartners: Array<{ id: string; name: string; code: string }>;
  onShowSongOptions: (song: MobileSong | null) => void;
  onSelectGameMode: (mode: 'single' | 'duel' | 'duet') => void;
  onSelectPartner: (partner: { id: string; name: string } | null) => void;
  onAddToQueue: (song: MobileSong) => void;
  onLoadPartners: () => void;
  formatDuration: (ms: number) => string;
}

export function MobileSongsView({
  songSearch,
  onSongSearchChange,
  songsLoading,
  filteredSongs,
  showSongOptions,
  selectedGameMode,
  selectedPartner,
  availablePartners,
  onShowSongOptions,
  onSelectGameMode,
  onSelectPartner,
  onAddToQueue,
  onLoadPartners,
  formatDuration,
}: SongsViewProps) {
  return (
    <div className="p-4">
      {/* Search */}
      <div className="relative mb-4">
        <Input
          id="song-search-modal"
          name="song-search-modal"
          value={songSearch}
          onChange={(e) => onSongSearchChange(e.target.value)}
          placeholder="Songs suchen..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      
      {/* Song Options Modal */}
      {showSongOptions && (
        <Card className="bg-white/10 border-white/20 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{showSongOptions.title}</CardTitle>
            <p className="text-sm text-white/40">{showSongOptions.artist}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Game Mode Selection */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Game Mode</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelectGameMode('single')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'single' 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎤</span>
                  <span className="text-xs">Single</span>
                </button>
                <button
                  onClick={() => onSelectGameMode('duel')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'duel' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">⚔️</span>
                  <span className="text-xs">Duel</span>
                </button>
                <button
                  onClick={() => onSelectGameMode('duet')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'duet' 
                      ? 'bg-pink-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎭</span>
                  <span className="text-xs">Duet</span>
                </button>
              </div>
            </div>
            
            {/* Partner Selection (optional, for duel/duet) */}
            {(selectedGameMode === 'duel' || selectedGameMode === 'duet') && (
              <div>
                <label className="text-sm text-white/60 mb-2 block">
                  Partner (optional)
                </label>
                {availablePartners.length > 0 ? (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {availablePartners.map((partner) => (
                      <button
                        key={partner.id}
                        onClick={() => onSelectPartner(
                          selectedPartner?.id === partner.id ? null : partner
                        )}
                        className={`w-full p-2 rounded-lg flex items-center gap-3 transition-all ${
                          selectedPartner?.id === partner.id 
                            ? 'bg-purple-500/30 border border-purple-500/50' 
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                          {partner.name[0]}
                        </div>
                        <span className="flex-1 text-left">{partner.name}</span>
                        <span className="text-xs text-white/40">#{partner.code}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/40 py-2">
                    No other companions connected. You can still add without a partner.
                  </p>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onShowSongOptions(null);
                  onSelectPartner(null);
                  onSelectGameMode('single');
                }}
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onAddToQueue(showSongOptions)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                Add to Queue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Song List */}
      {songsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      ) : (
        <div className="space-y-2 pb-4">
          {filteredSongs.map((song) => (
            <div 
              key={song.id || `song-${song.title}-${song.artist}`}
              className="flex items-center gap-2 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors min-w-0"
            >
              {/* Add to Queue Button — always visible, rendered FIRST for guaranteed visibility */}
              <button
                onClick={() => {
                  onShowSongOptions(song);
                  onLoadPartners();
                }}
                className="bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold rounded-lg transition-colors"
                style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}
                aria-label="Song zur Warteschlange hinzufügen"
              >
                +
              </button>
              
              {/* Cover */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-white/30" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{song.title || 'Unknown'}</p>
                <p className="text-xs text-white/40 truncate">{song.artist || 'Unknown'}</p>
              </div>
              
              {/* Duration */}
              <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">
                {song.duration > 0 ? formatDuration(song.duration) : '--:--'}
              </span>
            </div>
          ))}
          
          {filteredSongs.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <p className="text-lg mb-1">🎵</p>
              Keine Songs gefunden
            </div>
          )}
        </div>
      )}
    </div>
  );
}
