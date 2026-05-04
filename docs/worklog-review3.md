# Code Review 3 — Worklog

## Session Start: 2026-05-05

### Review Summary
- **Scope:** 318 TypeScript-Dateien
- **TSC Errors (src/):** 8
- **ESLint:** 0 Errors, 0 Warnings
- **Issues gefunden:** 26 (8 P0, 18 P1)

---

### Fix 1: P0 — Doppelte Re-Export in youtube-player.tsx (TS2300)
**Datei:** `src/components/game/youtube-player.tsx`
**Problem:** Zeile 5 und 32 hatten identische `export { isYouTubeUrl, isDirectVideoUrl }` — TS2300 Duplicate Identifier
**Fix:** Redundante Zeile 32 entfernt (Zeile 5 bleibt als einziger Re-Export)
**Commit:** `acb0beb`

### Fix 2: P0 — Broken Icon-Imports (7 Dateien)
**Problem:** 5 Library-Dateien importierten aus nicht-existierendem `./icons`, 2 Mobile-Dateien aus nicht-existierendem `./mobile-icons`
**Fix:** Alle Import-Pfade auf `@/components/icons` korrigiert (alle benötigten Icons existieren dort)
**Dateien:**
- `song-card.tsx`, `song-start-modal.tsx`, `folder-view.tsx`, `playlist-view.tsx`, `add-to-playlist-modal.tsx` — `./icons` → `@/components/icons`
- `mobile-mic-view.tsx`, `mobile-songs-view.tsx` — `./mobile-icons` → `@/components/icons`
**Commit:** `6daacf7`

### Fix 3: P1 — 18 Merge-Artefakte (doppelte Parameternamen) in 14 Dateien
**Problem:** Git-Merge-Artefakte verdoppelten Parameternamen (z.B. `_filePathfilePath`, `_positionMspositionMs`)
**Fix:** Alle 18 Artefakte mit sed korrigiert
**Dateien & Fixes:**
| Datei | Artefakt | Fix |
|-------|----------|-----|
| `use-native-audio.ts:42,48` | `_filePathfilePath`, `_positionMspositionMs` | `_filePath`, `_positionMs` |
| `use-mobile-client.ts:38` | `_isAdPlayingisAdPlaying` | `_isAdPlaying` |
| `use-game-modes.ts:12` | `_isBlindisBlind` | `_isBlind` |
| `use-editor-history.ts:14` | `_newLyricsnewLyrics` | `_newLyrics` |
| `library/types.ts:56,61` | `_playerIdplayerId`, `_playerNameplayerName`, `_songIdsongId` | korrigiert |
| `unified-party-setup.hook.ts:14` | `_suggestedSongssuggestedSongs` | `_suggestedSongs` |
| `unified-party-setup.tsx:21` | `_suggestedSongssuggestedSongs` | `_suggestedSongs` |
| `unified-party-setup.components.tsx:774` | `_songIdsongId` | `_songId` |
| `game-background.tsx:29` | `_errorCodeerrorCode` | `_errorCode` |
| `rate-my-song-screen.tsx:52` | `_playerIdsplayerIds` | `_playerIds` |
| `mobile-profile-edit-view.tsx:22` | `_hostProfilehostProfile` | `_hostProfile` |
| `mobile-queue-view.tsx:10` | `_itemIditemId` | `_itemId` |
| `general-tab.tsx:11` | `_newLangnewLang` | `_newLang` |
| `note-block.tsx:18` | `_startXstartX` | `_startX` |
| `waveform.tsx:18` | `_timeMstimeMs` | `_timeMs` |
**Commit:** `b86645f`

---

## Ergebnis
- **TSC Errors (src/):** 0
- **ESLint:** 0 Errors, 0 Warnings
- **Alle 26 Issues behoben**
