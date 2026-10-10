/**
 * Shared types of the sheet music (Notenblatt) recognition dialog.
 *
 * R13: moved byte-identically from src/components/editor/sheet-music-dialog.tsx
 * (only the `export` keyword was added to the previously file-private
 * declarations so the dialog modules can share them).
 */

// ─── Backend result types (mirror /api/sheet-music) ────────────────────

export interface SheetMusicNote {
  midi: number;
  beats: number;
}

export interface SheetMusicVoice {
  id: number;
  label: string;
  noteCount: number;
  notes: SheetMusicNote[];
}

export interface SheetMusicAnalysis {
  voices: SheetMusicVoice[];
  tempo: number;
  confidence: number;
  warnings: string;
  truncated: boolean;
}

export interface SheetMusicApiResponse {
  success: boolean;
  result?: SheetMusicAnalysis;
  error?: string;
}

/** Picked image: preview data URL + raw base64 + mime for the backend. */
export interface PickedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'];

/** Total note cap for a merged (all-PDF-pages) voice. */
export const MERGED_NOTE_CAP = 1500;
