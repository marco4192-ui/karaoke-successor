'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, reloadLibrary, clearCustomSongs } from '@/lib/game/song-library';
import { Difficulty } from '@/types/game';
import { useTranslation, LANGUAGE_FLAGS, Language } from '@/lib/i18n/translations';
import { 
  WebcamBackgroundConfig,
  DEFAULT_WEBCAM_CONFIG,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { WebcamSettingsPanel, WebcamBackground } from '@/components/game/webcam-background';
import { ImportScreen } from '@/components/import/import-screen';
// Tab components (refactored)
import { AIAssetsGeneratorTab } from '@/components/settings/ai-assets-generator-tab';
import { EditorSettingsTab } from '@/components/settings/editor-settings-tab';
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';
import { MobileDeviceMicrophoneSection } from '@/components/settings/mobile-device-microphone-section';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { GraphicSoundSettingsTab } from '@/components/settings/graphic-sound-settings-tab';
import { AboutTab } from '@/components/settings/about-tab';
import { logger } from '@/lib/logger';
import { useFolderScan } from '@/hooks/use-folder-scan';
// Icons - imported from central icons file
import {
  MusicIcon,
  MicIcon,
  PhoneIcon,
  SettingsIcon,
  SparkleIcon,
  EditIcon,
  WebcamIcon,
  FolderIcon,
  InfoIcon,
  TrashIcon,
  CloudUploadIcon,
} from '@/components/icons';

// ===================== ALIASES FOR REFACTORED TAB COMPONENTS =====================
// Use imported components instead of inline definitions
const AIAssetsGenerator = AIAssetsGeneratorTab;
const EditorSettingsView = EditorSettingsTab;

// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const { t, language, setLanguage, translations } = useTranslation();
  const { setDifficulty, gameState } = useGameStore();
  
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
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // Folder scan hook
  const {
    isScanning,
    scanProgress,
    performFolderScan,
    songCount,
    setSongCount,
  } = useFolderScan({
    onScanComplete: (count) => {
      setFolderSaveComplete(true);
      setTimeout(() => setFolderSaveComplete(false), 2000);
    },
  });
  
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
      
      const savedDifficulty = safeGetItem('karaoke-default-difficulty', 'medium') as Difficulty;
      if (['easy', 'medium', 'hard'].includes(savedDifficulty)) {
        setDefaultDifficulty(savedDifficulty);
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
  }, [safeGetItem, safeGetBool]);
  
  // Save songs folder and reload library
  const handleSaveFolder = async () => {
    if (!songsFolder.trim()) {
      alert('Please enter a folder path first.');
      return;
    }
    
    localStorage.setItem('karaoke-songs-folder', songsFolder);
    
    // Run the Tauri folder scan using the hook
    await performFolderScan(songsFolder);
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
  
  // Handle difficulty change - mark as changed
  const handleDifficultyChange = (diff: Difficulty) => {
    setDefaultDifficulty(diff);
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
      logger.error('[Settings]', 'Failed to save settings:', error);
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
      logger.error('[Settings]', 'Failed to reset library:', error);
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
      logger.error('[Settings]', 'Failed to clear data:', error);
      setIsResetting(false);
    }
  };

  return (
    <div className={activeTab === 'editor' ? 'w-full h-full' : 'max-w-4xl mx-auto'}>
      {/* Header - Hide when in Editor tab */}
      {activeTab !== 'editor' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{tx('settings.title')}</h1>
          <p className="text-white/60">{tx('settings.subtitle')}</p>
        </div>
      )}
      
      {/* Tabs - Reorganized according to specification */}
      <div className={activeTab === 'editor' ? 'flex flex-wrap gap-2 mb-2 px-4 pt-4' : 'flex flex-wrap gap-2 mb-6'}>
        <Button
          variant={activeTab === 'general' ? 'default' : 'outline'}
          onClick={() => setActiveTab('general')}
          className={activeTab === 'general' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <SettingsIcon className="w-4 h-4 mr-2" /> {tx('settings.tabGeneral')}
        </Button>
        <Button
          variant={activeTab === 'graphicsound' ? 'default' : 'outline'}
          onClick={() => setActiveTab('graphicsound')}
          className={activeTab === 'graphicsound' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <MusicIcon className="w-4 h-4 mr-2" /> Graphic / Sound
        </Button>
        <Button
          variant={activeTab === 'microphone' ? 'default' : 'outline'}
          onClick={() => setActiveTab('microphone')}
          className={activeTab === 'microphone' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <MicIcon className="w-4 h-4 mr-2" /> Microphone
        </Button>
        <Button
          variant={activeTab === 'mobile' ? 'default' : 'outline'}
          onClick={() => setActiveTab('mobile')}
          className={activeTab === 'mobile' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <PhoneIcon className="w-4 h-4 mr-2" /> Mobile Companion
        </Button>
        <Button
          variant={activeTab === 'webcam' ? 'default' : 'outline'}
          onClick={() => setActiveTab('webcam')}
          className={activeTab === 'webcam' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <WebcamIcon className="w-4 h-4 mr-2" /> Webcam
        </Button>
        <Button
          variant={activeTab === 'library' ? 'default' : 'outline'}
          onClick={() => setActiveTab('library')}
          className={activeTab === 'library' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <FolderIcon className="w-4 h-4 mr-2" /> {tx('settings.tabLibrary')}
        </Button>
        <Button
          variant={activeTab === 'editor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('editor')}
          className={activeTab === 'editor' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
        >
          <EditIcon className="w-4 h-4 mr-2" /> Editor
        </Button>
        <Button
          variant={activeTab === 'assets' ? 'default' : 'outline'}
          onClick={() => setActiveTab('assets')}
          className={activeTab === 'assets' ? 'bg-purple-500 text-white' : 'border-white/20 text-white'}
        >
          <SparkleIcon className="w-4 h-4 mr-2" /> AI Asset
        </Button>
        <Button
          variant={activeTab === 'about' ? 'default' : 'outline'}
          onClick={() => setActiveTab('about')}
          className={activeTab === 'about' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
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
              <CardTitle>{tx('settings.libraryStats')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-400">{songCount}</div>
                  <div className="text-sm text-white/60">{tx('settings.songsInLibrary')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length}
                  </div>
                  <div className="text-sm text-white/60">{tx('settings.highscoreEntries')}</div>
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
        <GeneralSettingsTab
          defaultDifficulty={defaultDifficulty}
          showPitchGuide={showPitchGuide}
          onDifficultyChange={handleDifficultyChange}
          onPitchGuideToggle={handlePitchGuideToggle}
          onLanguageChange={handleLanguageChange}
        />
      )}
      
      {/* AI Assets Tab - Generate images and audio with AI */}
      {activeTab === 'assets' && (
        <AIAssetsGenerator />
      )}
      
      {/* Graphic / Sound Tab */}
      {activeTab === 'graphicsound' && (
        <GraphicSoundSettingsTab
          bgVideo={bgVideo}
          useAnimatedBg={useAnimatedBg}
          currentThemeId={currentThemeId}
          lyricsStyle={lyricsStyle}
          noteDisplayStyle={noteDisplayStyle}
          noteShapeStyle={noteShapeStyle}
          previewVolume={previewVolume}
          onBgVideoChange={(enabled) => {
            setBgVideo(enabled);
            localStorage.setItem('karaoke-bg-video', String(enabled));
            window.dispatchEvent(new CustomEvent('settingsChange'));
            setHasChanges(true);
          }}
          onAnimatedBgChange={(enabled) => {
            setUseAnimatedBg(enabled);
            localStorage.setItem('karaoke-animated-bg', String(enabled));
            window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: enabled } }));
            setHasChanges(true);
          }}
          onThemeChange={handleThemeChange}
          onLyricsStyleChange={(style) => {
            setLyricsStyle(style);
            setHasChanges(true);
          }}
          onNoteDisplayStyleChange={(style) => {
            setNoteDisplayStyle(style);
            setHasChanges(true);
          }}
          onNoteShapeStyleChange={(style) => {
            setNoteShapeStyle(style);
            setHasChanges(true);
          }}
          onPreviewVolumeChange={(volume) => {
            setPreviewVolume(volume);
            setHasChanges(true);
          }}
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
        <AboutTab isTauriDetected={isTauriDetected} />
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


export { SettingsScreen, AIAssetsGenerator, EditorSettingsView };
