// UltraStar txt file parser
// Supports the standard UltraStar song format

import { Song, Note, LyricLine, Difficulty, midiToFrequency } from '@/types/game';

export interface UltraStarSong {
  title: string;
  artist: string;
  mp3: string;
  video?: string;
  videoGap?: number;
  cover?: string;
  background?: string;
  bpm: number;
  gap: number;
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  year?: number;
  language?: string;
  edition?: string;
  creator?: string;
  notes: UltraStarNote[];
}

export interface UltraStarNote {
  type: ':' | '*' | 'F' | 'R' | 'G'; // : = normal, * = golden, F = freestyle, R = rap, G = rap golden
  startBeat: number;
  duration: number;
  pitch: number; // MIDI note
  lyric: string;
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
  };

  let lastNoteEnd = 0;

  for (const line of lines) {
    // Skip empty lines
    if (line.length === 0) continue;

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
            song.videoGap = parseFloat(value) || 0;
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

    // Parse note lines
    // Format: <type> <start> <duration> <pitch> <lyric>
    // Example: : 0 4 12 Hello
    const noteMatch = line.match(/^([:F*RGe])(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
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

      lastNoteEnd = start + duration;
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
  const beatDuration = 60000 / ultraStar.bpm; // ms per beat
  
  // Group notes into lyric lines
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';
  let currentLineStart = 0;
  let lastEndBeat = 0;

  // Sort notes by start beat
  const sortedNotes = [...ultraStar.notes].sort((a, b) => a.startBeat - b.startBeat);

  // Detect line breaks (gap in beats > threshold means new line)
  const LINE_BREAK_THRESHOLD = 8; // beats

  for (const note of sortedNotes) {
    // Check for line break
    if (lastEndBeat > 0 && (note.startBeat - lastEndBeat) >= LINE_BREAK_THRESHOLD) {
      // Save current line
      if (currentLineNotes.length > 0) {
        const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                        currentLineNotes[currentLineNotes.length - 1].duration;
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: currentLineText.trim(),
          startTime: currentLineStart,
          endTime,
          notes: currentLineNotes,
        });
        currentLineNotes = [];
        currentLineText = '';
      }
    }

    // Convert note timing
    const startTime = ultraStar.gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;
    
    if (currentLineNotes.length === 0) {
      currentLineStart = startTime;
    }

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch,
      frequency: midiToFrequency(note.pitch),
      startTime,
      duration,
      lyric: note.lyric,
      isBonus: note.type === 'F', // Freestyle notes are bonus
      isGolden: note.type === '*' || note.type === 'G', // Golden notes
    };

    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric + ' ';
    lastEndBeat = note.startBeat + note.duration;
  }

  // Don't forget the last line
  if (currentLineNotes.length > 0) {
    const endTime = currentLineNotes[currentLineNotes.length - 1].startTime + 
                    currentLineNotes[currentLineNotes.length - 1].duration;
    lyricLines.push({
      id: `line-${lyricLines.length}`,
      text: currentLineText.trim(),
      startTime: currentLineStart,
      endTime,
      notes: currentLineNotes,
    });
  }

  // Calculate total duration
  const totalDuration = lyricLines.length > 0 
    ? Math.max(...lyricLines.map(l => l.endTime)) + 10000 // Add 10 seconds buffer
    : 180000;

  // Determine difficulty based on note density
  const totalNotes = sortedNotes.length;
  const songDurationMinutes = totalDuration / 60000;
  const notesPerMinute = totalNotes / songDurationMinutes;
  
  let difficulty: Difficulty = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';

  // Calculate rating based on difficulty
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
    coverImage: coverUrl || ultraStar.cover,
    videoBackground: videoUrl || ultraStar.video,
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
  
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      const startBeat = Math.round((note.startTime - song.gap) / beatDuration);
      const duration = Math.round(note.duration / beatDuration);
      const type = note.isGolden ? '*' : note.isBonus ? 'F' : ':';
      
      lines.push(`${type} ${startBeat} ${duration} ${note.pitch} ${note.lyric}`);
    }
    // Line break indicator
    lines.push('- 0 0 0 ');
  }
  
  lines.push('E'); // End marker
  
  return lines.join('\n');
}
