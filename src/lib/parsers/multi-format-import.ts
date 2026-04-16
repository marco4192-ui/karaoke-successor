/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Parsers for importing songs from additional karaoke formats:
 * - KaraokeMugen (.km) format
 * - MIDI (.mid) files with lyric tracks
 * - SingStar XML export format
 * - StepMania (.sm) chart format
 *
 * Currently, the import screen (import-screen.tsx) only supports UltraStar (.txt)
 * format via ultrastar-parser.ts and folder scanning. These additional parsers
 * would significantly expand import compatibility.
 *
 * Each parser follows the same pattern: parse the input format and convert to the
 * internal Song/LyricLine/Note types. The MIDI parser is particularly valuable
 * as many karaoke MIDI files exist with embedded lyrics.
 *
 * Note: Has unused import of Difficulty from @/types/game.
 *
 * Consider: These parsers are high-value for users migrating from other karaoke
 * software. The MIDI parser alone could unlock a large library of existing songs.
 * Could be offered as optional import format plugins.
 */

// Additional Song Import Formats
import { Song, LyricLine, Note, Difficulty } from '@/types/game';

// Karaoke Mugen format parser
export interface KaraokeMugenSong {
  title: string;
  artist: string;
  lyrics: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  audioFile?: string;
  videoFile?: string;
}

export function parseKaraokeMugen(data: string): KaraokeMugenSong | null {
  try {
    const parsed = JSON.parse(data);
    
    if (!parsed.title || !parsed.artist || !Array.isArray(parsed.lyrics)) {
      return null;
    }
    
    return {
      title: parsed.title,
      artist: parsed.artist,
      lyrics: parsed.lyrics.map((l: { start: number; end: number; text: string }) => ({
        start: l.start,
        end: l.end,
        text: l.text,
      })),
      audioFile: parsed.audioFile,
      videoFile: parsed.videoFile,
    };
  } catch {
    return null;
  }
}

// MIDI Karaoke (.kar) parser
export interface MIDIKaraokeData {
  tempo: number;
  ticksPerBeat: number;
  tracks: Array<{
    name: string;
    events: Array<{
      tick: number;
      type: string;
      data: unknown;
    }>;
  }>;
  lyrics: Array<{
    tick: number;
    text: string;
  }>;
  notes: Array<{
    tick: number;
    duration: number;
    pitch: number;
    velocity: number;
  }>;
}

export function parseMIDIKaraoke(arrayBuffer: ArrayBuffer): MIDIKaraokeData | null {
  try {
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);
    
    // Check MIDI header
    const header = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    
    if (header !== 'MThd') return null;
    
    const formatType = view.getUint16(8, false);
    const numTracks = view.getUint16(10, false);
    const ticksPerBeat = view.getUint16(12, false);
    
    // Parse tracks
    const tracks: MIDIKaraokeData['tracks'] = [];
    const lyrics: MIDIKaraokeData['lyrics'] = [];
    const notes: MIDIKaraokeData['notes'] = [];
    let tempo = 120;
    
    // Track active notes for Note-Off detection
    const activeNotes = new Map<string, { startTick: number; pitch: number; velocity: number }>();
    
    let offset = 14;
    for (let t = 0; t < numTracks; t++) {
      // Read track header
      const trackHeader = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      
      if (trackHeader !== 'MTrk') break;
      
      const trackLength = view.getUint32(offset + 4, false);
      offset += 8;
      
      const events: MIDIKaraokeData['tracks'][0]['events'] = [];
      const trackEnd = offset + trackLength;
      let absoluteTick = 0;
      let runningStatus = 0; // Running status byte
      
      while (offset < trackEnd) {
        // Read delta time (variable length quantity)
        let delta = 0;
        let byte: number;
        do {
          byte = view.getUint8(offset++);
          delta = (delta << 7) | (byte & 0x7f);
        } while (byte & 0x80);
        
        absoluteTick += delta;
        
        // Read event type
        let eventType = view.getUint8(offset++);
        
        // Running Status: if high bit not set, this is a data byte
        // and we should use the last status byte
        if (eventType < 0x80) {
          // This is a data byte, use running status
          offset--; // Back up to re-read this byte as data
          eventType = runningStatus;
        } else {
          // Update running status for channel messages
          if (eventType >= 0x80 && eventType < 0xf0) {
            runningStatus = eventType;
          }
        }
        
        if (eventType === 0xff) {
          // Meta event
          const metaType = view.getUint8(offset++);
          let length = view.getUint8(offset++);
          
          if (metaType === 0x01 || metaType === 0x05) {
            // Lyrics or lyrics text
            const text = String.fromCharCode(
              ...Array.from({ length }, (_, i) => view.getUint8(offset + i))
            );
            lyrics.push({ tick: absoluteTick, text });
          } else if (metaType === 0x51) {
            // Tempo (microseconds per quarter note)
            const microseconds = (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
            tempo = 60000000 / microseconds;
          } else if (metaType === 0x03) {
            // Track name
            const name = String.fromCharCode(
              ...Array.from({ length }, (_, i) => view.getUint8(offset + i))
            );
            tracks[t] = { ...tracks[t], name };
          }
          
          offset += length;
        } else if (eventType === 0xf0 || eventType === 0xf7) {
          // SysEx - variable length until 0xf7
          let length = 0;
          let sysByte: number;
          do {
            sysByte = view.getUint8(offset++);
            length++;
          } while (sysByte !== 0xf7 && offset < trackEnd);
        } else {
          // MIDI channel message
          const channel = eventType & 0x0f;
          const status = eventType & 0xf0;
          
          switch (status) {
            case 0x80: // Note Off
              {
                const note = view.getUint8(offset++);
                const velocity = view.getUint8(offset++);
                const noteKey = `${channel}-${note}`;
                const activeNote = activeNotes.get(noteKey);
                if (activeNote) {
                  notes.push({
                    tick: activeNote.startTick,
                    duration: absoluteTick - activeNote.startTick,
                    pitch: note,
                    velocity: activeNote.velocity
                  });
                  activeNotes.delete(noteKey);
                }
              }
              break;
              
            case 0x90: // Note On
              {
                const note = view.getUint8(offset++);
                const velocity = view.getUint8(offset++);
                const noteKey = `${channel}-${note}`;
                
                if (velocity === 0) {
                  // Note On with velocity 0 = Note Off
                  const activeNote = activeNotes.get(noteKey);
                  if (activeNote) {
                    notes.push({
                      tick: activeNote.startTick,
                      duration: absoluteTick - activeNote.startTick,
                      pitch: note,
                      velocity: activeNote.velocity
                    });
                    activeNotes.delete(noteKey);
                  }
                } else {
                  // Start new note
                  activeNotes.set(noteKey, {
                    startTick: absoluteTick,
                    pitch: note,
                    velocity
                  });
                }
              }
              break;
              
            case 0xa0: // Polyphonic Aftertouch
              offset += 2;
              break;
              
            case 0xb0: // Control Change
              offset += 2;
              break;
              
            case 0xc0: // Program Change
              offset += 1;
              break;
              
            case 0xd0: // Channel Aftertouch
              offset += 1;
              break;
              
            case 0xe0: // Pitch Bend
              offset += 2;
              break;
              
            default:
              // Unknown status, try to skip
              break;
          }
        }
      }
      
      tracks.push({ name: `Track ${t + 1}`, events });
    }
    
    // Convert ticks to milliseconds
    const tickDurationMs = 60000 / (tempo * ticksPerBeat);
    
    return { 
      tempo, 
      ticksPerBeat,
      tracks, 
      lyrics,
      notes: notes.map(n => ({
        ...n,
        // Convert tick duration to ms
        duration: Math.round(n.duration * tickDurationMs)
      }))
    };
  } catch (error) {
    console.error('Failed to parse MIDI:', error);
    return null;
  }
}

// SingStar format (DAT/INI files)
export interface SingStarSongData {
  title: string;
  artist: string;
  genre?: string;
  year?: number;
  notes: Array<{
    startTime: number;
    duration: number;
    pitch: number;
    text: string;
  }>;
}

export function parseSingStarData(data: string): SingStarSongData | null {
  try {
    const lines = data.split('\n');
    const songData: Partial<SingStarSongData> = {};
    const notes: SingStarSongData['notes'] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('TITLE=')) {
        songData.title = trimmed.slice(6);
      } else if (trimmed.startsWith('ARTIST=')) {
        songData.artist = trimmed.slice(7);
      } else if (trimmed.startsWith('GENRE=')) {
        songData.genre = trimmed.slice(6);
      } else if (trimmed.startsWith('YEAR=')) {
        songData.year = parseInt(trimmed.slice(5));
      } else if (trimmed.startsWith('NOTE=')) {
        const parts = trimmed.slice(5).split(',');
        if (parts.length >= 4) {
          notes.push({
            startTime: parseInt(parts[0]),
            duration: parseInt(parts[1]),
            pitch: parseInt(parts[2]),
            text: parts[3] || '',
          });
        }
      }
    }
    
    if (!songData.title || !songData.artist) return null;
    
    return { ...songData, notes } as SingStarSongData;
  } catch {
    return null;
  }
}

// StepMania/StepFever format (.sm, .ssc)
export interface StepManiaData {
  title: string;
  artist: string;
  bpm: number[];
  stops: Array<[number, number]>;
  notes: Array<{
    beat: number;
    type: string;
  }>;
}

export function parseStepMania(data: string): StepManiaData | null {
  try {
    const result: Partial<StepManiaData> = {
      bpm: [120],
      stops: [],
      notes: [],
    };
    
    const lines = data.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('#TITLE:')) {
        result.title = line.slice(7, -1);
      } else if (line.startsWith('#ARTIST:')) {
        result.artist = line.slice(8, -1);
      } else if (line.startsWith('#BPMS:')) {
        const bpmStr = line.slice(6, -1);
        result.bpm = bpmStr.split(',').map(b => parseFloat(b.split('=')[1]));
      }
    }
    
    if (!result.title || !result.artist) return null;
    
    return result as StepManiaData;
  } catch {
    return null;
  }
}

// Convert imported formats to Song type
export function convertToSong(
  data: KaraokeMugenSong | MIDIKaraokeData | SingStarSongData | StepManiaData,
  format: 'karaoke-mugen' | 'midi' | 'singstar' | 'stepmania'
): Partial<Song> {
  switch (format) {
    case 'karaoke-mugen': {
      const km = data as KaraokeMugenSong;
      const lyrics: LyricLine[] = km.lyrics.map((l, i) => ({
        id: `line-${i}`,
        text: l.text,
        startTime: l.start,
        endTime: l.end,
        notes: generateNotesFromText(l.text, l.start, l.end),
      }));
      
      return {
        title: km.title,
        artist: km.artist,
        lyrics,
        audioUrl: km.audioFile,
        videoBackground: km.videoFile,
      };
    }
    
    case 'singstar': {
      const ss = data as SingStarSongData;
      const lyrics: LyricLine[] = [];
      let currentLine: LyricLine | null = null;
      
      for (const note of ss.notes) {
        if (!currentLine) {
          currentLine = {
            id: `line-${lyrics.length}`,
            text: note.text,
            startTime: note.startTime,
            endTime: note.startTime + note.duration,
            notes: [],
          };
        }
        
        currentLine.notes.push({
          id: `note-${currentLine.notes.length}`,
          pitch: note.pitch,
          frequency: 440 * Math.pow(2, (note.pitch - 69) / 12),
          startTime: note.startTime,
          duration: note.duration,
          lyric: note.text,
          isBonus: false,
          isGolden: false,
        });
        
        currentLine.text += ' ' + note.text;
        currentLine.endTime = note.startTime + note.duration;
        
        // Check for line break (gap > 2 seconds)
        const nextNote = ss.notes[ss.notes.indexOf(note) + 1];
        if (!nextNote || nextNote.startTime - note.startTime - note.duration > 2000) {
          lyrics.push(currentLine);
          currentLine = null;
        }
      }
      
      return {
        title: ss.title,
        artist: ss.artist,
        genre: ss.genre,
        lyrics,
      };
    }
    
    default:
      return {};
  }
}

// Helper: Generate notes from text (approximate)
function generateNotesFromText(text: string, startTime: number, endTime: number): Note[] {
  const words = text.split(' ');
  const totalDuration = endTime - startTime;
  const noteDuration = totalDuration / words.length;
  
  return words.map((word, i) => ({
    id: `note-${i}`,
    pitch: 60 + Math.floor(Math.random() * 12), // Random pitch for now
    frequency: 440,
    startTime: startTime + i * noteDuration,
    duration: noteDuration,
    lyric: word,
    isBonus: false,
    isGolden: false,
  }));
}

// Detect format from file
export function detectFileFormat(filename: string, content: string | ArrayBuffer): 'karaoke-mugen' | 'midi' | 'singstar' | 'stepmania' | 'ultrastar' | 'unknown' {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content as string);
      if (parsed.title && parsed.artist && parsed.lyrics) {
        return 'karaoke-mugen';
      }
    } catch {
      // Not JSON
    }
  }
  
  if (ext === 'kar' || ext === 'mid') {
    return 'midi';
  }
  
  if (ext === 'txt' && typeof content === 'string') {
    if (content.includes('#TITLE:') || content.includes('#ARTIST:')) {
      if (content.includes('NOTE=')) return 'singstar';
      if (content.includes('#BPM:') || content.includes('#BPMS:')) return 'stepmania';
      if (content.includes(':') && content.includes('-') && !content.includes('=')) return 'ultrastar';
    }
  }
  
  if (ext === 'sm' || ext === 'ssc') {
    return 'stepmania';
  }
  
  return 'unknown';
}
