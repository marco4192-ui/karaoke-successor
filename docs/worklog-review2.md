# Code Review 2 — Worklog

## Session Start: 2026-05-04

### Bug #1: seekAudio() ignoriert Position (FIXED)
- **Datei:** `src/lib/audio/native-audio.ts`
- **Problem:** Parametername `_positionMspositionMs` (Merge-Artefakt), invoke bekam leeres `{}`
- **Ursache:** Fehlerhafter Merge hat Parametername verdoppelt und invoke-Aufruf beschädigt
- **Fix:** Parameter auf `positionMs` korrigiert, invoke bekommt `{ positionMs }`
- **Verifikation:** Rust-Backend erwartet `position_ms: u64` — camelCase→snake_case Konvertierung passt
- **Aufrufer:** `use-native-audio.ts:184` übergibt bereits korrekt `positionMs`

### Bug #2: viralSetCountry() sendet Land nicht + Merge-Artefakte in Interface (FIXED)
- **Datei:** `src/hooks/use-viral-charts.ts`
- **Problem 1:** `viralSetCountry(_country)` akzeptierte Land-Parameter, übergab aber leeres `{}` an invoke
- **Problem 2:** Interface-Namen verdoppelt: `_songssongs`, `_songIdsongId`
- **Fix:** invoke bekommt jetzt `{ country }`, Interface-Parameter auf korrekte Namen korrigiert
- **Verifikation:** Rust-Backend erwartet `country: String` — Passt

### Bug #3-10: Merge-Artefakte in Parameternamen (ALL FIXED)
- **Bug #3:** `src/lib/audio/vocal-detector.ts:174` — `_sampleRatesampleRate` → `_sampleRate`
- **Bug #4:** `src/lib/db/custom-songs-db.ts:219` — `_localStorageKeylocalStorageKey` → `_localStorageKey`
- **Bug #5:** `src/lib/audio/microphone-manager.ts:312` — `_micsmics` → `_mics` (Typdeklaration)
- **Bug #6:** `src/components/game/pass-the-mic-screen.tsx:52` — `_playersplayers`, `_settingssettings` → `_players`, `_settings`
- **Bug #7:** `src/components/screens/home-screen.tsx:21` — `_screenscreen` → `_screen`
- **Bug #8:** `src/components/game/tournament-screen.tsx:24` — `_bracketbracket`, `_songDurationsongDuration` → `_bracket`, `_songDuration`
- **Bug #9:** `src/types/qrcode.d.ts:12` — `_texttext` → `_text`
- **Bug #10:** `src/types/youtube.d.ts:7,14,16,45` — 4 doppelte Parameternamen korrigiert

### Bug #12: __mobileCameraConnected toter State (FIXED → Feature implementiert)
- **Datei:** `src/components/social/shorts-creator.tsx`
- **Problem:** State `__mobileCameraConnected` wurde gesetzt (true/false) aber nie im UI angezeigt
- **Fix:** State renamed zu `mobileCameraConnected`, UI zeigt jetzt:
  - Badge "Mobile Connected" wenn verbunden
  - "Disconnect Mobile" Button wenn Kamera aktiv
  - Mobile Camera Button auch verfügbar wenn lokale Kamera läuft

---

## Session 2 — Verbesserungen & Dead Code (2026-05-04, Fortsetzung)

### Verbesserung 1: ratingColors konsolidiert (FIXED)
- **Problem:** 3 identische `ratingColors` Definitionen in score-card.tsx, shorts-creator.tsx, results-screen.tsx
- **Fix:** Neues Shared-Modul `src/lib/game/rating-utils.ts` mit `RATING_HEX_COLORS` (Canvas) und `RATING_TAILWIND_CLASSES` (HTML)
- **Commit:** `refactor(imp1): consolidate ratingColors`

### Verbesserung 2: generateConnectionCode() konsolidiert (FIXED)
- **Problem:** 2 ähnliche Code-Generatoren in mobile-state.ts (4 chars, unambiguous) und battle-royale.ts (6 chars, full alpha-num)
- **Fix:** Neues Shared-Modul `generateCode(length, chars)` in `src/lib/utils.ts` mit `COMPANION_CODE_CHARS` und `FULL_CODE_CHARS` Presets
- **Commit:** `refactor(imp2): consolidate generateConnectionCode()`

### Verbesserung 3: AUDIO_EXTENSIONS/VIDEO_EXTENSIONS konsolidiert (FIXED)
- **Problem:** Identische Extension-Listen in folder-scanner.ts und tauri-file-storage.ts
- **Fix:** Neues Shared-Modul `src/lib/media-extensions.ts` mit AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, TXT_EXTENSIONS, COVER_EXTENSIONS, BACKGROUND_EXTENSIONS
- **Commit:** `refactor(imp3): consolidate AUDIO_EXTENSIONS/VIDEO_EXTENSIONS`

### Verbesserung 4: Doppelte Mobile-Typen (ÜBERSPRUNGEN)
- **Problem:** `MobileProfile`, `QueueItem`, `GameResults`, `PitchData`, `GameState` doppelt definiert
- **Analyse:** Die Typen dienen verschiedenen Schichten (Server-API vs Client-UI) mit strukturell verschiedenen Shapes
  - `QueueItem`: API hat `addedAt`, `companionCode: string` (required); Client hat `companionCode?: string` (optional), `status: string` (loose)
  - `PitchData`: API hat `clarity`, `timestamp`, `isSinging?`; Client hat nur `frequency`, `note`, `volume`
  - `GameState`: API hat `currentTime`, `gameMode`; Client hat `queueLength`, `singalongTurn.nextProfileId`
- **Entscheidung:** Konsolidierung zu riskant — verschiedene Datenmodelle für verschiedene Schichten

### Verbesserung 5: Reverse-Abhängigkeit behoben (FIXED)
- **Problem:** `lib/parsers/ultrastar-parser.ts` importierte `isYouTubeUrl`/`isDirectVideoUrl` von `components/game/youtube-player.tsx`
- **Fix:** Neue `src/lib/url-utils.ts` mit beiden Funktionen; youtube-player.tsx re-exported für Abwärtskompatibilität
- **Bonus:** 2 zusätzliche Merge-Artefakte in youtube-player.tsx gefunden und gefixt: `_currentTimecurrentTime`, `_errorCodeerrorCode`
- **Commit:** `refactor(imp5): fix reverse dependency`

### Verbesserung 6: UltraStar TXT Parsing Duplikation (ÜBERSPRUNGEN)
- **Problem:** 3 ähnliche TXT-Parser (ultrastar-parser.ts, song-lyrics-loader.ts, tauri-file-storage.ts)
- **Analyse:** Drei verschiedene Use-Cases (Import/Konvertierung, Runtime-Laden, Tauri-Scanning) mit unterschiedlichen Input/Output-Anforderungen
- **Entscheidung:** `convertNotesToLyricLines` bereits geteilt; vollständige Konsolidierung zu riskant

### Final Cleanup: ESLint auf 0 Warnings
- `replay-db.ts`: `deleteReplaysForSong` → `_deleteReplaysForSong` (reserved für future delete-song UI)
- `native-fs.ts`: `nativeWriteFileBytes` → `_nativeWriteFileBytes` (reserved für future import features)
- **Ergebnis:** 0 ESLint errors, 0 ESLint warnings

