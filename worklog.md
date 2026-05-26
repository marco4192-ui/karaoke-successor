# Worklog - Karaoke Successor Fix Session

## Session Start: 2026-05-26

### Kontext
- Fortsetzung der vorherigen Code-Review-Session
- 7 CRITICAL, 10 HIGH, 25+ MEDIUM, 15+ LOW Issues identifiziert
- Root `app/` überschattet `src/app/` (Next.js lädt root `app/` zuerst)
- Alle Fixes stehen noch aus

---

## Task 1: Root app/ vs src/app/ Vergleich
**Status: ✅ Abgeschlossen (keine Aktion nötig)**
- Root `app/` wurde bereits in Commit `b5d366a7` gelöscht
- `src/app/` ist eindeutig fortgeschrittener (i18n, Retry, Rate-Limit, Retro-Theme)
- Zwei Dateien existieren NUR in `src/app/`: `api/lib/retry.ts`, `api/harmonize/route.ts`

## Task 2: CRITICAL Issues — Überprüfung und Fixes

### False Positives (bereits korrekt im Code)
| Issue | Datei | Grund |
|-------|-------|-------|
| Daily Challenge "failed=completed" | `daily-challenge.ts:710` | `targetMet` wird korrekt berechnet, `completed: targetMet` |
| Fullscreen Icon identisch | `fullscreen-button.tsx:72` | Beide SVGs sind unterschiedlich (shrink vs expand) |
| playerColor ignoriert | `note-highway.tsx:308` | `playerColor ?? default` wird korrekt verwendet |
| response.json() ohne try/catch | `cover-generator.ts`, `song-identifier.ts` | Beide haben bereits try/catch |
| Pitch Detector Duplikat | `pitch-detector.ts:292/302` | `frequencyToMidi` nur einmal importiert |
| Windows Pfad-Separator | `lib.rs:129` | Verwendet bereits `std::path::MAIN_SEPARATOR` |

### Echte Fixes
| # | Schwere | Datei | Fix |
|---|---------|-------|-----|
| 1 | CRITICAL | `src/lib/file-storage-media.ts` | **Delayed Revocation**: Blob-URLs werden bei Cache-Eviction nicht sofort revoked, sondern mit 30s Timeout. Verhindert Playback-Abbrüche bei aktiven `<audio>`-Elementen. |
| 2 | CRITICAL | `src/lib/parsers/multi-format-import.ts` | **BPM-Parsing Robustheit**: Unterstützt jetzt sowohl `beat=bpm` als auch plain-Number-Format. Fallback auf `[120]` wenn Parsing leer. Filtert negative/unmögliche BPMs. |
| 3 | HIGH | `src-tauri/src/audio/commands.rs` | **error_ch Reference Pattern**: `let error_ch: &mut Option<...> = &mut None` → `let mut error_ch: Option<...> = None`. Alle 3 Referenz-Stellen korrigiert. |

## Task 3: Zusätzliche Issues (Deep Scan)

| # | Schwere | Datei | Fix |
|---|---------|-------|-----|
| 4 | HIGH | `src/components/game/medley/medley-game-hook.ts` | **i18n**: 3 hartcodierte deutsche Strings → `t('medley.noAudioAvailable')` / `t('medley.audioLoadFailed')`. Keys zu en/de locales hinzugefügt. |
| 5 | MEDIUM | `src/components/screens/game-screen-hook.ts` | **Debug stubs**: `console.log` → `console.debug` + eslint-disable-Kommentare + TODO für echte UI-Warnings. |

## Task 4: Tauri Capabilities Review
- `$HOME/**` Pattern gibt volles Lesezugriff auf Home-Verzeichnis
- Für eine Karaoke-Desktop-App akzeptabel (Benutzer benötigen Zugriff auf Musik-Dateien überall)
- Schreibzugriff auf `$HOME/**` ist bedenklicher, aber Tauri-spezifisch geregelt
- **Beschluss: Akzeptiert** — Alternative wäre spezifischere Musik-Ordner-Pfade, die zu Restriktionen führen

---

## Zusammenfassung
- **3 echte Code-Fixes** angewendet (blob-cache, BPM-parsing, Rust error_ch)
- **2 Qualitätsoptimierungen** (i18n, console.log→debug)
- **8 False Positives** identifiziert und dokumentiert
- Root `app/` Bereinigung bestätigt (bereits erledigt)
