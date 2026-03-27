import { useState, useEffect, useCallback } from 'react';
import { getAllSongs } from '@/lib/game/song-library';
import { useTranslation, Language } from '@/lib/i18n/translations';
import { 
  WebcamBackgroundConfig,
  loadWebcamConfig,
  saveWebcamConfig,
} from '@/components/game/webcam-background';
import { useSettingsPersistence } from '@/hooks/use-settings-persistence';
import { useLibraryManagement } from '@/hooks/use-library-management';

export type SettingsTab = 'general' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'editor' | 'assets' | 'about';

export function useSettingsScreen() {
  const { t, setLanguage, translations } = useTranslation();
  
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
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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
  
  // Webcam settings state
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
  
  // Handle language change
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    forceUpdate(n => n + 1);
  };

  return {
    // Translation
    t,
    tx,
    
    // Tab state
    activeTab,
    setActiveTab,
    
    // Tauri detection
    isTauriDetected,
    
    // Settings persistence
    settings,
    hasChanges,
    saveComplete,
    handleThemeChange,
    handleDifficultyChange,
    handlePitchGuideToggle,
    saveSettings,
    updateSetting,
    setHasChanges,
    
    // Library management
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    isResetting,
    resetComplete,
    folderSaveComplete,
    handleResetLibrary,
    handleClearAllData,
    
    // Webcam config
    webcamConfig,
    updateWebcamConfig,
    
    // Language
    handleLanguageChange,
  };
}
