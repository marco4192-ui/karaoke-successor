'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameStore, selectQueue, selectProfiles, selectActiveProfile } from '@/lib/game/store';
import { getAllSongs, addSong, addSongs, reloadLibrary, getAllSongsAsync } from '@/lib/game/song-library';
import { ImportScreen } from '@/components/import/import-screen';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
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
        {screen === 'library' && <LibraryScreen onSelectSong={(song) => { setSong(song); setScreen('game'); }} initialGameMode={gameState.gameMode} />}
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
  
  // Get song count from library
  const songCount = useMemo(() => {
    return getAllSongs().length;
  }, []);
  
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
            <div className="text-3xl font-bold text-cyan-400">{songCount}</div>
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
function LibraryScreen({ onSelectSong, initialGameMode }: { onSelectSong: (song: Song) => void; initialGameMode?: GameMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0); // For forcing reload
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadedSongs, setLoadedSongs] = useState<Song[]>([]);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles, setGameMode } = useGameStore();
  
  // Load songs asynchronously on mount and when library changes
  useEffect(() => {
    const loadSongs = async () => {
      setSongsLoading(true);
      try {
        const songs = await getAllSongsAsync();
        setLoadedSongs(songs);
      } catch (error) {
        console.error('Failed to load songs:', error);
        // Fallback to sync version
        setLoadedSongs(getAllSongs());
      } finally {
        setSongsLoading(false);
      }
    };
    loadSongs();
  }, [libraryVersion]);
  
  // Song start modal state - use initialGameMode if it's a party mode
  const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel';
  const [startOptions, setStartOptions] = useState<{
    difficulty: Difficulty;
    mode: 'single' | 'duel' | GameMode;
    players: string[];
    partyMode?: GameMode;
  }>({
    difficulty: 'medium',
    mode: initialGameMode === 'duel' ? 'duel' : 'single',
    players: [],
    partyMode: isPartyMode ? initialGameMode : undefined,
  });
  
  // Get library settings from store (persistent)
  const [settings, setSettings] = useState<{
    sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
    sortOrder: 'asc' | 'desc';
    filterDifficulty: Difficulty | 'all';
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('karaoke-library-settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      sortBy: 'title' as const,
      sortOrder: 'asc' as const,
      filterDifficulty: 'all' as const,
    };
  });
  
  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('karaoke-library-settings', JSON.stringify(settings));
  }, [settings]);
  
  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [previewAudio]);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerQueueCount = queue.filter(item => item.playerId === activeProfileId).length;

  // Reload library handler - force fresh load from localStorage
  const handleReloadLibrary = useCallback(async () => {
    setSongsLoading(true);
    setLoadedSongs([]);
    
    // Clear caches in song library
    reloadLibrary();
    
    // Small delay to ensure UI updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Increment version to trigger useEffect reload
    setLibraryVersion(v => v + 1);
  }, []);

  // Preview handlers
  const handlePreviewStart = useCallback((song: Song) => {
    if (!song.audioUrl) return;
    
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Delay before starting preview
    previewTimeoutRef.current = setTimeout(() => {
      // Stop any existing preview
      if (previewAudio) {
        previewAudio.pause();
      }
      
      // Create new audio for preview
      const audio = new Audio();
      audio.volume = 0.3;
      
      // Start from preview time if available
      if (song.preview) {
        audio.currentTime = song.preview.startTime / 1000;
      }
      
      audio.src = song.audioUrl;
      audio.play().catch(() => {});
      
      setPreviewAudio(audio);
      setPreviewSong(song);
    }, 500); // 500ms delay before preview starts
  }, [previewAudio]);
  
  const handlePreviewStop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (previewAudio) {
      previewAudio.pause();
    }
    setPreviewSong(null);
  }, [previewAudio]);

  const filteredSongs = useMemo(() => {
    let songs = loadedSongs;
    
    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      songs = songs.filter(s => 
        s.title.toLowerCase().includes(lowerQuery) ||
        s.artist.toLowerCase().includes(lowerQuery) ||
        s.genre?.toLowerCase().includes(lowerQuery) ||
        s.album?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Difficulty filter
    if (settings.filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === settings.filterDifficulty);
    }
    
    // Sort
    songs = [...songs].sort((a, b) => {
      let comparison = 0;
      switch (settings.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'dateAdded':
          comparison = (b.dateAdded || 0) - (a.dateAdded || 0);
          break;
      }
      return settings.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return songs;
  }, [loadedSongs, searchQuery, settings]);

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    setStartOptions({
      difficulty: song.difficulty,
      mode: initialGameMode === 'duel' ? 'duel' : 'single',
      players: activeProfileId ? [activeProfileId] : [],
      partyMode: isPartyMode ? initialGameMode : undefined,
    });
    setShowSongModal(true);
  };

  const handleStartGame = () => {
    if (!selectedSong) return;
    
    setDifficulty(startOptions.difficulty);
    // Set the game mode - use party mode if available, otherwise use the selected mode
    if (startOptions.partyMode) {
      setGameMode(startOptions.partyMode);
    } else if (startOptions.mode === 'duel') {
      setGameMode('duel');
    } else {
      setGameMode('standard');
    }
    setShowSongModal(false);
    onSelectSong(selectedSong);
  };

  const handleAddToQueue = (song: Song) => {
    if (activeProfileId && playerQueueCount < 3) {
      addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Music Library</h1>
          <p className="text-white/60">
            {songsLoading ? 'Loading songs...' : `${loadedSongs.length} songs available`}
          </p>
        </div>
        <Button 
          onClick={handleReloadLibrary}
          variant="outline"
          disabled={songsLoading}
          className="border-white/20 text-white hover:bg-white/10 flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${songsLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.98 6.58 2.58" />
            <path d="M21 3v6h-6" />
          </svg>
          {songsLoading ? 'Loading...' : 'Reload'}
        </Button>
      </div>

      {/* Loading indicator */}
      {songsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      )}

      {/* Search and Filters - hide while loading */}
      {!songsLoading && (
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
          
          {/* Sort dropdown */}
          <select
            value={`${settings.sortBy}-${settings.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as [typeof settings.sortBy, typeof settings.sortOrder];
              setSettings(prev => ({ ...prev, sortBy, sortOrder }));
            }}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white"
          >
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="artist-asc">Artist (A-Z)</option>
            <option value="artist-desc">Artist (Z-A)</option>
            <option value="dateAdded-desc">Recently Added</option>
          </select>
        </div>
      )}

      {/* Song Grid */}
      {!songsLoading && (
        <>
          {filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No songs found</p>
              <p className="text-white/40 text-sm">Try a different search or import some songs</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredSongs.map((song) => (
            <div 
              key={song.id}
              className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
              onClick={() => handleSongClick(song)}
              onMouseEnter={() => handlePreviewStart(song)}
              onMouseLeave={handlePreviewStop}
            >
              {/* Cover Image */}
              <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
                {song.coverImage ? (
                  <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MusicIcon className="w-16 h-16 text-white/30" />
                  </div>
                )}
                
                {/* Play indicator on hover */}
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${previewSong?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
                    <PlayIcon className="w-7 h-7 text-white ml-1" />
                  </div>
                </div>
                
                {/* Badges */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {song.hasEmbeddedAudio && (
                    <Badge className="bg-purple-500/80 text-xs">Video</Badge>
                  )}
                </div>
                
                {/* Duration */}
                <div className="absolute bottom-2 right-2">
                  <Badge className="bg-black/60 text-xs">
                    {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
                  </Badge>
                </div>
              </div>
              
              {/* Song Info */}
              <div className="p-3">
                <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
                <p className="text-xs text-white/60 truncate">{song.artist}</p>
              </div>
            </div>
          ))}
            </div>
          )}
        </>
      )}

      {/* Song Start Modal */}
      {showSongModal && selectedSong && (
        <Dialog open={showSongModal} onOpenChange={setShowSongModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedSong.title}</DialogTitle>
              <p className="text-white/60">{selectedSong.artist}</p>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Cover Preview */}
              <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30">
                {selectedSong.coverImage ? (
                  <img src={selectedSong.coverImage} alt={selectedSong.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-16 h-16 text-white/30" />
                  </div>
                )}
              </div>
              
              {/* Difficulty Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setStartOptions(prev => ({ ...prev, difficulty: diff }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.difficulty === diff 
                          ? diff === 'easy' ? 'bg-green-500 text-white' 
                            : diff === 'medium' ? 'bg-yellow-500 text-black'
                            : 'bg-red-500 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div className="text-sm font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                      <div className="text-xs opacity-70">
                        {diff === 'easy' ? '±2 Tones' : diff === 'medium' ? '±1 Tone' : 'Exact'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Mode Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Mode</label>
                {startOptions.partyMode ? (
                  // Show party mode info
                  <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {startOptions.partyMode === 'pass-the-mic' ? '🎤' :
                         startOptions.partyMode === 'companion-singalong' ? '📱' :
                         startOptions.partyMode === 'medley' ? '🎵' :
                         startOptions.partyMode === 'missing-words' ? '📝' :
                         startOptions.partyMode === 'blind' ? '🙈' : '🎮'}
                      </span>
                      <div>
                        <div className="font-bold text-white">
                          {startOptions.partyMode === 'pass-the-mic' ? 'Pass the Mic' :
                           startOptions.partyMode === 'companion-singalong' ? 'Companion Sing-A-Long' :
                           startOptions.partyMode === 'medley' ? 'Medley Contest' :
                           startOptions.partyMode === 'missing-words' ? 'Missing Words' :
                           startOptions.partyMode === 'blind' ? 'Blind Karaoke' : startOptions.partyMode}
                        </div>
                        <div className="text-xs text-white/60">Party Mode Active</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular single/duel selection
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, mode: 'single' }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.mode === 'single' 
                          ? 'bg-cyan-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <MicIcon className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm">Single</div>
                    </button>
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duel' }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.mode === 'duel' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="text-lg">⚔️</span>
                      <div className="text-sm">Duel</div>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Player Selection (for Duel mode) */}
              {startOptions.mode === 'duel' && profiles.length >= 2 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select 2 Players</label>
                  <div className="grid grid-cols-2 gap-2">
                    {profiles.slice(0, 4).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          const players = startOptions.players.includes(profile.id)
                            ? startOptions.players.filter(id => id !== profile.id)
                            : startOptions.players.length < 2
                              ? [...startOptions.players, profile.id]
                              : startOptions.players;
                          setStartOptions(prev => ({ ...prev, players }));
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players.includes(profile.id) 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            profile.name[0]
                          )}
                        </div>
                        <span className="text-sm truncate">{profile.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Song Info */}
              <div className="text-xs text-white/40 space-y-1">
                <p>BPM: {selectedSong.bpm} | Duration: {Math.floor(selectedSong.duration / 60000)}:{String(Math.floor((selectedSong.duration % 60000) / 1000)).padStart(2, '0')}</p>
                {selectedSong.genre && <p>Genre: {selectedSong.genre}</p>}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowSongModal(false)}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartGame}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
              >
                <PlayIcon className="w-4 h-4 mr-2" /> Start
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ===================== LYRIC LINE DISPLAY =====================
// Shows lyrics with karaoke-style color progression
function LyricLineDisplay({ line, currentTime, playerColor }: { line: LyricLine; currentTime: number; playerColor: string }) {
  // Build the lyrics with progress coloring
  const renderNotes = () => {
    const elements: React.ReactNode[] = [];
    
    line.notes.forEach((note, idx) => {
      const noteEnd = note.startTime + note.duration;
      const noteProgress = Math.max(0, Math.min(1, (currentTime - note.startTime) / note.duration));
      const isSung = currentTime >= noteEnd;
      const isActive = currentTime >= note.startTime && currentTime < noteEnd;
      
      // Color transition: white -> player color
      let textColor = 'text-white/70'; // Default: dimmed white
      let fontWeight = 'font-normal';
      
      if (isSung) {
        textColor = ''; // Will use player color
        fontWeight = 'font-bold';
      } else if (isActive) {
        textColor = 'text-white';
        fontWeight = 'font-bold';
      }
      
      elements.push(
        <span
          key={note.id}
          className={`relative inline-block transition-all duration-150 ${fontWeight} ${textColor} ${isActive ? 'scale-105' : ''}`}
          style={isSung ? { 
            color: playerColor,
            textShadow: `0 0 15px ${playerColor}80`
          } : isActive ? {
            textShadow: '0 0 10px rgba(255,255,255,0.5)'
          } : {}}
        >
          {note.lyric}
        </span>
      );
      
      // Add space between words (except last)
      if (idx < line.notes.length - 1) {
        elements.push(<span key={`space-${idx}`} className="text-white/50">&nbsp;</span>);
      }
    });
    
    return elements;
  };
  
  return (
    <span className="whitespace-nowrap text-2xl md:text-3xl">
      {renderNotes()}
    </span>
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
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [youtubeTime, setYoutubeTime] = useState(0); // Track YouTube video time
  
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const song = gameState.currentSong;
  
  // Timing synchronization - user adjustable offset (initialized from song)
  const [timingOffset, setTimingOffset] = useState(0);
  
  // Check if video is YouTube
  const videoBackground = song?.videoBackground;
  const youtubeVideoId = videoBackground ? extractYouTubeId(videoBackground) : null;
  const isYouTube = !!youtubeVideoId;
  
  // Sing line position at 25% from left (like UltraStar/Vocaluxe)
  const SING_LINE_POSITION = 25; // percentage from left
  
  // Fixed time window for note display (in milliseconds)
  // This ensures consistent scrolling speed regardless of BPM
  // 4 seconds = 4000ms window for upcoming notes
  const NOTE_WINDOW = 4000; // Fixed 4 second window
  
  // Calculate beat duration for other timing purposes
  const beatDuration = song?.bpm ? 60000 / song.bpm : 500; // ms per beat
  
  // Calculate pitch range dynamically from song notes
  // This ensures all notes are visible within the display area
  const pitchStats = useMemo(() => {
    if (!song || song.lyrics.length === 0) {
      return { minPitch: 48, maxPitch: 72, pitchRange: 24 };
    }
    let minPitch = Infinity;
    let maxPitch = -Infinity;
    for (const line of song.lyrics) {
      for (const note of line.notes) {
        minPitch = Math.min(minPitch, note.pitch);
        maxPitch = Math.max(maxPitch, note.pitch);
      }
    }
    // Add padding (2 semitones on each side)
    const paddedMin = Math.max(0, minPitch - 2);
    const paddedMax = Math.min(127, maxPitch + 2);
    return { 
      minPitch: paddedMin, 
      maxPitch: paddedMax, 
      pitchRange: Math.max(12, paddedMax - paddedMin) // At least 1 octave
    };
  }, [song]);

  // Vertical pitch display constants (percentage of screen)
  // Leave 8% padding at top (for header) and 15% at bottom (for lyrics)
  const VISIBLE_TOP = 8; // percentage from top
  const VISIBLE_BOTTOM = 85; // percentage from bottom
  const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

  // Initialize media elements on mount
  useEffect(() => {
    if (!song) return;
    
    // Pre-load media
    const loadMedia = async () => {
      setMediaLoaded(false);
      
      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      setMediaLoaded(true);
    };
    
    loadMedia();
  }, [song]);

  // Initialize and start game
  useEffect(() => {
    if (!song || !mediaLoaded) return;
    
    const initGame = async () => {
      const success = await initialize();
      if (success) {
        start();
        // Start countdown
        setCountdown(3);
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              setIsPlaying(true);
              startTimeRef.current = Date.now();
              
              // Start audio/video playback with user interaction context
              const playMedia = async () => {
                try {
                  // Calculate start position from #START tag (in milliseconds)
                  const startPosition = (song.start || 0) / 1000; // Convert to seconds
                  
                  // For video with embedded audio
                  if (song.hasEmbeddedAudio && videoRef.current) {
                    videoRef.current.currentTime = startPosition;
                    await videoRef.current.play();
                  }
                  // For separate audio file
                  else if (audioRef.current) {
                    audioRef.current.currentTime = startPosition;
                    await audioRef.current.play();
                  }
                  // Video without audio (background only)
                  if (videoRef.current && !song.hasEmbeddedAudio) {
                    // Apply videoGap: positive = video starts after audio, so skip ahead in video
                    const videoGapSeconds = (song.videoGap || 0) / 1000;
                    videoRef.current.currentTime = Math.max(0, startPosition - videoGapSeconds);
                    videoRef.current.play().catch(() => {});
                  }
                } catch (e) {
                  console.log('Media playback failed:', e);
                }
              };
              playMedia();
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
      // Stop audio/video on cleanup
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    };
  }, [song, mediaLoaded, initialize, start, stop]);

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
    
    // Get the start position from #START tag (in milliseconds)
    const startPositionMs = song.start || 0;

    const gameLoop = () => {
      // Use media's currentTime for accurate sync
      let elapsed: number;
      
      // For YouTube videos, use tracked time from player
      if (isYouTube && youtubeTime > 0) {
        elapsed = youtubeTime;
      }
      // For video with embedded audio - video IS the audio source
      else if (song.hasEmbeddedAudio && videoRef.current && !videoRef.current.paused) {
        elapsed = videoRef.current.currentTime * 1000; // Convert to ms
      }
      // For separate audio file - only use if audio is playing
      else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsed = audioRef.current.currentTime * 1000; // Convert to ms
      }
      // Fallback to system time (less accurate) - account for start position
      else {
        // Add start position to fallback time so notes are in correct position
        elapsed = (Date.now() - startTimeRef.current) + startPositionMs;
      }
      
      // Apply user-adjustable timing offset
      const adjustedTime = elapsed + timingOffset;
      
      setCurrentTime(adjustedTime);
      
      // Update volume from pitch detection
      if (pitchResult) {
        setVolume(pitchResult.volume);
        setDetectedPitch(pitchResult.frequency);
        
        // Check for note hits
        checkNoteHits(adjustedTime, pitchResult);
      }
      
      // Check if song ended
      if (adjustedTime >= song.duration) {
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
  }, [isPlaying, song, pitchResult, setCurrentTime, setDetectedPitch, checkNoteHits, endGame, generateResults, onEnd, isYouTube, youtubeTime, timingOffset]);

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

  // Get upcoming notes - show notes within the visible window
  const visibleNotes = useMemo(() => {
    if (!song) return [];
    const currentTime = gameState.currentTime;
    const windowStart = currentTime - 1000; // 1 second behind (for smooth exit)
    const windowEnd = currentTime + NOTE_WINDOW; // 4 seconds ahead
    
    const notes: Array<Note & { line: LyricLine }> = [];
    for (const line of song.lyrics) {
      for (const note of line.notes) {
        const noteEnd = note.startTime + note.duration;
        // Show notes that overlap with our visibility window
        if (note.startTime <= windowEnd && noteEnd >= windowStart) {
          notes.push({ ...note, line });
        }
      }
    }
    return notes;
  }, [song, gameState.currentTime, NOTE_WINDOW]);

  if (!song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song selected</p>
        <Button onClick={onBack} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Library</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <Button variant="ghost" onClick={onBack} className="text-white/80 hover:text-white hover:bg-white/10">
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          {/* Timing Sync Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-white/40">Sync:</span>
            <button 
              onClick={() => {
                const newOffset = timingOffset - 50;
                setTimingOffset(newOffset);
                if (song) updateSong(song.id, { timingOffset: newOffset });
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white"
            >
              -
            </button>
            <span className={`font-mono ${timingOffset !== 0 ? 'text-yellow-400' : 'text-white/60'}`}>
              {timingOffset > 0 ? '+' : ''}{timingOffset}ms
            </span>
            <button 
              onClick={() => {
                const newOffset = timingOffset + 50;
                setTimingOffset(newOffset);
                if (song) updateSong(song.id, { timingOffset: newOffset });
              }}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white"
            >
              +
            </button>
            {timingOffset !== 0 && (
              <button 
                onClick={() => {
                  setTimingOffset(0);
                  if (song) updateSong(song.id, { timingOffset: 0 });
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white/60"
              >
                Reset
              </button>
            )}
          </div>
          {/* Mini Score Display */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold">{gameState.players[0]?.score?.toLocaleString() || 0}</span>
              <span className="text-white/40">pts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-purple-400 font-bold">{gameState.players[0]?.combo || 0}x</span>
              <span className="text-white/40">combo</span>
            </div>
          </div>
          <Badge variant="outline" className="border-white/20 text-white/80">
            {gameState.difficulty.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Audio Element - Always render if audioUrl exists */}
      {song.audioUrl && (
        <audio 
          ref={audioRef}
          src={song.audioUrl}
          className="hidden"
          onEnded={() => {
            endGame();
            generateResults();
            onEnd();
          }}
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Video Background */}
        {isYouTube && youtubeVideoId ? (
          <YouTubePlayer
            videoId={youtubeVideoId}
            videoGap={song.videoGap || 0}
            onReady={() => console.log('YouTube ready')}
            onTimeUpdate={(time) => setYoutubeTime(time)}
            onEnded={() => {
              endGame();
              generateResults();
              onEnd();
            }}
            isPlaying={isPlaying}
            startTime={0}
          />
        ) : song.videoBackground ? (
          <video
            ref={videoRef}
            src={song.videoBackground}
            className="absolute inset-0 w-full h-full object-cover"
            muted={song.hasEmbeddedAudio ? false : true}
            playsInline
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <MusicIcon className="w-64 h-64" />
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="text-9xl font-black text-white animate-pulse drop-shadow-2xl">{countdown}</div>
          </div>
        )}

        {/* Dark Overlay for better note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

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

          {/* Sing Line - Vertical marker at 25% from left (like UltraStar/Vocaluxe) */}
          <div 
            className="absolute top-0 bottom-0 z-20 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
            style={{ left: `${SING_LINE_POSITION}%` }}
          >
            <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-white/20" />
            <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-cyan-400 text-xs font-bold whitespace-nowrap">
              SING
            </div>
          </div>

          {/* Notes - Smoothly Moving Right to Left (UltraStar style) */}
          {visibleNotes.map((note) => {
            const timeUntilNote = note.startTime - gameState.currentTime;
            const noteEnd = note.startTime + note.duration;
            const timeUntilEnd = noteEnd - gameState.currentTime;
            const isActive = gameState.currentTime >= note.startTime && gameState.currentTime <= noteEnd;
            
            // Calculate smooth horizontal position (UltraStar/Vocaluxe style)
            // Notes appear from right (100%+) and move to left
            // A note is at SING_LINE_POSITION when timeUntilNote = 0
            // 
            // When timeUntilNote = NOTE_WINDOW (8s): note at right edge (120%)
            // When timeUntilNote = 0: note at sing line (SING_LINE_POSITION %)
            // When timeUntilNote < 0: note continues left past sing line
            
            const distanceFromSingLine = (timeUntilNote / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
            const x = SING_LINE_POSITION + distanceFromSingLine;
            
            // Position based on pitch (vertical) - use dynamic range from song
            // Higher pitch = higher on screen = lower Y value
            const pitchY = VISIBLE_TOP + VISIBLE_RANGE - ((note.pitch - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE;
            
            // Note width based on duration (as percentage of screen)
            // Scaled to the dynamic NOTE_WINDOW
            const noteWidthPercent = (note.duration / NOTE_WINDOW) * (100 - SING_LINE_POSITION + 20);
            const noteHeight = 32;
            
            return (
              <div
                key={note.id}
                className={`absolute rounded-md ${
                  note.isGolden 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50' 
                    : note.isBonus 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                } ${isActive ? 'ring-2 ring-white/80 brightness-125' : ''}`}
                style={{
                  left: `${x}%`,
                  top: `${pitchY}%`,
                  width: `${noteWidthPercent}%`,
                  height: `${noteHeight}px`,
                  transform: 'translateY(-50%)',
                  boxShadow: isActive ? '0 0 20px rgba(34, 211, 238, 0.6)' : 'none',
                  opacity: x > 120 || x < -30 ? 0 : 1,
                }}
              />
            );
          })}

          {/* Detected Pitch Indicator - Ball that moves up/down with voice */}
          {pitchResult?.frequency && pitchResult.note && (
            <div
              className="absolute z-30 w-10 h-10 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/50 flex items-center justify-center"
              style={{
                left: `${SING_LINE_POSITION - 2}%`,
                top: `${VISIBLE_TOP + VISIBLE_RANGE - ((pitchResult.note - pitchStats.minPitch) / pitchStats.pitchRange) * VISIBLE_RANGE}%`,
                transform: 'translateY(-50%)',
              }}
            >
              <MicIcon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Lyrics Display - Karaoke style with color progression */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
            {currentLine && (
              <div className="text-3xl font-bold text-center drop-shadow-lg">
                <LyricLineDisplay 
                  line={currentLine} 
                  currentTime={gameState.currentTime} 
                  playerColor={PLAYER_COLORS[0]}
                />
              </div>
            )}
            {(() => {
              const nextLineIndex = song.lyrics.findIndex(l => l.id === currentLine?.id) + 1;
              const nextLine = song.lyrics[nextLineIndex];
              if (!nextLine) return null;
              // Join notes with spaces for proper display
              const nextLineText = nextLine.notes.map(n => n.lyric).join(' ');
              return (
                <p className="text-lg text-center text-white/50 mt-2">
                  {nextLineText}
                </p>
              );
            })()}
          </div>
        </div>

        {/* Volume Meter */}
        <div className="absolute top-16 right-4 z-20">
          <div className="w-3 h-24 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="w-full bg-gradient-to-t from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
              style={{ height: `${volume * 100}%`, marginTop: `${(1 - volume) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Progress Bar - Full Width Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            style={{ width: `${(gameState.currentTime / song.duration) * 100}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
          {Math.floor(gameState.currentTime / 60000)}:{String(Math.floor((gameState.currentTime % 60000) / 1000)).padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
        </div>
      </div>

      {/* Score Events */}
      <div className="fixed bottom-20 right-4 flex flex-col-reverse gap-2 z-50">
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
      mode: 'companion-singalong' as GameMode,
      title: 'Companion Sing-A-Long',
      description: 'Your phone randomly lights up - that\'s your cue to sing! No one knows who\'s next until the blink!',
      icon: '📱',
      players: '2-8',
      color: 'from-emerald-500 to-teal-500',
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
        <Button onClick={onHome} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">Back to Home</Button>
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
