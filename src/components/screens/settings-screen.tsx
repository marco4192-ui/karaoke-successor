'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, reloadLibrary, clearCustomSongs, updateSong, addSongs } from '@/lib/game/song-library';
import { Song, Difficulty } from '@/types/game';
import { useTranslation, Language } from '@/lib/i18n/translations';
import { 
  WebcamBackgroundConfig,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { isTauri } from '@/lib/tauri-file-storage';

// Tab components (refactored)
import { AIAssetsGeneratorTab } from '@/components/settings/ai-assets-generator-tab';
import { EditorSettingsTab } from '@/components/settings/editor-settings-tab';
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';
// Newly extracted tab components
import { LibraryTab } from '@/components/settings/library-tab';
import { WebcamTab } from '@/components/settings/webcam-tab';
import { GeneralTab } from '@/components/settings/general-tab';
import { GraphicSoundTab } from '@/components/settings/graphic-sound-tab';
import { AboutTab } from '@/components/settings/about-tab';
import { MobileDeviceMicrophoneSection } from '@/components/settings/mobile-device-section';
// Shared icons
import {
  SettingsIcon, MusicIcon, MicIcon, PhoneIcon,
  WebcamIcon, FolderIcon, EditIcon, SparkleIcon, InfoIcon,
} from '@/components/settings/settings-icons';

// ===================== ALIASES FOR REFACTORED TAB COMPONENTS =====================
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
      
      // CRITICAL: Log for debugging baseFolder issues
      console.log('[Settings] Loaded karaoke-songs-folder from localStorage:', savedFolder);
      
      // Check if songs have baseFolder but localStorage is empty (migration needed)
      const songs = getAllSongs();
      if (songs.length > 0 && songs[0].baseFolder && !savedFolder) {
        console.log('[Settings] Songs have baseFolder but localStorage is empty - setting localStorage from songs');
        localStorage.setItem('karaoke-songs-folder', songs[0].baseFolder);
        setSongsFolder(songs[0].baseFolder);
      }
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
    
    // CRITICAL: Always save the songs folder to localStorage
    // This is needed for migration and URL restoration
    localStorage.setItem('karaoke-songs-folder', folderPath);
    console.log('[Import] Saved karaoke-songs-folder to localStorage:', folderPath);
    
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
            
            // CRITICAL FIX: ALWAYS use folderPath as baseFolder
            // This is the songs folder selected by the user - it's the ONLY valid baseFolder
            // Do NOT rely on scanned.baseFolder as it may be undefined
            const effectiveBaseFolder = folderPath;
            console.log(`[Import] Using baseFolder: ${effectiveBaseFolder} for ${scanned.title}`);
            console.log(`[Import] Relative paths - audio: ${scanned.relativeAudioPath}, video: ${scanned.relativeVideoPath}, cover: ${scanned.relativeCoverPath}`);
            
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
              baseFolder: effectiveBaseFolder,
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
              relativeBackgroundPath: scanned.relativeBackgroundPath,
              // Media URLs
              audioUrl,
              videoBackground,
              coverImage,
              // Basic metadata
              genre: scanned.genre,
              language: scanned.language,
              year: scanned.year,
              // Additional metadata
              creator: scanned.creator,
              version: scanned.version,
              edition: scanned.edition,
              tags: scanned.tags,
              // Time control
              start: scanned.start,
              end: scanned.end,
              videoGap: scanned.videoGap,
              videoStart: scanned.videoStart,
              // Preview
              preview: scanned.previewStart ? {
                startTime: scanned.previewStart * 1000,
                duration: (scanned.previewDuration || 15) * 1000,
              } : undefined,
              previewStart: scanned.previewStart,
              previewDuration: scanned.previewDuration,
              // Medley
              medleyStartBeat: scanned.medleyStartBeat,
              medleyEndBeat: scanned.medleyEndBeat,
              // Duet
              isDuet: scanned.isDuet,
              duetPlayerNames: scanned.duetPlayerNames,
              // Lyrics
              lyrics: scanned.lyrics || [],
              storedTxt,
              storedMedia: false,
              // Media flags
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
    console.log('[Settings] handleBrowseFolder called');
    console.log('[Settings] isTauri():', isTauri());
    console.log('[Settings] window.__TAURI__:', typeof window !== 'undefined' ? !!(window as any).__TAURI__ : 'window undefined');
    console.log('[Settings] window.__TAURI_INTERNALS__:', typeof window !== 'undefined' ? !!(window as any).__TAURI_INTERNALS__ : 'window undefined');
    
    // Check if running in Tauri using the imported isTauri function
    if (!isTauri()) {
      // Not running in Tauri - show instructions
      alert(
        'Folder picker is only available in the desktop app.\n\n' +
        'Please use the desktop app (Tauri) to browse for folders.\n\n' +
        'If you are running the desktop app, there may be an issue with Tauri detection.'
      );
      return;
    }
    
    try {
      console.log('[Settings] Importing @tauri-apps/plugin-dialog...');
      const dialogModule = await import('@tauri-apps/plugin-dialog');
      console.log('[Settings] Dialog module imported:', dialogModule);
      
      const open = dialogModule.open;
      if (!open) {
        throw new Error('open function not found in dialog module');
      }
      
      console.log('[Settings] Calling dialog.open()...');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Songs Folder'
      });
      
      console.log('[Settings] Dialog result:', selected);
      
      if (selected && typeof selected === 'string') {
        setSongsFolder(selected);
        localStorage.setItem('karaoke-songs-folder', selected);
        
        // Perform the actual scan
        await performFolderScan(selected);
      } else if (selected === null) {
        console.log('[Settings] User cancelled the dialog');
      } else {
        console.warn('[Settings] Unexpected dialog result:', selected);
      }
    } catch (e) {
      console.error('[Settings] Error in handleBrowseFolder:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(
        'Could not open folder picker.\n\n' +
        'Error: ' + errorMessage + '\n\n' +
        'Please enter the path manually in the input field and click "Scan".'
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
        <LibraryTab
          songsFolder={songsFolder}
          setSongsFolder={setSongsFolder}
          isScanning={isScanning}
          scanProgress={scanProgress}
          songCount={songCount}
          handleSaveFolder={handleSaveFolder}
          handleBrowseFolder={handleBrowseFolder}
          handleResetLibrary={handleResetLibrary}
          handleClearAllData={handleClearAllData}
          isResetting={isResetting}
          resetComplete={resetComplete}
          folderSaveComplete={folderSaveComplete}
          tx={tx}
        />
      )}
      
      {/* Webcam Tab - SEPARATE camera for filming singers */}
      {activeTab === 'webcam' && (
        <WebcamTab
          webcamConfig={webcamConfig}
          updateWebcamConfig={updateWebcamConfig}
        />
      )}
      
      {/* General Tab */}
      {activeTab === 'general' && (
        <GeneralTab
          language={language}
          handleLanguageChange={handleLanguageChange}
          defaultDifficulty={defaultDifficulty}
          handleDifficultyChange={handleDifficultyChange}
          showPitchGuide={showPitchGuide}
          handlePitchGuideToggle={handlePitchGuideToggle}
          tx={tx}
        />
      )}
      
      {/* AI Assets Tab - Generate images and audio with AI */}
      {activeTab === 'assets' && (
        <AIAssetsGenerator />
      )}
      
      {/* Graphic / Sound Tab */}
      {activeTab === 'graphicsound' && (
        <GraphicSoundTab
          bgVideo={bgVideo}
          setBgVideo={setBgVideo}
          useAnimatedBg={useAnimatedBg}
          setUseAnimatedBg={setUseAnimatedBg}
          currentThemeId={currentThemeId}
          handleThemeChange={handleThemeChange}
          noteDisplayStyle={noteDisplayStyle}
          setNoteDisplayStyle={setNoteDisplayStyle}
          noteShapeStyle={noteShapeStyle}
          setNoteShapeStyle={setNoteShapeStyle}
          previewVolume={previewVolume}
          setPreviewVolume={setPreviewVolume}
          micSensitivity={micSensitivity}
          setMicSensitivity={setMicSensitivity}
          lyricsStyle={lyricsStyle}
          setLyricsStyle={setLyricsStyle}
          tx={tx}
          setHasChanges={setHasChanges}
        />
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
        <AboutTab
          tx={tx}
          isTauriDetected={isTauriDetected}
        />
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

export { SettingsScreen, AIAssetsGenerator, EditorSettingsView, MobileDeviceMicrophoneSection };
