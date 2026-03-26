'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllSongs } from '@/lib/game/song-library';
import { useTranslation, Language } from '@/lib/i18n/translations';
import { 
  WebcamBackgroundConfig,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
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
// Custom hooks
import { useSettingsPersistence } from '@/hooks/use-settings-persistence';
import { useLibraryManagement } from '@/hooks/use-library-management';
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
  const { t, setLanguage, translations } = useTranslation();
  
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
  const [isTauriDetected, setIsTauriDetected] = useState(false);
  const [, forceUpdate] = useState(0);
  
  // Use custom hooks for state management
  const {
    settings,
    hasChanges,
    saveComplete,
    handleThemeChange,
    handleDifficultyChange,
    handlePitchGuideToggle,
    saveSettings,
    updateSetting,
    setHasChanges,
  } = useSettingsPersistence();
  
  const {
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    isResetting,
    resetComplete,
    folderSaveComplete,
    handleResetLibrary,
    handleClearAllData,
  } = useLibraryManagement();
  
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
  
  // Check for Tauri on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      setIsTauriDetected(true);
    }
    
    // Initial song count
    setSongCount(getAllSongs().length);
  }, [setSongCount]);
  
  // Handle language change - now properly updates all UI
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate(n => n + 1);
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
                    {typeof window !== 'undefined' ? Object.keys(localStorage).filter(k => k.startsWith('karaoke-highscores')).length : 0}
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
                onImport={() => {
                  // Refresh song count after import
                  setSongCount(getAllSongs().length);
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
          defaultDifficulty={settings.defaultDifficulty}
          showPitchGuide={settings.showPitchGuide}
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
          bgVideo={settings.bgVideo}
          useAnimatedBg={settings.useAnimatedBg}
          currentThemeId={settings.currentThemeId}
          lyricsStyle={settings.lyricsStyle}
          noteDisplayStyle={settings.noteDisplayStyle}
          noteShapeStyle={settings.noteShapeStyle}
          previewVolume={settings.previewVolume}
          onBgVideoChange={(enabled) => {
            updateSetting('bgVideo', enabled);
            localStorage.setItem('karaoke-bg-video', String(enabled));
            window.dispatchEvent(new CustomEvent('settingsChange'));
          }}
          onAnimatedBgChange={(enabled) => {
            updateSetting('useAnimatedBg', enabled);
            localStorage.setItem('karaoke-animated-bg', String(enabled));
            window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: enabled } }));
          }}
          onThemeChange={handleThemeChange}
          onLyricsStyleChange={(style) => updateSetting('lyricsStyle', style)}
          onNoteDisplayStyleChange={(style) => updateSetting('noteDisplayStyle', style)}
          onNoteShapeStyleChange={(style) => updateSetting('noteShapeStyle', style)}
          onPreviewVolumeChange={(volume) => updateSetting('previewVolume', volume)}
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
            onClick={saveSettings}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-3 rounded-full shadow-lg shadow-cyan-500/30"
          >
            💾 Save Changes
          </Button>
        </div>
      )}
      
      {/* Success notification */}
      {(folderSaveComplete || saveComplete) && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
          ✓ Settings saved successfully
        </div>
      )}
    </div>
  );
}


export { SettingsScreen, AIAssetsGenerator, EditorSettingsView };
