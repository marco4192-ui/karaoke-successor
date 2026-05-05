# Zusammenfassung aller unbehandelten Punkte aus allen Review-Sessions

**Erstellt:** 2026-05-05
**Status:** Zu bearbeiten

---

## A) Aus worklog-cycle3.md — Quality-Items (Übersprungen)

### Q1: Duplizierte UltraStar TXT-Parser
- **Quelle:** 3 ähnliche TXT-Parser in ultrastar-parser.ts, song-lyrics-loader.ts, tauri-file-storage.ts
- **Begründung (übersprungen):** Verschiedene Use-Cases (Import/Konvertierung, Runtime-Laden, Tauri-Scanning)
- **Aktion:** Prüfen ob sinnvoll konsolidierbar, ggf. Teilfunktionen extrahieren

### Q2: Duplizierte Timing-Data-Berechnung
- **Begründung (übersprungen):** Riskante Refaktorierung
- **Aktion:** Analysieren, prüfen ob Konsolidierung möglich ohne Funktionsverlust

### Q3: Duplizierte Client-Cleanup-Logik
- **Begründung (übersprungen):** Riskante Refaktorierung
- **Aktion:** Analysieren und konsolidieren wo möglich

### Q4: audio-effects.ts GainNode Leak
- **Begründung (übersprungen):** Benötigt tiefere Analyse
- **Aktion:** GainNode-Leak identifizieren und beheben

### Q5: IMMERSIVE_SCREENS fehlen
- **Begründung (übersprungen):** UI-Erweiterung
- **Aktion:** Prüfen was gemeint ist und ob implementierbar

### Q6: MicrophoneManager non-standard Constraints
- **Begründung (übersprungen):** Tauri-spezifisch
- **Aktion:** Prüfen ob Constraints kompatibel mit Tauri sind

### Q9: Duplizierte Medley-Snippet-Erzeugung
- **Begründung (übersprungen):** Riskante Refaktorierung
- **Aktion:** Analysieren und konsolidieren wo möglich

### Q12: Duplizierter Pause/Stop-Button
- **Begründung (übersprungen):** UI-Analyse nötig
- **Aktion:** Prüfen und ggf. deduplizieren

### Q15: Editor songs-Liste Refresh
- **Begründung (übersprungen):** Feature-Implementierung
- **Aktion:** Implementieren — Editor soll Songliste nach Änderungen aktualisieren

### Q18: PitchGraph Canvas-Resolution
- **Begründung (übersprungen):** Feature-Implementierung
- **Aktion:** Canvas-Resolution für PitchGraph verbessern (HiDPI-Unterstützung)

### D13: Leeres sampleSongs-Array
- **Begründung (übersprungen):** Harmlos
- **Aktion:** Prüfen ob Array mit Daten befüllt werden sollte

---

## B) Aus worklog.md (Haupt-Worklog) — Deferred Items

### T-M3: P2-Scoring Batching
- **Begründung (deferred):** Würde architektonische Änderung erfordern
- **Aktion:** Prüfen ob Scoring-Updates gebatcht werden können

### T-M6: useMultiPitchDetector Re-Init
- **Begründung (deferred):** Aktuelles Verhalten akzeptabel für Tauri
- **Aktion:** Prüfen ob Re-Init bei Konfigurationswechsel nötig

### R-M2/M3: Stille Fehler in Charts
- **Begründung (deferred):** Error handling ist absichtlich
- **Aktion:** Prüfen ob silent errors sinnvoll sind oder Logging hinzugefügt werden sollte

### R-M6: Hardcoded Port 3000
- **Begründung (deferred):** Next.js Default, Tauri überschreibt
- **Aktion:** Prüfen ob tatsächlich Tauri-Only und kein Problem

### R-M7: Server Kill
- **Begründung (deferred):** Von Tauri Lifecycle gehandhabt
- **Aktion:** Bestätigen

---

## C) Aus worklog-review4.md — Known Limitations

### pitch_shift Challenge Mode
- **Beschreibung:** Requires Web Audio API real-time pitch shifting (audio time-stretch + transpose)
- **Aktion:** Komplex — Web Audio API Pitch Shifting implementieren oder als NOT IMPLEMENTED markieren

### UNENTSCHIEDEN hardcoded string
- **Datei:** results-screen.tsx Zeile 561
- **Beschreibung:** "UNENTSCHIEDEN" sollte t('draw') für i18n nutzen
- **Aktion:** i18n implementieren

---

## D) Aus worklog-review5.md — Deferred

### V-4: i18n für editor-screen.tsx
- **Beschreibung:** ~20 hartcodierte deutsche Strings × 16 Sprachen
- **Aktion:** i18n für Editor-Screen implementieren

---

## E) Aus review-session-worklog.md / worklog-review2.md — Übersprungen

### Verbesserung 4: Doppelte Mobile-Typen
- **Beschreibung:** MobileProfile, QueueItem, GameResults, PitchData, GameState doppelt definiert
- **Begründung (übersprungen):** Verschiedene Schichten (Server-API vs Client-UI) mit strukturell verschiedenen Shapes
- **Aktion:** Nochmals prüfen ob Typen konsolidierbar sind

### Verbesserung 6: UltraStar TXT Parsing Duplikation
- **Beschreibung:** Gleich wie Q1 — 3 ähnliche TXT-Parser
- **Aktion:** Gleich wie Q1
