// Lyric Editor Component Types and Utilities
import { Song, LyricLine, Note } from '@/types/game';

export interface LyricEditorState {
  song: Partial<Song>;
  selectedLineIndex: number | null;
  selectedNoteIndex: number | null;
  playheadPosition: number; // ms
  isPlaying: boolean;
  zoom: number; // pixels per second
  scrollOffset: number; // ms
  snapToGrid: boolean;
  gridSize: number; // ms (e.g., 100ms grid)
  showPitchGuide: boolean;
}

export const DEFAULT_EDITOR_STATE: Omit<LyricEditorState, 'song'> = {
  selectedLineIndex: null,
  selectedNoteIndex: null,
  playheadPosition: 0,
  isPlaying: false,
  zoom: 100, // 100px per second
  scrollOffset: 0,
  snapToGrid: true,
  gridSize: 100,
  showPitchGuide: true,
};

// Editor actions
export type EditorAction =
  | { type: 'ADD_LINE'; startTime: number }
  | { type: 'DELETE_LINE'; lineIndex: number }
  | { type: 'UPDATE_LINE'; lineIndex: number; updates: Partial<LyricLine> }
  | { type: 'ADD_NOTE'; lineIndex: number; note: Note }
  | { type: 'DELETE_NOTE'; lineIndex: number; noteIndex: number }
  | { type: 'UPDATE_NOTE'; lineIndex: number; noteIndex: number; updates: Partial<Note> }
  | { type: 'MOVE_NOTE'; lineIndex: number; noteIndex: number; newStartTime: number }
  | { type: 'RESIZE_NOTE'; lineIndex: number; noteIndex: number; newDuration: number }
  | { type: 'SPLIT_NOTE'; lineIndex: number; noteIndex: number; splitTime: number }
  | { type: 'MERGE_NOTES'; lineIndex: number; noteIndices: number[] }
  | { type: 'SET_PLAYHEAD'; position: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_SCROLL'; offset: number }
  | { type: 'SELECT_LINE'; lineIndex: number | null }
  | { type: 'SELECT_NOTE'; lineIndex: number | null; noteIndex: number | null }
  | { type: 'IMPORT_LYRICS'; text: string };

export function lyricEditorReducer(state: LyricEditorState, action: EditorAction): LyricEditorState {
  const lyrics = state.song.lyrics || [];
  
  switch (action.type) {
    case 'ADD_LINE': {
      const newLine: LyricLine = {
        id: `line-${Date.now()}`,
        text: '',
        startTime: action.startTime,
        endTime: action.startTime + 5000,
        notes: [],
      };
      return {
        ...state,
        song: {
          ...state.song,
          lyrics: [...lyrics, newLine].sort((a, b) => a.startTime - b.startTime),
        },
        selectedLineIndex: lyrics.length,
      };
    }
    
    case 'DELETE_LINE': {
      const newLyrics = lyrics.filter((_, i) => i !== action.lineIndex);
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
        selectedLineIndex: null,
      };
    }
    
    case 'UPDATE_LINE': {
      const newLyrics = [...lyrics];
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], ...action.updates };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'ADD_NOTE': {
      const newLyrics = [...lyrics];
      newLyrics[action.lineIndex] = {
        ...newLyrics[action.lineIndex],
        notes: [...newLyrics[action.lineIndex].notes, action.note],
      };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'DELETE_NOTE': {
      const newLyrics = [...lyrics];
      newLyrics[action.lineIndex] = {
        ...newLyrics[action.lineIndex],
        notes: newLyrics[action.lineIndex].notes.filter((_, i) => i !== action.noteIndex),
      };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'UPDATE_NOTE': {
      const newLyrics = [...lyrics];
      const notes = [...newLyrics[action.lineIndex].notes];
      notes[action.noteIndex] = { ...notes[action.noteIndex], ...action.updates };
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], notes };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'MOVE_NOTE': {
      const newLyrics = [...lyrics];
      const note = { ...newLyrics[action.lineIndex].notes[action.noteIndex] };
      note.startTime = state.snapToGrid 
        ? Math.round(action.newStartTime / state.gridSize) * state.gridSize 
        : action.newStartTime;
      const notes = [...newLyrics[action.lineIndex].notes];
      notes[action.noteIndex] = note;
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], notes };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'RESIZE_NOTE': {
      const newLyrics = [...lyrics];
      const note = { ...newLyrics[action.lineIndex].notes[action.noteIndex] };
      note.duration = Math.max(50, action.newDuration); // Minimum 50ms
      const notes = [...newLyrics[action.lineIndex].notes];
      notes[action.noteIndex] = note;
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], notes };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'SPLIT_NOTE': {
      const newLyrics = [...lyrics];
      const notes = [...newLyrics[action.lineIndex].notes];
      const originalNote = notes[action.noteIndex];
      
      const firstDuration = action.splitTime - originalNote.startTime;
      const secondDuration = originalNote.duration - firstDuration;
      
      const firstNote: Note = {
        ...originalNote,
        id: `${originalNote.id}-a`,
        duration: firstDuration,
      };
      
      const secondNote: Note = {
        ...originalNote,
        id: `${originalNote.id}-b`,
        startTime: action.splitTime,
        duration: secondDuration,
        lyric: '', // Clear lyric for second part
      };
      
      notes.splice(action.noteIndex, 1, firstNote, secondNote);
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], notes };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'MERGE_NOTES': {
      const newLyrics = [...lyrics];
      const notes = [...newLyrics[action.lineIndex].notes];
      const sortedIndices = [...action.noteIndices].sort((a, b) => a - b);
      
      const firstNote = notes[sortedIndices[0]];
      const lastNote = notes[sortedIndices[sortedIndices.length - 1]];
      
      const mergedNote: Note = {
        id: firstNote.id,
        pitch: firstNote.pitch,
        frequency: firstNote.frequency,
        startTime: firstNote.startTime,
        duration: lastNote.startTime + lastNote.duration - firstNote.startTime,
        lyric: sortedIndices.map(i => notes[i].lyric).join(''),
        isBonus: firstNote.isBonus,
        isGolden: firstNote.isGolden,
      };
      
      // Remove old notes and insert merged
      for (let i = sortedIndices.length - 1; i >= 0; i--) {
        notes.splice(sortedIndices[i], 1);
      }
      notes.push(mergedNote);
      notes.sort((a, b) => a.startTime - b.startTime);
      
      newLyrics[action.lineIndex] = { ...newLyrics[action.lineIndex], notes };
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    case 'SET_PLAYHEAD':
      return { ...state, playheadPosition: action.position };
    
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(20, Math.min(500, action.zoom)) };
    
    case 'SET_SCROLL':
      return { ...state, scrollOffset: Math.max(0, action.offset) };
    
    case 'SELECT_LINE':
      return { ...state, selectedLineIndex: action.lineIndex, selectedNoteIndex: null };
    
    case 'SELECT_NOTE':
      return { ...state, selectedLineIndex: action.lineIndex, selectedNoteIndex: action.noteIndex };
    
    case 'IMPORT_LYRICS': {
      const lines = action.text.split('\n');
      const newLyrics: LyricLine[] = lines.map((text, i) => ({
        id: `line-${i}`,
        text: text.trim(),
        startTime: i * 5000, // 5 seconds per line
        endTime: (i + 1) * 5000 - 500,
        notes: [],
      }));
      return {
        ...state,
        song: { ...state.song, lyrics: newLyrics },
      };
    }
    
    default:
      return state;
  }
}

// Convert time to pixel position
export function timeToPixel(time: number, zoom: number, scrollOffset: number): number {
  return (time / 1000) * zoom - scrollOffset;
}

// Convert pixel position to time
export function pixelToTime(pixel: number, zoom: number, scrollOffset: number): number {
  return ((pixel + scrollOffset) / zoom) * 1000;
}

// Pitch to Y position (for piano roll view)
export function pitchToY(pitch: number, minPitch: number, maxPitch: number, height: number): number {
  const range = maxPitch - minPitch;
  return height - ((pitch - minPitch) / range) * height;
}

// Y position to pitch
export function yToPitch(y: number, minPitch: number, maxPitch: number, height: number): number {
  const range = maxPitch - minPitch;
  return minPitch + (range * (height - y)) / height;
}

// Create a new note with defaults
export function createNewNote(startTime: number, pitch: number = 60): Note {
  return {
    id: `note-${Date.now()}`,
    pitch,
    frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime,
    duration: 500,
    lyric: '',
    isBonus: false,
    isGolden: false,
  };
}

// Export to UltraStar format
export function exportToUltraStar(song: Song): string {
  const lines: string[] = [];
  
  lines.push(`#TITLE:${song.title}`);
  lines.push(`#ARTIST:${song.artist}`);
  if (song.album) lines.push(`#ALBUM:${song.album}`);
  if (song.bpm) lines.push(`#BPM:${song.bpm}`);
  lines.push(`#GAP:${song.gap || 0}`);
  lines.push('');
  
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      const beat = Math.round(note.startTime / (60000 / (song.bpm || 120)));
      const duration = Math.round(note.duration / (60000 / (song.bpm || 120)));
      const type = note.isGolden ? '*' : note.isBonus ? 'F' : ':';
      lines.push(`${type} ${beat} ${note.pitch} ${duration} ${note.lyric}`);
    }
    lines.push('-');
  }
  
  lines.push('E');
  return lines.join('\n');
}
