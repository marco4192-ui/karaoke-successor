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
// - Line breaks: - <beat> (marks end of a lyric line, separate line in file)
// - End: E
//
// LYRIC SPACING RULES:
// - Trailing space in lyric = end of word (space is displayed)
// - No trailing space = syllable connected to next note
// - Line breaks ("- <beat>") create new lyric lines
// - A hyphen "-" as lyric text is just normal text, NOT a line break

import { Song, Note, LyricLine, Difficulty, DuetPlayer, midiToFrequency } from '@/types/game';

export interface UltraStarNote {
  type: ':' | '*' | 'F' | 'R' | 'G';
  startBeat: number;
  duration: number;
  pitch: number; // Relative pitch (0-24 typical range)
  lyric: string;
  player?: DuetPlayer; // For duet mode: P1, P2, or undefined (both)
}

export interface UltraStarLineBreak {
  beat: number;
}

export interface UltraStarSong {
  title: string;
  artist: string;
  mp3: string;
  video?: string;
  youtubeUrl?: string; // YouTube video URL (from #VIDEO: if it's a URL)
  videoGap?: number;
  cover?: string;
  background?: string;
  bpm: number;
  gap: number; // Milliseconds before first note
  start?: number; // #START tag - milliseconds to skip at beginning of audio
  end?: number; // #END tag - song end time in ms
  previewStart?: number;
  previewDuration?: number;
  genre?: string;
  year?: number;
  language?: string;
  edition?: string;
  creator?: string;
  version?: string; // #VERSION: - format version
  medleyStartBeat?: number; // #MEDLEYSTARTBEAT:
  medleyEndBeat?: number; // #MEDLEYENDBEAT:
  tags?: string; // #TAGS:
  notes: UltraStarNote[];
  lineBreaks: number[]; // Beats where line breaks occur
  // Duet mode support
  isDuet?: boolean;
  duetPlayerNames?: [string, string]; // P1 and P2 names
}

// Parse UltraStar txt file content
export function parseUltraStarTxt(content: string): UltraStarSong {
  // IMPORTANT: Don't trim lines! Trailing spaces in lyrics are significant.
  // - Trailing space in lyric (e.g., "way ") = end of word
  // - No trailing space (e.g., "runa") = syllable connected to next note
  // Only filter out completely empty lines
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  const song: UltraStarSong = {
    title: 'Unknown',
    artist: 'Unknown',
    mp3: '',
    bpm: 120,
    gap: 0,
    notes: [],
    lineBreaks: [],
  };
  
  // Track current player for duet mode
  let currentPlayer: DuetPlayer | undefined = undefined;
  let hasDuetNotes = false;

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
            // Check if this is a YouTube URL
            const videoValue = value.trim();
            if (videoValue.startsWith('http://') || videoValue.startsWith('https://')) {
              // This is a URL (likely YouTube)
              song.youtubeUrl = videoValue;
              // Also set video field for backward compatibility
              song.video = videoValue;
            } else {
              song.video = videoValue;
            }
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
          case 'P1':
            // P1 name for duet mode
            if (!song.duetPlayerNames) {
              song.duetPlayerNames = [value.trim(), 'Player 2'];
            } else {
              song.duetPlayerNames[0] = value.trim();
            }
            break;
          case 'P2':
            // P2 name for duet mode
            if (!song.duetPlayerNames) {
              song.duetPlayerNames = ['Player 1', value.trim()];
            } else {
              song.duetPlayerNames[1] = value.trim();
            }
            break;
          case 'VERSION':
            song.version = value.trim();
            break;
          case 'MEDLEYSTARTBEAT':
            song.medleyStartBeat = parseInt(value) || undefined;
            break;
          case 'MEDLEYENDBEAT':
            song.medleyEndBeat = parseInt(value) || undefined;
            break;
          case 'TAGS':
            song.tags = value.trim();
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

    // Check for player switch markers (P1: or P2: at line start)
    if (line === 'P1' || line === 'P1:') {
      currentPlayer = 'P1';
      hasDuetNotes = true;
      continue;
    }
    if (line === 'P2' || line === 'P2:') {
      currentPlayer = 'P2';
      hasDuetNotes = true;
      continue;
    }
    
    // Parse note lines
    // Format: [P1/P2:] <type> <startBeat> <duration> <pitch> <lyric>
    // Example: : 0 4 12 Hello  OR  P1: : 0 4 12 Hello
    // Types: : = normal, * = golden, F = freestyle, R = rap, G = rap golden
    
    // First check for P1/P2 prefix in note line
    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: DuetPlayer | undefined = currentPlayer;
    
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
      hasDuetNotes = true;
    }
    
    const noteMatch = noteLine.match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
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
        // DON'T trim - preserve trailing spaces for syllable detection
        // A trailing space means this is a complete word, no space means it's a syllable
        lyric: lyric, 
        player: notePlayer,
      });
      continue;
    }
  }
  
  // Mark as duet if we found player assignments
  if (hasDuetNotes) {
    song.isDuet = true;
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
  // Convert beats to milliseconds using the CORRECT UltraStar formula
  // UltraStar BPM is actually "Beats per 4 measures" - so we need to divide by 4
  // Formula: beatDuration = 60 seconds / BPM / 4 * 1000 = 15000 / BPM
  // This matches the official UltraStar formula: time = beat / BPM / 4 * 60 + GAP
  const beatDuration = 15000 / ultraStar.bpm; // 60000 / (BPM * 4)
  
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
  let currentLinePlayer: DuetPlayer | undefined = undefined;

  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;

    // Convert note timing:
    // startTime = GAP + (startBeat * beatDuration)
    // This accounts for the delay before lyrics start
    const startTime = ultraStar.gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;

    // LYRIC HANDLING:
    // In UltraStar format:
    // - Trailing space = end of word (display space after the word)
    // - No trailing space = syllable (connected to next note)
    // - Line breaks are separate lines: "- <beat>" (handled via lineBreakBeats)
    // - A lyric of "-" on a note is just a normal note with hyphen text (NOT a line break)

    const rawLyric = note.lyric;

    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: rawLyric,
      isBonus: note.type === 'F', // Freestyle notes are bonus
      isGolden: note.type === '*' || note.type === 'G', // Golden notes
      player: note.player, // Preserve player assignment for duet mode
    };

    // Add note to current line
    currentLineNotes.push(convertedNote);

    // Build line text: concatenate lyrics, spaces are already embedded
    currentLineText += rawLyric;

    // Track line player
    if (currentLinePlayer === undefined) {
      currentLinePlayer = note.player;
    } else if (currentLinePlayer !== note.player && note.player !== undefined) {
      currentLinePlayer = 'both';
    }

    // Check if this note ends a line (after adding)
    // Line breaks are determined ONLY by the explicit "- <beat>" markers in lineBreakBeats,
    // or by a large gap between notes (8+ beats fallback).
    const nextNoteStart = i < sortedNotes.length - 1 ? sortedNotes[i + 1].startBeat : -1;
    const isLineBreak = lineBreakBeats.has(noteEndBeat) ||
                        (nextNoteStart >= 0 && lineBreakBeats.has(nextNoteStart)) ||
                        (i < sortedNotes.length - 1 &&
                         nextNoteStart - noteEndBeat >= 8);

    if ((isLineBreak || i === sortedNotes.length - 1) && currentLineNotes.length > 0) {
      const lineStartTime = currentLineNotes[0].startTime;
      const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime +
                         currentLineNotes[currentLineNotes.length - 1].duration;

      // Build line text: PRESERVE SPACES between words
      // Only trim leading whitespace, keep internal and trailing spaces
      let finalLineText = currentLineText.replace(/^\s+/, '');

      if (finalLineText) {
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: finalLineText,
          startTime: lineStartTime,
          endTime: lineEndTime,
          notes: currentLineNotes,
          player: currentLinePlayer,
        });
      }

      currentLineNotes = [];
      currentLineText = '';
      currentLinePlayer = undefined;
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

  // Determine if video is a YouTube URL or local file
  let videoBackground: string | undefined;
  let youtubeUrl: string | undefined;
  
  if (ultraStar.youtubeUrl) {
    // YouTube URL was detected during parsing
    youtubeUrl = ultraStar.youtubeUrl;
    videoBackground = undefined; // Don't set videoBackground for YouTube URLs
  } else if (ultraStar.video) {
    // Local video file
    if (ultraStar.video.startsWith('http://') || ultraStar.video.startsWith('https://')) {
      // URL detected - treat as YouTube
      youtubeUrl = ultraStar.video;
    } else {
      // Local file path
      videoBackground = videoUrl || ultraStar.video;
    }
  }

  return {
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    title: ultraStar.title,
    artist: ultraStar.artist,
    album: ultraStar.edition,
    year: ultraStar.year,
    genre: ultraStar.genre,
    language: ultraStar.language,
    duration: totalDuration,
    bpm: ultraStar.bpm,
    difficulty,
    rating,
    gap: ultraStar.gap,
    start: ultraStar.start,
    end: ultraStar.end,
    coverImage: coverUrl || ultraStar.cover,
    backgroundImage: ultraStar.background,
    videoBackground,
    youtubeUrl,
    videoGap: ultraStar.videoGap,
    audioUrl,
    // If we have YouTube URL but no audio file, we'll use YouTube's audio
    hasEmbeddedAudio: !audioUrl && !!youtubeUrl,
    lyrics: lyricLines,
    preview: ultraStar.previewStart ? {
      startTime: ultraStar.previewStart * 1000,
      duration: (ultraStar.previewDuration || 30) * 1000,
    } : undefined,
    // Duet mode properties
    isDuet: ultraStar.isDuet,
    duetPlayerNames: ultraStar.duetPlayerNames,
    // UltraStar TXT Metadata
    version: ultraStar.version,
    creator: ultraStar.creator,
    mp3File: ultraStar.mp3,
    coverFile: ultraStar.cover,
    backgroundFile: ultraStar.background,
    videoFile: ultraStar.video && !ultraStar.youtubeUrl ? ultraStar.video : undefined,
    previewStart: ultraStar.previewStart,
    previewDuration: ultraStar.previewDuration,
    medleyStartBeat: ultraStar.medleyStartBeat,
    medleyEndBeat: ultraStar.medleyEndBeat,
    tags: ultraStar.tags,
  };
}

// Generate UltraStar txt content from Song (for export)
export function generateUltraStarTxt(song: Song): string {
  const lines: string[] = [];

  // Header - Basic Info
  // VERSION (optional)
  if (song.version) {
    lines.push(`#VERSION:${song.version}`);
  }

  lines.push(`#TITLE:${song.title}`);
  lines.push(`#ARTIST:${song.artist}`);

  // MP3 file (use stored value or default)
  lines.push(`#MP3:${song.mp3File || 'song.mp3'}`);

  // Cover image file
  if (song.coverFile) {
    lines.push(`#COVER:${song.coverFile}`);
  }

  // Background image file
  if (song.backgroundFile) {
    lines.push(`#BACKGROUND:${song.backgroundFile}`);
  }

  // Video (file or URL)
  if (song.youtubeUrl) {
    lines.push(`#VIDEO:${song.youtubeUrl}`);
  } else if (song.videoFile) {
    lines.push(`#VIDEO:${song.videoFile}`);
  } else if (song.videoBackground) {
    lines.push(`#VIDEO:${song.videoBackground}`);
  }

  // Video Gap
  if (song.videoGap !== undefined && song.videoGap !== 0) {
    lines.push(`#VIDEOGAP:${song.videoGap}`);
  }

  // BPM and GAP (required)
  lines.push(`#BPM:${song.bpm.toFixed(2)}`);
  lines.push(`#GAP:${song.gap}`);

  // Start offset
  if (song.start && song.start > 0) {
    lines.push(`#START:${song.start}`);
  }

  // End time
  if (song.end && song.end > 0) {
    lines.push(`#END:${song.end}`);
  }

  // Preview settings
  if (song.previewStart !== undefined && song.previewStart > 0) {
    lines.push(`#PREVIEWSTART:${song.previewStart}`);
  } else if (song.preview) {
    lines.push(`#PREVIEWSTART:${Math.round(song.preview.startTime / 1000)}`);
  }

  if (song.previewDuration !== undefined && song.previewDuration > 0) {
    lines.push(`#PREVIEWDURATION:${song.previewDuration}`);
  } else if (song.preview?.duration) {
    lines.push(`#PREVIEWDURATION:${Math.round(song.preview.duration / 1000)}`);
  }

  // Medley settings
  if (song.medleyStartBeat !== undefined) {
    lines.push(`#MEDLEYSTARTBEAT:${song.medleyStartBeat}`);
  }
  if (song.medleyEndBeat !== undefined) {
    lines.push(`#MEDLEYENDBEAT:${song.medleyEndBeat}`);
  }

  // Genre
  if (song.genre) {
    lines.push(`#GENRE:${song.genre}`);
  }

  // Language
  if (song.language) {
    lines.push(`#LANGUAGE:${song.language}`);
  }

  // Year
  if (song.year) {
    lines.push(`#YEAR:${song.year}`);
  }

  // Edition / Album
  if (song.album) {
    lines.push(`#EDITION:${song.album}`);
  }

  // Creator
  if (song.creator) {
    lines.push(`#CREATOR:${song.creator}`);
  }

  // Tags
  if (song.tags) {
    lines.push(`#TAGS:${song.tags}`);
  }

  // Duet mode player names
  if (song.isDuet && song.duetPlayerNames) {
    lines.push(`#P1:${song.duetPlayerNames[0]}`);
    lines.push(`#P2:${song.duetPlayerNames[1]}`);
  }

  lines.push(''); // Empty line before notes
  
  // Convert notes to UltraStar format using the correct formula
  // beatDuration = 15000 / BPM (inverse of 60000 / (BPM * 4))
  const beatDuration = 15000 / song.bpm;
  const MIDI_BASE_OFFSET = 48;
  
  // Track current player for P1/P2 markers
  let currentPlayer: 'P1' | 'P2' | undefined = undefined;
  
  for (const line of song.lyrics) {
    for (const note of line.notes) {
      const startBeat = Math.round((note.startTime - song.gap) / beatDuration);
      const duration = Math.round(note.duration / beatDuration);
      const relativePitch = note.pitch - MIDI_BASE_OFFSET;
      const type = note.isGolden ? '*' : note.isBonus ? 'F' : ':';
      
      // Add P1/P2 prefix for duet mode if player changes
      let noteLine = `${type} ${startBeat} ${duration} ${relativePitch} ${note.lyric}`;
      
      if (song.isDuet && note.player) {
        if (currentPlayer !== note.player) {
          // Add player marker before this note
          // Note: 'both' means the note is sung by both players — write it under both
          if (note.player === 'both') {
            // Don't switch — both players sing this note, write once without marker
          } else {
            lines.push(note.player);
            currentPlayer = note.player;
          }
        }
      }
      
      lines.push(noteLine);
    }
    // Line break indicator at the end of each line
    const lastNote = line.notes[line.notes.length - 1];
    const lineBreakBeat = Math.round((lastNote.startTime + lastNote.duration - song.gap) / beatDuration);
    lines.push(`- ${lineBreakBeat}`);
  }
  
  lines.push('E'); // End marker
  
  return lines.join('\n');
}
