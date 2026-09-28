'use client';

/**
 * Save flow for the KaraokeEditor (R5 module split, extracted 1:1 from
 * karaoke-editor.tsx). File-first: the txt file is written BEFORE updating
 * the library / closing the editor — if the write fails the user stays in
 * the editor with a visible error.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import { saveSongToTxt, type SaveResult } from '@/lib/editor/save-to-file';

interface UseEditorSaveArgs {
  /** Authoritative song ref — the save reads the latest state from it. */
  currentSongRef: RefObject<Song>;
  /** Clears the unsaved-changes flag after a successful write. */
  markSaved: () => void;
  /** Parent callback: close the editor (only used by handleSave). */
  onSave: (_song: Song) => void;
}

export function useEditorSave({ currentSongRef, markSaved, onSave }: UseEditorSaveArgs) {
  const { t } = useTranslation();
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  // Ref to track save-result dismissal timer so it can be cleared on unmount
  const saveResultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the save-result timer on unmount to prevent leaks
  useEffect(() => {
    return () => {
      if (saveResultTimerRef.current) clearTimeout(saveResultTimerRef.current);
    };
  }, []);

  const showSaveResult = useCallback((result: SaveResult) => {
    setSaveResult(result);
    if (saveResultTimerRef.current) clearTimeout(saveResultTimerRef.current);
    saveResultTimerRef.current = setTimeout(() => setSaveResult(null), 5000);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const songToSave = currentSongRef.current;
      const result = await saveSongToTxt(songToSave);
      if (result.success) {
        markSaved();
        // Persist to the in-memory library (upsert — 1.3: a NEW song from
        // the New Song dialog is only added to the library at this point),
        // then close via the parent
        const { upsertSong } = await import('@/lib/game/song-library');
        await upsertSong(songToSave);
        onSave(songToSave);
      } else {
        // Stay open — the file could not be written
        showSaveResult(result);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save error:', error);
      showSaveResult({
        success: false,
        message: `${t('editor.saveError')}: ${error instanceof Error ? error.message : t('editor.unknownError')}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [onSave, markSaved, showSaveResult, t, currentSongRef]); // R5: stable ref in deps — never re-creates

  // Save only — persist to file but stay in the editor
  const handleSaveOnly = useCallback(async () => {
    setIsSaving(true);
    setSaveResult(null);
    try {
      const songToSave = currentSongRef.current;
      const result = await saveSongToTxt(songToSave);
      if (result.success) {
        markSaved();
        // Upsert (1.3): also persists a brand-new song on "save only"
        const { upsertSong } = await import('@/lib/game/song-library');
        await upsertSong(songToSave);
      }
      showSaveResult(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Save error:', error);
      showSaveResult({
        success: false,
        message: `${t('editor.saveError')}: ${error instanceof Error ? error.message : t('editor.unknownError')}`,
      });
    } finally {
      setIsSaving(false);
    }
  }, [markSaved, showSaveResult, t, currentSongRef]); // R5: stable ref in deps — never re-creates

  return { isSaving, saveResult, handleSave, handleSaveOnly };
}
