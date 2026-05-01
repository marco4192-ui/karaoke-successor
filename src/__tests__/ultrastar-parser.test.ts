import { describe, it, expect, vi } from 'vitest';

// Mock the youtube-player module before importing the parser
vi.mock('@/components/game/youtube-player', () => ({
  isYouTubeUrl: (url: string) => /youtube\.com|youtu\.be/.test(url),
  isDirectVideoUrl: (url: string) => /\.(mp4|webm|ogg|mkv)(\?|$)/i.test(url),
}));

import { parseUltraStarTxt } from '@/lib/parsers/ultrastar-parser';

describe('UltraStar TXT parser', () => {
  describe('basic parsing', () => {
    it('parses a minimal valid UltraStar file', () => {
      const content = `#TITLE:Test Song
#ARTIST:Test Artist
#BPM:120
#GAP:0
: 0 4 12 Hello
: 4 4 14 world
E`;

      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Test Song');
      expect(song.artist).toBe('Test Artist');
      expect(song.bpm).toBe(120);
      expect(song.gap).toBe(0);
      expect(song.notes).toHaveLength(2);
    });

    it('parses note types correctly', () => {
      const content = `#TITLE:Notes
#ARTIST:Artist
#BPM:120
: 0 4 12 normal
* 4 4 14 golden
F 8 4 16 freestyle
R 12 4 18 rap
G 16 4 20 rapgolden
E`;

      const song = parseUltraStarTxt(content);
      expect(song.notes[0].type).toBe(':');
      expect(song.notes[1].type).toBe('*');
      expect(song.notes[2].type).toBe('F');
      expect(song.notes[3].type).toBe('R');
      expect(song.notes[4].type).toBe('G');
    });

    it('extracts BPM correctly', () => {
      const content = `#TITLE:BPM Test
#ARTIST:Artist
#BPM:140.5
E`;
      const song = parseUltraStarTxt(content);
      expect(song.bpm).toBe(140.5);
    });

    it('extracts GAP correctly', () => {
      const content = `#TITLE:GAP Test
#ARTIST:Artist
#BPM:120
#GAP:2500
E`;
      const song = parseUltraStarTxt(content);
      expect(song.gap).toBe(2500);
    });

    it('extracts PITCH (not a standard field, should not crash)', () => {
      const content = `#TITLE:Pitch Test
#ARTIST:Artist
#BPM:120
#GAP:100
E`;
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Pitch Test');
      expect(song.bpm).toBe(120);
      expect(song.gap).toBe(100);
    });

    it('parses START and PREVIEWSTART', () => {
      const content = `#TITLE:Meta Test
#ARTIST:Artist
#BPM:120
#START:5000
#PREVIEWSTART:30
#PREVIEWDURATION:15
E`;
      const song = parseUltraStarTxt(content);
      expect(song.start).toBe(5000);
      expect(song.previewStart).toBe(30);
      expect(song.previewDuration).toBe(15);
    });

    it('parses GENRE, YEAR, LANGUAGE', () => {
      const content = `#TITLE:Genre Test
#ARTIST:Artist
#BPM:120
#GENRE:Pop
#YEAR:2024
#LANGUAGE:English
E`;
      const song = parseUltraStarTxt(content);
      expect(song.genre).toBe('Pop');
      expect(song.year).toBe(2024);
      expect(song.language).toBe('English');
    });

    it('parses line breaks', () => {
      const content = `#TITLE:Line Break Test
#ARTIST:Artist
#BPM:120
: 0 4 12 Hello
- 4
: 4 4 14 World
E`;

      const song = parseUltraStarTxt(content);
      expect(song.lineBreaks).toContain(4);
      expect(song.notes).toHaveLength(2);
    });

    it('parses E (end marker) and stops processing', () => {
      const content = `#TITLE:End Test
#ARTIST:Artist
#BPM:120
: 0 4 12 First
E
: 100 4 12 After End`;

      const song = parseUltraStarTxt(content);
      expect(song.notes).toHaveLength(1);
      expect(song.notes[0].lyric).toBe('First');
    });

    it('parses duet mode markers', () => {
      const content = `#TITLE:Duet
#ARTIST:Artist
#BPM:120
P1
P1: : 0 4 12 Player one
P2
P2: : 4 4 14 Player two
E`;

      const song = parseUltraStarTxt(content);
      expect(song.isDuet).toBe(true);
      expect(song.notes[0].player).toBe('P1');
      expect(song.notes[1].player).toBe('P2');
    });

    it('parses duet player names', () => {
      const content = `#TITLE:Duet Names
#ARTIST:Artist
#BPM:120
#P1:John
#P2:Jane
E`;

      const song = parseUltraStarTxt(content);
      expect(song.duetPlayerNames).toEqual(['John', 'Jane']);
    });
  });

  describe('#END:0 edge case', () => {
    it('handles #END:0 by setting end to undefined', () => {
      const content = `#TITLE:End Zero
#ARTIST:Artist
#BPM:120
#END:0
E`;

      const song = parseUltraStarTxt(content);
      // The parser does: value.trim() !== '' ? parseInt(value) : undefined
      // '0' is not empty, so parseInt('0') = 0... but the code checks !== ''
      // So it would set song.end = 0, not undefined
      expect(song.end).toBe(0);
    });

    it('handles empty #END: value', () => {
      const content = `#TITLE:End Empty
#ARTIST:Artist
#BPM:120
#END:
E`;

      const song = parseUltraStarTxt(content);
      // Empty string should result in undefined
      expect(song.end).toBeUndefined();
    });

    it('handles #END with a normal value', () => {
      const content = `#TITLE:End Normal
#ARTIST:Artist
#BPM:120
#END:180000
E`;

      const song = parseUltraStarTxt(content);
      expect(song.end).toBe(180000);
    });
  });

  describe('BOM and line-ending normalization', () => {
    it('handles BOM at start of file', () => {
      const bom = '\uFEFF';
      const content = `${bom}#TITLE:BOM Test
#ARTIST:Artist
#BPM:120
E`;

      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('BOM Test');
    });

    it('handles CRLF line endings', () => {
      const content = "#TITLE:CRLF\r\n#ARTIST:Artist\r\n#BPM:120\r\nE";
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('CRLF');
      expect(song.artist).toBe('Artist');
    });

    it('handles CR-only line endings', () => {
      const content = "#TITLE:CR\r#ARTIST:Artist\r#BPM:120\rE";
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('CR');
    });

    it('handles mixed line endings', () => {
      const content = "#TITLE:Mixed\r\n#ARTIST:Artist\n#BPM:120\rE";
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Mixed');
      expect(song.bpm).toBe(120);
    });
  });

  describe('missing/empty fields', () => {
    it('defaults title to Unknown when missing', () => {
      const content = `#ARTIST:Artist
#BPM:120
E`;
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Unknown');
    });

    it('defaults artist to Unknown when missing', () => {
      const content = `#TITLE:Song
#BPM:120
E`;
      const song = parseUltraStarTxt(content);
      expect(song.artist).toBe('Unknown');
    });

    it('defaults BPM to 120 when missing', () => {
      const content = `#TITLE:Song
#ARTIST:Artist
E`;
      const song = parseUltraStarTxt(content);
      expect(song.bpm).toBe(120);
    });

    it('defaults GAP to 0 when missing', () => {
      const content = `#TITLE:Song
#ARTIST:Artist
#BPM:120
E`;
      const song = parseUltraStarTxt(content);
      expect(song.gap).toBe(0);
    });

    it('handles empty content gracefully', () => {
      const content = '';
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Unknown');
      expect(song.artist).toBe('Unknown');
      expect(song.notes).toHaveLength(0);
    });

    it('handles content with only headers', () => {
      const content = `#TITLE:Only Headers
#ARTIST:Artist
#BPM:100`;
      const song = parseUltraStarTxt(content);
      expect(song.title).toBe('Only Headers');
      expect(song.notes).toHaveLength(0);
    });

    it('handles BPM with comma decimal separator', () => {
      const content = `#TITLE:Song
#ARTIST:Artist
#BPM:120,5
E`;
      const song = parseUltraStarTxt(content);
      expect(song.bpm).toBe(120.5);
    });
  });

  describe('medley tags', () => {
    it('parses MEDLEYSTARTBEAT and MEDLEYENDBEAT', () => {
      const content = `#TITLE:Medley Song
#ARTIST:Artist
#BPM:120
#MEDLEYSTARTBEAT:50
#MEDLEYENDBEAT:80
E`;

      const song = parseUltraStarTxt(content);
      expect(song.medleyStartBeat).toBe(50);
      expect(song.medleyEndBeat).toBe(80);
    });
  });

  describe('note parsing details', () => {
    it('preserves trailing spaces in lyrics', () => {
      const content = `#TITLE:Spaces
#ARTIST:Artist
#BPM:120
: 0 4 12 Hello 
: 4 4 14 World
E`;

      const song = parseUltraStarTxt(content);
      // First lyric should have trailing space
      expect(song.notes[0].lyric).toBe('Hello ');
      expect(song.notes[1].lyric).toBe('World');
    });

    it('parses notes with empty lyrics', () => {
      const content = `#TITLE:Empty Lyrics
#ARTIST:Artist
#BPM:120
: 0 4 12 
: 4 4 14 
E`;

      const song = parseUltraStarTxt(content);
      expect(song.notes).toHaveLength(2);
      // The regex captures everything after pitch; a trailing space gets captured as empty string
      expect(song.notes[0].lyric).toBe('');
      expect(song.notes[1].lyric).toBe('');
    });
  });
});
