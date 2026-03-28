# Karaoke Successor - Entwicklungs-Roadmap

**Stand:** März 2026 | **Version:** 0.2.0

---

## 📊 Projekt-Status Übersicht

| Bereich | Status | Priorität |
|---------|--------|-----------|
| Core-Features (Singen, Scoring) | ✅ Stabil | - |
| Unit-Tests | ✅ 132 Tests (93%+ Coverage bei kritischer Logik) | - |
| E2E-Tests | ✅ 10 Tests | - |
| TypeScript/ESLint | ✅ 0 Fehler | - |
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

### 2.3 Online Leaderboard Frontend
**Status:** Backend (PHP API) existiert, Frontend fehlt

**Aufwand:** 4-6 Stunden

**Tasks:**
- [ ] Globale Rangliste UI
- [ ] Per-Song Leaderboard
- [ ] Spieler-Detail-Seite
- [ ] Suchfunktion
- [ ] Privacy-Settings Integration

---

## 🟢 PRIORITÄT 3: Code-Qualität & Wartbarkeit

### 3.1 Unbenutzte Module aufräumen
**Dateien:**
- `src/lib/audio/audio-manager.ts` - Nicht importiert
- `src/lib/audio/video-player.ts` - Alternative Implementierungen existieren

**Empfehlung:** Entweder entfernen oder als "utility" markieren

**Aufwand:** 1 Stunde

### 3.2 Test-Coverage für Pitch-Detector erhöhen
**Aktuell:** 28% (aufgrund Browser-API-Abhängigkeiten)

**Lösung:** Mock-basierte Tests für Kern-Algorithmen

**Aufwand:** 3-4 Stunden

**Tasks:**
- [ ] YIN-Algorithmus mit synthetischen Daten testen
- [ ] Clarity-Berechnung testen
- [ ] Mock für AudioContext erstellen

### 3.3 Error-Boundaries hinzufügen
**Ziel:** Graceful Degradation bei Fehlern

**Aufwand:** 2-3 Stunden

**Tasks:**
- [ ] Global Error Boundary
- [ ] Feature-spezifische Error Boundaries
- [ ] Fehler-Reporting/Logging

---

## 🔵 PRIORITÄT 4: Performance-Optimierungen

### 4.1 Audio-Latenz reduzieren
**Ziel:** < 20ms Latenz für Pitch-Detection

**Maßnahmen:**
- [ ] Web Audio API Worklet statt ScriptProcessorNode
- [ ] Audio-Buffer-Größe optimieren
- [ ] Benchmark-Tests für Latenz

**Aufwand:** 4-6 Stunden

### 4.2 React Render-Optimierung
**Tools:** React DevTools Profiler

**Maßnahmen:**
- [ ] Memo für teure Komponenten
- [ ] useMemo/useCallback für Game-Loop
- [ ] Virtual Scrolling für Song-Library (große Bibliotheken)

**Aufwand:** 3-4 Stunden

### 4.3 Bundle-Size reduzieren
**Aktuell:** Viele shadcn/ui Komponenten

**Maßnahmen:**
- [ ] Tree-Shaking analysieren
- [ ] Dynamische Imports für seltene Screens
- [ ] Unused Dependencies entfernen

**Aufwand:** 2-3 Stunden

---

## 🟣 PRIORITÄT 5: Neue Features

### 5.1 AI-Stimmtrennung (Spleeter)
**Beschreibung:** Instrumental aus beliebigen Songs extrahieren

**Technologie:**
- Serverseitige Verarbeitung (Python + Spleeter/Demucs)
- Oder Client-seitig mit ONNX Runtime Web

**Aufwand:** 16-24 Stunden (komplex)

**Tasks:**
- [ ] Research: Client vs Server
- [ ] Backend-API für Separation
- [ ] Progress-UI für Verarbeitung
- [ ] Caching für bereits getrennte Songs

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

### 5.3 Twitch/Stream Integration
**Beschreibung:** Overlay für Streamer

**Features:**
- [ ] Browser-Source Overlay
- [ ] Chat-basierte Song-Wünsche
- [ ] Viewer-Voting für Schwierigkeit
- [ ] Real-time Score-Anzeige

**Aufwand:** 12-16 Stunden

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
2. Online Multiplayer Frontend
3. Party-Modi verifizieren

### Sprint 2 (Woche 3-4)
1. Multi-Mikrofon Support
2. Online Leaderboard Frontend
3. Code-Qualität (Error Boundaries, Cleanup)

### Sprint 3 (Woche 5-6)
1. Performance-Optimierung
2. Timing-Offset Persistenz
3. Test-Coverage Pitch-Detector

### Sprint 4+ (Nach Bedarf)
1. AI-Stimmtrennung
2. Cloud-Sync
3. Streaming-Integration

---

## 📈 Erfolgsmetriken

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Unit-Test Coverage (kritisch) | 93% | 95% |
| E2E-Test Coverage | 10 Tests | 20 Tests |
| TypeScript Errors | 0 | 0 |
| ESLint Errors | 0 | 0 |
| Audio-Latenz | ~50ms | <20ms |
| Bundle Size (gzipped) | TBD | <500KB |
| Lighthouse Score | TBD | 90+ |

---

## 🎯 Quick Wins (in < 2 Stunden)

1. **Timing-Offset Persistenz** - 1-2h
2. **Unbenutzte Module entfernen** - 1h
3. **Error Boundaries** - 2h
4. **Bundle-Size Analyse** - 1h
5. **Virtual Scrolling für Library** - 2h

---

*Zuletzt aktualisiert: März 2026*
