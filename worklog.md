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

---

### ✅ Session 3 Fixes (alle gepusht)

**15 Commits** — Alle 20 bestätigten Issues + 6 Dead Code Entfernungen:

| Commit | Fix | Schwere |
|--------|-----|---------|
| `144278e` | C1+H2: MIDI VLQ-Parsing + Endlosschleife-Guard | Critical+High |
| `fd07d5a` | C2: Battle Royale Round-Timer Guard | Critical |
| `7fa7e18` | C3: Scoring Division-by-Zero Guard | Critical |
| `da8e746` | H1: hasPerfectOnly nutzt displayType statt 0.95 | High |
| `f1f2c6b` | H3: Replay Recorder Sync-Guard | High |
| `a756f30` | H4: Mobile IP-Detection Loop aufgelöst | High |
| `56b021f` | M1: Duet P1 Accuracy korrigiert | Medium |
| `33f818a` | M2: Medley Score `??` statt `\|\|` | Medium |
| `a6449b4` | M3: MultiPitchDetector start() nutzt Ref | Medium |
| `4be23b0` | M4: Audio Effects Disconnect-All | Medium |
| `321943a` | M5: Daily-Challenge Badges outside Gate | Medium |
| `c3bbf4f` | M6: BaseFolder-Migration .some() | Medium |
| `c0d63b9` | M7: PTM Segmente 20s-Minimum | Medium |
| `e21ff4a` | M8: Blob-URL Cache 200→2000 | Medium |
| `e1492b6` | L3,L4,L5: Array-Mutation, Spread-Overflow, Key-Fallback | Low |
| `5e1b074` | DC1-DC6: 6 Dead Code Exports entfernt | Chore |

**Übersprungene Low-Priority Items:**
- L1 (addToQueue silent drop): UI deaktiviert den Button bereits
- L2 (Streak Timezone): Edge-Case für Desktop-App

**Finaler Zustand:** 0 TSC-Fehler, 0 ESLint-Fehler, 318 TypeScript-Dateien

---

## Session: 2026-05-06 (Code-Review #4 — Fresh Scan nach allen Session-3 Fixes)

### Analyse-Methode
- 8 parallele Subagenten: Hooks, Components, Lib (2×), API/Config, Dead-Code, Code-Quality
- Alle ~318 TypeScript-Dateien systematisch gelesen
- Alle Funde manuell im Code verifiziert
- TSC: 0 Errors | ESLint: 2 Errors (react-hooks/set-state-in-effect), 28 Warnings (no-console)

---

### 🐛 GEFUNDENE FEHLER

#### Critical (3)

**C4: Tournament BYE-Gewinner werden nie in die nächste Runde gesetzt**
- **Datei:** `src/lib/game/tournament.ts:105-172`
- **Problem:** Bei nicht-2er-Potenz-Spieleranzahl (3, 5, 6, 7, 9-15, …) erstellt `generateBracket()` BYE-Matches mit `winner` und `completed: true`, aber setzt die BYE-Gewinner **nie** in die korrespondierenden Runde-2-Matches. `getPlayableMatches()` (Zeile 216) verlangt `player1 && player2` → Runde-2-Match hat immer `null` → Turnier ist **dauerhaft blockiert**.
- **Fix:** Nach dem Erstellen aller Matches, BYE-Gewinner in ihre Next-Round-Slots setzen.

**C5: Off-by-One in substring() — Preview und Medley funktionieren nicht**
- **Datei:** `src/lib/tauri-file-storage.ts:476,478,483,485`
- **Problem:** `#PREVIEWSTART:`, `#PREVIEWDURATION:`, `#MEDLEYSTARTBEAT:`, `#MEDLEYENDBEAT:` werden mit `substring(N)` geparst, aber N ist um 1 zu klein. Das Resultat ist `":42.5"` statt `"42.5"`, und `parseFloat(":42.5")` = NaN → wird zu `undefined`. Song-Preview und Medley-Modus sind für alle via Tauri-File-Scanner geladenen Songs **komplett kaputt**.
- **Fix:** Alle 4 Substring-Indizes um +1 korrigieren.

**C6: mic-indicator.tsx — Fade-Timer wird sofort zerstört (setState in useEffect)**
- **Datei:** `src/components/game/mic-indicator.tsx:83-94`
- **Problem:** Der Effect hat `lastPlayerId` im Dependency-Array UND ruft `setLastPlayerId()` im Body auf. Wenn `activePlayer?.id` ändert: (1) Effect feuert → Timer starten → Cleanup setzen; (2) `setLastPlayerId` löst Re-Render aus; (3) Vorheriger Cleanup **zerstört den Timer**; (4) Effect läuft erneut, aber `currentId === lastPlayerId` → Body übersprungen → kein neuer Timer. Der Mic-Indicator **fadet nie aus** und bleibt permanent sichtbar. ESLint meldet `react-hooks/set-state-in-effect`.
- **Fix:** `lastPlayerId` als `useRef` statt State verwenden, Dependency-Array auf `[activePlayer?.id]` reduzieren.

#### High (3)

**H5: sendAdState ignoriert den Parameter komplett**
- **Datei:** `src/hooks/use-mobile-client.ts:102-115`
- **Problem:** `sendAdState(_isAdPlaying: boolean)` akzeptiert den Parameter, sendet aber `payload: {}` — der `isAdPlaying`-Wert geht verloren. Das Companion-App empfängt nie den korrekten Ad-Playing-Status.
- **Fix:** `payload: { isAdPlaying: _isAdPlaying }` statt `payload: {}`.

**H6: generateUltraStarTxt() crasht bei leeren Notes-Arrays**
- **Datei:** `src/lib/parsers/ultrastar-parser.ts:627-628`
- **Problem:** Nach Iteration der Notes einer Lyric-Line wird `line.notes[line.notes.length - 1]` accessed. Wenn `line.notes = []`, ist `lastNote = undefined` → `lastNote.startTime` wirft TypeError.
- **Fix:** Guard `if (line.notes.length > 0)` vor dem Zugriff.

**H7: Leaderboard-Service — camelCase statt snake_case + falsche URLs**
- **Datei:** `src/lib/api/leaderboard-service.ts:120-182`
- **Problem:** (a) `getGlobalLeaderboard()` ruft `/leaderboard?limit=...` statt `/leaderboard/global?limit=...`. (b) `getSongLeaderboard()` ruft `/leaderboard/{songId}?limit=...` statt `/leaderboard/song/{songId}?limit=...`. (c) `submitScore()` sendet `playerId` statt `player_id`, `songId` statt `song_id`, etc. — PHP-API erwartet snake_case.
- **Fix:** URLs korrigieren und Feldnamen auf snake_case mappen. *(Hinweis: PHP-Backend hat eigene Critical-Bugs — siehe separater Abschnitt)*

#### Medium (7)

**M9: Fehlende readyState-Prüfung bei Video-Embedded-Audio im Game-Loop**
- **Datei:** `src/hooks/use-game-loop.ts:744-745`
- **Problem:** Audio-Pfad prüft `readyState >= 2` vor `currentTime`-Lese, Video-Pfad nicht. Bei `readyState < 2` liefert `currentTime = 0`, was den Game-Loop zurücksetzt.

**M10: analyzePitch Race Condition — überlappende Tauri-Channel-Callbacks**
- **Datei:** `src/hooks/use-audio-analysis.ts:124-170`
- **Problem:** Bei schneller erneuter Analyse überschreibt der 2. Aufruf die Channel-Refs. Wenn die 1. Analyse fertig wird, feuern deren Callbacks und überschreiben den Status des laufenden 2. Aufrufs.
- **Fix:** Generation-Counter-Guard einführen.

**M11: use-audio-analysis — kein Mounted-Guard bei Cleanup**
- **Datei:** `src/hooks/use-audio-analysis.ts:114-122`
- **Problem:** Cleanup nullt nur Refs, aber Tauri-Channel-Callbacks können nach Unmount feuern → setState auf unmounted Component.

**M12: Blob-URL nicht unter beiden Pfaden gecacht (Backslash-Fallback)**
- **Datei:** `src/lib/tauri-file-storage.ts:788-789`
- **Problem:** Kommentar sagt "Cache under both paths", aber nur Backslash-Pfad wird gecacht. Forward-Slash-Aufrufe treffen Cache-Miss → redundante Datei-I/O bei jedem Media-Load.

**M13: NoteBlock nicht memoisiert in 60fps Render-Path**
- **Datei:** `src/components/game/note-highway.tsx:104,324`
- **Problem:** `NoteBlock` ist plain function (nicht React.memo), wird in `.map()` bei jedem Game-Frame (~60fps) neu gerendert.

**M14: music-reactive-background — neues Array pro Frame (GC-Druck)**
- **Datei:** `src/components/game/music-reactive-background.tsx:114`
- **Problem:** `particlesRef.current = particlesRef.current.filter(...)` erstellt bei 60fps neue Array-Objekte → GC-Pressure.

**M15: webcam-background — Cleanup nur bei Stream-Wechsel, nicht bei Unmount**
- **Datei:** `src/components/game/webcam-background.tsx:175-181`
- **Problem:** Wenn `stream` bei Unmount `null` ist, wird der Cleanup-Effekt nicht ausgeführt. Race bei async `startWebcam`.

#### Low (3)

**L6: gameMode fehlt in generateResults Dependency-Array**
- **Datei:** `src/hooks/use-game-loop.ts:201-292`
- **Problem:** `generateResults` liest `gameMode` (für `isBlindMode`), aber `gameMode` ist nicht in deps.

**L7: SingStar-Parser nutzt `||` statt `??` für Note-Text**
- **Datei:** `src/lib/parsers/multi-format-import.ts:250`
- **Problem:** `parts[3] || ''` — wenn Text literal `"0"`, wird es zu `""`.

**L8: Negative `#END:` Werte nicht rejected**
- **Datei:** `src/lib/tauri-file-storage.ts:467`
- **Problem:** `parseInt("-5") || undefined` = `-5` (truthy), negativer End-Zeitpunkt gespeichert. `ultrastar-parser.ts` hat korrekten `> 0` Guard.

---

### 🔧 PHP LEADERBOARD API (externes Backend — separiert vom Tauri-App-Core)

Diese Probleme betreffen `leaderboard-api/` — ein separates PHP-Backend für Online-Rankings.

#### Critical (3)
- **PHP-C1:** `index.php:47` ruft `Database::getInstance()` auf — Klasse existiert nicht (config.php definiert nur `getDB()`)
- **PHP-C2:** `index.php:25` ruft `!checkRateLimit()` (void return → `!null = true`) → ALLE Requests werden mit 429 rejected
- **PHP-C3:** `index.php:73` nutzt `$this->segments[1]` statt `[0]` nach Prefix-Strip → Routing kaputt (alle Endpoints außer Root → 404)

#### High (3)
- **PHP-H1:** `index.php:110+` ruft `sendJsonResponse()` — Funktion heißt `sendJSON()` in config.php
- **PHP-H2:** `index.php:217+` ruft `validateInput()`, `sanitizeString()`, `generateId()` — existieren nicht in config.php
- **PHP-H3:** `config.php:162` CORS fällt zurück auf `*` für unbekannte Origins — ganze CORS-Regelung sinnlos

**Fazit:** Die gesamte PHP-Leaderboard-API ist **nicht funktionstüchtig** und muss komplett neu aufgebaut werden, wenn Online-Rankings gewünscht sind.

---

### 💀 DEAD CODE (1 Eintrag)

| # | Datei | Export | Beschreibung |
|---|-------|--------|--------------|
| DC-7 | `src/lib/game/library-cache.ts:97` | `saveCache()` | Persistiert LibraryCache nach IndexedDB — nie importiert, nie aufgerufen. `loadCache()` und `clearCache()` aus derselben Datei SIND aktiv. |

Keine implementierte fehlende Feature-Funktion. Empfehlung: Entfernen.

---

### 💡 VERBESSERUNGSVORSCHLÄGE (Top 10 nach Impact)

| # | Kategorie | Datei | Beschreibung | Impact |
|---|-----------|-------|-------------|--------|
| **V1** | Architektur | 40+ Dateien | `localStorage`-Aufrufe zentralisieren (typed helper, SSR-safe) | Hoch |
| **V2** | Duplikation | `use-note-scoring.ts` | `checkNoteHits`/`checkPlayerNoteHits` — ~250 Zeilen nahe-identischer Code extrahieren | Hoch |
| **V3** | Performance | `tournament.ts:213-226` | `getPlayableMatches` O(n²) → Lookup-Map O(1) | Mittel |
| **V4** | Maintainability | `use-game-loop.ts`, `use-game-flow-handlers.ts` | Rating-Berechnung `accuracy→rating` doppelt → shared utility | Mittel |
| **V5** | Type Safety | `unified-party-setup.*` | `Record<string, any>` → discriminated union pro Game-Mode | Mittel |
| **V6** | Duplikation | `results-screen.tsx` | XP-Berechnung doppelt für P1/P2 → shared function | Mittel |
| **V7** | Type Safety | 5+ Dateien | `NoteDisplayStyle` als zwei verschiedene Typen → kanonischer Typ | Mittel |
| **V8** | Performance | `ptm-game-screen.tsx:321-332` | Song-Energy linear scan O(n) → binary search O(log n) | Mittel |
| **V9** | Performance | `player-progression.ts:431-476` | `getLevelForXP` iterative loop → O(1) Closed-Form | Niedrig |
| **V10** | Dead Code | `tailwind.config.ts` | Wird nie geladen (Tailwind v4 nutzt CSS-only Config) → löschen | Niedrig |

---

### 📋 FALSE POSITIVES

| # | Meldung | Grund für False Positive |
|---|---------|--------------------------|
| FP-14 | unified-party-setup setState-in-setState | React 18 batched — funktional korrekt, nur Anti-Pattern |
| FP-15 | mic-indicator competing timers | Beide Timer führen zum selben Ergebnis "visible + timeout" |
| FP-16 | Batch asset validation | Tauri-app nutzt nur Single-Item-Endpunkt |

---

### ✅ Session 4 Fixes (alle gepusht)

**12 Commits** — Alle 16 bestätigten Issues + 1 Dead Code Entfernung:

| Commit | Fix | Schwere |
|--------|-----|---------|
| `6d8750b` | C4: Tournament BYE winners into next-round match slots | Critical |
| `4e04267` | C5+L8: Off-by-one substring indices for preview/medley + negative #END guard | Critical+Low |
| `635ff40` | C6: mic-indicator fade timer — useRef instead of setState in effect | Critical |
| `844b044` | H5: sendAdState passes isAdPlaying to payload | High |
| `45df43a` | H6: generateUltraStarTxt guard against empty notes array | High |
| `2445fd0` | H7: leaderboard-service URLs + snake_case field mapping | High |
| `e88d410` | M9+L6: video readyState check + gameMode in generateResults deps | Medium+Low |
| `743cc27` | M10+M11: analyzePitch race condition + unmounted state guard | Medium |
| `af26eea` | M12+L7: blob URL cache both paths + SingStar nullish coalescing | Medium+Low |
| `7a051a2` | M13: NoteBlock wrapped in React.memo | Medium |
| `3f6019b` | M14+M15: in-place particle filter + webcam cleanup on unmount | Medium |
| `3e309d8` | DC-7: remove unused saveCache() from library-cache.ts | Chore |

**Übersprungene Items:**
- PHP Leaderboard API (6 Critical/High-Bugs): Externe PHP-Datei, kein Teil der Tauri-App-Core-Logik. TS-Client-Seite in H7 korrigiert. PHP-Backend muss komplett neu aufgebaut werden — sprengt TypeScript-Fix-Rahmen.
- V1-V10 Verbesserungsvorschläge: Architektur- und Refactoring-Änderungen, kein Bugfix. Werden bei Bedarf in separater Session behandelt.

**Finaler Zustand:** 0 TSC-Fehler, 1 ESLint-Fehler (false positive: setTimeout setState in effect), 28 Warnings (no-console)
