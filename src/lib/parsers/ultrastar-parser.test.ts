import { describe, it, expect } from 'vitest'
import {
  parseUltraStarTxt,
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
  })
})
