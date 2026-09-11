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

import { Song, Difficulty, DuetPlayer } from '@/types/game';
import { isYouTubeUrl, isDailymotionUrl, isVimeoUrl, isRutubeUrl, isVkVideoUrl, isBilibiliUrl, isNiconicoUrl, isDirectVideoUrl } from '@/lib/url-utils';
import { normalizeTxtContent } from '@/lib/utils';
import { normalizeLanguage } from '@/lib/parsers/meta-normalizer';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';
import { matchPlayerMarkerLine, matchDuetNotePrefix, notesHaveBothPlayers } from '@/lib/parsers/duet-markers';

interface UltraStarNote {
  type: ':' | '*' | 'F' | 'R' | 'G';
  startBeat: number;
  duration: number;
  pitch: number; // Relative pitch (0-24 typical range)
  lyric: string;
  player?: DuetPlayer; // For duet mode: P1, P2, or undefined (both)
}

export interface UltraStarSong {
  title: string;
  artist: string;
  mp3: string;
  video?: string;
  youtubeUrl?: string; // YouTube video URL (from #VIDEO: if it's a URL)
  dailymotionUrl?: string; // Dailymotion video URL (from #VIDEO:)
  vimeoUrl?: string; // Vimeo video URL (from #VIDEO:)
  rutubeUrl?: string; // Rutube video URL (from #VIDEO:) — postMessage Player API
  vkVideoUrl?: string; // VK video URL (from #VIDEO:) — official videoplayer.js SDK (needs Export-URL hash)
  bilibiliUrl?: string; // Bilibili video URL (from #VIDEO:) — iframe + manual start gate
  nicovideoUrl?: string; // Niconico video URL (from #VIDEO:) — unofficial jsapi
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
  const normalized = normalizeTxtContent(content);
  const lines = normalized.split('\n').filter(l => l.trim().length > 0);
  
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
  let hasDuetHeader = false;

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
          case 'VIDEO': {
            // Classify URL: YouTube, Dailymotion, Vimeo, Rutube, VK, Bilibili,
            // Niconico, direct video file, or local path
            const videoValue = value.trim();
            if (videoValue.startsWith('http://') || videoValue.startsWith('https://')) {
              if (isYouTubeUrl(videoValue)) {
                // YouTube URL — store separately for YouTube player
                song.youtubeUrl = videoValue;
              } else if (isDailymotionUrl(videoValue)) {
                // Dailymotion URL — official ad events on embeds
                song.dailymotionUrl = videoValue;
              } else if (isVimeoUrl(videoValue)) {
                // Vimeo URL — ad-free embeds with player.js SDK
                song.vimeoUrl = videoValue;
              } else if (isRutubeUrl(videoValue)) {
                // Rutube URL — postMessage Player API (playStart/currentTime)
                song.rutubeUrl = videoValue;
              } else if (isVkVideoUrl(videoValue)) {
                // VK Video URL — official SDK; hash only in Export URLs
                song.vkVideoUrl = videoValue;
              } else if (isBilibiliUrl(videoValue)) {
                // Bilibili URL — iframe embed, manual start gate
                song.bilibiliUrl = videoValue;
              } else if (isNiconicoUrl(videoValue)) {
                // Niconico URL — unofficial jsapi embed
                song.nicovideoUrl = videoValue;
              } else {
                // Direct video URL (MP4, WebM, etc.) — play via HTML5 <video> element
                // Stored in video field, which becomes videoBackground later
                song.video = videoValue;
              }
            } else {
              song.video = videoValue;
            }
            break;
          }
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
          case 'END': {
            // parseInt returns 0 for "#END:0" — treat 0 as undefined since
            // a song ending at 0ms makes no sense (song creator mistake).
            const endVal = parseInt(value);
            song.end = endVal > 0 ? endVal : undefined;
            break;
          }
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
            song.language = normalizeLanguage(value.trim());
            break;
          case 'EDITION':
            song.edition = value.trim();
            break;
          case 'CREATOR':
            song.creator = value.trim();
            break;
          case 'P1':
            // P1 name for duet mode
            hasDuetHeader = true;
            if (!song.duetPlayerNames) {
              song.duetPlayerNames = [value.trim(), 'Player 2'];
            } else {
              song.duetPlayerNames[0] = value.trim();
            }
            break;
          case 'P2':
            // P2 name for duet mode
            hasDuetHeader = true;
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

    // Check for player switch markers (P1/P2 section switch).
    // Uses the shared tolerant matcher: accepts P1, P1:, P 1, "P1 :" and
    // leading/trailing whitespace (trailing spaces on MARKER lines carry no
    // meaning — unlike note lyrics, where they mark word boundaries).
    const marker = matchPlayerMarkerLine(line);
    if (marker) {
      currentPlayer = marker;
      continue;
    }

    // Parse note lines
    // Format: [P1/P2:] <type> <startBeat> <duration> <pitch> <lyric>
    // Example: : 0 4 12 Hello  OR  P1: : 0 4 12 Hello
    // Types: : = normal, * = golden, F = freestyle, R = rap, G = rap golden

    // First check for P1/P2 prefix in note line (tolerates "P1 :" and
    // leading whitespace; lyric part keeps its trailing spaces intact)
    const duetPrefix = matchDuetNotePrefix(line);
    let noteLine = line;
    let notePlayer: DuetPlayer | undefined = currentPlayer;

    if (duetPrefix) {
      notePlayer = duetPrefix.player;
      noteLine = duetPrefix.rest;
    }

    // Note lines tolerate leading whitespace (trimStart), but NEVER a full
    // trim — trailing spaces in lyrics are significant for syllables.
    const noteMatch = noteLine.trimStart().match(/^([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
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
  
  // Mark as duet when body markers OR header tags declare it.
  // Body markers additionally require BOTH players to have notes — a stray
  // single P1 marker must not turn a solo song into a duet.
  if (hasDuetHeader || notesHaveBothPlayers(song.notes)) {
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

  // Use the shared converter to build lyric lines (handles duet P1/P2 separation)
  const lyricLines = convertNotesToLyricLines(
    ultraStar.notes,
    new Set(ultraStar.lineBreaks),
    ultraStar.bpm,
    ultraStar.gap,
  );

  // Calculate total duration:
  // - When #END: is defined → use that value (time-based ending in game loop)
  // - When #END: is NOT defined → use last lyric line end time + buffer.
  //   The game loop only checks song.end for time-based termination;
  //   when song.end is undefined, the audio/video element's "ended" event
  //   handles natural termination. So song.duration can be a realistic value.
  let totalDuration: number;
  if (ultraStar.end) {
    totalDuration = ultraStar.end;
  } else if (lyricLines.length > 0) {
    // Use last lyric line end time + 5s buffer for a realistic display duration
    const lastLineEnd = lyricLines.reduce((max, l) => Math.max(max, l.endTime), 0);
    totalDuration = lastLineEnd + 5000;
  } else {
    totalDuration = 180000; // Default 3 minutes
  }

  // Determine difficulty based on note density
  const totalNotes = ultraStar.notes.length;
  const effectiveDurationForStats = ultraStar.end || totalDuration;
  const songDurationMinutes = effectiveDurationForStats / 60000;
  const notesPerMinute = songDurationMinutes > 0 ? totalNotes / songDurationMinutes : 0;
  
  let difficulty: Difficulty = 'medium';
  if (notesPerMinute > 40) difficulty = 'hard';
  else if (notesPerMinute < 20) difficulty = 'easy';

  // Calculate rating based on note density
  const rating = Math.min(5, Math.max(1, Math.ceil(notesPerMinute / 10)));

  // Determine if video is a streaming-platform URL, direct video URL, or local file
  let videoBackground: string | undefined;
  let youtubeUrl: string | undefined;
  let dailymotionUrl: string | undefined;
  let vimeoUrl: string | undefined;
  let rutubeUrl: string | undefined;
  let vkVideoUrl: string | undefined;
  let bilibiliUrl: string | undefined;
  let nicovideoUrl: string | undefined;

  if (ultraStar.youtubeUrl) {
    // YouTube URL was detected during parsing
    youtubeUrl = ultraStar.youtubeUrl;
  } else if (ultraStar.dailymotionUrl) {
    dailymotionUrl = ultraStar.dailymotionUrl;
  } else if (ultraStar.vimeoUrl) {
    vimeoUrl = ultraStar.vimeoUrl;
  } else if (ultraStar.rutubeUrl) {
    rutubeUrl = ultraStar.rutubeUrl;
  } else if (ultraStar.vkVideoUrl) {
    vkVideoUrl = ultraStar.vkVideoUrl;
  } else if (ultraStar.bilibiliUrl) {
    bilibiliUrl = ultraStar.bilibiliUrl;
  } else if (ultraStar.nicovideoUrl) {
    nicovideoUrl = ultraStar.nicovideoUrl;
  } else if (ultraStar.video) {
    if (isDirectVideoUrl(ultraStar.video)) {
      // Direct video URL (MP4, WebM, OGG, etc.) — play via HTML5 <video> element
      videoBackground = ultraStar.video;
    } else if (isDailymotionUrl(ultraStar.video)) {
      dailymotionUrl = ultraStar.video;
    } else if (isVimeoUrl(ultraStar.video)) {
      vimeoUrl = ultraStar.video;
    } else if (isRutubeUrl(ultraStar.video)) {
      rutubeUrl = ultraStar.video;
    } else if (isVkVideoUrl(ultraStar.video)) {
      vkVideoUrl = ultraStar.video;
    } else if (isBilibiliUrl(ultraStar.video)) {
      bilibiliUrl = ultraStar.video;
    } else if (isNiconicoUrl(ultraStar.video)) {
      nicovideoUrl = ultraStar.video;
    } else if (isYouTubeUrl(ultraStar.video)) {
      youtubeUrl = ultraStar.video;
    } else if (ultraStar.video.startsWith('http://') || ultraStar.video.startsWith('https://')) {
      // Unknown HTTP(S) video source — hand it to the HTML5 <video> element as a fallback
      videoBackground = ultraStar.video;
    } else {
      // Local file path
      videoBackground = videoUrl || ultraStar.video;
    }
  }

  return {
    id: `imported-${crypto.randomUUID()}`,
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
    dailymotionUrl,
    vimeoUrl,
    rutubeUrl,
    vkVideoUrl,
    bilibiliUrl,
    nicovideoUrl,
    videoGap: ultraStar.videoGap,
    audioUrl,
    // If we have video (any streaming platform or direct URL) but no separate audio, video provides audio
    hasEmbeddedAudio: !audioUrl && (!!youtubeUrl || !!dailymotionUrl || !!vimeoUrl || !!rutubeUrl || !!vkVideoUrl || !!bilibiliUrl || !!nicovideoUrl || !!videoBackground),
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
    videoFile: ultraStar.video && !ultraStar.youtubeUrl && !ultraStar.dailymotionUrl && !ultraStar.vimeoUrl && !ultraStar.rutubeUrl && !ultraStar.vkVideoUrl && !ultraStar.bilibiliUrl && !ultraStar.nicovideoUrl && !(ultraStar.video.startsWith('http://') || ultraStar.video.startsWith('https://')) ? ultraStar.video : undefined,
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
  } else if (song.dailymotionUrl) {
    lines.push(`#VIDEO:${song.dailymotionUrl}`);
  } else if (song.vimeoUrl) {
    lines.push(`#VIDEO:${song.vimeoUrl}`);
  } else if (song.rutubeUrl) {
    lines.push(`#VIDEO:${song.rutubeUrl}`);
  } else if (song.vkVideoUrl) {
    lines.push(`#VIDEO:${song.vkVideoUrl}`);
  } else if (song.bilibiliUrl) {
    lines.push(`#VIDEO:${song.bilibiliUrl}`);
  } else if (song.nicovideoUrl) {
    lines.push(`#VIDEO:${song.nicovideoUrl}`);
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

  // Duet mode player names.
  // Export when the song is flagged as duet OR when any note still carries a
  // P1/P2 assignment — the flag alone must never silently strip player data
  // (the original duet-recognition bug caused exactly that data loss).
  const hasAnyPlayerAssignment = song.lyrics.some(
    line => line.notes.some(n => n.player === 'P1' || n.player === 'P2')
  );
  const duetExport = song.isDuet || hasAnyPlayerAssignment;
  const duetPlayerNames: [string, string] | undefined = duetExport
    ? (song.duetPlayerNames ?? ['Player 1', 'Player 2'])
    : undefined;

  if (duetExport && duetPlayerNames) {
    lines.push(`#P1:${duetPlayerNames[0]}`);
    lines.push(`#P2:${duetPlayerNames[1]}`);
  }

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
      const type = note.isRap
        ? (note.isGolden ? 'G' : 'R')
        : note.isGolden ? '*' : note.isBonus ? 'F' : ':';
      
      // Add P1/P2 prefix for duet mode if the player changes.
      // 'both' means both players sing this note — plain UltraStar has no
      // marker for that, so the note is written into the current section.
      const noteLine = `${type} ${startBeat} ${duration} ${relativePitch} ${note.lyric}`;
      if (duetExport && note.player) {
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
    // Line break indicator at the end of each lyric line
    if (line.notes.length > 0) {
      const lastNote = line.notes[line.notes.length - 1];
      const lineBreakBeat = Math.round((lastNote.startTime + lastNote.duration - song.gap) / beatDuration);
      lines.push(`- ${lineBreakBeat}`);
    }
  }
  
  lines.push('E'); // End marker
  
  return lines.join('\n');
}
