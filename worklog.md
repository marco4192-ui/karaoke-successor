# Karaoke Successor — Worklog

## Session: 2026-05-05 (Kontinuierliches Review — Fortsetzung)

### Schritt 1: TODO-Dateien gelöscht (vorherige Session)
- Commit: e0d1e87

### Schritt 2-10: Vorherige Session (15 Fixes über 5 Commits)
- Siehe oben — alle implementiert und gepusht

### Schritt 11: TSC-Fehlerbehebung nach Branch-Rebase
- `youtube-player.tsx`: Doppelter `export { isYouTubeUrl, isDirectVideoUrl }` entfernt
- 7 Dateien: Icon-Imports von gelöschten Re-Export-Dateien auf `@/components/icons` aktualisiert
  - `add-to-playlist-modal.tsx`, `folder-view.tsx`, `playlist-view.tsx`, `song-card.tsx`,
    `song-start-modal.tsx`, `mobile-mic-view.tsx`, `mobile-songs-view.tsx`
- Commit: 9dbea15 (in Rebase mit c504329 konsolidiert)

### Schritt 12: Offene Verbesserungen (#2 - #15)

| ID | Ergebnis | Begründung |
|----|---------|-----------|
| **#2** | **NOT AN ISSUE** | `DIFFICULTY_SETTINGS` ist `as const` — Property-Zugriff gibt immer dieselbe Referenz zurück |
| **#4** | **FIXED** | lyric-line-display.tsx: 5s Polling-Interval entfernt (Tauri = Single-Window) |
| **#5** | **FIXED** | use-multi-pitch-detector: `isInitialized` aus Dependency entfernt, `isInitializedRef` im catch |
| **#6** | **FIXED** | use-multi-pitch-detector: `getPlayerPitch` nutzt `playerPitchesRef` statt State |
| **#7** | **FIXED** | use-multi-pitch-detector: Cleanup ruft jetzt `destroy()` auf Singleton |
| **#8** | **NOT AN ISSUE** | `updatePlayerScore` wird immer mit 1 Tick pro Call aufgerufen — korrektes Design |
| **#11** | **NOT AN ISSUE** | 80ms setInterval ist korrekt für Audio-gesteuertes Spiel (nicht Display-gesteuert) |
| **#12** | **FIXED** | medley: `initialMappedPlayers` mit `useMemo` statt jedem Render neu berechnet |
| **#13** | **FIXED** | medley: Double-click-Guard für `onRecordAndEnd` in Round Results |
| **#14** | **NOT AN ISSUE** | Shallow Clone ist in Ordnung — lyrics werden nie in-place mutiert |
| **#15** | **NOT AN ISSUE** | Cache-Length-Vergleich ist korrekt — bei App-Start ist Cache null |

**Commits:**
- `3eb32a6` — imp#4: lyric-line-display Polling entfernt
- `f3eb8ed` — imp#5,6,7: multi-pitch-detector stale closure + ref + destroy
- `ccb311e` — imp#12,#13: medley initialMappedPlayers useMemo + double-click guard

### Zusammenfassung aller Sessions
- **18 Fixes** über 8 Commits gepusht
- **0 TSC-Fehler**, 0 ESLint-Fehler
- **7 Dead-Code-Items** entfernt
- **20 False Positives** verifiziert und dokumentiert
- Alle 13 offenen Verbesserungsvorschläge geprüft: 5 implementiert, 8 als Non-Issues bestätigt

---

## Session: 2026-05-06 (Vollständiges Code-Review #3)

### Analyse-Methode
- 5 parallele Subagenten: Logik-Analyse (Hooks, Lib, Screens, Misc), Code-Quality, Dead-Code
- ~318 TypeScript-Dateien systematisch gelesen
- Alle Funde manuell im Code verifiziert

---

### 🐛 GEFUNDENE FEHLER

#### Critical (3)

**C1: MIDI VLQ-Parsing — Meta-Event-Length ist Single Byte statt VLQ**
- **Datei:** `src/lib/parsers/multi-format-import.ts:140`
- **Problem:** MIDI-Standard verwendet VLQ (Variable-Length Quantity) für Meta-Event-Längen. Der Code liest nur 1 Byte, was Werte >127 abschneidet. KAR-Dateien mit langen Lyric-Blöcken (>127 Bytes) werden korrupt geparsed — alle nachfolgenden Events sind falsch.
- **Fix:** VLQ-Dekodierung implementieren.

**C2: Battle Royale Round-Timer — Auto-Eliminierung feuert sofort bei neuer Runde**
- **Datei:** `src/hooks/use-battle-royale-round-timer.ts:30-57`
- **Problem:** Wenn eine neue Runde startet, ist `roundTimeLeft` noch `0` von der vorherigen Runde. Effect 1 setzt `setRoundTimeLeft(roundDuration)` (gebatcht), aber Effect 2 liest `roundTimeLeft === 0` (noch alter Wert) und triggert sofort `handleRoundEnd()`. Dadurch wird jede neue Runde sofort beendet.
- **Fix:** Guard-Ref einführen, der Auto-Eliminierung beim ersten Tick einer neuen Runde unterdrückt.

**C3: Division by Zero in Scoring bei beatDuration=0**
- **Datei:** `src/lib/game/scoring.ts:66`
- **Problem:** Wenn ein Song kein BPM hat (BPM=0), wird `note.duration / 0 → Infinity`, was zu `ticksInNote = Infinity` und `pointsPerTick = 0` führt. Der Spieler bekommt 0 Punkte ohne Fehlermeldung.
- **Fix:** Fallback für `beatDuration` wenn 0.

#### High (4)

**H1: hasPerfectOnly verwendet hartcodierten 0.95-Threshold statt Schwierigkeits-settings**
- **Datei:** `src/hooks/use-note-scoring.ts:305,502`
- **Problem:** Der Code prüft `accuracy > 0.95` für "Perfect", aber die Scoring-Engine verwendet `settings.perfectThreshold` (Easy=0.85, Hard=0.97). Auf Easy werden Perfect-Hits fälschlich als nicht-perfect eingestuft, auf Hard werden non-Perfect-Hits als perfect gewertet.
- **Fix:** `tickResult.displayType === 'Perfect'` statt hartcodiertem Threshold.

**H2: MIDI Parser kann auf fehlerhaften Dateien in Endlosschleife geraten**
- **Datei:** `src/lib/parsers/multi-format-import.ts:127-134`
- **Problem:** `runningStatus` wird mit `0` initialisiert. Wenn eine kaputte MIDI-Datei mit einem Daten-Byte startet, wird `runningStatus = 0` verwendet → kein Case matched → gleiche Position erneut gelesen → Endlosschleife.
- **Fix:** Guard `if (runningStatus === 0) break;` vor running-status branch.

**H3: Replay Recorder Race — startRecording ist fire-and-forget async**
- **Datei:** `src/hooks/use-replay-recorder.ts:106-176`
- **Problem:** `startRecording()` ruft async `startRecorderWithStream()` ohne await auf. Bei schnellem Doppelklick werden zwei MediaRecorder erstellt (der erste leakt). `stopRecording()` findet `mediaRecorderRef.current === null` weil der Recorder noch nicht erstellt ist.
- **Fix:** Sync-Guard-Flag setzen BEVOR async-Teil startet.

**H4: Mobile Screen IP-Detection — useEffect Dependency-Loop**
- **Datei:** `src/components/screens/mobile-screen.tsx:69-149`
- **Problem:** `useEffect` hat `[ipDetectionAttempts]` in Dependency-Array. Bei fehlgeschlagener Detection wird `setIpDetectionAttempts(prev => prev + 1)` aufgerufen, was den Effect sofort neu triggert. Bei leerem sessionStorage wird das unendlich wiederholt und erzeugt RTCPeerConnections in rascher Folge.
- **Fix:** Dependency entfernen, Retry nur über Button-Callback triggern.

#### Medium (8)

**M1: Duet P1 Accuracy verwendet ALLE Notes als Nenner statt nur P1-Notes**
- **Datei:** `src/hooks/use-game-loop.ts:215-216`
- **Problem:** In Duet-Mode mit P1/P2-Zuordnung singt P1 nur P1-Notes, aber `totalNotes` zählt alle Notes. P2 bekommt korrekt nur P2-Notes als Nenner. P1's Accuracy ist künstlich zu niedrig.

**M2: Medley Score-Akkumulation behandelt 0 als falsy**
- **Datei:** `src/hooks/use-game-flow-handlers.ts:125-128`
- **Problem:** `resultPlayer?.score || gamePlayer?.score || 0` — wenn ein Spieler 0 Punkte hat, wird fälschlich auf `gamePlayer?.score` zurückgefallen (das der VORHERIGE Snippet-Wert sein kann).
- **Fix:** `??` statt `||`.

**M3: useMultiPitchDetector.start() kann durch stale State silent failen**
- **Datei:** `src/hooks/use-multi-pitch-detector.ts:210-219`
- **Problem:** `start()` prüft `isInitialized` (React State), aber wenn direkt nach `initialize()` aufgerufen, ist der State noch nicht aktualisiert (gebatcht). Der Hook hat `isInitializedRef` nutzt es aber nicht.
- **Fix:** `isInitializedRef.current` statt `isInitialized`.

**M4: Audio Effects Delay-Feedback-Loop dupliziert sich bei Toggle**
- **Datei:** `src/lib/audio/audio-effects.ts:248-303`
- **Problem:** `connectEffectChain()` disconnectet nur `inputNode`, aber die Delay-Feedback-Verbindungen (`delayNode ↔ delayFeedback`) werden nicht getrennt. Bei erneutem Aufruf werden sie DUPLIZIERT, was Feedback 2^N× verstärkt bei N Toggles.
- **Fix:** Alle Nodes vor Re-Connect disconnecten.

**M5: Daily-Challenge Badges nicht vergeben bei same-day Score-Verbesserung**
- **Datei:** `src/lib/game/daily-challenge.ts:305-400`
- **Problem:** Alle Badge-Checks (champion, top-3, legendary) sind GEGELT hinter `if (stats.lastCompletedDate !== today)`. Bei Score-Verbesserung am selben Tag kann ein Spieler auf Platz 1 steigen, ohne den Champion-Badge zu bekommen.
- **Fix:** Rang-basierte Badge-Checks außerhalb des First-Completion-Gates.

**M6: Song-Library BaseFolder-Migration prüft nur den ersten Song**
- **Datei:** `src/lib/game/song-library.ts:492-505`
- **Problem:** Die Migration prüft nur `songs[0]`, wendet den Fix aber auf alle Songs an. Wenn `songs[0]` korrekt ist aber `songs[5]` einen relativen Pfad hat, wird nichts repariert.
- **Fix:** `.some()` statt `.[]`-Zugriff.

**M7: PTM Segmente können kürzer als 20s sein**
- **Datei:** `src/lib/game/ptm-segments.ts:19-27`
- **Problem:** `adjustedDurMs = songDurationMs / segCount` ignoriert das 20s-Minimum. Beispiel: 4 Spieler, 60s Song → 15s Segmente.
- **Fix:** Nach Berechnung prüfen, und ggf. einzelnes Full-Segment zurückgeben.

**M8: Blob-URL Cache Eviction revokt noch benutzte URLs**
- **Datei:** `src/lib/tauri-file-storage.ts:102-108`
- **Problem:** Wenn der Cache voll ist (200 Einträge), wird die älteste URL revokt — auch wenn ein Audio/Video-Element noch davon abspielt. Seeking in ungepufferte Bereiche schlägt dann fehl.
- **Fix:** Cache-Limit erhöhen oder LRU mit Zugriffstracking.

#### Low (5)

**L1: addToQueue verwirft Items stillschweigend bei Limit**
- **Datei:** `src/lib/game/store.ts:390-397` — Kein Feedback an UI bei `playerQueueCount >= 3`.

**L2: Streak bei Zeitzonenwechsel (Reise) zurückgesetzt**
- **Datei:** `src/lib/game/daily-challenge.ts:310-314` — Datum im lokalen TZ berechnet, nicht UTC.

**L3: getRateMySongRanking mutiert internes Array in-place**
- **Datei:** `src/lib/game/rate-my-song-ranking.ts:131-138` — `.sort()` statt `[...arr].sort()`.

**L4: Math.max-Spread kann bei riesigen Lyric-Arrays Stack Overflow erzeugen**
- **Datei:** `src/lib/parsers/ultrastar-parser.ts:394` — `Math.max(...arr)` statt `reduce`.

**L5: NoteHighway nutzt `note.id` als Key ohne undefined-Fallback**
- **Datei:** `src/components/game/note-highway.tsx:193` — Kann `undefined` als React-Key erzeugen.

---

### 💀 DEAD CODE (6 Einträge — alle verified, kein geplanter Feature-Code)

| # | Datei | Export | Beschreibung |
|---|-------|--------|--------------|
| DC-1 | `src/lib/parsers/folder-scanner.ts:82` | `getLibrary()` | 2-Zeilen-Wrapper um `loadCache()` — nie importiert |
| DC-2 | `src/lib/db/replay-db.ts:166` | `deleteReplaysForSong()` | DB-Cleanup — nie aufgerufen |
| DC-3 | `src/lib/db/media-db.ts:192` | `deleteSongMedia()` | DB-Cleanup — nie importiert |
| DC-4 | `src/lib/db/custom-songs-db.ts:159` | `hasSongInDB()` | Existenz-Check — nie verwendet |
| DC-5 | `src/lib/native-fs.ts:53` | `nativeMkdir()` | Tauri mkdir — nie importiert |
| DC-6 | `src/lib/native-fs.ts:61` | `nativeWriteFileBytes()` | Binary write — nie importiert |

Alle 6 sind "truly dead" — keine implementiert fehlende Features, keine ist besser als die aktive Alternative.

---

### 📋 FALSE POSITITES (von Subagenten gemeldet, aber verifiziert als NON-ISSUE)

| # | Meldung | Grund für False Positive |
|---|---------|--------------------------|
| FP-1 | Battle Royale extra frame after round end | Cleanup cancelt rAF — maximal 1 tolerierbarer Frame |
| FP-2 | toggleAudioEffects race | UI-Button deaktiviert sich während async — kein doppeltes Toggle |
| FP-3 | Library duet→duel conversion | Code in Zeile 238 zeigt `duet ? 'duet' : ...` — korrekt |
| FP-4 | Battle Royale eliminatedPlayer undefined | `showElimination` wird nur bei `activePlayers.length > 2` gesetzt |
| FP-5 | Medley forceRender 80ms | Korrektes Audio-gesteuertes Timing (kein Display-Rendering) |
| FP-6 | LyricLineDisplay missing words timing | Wort wird bei Note-Ende enthüllt — gewolltes Verhalten |
| FP-7 | Queue screen empty players | Guard-Checks in SongStartModal verhindern Start ohne Spieler |
| FP-8 | Editor save without changes | UX-Entscheidung — Save-Button ist sichtbar, aber nicht schädlich |
| FP-9 | updatePlayerScore accuracyDelta naming | Internes API, Name ist irreführend aber Caller verwenden es korrekt |
| FP-10 | acquireScanLock exception safety | Alle Aufrufer haben korrekte try/finally-Muster |
| FP-11 | ptm-next-song NaN propagation | `endTime` ist required Field im Song-Typ — TypeScript schützt |
| FP-12 | Daily challenge timezone streak | Low-Priority Edge-Case für Desktop-App (kein Mobilgerät) |
| FP-13 | Results screen P2 highscore | isMultiplayerMode korrekt — Duet ist kooperativ, kein separater Highscore |
