import { describe, it, expect } from 'vitest'
import {
  parseUltraStarTxt,
  convertUltraStarToSong,
  generateUltraStarTxt,
} from './ultrastar-parser'

describe('UltraStar Parser', () => {
  describe('parseUltraStarTxt', () => {
    it('should parse basic headers', () => {
      const content = `#TITLE:Test Song
#ARTIST:Test Artist
#BPM:120
#GAP:0
#MP3:test.mp3
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.title).toBe('Test Song')
      expect(result.artist).toBe('Test Artist')
      expect(result.bpm).toBe(120)
      expect(result.gap).toBe(0)
      expect(result.mp3).toBe('test.mp3')
    })

    it('should handle decimal BPM values', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:320,5
#GAP:100
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.bpm).toBe(320.5)
    })

    it('should parse normal notes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Hel
- 4
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].type).toBe(':')
      expect(result.notes[0].startBeat).toBe(0)
      expect(result.notes[0].duration).toBe(4)
      expect(result.notes[0].pitch).toBe(12)
      expect(result.notes[0].lyric).toBe('Hel')
      expect(result.lineBreaks).toContain(4)
    })

    it('should parse golden notes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
* 0 4 12 Gold
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].type).toBe('*')
    })

    it('should parse freestyle notes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
F 0 4 12 Free
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].type).toBe('F')
    })

    it('should parse rap notes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
R 0 4 12 Rap
G 8 4 12 RapGold
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].type).toBe('R')
      expect(result.notes[1].type).toBe('G')
    })

    it('should handle negative start beats', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: -4 4 12 Early
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes[0].startBeat).toBe(-4)
    })

    it('should handle negative pitch values', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 -12 Low
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.notes[0].pitch).toBe(-12)
    })

    it('should preserve trailing spaces in lyrics', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Hello 
: 4 4 12 World
E`
      
      const result = parseUltraStarTxt(content)
      
      // Trailing space should be preserved
      expect(result.notes[0].lyric).toBe('Hello ')
      expect(result.notes[1].lyric).toBe('World')
    })

    it('should detect YouTube URLs in VIDEO tag', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:https://www.youtube.com/watch?v=test123
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.youtubeUrl).toBe('https://www.youtube.com/watch?v=test123')
    })

    it('should handle local video files', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:video.mp4
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.video).toBe('video.mp4')
      expect(result.youtubeUrl).toBeUndefined()
    })

    it('should parse VIDEOGAP', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEOGAP:500
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.videoGap).toBe(500)
    })

    it('should parse PREVIEWSTART and PREVIEWDURATION', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#PREVIEWSTART:30
#PREVIEWDURATION:15
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.previewStart).toBe(30)
      expect(result.previewDuration).toBe(15)
    })

    it('should parse GENRE and LANGUAGE', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#GENRE:Pop
#LANGUAGE:English
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.genre).toBe('Pop')
      expect(result.language).toBe('English')
    })

    it('should parse YEAR', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#YEAR:2020
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.year).toBe(2020)
    })

    it('should parse COVER and BACKGROUND', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#COVER:cover.jpg
#BACKGROUND:bg.png
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.cover).toBe('cover.jpg')
      expect(result.background).toBe('bg.png')
    })

    it('should parse START and END', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#START:1000
#END:180000
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.start).toBe(1000)
      expect(result.end).toBe(180000)
    })

    it('should handle duet mode with P1/P2 prefixes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#P1:Player One
#P2:Player Two
P1:
: 0 4 12 Hello
P2:
: 4 4 14 World
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.isDuet).toBe(true)
      expect(result.duetPlayerNames).toEqual(['Player One', 'Player Two'])
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].player).toBe('P1')
      expect(result.notes[1].player).toBe('P2')
    })

    it('should handle P1/P2 inline prefixes in notes', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
P1: : 0 4 12 Hello
P2: : 4 4 14 World
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.isDuet).toBe(true)
      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].player).toBe('P1')
      expect(result.notes[1].player).toBe('P2')
    })

    it('should use default values for missing headers', () => {
      const content = `E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.title).toBe('Unknown')
      expect(result.artist).toBe('Unknown')
      expect(result.bpm).toBe(120)
      expect(result.gap).toBe(0)
    })

    it('should handle multiple line breaks', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Line1
- 4
: 8 4 12 Line2
- 12
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.lineBreaks).toHaveLength(2)
      expect(result.lineBreaks).toContain(4)
      expect(result.lineBreaks).toContain(12)
    })

    it('should parse VERSION tag', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VERSION:1.1.0
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.version).toBe('1.1.0')
    })

    it('should parse CREATOR tag', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#CREATOR:Test Creator
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.creator).toBe('Test Creator')
    })

    it('should parse EDITION tag', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#EDITION:UltraStar Deluxe
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.edition).toBe('UltraStar Deluxe')
    })

    it('should parse MEDLEYSTARTBEAT and MEDLEYENDBEAT', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#MEDLEYSTARTBEAT:10
#MEDLEYENDBEAT:100
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.medleyStartBeat).toBe(10)
      expect(result.medleyEndBeat).toBe(100)
    })

    it('should parse TAGS tag', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#TAGS:pop,rock,80s
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.tags).toBe('pop,rock,80s')
    })

    it('should handle VIDEOGAP with decimal value', () => {
      const content = `#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEOGAP:500,5
E`
      
      const result = parseUltraStarTxt(content)
      
      expect(result.videoGap).toBe(500.5)
    })
  })

  describe('convertUltraStarToSong', () => {
    it('should convert basic song to Song format', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test Song
#ARTIST:Test Artist
#BPM:120
#GAP:1000
#MP3:test.mp3
: 0 4 12 Hel
: 4 4 14 lo
- 8
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'audio/test.mp3')
      
      expect(song.title).toBe('Test Song')
      expect(song.artist).toBe('Test Artist')
      expect(song.bpm).toBe(120)
      expect(song.gap).toBe(1000)
      expect(song.audioUrl).toBe('audio/test.mp3')
      expect(song.lyrics).toHaveLength(1)
      expect(song.lyrics[0].notes).toHaveLength(2)
    })

    it('should calculate correct timing from BPM', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      // At 120 BPM: beatDuration = 15000 / 120 = 125ms
      // Note at beat 0, duration 4 = starts at 0ms, duration 500ms
      const expectedDuration = 4 * (15000 / 120) // 500ms
      expect(song.lyrics[0].notes[0].duration).toBe(Math.round(expectedDuration))
    })

    it('should apply GAP offset correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:2000
: 0 4 12 Test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      // With GAP 2000, note at beat 0 starts at 2000ms
      expect(song.lyrics[0].notes[0].startTime).toBe(2000)
    })

    it('should convert golden notes correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
* 0 4 12 Gold
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.lyrics[0].notes[0].isGolden).toBe(true)
    })

    it('should convert freestyle notes correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
F 0 4 12 Free
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.lyrics[0].notes[0].isBonus).toBe(true)
    })

    it('should calculate difficulty from note density', () => {
      // Easy: <20 notes per minute
      // Create a song with few notes over a longer duration
      // With #END:180000 (3 minutes), 10 notes = 10/3 ≈ 3.3 notes/min = easy
      const easySong = parseUltraStarTxt(`#TITLE:Easy
#ARTIST:Test
#BPM:120
#GAP:0
#END:180000
: 0 4 12 Test1
: 100 4 12 Test2
: 200 4 12 Test3
: 300 4 12 Test4
: 400 4 12 Test5
E`)
      
      const easyConverted = convertUltraStarToSong(easySong, 'test.mp3')
      expect(easyConverted.difficulty).toBe('easy')
    })

    it('should handle duet mode conversion', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#P1:Singer A
#P2:Singer B
P1:
: 0 4 12 Hello
P2:
: 4 4 14 World
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.isDuet).toBe(true)
      expect(song.duetPlayerNames).toEqual(['Singer A', 'Singer B'])
    })

    it('should set cover image correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#COVER:cover.jpg
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3', undefined, 'images/cover.jpg')
      
      expect(song.coverImage).toBe('images/cover.jpg')
    })

    it('should use END tag for total duration', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#END:180000
: 0 4 12 Test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.duration).toBe(180000)
    })

    it('should handle YouTube URLs correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:https://www.youtube.com/watch?v=test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.youtubeUrl).toBe('https://www.youtube.com/watch?v=test')
      expect(song.videoBackground).toBeUndefined()
    })

    it('should handle local video files correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:video.mp4
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3', 'videos/video.mp4')
      
      expect(song.videoBackground).toBe('videos/video.mp4')
      expect(song.youtubeUrl).toBeUndefined()
    })

    it('should preserve all metadata fields', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#GENRE:Pop
#LANGUAGE:English
#YEAR:2020
#EDITION:Greatest Hits
#CREATOR:Test Creator
#VERSION:1.0
#TAGS:classic
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.genre).toBe('Pop')
      expect(song.language).toBe('English')
      expect(song.year).toBe(2020)
      expect(song.album).toBe('Greatest Hits')
      expect(song.creator).toBe('Test Creator')
      expect(song.version).toBe('1.0')
      expect(song.tags).toBe('classic')
    })

    it('should handle preview settings', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#PREVIEWSTART:30
#PREVIEWDURATION:15
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      expect(song.preview).toBeDefined()
      expect(song.preview?.startTime).toBe(30000) // 30 seconds in ms
      expect(song.preview?.duration).toBe(15000) // 15 seconds in ms
    })

    it('should calculate MIDI pitch correctly', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 0 Note
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      
      // MIDI base offset is 48, so pitch 0 = MIDI 48 (C3)
      expect(song.lyrics[0].notes[0].pitch).toBe(48)
    })

    it('should set hasEmbeddedAudio when no audioUrl but has YouTube', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:https://www.youtube.com/watch?v=test
E`)
      
      const song = convertUltraStarToSong(ultraStar, '') // No audio URL
      
      expect(song.hasEmbeddedAudio).toBe(true)
    })
  })

  describe('generateUltraStarTxt', () => {
    it('should generate basic UltraStar file', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test Song
#ARTIST:Test Artist
#BPM:120.00
#GAP:0
#MP3:test.mp3
: 0 4 12 Hel
: 4 4 14 lo
- 8
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#TITLE:Test Song')
      expect(generated).toContain('#ARTIST:Test Artist')
      expect(generated).toContain('#BPM:')
      expect(generated).toContain('#GAP:0')
      expect(generated).toContain('#MP3:')
      expect(generated).toContain(': 0 4')
      expect(generated).toContain('E')
    })

    it('should generate golden notes with asterisk', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
* 0 4 12 Gold
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('* ')
    })

    it('should include VIDEO tag', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:video.mp4
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3', 'video.mp4')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#VIDEO:')
    })

    it('should include YouTube URL as VIDEO', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEO:https://www.youtube.com/watch?v=test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#VIDEO:https://www.youtube.com/watch?v=test')
    })

    it('should include VIDEOGAP when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VIDEOGAP:500
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#VIDEOGAP:500')
    })

    it('should include START tag when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#START:1000
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#START:1000')
    })

    it('should include END tag when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#END:180000
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#END:180000')
    })

    it('should include GENRE and LANGUAGE', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#GENRE:Pop
#LANGUAGE:English
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#GENRE:Pop')
      expect(generated).toContain('#LANGUAGE:English')
    })

    it('should include YEAR', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#YEAR:2020
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#YEAR:2020')
    })

    it('should include EDITION as album', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#EDITION:Greatest Hits
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#EDITION:Greatest Hits')
    })

    it('should include CREATOR', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#CREATOR:TestCreator
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#CREATOR:')
    })

    it('should include duet player names', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#P1:Singer A
#P2:Singer B
P1:
: 0 4 12 Hello
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#P1:')
      expect(generated).toContain('#P2:')
    })

    it('should include COVER when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#COVER:cover.jpg
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#COVER:cover.jpg')
    })

    it('should include BACKGROUND when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#BACKGROUND:bg.png
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#BACKGROUND:bg.png')
    })

    it('should include VERSION when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#VERSION:1.1.0
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#VERSION:1.1.0')
    })

    it('should include medley settings when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#MEDLEYSTARTBEAT:10
#MEDLEYENDBEAT:100
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#MEDLEYSTARTBEAT:10')
      expect(generated).toContain('#MEDLEYENDBEAT:100')
    })

    it('should include TAGS when present', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#TAGS:pop,rock
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#TAGS:pop,rock')
    })

    it('should include preview settings', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
#PREVIEWSTART:30
#PREVIEWDURATION:15
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated).toContain('#PREVIEWSTART:')
      expect(generated).toContain('#PREVIEWDURATION:')
    })

    it('should end with E marker', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Test
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      expect(generated.trim().endsWith('E')).toBe(true)
    })

    it('should generate line breaks at end of each lyric line', () => {
      const ultraStar = parseUltraStarTxt(`#TITLE:Test
#ARTIST:Test
#BPM:120
#GAP:0
: 0 4 12 Line1
- 4
: 8 4 14 Line2
- 12
E`)
      
      const song = convertUltraStarToSong(ultraStar, 'test.mp3')
      const generated = generateUltraStarTxt(song)
      
      // Should have line break markers (- beat)
      const lineBreaks = generated.match(/^- \d+$/gm)
      expect(lineBreaks).not.toBeNull()
      expect(lineBreaks!.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Round-trip conversion', () => {
    it('should maintain data through parse -> convert -> generate cycle', () => {
      const original = `#TITLE:Round Trip Test
#ARTIST:Test Artist
#BPM:120
#GAP:1000
#MP3:test.mp3
#GENRE:Pop
#LANGUAGE:English
#YEAR:2020
: 0 4 12 Hel
: 4 4 14 lo
- 8
E`
      
      const parsed = parseUltraStarTxt(original)
      const converted = convertUltraStarToSong(parsed, 'test.mp3')
      const generated = generateUltraStarTxt(converted)
      const reparsed = parseUltraStarTxt(generated)
      
      expect(reparsed.title).toBe('Round Trip Test')
      expect(reparsed.artist).toBe('Test Artist')
      expect(reparsed.bpm).toBe(120)
      expect(reparsed.gap).toBe(1000)
      expect(reparsed.genre).toBe('Pop')
      expect(reparsed.language).toBe('English')
      expect(reparsed.year).toBe(2020)
    })
  })
})
