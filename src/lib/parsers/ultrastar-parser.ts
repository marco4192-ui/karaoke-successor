// UltraStar txt file parser
// Supports the standard UltraStar song format
// 
// Format explanation:
// - Header: #KEY:VALUE (e.g., #TITLE:, #ARTIST:, #BPM:, #GAP:)
// - Notes: <type> <startBeat> <duration> <pitch> <lyric>
//   - : = normal note
//   - * = golden note (bonus points)
//   - F = freestyle (optional)
//   - R = rap note
//   - G = rap golden
// - Line breaks: - <beat> (marks end of a lyric line)
// - End: E

import { Song, Note, LyricLine, Difficulty, midiToFrequency } from '@/types/game';

export interface UltraStarNote {
  type: ':' | '*' | 'F' | 'R' | 'G';
  startBeat: number;
  duration: number;
  pitch: number; // Relative pitch (0-24 typical range)
  lyric: string;
}

export interface UltraStarLineBreak {
  beat: number;
}

export interface UltraStarSong {
  title: string;
  artist: string;
  mp3: string;
  video?: string;
  videoGap?: number;
  cover?: string;
  background?: string;
  bpm: number;
  gap: number; // Milliseconds before first note
  start?: number; // #START tag - milliseconds to skip at beginning of audio
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  year?: number;
  language?: string;
  edition?: string;
  creator?: string;
  end?: number; // #END tag - song end time in ms
  notes: UltraStarNote[];
  lineBreaks: number[]; // Beats where line breaks occur
}

// Parse UltraStar txt file content
export function parseUltraStarTxt(content: string): UltraStarSong {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const song: UltraStarSong = {
    title: 'Unknown',
    artist: 'Unknown',
    mp3: '',
    bpm: 120,
    gap: 0,
    notes: [],
    lineBreaks: [],
  };

  for (const line of lines) {
    // Parse header attributes (#KEY:VALUE format)
    if (line.startsWith('#')) {
      const match = line.match(/^#(\w+):(.*)$/);
      if (match) {
        const [, key, value] = match;
        switch (key.toUpperCase()) {
          case 'TITLE':
            song.title = value.trim();
            break;
          case 'ARTIST':
            song.artist = value.trim();
            break;
          case 'MP3':
            song.mp3 = value.trim();
            break;
          case 'VIDEO':
            song.video = value.trim();
            break;
          case 'VIDEOGAP':
            song.videoGap = parseFloat(value.replace(',', '.')) || 0;
            break;
          case 'COVER':
            song.cover = value.trim();
            break;
          case 'BACKGROUND':
            song.background = value.trim();
            break;
          case 'BPM':
            // BPM can be decimal or comma-separated
            song.bpm = parseFloat(value.replace(',', '.')) || 120;
            break;
          case 'GAP':
            song.gap = parseInt(value) || 0;
            break;
          case 'START':
            song.start = parseInt(value) || 0;
            break;
          case 'END':
            song.end = parseInt(value) || undefined;
            break;
          case 'PREVIEWSTART':
            song.previewStart = parseFloat(value) || 0;
            break;
          case 'PREVIEWDURATION':
            song.previewDuration = parseFloat(value) || 0;
            break;
          case 'GENRE':
            song.genre = value.trim();
            break;
          case 'YEAR':
            song.year = parseInt(value) || undefined;
            break;
          case 'LANGUAGE':
            song.language = value.trim();
            break;
          case 'EDITION':
            song.edition = value.trim();
            break;
          case 'CREATOR':
            song.creator = value.trim();
            break;
        }
      }
      continue;
    }

    // End of file marker
    if (line === 'E') {
      break;
    }

    // Parse line break: - <beat> [duration] [pitch]
    // Line breaks mark the end of a lyric line
    if (line.startsWith('-')) {
      const match = line.match(/^-\s*(-?\d+)/);
      if (match) {
        song.lineBreaks.push(parseInt(match[1]));
      }
      continue;
    }

    // Parse note lines
    // Format: <type> <startBeat> <duration> <pitch> <lyric>
    // Example: : 0 4 12 Hello
    // Types: : = normal, * = golden, F = freestyle, R = rap, G = rap golden
    const noteMatch = line.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      const start = parseInt(startStr);
      const duration = parseInt(durationStr);
      const pitch = parseInt(pitchStr);

      song.notes.push({
        type: type as UltraStarNote['type'],
        startBeat: start,
        duration,
        pitch,
        lyric: lyric.trim(),
      });
    }
  }

  return song;
}

// Convert UltraStar format to our Song format
export function convertUltraStarToSong(
  ultraStar: UltraStarSong, 
  audioUrl: string,
  videoUrl?: string,
  coverUrl?: string
): Song {
  // Convert beats to milliseconds
  // beatDuration = 60000 / BPM (ms per beat)
  const beatDuration = 60000 / ultraStar.bpm;
  
  // Base MIDI note offset - UltraStar pitches are relative
  // Typical range is 0-24, mapping to C3-C5 (MIDI 48-72)
  // This is the standard UltraStar pitch mapping
  const MIDI_BASE_OFFSET = 48;

  // Sort notes by start beat
  const sortedNotes = [...ultraStar.notes].sort((a, b) => a.startBeat - b.startBeat);
  
  // Create a set of line break beats for quick lookup
  const lineBreakBeats = new Set(ultraStar.lineBreaks);

  // Group notes into lyric lines
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    
    // Convert note timing:
    // startTime = GAP + (startBeat * beatDuration)
    // This accounts for the delay before lyrics start
    const startTime = ultraStar.gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F', // Freestyle notes are bonus
      isGolden: note.type === '*' || note.type === 'G', // Golden notes
    };

    currentLineNotes.push(convertedNote);
    // Add space between words for readable display
    currentLineText += (currentLineText ? ' ' : '') + note.lyric;

    // Check if this note ends a line:
    // 1. Explicit line break after this note
    // 2. Or it's the last note
    const isLineBreak = lineBreakBeats.has(noteEndBeat) || 
                        (i < sortedNotes.length - 1 && 
                         sortedNotes[i + 1].startBeat - noteEndBeat >= 8); // Fallback: gap > 8 beats

    if (isLineBreak || i === sortedNotes.length - 1) {
      if (currentLineNotes.length > 0) {
        const lineStartTime = currentLineNotes[0].startTime;
        const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                           currentLineNotes[currentLineNotes.length - 1].duration;
        
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: currentLineText.trim(),
          startTime: lineStartTime,
          endTime: lineEndTime,
          notes: currentLineNotes,
        });
        
        currentLineNotes = [];
        currentLineText = '';
      }
    }
  }

  // Calculate total duration from #END tag or last note
  let totalDuration: number;
  if (ultraStar.end) {
    totalDuration = ultraStar.end;
  } else if (lyricLines.length > 0) {
    totalDuration = Math.max(...lyricLines.map(l => l.endTime)) + 5000; // 5 second buffer
  } else {
    totalDuration = 180000; // Default 3 minutes
  }

  // Determine difficulty based on note density
  const totalNotes = sortedNotes.length;
  const songDurationMinutes = totalDuration / 60000;
  const notesPerMinute = songDurationMinutes > 0 ? totalNotes / songDurationMinutes : 0;
  
  let difficulty: Difficulty = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';

  // Calculate rating based on note density
  const rating = Math.min(5, Math.max(1, Math.ceil(notesPerMinute / 10)));

  return {
    id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: ultraStar.title,
    artist: ultraStar.artist,
    album: ultraStar.edition,
    year: ultraStar.year,
    genre: ultraStar.genre,
    duration: totalDuration,
    bpm: ultraStar.bpm,
    difficulty,
    rating,
    gap: ultraStar.gap,
    start: ultraStar.start,
    coverImage: coverUrl || ultraStar.cover,
    videoBackground: videoUrl || ultraStar.video,
    videoGap: ultraStar.videoGap,
    audioUrl,
    lyrics: lyricLines,
    preview: ultraStar.previewStart ? {
      startTime: ultraStar.previewStart * 1000,
      duration: (ultraStar.previewDuration || 30) * 1000,
    } : undefined,
  };
}

// Generate UltraStar txt content from Song (for export)
export function generateUltraStarTxt(song: Song): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`#TITLE:${song.title}`);
  lines.push(`#ARTIST:${song.artist}`);
  lines.push(`#MP3:song.mp3`);
  lines.push(`#BPM:${song.bpm.toFixed(2)}`);
  lines.push(`#GAP:${song.gap}`);
  
  if (song.videoBackground) {
    lines.push(`#VIDEO:video.mp4`);
  }
  if (song.coverImage) {
    lines.push(`#COVER:cover.jpg`);
  }
  if (song.genre) {
    lines.push(`#GENRE:${song.genre}`);
  }
  if (song.year) {
    lines.push(`#YEAR:${song.year}`);
  }
  
  lines.push(''); // Empty line before notes
  
  // Convert notes to UltraStar format
  const beatDuration = 60000 / song.bpm;
  const MIDI_BASE_OFFSET = 48;
  
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      const startBeat = Math.round((note.startTime - song.gap) / beatDuration);
      const duration = Math.round(note.duration / beatDuration);
      const relativePitch = note.pitch - MIDI_BASE_OFFSET;
      const type = note.isGolden ? '*' : note.isBonus ? 'F' : ':';
      
      lines.push(`${type} ${startBeat} ${duration} ${relativePitch} ${note.lyric}`);
    }
    // Line break indicator at the end of each line
    const lastNote = line.notes[line.notes.length - 1];
    const lineBreakBeat = Math.round((lastNote.startTime + lastNote.duration - song.gap) / beatDuration);
    lines.push(`- ${lineBreakBeat}`);
  }
  
  lines.push('E'); // End marker
  
  return lines.join('\n');
}
