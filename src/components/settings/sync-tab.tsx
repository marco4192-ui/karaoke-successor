'use client';

/**
 * Settings tab: Sync & Backup (feature idea #14 — offline device transfer).
 *
 * Export: bundles profiles, highscores, playlists, custom songs and settings
 * (optionally including all song media) into one portable JSON file.
 * Restore: parse a backup file, preview its contents, merge it into this
 * device. See src/lib/sync/backup.ts for the full data/merge documentation.
 */

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import {
  createBackup, downloadBackup, parseBackupFile, restoreBackup,
  summarizeBackup, type BackupFile, type BackupSummary, type RestoreSummary,
} from '@/lib/sync/backup';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** R14: AppData persistence is active in the Tauri desktop build. */
function isTauriApp(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

export function SyncTab() {
  const { t } = useTranslation();

  // ── Export state ──
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSummary, setExportSummary] = useState<BackupSummary | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Import state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [pendingSummary, setPendingSummary] = useState<BackupSummary | null>(null);
  const [restoreSettings, setRestoreSettings] = useState(false);
  const [restoreMedia, setRestoreMedia] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSummary(null);
    try {
      const { file, summary } = await createBackup(includeMedia);
      downloadBackup(file);
      setExportSummary(summary);
    } catch {
      setExportError(t('syncBackup.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [includeMedia, t]);

  const handleFileChosen = useCallback(async (file: File) => {
    setImportError(null);
    setRestoreResult(null);
    setPendingBackup(null);
    setPendingSummary(null);
    try {
      const text = await file.text();
      const parsed = parseBackupFile(JSON.parse(text));
      if (!parsed) {
        setImportError(t('syncBackup.invalidFile'));
        return;
      }
      setPendingBackup(parsed);
      setPendingSummary(summarizeBackup(parsed));
      setRestoreMedia(parsed.media !== null && parsed.media.length > 0);
    } catch {
      setImportError(t('syncBackup.invalidFile'));
    }
  }, [t]);

  const handleRestore = useCallback(async () => {
    if (!pendingBackup) return;
    setIsRestoring(true);
    setImportError(null);
    try {
      const result = await restoreBackup(pendingBackup, { restoreSettings, restoreMedia });
      setRestoreResult(result);
      setPendingBackup(null);
      setPendingSummary(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setImportError(t('syncBackup.restoreError'));
    } finally {
      setIsRestoring(false);
    }
  }, [pendingBackup, restoreSettings, restoreMedia, t]);

  return (
    <div className="space-y-6" data-testid="settings-sync-tab">
      {/* ── R14 (user request 5): AppData persistence status ── */}
      <div
        className={`rounded-lg border p-3 text-xs ${isTauriApp()
          ? 'border-green-500/30 bg-green-500/10 text-green-300'
          : 'border-white/10 bg-white/5 text-white/50'}`}
        data-testid="sync-appdata-status"
      >
        <span aria-hidden>{isTauriApp() ? '🛡️' : '🌐'}</span>{' '}
        {isTauriApp() ? t('syncBackup.appdataActive') : t('syncBackup.appdataBrowser')}
      </div>

      {/* ── Export ── */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span aria-hidden>💾</span>
            {t('syncBackup.exportTitle')}
          </CardTitle>
          <CardDescription>{t('syncBackup.exportDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer select-none" data-testid="sync-include-media-toggle">
            <input
              type="checkbox"
              checked={includeMedia}
              onChange={(e) => setIncludeMedia(e.target.checked)}
              className="w-5 h-5 rounded border-white/30 bg-gray-800 text-cyan-500 accent-cyan-500"
            />
            <span className="text-sm">
              {t('syncBackup.includeMedia')}
              <span className="block text-xs text-white/40">{t('syncBackup.includeMediaDesc')}</span>
            </span>
          </label>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white"
            data-testid="sync-export-button"
          >
            {isExporting ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full mr-2" />
                {t('syncBackup.exporting')}
              </>
            ) : (
              t('syncBackup.exportButton')
            )}
          </Button>

          {exportError && (
            <p className="text-sm text-red-400" role="alert">{exportError}</p>
          )}
          {exportSummary && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-300" data-testid="sync-export-summary">
              <p className="font-medium">{t('syncBackup.exportSuccess')}</p>
              <p className="text-xs text-green-200/70 mt-1">
                {t('syncBackup.summaryProfiles').replace('{n}', String(exportSummary.profiles))}
                {' · '}
                {t('syncBackup.summarySongs').replace('{n}', String(exportSummary.songs))}
                {' · '}
                {t('syncBackup.summaryPlaylists').replace('{n}', String(exportSummary.playlists))}
                {exportSummary.mediaEntries > 0
                  ? ` · ${t('syncBackup.summaryMedia').replace('{n}', String(exportSummary.mediaEntries)).replace('{size}', formatBytes(exportSummary.mediaBytes))}`
                  : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Restore ── */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span aria-hidden>📥</span>
            {t('syncBackup.restoreTitle')}
          </CardTitle>
          <CardDescription>{t('syncBackup.restoreDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileChosen(file);
            }}
            data-testid="sync-import-file-input"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
            data-testid="sync-import-button"
          >
            {t('syncBackup.chooseFile')}
          </Button>

          {importError && (
            <p className="text-sm text-red-400" role="alert">{importError}</p>
          )}

          {pendingSummary && pendingBackup && (
            <div className="rounded-lg border border-white/10 bg-gray-800/50 p-4 space-y-3" data-testid="sync-restore-preview">
              <p className="text-sm font-medium">
                {t('syncBackup.previewTitle')}
                <span className="block text-xs text-white/40 mt-1">
                  {new Date(pendingSummary.createdAt).toLocaleString()}
                </span>
              </p>
              <ul className="text-sm text-white/70 space-y-1">
                <li>👤 {t('syncBackup.summaryProfiles').replace('{n}', String(pendingSummary.profiles))}</li>
                <li>🎵 {t('syncBackup.summarySongs').replace('{n}', String(pendingSummary.songs))}</li>
                <li>📋 {t('syncBackup.summaryPlaylists').replace('{n}', String(pendingSummary.playlists))}</li>
                <li>🏆 {t('syncBackup.summaryHighscores').replace('{n}', String(pendingSummary.highscoreEntries))}</li>
                {pendingSummary.mediaEntries > 0 && (
                  <li>🎬 {t('syncBackup.summaryMedia').replace('{n}', String(pendingSummary.mediaEntries)).replace('{size}', formatBytes(pendingSummary.mediaBytes))}</li>
                )}
              </ul>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restoreMedia}
                    disabled={pendingSummary.mediaEntries === 0}
                    onChange={(e) => setRestoreMedia(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-gray-800 accent-cyan-500"
                  />
                  <span className="text-sm">{t('syncBackup.restoreMediaToggle')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={restoreSettings}
                    onChange={(e) => setRestoreSettings(e.target.checked)}
                    className="w-5 h-5 rounded border-white/30 bg-gray-800 accent-cyan-500"
                  />
                  <span className="text-sm">{t('syncBackup.restoreSettingsToggle')}</span>
                </label>
              </div>

              <Button
                onClick={handleRestore}
                disabled={isRestoring}
                className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 text-white"
                data-testid="sync-restore-confirm"
              >
                {isRestoring ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full mr-2" />
                    {t('syncBackup.restoring')}
                  </>
                ) : (
                  t('syncBackup.restoreButton')
                )}
              </Button>
            </div>
          )}

          {restoreResult && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-300" data-testid="sync-restore-result">
              <p className="font-medium">{t('syncBackup.restoreSuccess')}</p>
              <p className="text-xs text-green-200/70 mt-1">
                {t('syncBackup.summaryProfiles').replace('{n}', String(restoreResult.profilesRestored))}
                {' · '}
                {t('syncBackup.summarySongs').replace('{n}', String(restoreResult.songsRestored))}
                {' · '}
                {t('syncBackup.summaryPlaylists').replace('{n}', String(restoreResult.playlistsRestored))}
                {restoreResult.mediaRestored > 0
                  ? ` · ${t('syncBackup.summaryMedia').replace('{n}', String(restoreResult.mediaRestored)).replace('{size}', '')}`
                  : ''}
              </p>
              <p className="text-xs text-cyan-300/80 mt-2">{t('syncBackup.reloadHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── How it works ── */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span aria-hidden>ℹ️</span>
            {t('syncBackup.howTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
            <li>{t('syncBackup.howPoint1')}</li>
            <li>{t('syncBackup.howPoint2')}</li>
            <li>{t('syncBackup.howPoint3')}</li>
            <li>{t('syncBackup.howPoint4')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
