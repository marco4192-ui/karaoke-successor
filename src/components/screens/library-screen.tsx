'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, Difficulty, GameMode } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, getAllSongsAsync, restoreSongUrls, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { 
  getPlaylists, 
  createPlaylist, 
  deletePlaylist, 
  addSongToPlaylist, 
  removeSongFromPlaylist, 
  getPlaylistSongs,
  getPlaylistById,
  toggleFavorite,
  initializePlaylists,
  Playlist
} from '@/lib/playlist-manager';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { SongHighscoreModal } from './results-screen';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';

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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

// ===================== CREATE PLAYLIST FORM =====================
function CreatePlaylistForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  const handleSubmit = () => {
    if (!name.trim()) return;
    createPlaylist(name.trim(), description.trim() || undefined);
    onSuccess();
  };
  
  return (
    <div className="space-y-4 py-4">
      <div>
        <label className="text-sm text-white/60 mb-2 block">Playlist Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Awesome Playlist"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          autoFocus
        />
      </div>
      <div>
        <label className="text-sm text-white/60 mb-2 block">Description (optional)</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this playlist about?"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="border-white/20 text-white hover:bg-white/10"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
        >
          Create Playlist
        </Button>
      </div>
    </div>
  );
}

// ===================== LIBRARY SCREEN =====================
// View modes for the library
type LibraryViewMode = 'grid' | 'folder' | 'playlists';
type LibraryGroupBy = 'none' | 'artist' | 'title' | 'genre' | 'language' | 'folder';

// Song Card Component
function SongCard({ 
  song, 
  previewSong, 
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs 
}: { 
  song: Song;
  previewSong: Song | null;
  onSongClick: (song: Song) => void;
  onPreviewStart: (song: Song) => void;
  onPreviewStop: () => void;
  previewVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
}) {
  return (
    <div 
      className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
      onClick={() => onSongClick(song)}
      onMouseEnter={() => onPreviewStart(song)}
      onMouseLeave={onPreviewStop}
    >
      {/* Cover Image / Video Preview */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
        {/* Static Cover Image */}
        {song.coverImage && (
          <img 
            src={song.coverImage} 
            alt={song.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {/* Video Preview - Local Video */}
        {song.videoBackground && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={song.videoBackground}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id ? 'opacity-100' : 'opacity-0'
            }`}
            // Mute only if there's a separate audio file; unmute for videos with embedded audio
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            loop
            playsInline
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {/* Video Preview - YouTube */}
        {song.youtubeUrl && previewSong?.id === song.id && (
          <div className="absolute inset-0 w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(song.youtubeUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(song.youtubeUrl)}&controls=0&showinfo=0&rel=0&modestbranding=1&start=${Math.floor((song.preview?.startTime || 0) / 1000)}`}
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        )}
        
        {/* Fallback Music Icon */}
        {!song.coverImage && !song.videoBackground && !song.youtubeUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        {/* Play indicator on hover - only show if no video */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 
          previewSong?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
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
  );
}

// Helper function to get the first letter group for folder view
function getLetterGroup(name: string): string {
  if (!name) return '#';
  const firstChar = name.trim().charAt(0).toUpperCase();
  
  // Check if starts with "The "
  if (name.trim().toLowerCase().startsWith('the ')) {
    return 'The';
  }
  
  // Check if it's a letter A-Z
  if (firstChar >= 'A' && firstChar <= 'Z') {
    return firstChar;
  }
  
  // Everything else goes to #
  return '#';
}

// Helper function to group songs
function groupSongs(songs: Song[], groupBy: LibraryGroupBy): Map<string, Song[]> {
  const groups = new Map<string, Song[]>();
  
  songs.forEach(song => {
    let key: string;
    
    switch (groupBy) {
      case 'artist':
        key = getLetterGroup(song.artist);
        break;
      case 'title':
        key = getLetterGroup(song.title);
        break;
      case 'genre':
        key = song.genre || 'Unknown';
        break;
      case 'language':
        key = song.language || 'unknown';
        break;
      case 'folder':
        // Get the TOP-LEVEL folder only (parent folder of the song's folder)
        // Songs are typically in: BaseFolder/ArtistFolder/SongFolder/song.txt
        // We want to show only: ArtistFolder (the first level after base)
        if (song.folderPath) {
          const parts = song.folderPath.split('/').filter(p => p.length > 0);
          // Only show the first subfolder level (not the song's immediate folder)
          // If path is "Artist/Album/Song", show "Artist"
          // If path is "Artist/Song", show "Artist"
          // If path is "Song", show "Root"
          if (parts.length >= 2) {
            // Skip the last part (song folder) and take the first meaningful parent
            key = parts[0];
          } else if (parts.length === 1) {
            // Single folder - could be an artist folder with songs directly
            key = parts[0];
          } else {
            key = 'Root';
          }
        } else if (song.storageFolder) {
          // For storage folder, extract top-level folder
          const parts = song.storageFolder.split('/').filter(p => p.length > 0);
          key = parts.length > 0 ? parts[0] : 'Root';
        } else {
          key = 'Root';
        }
        break;
      default:
        key = 'All';
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(song);
  });
  
  return groups;
}

// Get sorted folder keys
function getSortedFolderKeys(groups: Map<string, Song[]>, groupBy: LibraryGroupBy): string[] {
  const keys = Array.from(groups.keys());
  
  if (groupBy === 'artist' || groupBy === 'title') {
    // Sort: A-Z first, then "The", then "#"
    return keys.sort((a, b) => {
      if (a === '#' && b !== '#') return 1;
      if (b === '#' && a !== '#') return -1;
      if (a === 'The' && b !== 'The' && b !== '#') return 1;
      if (b === 'The' && a !== 'The' && a !== '#') return -1;
      return a.localeCompare(b);
    });
  }
  
  return keys.sort((a, b) => a.localeCompare(b));
}

export function LibraryScreen({ onSelectSong, initialGameMode }: { onSelectSong: (song: Song) => void; initialGameMode?: GameMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [highscoreSong, setHighscoreSong] = useState<Song | null>(null);
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadedSongs, setLoadedSongs] = useState<Song[]>([]);
  // Custom YouTube background video state
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles, setGameMode, highscores, setActiveProfile, addPlayer } = useGameStore();
  
  // Get global difficulty from store for initialization
  const storeDifficulty = gameState.difficulty;
  
  // New view mode state
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [groupBy, setGroupBy] = useState<LibraryGroupBy>('none');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<string[]>([]);
  
  // Playlist state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  
  // Initialize playlists on mount
  useEffect(() => {
    initializePlaylists();
    setPlaylists(getPlaylists());
  }, []);
  
  // Refresh playlists when viewMode changes to playlists
  useEffect(() => {
    if (viewMode === 'playlists') {
      setPlaylists(getPlaylists());
      // Update favorite song IDs
      const favs = new Set<string>();
      const allPlaylists = getPlaylists();
      const favorites = allPlaylists.find(p => p.id === 'system-favorites');
      if (favorites) {
        favorites.songIds.forEach(id => favs.add(id));
      }
      setFavoriteSongIds(favs);
    }
  }, [viewMode]);
  
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
  const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel' && initialGameMode !== 'duet';
  const [startOptions, setStartOptions] = useState<{
    difficulty: Difficulty;
    mode: 'single' | 'duel' | 'duet' | GameMode;
    players: string[];
    partyMode?: GameMode;
  }>({
    difficulty: storeDifficulty, // Initialize with global store difficulty
    mode: initialGameMode === 'duel' ? 'duel' : initialGameMode === 'duet' ? 'duet' : 'single',
    players: [],
    partyMode: isPartyMode ? initialGameMode : undefined,
  });
  
  // Sync with store difficulty when it changes
  useEffect(() => {
    setStartOptions(prev => ({ ...prev, difficulty: storeDifficulty }));
  }, [storeDifficulty]);
  
  // Load default difficulty from localStorage after mount (fallback if store not hydrated)
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-default-difficulty');
    if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
      // Only use localStorage if store hasn't been hydrated yet
      if (storeDifficulty === 'medium') {
        setStartOptions(prev => ({ ...prev, difficulty: saved }));
      }
    }
  }, [storeDifficulty]);
  
  // Get library settings from store (persistent) - initialize with defaults to avoid hydration mismatch
  const [settings, setSettings] = useState<{
    sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
    sortOrder: 'asc' | 'desc';
    filterDifficulty: Difficulty | 'all';
    filterGenre: string;
    filterLanguage: string;
    filterDuet: boolean;
  }>({
    sortBy: 'title' as const,
    sortOrder: 'asc' as const,
    filterDifficulty: 'all' as const,
    filterGenre: 'all',
    filterLanguage: 'all',
    filterDuet: false,
  });

  // Load settings from localStorage after mount
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-library-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);
  
  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('karaoke-library-settings', JSON.stringify(settings));
  }, [settings]);
  
  // Listen for difficulty changes from settings
  useEffect(() => {
    const handleDifficultyChange = () => {
      const saved = localStorage.getItem('karaoke-default-difficulty');
      if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
        setStartOptions(prev => ({
          ...prev,
          difficulty: saved as Difficulty
        }));
      }
    };
    window.addEventListener('storage', handleDifficultyChange);
    window.addEventListener('settingsChange', handleDifficultyChange);
    return () => {
      window.removeEventListener('storage', handleDifficultyChange);
      window.removeEventListener('settingsChange', handleDifficultyChange);
    };
  }, []);
  
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

  // Preview handlers
  const handlePreviewStart = useCallback((song: Song) => {
    // Allow preview even without audioUrl if there's video
    if (!song.audioUrl && !song.videoBackground && !song.youtubeUrl) return;
    
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
      
      // Stop all existing videos first
      previewVideoRefs.current.forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
      
      // Create new audio for preview (if audio exists)
      if (song.audioUrl) {
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Start from preview time if available
        if (song.preview) {
          audio.currentTime = song.preview.startTime / 1000;
        }
        
        audio.src = song.audioUrl;
        audio.play().catch(() => {});
        
        setPreviewAudio(audio);
      }
      
      // Start video preview (if local video exists)
      if (song.videoBackground) {
        const videoEl = previewVideoRefs.current.get(song.id);
        if (videoEl) {
          // Set start time from preview if available
          if (song.preview) {
            videoEl.currentTime = song.preview.startTime / 1000;
          }
          // For videos with embedded audio, unmute the video
          if (song.hasEmbeddedAudio && !song.audioUrl) {
            videoEl.muted = false;
          }
          videoEl.play().catch(() => {});
        }
      }
      
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
    // Stop all preview videos
    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
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
    
    // Genre filter - reads from #Genre: tag in txt files
    if (settings.filterGenre && settings.filterGenre !== 'all') {
      songs = songs.filter(s => s.genre === settings.filterGenre);
    }
    
    // Language filter - reads from #Language: tag in txt files
    if (settings.filterLanguage && settings.filterLanguage !== 'all') {
      songs = songs.filter(s => s.language === settings.filterLanguage);
    }
    
    // Duet filter - show only duet songs when enabled
    if (settings.filterDuet) {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
    }
    
    // Duet mode filter - show only duet-compatible songs when in duet mode (NOT duel mode)
    // Duet mode: Two players sing different parts (need duet songs)
    // Duel mode: Two players compete on the same song (any song works)
    if (startOptions.mode === 'duet') {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
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
  }, [loadedSongs, searchQuery, settings, startOptions.mode]);
  
  // Get unique genres from loaded songs (read from #Genre: in txt files)
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [loadedSongs]);
  
  // Get unique languages from loaded songs (read from #Language: in txt files)
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.language) langSet.add(s.language);
    });
    return ['all', ...Array.from(langSet).sort()];
  }, [loadedSongs]);
  
  // Group songs for folder view
  const groupedSongs = useMemo(() => {
    if (groupBy === 'none' || viewMode === 'grid') {
      return new Map<string, Song[]>();
    }
    return groupSongs(filteredSongs, groupBy);
  }, [filteredSongs, groupBy, viewMode]);
  
  // Get songs for current folder
  const currentFolderSongs = useMemo(() => {
    if (!currentFolder || groupBy === 'none') {
      return filteredSongs;
    }
    return groupedSongs.get(currentFolder) || [];
  }, [currentFolder, groupBy, filteredSongs, groupedSongs]);
  
  // Get display name for a group key
  const getGroupDisplayName = (key: string): string => {
    if (groupBy === 'language') {
      return LANGUAGE_NAMES[key] || key;
    }
    return key;
  };
  
  // Handle folder navigation
  const handleOpenFolder = (folder: string) => {
    setCurrentFolder(folder);
    setFolderBreadcrumb(prev => [...prev, folder]);
  };
  
  const handleBackFolder = () => {
    setFolderBreadcrumb(prev => prev.slice(0, -1));
    setCurrentFolder(folderBreadcrumb.length > 1 ? folderBreadcrumb[folderBreadcrumb.length - 2] : null);
  };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderBreadcrumb([]);
    } else {
      setCurrentFolder(folderBreadcrumb[index]);
      setFolderBreadcrumb(folderBreadcrumb.slice(0, index + 1));
    }
  };

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

  const handleStartGame = async () => {
    if (!selectedSong) return;
    
    // CRITICAL: Load the song with lyrics from IndexedDB or file system
    // This ensures lyrics are available even if they were cleared in localStorage
    let songWithLyrics = await getSongByIdWithLyrics(selectedSong.id);
    if (!songWithLyrics) {
      songWithLyrics = selectedSong; // Fallback to selected song
    }
    
    // CRITICAL: Ensure the song has valid media URLs before passing to game screen
    // This is necessary because blob URLs don't persist across app restarts
    let songWithUrls = songWithLyrics;
    
    // Check if any URLs need to be restored (audio, video, or cover)
    const needsUrlRestore = 
      (selectedSong.relativeAudioPath && !songWithLyrics.audioUrl) ||
      (selectedSong.relativeVideoPath && !songWithLyrics.videoBackground) ||
      (selectedSong.relativeCoverPath && !songWithLyrics.coverImage);
    
    if (needsUrlRestore) {
      console.log('[LibraryScreen] Restoring URLs for song:', selectedSong.title, {
        hasAudio: !!songWithLyrics.audioUrl,
        hasVideo: !!songWithLyrics.videoBackground,
        hasCover: !!songWithLyrics.coverImage,
        relAudio: selectedSong.relativeAudioPath,
        relVideo: selectedSong.relativeVideoPath,
        relCover: selectedSong.relativeCoverPath,
      });
      songWithUrls = await restoreSongUrls(songWithLyrics);
      console.log('[LibraryScreen] URLs restored:', {
        audioUrl: !!songWithUrls.audioUrl,
        videoBackground: !!songWithUrls.videoBackground,
        coverImage: !!songWithUrls.coverImage,
      });
    }
    
    // Check if player selection is required (multiple active profiles)
    const activeProfiles = profiles.filter(p => p.isActive !== false);
    const needsPlayerSelection = activeProfiles.length > 1;
    
    // For single mode with multiple profiles, ensure a player is selected
    if (startOptions.mode === 'single' && !startOptions.partyMode && needsPlayerSelection) {
      if (startOptions.players.length === 0) {
        return; // No player selected
      }
      // Set the selected player as active
      setActiveProfile(startOptions.players[0]);
    }
    
    // For duel mode, ensure 2 players are selected
    if (startOptions.mode === 'duel' && startOptions.players.length < 2) {
      return;
    }
    
    // For duet mode, need 2 players as well
    if (startOptions.mode === 'duet' && startOptions.players.length < 2) {
      return;
    }
    
    // For party modes, add all selected players to the game
    if (startOptions.partyMode && startOptions.players.length > 0) {
      // Clear existing players first by resetting game state
      // Then add all selected players
      startOptions.players.forEach((playerId) => {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      });
    } else if (startOptions.mode === 'single') {
      // CRITICAL FIX: For single-player mode, ensure exactly one player is added
      // Use the selected player, active profile, or create a default player
      const playerId = startOptions.players[0] || activeProfileId;
      if (playerId) {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      }
      // If still no player, the game screen will create a default player
    } else if ((startOptions.mode === 'duel' || startOptions.mode === 'duet') && startOptions.players.length >= 2) {
      // For duel/duet mode, add both players
      startOptions.players.forEach((playerId) => {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      });
    }
    
    setDifficulty(startOptions.difficulty);
    // Set the game mode - use party mode if available, otherwise use the selected mode
    if (startOptions.partyMode) {
      setGameMode(startOptions.partyMode);
    } else if (startOptions.mode === 'duel') {
      setGameMode('duel');
    } else if (startOptions.mode === 'duet') {
      setGameMode('duet');
    } else {
      setGameMode('standard');
    }
    setShowSongModal(false);
    
    // Pass song with custom YouTube background if set
    if (customYoutubeId) {
      onSelectSong({
        ...songWithUrls,
        videoBackground: `https://www.youtube.com/watch?v=${customYoutubeId}`,
        youtubeId: customYoutubeId,
      });
    } else {
      onSelectSong(songWithUrls);
    }
  };

  const handleAddToQueue = (song: Song) => {
    if (activeProfileId && playerQueueCount < 3) {
      addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Music Library</h1>
        <p className="text-white/60">
          {songsLoading ? 'Loading songs...' : `${loadedSongs.length} songs available`}
        </p>
      </div>

      {/* Loading indicator */}
      {songsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      )}

      {/* Search and Filters */}
      {!songsLoading && (
        <div className="space-y-4 mb-6">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                id="song-search"
                name="song-search"
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
              className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="title-asc" className="bg-gray-800 text-white">Title (A-Z)</option>
              <option value="title-desc" className="bg-gray-800 text-white">Title (Z-A)</option>
              <option value="artist-asc" className="bg-gray-800 text-white">Artist (A-Z)</option>
              <option value="artist-desc" className="bg-gray-800 text-white">Artist (Z-A)</option>
              <option value="dateAdded-desc" className="bg-gray-800 text-white">Recently Added</option>
            </select>
          </div>
          
          {/* Filter Row - Genre, Language, and Duet in same row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Genre Filter - reads from #Genre: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🎸 Genre:</span>
              <select
                value={settings.filterGenre || 'all'}
                onChange={(e) => setSettings(prev => ({ ...prev, filterGenre: e.target.value }))}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
                ))}
              </select>
            </div>
            
            {/* Language Filter - reads from #Language: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🌍 Language:</span>
              <select
                value={settings.filterLanguage || 'all'}
                onChange={(e) => setSettings(prev => ({ ...prev, filterLanguage: e.target.value }))}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableLanguages.map(l => (
                  <option key={l} value={l} className="bg-gray-800 text-white">{l === 'all' ? 'All Languages' : (LANGUAGE_NAMES[l] || l)}</option>
                ))}
              </select>
            </div>
            
            {/* Duet Filter Toggle - in same row as other filters */}
            <button
              onClick={() => setSettings(prev => ({ ...prev, filterDuet: !prev.filterDuet }))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                settings.filterDuet 
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>🎭</span>
              <span>Duet</span>
            </button>
            
            {/* Active Filters Display */}
            {(settings.filterGenre !== 'all' || settings.filterLanguage !== 'all' || settings.filterDuet) && (
              <button
                onClick={() => setSettings(prev => ({ ...prev, filterGenre: 'all', filterLanguage: 'all', filterDuet: false }))}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                ✕ Clear filters
              </button>
            )}
          </div>
          
          {/* View Mode and Group By Options */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => { setViewMode('grid'); setGroupBy('none'); setCurrentFolder(null); setFolderBreadcrumb([]); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' && groupBy === 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Grid
                </div>
              </button>
              <button
                onClick={() => { setViewMode('playlists'); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'playlists' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  Playlists
                </div>
              </button>
            </div>
            
            <span className="text-white/30">|</span>
            
            {/* Group By Options */}
            <span className="text-white/40 text-sm">Group by:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'artist', label: 'Artist A-Z', icon: '🎤' },
                { value: 'title', label: 'Title A-Z', icon: '🎵' },
                { value: 'genre', label: 'Genre', icon: '🎸' },
                { value: 'language', label: 'Language', icon: '🌍' },
                { value: 'folder', label: 'Folder', icon: '📁' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setViewMode('folder');
                    setGroupBy(option.value as LibraryGroupBy);
                    setCurrentFolder(null);
                    setFolderBreadcrumb([]);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    groupBy === option.value && viewMode === 'folder' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          {viewMode === 'folder' && folderBreadcrumb.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                All
              </button>
              {folderBreadcrumb.map((folder, index) => (
                <React.Fragment key={index}>
                  <span className="text-white/30">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`transition-colors ${
                      index === folderBreadcrumb.length - 1 
                        ? 'text-white font-medium' 
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    {getGroupDisplayName(folder)}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Song Grid or Folder View or Playlist View */}
      {!songsLoading && (
        <>
          {viewMode === 'playlists' ? (
            // Playlist View
            <div className="space-y-6">
              {/* Back button if viewing playlist songs */}
              {selectedPlaylist && (
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Playlists
                </button>
              )}
              
              {!selectedPlaylist ? (
                // Show all playlists
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      {playlists.length} Playlist{playlists.length !== 1 ? 's' : ''}
                    </h2>
                    <Button
                      onClick={() => setShowCreatePlaylistModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Playlist
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {playlists.map((playlist) => {
                      const playlistSongs = getPlaylistSongs(playlist.id, loadedSongs);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => setSelectedPlaylist(playlist)}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-left group relative"
                        >
                          {/* System playlist badge */}
                          {playlist.isSystem && (
                            <div className="absolute top-2 right-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                              System
                            </div>
                          )}
                          
                          {/* Cover Image */}
                          <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center">
                            {playlistSongs.length > 0 && playlistSongs[0].coverImage ? (
                              <img src={playlistSongs[0].coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MusicIcon className="w-12 h-12 text-white/30" />
                            )}
                          </div>
                          
                          {/* Playlist Name */}
                          <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                          <p className="text-xs text-white/40">{playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}</p>
                          
                          {/* Delete button for non-system playlists */}
                          {!playlist.isSystem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${playlist.name}"?`)) {
                                  deletePlaylist(playlist.id);
                                  setPlaylists(getPlaylists());
                                }
                              }}
                              className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                              title="Delete playlist"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Show songs in selected playlist
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
                      {selectedPlaylist.description && (
                        <p className="text-white/60 text-sm">{selectedPlaylist.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          songs.forEach(song => {
                            if (activeProfileId && queue.filter(q => q.playerId === activeProfileId).length < 3) {
                              addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
                            }
                          });
                        }}
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                        disabled={!activeProfileId}
                      >
                        <QueueIcon className="w-4 h-4 mr-2" />
                        Add to Queue
                      </Button>
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          if (songs.length > 0) {
                            // Navigate to jukebox with these songs
                            localStorage.setItem('jukebox-playlist', JSON.stringify(songs.map(s => s.id)));
                            // Could also set screen to jukebox here
                          }
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                      >
                        <PlayIcon className="w-4 h-4 mr-2" />
                        Play in Jukebox
                      </Button>
                    </div>
                  </div>
                  
                  {getPlaylistSongs(selectedPlaylist.id, loadedSongs).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60">This playlist is empty</p>
                      <p className="text-white/40 text-sm mt-2">Add songs from the library</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {getPlaylistSongs(selectedPlaylist.id, loadedSongs).map((song) => (
                        <div key={song.id} className="relative group">
                          <SongCard 
                            song={song}
                            previewSong={previewSong}
                            onSongClick={handleSongClick}
                            onPreviewStart={handlePreviewStart}
                            onPreviewStop={handlePreviewStop}
                            previewVideoRefs={previewVideoRefs}
                          />
                          {/* Remove from playlist button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSongFromPlaylist(selectedPlaylist.id, song.id);
                              setPlaylists(getPlaylists());
                              setSelectedPlaylist(getPlaylistById(selectedPlaylist.id));
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10"
                            title="Remove from playlist"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No songs found</p>
              <p className="text-white/40 text-sm">Try a different search or import some songs</p>
            </div>
          ) : viewMode === 'grid' || (viewMode === 'folder' && currentFolder) ? (
            // Grid View (either plain grid or folder contents)
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {currentFolderSongs.map((song) => (
                <SongCard 
                  key={song.id}
                  song={song}
                  previewSong={previewSong}
                  onSongClick={handleSongClick}
                  onPreviewStart={handlePreviewStart}
                  onPreviewStop={handlePreviewStop}
                  previewVideoRefs={previewVideoRefs}
                />
              ))}
            </div>
          ) : (
            // Folder View - Show Folders
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {getSortedFolderKeys(groupedSongs, groupBy).map((folderKey) => {
                const songs = groupedSongs.get(folderKey) || [];
                const displayName = getGroupDisplayName(folderKey);
                
                return (
                  <button
                    key={folderKey}
                    onClick={() => handleOpenFolder(folderKey)}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
                  >
                    {/* Folder Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
                      <FolderIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    
                    {/* Folder Name */}
                    <h3 className="font-semibold text-white truncate">{displayName}</h3>
                    <p className="text-xs text-white/40">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
                    
                    {/* Preview covers */}
                    <div className="flex -space-x-2 mt-3">
                      {songs.slice(0, 4).map((song, i) => (
                        <div 
                          key={song.id}
                          className="w-8 h-8 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 border-2 border-gray-900 overflow-hidden"
                          style={{ zIndex: 4 - i }}
                        >
                          {song.coverImage ? (
                            <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MusicIcon className="w-4 h-4 text-white/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {songs.length > 4 && (
                        <div className="w-8 h-8 rounded bg-black/50 border-2 border-gray-900 flex items-center justify-center text-xs text-white/60">
                          +{songs.length - 4}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
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
              <DialogDescription className="text-white/60">{selectedSong.artist}</DialogDescription>
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
                    <div className="flex items-center justify-between">
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
                      {/* Reset button to exit party mode */}
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, partyMode: undefined, mode: 'single' }))}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        title="Reset to Single Mode"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Regular single/duel/duet selection
                  // Duet mode only shows if song is a duet song
                  // Single and Duel are hidden/grayed when Duet is available
                  <div className={`grid ${selectedSong?.isDuet ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                    {/* Duet Mode - Only show for duet songs */}
                    {selectedSong?.isDuet ? (
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duet' }))}
                        className={`py-3 rounded-lg font-medium transition-all ${
                          startOptions.mode === 'duet' 
                            ? 'bg-pink-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`
                      }
                      >
                        <span className="text-lg">🎭</span>
                        <div className="text-sm">Duet Mode</div>
                      </button>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Player Selection (for Single mode) */}
              {!startOptions.partyMode && startOptions.mode === 'single' && profiles.filter(p => p.isActive !== false).length > 1 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select Player</label>
                  <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                    {profiles.filter(p => p.isActive !== false).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => setStartOptions(prev => ({ ...prev, players: [profile.id] }))}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players[0] === profile.id 
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

              {/* Player Selection (for Duel mode) */}
              {!startOptions.partyMode && startOptions.mode === 'duel' && profiles.filter(p => p.isActive !== false).length >= 2 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select 2 Players ({profiles.filter(p => p.isActive !== false).length} available)</label>
                  <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                    {profiles.filter(p => p.isActive !== false).map((profile) => (
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
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
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

              {/* Player Selection (for Party Games) */}
              {startOptions.partyMode && profiles.filter(p => p.isActive !== false).length >= 1 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">
                    Select Players ({startOptions.partyMode === 'pass-the-mic' ? '2-8' :
                                    startOptions.partyMode === 'medley' ? '1-4' :
                                    startOptions.partyMode === 'missing-words' ? '1-4' :
                                    startOptions.partyMode === 'blind' ? '1-4' : '1-8'} players)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                    {profiles.filter(p => p.isActive !== false).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          const players = startOptions.players.includes(profile.id)
                            ? startOptions.players.filter(id => id !== profile.id)
                            : [...startOptions.players, profile.id];
                          setStartOptions(prev => ({ ...prev, players }));
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                          startOptions.players.includes(profile.id) 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
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
              
              {/* Player Selection (for Duet mode) */}
              {!startOptions.partyMode && startOptions.mode === 'duet' && profiles.filter(p => p.isActive !== false).length >= 2 && (
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Select 2 Players (P1 & P2) - {profiles.filter(p => p.isActive !== false).length} available</label>
                  <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                    {profiles.filter(p => p.isActive !== false).map((profile) => (
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
                            ? 'bg-pink-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
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

              {/* Local Highscore Preview */}
              {(() => {
                const songScores = highscores.filter(h => h.songId === selectedSong.id).sort((a, b) => b.score - a.score);
                const topScore = songScores[0];
                if (topScore) {
                  return (
                    <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white/60">Your Best:</span>
                        <span className="text-sm font-bold text-cyan-400">{topScore.score.toLocaleString()}</span>
                        <span className="text-xs text-white/40">({topScore.accuracy.toFixed(1)}%)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-purple-400 hover:text-purple-300"
                        onClick={() => {
                          setHighscoreSong(selectedSong);
                          setShowHighscoreModal(true);
                        }}
                      >
                        View All →
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {/* Favorite Button */}
              <Button 
                variant="outline" 
                onClick={() => {
                  const added = toggleFavorite(selectedSong.id);
                  setPlaylists(getPlaylists());
                  // Update favorite IDs
                  const favs = new Set<string>();
                  const allPlaylists = getPlaylists();
                  const favorites = allPlaylists.find(p => p.id === 'system-favorites');
                  if (favorites) {
                    favorites.songIds.forEach(id => favs.add(id));
                  }
                  setFavoriteSongIds(favs);
                }}
                className={favoriteSongIds.has(selectedSong.id) 
                  ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30" 
                  : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                }
              >
                <StarIcon className="w-4 h-4 mr-2" filled={favoriteSongIds.has(selectedSong.id)} />
                {favoriteSongIds.has(selectedSong.id) ? 'Favorited' : 'Favorite'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setHighscoreSong(selectedSong);
                  setShowHighscoreModal(true);
                }}
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <TrophyIcon className="w-4 h-4 mr-2" /> Scores
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (activeProfileId) {
                    addToQueue(selectedSong, activeProfileId, profiles.find(p => p.id === activeProfileId)?.name || 'Player');
                  }
                  setShowSongModal(false);
                }}
                disabled={!activeProfileId || playerQueueCount >= 3}
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <QueueIcon className="w-4 h-4 mr-2" /> Queue {!activeProfileId && '(Select Player)'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSongToAddToPlaylist(selectedSong);
                  setShowAddToPlaylistModal(true);
                }}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                Add to Playlist
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSongModal(false)}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartGame}
                disabled={
                  // Single mode: need player selection if multiple profiles
                  (startOptions.mode === 'single' && 
                   profiles.filter(p => p.isActive !== false).length > 1 && 
                   startOptions.players.length === 0) ||
                  // Duet mode: need 2 players selected
                  (startOptions.mode === 'duet' && 
                   startOptions.players.length < 2) ||
                  // Duel mode: need 2 players selected
                  (startOptions.mode === 'duel' && 
                   startOptions.players.length < 2)
                }
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlayIcon className="w-4 h-4 mr-2" /> Start
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Song Highscore Modal */}
      {highscoreSong && (
        <SongHighscoreModal
          song={highscoreSong}
          isOpen={showHighscoreModal}
          onClose={() => {
            setShowHighscoreModal(false);
            setHighscoreSong(null);
          }}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <Dialog open={showCreatePlaylistModal} onOpenChange={setShowCreatePlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Give your playlist a name and optionally a description
              </DialogDescription>
            </DialogHeader>
            <CreatePlaylistForm 
              onClose={() => setShowCreatePlaylistModal(false)}
              onSuccess={() => {
                setPlaylists(getPlaylists());
                setShowCreatePlaylistModal(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && songToAddToPlaylist && (
        <Dialog open={showAddToPlaylistModal} onOpenChange={setShowAddToPlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Select a playlist to add "{songToAddToPlaylist.title}" to
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
              {playlists.filter(p => !p.isSystem || p.id !== 'system-favorites' || !p.songIds.includes(songToAddToPlaylist.id)).map((playlist) => {
                const isInPlaylist = playlist.songIds.includes(songToAddToPlaylist.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      if (!isInPlaylist) {
                        addSongToPlaylist(playlist.id, songToAddToPlaylist.id);
                        setPlaylists(getPlaylists());
                        setShowAddToPlaylistModal(false);
                        setSongToAddToPlaylist(null);
                      }
                    }}
                    disabled={isInPlaylist}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      isInPlaylist 
                        ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center flex-shrink-0">
                      {playlist.isSystem ? (
                        <span className="text-lg">
                          {playlist.id === 'system-favorites' ? '⭐' : 
                           playlist.id === 'system-recently-played' ? '🕐' : '🔥'}
                        </span>
                      ) : (
                        <MusicIcon className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{playlist.name}</div>
                      <div className="text-xs text-white/40">{playlist.songIds.length} songs</div>
                    </div>
                    {isInPlaylist && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
              {playlists.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <p>No playlists yet</p>
                  <Button 
                    onClick={() => {
                      setShowAddToPlaylistModal(false);
                      setShowCreatePlaylistModal(true);
                    }}
                    className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    Create Your First Playlist
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setSongToAddToPlaylist(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setShowCreatePlaylistModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
