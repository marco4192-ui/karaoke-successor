# Code Review — Fresh Review #2

**Datum:** 2026-04-30  
**Repo:** karaoke-successor  
**Branch:** origin/master  
**Stand:** Commit 89a6a6f

---

## Zusammenfassung

Vorherige Session: 68 Punkte (B1-B19, L1-L11, D1-D13, Q1-Q20) umgesetzt.
Diese Session: 7 neue reale Mängel gefunden (B1-B7).

---

## Gefundene Punkte

### B1: `applyPreset()` awaited `applyAllSettings()` nicht — Reverb-Impulse Race Condition
- **Datei:** `src/lib/audio/audio-effects.ts`
- **Beschreibung:** `applyPreset()` ruft `this.applyAllSettings()` auf, welches `async` ist (enthält `await createReverbImpulse()`), aber das Ergebnis wird nicht awaited. Dadurch wird `connectEffectChain()` aufgerufen, bevor der Reverb-Impulse-Puffer fertig generiert ist. Der ConvolverNode hat einen leeren oder veralteten Buffer, wenn Audio hindurchfließt.
- **Fix:** `applyPreset` zu `async` machen und `applyAllSettings()` awaiten.

### B2: `setReverb()` awaited `createReverbImpulse()` nicht bei Decay-Änderung
- **Datei:** `src/lib/audio/audio-effects.ts`
- **Beschreibung:** Wenn `setReverb(amount, decay)` mit neuem Decay aufgerufen wird, wird `this.createReverbImpulse()` aufgerufen ohne await. Der Convolver-Buffer wird asynchron aktualisiert, aber `connectEffectChain()` wird danach nicht aufgerufen.
- **Fix:** `setReverb` zu `async` machen, `createReverbImpulse()` awaiten, dann Effect Chain neu verbinden.

### B3: P2-Pitch-Result verwendet P1s `clarity`-Wert
- **Datei:** `src/hooks/use-game-loop.ts`, Zeile 727
- **Beschreibung:** Bei der Konstruktion des P2-Pitch-Ergebnisses: `clarity: currentPitch?.clarity ?? 0`. `currentPitch` ist `pitchResultRef.current` (P1s Pitch-Erkennung). P2s clarity sollte unabhängig sein.
- **Fix:** Standardmäßig 0.7 als clarity für P2 verwenden (da VocalDetector nicht für P2 läuft), oder P2s eigene clarity separately tracken.

### B4: Golden-Note-Multiplikator definiert aber nie angewendet im Scoring
- **Datei:** `src/lib/game/scoring.ts`
- **Beschreibung:** `PERFECT_GOLDEN_MULTIPLIER = 10` ist definiert, wird aber nie verwendet. `calculateTickPoints()` hat den Parameter `_isGolden`, der komplett ignoriert wird. Goldene Noten punkten aktuell identisch zu normalen Noten.
- **Fix:** Den Multiplikator in `calculateTickPoints` anwenden.

### B5: `goodNotes`-Berechnung in `results-screen.tsx` ist semantisch falsch
- **Datei:** `src/components/screens/results-screen.tsx`, Zeile 378
- **Beschreibung:** `const goodNotes = Math.max(0, playerResult.notesHit - perfectNotes - (playerResult.notesMissed ?? 0))`. Hier werden `notesMissed` von `notesHit` abgezogen, was mathematisch keinen Sinn ergibt (hit und missed sind unabhängige Zählungen).
- **Beispiel:** 100 Noten, 80 getroffen, 20 verfehlt, 40 perfect: `goodNotes = 80 - 40 - 20 = 20`. Korrekt wäre `80 - 40 = 40`.
- **Fix:** `const goodNotes = Math.max(0, playerResult.notesHit - perfectNotes);`

### B6: `checkTitleUnlocks` nutzt `totalSessions` statt tatsächlich gespielter Songs
- **Datei:** `src/lib/game/player-progression.ts`, Zeile 774
- **Beschreibung:** `checkTitleUnlocks(stats, gameData, newLevel, stats.totalSessions)` übergibt `totalSessions` als `totalSongs`-Parameter. Eine "Session" umfasst aber das Öffnen der App, nicht das Abschließen eines Songs. Dadurch werden Titel-basierte Achievements zu früh freigeschaltet.
- **Fix:** Einen eigenen `songsCompleted`-Zähler in den Extended Stats tracken und diesen verwenden.

### B7: Competitive-Modus Bonus-Funktionen sind Dead Code — nie aufgerufen
- **Datei:** `src/lib/game/competitive-words-blind.ts`
- **Beschreibung:** `calculateMissingWordsBonus()` und `calculateBlindBonus()` sind definiert, werden aber nie während des Spielablaufs aufgerufen. Während kompetitiven Spielen werden Bonus-Punkte für versteckte Wörter/Blind-Sektionen niemals berechnet oder zu den Scores addiert. `CompetitiveRound.player1Bonus` und `player2Bonus` sind immer 0.
- **Fix:** Die Bonus-Berechnung in den kompetitiven Spiel-Flow integrieren (z.B. im Game-Loop-Ende oder Results-Screen).

---

## Umsetzungs-Log

( wird nach jedem Punkt aktualisiert )
