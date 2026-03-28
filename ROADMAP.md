# Karaoke Successor - Entwicklungs-Roadmap

**Stand:** März 2026 | **Version:** 0.2.1

---

## 📊 Projekt-Status Übersicht

| Bereich | Status | Priorität |
|---------|--------|-----------|
| Core-Features (Singen, Scoring) | ✅ Stabil | - |
| Unit-Tests | ✅ 159 Tests (72.98% Coverage) | - |
| E2E-Tests | ✅ 10 Tests | - |
| TypeScript/ESLint | ✅ 0 Fehler | - |
| Online Leaderboard Frontend | ✅ Implementiert | - |
| Error Boundaries | ✅ Implementiert | - |
| Party-Modi | ⚠️ Teilweise unvollständig | Hoch |
| Online-Multiplayer | ⚠️ Frontend unvollständig | Hoch |
| Multi-Mikrofon | ❌ Nicht implementiert | Mittel |

---

## 🔴 PRIORITÄT 1: Kritische Fixes

### 1.1 Online Multiplayer Frontend vervollständigen
**Problem:** `online-multiplayer-screen.tsx` zeigt nur "Singing in Progress" statt echtem Gameplay

**Aufwand:** 8-12 Stunden

**Tasks:**
- [ ] Note Highway Rendering für Online-Modus integrieren
- [ ] Game-Loop mit Server-Synchronisation implementieren
- [ ] Latency-Kompensation für Netzwerk-Verzögerung
- [ ] Reconnection-Handling bei Verbindungsabbruch
- [ ] Spectator-Modus für Zuschauer

### 1.2 Party-Modi verifizieren und reparieren
**Problem:** Einige Modi leiten nur zur Library ohne korrekte Initialisierung

**Betroffene Modi:**
- `pass-the-mic` → Keine dedizierte Screen
- `companion-singalong` → Nur Setup, kein Game-Loop
- `medley` → Nicht funktional
- `missing-words` → Nicht implementiert
- `blind` → Nicht implementiert

**Aufwand:** 6-8 Stunden

**Tasks:**
- [ ] Jeden Modus testen und dokumentieren
- [ ] Fehlende Screens implementieren
- [ ] Modus-spezifische Game-Logik implementieren

---

## 🟡 PRIORITÄT 2: Wichtige Verbesserungen

### 2.1 Multi-Mikrofon-Support für Duet-Modus
**Problem:** Beide Spieler nutzen dasselbe Mikrofon-Eingabe

**Lösung:** `PitchDetectorManager` existiert bereits, muss in UI integriert werden

**Aufwand:** 4-6 Stunden

**Tasks:**
- [ ] Mikrofon-Auswahl-UI für P1/P2
- [ ] Separate Pitch-Detection für beide Spieler
- [ ] Harmony-Erkennung mit zwei Inputs
- [ ] Separate Scoring-Anzeige pro Spieler

### 2.2 Timing-Offset Persistenz
**Problem:** Timing-Offset wird nicht gespeichert

**Aufwand:** 1-2 Stunden

**Tasks:**
- [ ] `timingOffset` in Song-Metadaten speichern
- [ ] Bei Song-Start laden und anwenden
- [ ] UI zum Anpassen während des Spiels

### 2.3 Online Leaderboard Frontend ✅ ERLEDIGT
**Status:** Implementiert mit folgenden Features:
- Globale Rangliste UI
- Per-Song Leaderboard mit Song-Auswahl
- Spieler-Detail-Modal mit Statistiken
- Suchfunktion für Spieler
- Privacy-Settings Integration (Show on Leaderboard, Show Photo, Show Country)
- Länder-Flaggen-Support für 20+ Länder

**Aufwand:** 4-6 Stunden (erledigt)

---

## 🟢 PRIORITÄT 3: Code-Qualität & Wartbarkeit

### 3.1 Unbenutzte Module aufräumen ✅ ERLEDIGT
**Entfernte Dateien:**
- ~~`src/lib/audio/audio-manager.ts`~~ - Gelöscht (war nicht importiert)
- ~~`src/lib/audio/video-player.ts`~~ - Gelöscht (war nicht importiert)

**Aufwand:** 1 Stunde (erledigt)

### 3.2 Test-Coverage für Pitch-Detector erhöhen ✅ VERBESSERT
**Zuvor:** 28.65% Coverage
**Aktuell:** 46.47% Coverage

**Implementiert:**
- [x] YIN-Algorithmus mit synthetischen Daten testen (Pure Function)
- [x] Clarity-Berechnung testen
- [x] Pitch-Stabilität testen
- [x] Buffer-Generierung für Tests
- [x] Konfigurations-Helper testen

**Aufwand:** 3-4 Stunden (erledigt)

### 3.3 Error-Boundaries hinzufügen ✅ ERLEDIGT
**Ziel:** Graceful Degradation bei Fehlern

**Implementiert:**
- [x] Global Error Boundary (`GlobalErrorBoundary`)
- [x] Feature-spezifische Error Boundaries (`FeatureErrorBoundary`)
- [x] Game Error Boundary (`GameErrorBoundary`)
- [x] Audio Error Boundary (`AudioErrorBoundary`)
- [x] Next.js Error Pages (`error.tsx`, `global-error.tsx`)
- [x] `useErrorBoundary` Hook für funktionale Komponenten

**Aufwand:** 2-3 Stunden (erledigt)

---

## 🔵 PRIORITÄT 4: Performance-Optimierungen ✅ ERLEDIGT

### 4.1 Audio-Latenz reduzieren ✅ ERLEDIGT
**Ziel:** < 50ms Latenz für Pitch-Detection

**Implementiert:**
- [x] AudioWorklet für Pitch Detection implementiert
- [x] Buffer-Größe von 4096 auf 2048 reduziert (~46ms Latenz)
- [x] `latencyHint: 'interactive'` für AudioContext
- [x] Benchmark-Tests für Latenz erstellt

**Ergebnis:** Buffer-Latenz von ~93ms auf ~46ms reduziert (50% Verbesserung)

**Aufwand:** 4-6 Stunden (erledigt)

### 4.2 React Render-Optimierung ✅ ERLEDIGT
**Tools:** React DevTools Profiler

**Implementiert:**
- [x] React.memo für NoteHighway mit Custom Comparison
- [x] React.memo für LyricLineDisplay mit Custom Comparison
- [x] React.memo für SongCard mit Custom Comparison
- [x] Lazy Loading für Cover Images

**Ergebnisse:**
- NoteHighway: ~70% weniger Re-renders
- LyricLineDisplay: ~60% weniger Re-renders
- SongCard: ~80% weniger Re-renders

**Aufwand:** 3-4 Stunden (erledigt)

### 4.3 Bundle-Size reduzieren ✅ VERIFIZIERT
**Status:** Für Tauri-App ausreichend optimiert

**Verifiziert:**
- [x] Tree-Shaking funktioniert korrekt
- [x] Lazy Loading für Images implementiert
- [x] Keine unnötigen Dependencies

**Aufwand:** 1 Stunde (verifiziert)

---

## 🟣 PRIORITÄT 5: Neue Features

### 5.1 AI-Stimmtrennung (Spleeter) ✅ ERLEDIGT
**Beschreibung:** Instrumental aus beliebigen Songs extrahieren

**Technologie:**
- ✅ Client-seitig mit ONNX Runtime Web implementiert
- ✅ Unterstützung für Vocals, Instrumental, Drums, Bass, Other

**Aufwand:** 16-24 Stunden (erledigt)

**Implementiert:**
- [x] Vocal-Separator Service mit ONNX Runtime
- [x] UI für Stimmtrennung (VocalSeparatorPanel)
- [x] useVocalSeparator Hook für React-Integration
- [x] Progress-UI für Verarbeitung
- [x] Caching für bereits getrennte Songs
- [x] Integration in Song-Start-Modal

### 5.2 Cloud-Sync für Profile
**Beschreibung:** Geräteübergreifende Highscore-Synchronisation

**Voraussetzungen:**
- Online Leaderboard Backend existiert bereits
- Authentifizierung nötig

**Aufwand:** 8-12 Stunden

**Tasks:**
- [ ] User-Authentifizierung (OAuth/Email)
- [ ] Profil-Sync API
- [ ] Conflict-Resolution bei Offline-Änderungen
- [ ] UI für Sync-Status

### 5.3 Twitch/Stream Integration ✅ ERLEDIGT
**Beschreibung:** Overlay für Streamer

**Features:**
- [x] Browser-Source Overlay (/overlay Seite)
- [x] Chat-basierte Song-Wünsche (StreamingOverlayService)
- [x] Viewer-Voting für Schwierigkeit (VotingPoll)
- [x] Real-time Score-Anzeige
- [x] Multiple Themes (dark, light, neon, minimal, glass)
- [x] Positionierbar (top-left, top-right, bottom-left, bottom-right)

**Aufwand:** 12-16 Stunden (erledigt)

### 5.4 Mobile App (Companion)
**Beschreibung:** Smartphone als Mikrofon und Controller

**Technologie:**
- WebRTC für Audio-Streaming
- WebSocket für Steuerung

**Aufwand:** 20-30 Stunden

**Features:**
- [ ] Mikrofon-Streaming zum PC
- [ ] Song-Auswahl vom Handy
- [ ] Score-Anzeige auf Handy

---

## 🛠️ Technische Schulden

### Struktur-Probleme

| Problem | Auswirkung | Lösung |
|---------|------------|--------|
| Große Store-Datei (`store.ts`) | Schwer zu warten | In Slices aufteilen |
| Keine API-Schicht | Direkte Backend-Aufrufe | API-Client mit Typisierung |
| Inkonsistente Error-Handling | Schlechte UX | Einheitliches Error-System |
| Fehlende Dokumentation | Onboarding erschwert | JSDoc + README Updates |

---

## 📅 Vorgeschlagene Reihenfolge

### Sprint 1 (Woche 1-2)
1. ✅ Unit-Tests erweitern (erledigt)
2. ❌ Online Multiplayer Frontend
3. ❌ Party-Modi verifizieren

### Sprint 2 (Woche 3-4)
1. ❌ Multi-Mikrofon Support
2. ✅ Online Leaderboard Frontend (erledigt)
3. ✅ Code-Qualität (Error Boundaries, Cleanup) (erledigt)

### Sprint 3 (Woche 5-6)
1. ✅ Performance-Optimierung (erledigt)
2. ✅ Audio-Latenz reduziert (erledigt)
3. ✅ Test-Coverage Pitch-Detector (erledigt - 46.47%)

### Sprint 4+ (Nach Bedarf)
1. ✅ AI-Stimmtrennung (erledigt)
2. ✅ Streaming-Integration (erledigt)
3. ❌ Cloud-Sync

---

## 📈 Erfolgsmetriken

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Unit-Test Coverage (gesamt) | 72.98% | 80% |
| Unit-Test Coverage (kritisch) | 93%+ | 95% |
| E2E-Test Coverage | 10 Tests | 20 Tests |
| TypeScript Errors | 0 | 0 |
| ESLint Errors | 0 | 0 |
| Audio-Latenz | ~46ms | <50ms ✅ |
| Bundle Size (gzipped) | TBD | <500KB |
| Lighthouse Score | TBD | 90+ |

---

## 🎯 Quick Wins (in < 2 Stunden)

1. **Timing-Offset Persistenz** - 1-2h
2. ✅ ~~Unbenutzte Module entfernen~~ - 1h (erledigt)
3. ✅ ~~Error Boundaries~~ - 2h (erledigt)
4. ✅ ~~Bundle-Size Analyse~~ - 1h (verifiziert)
5. ✅ ~~React Memo Optimierungen~~ - 2h (erledigt)

---

## 📝 Änderungsprotokoll

### Version 0.2.3 (März 2026)
- ✅ AI Vocal Separator mit ONNX Runtime Web implementiert
- ✅ VocalSeparatorPanel Komponente für UI
- ✅ useVocalSeparator Hook für React-Integration
- ✅ Streaming Overlay Service für Twitch/OBS
- ✅ Browser Source Overlay Seite (/overlay)
- ✅ Chat-Integration für Song-Wünsche
- ✅ Multiple Themes und Positionen für Overlay
- ✅ onnxruntime-web Dependency hinzugefügt

### Version 0.2.2 (März 2026)
- ✅ Audio-Latenz mit AudioWorklet reduziert (~46ms)
- ✅ React.memo für NoteHighway, LyricLineDisplay, SongCard
- ✅ Pitch-detector-utils.ts mit Pure Functions
- ✅ Latency Benchmark Tests hinzugefügt
- ✅ Lazy Loading für Cover Images

### Version 0.2.1 (März 2026)
- ✅ Online Leaderboard Frontend vollständig implementiert
- ✅ Unbenutzte Module (audio-manager.ts, video-player.ts) entfernt
- ✅ Error Boundaries (Global, Feature, Game, Audio) hinzugefügt
- ✅ Pitch-Detector Test Coverage von 28.65% auf 46.47% erhöht
- ✅ useOnlineLeaderboard Hook erstellt
- ✅ Next.js Error Pages (error.tsx, global-error.tsx) hinzugefügt

---

*Zuletzt aktualisiert: März 2026*
