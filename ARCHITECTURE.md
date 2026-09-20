# Karaoke ZERO — Architektur-Karte

Eine Seite: welche Datei was tut, wie sie zusammenarbeiten, worauf aufgebaut wird.

## Einstieg / App-Gerüst

| Datei | Funktion |
|---|---|
| `src/app/page.tsx` | Root-Route, lädt `karaoke-app.tsx` |
| `src/app/karaoke-app.tsx` | **Screen-Router + globaler State.** Alle Screens (home/library/editor/party/…), Navigation, Profile, Modus-Starts. Das Herzstück — bei Problemen zuerst hier. |
| `src/app/mobile/page.tsx` | Companion-App (Handy): Mikro, Remote, Chat, Spiegel-Ansichten |
| `src/lib/game/store.ts` | Zustand-Store: aktueller Screen, Party-Zustand, Pause-Dialog |
| `src/lib/game/party-store.ts` | Persistenter Party-Store (Sessions, Verlauf) |

## Song-Datenfluss (Kern-Kette)

```
TXT-Datei → ultrastar-parser → notes-to-lyric-lines → Song/LyricLine/Note → Library → Spiel
```

| Datei | Funktion |
|---|---|
| `src/lib/parsers/ultrastar-parser.ts` | TXT → Rohnoten; `generateUltraStarTxt` (Rückweg fürs Speichern) |
| `src/lib/parsers/notes-to-lyric-lines.ts` | **Einzige Quelle** für Note→LyricLine-Konvertierung (Duett-Stimmen-Split, Voice-Prefix-IDs). Von parser, scanner, tauri-storage, lyrics-loader genutzt. |
| `src/lib/parsers/multi-format-import.ts` | Import KM/MIDI/SingStar/StepMania (nur Single-Voice) |
| `src/lib/parsers/folder-scanner.ts` + `file-storage-scanner.ts` | Ordner-Scan → Songs |
| `src/lib/game/song-library.ts` | **Library-Wahrheit:** add/addSongs/update/upsertSong/removeSong/purgeAbortedNewSongs + Cache (`songCache`) |
| `src/lib/game/song-lyrics-loader.ts` | Lazy: Lyrics einer Song-ID nachladen (nutzt notes-to-lyric-lines) |
| `src/lib/game/library-cache.ts`, `song-url-restore.ts` | Performance/Blob-URL-Restore |
| `src/lib/db/media-db.ts` | IndexedDB: Media-Blobs + Browser-TXT-Persistenz |
| `src/lib/editor/save-to-file.ts` | Editor-Save: Tauri → Datei, Browser → media-db. **File-first**: erst Datei, dann Library (upsertSong). |

**Invarianten:** Neue Songs (New-Song-Dialog) werden ERST beim Speichern via `upsertSong` persistiert; abgebrochene Entwürfe fliegen weg, Altlasten (`new-`-Shells) purgen Editor/Library beim Mount.

## Editor

| Datei | Funktion |
|---|---|
| `src/components/screens/editor-screen.tsx` | Editor-Screen: Liste, Filter, Metadata-Studio, New-Song-Dialog, Legacy-Purge |
| `src/components/editor/karaoke-editor.tsx` | Editor-Logik: Noten-ops, Tap-Mode, Save-Flow, Undo/Redo (`use-editor-history`) |
| `src/components/editor/timeline/timeline.tsx` | Timeline mit Lanes (Duett-Split), rendert `NoteBlock` |
| `src/components/editor/timeline/note-block.tsx` | Noten-Block (Farben pro Typ/Stimme, Resize/Drag) |
| `src/lib/editor/*` | syllable-separator, beat-utils, demo-song, rule-harmonizer |

## Spiel-Modi (Party)

Start: `karaoke-app.tsx` → `party/party-start-handlers/start-*.ts` → Screen.

| Modus | Kern-Dateien |
|---|---|
| Standard/Duell/Duett | `game-screen.tsx` + `game-screen-hook.ts`, `note-highway.tsx`, `duet-note-highway.tsx` |
| **Battle Royale** | `battle-royale-screen.tsx` → `use-battle-royale-game.ts` (Spiel-Loop + **Elim-Takt**) → `use-battle-royale-round-handlers.ts` (Rundenwechsel/Eliminierung) → `use-battle-royale-round-timer.ts` (Countdown). Rein: `lib/game/battle-royale.ts` (`startRound`, **`getEffectiveRoundDuration`** = EINZIGE Dauer-Quelle), `battle-royale-elimination.ts`, `battle-royale-types.ts` (Settings). Views: `components/game/battle-royale/*` |
| Medley | `game/medley/*` (setup/game-hook/snippet-generator/scoring) |
| Tournament | `game/tournament-*`, `lib/game/tournament.ts` (Double-Elim `tournament-double-elim.ts`) |
| PTM/CPTM (Mic weiterreichen) | `game/ptm-*`, `cptm-*`, `use-ptm-scoring.ts` |

**BR-Regeln (2.2-R2):** Ausscheide-Intervall = Settings `roundDuration` (Random/Vote: Mid-Song-Elim-Takt, zeitstempelbasiert, Pause-verschiebend; Medley: Snippet-Budget 30 s/Snippet). Finale/letztes Duell = `finalRoundDuration`. Song-Ende (Random/Vote) = **reiner Rundenwechsel** (keine Extra-Eliminierung). Keine hartcodierten Intervalle.

## Audio / Pitch (Spielpipeline)

```
Mikro → microphone-manager → pitch-detector (YIN) → party-scoring (Tick-Bewertung) → Store
```

| Datei | Funktion |
|---|---|
| `src/lib/audio/pitch-detector.ts` + `pitch-detector-manager.ts` + `use-multi-pitch-detector.ts` | Pitch pro Spieler (1 Detektor/Mikro) |
| `src/lib/audio/vocal-detector.ts` | Summen-Klassifikator — **deaktiviert** (`VOCAL_CLASSIFIER_ENABLED=false`); Scoring/Anzeigen laufen auf `pitch != null` + Volume |
| `src/lib/game/party-scoring.ts` | Tick-Scoring aller Party-Modi (isSinging ist KEIN Gate) |
| `src/lib/game/scoring.ts` | Standard-Modus-Scoring + `calculateScoringMetadata` (Punkte-Budget je Fenster) |
| `src/lib/audio/loudness.ts` | EBU-R128-Normalization (89 dB) |
| `src/lib/audio/native-audio.ts` + `src-tauri/src/audio/*` | Tauri-Player (ASIO/WASAPI), Rust-Pitch (crepe/yin) |
| `src/hooks/use-media-playback.ts`, `use-native-audio.ts` | Media-Abspiel-Adapter (Browser-Element vs. nativ) |

## Companion / Mobile / Realtime

| Datei | Funktion |
|---|---|
| `src/lib/socketio-server.ts` + `src/app/api/mobile/*` | Zwei Kanäle: Socket.IO (echtes WS) + HTTP-Long-Poll Fallback — **gleicher Zustand** |
| `src/hooks/use-mobile-client.ts` / `use-mobile-game-sync.ts` / `use-mobile-pitch-detection.ts` | Handy-Seite: Verbindung, Spiel-Sync, Mikro-Streaming |
| `src/components/screens/mobile/mirror-views/*` | Spiegel-Ansichten (Lite-Versionen der Screens) |
| Gateway-Regel | API-Calls immer relativ, fremde Ports via `?XTransformPort=…` |

## UI-Basis

- `src/components/ui/*` — shadcn/ui-Set. `src/components/icons.tsx` — Icon-Helfer.
- `src/lib/i18n/` — 16 Sprachen; **neue Keys in de + en** pflegen (`locales/{de,en}/`), Rest hat en-Fallback.
- `src/components/tutorial/*` — geführte Touren.

## Persistenz-Übersicht

| Was | Wo |
|---|---|
| Songs (Library) | `song-library.ts` → localStorage/IndexedDB (`saveCustomSongs`, `media-db`) |
| Song-Medien | `media-db.ts` (Browser) / Tauri-FS (`tauri-file-storage.ts`, `native-fs.ts`) |
| Einstellungen | `storage.ts` (StorageKeys), `use-game-settings.ts` |
| Replays/Highscores | `replay-db.ts`, `leaderboard/*` (+ `leaderboard-api/` PHP-Server) |
| Profile/Fortschritt | `player-progression.ts`, `progression-*.ts` |
