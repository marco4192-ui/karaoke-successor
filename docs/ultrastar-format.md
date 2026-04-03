# UltraStar TXT Format Dokumentation

Diese Dokumentation beschreibt alle unterstützten Meta-Daten im UltraStar TXT-Format.

## Grundlegende Header

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#TITLE:` | string | Songtitel | `#TITLE:tau mich auf` |
| `#ARTIST:` | string | Künstlername | `#ARTIST:Zartmann` |
| `#BPM:` | number | Beats pro Minute (Dezimalpunkt oder Komma) | `#BPM:314` |
| `#GAP:` | number | Verzögerung vor Lyrics-Start in Millisekunden | `#GAP:9850` |

## Medien-Dateien

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#MP3:` | string | Audio-Datei (alle unterstützten Formate) | `#MP3:song.mp3` |
| `#AUDIO:` | string | Alternative zu #MP3: | `#AUDIO:song.ogg` |
| `#VIDEO:` | string | Video-Datei (alle unterstützten Formate) | `#VIDEO:video.mp4` |
| `#COVER:` | string | Cover-Bild | `#COVER:cover.jpg` |
| `#BACKGROUND:` | string | Hintergrund-Bild | `#BACKGROUND:bg.jpg` |

**Wichtig:**
- `#MP3:` kann auch auf eine Video-Datei zeigen (Video mit eingebettetem Audio) → `hasEmbeddedAudio = true`
- Fehlt `#MP3:` oder `#AUDIO:`, wird geprüft ob eine Video-Datei mit Audio verwendet werden kann
- Fehlt `#VIDEO:`, wird auf Hintergrundanimation zurückgegriffen

## Zeitsteuerung

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#START:` | number | Überspringt Anfang in Millisekunden | `#START:5000` |
| `#END:` | number | Beendet Song vor dem eigentlichen Ende in ms | `#END:180000` |
| `#VIDEOGAP:` | number | Video-Versatz zum Audio in Millisekunden | `#VIDEOGAP:-200` |
| `#VIDEOSTART:` | number | Fester Startpunkt für Video (unabhängig vom Audio) | `#VIDEOSTART:1000` |

## Preview (Vorschau in der Library)

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#PREVIEWSTART:` | number | Startzeit der Vorschau in Sekunden (default: 0) | `#PREVIEWSTART:30` |
| `#PREVIEWDURATION:` | number | Dauer der Vorschau in Sekunden (default: 15) | `#PREVIEWDURATION:20` |

## Medley-Modus

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#MEDLEYSTARTBEAT:` | number | Start-Beat für Medley | `#MEDLEYSTARTBEAT:100` |
| `#MEDLEYENDBEAT:` | number | End-Beat für Medley | `#MEDLEYENDBEAT:500` |

## Metadaten

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#GENRE:` | string | Musik-Genre | `#GENRE:Pop` |
| `#LANGUAGE:` | string | Sprache (ISO-Code oder Name) | `#LANGUAGE:German` |
| `#YEAR:` | number | Erscheinungsjahr | `#YEAR:2025` |
| `#EDITION:` | string | Edition/Album | `#EDITION:SingStar Pop` |
| `#VERSION:` | string | Version (bei mehreren Versionen) | `#VERSION:1.0.0` |
| `#CREATOR:` | string | Ersteller der TXT-Datei | `#CREATOR:DS` |
| `#TAGS:` | string | Kommagetrennte Tags für Suche | `#TAGS:party, 80s, classic` |

## Duet-Modus

| Header | Typ | Beschreibung | Beispiel |
|--------|-----|--------------|----------|
| `#P1:` | string | Name des ersten Sängers | `#P1:Elton John` |
| `#P2:` | string | Name des zweiten Sängers | `#P2:Kiki Dee` |

**Hinweis:** Die Note-Zeilen können auch P1: oder P2: Präfixe haben, um Zuordnungen zu definieren.

## Unterstützte Dateiformate

### Audio
- `.mp3` - MPEG Audio Layer III
- `.ogg` - Ogg Vorbis
- `.wav` - Waveform Audio
- `.m4a` - MPEG-4 Audio
- `.flac` - Free Lossless Audio Codec
- `.aac` - Advanced Audio Coding
- `.wma` - Windows Media Audio
- `.opus` - Opus Interactive Audio Codec
- `.weba` - WebM Audio
- `.aiff`, `.aif` - Audio Interchange File Format

### Video
- `.mp4` - MPEG-4 Part 14
- `.webm` - WebM
- `.mkv` - Matroska Video
- `.avi` - Audio Video Interleave
- `.mov` - QuickTime File Format
- `.wmv` - Windows Media Video
- `.flv` - Flash Video
- `.m4v` - MPEG-4 Video
- `.3gp` - 3GPP Multimedia
- `.ogv` - Ogg Video
- `.ts` - MPEG Transport Stream

### Bilder (Cover/Hintergrund)
- `.jpg`, `.jpeg` - JPEG
- `.png` - Portable Network Graphics
- `.gif` - Graphics Interchange Format
- `.webp` - WebP
- `.bmp` - Bitmap

## Note-Zeilen Format

```
[TYP] [STARTBEAT] [DAUER] [PITCH] [LYRIC]
```

### Typen
- `:` - Normale Note
- `*` - Goldene Note (Bonus-Punkte)
- `F` - Freestyle Note (keine Bewertung)
- `R` - Rap Note
- `G` - Goldene Note (Alternative)

### Zeilenumbrüche
- `- [BEAT]` - Zeilenumbruch bei Beat

### Beispiel
```
: 0 3 -6 Was 
: 8 2 -6 für 
: 11 2 -6 ein 
- 45
* 482 12 2 Oh, 
```

## Spieler-Marker (Duet)

```
P1:
: 0 3 -6 Ich singe...
P2:
: 50 3 -6 Und ich auch...
```

Oder inline:
```
P1: 0 3 -6 Ich singe...
P2: 50 3 -6 Und ich auch...
```

## Dateiende

- `E` - Markiert das Ende der Datei

## Vollständiges Beispiel

```
#ARTIST:Zartmann
#TITLE:tau mich auf
#MP3:video.mp4
#CREATOR:DS
#COVER:cover.jpg
#BACKGROUND:Zartmann - tau mich auf [BG].jpg
#YEAR:2025
#LANGUAGE:German
#BPM:314
#GAP:9850
#VIDEO:video.mp4
#PREVIEWSTART:30
#PREVIEWDURATION:15

: 0 3 -6 Was 
: 8 2 -6 für 
: 11 2 -6 ein 
- 45
: 47 1 -6 Ich 
E
```
