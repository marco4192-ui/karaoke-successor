'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, getAllSongsAsync, reloadLibrary, clearCustomSongs, updateSong, addSongs } from '@/lib/game/song-library';
import { Song, Difficulty, PlayerProfile } from '@/types/game';
import { useTranslation, LANGUAGE_NAMES, LANGUAGE_FLAGS, Language } from '@/lib/i18n/translations';
import { getMicrophoneManager, getMultiMicrophoneManager, MicrophoneDevice, MicrophoneStatus, AssignedMicrophone } from '@/lib/audio/microphone-manager';
import { 
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { WebcamSettingsPanel, WebcamBackground } from '@/components/game/webcam-background';
import { LiveStreamingPanel } from '@/components/streaming/live-streaming';
import { leaderboardService } from '@/lib/api/leaderboard-service';
import { ImportScreen } from '@/components/import/import-screen';
// Tab components (refactored)
import { AIAssetsGeneratorTab } from '@/components/settings/ai-assets-generator-tab';
import { EditorSettingsTab } from '@/components/settings/editor-settings-tab';
import { LibrarySettingsTab } from '@/components/settings/library-settings-tab';
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';

// Icons
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
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

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
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

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function WebcamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
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

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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

function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
    </svg>
  );
}

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M8 16h8" />
    </svg>
  );
}

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

// QR Code generator (simple version)
function generateQRCode(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
}

// ===================== ALIASES FOR REFACTORED TAB COMPONENTS =====================
// Use imported components instead of inline definitions
const AIAssetsGenerator = AIAssetsGeneratorTab;
const EditorSettingsView = EditorSettingsTab;

// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const { t, language, setLanguage, translations } = useTranslation();
  const { setDifficulty, gameState } = useGameStore();

  // Initialize difficulty from store (which is persisted)
  const [initialDifficultyLoaded, setInitialDifficultyLoaded] = useState(false);
  
  // Helper to access nested translations with fallback
  const tx = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: unknown = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key; // Fallback to key if not found
      }
    }
    return typeof result === 'string' ? result : key;
  }, [translations]);
  
  const [activeTab, setActiveTab] = useState<'general' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'editor' | 'assets' | 'about'>('general');
  const [songsFolder, setSongsFolder] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [songCount, setSongCount] = useState(0);
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // Folder scan state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    stage: 'scanning' | 'importing' | 'complete' | 'error';
    message: string;
    count: number;
  } | null>(null);
  
  // Audio/Game settings state
  const [previewVolume, setPreviewVolume] = useState(30);
  const [micSensitivity, setMicSensitivity] = useState(50);
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('medium');
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState<string>('neon-nights');
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const [noteDisplayStyle, setNoteDisplayStyle] = useState<string>('classic');
  const [noteShapeStyle, setNoteShapeStyle] = useState<string>('rounded');
  const [bgVideo, setBgVideo] = useState<boolean>(true);
  const [useAnimatedBg, setUseAnimatedBg] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Webcam settings state - SEPARATE camera for filming singers
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());
  
  // Update webcam config and save to localStorage
  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);
  
  // Safe localStorage helper
  const safeGetItem = useCallback((key: string, defaultValue: string = ''): string => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      return localStorage.getItem(key) || defaultValue;
    } catch {
      return defaultValue;
    }
  }, []);
  
  const safeGetBool = useCallback((key: string, defaultValue: boolean = true): boolean => {
    try {
      if (typeof window === 'undefined') return defaultValue;
      const val = localStorage.getItem(key);
      return val === null ? defaultValue : val === 'true';
    } catch {
      return defaultValue;
    }
  }, []);
  
  // Load settings on mount - with safe localStorage access
  useEffect(() => {
    try {
      const savedFolder = safeGetItem('karaoke-songs-folder', '');
      setSongsFolder(savedFolder);
      setSongCount(getAllSongs().length);
    } catch {
      // Ignore errors
    }

    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setIsTauriDetected(true);
    }

    // Load all settings from localStorage safely
    try {
      const savedPreviewVolume = safeGetItem('karaoke-preview-volume', '30');
      setPreviewVolume(parseInt(savedPreviewVolume) || 30);

      const savedMicSensitivity = safeGetItem('karaoke-mic-sensitivity', '50');
      setMicSensitivity(parseInt(savedMicSensitivity) || 50);

      // Load difficulty from Store (persisted) instead of localStorage
      // This ensures the global difficulty setting is used
      if (!initialDifficultyLoaded && gameState.difficulty) {
        setDefaultDifficulty(gameState.difficulty);
        setInitialDifficultyLoaded(true);
      }

      setShowPitchGuide(safeGetBool('karaoke-show-pitch-guide', true));
      setLyricsStyle(safeGetItem('karaoke-lyrics-style', 'classic'));
      setNoteDisplayStyle(safeGetItem('karaoke-note-style', 'classic'));
      setNoteShapeStyle(safeGetItem('karaoke-note-shape', 'rounded'));
      setBgVideo(safeGetBool('karaoke-bg-video', true));
      setUseAnimatedBg(safeGetItem('karaoke-animated-bg', 'false') === 'true');

      try {
        const storedTheme = getStoredTheme();
        if (storedTheme) setCurrentThemeId(storedTheme.id);
      } catch {
        // Ignore theme errors
      }
    } catch {
      // Ignore any localStorage errors
    }
  }, [safeGetItem, safeGetBool, gameState.difficulty, initialDifficultyLoaded]);
  
  // Save songs folder and reload library
  const handleSaveFolder = async () => {
    if (!songsFolder.trim()) {
      alert('Please enter a folder path first.');
      return;
    }
    
    localStorage.setItem('karaoke-songs-folder', songsFolder);
    
    // Run the Tauri folder scan
    await performFolderScan(songsFolder);
  };
  
  // Perform folder scan and import songs
  const performFolderScan = async (folderPath: string) => {
    setIsScanning(true);
    setScanProgress({ stage: 'scanning', message: 'Scanning folder...', count: 0 });
    
    try {
      // Import the Tauri scanner
      const { scanSongsFolderTauri, isTauri } = await import('@/lib/tauri-file-storage');
      
      if (!isTauri()) {
        alert('Folder scanning is only available in the desktop app.');
        setIsScanning(false);
        return;
      }
      
      // Run the scan
      const result = await scanSongsFolderTauri(folderPath);
      
      setScanProgress({ 
        stage: 'importing', 
        message: `Found ${result.songs.length} songs, importing...`, 
        count: result.songs.length 
      });
      
      if (result.songs.length > 0) {
        // Clear existing songs first
        clearCustomSongs();
        
        // Convert scanned songs to Song format
        const { storeMedia } = await import('@/lib/db/media-db');
        const { getSongMediaUrl } = await import('@/lib/tauri-file-storage');
        
        const songsToImport: Song[] = [];
        let imported = 0;
        
        for (const scanned of result.songs) {
          try {
            // Generate song ID
            const songId = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            
            // Store TXT content in IndexedDB for caching
            let storedTxt = false;
            if (scanned.relativeTxtPath) {
              try {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const txtContent = await readTextFile(`${folderPath}/${scanned.relativeTxtPath}`);
                if (txtContent) {
                  const txtBlob = new Blob([txtContent], { type: 'text/plain' });
                  await storeMedia(songId, 'txt', txtBlob);
                  storedTxt = true;
                }
              } catch (e) {
                console.warn('Could not cache TXT for', scanned.title);
              }
            }
            
            // CRITICAL: Create blob URLs for media files NOW
            // These URLs are needed for immediate playback
            let audioUrl: string | undefined = undefined;
            let videoBackground: string | undefined = undefined;
            let coverImage: string | undefined = undefined;
            
            // CRITICAL FIX: Use scanned.baseFolder for media URLs, not folderPath
            // The scanned.baseFolder is set by the scanner and is the absolute path to the songs root
            const effectiveBaseFolder = scanned.baseFolder || folderPath;
            console.log(`[Import] Using baseFolder: ${effectiveBaseFolder} for ${scanned.title}`);
            
            // Load audio URL
            if (scanned.relativeAudioPath) {
              try {
                audioUrl = await getSongMediaUrl(scanned.relativeAudioPath, effectiveBaseFolder) || undefined;
                console.log(`[Import] Created audio URL for ${scanned.title}:`, audioUrl ? 'success' : 'failed');
              } catch (e) {
                console.warn(`[Import] Failed to create audio URL for ${scanned.title}:`, e);
              }
            }
            
            // Load video URL
            if (scanned.relativeVideoPath) {
              try {
                videoBackground = await getSongMediaUrl(scanned.relativeVideoPath, effectiveBaseFolder) || undefined;
                console.log(`[Import] Created video URL for ${scanned.title}:`, videoBackground ? 'success' : 'failed');
              } catch (e) {
                console.warn(`[Import] Failed to create video URL for ${scanned.title}:`, e);
              }
            }
            
            // Load cover URL
            if (scanned.relativeCoverPath) {
              try {
                coverImage = await getSongMediaUrl(scanned.relativeCoverPath, effectiveBaseFolder) || undefined;
                console.log(`[Import] Created cover URL for ${scanned.title}:`, coverImage ? 'success' : 'failed');
              } catch (e) {
                console.warn(`[Import] Failed to create cover URL for ${scanned.title}:`, e);
              }
            }
            
            // Create song object with relative paths AND blob URLs
            const song: Song = {
              id: songId,
              title: scanned.title,
              artist: scanned.artist,
              duration: 180000, // Default duration, will be calculated when played
              bpm: scanned.bpm,
              difficulty: 'medium',
              rating: 3,
              gap: scanned.gap,
              baseFolder: effectiveBaseFolder, // Store the effective base folder
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
              // CRITICAL: Set the media URLs
              audioUrl,
              videoBackground,
              coverImage,
              genre: scanned.genre,
              language: scanned.language,
              year: scanned.year,
              creator: scanned.creator, // NEW: Pass creator from scanner
              preview: scanned.previewStart ? {
                startTime: scanned.previewStart * 1000,
                duration: (scanned.previewDuration || 15) * 1000,
              } : undefined,
              // CRITICAL: Use lyrics from scanner if available
              lyrics: scanned.lyrics || [],
              storedTxt,
              storedMedia: false,
              // CRITICAL FIX: Use hasEmbeddedAudio from scanner (it correctly detects when #MP3: points to video)
              hasEmbeddedAudio: scanned.hasEmbeddedAudio ?? (!scanned.relativeAudioPath && !!scanned.relativeVideoPath),
              dateAdded: Date.now(),
            };
            
            songsToImport.push(song);
            imported++;
            
            setScanProgress({ 
              stage: 'importing', 
              message: `Importing ${imported}/${result.songs.length}...`, 
              count: imported 
            });
          } catch (e) {
            console.error('Failed to import song:', scanned.title, e);
          }
        }
        
        // Add all songs to library
        if (songsToImport.length > 0) {
          addSongs(songsToImport);
        }
        
        // Reload library
        reloadLibrary();
        setSongCount(getAllSongs().length);
        setFolderSaveComplete(true);
        setScanProgress({ 
          stage: 'complete', 
          message: `Successfully imported ${imported} songs!`, 
          count: imported 
        });
      } else {
        setScanProgress({ 
          stage: 'complete', 
          message: 'No songs found in the selected folder.', 
          count: 0 
        });
      }
      
      // Show errors if any
      if (result.errors.length > 0) {
        console.warn('Scan errors:', result.errors);
      }
      
    } catch (error) {
      console.error('Folder scan failed:', error);
      setScanProgress({ 
        stage: 'error', 
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        count: 0 
      });
    }
    
    setIsScanning(false);
    setTimeout(() => {
      setFolderSaveComplete(false);
      setScanProgress(null);
    }, 5000);
  };
  
  // Browse folder (using Tauri dialog if available, otherwise show instructions)
  const handleBrowseFolder = async () => {
    // Check if running in Tauri
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Songs Folder'
        });
        if (selected && typeof selected === 'string') {
          setSongsFolder(selected);
          localStorage.setItem('karaoke-songs-folder', selected);
          
          // Perform the actual scan
          await performFolderScan(selected);
        }
      } catch (e) {
        alert('Could not open folder picker. Please enter the path manually.');
      }
    } else {
      // Browser mode - show instructions
      alert(
        'Folder picker is only available in the desktop app.\n\n' +
        'In browser mode, please:\n' +
        '1. Enter the full path to your songs folder\n' +
        '2. Click "Save" to apply\n\n' +
        'Note: Browser security restricts direct file system access. ' +
        'Use the Import tab to add songs manually.'
      );
    }
  };
  
  // Handle language change - now properly updates all UI
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate(n => n + 1);
  };
  
  // Handle theme change
  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentThemeId(theme.id);
    setHasChanges(true);
  };
  
  // Handle difficulty change - update store immediately for global effect
  const handleDifficultyChange = (diff: Difficulty) => {
    setDefaultDifficulty(diff);
    // Immediately update the store so the difficulty is applied globally
    setDifficulty(diff);
    // Also save to localStorage for persistence
    localStorage.setItem('karaoke-default-difficulty', diff);
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('settingsChange', {
      detail: { difficulty: diff }
    }));
    setHasChanges(true);
  };
  
  // Handle pitch guide toggle - mark as changed
  const handlePitchGuideToggle = (enabled: boolean) => {
    setShowPitchGuide(enabled);
    setHasChanges(true);
  };
  
  // Save all settings to localStorage and dispatch events
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('karaoke-preview-volume', previewVolume.toString());
      localStorage.setItem('karaoke-mic-sensitivity', micSensitivity.toString());
      localStorage.setItem('karaoke-default-difficulty', defaultDifficulty);
      localStorage.setItem('karaoke-show-pitch-guide', showPitchGuide.toString());
      localStorage.setItem('karaoke-lyrics-style', lyricsStyle);
      localStorage.setItem('karaoke-bg-video', bgVideo.toString());
      
      // Apply theme
      const theme = THEMES.find(t => t.id === currentThemeId);
      if (theme) {
        localStorage.setItem('karaoke-theme', JSON.stringify(theme));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }
      
      // Apply to current game state
      setDifficulty(defaultDifficulty);
      
      // Dispatch events for other components
      window.dispatchEvent(new CustomEvent('settingsChange', { 
        detail: { 
          difficulty: defaultDifficulty, 
          showPitchGuide: showPitchGuide,
          lyricsStyle: lyricsStyle,
          bgVideo: bgVideo
        } 
      }));
      
      setHasChanges(false);
      setFolderSaveComplete(true);
      setTimeout(() => setFolderSaveComplete(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };
  
  // Reset library without deleting highscores
  const handleResetLibrary = async () => {
    if (!confirm('Are you sure you want to reset the song library? This will remove all imported songs, but your highscores will be preserved.')) {
      return;
    }
    
    setIsResetting(true);
    setResetComplete(false);
    
    try {
      // Clear custom songs using the song-library function
      // This clears 'karaoke-successor-custom-songs' from localStorage and clears caches
      clearCustomSongs();
      
      // Find and remove other song-related keys
      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        // Remove songs library and imported songs
        if (key.startsWith('karaoke-songs') || key.startsWith('imported-song-') || key === 'karaoke-library') {
          localStorage.removeItem(key);
        }
      }
      
      // Clear the song library cache
      reloadLibrary();
      
      // Small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSongCount(0);
      setResetComplete(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setResetComplete(false), 3000);
    } catch (error) {
      console.error('Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  };
  
  // Clear all data including highscores (dangerous!)
  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL data including highscores, profiles, and settings. This cannot be undone!\n\nType "DELETE" to confirm.')) {
      return;
    }
    
    const confirmation = prompt('Type "DELETE" to confirm complete data reset:');
    if (confirmation !== 'DELETE') {
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Reload the page to reset state
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      setIsResetting(false);
    }
  };

  return (
    <div className={`theme-container ${activeTab === 'editor' ? 'w-full h-full' : 'w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8'}`}>
      {/* Header - Hide when in Editor tab */}
      {activeTab !== 'editor' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 theme-adaptive-text">{tx('settings.title')}</h1>
          <p className="theme-adaptive-text-muted">{tx('settings.subtitle')}</p>
        </div>
      )}
      
      {/* Tabs - Reorganized according to specification */}
      <div className={activeTab === 'editor' ? 'flex flex-wrap gap-2 mb-2 px-4 pt-4' : 'flex flex-wrap gap-2 mb-6'}>
        <Button
          variant={activeTab === 'general' ? 'default' : 'outline'}
          onClick={() => setActiveTab('general')}
          className={activeTab === 'general' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <SettingsIcon className="w-4 h-4 mr-2" /> {tx('settings.tabGeneral')}
        </Button>
        <Button
          variant={activeTab === 'graphicsound' ? 'default' : 'outline'}
          onClick={() => setActiveTab('graphicsound')}
          className={activeTab === 'graphicsound' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <MusicIcon className="w-4 h-4 mr-2" /> Graphic / Sound
        </Button>
        <Button
          variant={activeTab === 'microphone' ? 'default' : 'outline'}
          onClick={() => setActiveTab('microphone')}
          className={activeTab === 'microphone' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <MicIcon className="w-4 h-4 mr-2" /> Microphone
        </Button>
        <Button
          variant={activeTab === 'mobile' ? 'default' : 'outline'}
          onClick={() => setActiveTab('mobile')}
          className={activeTab === 'mobile' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <PhoneIcon className="w-4 h-4 mr-2" /> Mobile Companion
        </Button>
        <Button
          variant={activeTab === 'webcam' ? 'default' : 'outline'}
          onClick={() => setActiveTab('webcam')}
          className={activeTab === 'webcam' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <WebcamIcon className="w-4 h-4 mr-2" /> Webcam
        </Button>
        <Button
          variant={activeTab === 'library' ? 'default' : 'outline'}
          onClick={() => setActiveTab('library')}
          className={activeTab === 'library' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <FolderIcon className="w-4 h-4 mr-2" /> {tx('settings.tabLibrary')}
        </Button>
        <Button
          variant={activeTab === 'editor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('editor')}
          className={activeTab === 'editor' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <EditIcon className="w-4 h-4 mr-2" /> Editor
        </Button>
        <Button
          variant={activeTab === 'assets' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assets')}
          className={activeTab === 'assets' ? 'bg-purple-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <SparkleIcon className="w-4 h-4 mr-2" /> AI Asset
        </Button>
        <Button
          variant={activeTab === 'about' ? 'default' : 'outline'}
          onClick={() => setActiveTab('about')}
          className={activeTab === 'about' ? 'bg-cyan-500 text-white' : 'border-white/20 theme-adaptive-text'}
        >
          <InfoIcon className="w-4 h-4 mr-2" /> {tx('settings.tabAbout')}
        </Button>
      </div>
      
      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Library Stats */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="theme-adaptive-text">{tx('settings.libraryStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">{songCount}</div>
                  <div className="text-sm theme-adaptive-text-secondary">{tx('settings.songsInLibrary')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length}
                  </div>
                  <div className="text-sm theme-adaptive-text-secondary">{tx('settings.highscoreEntries')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Scan Progress */}
          {(isScanning || scanProgress) && (
            <Card className="bg-white/5 border-white/10 border-cyan-500/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {isScanning && (
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${
                      scanProgress?.stage === 'complete' ? 'text-green-400' :
                      scanProgress?.stage === 'error' ? 'text-red-400' :
                      'text-cyan-400'
                    }`}>
                      {scanProgress?.message || 'Scanning...'}
                    </p>
                    {scanProgress && scanProgress.count > 0 && (
                      <p className="text-sm text-white/60">{scanProgress.count} songs processed</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Import Songs Section */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudUploadIcon className="w-5 h-5 text-cyan-400" />
                Import Songs
              </CardTitle>
              <CardDescription>
                Import new songs into your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImportScreen 
                onImport={(song) => {
                  // Refresh song count after import
                  setSongCount(getAllSongs().length);
                  setFolderSaveComplete(true);
                  setTimeout(() => setFolderSaveComplete(false), 2000);
                }}
                onCancel={() => {}}
              />
            </CardContent>
          </Card>
          
          {/* Reset Library */}
          <Card className="bg-white/5 border-white/10 border-red-500/30">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <TrashIcon className="w-5 h-5" />
                {tx('settings.dangerZone')}
              </CardTitle>
              <CardDescription>
                These actions cannot be undone easily
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Reset Success Message */}
              {resetComplete && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-green-400">Library has been reset successfully!</span>
                </div>
              )}
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.resetLibrary')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.resetLibraryDesc')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleResetLibrary}
                  disabled={isResetting}
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                >
                  {isResetting ? (
                    <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <TrashIcon className="w-4 h-4 mr-2" />
                  )}
                  {tx('settings.resetLibrary')}
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div>
                  <h4 className="font-medium text-red-400">{tx('settings.clearAll')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.clearAllDesc')}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleClearAllData}
                  disabled={isResetting}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  {tx('settings.clearAll')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Webcam Tab - SEPARATE camera for filming singers */}
      {activeTab === 'webcam' && (
        <div className="space-y-6">
          <WebcamSettingsPanel 
            config={webcamConfig}
            onConfigChange={updateWebcamConfig}
          />
          
          {/* Webcam Info Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <InfoIcon className="w-5 h-5 text-cyan-400" />
                About Webcam Background
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-white/70">
                <p>
                  <strong className="text-white">📹 Purpose:</strong> The webcam is a <span className="text-cyan-400">SEPARATE camera</span> for filming singers while they perform. It is NOT the streaming/microphone camera.
                </p>
                <p>
                  <strong className="text-white">📐 Size Options:</strong> Choose from Fullscreen (entire background), or proportional overlays (20%, 30%, 40% of screen height).
                </p>
                <p>
                  <strong className="text-white">📍 Position:</strong> Place the webcam strip at the top, bottom, left, or right of the screen.
                </p>
                <p>
                  <strong className="text-white">🪞 Mirror Mode:</strong> Enable selfie-style mirroring for a natural self-view.
                </p>
                <p>
                  <strong className="text-white">🎨 Filters:</strong> Apply visual filters like Grayscale, Sepia, or Vibrant for artistic effects.
                </p>
                <p className="text-xs text-white/40 mt-4">
                  💡 Tip: Use the webcam to record singers and create memorable karaoke moments!
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Webcam Preview Card */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Preview
              </CardTitle>
              <CardDescription>
                Preview your webcam settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
                <WebcamBackground 
                  config={webcamConfig}
                  onConfigChange={updateWebcamConfig}
                />
                {!webcamConfig.enabled && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40">
                    <div className="text-center">
                      <WebcamIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Enable webcam to see preview</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Language Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LanguageIcon className="w-5 h-5 text-cyan-400" />
                {tx('settings.language')}
              </CardTitle>
              <CardDescription>{tx('settings.languageDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
              >
                {Object.entries(LANGUAGE_FLAGS).map(([code, flag]) => (
                  <option key={code} value={code} className="bg-gray-800 text-white">
                    {flag} {LANGUAGE_NAMES[code as Language] || code}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/40 mt-2">
                {tx('settings.languageNote')}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.gameSettings')}</CardTitle>
              <CardDescription>{tx('settings.gameSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Default Difficulty */}
              <div className="space-y-3">
                <label className="text-sm font-medium">{tx('settings.defaultDifficulty')}</label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => handleDifficultyChange(diff)}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all capitalize cursor-pointer ${
                        defaultDifficulty === diff
                          ? diff === 'easy' ? 'border-green-500 bg-green-500/20 text-green-400' 
                            : diff === 'medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                            : 'border-red-500 bg-red-500/20 text-red-400'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40">{tx('settings.defaultDifficultyDesc')}</p>
              </div>
              
              {/* Show Pitch Guide Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.showPitchGuide')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.showPitchGuideDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePitchGuideToggle(!showPitchGuide)}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    showPitchGuide ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                    showPitchGuide ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyboardIcon className="w-5 h-5 text-yellow-400" />
                {tx('settings.keyboardShortcuts')}
              </CardTitle>
              <CardDescription>{tx('settings.keyboardShortcutsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.searchShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">/</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.fullscreenShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">F</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.libraryShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">L</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.settingsShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+,</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.closeShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                  <span className="text-white/60">{tx('settings.searchAltShortcut')}</span>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+K</kbd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* AI Assets Tab - Generate images and audio with AI */}
      {activeTab === 'assets' && (
        <AIAssetsGenerator />
      )}
      
      {/* Graphic / Sound Tab */}
      {activeTab === 'graphicsound' && (
        <div className="space-y-6">
          {/* Video Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MusicIcon className="w-5 h-5 text-cyan-400" />
                Video Settings
              </CardTitle>
              <CardDescription>Background video and visual settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Background Video Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
                  <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBgVideo(!bgVideo);
                    localStorage.setItem('karaoke-bg-video', String(!bgVideo));
                    window.dispatchEvent(new CustomEvent('settingsChange'));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    bgVideo ? 'bg-cyan-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
              
              {/* Animated Background Toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <h4 className="font-medium">Animated Background</h4>
                  <p className="text-sm text-white/60">Use animated backgrounds instead of videos. Recommended for low-performance systems.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !useAnimatedBg;
                    setUseAnimatedBg(newValue);
                    localStorage.setItem('karaoke-animated-bg', String(newValue));
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: newValue } }));
                    setHasChanges(true);
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    useAnimatedBg ? 'bg-purple-500' : 'bg-white/20'
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useAnimatedBg ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* Theme Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 theme-adaptive-text">
                <PaletteIcon className="w-5 h-5 text-purple-400" />
                {tx('settings.themeSettings')}
              </CardTitle>
              <CardDescription className="theme-adaptive-text-secondary">{tx('settings.themeSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Presets from themes.ts */}
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-3 block">{tx('settings.colorTheme')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme)}
                      className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${
                        currentThemeId === theme.id
                          ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50' 
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <div 
                        className="w-full h-8 rounded-lg mb-2"
                        style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                      />
                      <span className="text-sm font-medium theme-adaptive-text">{theme.name}</span>
                      <p className="text-xs theme-adaptive-text-secondary truncate">{theme.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Display Style */}
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-2 block">Noten-Darstellung</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'classic', name: 'Klassisch', icon: '➡️', desc: 'UltraStar-Stil' },
                    { id: 'fill-level', name: 'Füllstand', icon: '📊', desc: 'Lücken bei Fehlern' },
                    { id: 'color-feedback', name: 'Farb-Feedback', icon: '🎨', desc: 'Farbe nach Treffgenauigkeit' },
                    { id: 'glow-intensity', name: 'Glow-Intensität', icon: '✨', desc: 'Helligkeit zeigt Qualität' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setNoteDisplayStyle(style.id);
                        localStorage.setItem('karaoke-note-style', style.id);
                        window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteDisplayStyle: style.id } }));
                        setHasChanges(true);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                        noteDisplayStyle === style.id
                          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                      }`}
                    >
                      <span className="text-lg">{style.icon}</span>
                      <span className="font-medium">{style.name}</span>
                      <span className="text-xs theme-adaptive-text-secondary">{style.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Note Shape Style */}
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-2 block">Notenform</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'rounded', name: 'Abgerundet', icon: '🔵', desc: 'Weiche Kanten' },
                    { id: 'sharp', name: 'Eckig', icon: '🔷', desc: 'Kantige Form' },
                    { id: 'pill', name: 'Pille', icon: '💊', desc: 'Oval-Form' },
                    { id: 'diamond', name: 'Raute', icon: '💎', desc: 'Diamant-Form' },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => {
                        setNoteShapeStyle(shape.id);
                        localStorage.setItem('karaoke-note-shape', shape.id);
                        window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteShapeStyle: shape.id } }));
                        setHasChanges(true);
                      }}
                      className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                        noteShapeStyle === shape.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                      }`}
                    >
                      <span className="text-lg">{shape.icon}</span>
                      <span className="font-medium">{shape.name}</span>
                      <span className="text-xs theme-adaptive-text-secondary">{shape.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Audio Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>{tx('settings.audioSettings')}</CardTitle>
              <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview Volume */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.previewVolume')}</label>
                  <span className="text-sm text-cyan-400">{previewVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={previewVolume}
                  onChange={(e) => {
                    setPreviewVolume(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full accent-cyan-500"
                />
              </div>
              
              {/* Mic Sensitivity */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">{tx('settings.micSensitivity')}</label>
                  <span className="text-sm text-cyan-400">{micSensitivity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micSensitivity}
                  onChange={(e) => {
                    setMicSensitivity(parseInt(e.target.value));
                    setHasChanges(true);
                  }}
                  className="w-full accent-purple-500"
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Lyrics Display Settings */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Lyrics Display</CardTitle>
              <CardDescription>Customize how lyrics are displayed during gameplay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="text-sm text-white/60 mb-2 block">{tx('settings.lyricsStyle')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'classic', name: 'Classic' },
                    { id: 'concert', name: 'Concert' },
                    { id: 'retro', name: 'Retro' },
                    { id: 'neon', name: 'Neon' },
                    { id: 'minimal', name: 'Minimal' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => {
                        setLyricsStyle(style.id);
                        setHasChanges(true);
                      }}
                      className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                        lyricsStyle === style.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                      }`}
                    >
                      {style.name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Microphone Tab */}
      {activeTab === 'microphone' && (
        <div className="space-y-6">
          <MicrophoneSettingsPanel />
        </div>
      )}

      {/* Mobile Companion Tab */}
      {activeTab === 'mobile' && (
        <div className="space-y-6">
          <MobileDeviceMicrophoneSection />
        </div>
      )}

      {/* Editor Tab */}
      {activeTab === 'editor' && (
        <div className="h-[calc(100vh-8rem)]">
          <EditorSettingsView />
        </div>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  <MusicIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-xl">Karaoke Successor</div>
                  <div className="text-sm text-white/60">{tx('settings.version')} 1.0.0</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/70 mb-4">
                {tx('settings.aboutDesc')}
              </p>
              <div className="space-y-2 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature1')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature2')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature3')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature4')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400">•</span>
                  {tx('settings.feature5')}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Technology Stack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-cyan-400 font-medium">Next.js 15</div>
                  <div className="text-xs text-white/40">Framework</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-purple-400 font-medium">React</div>
                  <div className="text-xs text-white/40">UI Library</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-pink-400 font-medium">Zustand</div>
                  <div className="text-xs text-white/40">State Management</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-yellow-400 font-medium">Tailwind CSS</div>
                  <div className="text-xs text-white/40">Styling</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Status */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Online Leaderboard</h4>
                  <p className="text-sm text-white/60">Connect to global highscores</p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const connected = await leaderboardService.testConnection();
                    alert(connected ? '✅ Connected to leaderboard!' : '❌ Could not connect to leaderboard');
                  }}
                  className="border-cyan-500/50 text-cyan-400"
                >
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          
          {/* Tauri Desktop App Info - Show in Tauri mode */}
          {isTauriDetected && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-green-400">Desktop App Installed</h4>
                  <p className="text-sm text-white/60">This app is running as a native desktop application with full offline support.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Save Button - Fixed at bottom */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-3 rounded-full shadow-lg shadow-cyan-500/30"
          >
            💾 Save Changes
          </Button>
        </div>
      )}
      
      {/* Success notification */}
      {folderSaveComplete && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ Settings saved successfully
        </div>
      )}
    </div>
  );
}


// ===================== MOBILE DEVICE MICROPHONE SECTION =====================
function MobileDeviceMicrophoneSection() {
  const [localIP, setLocalIP] = useState<string>('');
  const [connectedClients, setConnectedClients] = useState<Array<{ 
    id: string; 
    connectionCode: string;
    name: string; 
    hasPitch: boolean;
    profile?: { name: string; avatar?: string; color: string };
    queueCount: number;
  }>>([]);
  
  // Get local IP address via WebRTC
  useEffect(() => {
    let isMounted = true;
    let detectedIP: string | null = null;
    
    const getLocalIP = async () => {
      try {
        // Check sessionStorage for previously detected IP
        const storedIP = sessionStorage.getItem('karaoke-detected-ip');
        if (storedIP && !storedIP.startsWith('127.') && storedIP !== 'localhost') {
          detectedIP = storedIP;
          setLocalIP(storedIP);
          return;
        }
        
        // Try to get local IP via RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        pc.onicecandidate = (event) => {
          if (event?.candidate && isMounted && !detectedIP) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
            if (ipMatch && ipMatch[1]) {
              const ip = ipMatch[1];
              // Filter out mDNS addresses and localhost
              if (!ip.endsWith('.local') && ip !== '0.0.0.0' && !ip.startsWith('127.')) {
                detectedIP = ip;
                setLocalIP(ip);
                sessionStorage.setItem('karaoke-detected-ip', ip);
                pc.close();
              }
            }
          }
        };
        
        // Also check hostname
        setTimeout(() => {
          if (isMounted && !detectedIP) {
            const hostname = window.location.hostname;
            if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
              detectedIP = hostname;
              setLocalIP(hostname);
              sessionStorage.setItem('karaoke-detected-ip', hostname);
            }
          }
          pc.close();
        }, 3000);
      } catch {
        // Fallback to hostname
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost' && !hostname.startsWith('127.')) {
          setLocalIP(hostname);
        }
      }
    };
    
    getLocalIP();
    return () => { isMounted = false; };
  }, []);
  
  // Poll for connected clients
  useEffect(() => {
    const pollClients = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients');
        const data = await res.json();
        if (data.clients) {
          setConnectedClients(data.clients);
        }
      } catch {
        // Ignore
      }
    };
    
    pollClients();
    const interval = setInterval(pollClients, 3000);
    return () => clearInterval(interval);
  }, []);

  const mobileUrl = localIP ? `http://${localIP}:3000/mobile` : '/mobile';
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneIcon className="w-5 h-5 text-cyan-400" />
          Mobile Device as Microphone
        </CardTitle>
        <CardDescription>Use your smartphone as a wireless microphone</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg">
            <div className="text-center mb-4">
              <h4 className="font-medium mb-1">Scan to Connect</h4>
              <p className="text-xs text-white/60">Open your phone's camera app</p>
            </div>
            <div className="w-48 h-48 bg-white rounded-lg p-2 mb-4">
              <img 
                src={generateQRCode(mobileUrl)}
                alt="QR Code for mobile connection"
                className="w-full h-full"
              />
            </div>
            <p className="text-xs text-white/40 text-center">
              Point your phone camera at this QR code to connect
            </p>
          </div>
          
          {/* Connection Info */}
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">Connection URL</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black/30 px-3 py-2 rounded text-sm text-cyan-400 overflow-hidden text-ellipsis">
                  {mobileUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(mobileUrl);
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Copy
                </Button>
              </div>
              {localIP && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ Detected IP: {localIP}
                </p>
              )}
              {!localIP && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠ Using localhost - may not work on mobile devices
                </p>
              )}
            </div>
            
            {/* Connected Clients */}
            {connectedClients.length > 0 && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h4 className="font-medium mb-2">Connected Devices ({connectedClients.length})</h4>
                <div className="space-y-2">
                  {connectedClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span>{client.name || 'Unknown'}</span>
                      {client.hasPitch && <Badge className="text-xs bg-cyan-500/20 text-cyan-400">Mic</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium mb-2">How it works</h4>
              <ul className="text-sm text-white/60 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">1.</span>
                  Scan the QR code or open the URL on your phone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">2.</span>
                  Create a profile on the mobile app
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">3.</span>
                  Your phone becomes a wireless microphone
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">4.</span>
                  Sing wirelessly from anywhere in the room!
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


export { SettingsScreen, AIAssetsGenerator, EditorSettingsView, MobileDeviceMicrophoneSection };
