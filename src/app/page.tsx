'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameStore, selectQueue, selectProfiles, selectActiveProfile } from '@/lib/game/store';
import { sampleSongs, searchSongs, getSongById } from '@/data/songs/songs';
import { ImportScreen } from '@/components/import/import-screen';
import { 
  Song, 
  Player, 
  Difficulty, 
  GameMode, 
  LyricLine, 
  Note,
  DIFFICULTY_SETTINGS,
  SCORE_VALUES,
  PLAYER_COLORS,
  midiToNoteName,
  frequencyToMidi,
  PlayerProfile,
  HighscoreEntry,
  getRankTitle,
  RANKING_TITLES
} from '@/types/game';

// QR Code generator (simple version)
function generateQRCode(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

// Screen types
type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import';

// ===================== MAIN APP =====================
export default function KaraokeSuccessor() {
  const [screen, setScreen] = useState<Screen>('home');
  const [importedSongs, setImportedSongs] = useState<Song[]>([]);
  const { gameState, setSong, setDifficulty, setGameMode, addPlayer, updatePlayer, createProfile, profiles, activeProfileId, setActiveProfile, queue, addToQueue, removeFromQueue, highscores, getTopHighscores } = useGameStore();
  
  const addImportedSong = (song: Song) => {
    setImportedSongs(prev => [...prev, song]);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setScreen('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <MusicIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Karaoke Successor
            </span>
          </button>
          
          <div className="flex items-center gap-2">
            <NavButton active={screen === 'library'} onClick={() => setScreen('library')}>
              <LibraryIcon className="w-5 h-5" /> Library
            </NavButton>
            <NavButton active={screen === 'import'} onClick={() => setScreen('import')}>
              <ImportIcon className="w-5 h-5" /> Import
            </NavButton>
            <NavButton active={screen === 'party'} onClick={() => setScreen('party')}>
              <PartyIcon className="w-5 h-5" /> Party
            </NavButton>
            <NavButton active={screen === 'character'} onClick={() => setScreen('character')}>
              <UserIcon className="w-5 h-5" /> Characters
            </NavButton>
            <NavButton active={screen === 'queue'} onClick={() => setScreen('queue')}>
              <QueueIcon className="w-5 h-5" /> Queue
              {queue.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queue.length}</Badge>
              )}
            </NavButton>
            <NavButton active={screen === 'highscores'} onClick={() => setScreen('highscores')}>
              <TrophyIcon className="w-5 h-5" /> Highscores
            </NavButton>
            <NavButton active={screen === 'mobile'} onClick={() => setScreen('mobile')}>
              <PhoneIcon className="w-5 h-5" /> Mobile
            </NavButton>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-8 px-4 min-h-screen">
        {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
        {screen === 'library' && <LibraryScreen onSelectSong={(song) => { setSong(song); setScreen('game'); }} />}
        {screen === 'game' && <GameScreen onEnd={() => setScreen('results')} onBack={() => setScreen('library')} />}
        {screen === 'party' && <PartyScreen onSelectMode={(mode) => { setGameMode(mode); setScreen('library'); }} />}
        {screen === 'character' && <CharacterScreen />}
        {screen === 'queue' && <QueueScreen />}
        {screen === 'mobile' && <MobileScreen />}
        {screen === 'import' && <ImportScreen onImport={(song) => { addImportedSong(song); setScreen('library'); }} onCancel={() => setScreen('home')} />}
        {screen === 'highscores' && <HighscoreScreen />}
        {screen === 'results' && <ResultsScreen onPlayAgain={() => setScreen('library')} onHome={() => setScreen('home')} />}
      </main>
    </div>
  );
}

// ===================== NAV BUTTON =====================
function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-white/20 text-white' 
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

// ===================== ICONS =====================
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function LibraryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PartyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5.8 11.3L2 22l10.7-3.8" />
      <path d="M4 3h.01" />
      <path d="M22 8h.01" />
      <path d="M15 2h.01" />
      <path d="M22 20h.01" />
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
      <path d="M11 15c-1.5 1-2.5 2.5-3 4.5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ImportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

// ===================== HOME SCREEN =====================
function HomeScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/30">
          <MusicIcon className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Karaoke Successor
        </h1>
        <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
          The ultimate karaoke experience. Sing your heart out with real-time pitch detection, 
          compete with friends, and enjoy party games!
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-6 text-lg"
            onClick={() => onNavigate('library')}
          >
            <PlayIcon className="w-5 h-5 mr-2" /> Start Singing
          </Button>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white px-8 py-6 text-lg border-2 border-pink-400/50"
            onClick={() => onNavigate('party')}
          >
            <PartyIcon className="w-5 h-5 mr-2" /> Party Mode
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-cyan-400">{sampleSongs.length}</div>
            <div className="text-white/60 text-sm">Songs Available</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-400">{profiles.length}</div>
            <div className="text-white/60 text-sm">Characters Created</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-pink-400">5</div>
            <div className="text-white/60 text-sm">Party Games</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-400">3</div>
            <div className="text-white/60 text-sm">Difficulty Levels</div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <MicIcon className="w-6 h-6" /> Real-Time Pitch Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Advanced YIN algorithm detects your singing pitch in real-time with high accuracy. 
              See your voice visualized as you sing!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <PartyIcon className="w-6 h-6" /> Party Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Pass the Mic, Medley Contest, Missing Words, Duel Mode, and Blind Karaoke - 
              endless entertainment for your parties!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <PhoneIcon className="w-6 h-6" /> Mobile Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Use your smartphone as a microphone or remote control! 
              Simply scan the QR code to connect.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Select Profile */}
      {profiles.length > 0 && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Select Your Character</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeProfileId === profile.id 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      profile.name[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
              <button
                onClick={() => onNavigate('character')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                  +
                </div>
                <span className="text-white/60">Create New</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== LIBRARY SCREEN =====================
function LibraryScreen({ onSelectSong }: { onSelectSong: (song: Song) => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles } = useGameStore();
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerQueueCount = queue.filter(item => item.playerId === activeProfileId).length;

  const filteredSongs = useMemo(() => {
    let songs = sampleSongs;
    if (searchQuery) {
      songs = searchSongs(searchQuery);
    }
    if (filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === filterDifficulty);
    }
    return songs;
  }, [searchQuery, filterDifficulty]);

  const handlePlayNow = (song: Song) => {
    setDifficulty(song.difficulty);
    onSelectSong(song);
  };

  const handleAddToQueue = (song: Song) => {
    if (activeProfileId && playerQueueCount < 3) {
      addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Music Library</h1>
        <p className="text-white/60">Choose from {sampleSongs.length} songs to sing</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            placeholder="Search songs, artists, or genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        
        <div className="flex gap-2">
          {(['all', 'easy', 'medium', 'hard'] as const).map((diff) => (
            <Button
              key={diff}
              variant={filterDifficulty === diff ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterDifficulty(diff)}
              className={filterDifficulty === diff ? 'bg-cyan-500 hover:bg-cyan-400' : 'border-white/20 text-white hover:bg-white/10'}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Song Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSongs.map((song) => (
          <Card 
            key={song.id}
            className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group"
            onClick={() => setSelectedSong(song)}
          >
            <div className="relative aspect-square bg-gradient-to-br from-purple-600 to-blue-600 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <MusicIcon className="w-16 h-16 text-white/30" />
              </div>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button 
                  size="sm" 
                  className="bg-cyan-500 hover:bg-cyan-400"
                  onClick={(e) => { e.stopPropagation(); handlePlayNow(song); }}
                >
                  <PlayIcon className="w-4 h-4 mr-1" /> Play
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/20"
                  onClick={(e) => { e.stopPropagation(); handleAddToQueue(song); }}
                  disabled={!activeProfileId || playerQueueCount >= 3}
                >
                  <QueueIcon className="w-4 h-4 mr-1" /> Queue
                </Button>
              </div>
              <div className="absolute top-2 right-2">
                <Badge className={`${song.difficulty === 'easy' ? 'bg-green-500' : song.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                  {song.difficulty}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-white truncate">{song.title}</h3>
              <p className="text-sm text-white/60 truncate">{song.artist}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIcon key={star} className={`w-4 h-4 ${star <= song.rating ? 'text-yellow-400' : 'text-white/20'}`} filled={star <= song.rating} />
                  ))}
                </div>
                <span className="text-xs text-white/40">{Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Song Detail Modal */}
      {selectedSong && (
        <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedSong.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <MusicIcon className="w-20 h-20 text-white/30" />
              </div>
              <div className="space-y-2">
                <p><span className="text-white/60">Artist:</span> {selectedSong.artist}</p>
                <p><span className="text-white/60">Album:</span> {selectedSong.album}</p>
                <p><span className="text-white/60">Genre:</span> {selectedSong.genre}</p>
                <p><span className="text-white/60">Duration:</span> {Math.floor(selectedSong.duration / 60000)}:{String(Math.floor((selectedSong.duration % 60000) / 1000)).padStart(2, '0')}</p>
                <p><span className="text-white/60">BPM:</span> {selectedSong.bpm}</p>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">Difficulty:</span>
                  <Badge className={`${selectedSong.difficulty === 'easy' ? 'bg-green-500' : selectedSong.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {selectedSong.difficulty}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500" onClick={() => handlePlayNow(selectedSong)}>
                  <PlayIcon className="w-4 h-4 mr-2" /> Play Now
                </Button>
                <Button variant="outline" className="border-white/20 text-white" onClick={() => handleAddToQueue(selectedSong)} disabled={!activeProfileId || playerQueueCount >= 3}>
                  Add to Queue
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ===================== GAME SCREEN =====================
function GameScreen({ onEnd, onBack }: { onEnd: () => void; onBack: () => void }) {
  const { gameState, setSong, setCurrentTime, setDetectedPitch, updatePlayer, endGame, setResults, setGameMode } = useGameStore();
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [scoreEvents, setScoreEvents] = useState<Array<{ type: string; points: number; time: number }>>([]);
  const [volume, setVolume] = useState(0);
  
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const song = gameState.currentSong;
  
  // Audio playback refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayedNoteRef = useRef<string>('');

  // Helper to convert MIDI note to frequency
  const midiToFrequency = (midi: number): number => {
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  // Initialize and start game
  useEffect(() => {
    if (!song) return;
    
    const initGame = async () => {
      const success = await initialize();
      if (success) {
        start();
        // Initialize audio context for playback
        try {
          audioContextRef.current = new AudioContext();
        } catch (e) {
          console.log('Audio context not available');
        }
        // Start countdown
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setIsPlaying(true);
              startTimeRef.current = Date.now();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };
    
    initGame();
    
    return () => {
      stop();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [song, initialize, start, stop]);

  // Check if player hits notes
  const checkNoteHits = useCallback((currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number }) => {
    if (!song || !pitch.frequency || pitch.volume < 0.1) return;
    
    const settings = DIFFICULTY_SETTINGS[gameState.difficulty];
    const activePlayer = gameState.players[0];
    if (!activePlayer) return;
    
    // Find current notes
    for (const line of song.lyrics) {
      for (const note of line.notes) {
        const noteEnd = note.startTime + note.duration;
        
        // Check if we're in the note's time window
        if (currentTime >= note.startTime && currentTime <= noteEnd) {
          const pitchDiff = Math.abs(pitch.note! - note.pitch);
          
          // Check if pitch is within tolerance
          if (pitchDiff <= settings.pitchTolerance) {
            // Score based on accuracy
            const accuracy = 1 - (pitchDiff / (settings.pitchTolerance + 1));
            let points = 0;
            let hitType = 'miss';
            
            if (accuracy > 0.9) {
              points = SCORE_VALUES.perfect * settings.noteScoreMultiplier;
              hitType = 'perfect';
            } else if (accuracy > 0.7) {
              points = SCORE_VALUES.good * settings.noteScoreMultiplier;
              hitType = 'good';
            } else if (accuracy > 0.5) {
              points = SCORE_VALUES.okay * settings.noteScoreMultiplier;
              hitType = 'okay';
            }
            
            // Add combo bonus
            if (points > 0) {
              const newCombo = activePlayer.combo + 1;
              points += Math.floor(newCombo * SCORE_VALUES.comboBonus * (settings.comboMultiplier - 1));
              
              // Golden note bonus
              if (note.isGolden) {
                points += SCORE_VALUES.goldenNoteBonus;
              }
              
              // Bonus note
              if (note.isBonus) {
                points *= 1.5;
              }
              
              updatePlayer(activePlayer.id, {
                score: activePlayer.score + Math.floor(points),
                combo: newCombo,
                maxCombo: Math.max(activePlayer.maxCombo, newCombo),
                notesHit: activePlayer.notesHit + 1,
              });
              
              setScoreEvents(prev => [...prev.slice(-10), { type: hitType, points: Math.floor(points), time: currentTime }]);
            }
          } else {
            // Missed note
            updatePlayer(activePlayer.id, {
              combo: 0,
              notesMissed: activePlayer.notesMissed + 1,
            });
          }
        }
      }
    }
  }, [song, gameState.difficulty, gameState.players, updatePlayer]);

  // Generate results at end
  const generateResults = useCallback(() => {
    const activePlayer = gameState.players[0];
    if (!activePlayer || !song) return;
    
    const totalNotes = song.lyrics.reduce((acc, line) => acc + line.notes.length, 0);
    const accuracy = totalNotes > 0 ? (activePlayer.notesHit / totalNotes) * 100 : 0;
    
    let rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
    if (accuracy >= 95) rating = 'perfect';
    else if (accuracy >= 85) rating = 'excellent';
    else if (accuracy >= 70) rating = 'good';
    else if (accuracy >= 50) rating = 'okay';
    else rating = 'poor';
    
    setResults({
      songId: song.id,
      players: [{
        playerId: activePlayer.id,
        score: activePlayer.score,
        notesHit: activePlayer.notesHit,
        notesMissed: activePlayer.notesMissed,
        accuracy,
        maxCombo: activePlayer.maxCombo,
        rating,
      }],
      playedAt: Date.now(),
      duration: song.duration,
    });
  }, [gameState.players, song, setResults]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || !song) return;

    const playNote = (frequency: number, duration: number) => {
      if (!audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      
      // ADSR envelope for smoother sound
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.1, now + duration / 1000 - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, now + duration / 1000);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
    };

    const gameLoop = () => {
      const elapsed = Date.now() - startTimeRef.current;
      setCurrentTime(elapsed);
      
      // Update volume from pitch detection
      if (pitchResult) {
        setVolume(pitchResult.volume);
        setDetectedPitch(pitchResult.frequency);
        
        // Check for note hits
        checkNoteHits(elapsed, pitchResult);
      }
      
      // Play notes as they become active
      if (audioContextRef.current) {
        for (const line of song.lyrics) {
          for (const note of line.notes) {
            const noteKey = `${note.id}-${note.startTime}`;
            const timeUntilNote = note.startTime - elapsed;
            
            // Play note 500ms before it reaches the sing line
            if (timeUntilNote <= 500 && timeUntilNote > 450 && lastPlayedNoteRef.current !== noteKey) {
              lastPlayedNoteRef.current = noteKey;
              const frequency = midiToFrequency(note.pitch);
              playNote(frequency, Math.min(note.duration, 500));
            }
          }
        }
      }
      
      // Check if song ended
      if (elapsed >= song.duration) {
        endGame();
        generateResults();
        onEnd();
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, song, pitchResult, setCurrentTime, setDetectedPitch, checkNoteHits, endGame, generateResults, onEnd]);

  // Get current lyric line
  const currentLine = useMemo(() => {
    if (!song) return null;
    const currentTime = gameState.currentTime;
    for (const line of song.lyrics) {
      if (currentTime >= line.startTime && currentTime <= line.endTime) {
        return line;
      }
    }
    return null;
  }, [song, gameState.currentTime]);

  // Get upcoming notes
  const visibleNotes = useMemo(() => {
    if (!song) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime;
    const windowEnd = currentTime + 5000; // 5 seconds ahead
    
    const notes: Array<Note & { line: LyricLine }> = [];
    for (const line of song.lyrics) {
      for (const note of line.notes) {
        if (note.startTime >= windowStart && note.startTime <= windowEnd) {
          notes.push({ ...note, line });
        }
      }
    }
    return notes;
  }, [song, gameState.currentTime]);

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song selected</p>
        <Button onClick={onBack}>Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
          ← Back
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-white/20 text-white">
            {gameState.difficulty.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="border-white/20 text-white">
            {gameState.gameMode.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative bg-gradient-to-b from-gray-800/50 to-purple-900/30 rounded-2xl overflow-hidden border border-white/10" style={{ height: '500px' }}>
        {/* Video Background Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <MusicIcon className="w-64 h-64" />
          </div>
        </div>

        {/* Countdown */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <div className="text-9xl font-black text-white animate-pulse">{countdown}</div>
          </div>
        )}

        {/* Note Highway */}
        <div className="absolute inset-0 z-10">
          {/* Pitch Lines */}
          <div className="absolute inset-0">
            {Array.from({ length: 13 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full border-t border-white/5"
                style={{ top: `${(i / 12) * 100}%` }}
              />
            ))}
          </div>

          {/* Sing Line - Vertical on the left side */}
          <div className="absolute left-4 top-0 bottom-0 z-20 w-1">
            <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent" />
            <div className="absolute left-8 top-1/2 transform -translate-y-1/2 text-cyan-400 text-sm font-bold animate-pulse whitespace-nowrap">
              SING →
            </div>
          </div>

          {/* Notes - Moving Right to Left */}
          {visibleNotes.map((note) => {
            const timeUntilNote = note.startTime - gameState.currentTime;
            // Horizontal position: notes come from right (100%) and move to left (0%)
            const x = 100 - (timeUntilNote / 5000) * 100; 
            const pitchY = ((note.pitch - 48) / 24) * 100; // Position based on pitch (vertical)
            const isActive = gameState.currentTime >= note.startTime && gameState.currentTime <= note.startTime + note.duration;
            
            return (
              <div
                key={note.id}
                className={`absolute rounded-xl flex items-center justify-center text-base font-bold text-white transition-all duration-75 ${
                  note.isGolden 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50' 
                    : note.isBonus 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                } ${isActive ? 'ring-4 ring-white scale-125' : ''}`}
                style={{
                  left: `${Math.max(0, Math.min(85, x))}%`,
                  top: `${Math.max(5, Math.min(85, pitchY))}%`,
                  width: `${Math.max(80, note.duration / 25)}px`, // Doubled from /50 to /25
                  height: '52px', // Doubled from h-6 (24px) to 52px
                  boxShadow: isActive ? '0 0 40px rgba(34, 211, 238, 0.8)' : 'none',
                }}
              >
                {note.lyric}
              </div>
            );
          })}

          {/* Detected Pitch Indicator */}
          {pitchResult?.frequency && (
            <div
              className="absolute z-30 w-12 h-12 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 flex items-center justify-center animate-pulse"
              style={{
                left: '4%',
                top: `${Math.max(5, Math.min(90, ((pitchResult.note! - 48) / 24) * 100))}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <MicIcon className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Lyrics Display */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
            {currentLine && (
              <p className="text-3xl font-bold text-center text-white drop-shadow-lg">
                {currentLine.text}
              </p>
            )}
            {song.lyrics[song.lyrics.findIndex(l => l.id === currentLine?.id) + 1] && (
              <p className="text-lg text-center text-white/50 mt-2">
                {song.lyrics[song.lyrics.findIndex(l => l.id === currentLine?.id) + 1]?.text}
              </p>
            )}
          </div>
        </div>

        {/* Volume Meter */}
        <div className="absolute top-4 right-4 z-20">
          <div className="w-4 h-32 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ height: `${volume * 100}%`, marginTop: `${(1 - volume) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Score Display */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-sm text-white/60">Score</div>
            <div className="text-3xl font-bold text-cyan-400">
              {gameState.players[0]?.score?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-sm text-white/60">Combo</div>
            <div className="text-3xl font-bold text-purple-400">
              {gameState.players[0]?.combo || 0}x
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-sm text-white/60">Notes Hit</div>
            <div className="text-3xl font-bold text-green-400">
              {gameState.players[0]?.notesHit || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4">
            <div className="text-sm text-white/60">Progress</div>
            <div className="text-xl font-bold text-white">
              {Math.floor(gameState.currentTime / 60000)}:{String(Math.floor((gameState.currentTime % 60000) / 1000)).padStart(2, '0')}
              <span className="text-white/40"> / {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}</span>
            </div>
            <Progress value={(gameState.currentTime / song.duration) * 100} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Score Events */}
      <div className="fixed bottom-4 right-4 flex flex-col-reverse gap-2 z-50">
        {scoreEvents.slice(-5).map((event, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-lg font-bold text-sm animate-bounce ${
              event.type === 'perfect' ? 'bg-yellow-500 text-black' :
              event.type === 'good' ? 'bg-green-500 text-white' :
              event.type === 'okay' ? 'bg-blue-500 text-white' :
              'bg-gray-500 text-white'
            }`}
          >
            {event.type.toUpperCase()} +{event.points}
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== PARTY SCREEN =====================
function PartyScreen({ onSelectMode }: { onSelectMode: (mode: GameMode) => void }) {
  const partyGames = [
    {
      mode: 'pass-the-mic' as GameMode,
      title: 'Pass the Mic',
      description: 'Take turns singing parts of a song. When the music stops, the next singer takes over!',
      icon: '🎤',
      players: '2-8',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      mode: 'medley' as GameMode,
      title: 'Medley Contest',
      description: 'Sing short snippets of multiple songs in a row. How many can you nail?',
      icon: '🎵',
      players: '1-4',
      color: 'from-purple-500 to-pink-500',
    },
    {
      mode: 'missing-words' as GameMode,
      title: 'Missing Words',
      description: 'Some lyrics disappear! Can you sing the right words at the right time?',
      icon: '📝',
      players: '1-4',
      color: 'from-orange-500 to-red-500',
    },
    {
      mode: 'duel' as GameMode,
      title: 'Duel Mode',
      description: 'Two players sing the same song side by side. Who will score higher?',
      icon: '⚔️',
      players: '2',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      mode: 'blind' as GameMode,
      title: 'Blind Karaoke',
      description: 'Lyrics disappear for certain sections. Can you remember the words?',
      icon: '🙈',
      players: '1-4',
      color: 'from-green-500 to-teal-500',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Party Games</h1>
        <p className="text-white/60">Choose a game mode for your party!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partyGames.map((game) => (
          <Card 
            key={game.mode}
            className={`bg-gradient-to-br ${game.color} border-0 cursor-pointer hover:scale-105 transition-transform`}
            onClick={() => onSelectMode(game.mode)}
          >
            <CardContent className="pt-6">
              <div className="text-5xl mb-4">{game.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-2">{game.title}</h3>
              <p className="text-white/80 mb-4">{game.description}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {game.players} players
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===================== CHARACTER SCREEN =====================
function CharacterScreen() {
  const { profiles, createProfile, updateProfile, deleteProfile, activeProfileId, setActiveProfile } = useGameStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      createProfile(newName.trim(), avatarUrl || undefined);
      setNewName('');
      setAvatarUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Character Creation</h1>
        <p className="text-white/60">Create and manage your singer profiles</p>
      </div>

      {/* Create New Character */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle>Create New Character</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 text-sm text-center">Upload<br/>Photo</span>
                )}
              </button>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            <div className="flex-1 space-y-4">
              <Input
                placeholder="Character name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-gradient-to-r from-cyan-500 to-purple-500">
                Create Character
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Characters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Characters</h2>
        {profiles.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-8 text-center text-white/60">
              No characters yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <Card 
                key={profile.id}
                className={`bg-white/5 border-white/10 cursor-pointer transition-all ${
                  activeProfileId === profile.id ? 'ring-2 ring-cyan-500' : ''
                }`}
                onClick={() => setActiveProfile(profile.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{profile.name}</h3>
                      <div className="flex gap-2 text-sm text-white/60">
                        <span>{profile.gamesPlayed} games</span>
                        <span>•</span>
                        <span>{profile.totalScore.toLocaleString()} pts</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {profile.stats.totalNotesHit} notes hit
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-white/60">
                          {profile.stats.bestCombo} best combo
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== QUEUE SCREEN =====================
function QueueScreen() {
  const { queue, removeFromQueue, reorderQueue, clearQueue, activeProfileId, profiles } = useGameStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Song Queue</h1>
        <p className="text-white/60">Up next: {queue.length} songs in queue (max 3 per player)</p>
      </div>

      {queue.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <QueueIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No songs in queue. Add songs from the library!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {queue.map((item, index) => (
              <Card key={item.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.song.title}</h3>
                    <p className="text-sm text-white/60">{item.song.artist}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: profiles.find(p => p.id === item.playerId)?.color || '#888' }}
                    >
                      {item.playerName[0]}
                    </div>
                    <span className="text-sm text-white/60">{item.playerName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" onClick={clearQueue} className="border-white/20 text-white">
            Clear Queue
          </Button>
        </>
      )}

      {/* Queue Rules */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Queue Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/60">
          <p>• Maximum 3 songs per player at a time</p>
          <p>• Songs play in order they were added</p>
          <p>• You can remove your own songs from the queue</p>
          <p>• Select a character before adding to queue</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== MOBILE SCREEN =====================
function MobileScreen() {
  const [roomCode, setRoomCode] = useState('KARAOKE-' + Math.random().toString(36).substr(2, 6).toUpperCase());
  const [isConnected, setIsConnected] = useState(false);
  
  const connectionUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}?mobile=${roomCode}` 
    : '';
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mobile Integration</h1>
        <p className="text-white/60">Use your smartphone as a microphone or remote control</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Scan to Connect</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-white rounded-xl p-4 inline-block mb-4">
              <img 
                src={generateQRCode(connectionUrl)} 
                alt="QR Code" 
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-white/60 mb-2">Scan this QR code with your phone</p>
            <p className="text-xs text-white/40 break-all">{connectionUrl}</p>
          </CardContent>
        </Card>

        {/* Room Code */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Room Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-bold text-center py-8 bg-white/5 rounded-xl mb-4">
              {roomCode}
            </div>
            <p className="text-sm text-white/60 text-center">
              Enter this code on your mobile device to connect
            </p>
            <Button 
              variant="outline" 
              className="w-full mt-4 border-white/20 text-white"
              onClick={() => setRoomCode('KARAOKE-' + Math.random().toString(36).substr(2, 6).toUpperCase())}
            >
              Generate New Code
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardContent className="pt-6 text-center">
            <MicIcon className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="font-semibold mb-2">Use as Microphone</h3>
            <p className="text-sm text-white/60">Your phone becomes a high-quality wireless microphone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardContent className="pt-6 text-center">
            <LibraryIcon className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="font-semibold mb-2">Browse Library</h3>
            <p className="text-sm text-white/60">Scroll through songs and add to queue from your phone</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardContent className="pt-6 text-center">
            <QueueIcon className="w-12 h-12 mx-auto mb-4 text-orange-400" />
            <h3 className="font-semibold mb-2">Manage Queue</h3>
            <p className="text-sm text-white/60">View and manage the song queue remotely</p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card className="bg-white/5 border-white/10 mt-8">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
              <span>{isConnected ? 'Device Connected' : 'Waiting for device...'}</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/20 text-white"
              onClick={() => setIsConnected(!isConnected)}
            >
              {isConnected ? 'Disconnect' : 'Simulate Connection'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== HIGHSCORE SCREEN =====================
function HighscoreScreen() {
  const { highscores, profiles, activeProfileId } = useGameStore();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  
  const displayHighscores = filter === 'mine' 
    ? highscores.filter(h => h.playerId === activeProfileId)
    : highscores;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          Highscore Leaderboard
        </h1>
        <p className="text-white/60">Top singers and their legendary performances!</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <Button 
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-cyan-500' : 'bg-white/10'}
        >
          All Scores
        </Button>
        <Button 
          onClick={() => setFilter('mine')}
          className={filter === 'mine' ? 'bg-cyan-500' : 'bg-white/10'}
          disabled={!activeProfileId}
        >
          My Scores
        </Button>
      </div>

      {/* Ranking Legend */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Ranking Titles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
            {RANKING_TITLES.slice(0, 10).map((rank) => (
              <div key={rank.minScore} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                <span>{rank.emoji}</span>
                <span className="truncate">{rank.title.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Highscore List */}
      {displayHighscores.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {filter === 'mine' ? "You haven't set any scores yet!" : "No highscores yet. Be the first to sing!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {displayHighscores.slice(0, 50).map((entry, index) => (
            <Card 
              key={entry.id}
              className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors ${
                index < 3 ? 'border-l-4' : ''
              } ${
                index === 0 ? 'border-l-yellow-400' :
                index === 1 ? 'border-l-gray-300' :
                index === 2 ? 'border-l-orange-400' : ''
              }`}
            >
              <CardContent className="p-4 flex items-center gap-4">
                {/* Rank */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>

                {/* Player Info */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                  style={{ backgroundColor: entry.playerColor }}
                >
                  {entry.playerAvatar ? (
                    <img src={entry.playerAvatar} alt={entry.playerName} className="w-full h-full object-cover" />
                  ) : (
                    entry.playerName[0].toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{entry.playerName}</span>
                    <Badge variant="outline" className={`text-xs ${
                      entry.difficulty === 'easy' ? 'border-green-500 text-green-400' :
                      entry.difficulty === 'medium' ? 'border-yellow-500 text-yellow-400' :
                      'border-red-500 text-red-400'
                    }`}>
                      {entry.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-white/60 truncate">{entry.songTitle} - {entry.artist}</p>
                  <p className="text-xs text-white/40">{entry.rankTitle}</p>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</div>
                  <div className="text-sm text-white/60">{entry.accuracy.toFixed(1)}% accuracy</div>
                  <div className="text-xs text-white/40">{entry.maxCombo}x max combo</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== RESULTS SCREEN =====================
function ResultsScreen({ onPlayAgain, onHome }: { onPlayAgain: () => void; onHome: () => void }) {
  const { gameState, resetGame, addHighscore, profiles, activeProfileId } = useGameStore();
  const savedToHighscoreRef = useRef(false);
  const results = gameState.results;
  const song = gameState.currentSong;

  // Save highscore when results are shown (only once)
  useEffect(() => {
    if (results && song && activeProfileId && !savedToHighscoreRef.current) {
      const playerResult = results.players[0];
      const profile = profiles.find(p => p.id === activeProfileId);
      
      if (profile && playerResult) {
        addHighscore({
          playerId: profile.id,
          playerName: profile.name,
          playerAvatar: profile.avatar,
          playerColor: profile.color,
          songId: song.id,
          songTitle: song.title,
          artist: song.artist,
          score: playerResult.score,
          accuracy: playerResult.accuracy,
          maxCombo: playerResult.maxCombo,
          difficulty: gameState.difficulty,
          gameMode: gameState.gameMode,
          rating: playerResult.rating,
        });
        savedToHighscoreRef.current = true;
      }
    }
  }, [results, song, activeProfileId, profiles, addHighscore, gameState.difficulty, gameState.gameMode]);

  if (!results || !song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No results available</p>
        <Button onClick={onHome}>Back to Home</Button>
      </div>
    );
  }

  const playerResult = results.players[0];
  const ratingColors = {
    perfect: 'from-yellow-400 to-orange-500',
    excellent: 'from-green-400 to-cyan-500',
    good: 'from-blue-400 to-purple-500',
    okay: 'from-gray-400 to-gray-500',
    poor: 'from-red-400 to-red-600',
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating]} mb-4`}>
          <h1 className="text-4xl font-black text-white uppercase">{playerResult.rating}!</h1>
        </div>
        <h2 className="text-2xl font-bold text-white">{song.title}</h2>
        <p className="text-white/60">{song.artist}</p>
      </div>

      {/* Score */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardContent className="py-8 text-center">
          <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
            {playerResult.score.toLocaleString()}
          </div>
          <p className="text-white/60">Total Score</p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-400">{playerResult.notesHit}</div>
            <div className="text-sm text-white/60">Notes Hit</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-400">{playerResult.notesMissed}</div>
            <div className="text-sm text-white/60">Notes Missed</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-purple-400">{playerResult.maxCombo}x</div>
            <div className="text-sm text-white/60">Best Combo</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-cyan-400">{playerResult.accuracy.toFixed(1)}%</div>
            <div className="text-sm text-white/60">Accuracy</div>
          </CardContent>
        </Card>
      </div>

      {/* Accuracy Bar */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardContent className="py-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Accuracy</span>
            <span className="text-sm font-semibold">{playerResult.accuracy.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${playerResult.accuracy}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Button onClick={() => { resetGame(); onPlayAgain(); }} className="bg-gradient-to-r from-cyan-500 to-purple-500 px-8">
          Play Again
        </Button>
        <Button variant="outline" onClick={() => { resetGame(); onHome(); }} className="border-white/20 text-white px-8">
          Back to Home
        </Button>
      </div>
    </div>
  );
}
