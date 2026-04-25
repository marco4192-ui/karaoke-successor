# Karaoke Successor — Extension Roadmap

Status-Symbole: `[ ]` = TODO, `[~]` = In Progress, `[x]` = Done

---

## Phase 1 — Quick Wins (1-3 Tage pro Punkt)

| # | ID | Feature | Priorität | Status |
|---|----|---------|-----------|--------|
| 1 | C.1 | Native File Dialog für Song-Import (Tauri Dialog API) | Hoch | `[ ]` |
| 2 | D.3 | Vocaluxe/UltraStar Bulk-Import — optische Aufwertung | Hoch | `[ ]` |
| 3 | A.2 | Virtual Scrolling für Song-Bibliothek (5k-10k Songs) | Hoch | `[ ]` |
| 4 | A.3 | React.memo für Note-Highway und Score-Display | Hoch | `[ ]` |

## Phase 2 — Performance & Features (2-5 Tage pro Punkt)

| # | ID | Feature | Priorität | Status |
|---|----|---------|-----------|--------|
| 5 | A.4 | Debounce für updatePlayer Aufrufe | Mittel | `[ ]` |
| 6 | B.2 | Replay-System (Phase 1: Aufzeichnung + Wiedergabe) | Hoch | `[ ]` |
| 7 | D.1 | Waveform-basiertes Note-Editing (Phase 1: Waveform + Playback) | Hoch | `[ ]` |

## Phase 3 — Erweiterte Features (3-10 Tage pro Punkt)

| # | ID | Feature | Priorität | Status |
|---|----|---------|-----------|--------|
| 8 | A.1 | useNoteScoring in Web Worker auslagern | Mittel | `[ ]` |
| 9 | D.2 | Auto-Beat-Detection aus Audiosignal | Mittel | `[ ]` |
| 10 | C.3 | Tauri Plugin für System-Media-Controls | Mittel | `[ ]` |
| 11 | B.3 | ELO-Rating für Multiplayer | Mittel | `[ ]` |

## Phase 4 — Architektur (5-10 Tage pro Punkt)

| # | ID | Feature | Priorität | Status |
|---|----|---------|-----------|--------|
| 12 | C.2 | Native Audio Processing über Tauri Commands (Rust) | Mittel | `[ ]` |
| 13 | C.4 | Offline-Modus mit lokaler SQLite | Hoch (langfristig) | `[ ]` |
| 14 | B.1 | Server-seitige Scoring-Validierung | Niedrig (braucht Online-MP) | `[ ]` |

---

## Detail-Beschreibungen

### A — Performance & Rendering

**A.1 — useNoteScoring in Web Worker**
Pitch-Detection + Tick-Evaluation in Worker auslagern. Main Thread nur für State-Updates.
Abhängigkeit: Keine. Komplexität: Mittel.

**A.2 — Virtual Scrolling für Song-Bibliothek**
Nur sichtbare Songs rendern (react-window/@tanstack/virtual). Mini-Previews beibehalten.
Abhängigkeit: Keine. Komplexität: Mittel. Wichtig für 5k-10k Song-Bibliotheken.

**A.3 — React.memo für Note-Highway und Score-Display**
Unnötige Re-Renders verhindern. Custom areEqual-Funktionen.
Abhängigkeit: Keine. Komplexität: Niedrig.

**A.4 — Debounce für updatePlayer**
Score-Updates bündeln (200-300ms). Combo/Hits sofort, Punkte aggregiert.
Abhängigkeit: #62 Batch-Update bereits umgesetzt. Komplexität: Niedrig.

### B — Multiplayer & Game-Features

**B.1 — Server-seitige Scoring-Validierung**
Authentisches Scoring auf Server. Anti-Cheat für Online-Multiplayer.
Abhängigkeit: Online-Multiplayer-Infrastruktur. Komplexität: Hoch.

**B.2 — Replay-System**
Pitch-Daten aufzeichnen + Replay-Player mit Note-Highway.
Phase 1: Aufzeichnung + einfache Wiedergabe. Phase 2: Visualisierung (Waveform, Abweichung).
Abhängigkeit: Keine. Komplexität: Mittel-Hoch.

**B.3 — ELO-Rating für Multiplayer**
ELO-System wie Schach. Leaderboard, Match-History, Rating-Graph.
Abhängigkeit: Online-Multiplayer für Sinnhaftigkeit. Komplexität: Mittel.

### C — Tauri-Native Features

**C.1 — Native File Dialog**
Tauri dialog.open() statt Browser <input type="file">. Ordner-Import, File-Filter.
Abhängigkeit: Keine. Komplexität: Niedrig (1 Tag).

**C.2 — Native Audio Processing**
FFT/Pitch-Detection in Rust (rustfft, cpal). Bessere Performance + Stabilität.
Abhängigkeit: Keine. Komplexität: Sehr Hoch.

**C.3 — System-Media-Controls**
Play/Pause Media Keys, Lock-Screen Widget, System Tray.
Abhängigkeit: Platform-spezifischer Rust-Code. Komplexität: Hoch.

**C.4 — SQLite statt IndexedDB**
Bessere Queries, Backup (eine .db-Datei), Volltextsuche.
Abhängigkeit: Große Migration. Komplexität: Sehr Hoch.

### D — Song-Editor & Import

**D.1 — Waveform-basiertes Note-Editing**
Integrierter Editor: Waveform + Note-Overlay + Editing + Export.
Phase 1: Waveform + Playback. Phase 2: Note-Overlay. Phase 3: Editing. Phase 4: Export.
Abhängigkeit: Keine. Komplexität: Sehr Hoch.

**D.2 — Auto-Beat-Detection**
BPM-Erkennung aus Audiosignal bei Import. Energy-based Onset Detection.
Abhängigkeit: Optional C.2 für Performance. Komplexität: Mittel.

**D.3 — Vocaluxe/UltraStar Bulk-Import**
Ordner-Scanner, paralleler Import, Fortschrittsanzeige, Error-Report, Duplicate-Detection.
Abhängigkeit: Optional C.1 für Native File Dialog. Komplexität: Mittel.
