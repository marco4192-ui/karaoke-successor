'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
// Tab components
import { AIAssetsGeneratorTab } from '@/components/settings/ai-assets-generator-tab';
import { EditorSettingsTab } from '@/components/settings/editor-settings-tab';
import { MicrophoneSettingsPanel } from '@/components/settings/microphone-settings-panel';
import { MobileDeviceMicrophoneSection } from '@/components/settings/mobile-device-microphone-section';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { GraphicSoundSettingsTab } from '@/components/settings/graphic-sound-settings-tab';
import { AboutTab } from '@/components/settings/about-tab';
import { DatabaseManagementPanel } from '@/components/settings/database-management-panel';
// Extracted components
import {
  useSettingsScreen,
  SettingsTabNavigation,
  LibraryTabContent,
  WebcamTabContent,
} from '@/components/settings-screen';

// Aliases for refactored tab components
const AIAssetsGenerator = AIAssetsGeneratorTab;
const EditorSettingsView = EditorSettingsTab;

// ===================== SETTINGS SCREEN =====================
function SettingsScreen() {
  const {
    tx,
    activeTab,
    setActiveTab,
    isTauriDetected,
    settings,
    hasChanges,
    saveComplete,
    handleThemeChange,
    handleDifficultyChange,
    handlePitchGuideToggle,
    saveSettings,
    updateSetting,
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    isResetting,
    resetComplete,
    folderSaveComplete,
    handleResetLibrary,
    handleClearAllData,
    webcamConfig,
    updateWebcamConfig,
    handleLanguageChange,
  } = useSettingsScreen();

  return (
    <div className={activeTab === 'editor' ? 'w-full h-full' : 'max-w-4xl mx-auto'}>
      {/* Header - Hide when in Editor tab */}
      {activeTab !== 'editor' && (
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{tx('settings.title')}</h1>
          <p className="text-white/60">{tx('settings.subtitle')}</p>
        </div>
      )}
      
      {/* Tabs */}
      <SettingsTabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tx={tx}
        isEditorMode={activeTab === 'editor'}
      />
      
      {/* Library Tab */}
      {activeTab === 'library' && (
        <LibraryTabContent
          songCount={songCount}
          setSongCount={setSongCount}
          isScanning={isScanning}
          scanProgress={scanProgress}
          isResetting={isResetting}
          resetComplete={resetComplete}
          onResetLibrary={handleResetLibrary}
          onClearAllData={handleClearAllData}
          tx={tx}
        />
      )}
      
      {/* Webcam Tab */}
      {activeTab === 'webcam' && (
        <WebcamTabContent
          webcamConfig={webcamConfig}
          onUpdateWebcamConfig={updateWebcamConfig}
        />
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
      
      {/* AI Assets Tab */}
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

      {/* Data Tab - Database Management */}
      {activeTab === 'data' && (
        <DatabaseManagementPanel />
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
