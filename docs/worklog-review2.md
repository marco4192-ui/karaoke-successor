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

