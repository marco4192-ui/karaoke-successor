'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSong } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { normalizeLanguage, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { persistSongMetadataToTxt } from '@/lib/editor/persist-metadata';
import {
  harmonizeSongs,
  HarmonizeSuggestion,
  HarmonizeProgress,
} from '@/lib/ai/harmonize-client';
import {
  SuggestionRow,
  ConfidenceFilter,
  fieldPassesThreshold,
  countApplicableSongs,
} from '@/components/editor/harmonize-shared';

/**
 * Per-library AI harmonize card (sidebar of the editor).
 *
 * Runs the shared pipeline (R2 cache → R6 factual lookup → LLM chunks R3)
 * over the whole library instead of a silent 50-song slice, with the same
 * threshold filter (R4), reason display (R5) — and the same txt persistence
 * as the batch dialog (library-only updates would be wiped by a rescan).
 */
export function AiHarmonizeCard({
  songs,
  onApplied,
  t,
}: {
  songs: Song[];
  onApplied: () => void;
  t: (key: string) => string;
}) {
  const [suggestions, setSuggestions] = useState<HarmonizeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [progress, setProgress] = useState<HarmonizeProgress | null>(null);
  const [minConfidence, setMinConfidence] = useState(70);
  // txt persistence feedback (same as the batch dialog)
  const [applyProgress, setApplyProgress] = useState<{ done: number; total: number } | null>(null);
  const [fileErrors, setFileErrors] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // R3: ALL songs — the pipeline chunks internally
  const songsToHarmonize = useMemo(() => songs, [songs]);

  const handleHarmonize = useCallback(async () => {
    if (songsToHarmonize.length === 0) return;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setProgress(null);

    try {
      const result = await harmonizeSongs(
        songsToHarmonize.map(s => ({
          id: s.id, title: s.title, artist: s.artist,
          genre: s.genre ?? null, language: s.language ?? null, year: s.year ?? null,
        })),
        { onProgress: setProgress },
      );

      if (result.success || result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
      } else {
        setError(result.error || t('editor.aiAssistant.failed'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('editor.aiAssistant.networkError'));
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [songsToHarmonize, t]);

  const handleApplySingle = useCallback(async (
    songId: string,
    field: 'genre' | 'language' | 'year',
    value: string | number,
  ) => {
    const normalized = field === 'genre'
      ? normalizeGenreName(String(value))
      : field === 'language'
        ? normalizeLanguage(String(value))
        : Number(value);
    const updates: Partial<Song> = { [field]: normalized };

    updateSong(songId, updates);
    // Same persistence contract as the batch dialog: write #GENRE/#LANGUAGE/
    // #YEAR to the source txt so a folder rescan doesn't wipe the change.
    const fileOk = await persistSongMetadataToTxt(songId, updates);
    if (!isMountedRef.current) return;
    if (!fileOk.success) setFileErrors(prev => (prev ?? 0) + 1);

    setSuggestions(prev => prev
      .map(s => s.songId === songId
        ? { ...s, ...(field === 'genre' ? { suggestedGenre: null } : field === 'language' ? { suggestedLanguage: null } : { suggestedYear: null }) }
        : s)
      .filter(s => s.suggestedGenre || s.suggestedLanguage || s.suggestedYear));
    onApplied();
  }, [onApplied]);

  const handleApplyAll = useCallback(async () => {
    const list = suggestions;
    if (list.length === 0) return;

    setApplyProgress({ done: 0, total: list.length });
    let failedFiles = 0;
    let processed = 0;

    for (const s of list) {
      const updates: Partial<Song> = {};
      // R4: threshold-aware (factual sources + years exempt)
      if (s.suggestedGenre && fieldPassesThreshold('genre', s, minConfidence)) {
        updates.genre = normalizeGenreName(s.suggestedGenre);
      }
      if (s.suggestedLanguage && fieldPassesThreshold('language', s, minConfidence)) {
        updates.language = normalizeLanguage(s.suggestedLanguage);
      }
      if (s.suggestedYear && s.suggestedYear !== s.currentYear) {
        updates.year = s.suggestedYear;
      }

      if (Object.keys(updates).length > 0) {
        updateSong(s.songId, updates);
        const fileOk = await persistSongMetadataToTxt(s.songId, updates);
        if (!fileOk.success) failedFiles++;
      }
      processed++;
      if (!isMountedRef.current) return;
      setApplyProgress({ done: processed, total: list.length });
    }

    if (!isMountedRef.current) return;
    setApplyProgress(null);
    setFileErrors(failedFiles > 0 ? failedFiles : null);
    setSuggestions([]);
    setShowWarning(false);
    onApplied();
  }, [suggestions, minConfidence, onApplied]);

  const requestApplyAll = useCallback(() => {
    setShowWarning(true);
  }, []);

  const dismissed = suggestions.length === 0 && !isLoading && !error;
  const applicableCount = countApplicableSongs(suggestions, minConfidence);
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🤖 {t('editor.aiHarmonize')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dismissed ? (
          <p className="text-xs text-white/40">
            {t('editor.aiHarmonizeDesc')} ({songs.length})
          </p>
        ) : null}

        {suggestions.length > 0 && (
          <>
            <ConfidenceFilter value={minConfidence} onChange={setMinConfidence} t={t} />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestions.map(s => (
                <SuggestionRow
                  key={s.songId}
                  suggestion={s}
                  minConfidence={minConfidence}
                  onApply={handleApplySingle}
                />
              ))}
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* txt persistence progress + file errors (same contract as the batch dialog) */}
        {applyProgress && (
          <div className="flex items-center gap-2 text-[11px] text-white/60">
            <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-mono tabular-nums">{applyProgress.done}/{applyProgress.total}</span>
          </div>
        )}
        {fileErrors !== null && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2" data-testid="harmonize-card-file-error">
            <span className="text-sm leading-none">⚠️</span>
            <p className="text-[10px] text-amber-200/90 flex-1">
              {t('editor.aiBatchFileErrors').replace('{count}', String(fileErrors))}
            </p>
            <button
              onClick={() => setFileErrors(null)}
              className="text-white/40 hover:text-white/80 text-xs"
              aria-label="Dismiss"
            >✕</button>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleHarmonize}
            disabled={isLoading || songsToHarmonize.length === 0}
            className="flex-1 border-violet-500/50 text-violet-400 hover:bg-violet-500/10 text-xs"
          >
            {isLoading ? (
              <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-1" />
            ) : null}
            {isLoading && progress
              ? `${progress.done}/${progress.total}`
              : isLoading
                ? t('editor.aiHarmonizeLoading')
                : t('editor.aiHarmonizeBtn')}
          </Button>
          {suggestions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={requestApplyAll}
              disabled={applicableCount === 0}
              className="border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs disabled:opacity-40"
            >
              {t('editor.aiApplyAll')} ({applicableCount})
            </Button>
          )}
        </div>

        {/* Warning Dialog — shown before applying all changes */}
        {showWarning && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{t('editor.aiHarmonizeWarnTitle')}</h3>
                  <p className="text-white/60 text-xs mt-0.5">{t('editor.aiHarmonizeWarnSubtitle')}</p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-white/70 space-y-2">
                <p>{t('editor.aiHarmonizeWarn1')}</p>
                <ul className="list-disc list-inside space-y-1 text-white/60">
                  <li>{t('editor.aiHarmonizeWarn2')}</li>
                  <li>{t('editor.aiHarmonizeWarn3')}</li>
                  <li>{t('editor.aiHarmonizeWarn4')}</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/50">
                <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{applicableCount}</span>
                <span>{t('editor.aiHarmonizeWarnCount')}</span>
              </div>

              {/* R4: threshold note in the warning */}
              <div className="flex items-center gap-2 text-[11px] text-white/50 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2">
                <span>🛡️</span>
                <span>
                  {t('editor.aiBatchThresholdNote').replace('{value}', String(minConfidence))}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setShowWarning(false); }}
                  disabled={!!applyProgress}
                  className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
                >
                  {t('editor.aiHarmonizeWarnCancel')}
                </Button>
                <Button
                  onClick={handleApplyAll}
                  disabled={!!applyProgress}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
                >
                  {applyProgress
                    ? `${applyProgress.done}/${applyProgress.total}`
                    : t('editor.aiHarmonizeWarnConfirm')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
