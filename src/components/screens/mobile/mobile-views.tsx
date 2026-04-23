'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeAlert } from '@/lib/safe-dialog';
import { Badge } from '@/components/ui/badge';
import { midiToNoteName } from '@/types/game';
import { MicIcon, MusicIcon } from './mobile-icons';
import type { GameState, QueueItem, MobileSong, GameResults, JukeboxWishlistItem, MobileView, MobileProfile } from './mobile-types';

// ===================== HOME VIEW =====================
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

// ===================== MIC VIEW =====================
interface MicViewProps {
  gameState: GameState;
  clientId: string | null;
  currentPitch: { frequency: number | null; note: number | null; volume: number };
  isListening: boolean;
  micPermissionDenied?: boolean;
  onStartMic: () => void;
  onStopMic: () => void;
}

export function MobileMicView({ gameState, clientId, currentPitch, isListening, micPermissionDenied, onStartMic, onStopMic }: MicViewProps) {
  return (
    <div className="p-4">
      {/* Microphone Permission Denied Banner */}
      {micPermissionDenied && (
        <Card className="bg-gradient-to-r from-red-500/30 to-orange-500/30 border-red-500/50 mb-4">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center text-xl">
                  🚫
                </div>
                <div>
                  <p className="font-bold text-red-300">Mikrofonzugriff verweigert</p>
                  <p className="text-sm text-white/70">Die App braucht Zugang zum Mikrofon zum Singen</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-white/60">
                <p>So erlaubst du den Zugang:</p>
                <p>1. Tippe auf das Schloss-Symbol links neben der URL</p>
                <p>2. Finde "Mikrofon" und wähle "Erlauben"</p>
                <p>3. Lade die Seite neu</p>
              </div>
              <details className="text-xs text-white/40">
                <summary className="cursor-pointer hover:text-white/60">Weitere Hilfe</summary>
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-white/60">iOS (Safari):</p>
                  <p>Einstellungen &rarr; Safari &rarr; Mikrofon &rarr; Erlauben</p>
                  <p className="font-semibold text-white/60 mt-1">Android (Chrome):</p>
                  <p>Site-Einstellungen (Schloss-Symbol) &rarr; Mikrofon &rarr; Erlauben</p>
                  <p className="font-semibold text-white/60 mt-1">Desktop:</p>
                  <p>Adresseiste &rarr; Kamera/Mikrofon-Symbol &rarr; Erlauben</p>
                </div>
              </details>
              <Button
                onClick={onStartMic}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold"
              >
                🔄 Nochmal versuchen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Ad Playing Banner */}
      {gameState.isAdPlaying && (
        <Card className="bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-bold text-orange-300">Werbung läuft</p>
                  <p className="text-sm text-white/70">Spiel pausiert</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await fetch('/api/mobile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'skipAd',
                        clientId: clientId,
                      }),
                    });
                  } catch (error) {
                    console.error('Skip ad failed:', error);
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold px-6 py-3"
              >
                ⏭️ Werbung überspringen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-white/10 border-white/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center">
            {/* Volume Indicator */}
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
                style={{ width: `${currentPitch.volume * 100}%` }}
              />
            </div>
            
            {/* Pitch Display */}
            {currentPitch.note !== null && (
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-cyan-400">
                  {midiToNoteName(Math.round(currentPitch.note))}
                </div>
                <div className="text-sm text-white/60">
                  {currentPitch.frequency?.toFixed(1)} Hz
                </div>
              </div>
            )}
            
            {/* Microphone Button */}
            <button
              onClick={isListening ? onStopMic : onStartMic}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-400 animate-pulse shadow-lg shadow-red-500/50' 
                  : 'bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-purple-500/30'
              }`}
            >
              <MicIcon className="w-20 h-20 text-white" />
            </button>
            <p className="mt-6 text-lg text-white/60">
              {isListening ? 'Tap to stop' : 'Tap to sing'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== SONGS VIEW =====================
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
  onAddToJukebox?: (song: MobileSong) => void;
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
  onAddToJukebox,
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
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => {
                    onShowSongOptions(song);
                    onLoadPartners();
                  }}
                  className="bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white flex items-center justify-center text-xl font-bold rounded-lg transition-colors"
                  style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}
                  aria-label="Song zur Warteschlange hinzufügen"
                >
                  +
                </button>
                {onAddToJukebox && (
                  <button
                    onClick={() => onAddToJukebox(song)}
                    className="bg-purple-500 hover:bg-purple-400 active:bg-purple-600 text-white flex items-center justify-center text-sm rounded-lg transition-colors"
                    style={{ width: '2.25rem', height: '1.75rem', minWidth: '2.25rem', minHeight: '1.75rem' }}
                    aria-label="Song zur Jukebox hinzufügen"
                  >
                    🎵
                  </button>
                )}
              </div>
              
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

// ===================== QUEUE VIEW =====================
interface QueueViewProps {
  queue: QueueItem[];
  slotsRemaining: number;
  queueError: string | null;
  connectionCode?: string | null;
  onRemoveFromQueue?: (itemId: string) => void;
  onNavigate: (view: MobileView) => void;
}

export function MobileQueueView({ queue, slotsRemaining, queueError, connectionCode, onRemoveFromQueue, onNavigate }: QueueViewProps) {
  return (
    <div className="p-4">
      {/* Queue Header with Slots */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Song Queue</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/40">Slots:</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((slot) => (
              <div 
                key={slot}
                className={`w-4 h-4 rounded-full ${slot <= slotsRemaining ? 'bg-cyan-500' : 'bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Queue Error */}
      {queueError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {queueError}
        </div>
      )}
      
      {queue.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📋</span>
          <p>No songs in queue</p>
          <p className="text-sm mt-2">You can add up to 3 songs</p>
          <Button 
            onClick={() => onNavigate('songs')}
            variant="outline"
            className="mt-4 border-white/20 text-white"
          >
            Browse Songs
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.filter(q => q.status !== 'completed').map((item, i) => (
            <div 
              key={item.id || i}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                item.status === 'playing' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5'
              }`}
            >
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <span>{item.songArtist}</span>
                  <span>•</span>
                  <span>by {item.addedBy}</span>
                  {item.partnerName && (
                    <>
                      <span>•</span>
                      <span className="text-purple-400">with {item.partnerName}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Game Mode Badge */}
              <div className="flex items-center gap-1">
                {item.gameMode === 'duel' && (
                  <Badge className="bg-red-500/80 text-xs">⚔️ Duel</Badge>
                )}
                {item.gameMode === 'duet' && (
                  <Badge className="bg-pink-500/80 text-xs">🎭 Duet</Badge>
                )}
                {(!item.gameMode || item.gameMode === 'single') && (
                  <Badge className="bg-cyan-500/80 text-xs">🎤</Badge>
                )}
              </div>
              
              {item.status === 'playing' && (
                <Badge className="bg-cyan-500 text-xs">Playing</Badge>
              )}

              {/* Remove button — only show for own songs (matching companionCode) and not currently playing */}
              {onRemoveFromQueue && connectionCode && item.companionCode === connectionCode && item.status !== 'playing' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(item.id); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors shrink-0"
                  aria-label="Remove song from queue"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== RESULTS VIEW =====================
interface ResultsViewProps {
  gameResults: GameResults | null;
  onNavigate: (view: MobileView) => void;
}

export function MobileResultsView({ gameResults, onNavigate }: ResultsViewProps) {
  return (
    <div className="p-4 max-w-md mx-auto">
      {gameResults ? (
        <div className="space-y-4">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
            <CardContent className="py-6">
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">You just played</p>
                <h2 className="text-xl font-bold mb-1">{gameResults.songTitle}</h2>
                <p className="text-white/60">{gameResults.songArtist}</p>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{gameResults.score.toLocaleString()}</p>
                  <p className="text-xs text-white/40">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">{gameResults.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-white/40">Accuracy</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{gameResults.maxCombo}x</p>
                  <p className="text-xs text-white/40">Best Combo</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{gameResults.rating}</p>
                  <p className="text-xs text-white/40">Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Social Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                safeAlert('Score card saved to your photos! (Feature coming soon)');
              }}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              📸 Save Score Card
            </Button>
            <Button 
              onClick={() => {
                const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n#KaraokeSuccessor`;
                if (navigator.share) {
                  navigator.share({ text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text);
                  safeAlert('Score copied to clipboard!');
                }
              }}
              variant="outline"
              className="border-white/20"
            >
              📤 Share Score
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => onNavigate('home')}
              variant="outline"
              className="flex-1 border-white/20"
            >
              🏠 Home
            </Button>
            <Button 
              onClick={() => onNavigate('queue')}
              variant="outline"
              className="flex-1 border-white/20"
            >
              📋 Queue
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📊</span>
          <p>No recent results</p>
          <p className="text-sm mt-2">Sing a song to see your results here!</p>
          <Button 
            onClick={() => onNavigate('home')}
            variant="outline"
            className="mt-4 border-white/20"
          >
            Go Home
          </Button>
        </div>
      )}
    </div>
  );
}

// ===================== JUKEBOX VIEW =====================
interface JukeboxViewProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onNavigate: (view: MobileView) => void;
}

export function MobileJukeboxView({ jukeboxWishlist, onNavigate }: JukeboxViewProps) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Jukebox Wishlist</h2>
      <p className="text-sm text-white/40 mb-4">Add songs to the jukebox playlist</p>
      
      {/* Quick Add */}
      <Button 
        onClick={() => onNavigate('songs')}
        variant="outline"
        className="w-full border-white/20 mb-4"
      >
        + Add Songs to Wishlist
      </Button>
      
      {jukeboxWishlist.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">🎵</span>
          <p>No songs in wishlist</p>
          <p className="text-sm mt-2">Songs you add will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jukeboxWishlist.map((item, i) => (
            <div 
              key={i}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
            >
              <span className="text-white/40 font-bold w-6">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.songTitle}</p>
                <p className="text-sm text-white/40">{item.songArtist} • Added by {item.addedBy}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== PROFILE CREATE VIEW =====================
interface ProfileCreateViewProps {
  profileName: string;
  onProfileNameChange: (value: string) => void;
  profileColor: string;
  onProfileColorChange: (color: string) => void;
  avatarPreview: string | null;
  profileColors: readonly string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateProfile: (hostProfile?: MobileProfile) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MobileProfileCreateView({
  profileName,
  onProfileNameChange,
  profileColor,
  onProfileColorChange,
  avatarPreview,
  profileColors,
  fileInputRef,
  onCreateProfile,
  onPhotoUpload,
}: ProfileCreateViewProps) {
  const [hostProfiles, setHostProfiles] = useState<MobileProfile[]>([]);
  const [claimedProfileIds, setClaimedProfileIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Track a selected host profile before confirming — allows deselection
  const [selectedHostProfile, setSelectedHostProfile] = useState<MobileProfile | null>(null);

  // Fetch host profiles when component mounts
  React.useEffect(() => {
    const fetchHostProfiles = async () => {
      try {
        setIsLoading(true);
        // Include clientId to exclude own profile from "claimed" list
        const storedClientId = localStorage.getItem('karaoke-client-id');
        const clientIdParam = storedClientId ? `&clientId=${storedClientId}` : '';
        const response = await fetch(`/api/mobile?action=hostprofiles${clientIdParam}`);
        const data = await response.json();
        if (data.success && data.profiles) {
          setHostProfiles(data.profiles);
          setClaimedProfileIds(data.claimedProfileIds || []);
        }
      } catch { /* ignore */ } finally {
        setIsLoading(false);
      }
    };
    fetchHostProfiles();
  }, []);

  // Available profiles: if one is selected, only show that one
  const availableProfiles = selectedHostProfile
    ? hostProfiles.filter(hp => hp.id === selectedHostProfile.id)
    : hostProfiles.filter(hp => !claimedProfileIds.includes(hp.id));

  const handleSelectHostProfile = (hp: MobileProfile) => {
    setSelectedHostProfile(hp);
    onProfileNameChange(hp.name);
    onProfileColorChange(hp.color);
    // Note: we DON'T call onCreateProfile here — user can still deselect
  };

  const handleDeselectProfile = () => {
    setSelectedHostProfile(null);
    onProfileNameChange('');
    onProfileColorChange(profileColors[0]);
  };

  const handleConfirmSelected = () => {
    if (selectedHostProfile) {
      onCreateProfile(selectedHostProfile);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-center">Create Your Profile</CardTitle>
          <p className="text-center text-white/40 text-sm mt-2">Your profile will sync with the main app</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Choose Existing Character from Host */}
          {hostProfiles.length > 0 && !selectedHostProfile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Bestehenden Charakter wählen</h3>
              </div>
              <p className="text-xs text-white/40 mb-2">
                Wähle einen Charakter, der auf dem Hauptgerät erstellt wurde
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableProfiles.map((hp) => (
                    <button
                      key={hp.id}
                      onClick={() => handleSelectHostProfile(hp)}
                      className="flex items-center gap-3 p-2 rounded-lg w-full text-left transition-colors bg-white/5 hover:bg-white/10 cursor-pointer"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: hp.color }}
                      >
                        {hp.avatar ? (
                          <img src={hp.avatar} alt={hp.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          hp.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{hp.name}</span>
                      </div>
                    </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">oder neu erstellen</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Selected host profile — show with confirm/deselect options */}
          {selectedHostProfile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Ausgewählter Charakter</h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
              >
                {avatarPreview || selectedHostProfile.avatar ? (
                  <img src={avatarPreview || selectedHostProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-xl">📷</span>
                    <p className="text-[10px] text-white/40 mt-0.5">Foto</p>
                  </div>
                )}
              </button>
              <p className="text-center text-sm font-medium truncate">{selectedHostProfile.name}</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmSelected}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                >
                  ✓ Bestätigen
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeselectProfile}
                  className="flex-1 border-white/30 text-white/70"
                >
                  ✕ Abwählen
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">oder neu erstellen</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl">📷</span>
                  <p className="text-xs text-white/40 mt-1">Add Photo</p>
                </div>
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={onPhotoUpload}
              className="hidden" 
            />
          </div>
          
          {/* Name Input */}
          <div>
            <label htmlFor="profile-name" className="text-sm text-white/60 mb-2 block">Your Name</label>
            <Input
              id="profile-name"
              name="profile-name"
              value={profileName}
              onChange={(e) => onProfileNameChange(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          {/* Color Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Choose Color</label>
            <div className="flex flex-wrap gap-2">
              {profileColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onProfileColorChange(color)}
                  className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Create Button */}
          <Button 
            onClick={onCreateProfile}
            disabled={!profileName.trim()}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
          >
            Create Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== PROFILE EDIT VIEW =====================
interface ProfileEditViewProps {
  profile: MobileProfile;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  profileColor: string;
  onProfileColorChange: (color: string) => void;
  avatarPreview: string | null;
  connectionCode: string;
  profileColors: readonly string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwitchToHostProfile?: (hostProfile: MobileProfile) => void;
}

export function MobileProfileEditView({
  profile,
  profileName,
  onProfileNameChange,
  profileColor,
  onProfileColorChange,
  avatarPreview,
  connectionCode,
  profileColors,
  fileInputRef,
  onSave,
  onPhotoUpload,
  onSwitchToHostProfile,
}: ProfileEditViewProps) {
  const [hostProfiles, setHostProfiles] = useState<MobileProfile[]>([]);
  const [claimedProfileIds, setClaimedProfileIds] = useState<string[]>([]);

  // Fetch host profiles so the user can switch to a different host character
  React.useEffect(() => {
    const fetchHostProfiles = async () => {
      try {
        const storedClientId = localStorage.getItem('karaoke-client-id');
        const clientIdParam = storedClientId ? `&clientId=${storedClientId}` : '';
        const response = await fetch(`/api/mobile?action=hostprofiles${clientIdParam}`);
        const data = await response.json();
        if (data.success && data.profiles) {
          setHostProfiles(data.profiles);
          setClaimedProfileIds(data.claimedProfileIds || []);
        }
      } catch { /* ignore */ }
    };
    fetchHostProfiles();
  }, []);

  // Filter out the current profile (already selected) and already-claimed profiles
  const availableHostProfiles = hostProfiles.filter(
    (hp) => hp.id !== profile.id && !claimedProfileIds.includes(hp.id)
  );

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="bg-white/10 border-white/20">
        <CardContent className="py-6">
          <div className="flex flex-col items-center mb-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 hover:border-white/40 transition-colors"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold flex items-center justify-center h-full">{profile.name[0]}</span>
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={onPhotoUpload}
              className="hidden" 
            />
            <h2 className="text-xl font-bold mt-4">{profile.name}</h2>
            {/* Show connection code */}
            {connectionCode && (
              <Badge variant="outline" className="mt-2 border-cyan-500/50 text-cyan-400 font-mono">
                Code: {connectionCode}
              </Badge>
            )}
          </div>

          {/* Switch to Host Character */}
          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Charakter wechseln</h3>
              </div>
              <p className="text-xs text-white/40">
                Wähle einen Charakter aus der Haupt-App
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableHostProfiles.map((hp) => (
                  <button
                    key={hp.id}
                    onClick={() => onSwitchToHostProfile(hp)}
                    className="flex items-center gap-3 p-2 rounded-lg w-full text-left bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: hp.color }}
                    >
                      {hp.avatar ? (
                        <img src={hp.avatar} alt={hp.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        hp.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm truncate flex-1">{hp.name}</span>
                    <span className="text-xs text-cyan-400">Auswählen</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">oder bearbeiten</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          )}
          
          {/* Name Edit */}
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">Name</label>
              <Input
                id="edit-profile-name"
                name="edit-profile-name"
                value={profileName}
                onChange={(e) => onProfileNameChange(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            
            {/* Color Edit */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Color</label>
              <div className="flex flex-wrap gap-2">
                {profileColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => onProfileColorChange(color)}
                    className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            {/* Save Button */}
            <Button 
              onClick={onSave}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== BOTTOM NAV =====================
interface BottomNavProps {
  currentView: MobileView;
  onNavigate: (view: MobileView) => void;
}

export function MobileBottomNav({ currentView, onNavigate }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
      <div className="flex justify-around py-2">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center p-2 ${currentView === 'home' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🏠</span>
          <span className="text-xs mt-1">Home</span>
        </button>
        <button 
          onClick={() => onNavigate('mic')}
          className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎤</span>
          <span className="text-xs mt-1">Sing</span>
        </button>
        <button 
          onClick={() => onNavigate('songs')}
          className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎵</span>
          <span className="text-xs mt-1">Songs</span>
        </button>
        <button 
          onClick={() => onNavigate('remote')}
          className={`flex flex-col items-center p-2 ${currentView === 'remote' ? 'text-purple-400' : 'text-white/40'}`}
        >
          <span className="text-xl">🎮</span>
          <span className="text-xs mt-1">Remote</span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center p-2 ${currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'}`}
        >
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
}
