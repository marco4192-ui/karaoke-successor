// Shared types for the KaraokeEditor module family (R5 refactor split).
// karaoke-editor.tsx stays the orchestrator (state + composition); these
// interfaces give the extracted sub-views an explicit, `any`-free contract.
// Purely type-level — no runtime exports.

import type { RefObject } from 'react';
import type { Song, Note, LyricLine } from '@/types/game';
import type { DetectedNote } from '@/hooks/use-audio-analysis';
import type { EditorHeaderPanel } from '../editor-header';

/** Props of the editor orchestrator (public surface — unchanged shape). */
export interface KaraokeEditorProps {
  song: Song;
  onSave: (_song: Song) => void;
  onCancel: () => void;
}

/**
 * Command object for "jump to note" requests ({noteId, nonce}) that flow
 * into the Timeline (which owns the scroll/pitch-center state). The nonce
 * makes repeated jumps to the same note retrigger.
 */
export interface EditorNoteJumpCommand {
  noteId: string;
  nonce: number;
}

/** Left sidebar: Liedtext (lyrics) box on top + compact Shortcuts reference below. */
export interface EditorLeftPanelProps {
  song: Song;
  currentTime: number;
  selectedNoteId: string | undefined;
  onNoteSelect: (_noteId: string | undefined) => void;
  onTimeChange: (_time: number) => void;
  onNoteJump: (_note: Note) => void;
}

/**
 * Right sliding sidebar with the header tab panels
 * (metadata / audio analysis / AI assistant).
 */
export interface EditorHeaderPanelSidebarProps {
  activePanel: Exclude<EditorHeaderPanel, 'none'>;
  song: Song;
  allNotesCount: number;
  analysisAudioPath: string | null;
  onClose: () => void;
  onSongChange: (updater: (_prev: Song) => Song) => void;
  onMarkDirty: () => void;
  onApplyNotes: (_notes: DetectedNote[]) => void;
  onApplyBpm: (_bpm: number) => void;
  onSongUpdate: (_updates: Partial<Song>) => void;
  onLyricsUpdate: (_lyrics: LyricLine[]) => void;
}

/** Cancel confirmation modal (guard against losing unsaved changes). */
export interface EditorCancelConfirmDialogProps {
  isSaving: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

/**
 * Hidden audio sources of the editor: plain `<audio>` element, MIDI synth
 * bridge (when the song's music IS a MIDI/KAR file) and the video-file
 * fallback when no separate audio exists.
 */
export interface EditorAudioSourceBridgeProps {
  audioUrl: string | undefined;
  videoBackground: string | undefined;
  songId: string;
  midiMusicActive: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  onEnded: () => void;
}
