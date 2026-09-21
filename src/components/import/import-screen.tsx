'use client';

import { useState } from 'react';
import { AlternateFormatTab } from './alternate-format-tab';
import { ImportScreenProps } from './import-types';
import { Song } from '@/types/game';

/**
 * Import Songs (Settings → Library) — R10-2 redesign.
 *
 * Formerly three nested tabs (Ultrastar import / Folder Scan / More formats);
 * the first two were superseded by the multi-folder library (Settings →
 * Library → Songs Folder + Additional Folders, which scans real UltraStar
 * folder structures) and are GONE.
 *
 * What remains is the single converter: import songs from other karaoke
 * systems (MIDI/KAR, Karaoke Mugen .ass/.json, SingStar, StepMania) — the
 * app converts them into a proper UltraStar song (txt + media persisted, see
 * AlternateFormatTab.handleAddToLibrary).
 */
export function ImportScreen({ onImport }: ImportScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSong, setPreviewSong] = useState<Song | null>(null);

  return (
    <AlternateFormatTab
      isProcessing={isProcessing}
      setIsProcessing={setIsProcessing}
      error={error}
      setError={setError}
      previewSong={previewSong}
      setPreviewSong={setPreviewSong}
      onImport={(_song: Song) => onImport(_song)}
    />
  );
}
