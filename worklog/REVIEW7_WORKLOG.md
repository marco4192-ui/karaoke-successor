# Review #7 — Worklog

## Gestartet: 2026-04-30

### Übersicht der gefundenen Probleme
- 5 Kritische Bugs (C1-C5)
- 14 Bugs (B1-B14)
- ~61 Dead Code Einträge (D1-D61)
- ~20 Unsaurer Code (U)
- ~17 Verbesserungen (I1-I17)

---


### C1: getSortedFolderKeys fehlt — FolderView Crash ✅
- **Datei**: `src/components/screens/library/utils.ts`
- **Problem**: `FolderView` importierte `getSortedFolderKeys` aus `./utils`, aber die Funktion existierte nicht
- **Fix**: Funktion implementiert — A-Z Sortierung für Buchstaben-Gruppen mit `#` am Ende, alphabetisch für andere Gruppierungen
- **Commit**: `9047cd8`

---

### C2: Blob-URLs Memory Leak ✅
- **Dateien**: `media-db.ts`, `use-battle-royale-song-media.ts`, `use-game-media.ts`, `pass-the-mic-screen.tsx`, `unified-party-setup.components.tsx`
- **Problem**: `getSongMediaUrls` erstellte Blob-URLs die nie freigegeben wurden
- **Fix**: `revokeSongMediaUrls()` Helper hinzugefügt; Cleanup in allen Game-Hooks bei Song-Wechsel/Unmount

### C3: Config-API ohne Auth ✅
- **Datei**: `src/app/api/config/route.ts`
- **Problem**: POST/PUT/DELETE ohne Zugriffskontrolle
- **Fix**: `isLocalRequest()` Prüfung für Tauri-Origins und localhost

### C4: FALSE POSITIVE — clientIp wird bereits korrekt gesetzt ✅
- Zeile 41 in `post-handlers.ts` setzt `clientIp` korrekt aus Request-Headern

### C5: Player Accuracy Live-Update ✅
- **Datei**: `src/hooks/use-note-scoring.ts`
- **Problem**: `accuracy` wurde nur am Songende berechnet, nicht während des Spiels
- **Fix**: Accuracy wird jetzt bei jedem Hit/Miss als `(notesHit/totalNotes)*100` berechnet

---
