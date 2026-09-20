# Karaoke ZERO — Projekt-Worklog & Übergabedokument

> **Zuletzt aktualisiert:** 2026-09-20 (Session: Wiederaufnahme nach Kontextverlust — Bugfix-Liste 11 Punkte)

---

## 1. Projekt-Status (Gesamtbewertung)

Die Anwendung ist ein funktionsreiches Karaoke-Spiel (Next.js 16 / App Router, TypeScript,
Tailwind 4, shadcn/ui, Socket.IO, Tauri-Desktop-Shell optional). Alle Kernscreens
(Home, Library, Editor, Party-Modi inkl. Battle Royale/Medley/Tournament/PTM, Daily,
Queue, Jukebox, Highscores, Achievements, Mobile-Companion via `/mobile`) sind
implementiert und über `/` (bzw. In-App-Navigation) erreichbar.

**Dev-Server:** läuft auf Port 3000 (`bun run dev`, dev.log sauber — keine Errors).
**Lint:** 0 Errors (nur prä-existente Warnings).
**Letzte QA (Agent-Browser):** Editor-Flows (Neuen Song erstellen/abbrechen/speichern,
Duett-Import, Duett-Noten-Editierung) grün, keine Console-/Page-Errors.

### Bugfix-Liste des Users — Endstatus (11 Punkte)

| # | Punkt | Status | Umsetzung / Nachweis |
|---|-------|--------|----------------------|
| 1.1 | Editor: Notenbalken dicker | ✅ erledigt | `note-block.tsx`: Balken füllt Lane zu 90 % + 3 px (cap: Lane-Höhe−1), vertikal zentriert |
| 1.2 | Editor: Duett-Noten unabhängig | ✅ erledigt (Commit `10e24248`) | Root Cause: Note-/Line-ID-Kollision — `buildLinesFromNotes()` lief pro Stimme mit neu startenden Zählern → P1-Note-1 und P2-Note-1 hatten beide `note-0-0`. Fix: Voice-Prefix (`note-p1-0-0`, `line-p2-0`, …). Verifiziert: Bun-Parser-Check + E2E (Import → Editor → Fiber-Props → Lyric-Edit einer P2-Note lässt P1 unberührt) |
| 1.3 | Abgebrochene Songs nicht in Library | ✅ erledigt (Commit `10e24248`) | Root Cause: `NewSongDialog.onSave` rief sofort `addSong()` auf. Fix: Song wird erst im Editor geöffnet; Persistierung NUR beim Speichern via neuem `upsertSong()` (update-if-exists/add-otherwise) in `karaoke-editor.tsx` (handleSave + handleSaveOnly), `editor-screen.tsx` (handleSave), `save-to-file.ts` (IndexedDB-Txt-Fallback, storedTxt-Flag). Verifiziert E2E: Cancel → Library bleibt leer; Save & Exit → Song erscheint; Save-Only-Update auf existierendem Song → „Gespeichert (Browser-Speicher)" |
| 2.1 | BR: Pitch-Detection-Aussetzer | ✅ erledigt (Commit `d22bf9d4`) | `isSinging === false` (Hum-Filter-Klassifikator) war Scoring-Gate und verwarf gehaltene Noten → Gate entfernt, nur noch visuelle Nutzung |
| 2.2 | BR: Eliminierungs-Rhythmus Random/Vote | ✅ erledigt (Commit `d22bf9d4`) | 60-s-Intervall existierte; Fehler war ZUSÄTZliche Eliminierung am Song-Ende → Song-Ende ist jetzt reiner Rundenwechsel; `onGameCommitted`-Lifecycle-Hook hält `pendingScoredGameRef` synchron, damit throttled Store-Write nie Rundenfortschritt revertiert |
| 2.3 | BR: Latenz | ✅ erledigt (Commit `d22bf9d4`) | Throttled Score-Store-Writes, Window-basierte Scoring-Metadaten (Budget auf tatsächliches Spiel-Fenster), Song-Wechsel ohne Media-Stall (Prefetch) |
| 3 | Volume Normalization 89 dB | ✅ erledigt (Commit `54c631f1`) | EBU-R128-Loudness-Normalization auf -89 dB Target in `src/lib/audio/loudness.ts` |
| 4 | Native Audio Output / ASIO | ✅ erledigt | `src-tauri/src/audio/player.rs` (ASIO/WASAPI-Backend-Handling), `audio-output-section.tsx` (ASIO-Host-Filter), Tauri-Channel-IPC (`9460ea34`) |
| 5 | Leaderboard „Test Connection" | ✅ erledigt | `about-tab.tsx`: `leaderboardService.testConnection()` + i18n (en/de „Test Connection"/„Verbindung testen") |
| 6 | QA | ✅ durchgeführt | Agent-Browser-E2E der Editor-Flows (Screenshots: `qa-editor-duet.png`), dev.log + Console fehlerfrei |
| 7 | Worklog + Cron | ✅ erledigt (dieses Dokument) | worklog.md neu angelegt (ging beim Kontextverlust verloren); Cron-Job webDevReview alle 15 Min erstellt |

**Damit sind ALLE 11 Punkte der Bugfix-Liste abgeschlossen.**

---

## 2. Aktueller Stand / letzte Änderungen (Session 2026-09-20)

### Durchgeführt
1. **Rekonstruktion nach Kontextverlust:** worklog.md fehlte → Status aus Git-History
   (`git log`), Code-Inspektion und gezielten Verifikationen rekonstruiert.
   Festgestellt: 1.1, 2.1–2.3, 3, 4, 5 waren bereits committet; **1.2 und 1.3 waren offen.**
2. **Fix 1.2** (`src/lib/parsers/notes-to-lyric-lines.ts`):
   - `buildLinesFromNotes()` bekommt Voice-Key (`playerTarget` → Marker der ersten Note → `solo`)
   - Note-IDs: `note-{voice}-{line}-{idx}`, Line-IDs: `line-{voice}-{n}`
   - Betrifft den zentralen UltraStar-Parse-Pfad (ultrastar-parser, song-lyrics-loader,
     file-storage-scanner, tauri-file-storage nutzen alle den geteilten Konverter)
   - `multi-format-import.ts` benötigt KEINE Änderung (nur Single-Voice-Formate)
3. **Fix 1.3** (`song-library.ts`, `editor-screen.tsx`, `karaoke-editor.tsx`, `save-to-file.ts`):
   - Neu: `upsertSong()` in song-library (await waitForScanLock, update-oder-add, idempotent)
   - NewSongDialog.onSave: kein `addSong()` mehr — nur Editor öffnen
   - Alle Save-Pfade (handleSave, handleSaveOnly, handleSave im Screen, IndexedDB-Fallback)
     verwenden upsert
   - Editor besaß bereits Unsaved-Changes-Guard (Cancel-Confirm + beforeunload)
   - Andere `addSong`-Aufrufe (Import-Screen, Demo-Song) bleiben bewusst unverändert
     (vollständige Songs, expliziter User-Import)
4. **Verifikation:** `bun run lint` → 0 Errors; Dev-Server sauber; Agent-Browser-E2E:
   - 1.3 Abbruch: Dialog ausfüllen → Editor → Cancel → Library zählt weiter 0 Songs ✓
   - 1.3 Save: Dialog → Editor → Save & Exit → „QA Save Test" erscheint (1 Song) ✓
   - 1.2 E2E: Duett-TXT (P1/P2-Marker) via Settings→Library→UltraStar Import importiert
     (4 Noten erkannt) → im Editor geöffnet → React-Fiber-Props zeigen
     `note-p1-0-0/-0-1`, `note-p2-0-0/-0-1` → Lyric-Edit „Wor"→„WorX" ändert NUR die P2-Note ✓
   - Save-Only auf existierendem Duett: „Gespeichert (Browser-Speicher)" ✓
5. **Commit:** `10e24248` (Auto-Push an GitHub in Sandbox nicht möglich — lokal safe).

### Wichtige Architektur-Entscheidungen
- **Upsert statt Add-on-Create:** Die Library bleibt die Wahrheit über existierende Songs;
  flüchtige Editor-Entwürfe leben nur im Komponenten-State. Kein „Tombstone"-Aufräumen nötig.
- **Voice-Namespaced IDs:** Deterministisch, lesbar, abwärtskompatibel (alte persistierte
  Songs mit kollidierenden IDs werden beim nächsten Lazy-Parse der TXT automatisch
  frisch generiert — kein Migrationsschritt nötig).

---

## 3. Offene Punkte / Risiken / Empfehlungen für die nächste Phase

### Bekannte kleine Restrisiken (nicht kritisch)
- **Tauri-Desktop-Pfad (1.3):** Beim ersten Save eines NEUEN Songs ohne
  `relativeTxtPath`/`folderPath` fragt `saveSongToTxt` per Native-Dialog nach dem
  Speicherort (erwartetes Verhalten). Ein Folder-Rescan könnte den Song danach nochmal
  unter anderer ID einlesen (Dedup prüft `title+artist+relativeTxtPath`) — im Browser-QA
  nicht reproduzierbar, ggf. im Desktop-Build einmal prüfen.
- **BR-Komplexität:** `use-battle-royale-round-handlers.ts` ist groß; bei weiteren
  BR-Änderungen zuerst `onGameCommitted`-Invarianten lesen (Kommentar „2.2").
- **Lint-Warnings:** ~770 prä-existente Warnings (refs during render, non-null assertions
  in socketio-server) — kosmetisch, bei Gelegenheit reduzieren.

### Empfohlene nächste Schritte (Priorität)
1. **Stabilisierung/QA-Runden fortsetzen** (Cron webDevReview alle 15 Min läuft) —
   Fokus: Party-Modi mit Companion-Geräten (Socket.IO), Mobile-Client `/mobile`.
2. **Feature-Ideen** aus `FEATURE_IDEAS.md` prüfen und priorisieren.
3. Optional: Duett-ID-Fix auch in `multi-format-import.ts` vorziehen, falls dort
   jemals Multi-Voice-Support ergänzt wird (Single-Voice heute, kein Handlungsbedarf).

### Nützliche QA-Zugänge
- Editor: Library-Screen → „Editor F10" (oder F10) → „New Song" für 1.3-Flow
- Duett-Test: Settings → Library → UltraStar Import (TXT mit `P1:`/`P2:`-Sektionen)
- Testdateien: `public/qa-test.mp3`, `public/qa-test.txt`, `qa-test-song/`
- QA-Screenshot der Session: `qa-editor-duet.png`

### Umgebung
- Dev-Server: `bun run dev` (Port 3000, läuft im Hintergrund; dev.log beachten)
- Kein `bun run build` in der Sandbox; nur Port 3000 extern
- Socket.IO auf `/socket.io` (gleicher Port); Mini-Services ggf. unter `mini-services/`
  mit `XTransformPort`-Query im Gateway
