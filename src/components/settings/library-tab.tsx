'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ImportScreen } from '@/components/import/import-screen';
import { FolderIcon, CloudUploadIcon, TrashIcon } from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';
import { ViralChartsSettings } from '@/components/settings/viral-charts-tab';
import { StorageKeys, getJsonOptional, setJson, setItem } from '@/lib/storage';
import { getAllSongs } from '@/lib/game/song-library';
import { isTauri, normalizeFilePath } from '@/lib/tauri-file-storage';
import { nativePickFolder } from '@/lib/native-fs';
import { safeAlert, safePrompt } from '@/lib/safe-dialog';

interface LibraryTabProps {
  songsFolder: string;
  setSongsFolder: (_value: string) => void;
  isScanning: boolean;
  scanProgress: {
    stage: 'scanning' | 'importing' | 'complete' | 'error';
    message: string;
    count: number;
  } | null;
  songCount: number;
  handleSaveFolder: () => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
  handleResetLibrary: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
  isResetting: boolean;
  resetComplete: boolean;
  folderSaveComplete: boolean;
  tx: (_key: string) => string;
}

export function LibraryTab({
  songsFolder,
  setSongsFolder,
  isScanning,
  scanProgress,
  songCount,
  handleSaveFolder,
  handleBrowseFolder,
  handleResetLibrary,
  handleClearAllData,
  isResetting,
  resetComplete,
  folderSaveComplete,
  tx,
}: LibraryTabProps) {
  const { t } = useTranslation();

  // ── Additional library sources ──
  const [additionalFolders, setAdditionalFolders] = useState<string[]>([]);

  // Load additional folders from localStorage on mount
  useEffect(() => {
    const stored = getJsonOptional<string[]>(StorageKeys.ADDITIONAL_SONG_FOLDERS) ?? [];
    setAdditionalFolders(stored);
  }, []);

  const saveAdditionalFolders = useCallback((folders: string[]) => {
    setAdditionalFolders(folders);
    setJson(StorageKeys.ADDITIONAL_SONG_FOLDERS, folders);
  }, []);

  const handleAddFolderPath = useCallback(async () => {
    const path = await safePrompt(t('settingsLibrary.enterFolderPath'));
    if (path && path.trim()) {
      const normalized = normalizeFilePath(path.trim());
      if (normalized === songsFolder || additionalFolders.includes(normalized)) {
        safeAlert(t('settingsLibrary.folderAlreadyExists'));
        return;
      }
      saveAdditionalFolders([...additionalFolders, normalized]);
    }
  }, [additionalFolders, songsFolder, saveAdditionalFolders, t]);

  const handleBrowseAdditionalFolder = useCallback(async () => {
    if (!isTauri()) {
      safeAlert(t('settingsLibrary.folderPickerDesktopOnly'));
      return;
    }
    try {
      const selected = await nativePickFolder(t('settingsLibrary.selectAdditionalFolder'));
      if (selected) {
        const normalized = normalizeFilePath(selected);
        if (normalized === songsFolder || additionalFolders.includes(normalized)) {
          safeAlert(t('settingsLibrary.folderAlreadyExists'));
          return;
        }
        saveAdditionalFolders([...additionalFolders, normalized]);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Settings] Error browsing additional folder:', e);
    }
  }, [additionalFolders, songsFolder, saveAdditionalFolders, t]);

  const handleRemoveAdditionalFolder = useCallback((index: number) => {
    const updated = additionalFolders.filter((_, i) => i !== index);
    saveAdditionalFolders(updated);
  }, [additionalFolders, saveAdditionalFolders]);

  return (
    <div className="space-y-6">
      {/* Songs Base Folder */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            <FolderIcon className="w-5 h-5 text-cyan-400" />
            {t('settingsLibrary.title')}
          </CardTitle>
          <CardDescription>
            {t('settingsLibrary.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={songsFolder}
              onChange={(e) => setSongsFolder(e.target.value)}
              placeholder={t('settingsLibrary.placeholder')}
              className="bg-white/5 border-white/10 text-white flex-1"
            />
            <Button
              onClick={handleSaveFolder}
              disabled={isScanning || !songsFolder.trim()}
              className="bg-green-500 hover:bg-green-400 text-white shrink-0"
            >
              {isScanning ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('settingsLibrary.scan')
              )}
            </Button>
            <Button
              onClick={handleBrowseFolder}
              disabled={isScanning}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
            >
              {t('settingsLibrary.browse')}
            </Button>
          </div>
          <p className="text-xs text-white/50">
            {t('settingsLibrary.help')}
          </p>
          {songsFolder && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <div>
                <p className="text-green-400 font-medium">{t('settingsLibrary.basePath')} {songsFolder}</p>
                <p className="text-sm text-white/60">{t('settingsLibrary.basePathDesc')}</p>
              </div>
            </div>
          )}
          {!songsFolder && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-yellow-400">{t('settingsLibrary.noBaseFolder')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Library Sources */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            <FolderIcon className="w-5 h-5 text-purple-400" />
            {t('settingsLibrary.additionalSources')}
          </CardTitle>
          <CardDescription>
            {t('settingsLibrary.additionalSourcesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {additionalFolders.length === 0 && (
            <p className="text-sm text-white/40">{t('settingsLibrary.noAdditionalSources')}</p>
          )}
          {additionalFolders.map((folder, index) => (
            <div
              key={`${folder}-${index}`}
              className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 group"
            >
              <FolderIcon className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-sm text-white/80 truncate flex-1 min-w-0" title={folder}>
                {folder}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAdditionalFolder(index)}
                className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('settingsLibrary.removeFolder')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddFolderPath}
              disabled={isScanning}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              + {t('settingsLibrary.addFolderPath')}
            </Button>
            {isTauri() && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBrowseAdditionalFolder}
                disabled={isScanning}
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                {t('settingsLibrary.browse')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
                  {scanProgress?.message || t('settingsLibrary.scanning')}
                </p>
                {scanProgress && scanProgress.count > 0 && (
                  <p className="text-sm text-white/60">{scanProgress.count} {t('settingsLibrary.songsProcessed')}</p>
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
            {t('settingsLibrary.importSongs')}
          </CardTitle>
          <CardDescription>
            {t('settingsLibrary.importSongsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportScreen
            onImport={(_song) => {
              // Refresh song count after import
            }}
            onCancel={() => {}}
          />
        </CardContent>
      </Card>

      {/* Viral Charts */}
      <ViralChartsSettings />

      {/* Reset Library */}
      <Card className="bg-white/5 border-white/10 border-red-500/30">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <TrashIcon className="w-5 h-5" />
            {tx('settings.dangerZone')}
          </CardTitle>
          <CardDescription>
            {t('settingsLibrary.cannotUndo')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reset Success Message */}
          {resetComplete && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-green-400">{t('settingsLibrary.resetSuccess')}</span>
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
  );
}
