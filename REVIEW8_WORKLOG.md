# Review #8 — Worklog

## C1: Blob-URL Memory-Leak in ensureSongUrls() — BEREITS BEHOBEN
- **Status**: Keine Änderung nötig
- **Grund**: `revokeSongMediaUrls()` existiert bereits in media-db.ts und wird in allen Hooks korrekt aufgerufen:
  - `use-game-media.ts`: Revokes bei Song-Wechsel und Cleanup
  - `use-battle-royale-song-media.ts`: Revokes bei Song-Wechsel
  - `unified-party-setup.components.tsx`: Tracked in `coverBlobUrlsRef`, revoked on unmount
  - `tauri-file-storage.ts`: Blob-URL-Cache mit 200-Entry Cap und Eviction
- In Tauri-Modus nutzt `getSongMediaUrl()` den gecachten `blobUrlCache`
- Browser-Code-Pfade in `getAllSongsAsync()` irrelevant für Tauri-only

## C10+C11: API-Routes ohne Auth absichern
- **Status**: ✅ Behoben
- **Commit**: `47bbf8c`
- **Änderungen**:
  - Neue Datei: `src/app/api/lib/is-local-request.ts` — Shared `isLocalRequest()` Utility
  - `src/app/api/config/route.ts`: Auth-Guard zu GET hinzugefügt, lokale Definition durch Import ersetzt
  - `src/app/api/lyrics-suggestions/route.ts`: Auth-Guard zu POST hinzugefügt
  - `src/app/api/song-identify/route.ts`: Auth-Guard zu POST hinzugefügt
  - `src/app/api/cover-generate/route.ts`: Auth-Guard zu POST hinzugefügt
  - `src/app/api/assets/generate/route.ts`: Auth-Guard zu POST und PUT hinzugefügt (proxied API-Keys!)
  - Offen gelassen: `/api/songs`, `/api/mobile` (Companion-Devices), `/api` (Health-Check)
