'use client';

import { useState, useEffect, useCallback, useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { useTranslation, Language } from '@/lib/i18n/translations';
import { Difficulty } from '@/types/game';
import {
  WebcamBackgroundConfig,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { THEMES, applyTheme, getStoredTheme, Theme } from '@/lib/game/themes';
import { StorageKeys, setItem, setBool, getNumber, getBool, getString } from '@/lib/storage';

// Tab components
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';
import { LibraryTab } from '@/components/settings/library-tab';
import { WebcamTab } from '@/components/settings/webcam-tab';
import { GeneralTab } from '@/components/settings/general-tab';
import { GameplayTab } from '@/components/settings/gameplay-tab';
import { AppearanceTab } from '@/components/settings/appearance-tab';
import { GraphicSoundTab } from '@/components/settings/graphic-sound-tab';
import { AboutTab } from '@/components/settings/about-tab';
import { ViralChartsSettings } from '@/components/settings/viral-charts-tab';
import { MobileDeviceMicrophoneSection } from '@/components/settings/mobile-device-section';
import { CompanionListSection } from '@/components/settings/companion-list-section';
import { SettingsTabBar, SettingsTab } from '@/components/settings/settings-tab-bar';
// Hooks
import { useFolderScanner } from '@/hooks/use-folder-scanner';



// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const { t, language, setLanguage, translations } = useTranslation();
  const { setDifficulty, gameState } = useGameStore();

  // Folder scanning hook — encapsulates all library management logic
  const folderScanner = useFolderScanner();

  const [initialDifficultyLoaded, setInitialDifficultyLoaded] = useState(false);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [, forceUpdate] = useReducer((c: number) => c + 1, 0);

  // Audio/Game settings state
  const [previewVolume, setPreviewVolume] = useState(30);
  const [micSensitivity, setMicSensitivity] = useState(50);
  const [defaultDifficulty, setDefaultDifficulty] = useState<Difficulty>('medium');
  const [showPitchGuide, setShowPitchGuide] = useState(true);
  const [currentThemeId, setCurrentThemeId] = useState<string>('neon-nights');
  const [lyricsStyle, setLyricsStyle] = useState<string>('classic');
  const [lyricsSize, setLyricsSize] = useState<string>('medium');
  const [noteDisplayStyle, setNoteDisplayStyle] = useState<string>('classic');
  const [noteShapeStyle, setNoteShapeStyle] = useState<string>('rounded');
  const [bgVideo, setBgVideo] = useState<boolean>(true);
  const [useAnimatedBg, setUseAnimatedBg] = useState<boolean>(false);
  const [performanceMode, setPerformanceMode] = useState<'full' | 'low'>(() => {
    const stored = getString(StorageKeys.PERFORMANCE_MODE);
    return stored === 'low' ? 'low' : 'full';
  });
  const [masterVolume, setMasterVolume] = useState(100);
  const [youtubeQuality, setYoutubeQuality] = useState('default');

  // Webcam settings state
  const [webcamConfig, setWebcamConfig] = useState<WebcamBackgroundConfig>(() => loadWebcamConfig());

  const updateWebcamConfig = useCallback((updates: Partial<WebcamBackgroundConfig>) => {
    setWebcamConfig(prev => {
      const newConfig = { ...prev, ...updates };
      saveWebcamConfig(newConfig);
      return newConfig;
    });
  }, []);

  // Active tab
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Helper to access nested translations with fallback
  const tx = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: unknown = translations;
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = (result as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  }, [translations]);

  // Initialize folder from localStorage on mount (persists across restarts)
  useEffect(() => {
    folderScanner.initializeFromStorage();
  }, [folderScanner]);

  // Load settings once on mount
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && (window.__TAURI__ || window.__TAURI_INTERNALS__);
    if (isTauri) {
      setIsTauriDetected(true);
    }

    setPreviewVolume(getNumber(StorageKeys.PREVIEW_VOLUME, 30));
    setMicSensitivity(getNumber(StorageKeys.MIC_SENSITIVITY, 50));
    setShowPitchGuide(getBool(StorageKeys.SHOW_PITCH_GUIDE, true));
    setLyricsStyle(getString(StorageKeys.LYRICS_STYLE, 'classic'));
    setLyricsSize(getString(StorageKeys.LYRICS_SIZE, 'medium'));
    setNoteDisplayStyle(getString(StorageKeys.NOTE_STYLE, 'classic'));
    setNoteShapeStyle(getString(StorageKeys.NOTE_SHAPE, 'rounded'));
    setBgVideo(getBool(StorageKeys.BG_VIDEO, true));
    setUseAnimatedBg(getBool(StorageKeys.ANIMATED_BG, false));
    setPerformanceMode(getString(StorageKeys.PERFORMANCE_MODE, 'full') === 'low' ? 'low' : 'full');
    setMasterVolume(getNumber(StorageKeys.MASTER_VOLUME, 100));
    setYoutubeQuality(getString(StorageKeys.YOUTUBE_QUALITY, 'default'));

    try {
      const storedTheme = getStoredTheme();
      if (storedTheme) setCurrentThemeId(storedTheme.id);
    } catch {
      // Ignore theme errors
    }
  }, []);

  // Sync difficulty from global store on first load
  useEffect(() => {
    if (!initialDifficultyLoaded && gameState.difficulty) {
      setDefaultDifficulty(gameState.difficulty);
      setInitialDifficultyLoaded(true);
    }
  }, [gameState.difficulty, initialDifficultyLoaded]);

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate();
  };

  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentThemeId(theme.id);
    setHasChanges(true);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDefaultDifficulty(diff);
    setDifficulty(diff);
    setItem(StorageKeys.DEFAULT_DIFFICULTY, diff);
    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { difficulty: diff } }));
    setHasChanges(true);
  };

  const handlePitchGuideToggle = (enabled: boolean) => {
    setShowPitchGuide(enabled);
    setHasChanges(true);
  };

  // Save all settings to localStorage and dispatch events
  const handleSaveSettings = () => {
    try {
      setItem(StorageKeys.PREVIEW_VOLUME, previewVolume.toString());
      setItem(StorageKeys.MIC_SENSITIVITY, micSensitivity.toString());
      setItem(StorageKeys.DEFAULT_DIFFICULTY, defaultDifficulty);
      setBool(StorageKeys.SHOW_PITCH_GUIDE, showPitchGuide);
      setItem(StorageKeys.LYRICS_STYLE, lyricsStyle);
      setItem(StorageKeys.LYRICS_SIZE, lyricsSize);
      setBool(StorageKeys.BG_VIDEO, bgVideo);
      setItem(StorageKeys.MASTER_VOLUME, masterVolume.toString());

      const theme = THEMES.find(th => th.id === currentThemeId);
      if (theme) {
        setItem(StorageKeys.THEME, currentThemeId);
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }

      setDifficulty(defaultDifficulty);
      window.dispatchEvent(new CustomEvent('settingsChange', {
        detail: { difficulty: defaultDifficulty, showPitchGuide, lyricsStyle, lyricsSize, bgVideo, masterVolume }
      }));

      setHasChanges(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="theme-container w-full px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-left">
        <h1 className="text-3xl font-bold mb-2 theme-adaptive-text">{tx('settings.title')}</h1>
        <p className="theme-adaptive-text-muted">{tx('settings.subtitle')}</p>
      </div>

      {/* Tab Bar */}
      <div className="flex justify-start mb-6">
        <div className="inline-flex">
          <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} tx={tx} />
        </div>
      </div>

      {/* Tab Content */}
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

      {activeTab === 'gameplay' && (
        <GameplayTab tx={tx} setHasChanges={setHasChanges} />
      )}

      {activeTab === 'appearance' && (
        <AppearanceTab
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
          lyricsStyle={lyricsStyle}
          setLyricsStyle={setLyricsStyle}
          lyricsSize={lyricsSize}
          setLyricsSize={setLyricsSize}
          performanceMode={performanceMode}
          setPerformanceMode={setPerformanceMode}
          tx={tx}
          setHasChanges={setHasChanges}
        />
      )}

      {activeTab === 'graphicsound' && (
        <GraphicSoundTab
          previewVolume={previewVolume}
          setPreviewVolume={setPreviewVolume}
          micSensitivity={micSensitivity}
          setMicSensitivity={setMicSensitivity}
          masterVolume={masterVolume}
          setMasterVolume={setMasterVolume}
          youtubeQuality={youtubeQuality}
          setYoutubeQuality={setYoutubeQuality}
          tx={tx}
          setHasChanges={setHasChanges}
        />
      )}

      {activeTab === 'microphone' && (
        <div className="space-y-6">
          <MicrophoneSettingsPanel />
        </div>
      )}

      {activeTab === 'mobile' && (
        <div className="space-y-6">
          <CompanionListSection isVisible={activeTab === 'mobile'} />
          <MobileDeviceMicrophoneSection />
        </div>
      )}

      {activeTab === 'webcam' && (
        <WebcamTab webcamConfig={webcamConfig} updateWebcamConfig={updateWebcamConfig} />
      )}

      {activeTab === 'library' && (
        <LibraryTab
          songsFolder={folderScanner.songsFolder}
          setSongsFolder={folderScanner.setSongsFolder}
          isScanning={folderScanner.isScanning}
          scanProgress={folderScanner.scanProgress}
          songCount={folderScanner.songCount}
          handleSaveFolder={folderScanner.handleSaveFolder}
          handleBrowseFolder={folderScanner.handleBrowseFolder}
          handleResetLibrary={folderScanner.handleResetLibrary}
          handleClearAllData={folderScanner.handleClearAllData}
          isResetting={folderScanner.isResetting}
          resetComplete={folderScanner.resetComplete}
          folderSaveComplete={folderScanner.folderSaveComplete}
          tx={tx}
        />
      )}

      {activeTab === 'viral' && <ViralChartsSettings />}

      {activeTab === 'about' && (
        <AboutTab tx={tx} isTauriDetected={isTauriDetected} />
      )}

      {/* Save Button */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Button
            onClick={handleSaveSettings}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-3 rounded-full shadow-lg shadow-cyan-500/30"
          >
            💾 {tx('settings.savedSuccessfully').replace('✓ ', '')}
          </Button>
        </div>
      )}

      {/* Success notification */}
      {folderScanner.folderSaveComplete && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          {tx('settings.savedSuccessfully')}
        </div>
      )}
    </div>
  );
}

export { SettingsScreen };
