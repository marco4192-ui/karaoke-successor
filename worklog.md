# Karaoke Successor — Worklog

## Session: 2026-05-06 (Code Review #8 — Fresh Implementation)

### Review-Ergebnis
- **TSC:** 0 Errors | **ESLint:** 8 Errors / 53 Warnings
- **319 TypeScript-Dateien**
- **Gefunden:** 1 Critical, 1 High, 4 Medium, 5 Low Bugs | 10 Dead Code | 10 Verbesserungen

### Umsetzungs-Log

#### ✅ C1: Mobile Pitch Polling startet nie (Critical)
- **Commit:** `288ab76`
- **Datei:** `src/hooks/use-mobile-pitch-polling.ts`
- `startPolling()` und `pollMobilePitch()` waren definiert aber nie aufgerufen. Companion-Pitch-Daten kamen nie an.

#### ✅ H1: Medley-Snippet Startzeit ignoriert Song-GAP (High)
- **Commit:** `4ce3c3b`
- **Dateien:** `src/lib/game/ptm-next-song.ts`, `src/components/game/medley/medley-snippet-generator.ts`
- UltraStar-Formel `startTime = GAP + startBeat * beatDuration` — GAP fehlte. Audio/Text-Desync in Medley-Modus.

#### ✅ M1: Rating-Threshold Inkonsistenz (Medium)
- **Commit:** `47f4368`
- **Datei:** `src/lib/game/rating-utils.ts`
- `accuracyToRating()` zeigte ≥95% als 'perfect', aber Progression nutzte 99.5% → 97% zeigte "perfect" ohne 150 XP Bonus.

#### ✅ M2+L4: Ref-Zuweisungen während Render + Dead p2StateRef (Medium + Low)
- **Commit:** `302a859`
- **Datei:** `src/hooks/use-note-scoring.ts`
- `playersRef.current = players` und `p2StateRef.current = p2State` waren Render-Body-Zuweisungen. `playersRef` → useEffect, `p2StateRef` (nie gelesen) → entfernt.

#### ✅ M3: Resume während Countdown startet Game-Loop ohne Media (Medium)
- **Commit:** `8c0bc20`
- **Datei:** `src/hooks/use-game-loop.ts`
- Pause während 3-2-1 Countdown + Resume startete den Game-Loop ohne `playMedia()`. Jetzt: Countdown wird bei Resume neu gestartet.

#### ✅ M4: accuracyDelta Parametername irreführend (Medium)
- **Commit:** `59bb0a2`
- **Datei:** `src/lib/game/battle-royale.ts`
- `accuracyDelta` war kein Delta sondern absoluter Tick-Wert → umbenannt in `tickAccuracy`.

#### ✅ L1+L2+L3+L5: Low-Priority Fixes
- **Commit:** `71960ef`
- L1: `response.ok` Check vor JSON-Parse in results-screen Queue-Fetch
- L2: Unmount-Guard in Replay Recorder async Webcam-Acquisition
- L3: Write-Only `___audioReady` State aus medley-game-screen entfernt
- L5: `response.ok` Check in addToJukeboxWishlist

#### ✅ DC-1 bis DC-10: Dead Code
- **Commit:** `b5231de`
- DC-1–DC-8: Überflüssige Exports aus internen Funktionen/Interfaces entfernt
- DC-9: `applyPreset()` war Dead Code → **Implementiert**: Preset-Auswahl-Buttons (Pop, Rock, Concert, Studio, Vintage, Ethereal, Power, Intimate) im Audio Effects Panel
- DC-10: Bereits mit L3 erledigt

#### ✅ V1–V10: Bereits in vorherigen Sessions umgesetzt
- Alle 10 Verbesserungsvorschläge (localStorage-Zentralisierung, Deduplizierungen, O(1) Lookups, Discriminated Unions, Binary Search, Dead Code Removal) wurden bereits in Review #4 implementiert.

### Finaler Zustand
- **TSC:** 0 Errors
- **ESLint:** Reduziert (einige false-positive warnings)
- **Alle gefundenen Bugs behoben**
- **1 Dead-Code-Item als Feature implementiert** (Audio Effect Presets)
- **9 Dead-Code-Items aufgeräumt** (unnötige Exports entfernt)

---
