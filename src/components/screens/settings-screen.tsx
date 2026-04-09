'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

// Tab components
import { AIAssetsGeneratorTab } from '@/components/settings/ai-assets-generator-tab';
import { EditorSettingsTab } from '@/components/settings/editor-settings-tab';
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';
import { LibraryTab } from '@/components/settings/library-tab';
import { WebcamTab } from '@/components/settings/webcam-tab';
import { GeneralTab } from '@/components/settings/general-tab';
import { GraphicSoundTab } from '@/components/settings/graphic-sound-tab';
import { AboutTab } from '@/components/settings/about-tab';
import { MobileDeviceMicrophoneSection } from '@/components/settings/mobile-device-section';
import { CompanionListSection } from '@/components/settings/companion-list-section';
import { SettingsTabBar, SettingsTab } from '@/components/settings/settings-tab-bar';
// Hooks
import { useFolderScanner } from '@/hooks/use-folder-scanner';

// Aliases for refactored tab components
const AIAssetsGenerator = AIAssetsGeneratorTab;
const EditorSettingsView = EditorSettingsTab;

// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const { t, language, setLanguage, translations } = useTranslation();
  const { setDifficulty, gameState } = useGameStore();

  // Folder scanning hook — encapsulates all library management logic
  const folderScanner = useFolderScanner();

  const [initialDifficultyLoaded, setInitialDifficultyLoaded] = useState(false);
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [, forceUpdate] = useState(0);

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

  // Safe localStorage helpers
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

  // Initialize folder scanner ONCE on mount (must not re-run — would overwrite user input)
  useEffect(() => {
    folderScanner.initializeFromStorage && folderScanner.initializeFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load settings on mount
  useEffect(() => {
    // Check if running in Tauri (v1: __TAURI__, v2: __TAURI_INTERNALS__)
    if (typeof window !== 'undefined' && ((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__)) {
      setIsTauriDetected(true);
    }

    // Load all settings from localStorage
    try {
      setPreviewVolume(parseInt(safeGetItem('karaoke-preview-volume', '30')) || 30);
      setMicSensitivity(parseInt(safeGetItem('karaoke-mic-sensitivity', '50')) || 50);

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

  // Settings change handlers
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate(n => n + 1);
  };

  const handleThemeChange = (theme: Theme) => {
    applyTheme(theme);
    setCurrentThemeId(theme.id);
    setHasChanges(true);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    setDefaultDifficulty(diff);
    setDifficulty(diff);
    localStorage.setItem('karaoke-default-difficulty', diff);
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
      localStorage.setItem('karaoke-preview-volume', previewVolume.toString());
      localStorage.setItem('karaoke-mic-sensitivity', micSensitivity.toString());
      localStorage.setItem('karaoke-default-difficulty', defaultDifficulty);
      localStorage.setItem('karaoke-show-pitch-guide', showPitchGuide.toString());
      localStorage.setItem('karaoke-lyrics-style', lyricsStyle);
      localStorage.setItem('karaoke-bg-video', bgVideo.toString());

      const theme = THEMES.find(t => t.id === currentThemeId);
      if (theme) {
        localStorage.setItem('karaoke-theme', JSON.stringify(theme));
        window.dispatchEvent(new CustomEvent('themeChange', { detail: theme.id }));
      }

      setDifficulty(defaultDifficulty);
      window.dispatchEvent(new CustomEvent('settingsChange', {
        detail: { difficulty: defaultDifficulty, showPitchGuide, lyricsStyle, bgVideo }
      }));

      setHasChanges(false);
      // Note: folderSaveComplete feedback is handled by the folderScanner hook internally
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className={`theme-container w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8`}>
      {/* Header */}
      {activeTab !== 'editor' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 theme-adaptive-text">{tx('settings.title')}</h1>
          <p className="theme-adaptive-text-muted">{tx('settings.subtitle')}</p>
        </div>
      )}

      {/* Tab Bar */}
      <SettingsTabBar activeTab={activeTab} onTabChange={setActiveTab} tx={tx} />

      {/* Tab Content */}
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

      {activeTab === 'webcam' && (
        <WebcamTab webcamConfig={webcamConfig} updateWebcamConfig={updateWebcamConfig} />
      )}

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

      {activeTab === 'assets' && <AIAssetsGenerator />}

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

      {activeTab === 'editor' && (
        <EditorSettingsView />
      )}

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
            💾 Save Changes
          </Button>
        </div>
      )}

      {/* Success notification */}
      {folderScanner.folderSaveComplete && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ Settings saved successfully
        </div>
      )}
    </div>
  );
}

export { SettingsScreen, AIAssetsGenerator, EditorSettingsView, MobileDeviceMicrophoneSection, CompanionListSection };
