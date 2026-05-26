# Code Review 14 — Comprehensive Audit & Critical Fixes

**Datum:** 2026-05-26
**Scope:** Vollständiges Projekt-Audit mit 6 parallelen Agents
**Branch:** origin/main

---

## Task 1: Root app/ vs src/app/ Vergleich

### Ziel
Jede Datei in root `app/` gegen `src/app/` prüfen. Nur die fortgeschrittene Version behalten.
Die andere löschen. Bei Unklarheiten → Liste erstellen zur Diskussion.

### Vergleichsergebnisse

| Datei | Root app/ | src/app/ | Fortschrittlicher | Aktion |
|-------|-----------|----------|-------------------|--------|
| `page.tsx` | "Karaoke Successor", `bg-cyan-600` | "Karaoke ZERO", Gradient-Pink, HTML-Entities statt Emojis | **src** | Root löschen |
| `layout.tsx` | "Karaoke Successor Team" | "Karaoke ZERO Team" | **src** | Root löschen |
| `karaoke-app.tsx` | IDENTISCH | IDENTISCH | Gleich | Eine behalten |
| `globals.css` | 386 Zeilen (kein Retro) | 631 Zeilen (mit Retro-Theme, RMS-Animationen, Battle Royale CSS) | **src** | Root löschen |
| `mobile/page.tsx` | Hardcodierte EN-Strings | i18n mit `t()` | **src** | Root löschen |
| `api/songs/route.ts` | Identisch | Identisch | Gleich | Eine behalten |
| `api/song-identify/route.ts` | KEIN Retry, ISO Codes für Sprache, simpler Prompt | MIT Retry, `withRetry`, Rate-Limit, `LANGUAGE_FULL_NAMES`, Schlager-Genre, Spracherkennungs-Indikatoren | **src** | Root löschen |
| `api/mobile/route.ts` | Einfache Rate-Limits (connect:10, POST:300) | Per-Action GET Rate-Limits mit Compound-Keys | **src** | Root löschen |
| `api/mobile/post-handlers.ts` | Basis-Version | +340 Zeilen: `batch_pitch`, Input-Validierung, Auth auf privilegierten Endpoints, `reorderqueue`, `jukebox_wishlist_remove`, `chat`/`chat_host`, `tournament_crowd_vote`, Max-Limits, Duel-Partner-Validierung | **src** | Root löschen |
| `api/mobile/get-handlers.ts` | Basis-Version | +100 Zeilen: `reconnectCode`, Code-basierte Zombie-Erkennung, `connectionCode` exkludiert von Status/Clients (Sicherheit), `getchat`, `get_crowd_votes`, `getopponents`, try/catch | **src** | Root löschen |
| `api/mobile/mobile-types.ts` | Basis-Typen | +Types: `difficulty`, `playerMicSource`, `partnerMicSource`, `duetPartsSwapped` in QueueItem; `CompanionScoreEntry`; `cptmTurn`, `tournamentMatchId` in MobileGameState | **src** | Root löschen |
| `api/mobile/mobile-state.ts` | Basis-State | +Features: Brute-Force PIN-Schutz, `requireAuthOrRemoteHolder`, `MAX_CLIENTS=50`, `registerClient`, `MAX_JUKEBOX_PER_CLIENT=20`, `MAX_TOURNAMENT_VOTES=500`, `purgeCompletedQueueItems`, erweitertes `cleanupInactiveClients`, `chatMessages`, `pendingDuelRequests`, `tournamentCrowdVotes`, `cptmTurn` | **src** | Root löschen |
| `api/lyrics-suggestions/route.ts` | KEIN Retry, 5000 Zeichen, temp 0.2, max 15 | MIT Retry, 8000 Zeichen, temp 0.1, max 20, Rate-Limit-Erkennung | **src** | Root löschen |
| `api/cover-generate/route.ts` | KEIN Retry | MIT Retry für Image-Generation | **src** | Root löschen |
| `api/route.ts` | Identisch | Identisch | Gleich | Eine behalten |
| `api/lib/is-local-request.ts` | Identisch | Identisch | Gleich | Eine behalten |
| `api/lib/retry.ts` | Existiert NICHT | **NEU** — `withRetry()` + `isRateLimitError()` | **src** | Root hat diese nicht |
| `api/harmonize/route.ts` | Existiert NICHT | **NEU** — Batch Genre/Language Harmonisierung via LLM | **src** | Root hat diese nicht |
| `api/server-info/route.ts` | Existiert (verwaist unter root app/api/) | **NICHT unter src/app/api/** — stattdessen unter `src/api/` (falscher Pfad, wird von Next.js nicht gepickt) | Sonderfall | Verschieben nach src/app/api/ |

### WICHTIGE KORREKTUR: Next.js Priorität
**Next.js priorisiert `src/app/` über root `app/`** (Dokumentation: src-Directory wird automatisch erkannt).
Das bedeutet: **`src/app/` IST die aktive Version.** Root `app/` ist Dead Code.

### Vergleichsergebnis (nach Agent-Überprüfung)
Die mobile API-Files sind bereits **IDENTISCH** (wurden vorher synchronisiert).
Nur folgende Files unterscheiden sich noch:

| Datei | Root (veraltet) | src (aktiv, besser) | Unterschied |
|-------|----------------|---------------------|-------------|
| `page.tsx` | "Karaoke Successor" | "Karaoke ZERO" | Branding + Styling |
| `layout.tsx` | "Karaoke Successor Team" | "Karaoke ZERO Team" | Metadata |
| `globals.css` | 386 Zeilen | 631 Zeilen | +Retro-Theme, +RMS, +BR CSS |
| `mobile/page.tsx` | Hardcodiert EN | i18n `t()` | Übersetzung |
| `api/song-identify/` | Kein Retry | +Retry, +Rate-Limit, besserer Prompt | Resilienz |
| `api/lyrics-suggestions/` | Kein Retry, 5000 Zeichen | +Retry, 8000 Zeichen, Rate-Limit | Resilienz |
| `api/cover-generate/` | Kein Retry | +Retry | Resilienz |
| `api/lib/retry.ts` | Existiert nicht | **NEU** | Utility |
| `api/harmonize/route.ts` | Existiert nicht | **NEU** | Neue Route |
| `api/server-info/` | Existiert in root | **FEHLT** in src/app/api/ | Verschieben! |

### Fazit
**Root `app/` komplett löschen.** `src/app/` ist aktiv und hat alle Features.
`api/server-info/route.ts` von root nach `src/app/api/server-info/` verschieben.
`src/api/server-info/route.ts` (verwaist, falscher Pfad) ebenfalls löschen.

---

## Task 2: Weitere Root-Dead-Code Verzeichnisse

| Verzeichnis | Status | Aktion |
|-------------|--------|--------|
| `hooks/` (root) | 34/47 Dateien veraltet, 12 neue Hooks fehlen | ✅ **GELÖSCHT** |
| `components/` (root) | Alle ~165 Dateien veraltet, 80+ neue fehlen | ✅ **GELÖSCHT** |
| `lib/` (root) | 35 veraltet, 140+ neue fehlen (inkl. i18n) | ✅ **GELÖSCHT** |
| `types/` (root) | 3/5 Dateien veraltet | ✅ **GELÖSCHT** |
| `__tests__/` (root) | 2/7 Tests veraltet, Vitest nutzt src/__tests__ | ✅ **GELÖSCHT** |
| `css.d.ts` (root) | Identisch mit src/css.d.ts | ✅ **GELÖSCHT** |
| `app/` (root) | Alle 19 Dateien veraltet | ✅ **GELÖSCHT** |
| `src/api/server-info/` | Verwaist (falscher Pfad) | ✅ **GELÖSCHT** |
| `db/` (root) | NUR custom.db (Laufzeitdaten) | **BEHALTEN** |
| `examples/` (root) | WebSocket-Beispiele, excluded | **BEHALTEN** |
| `src/app/api/server-info/` | Von root verschoben | ✅ **NEU ERSTELLT** |

**Gesamt gelöscht:** ~73.000 Zeilen Dead Code (340 Dateien)

---

## Task 3: Kritische Code-Fixes

### 3.1 NaN in BPM-Parsing (`multi-format-import.ts:389`)
- **Problem:** `parseFloat(b.split('=')[1])` erzeugt NaN bei malformed data
- **Fix:** `.filter(v => !isNaN(v))` hinzugefügt

### 3.2 Daily Challenge Logic (`daily-challenge.ts`)
- **Problem 1:** Fehlgeschlagene Challenge wird als "completed" markiert
- **Problem 2:** Coop Best-Result überschreibt ohne Prüfung
- **Fix:** Bedingung `completed: true` an targetMet geknüpft; Best-Check auch für Coop

### 3.3 Fullscreen-Button Icon (`fullscreen-button.tsx:72`)
- **Problem:** Beide Branches zeigen gleiches Icon `'⛶'`
- **Fix:** Verschiedene Icons/Unicode für beide Zustände

### 3.4 note-highway playerColor (`note-highway.tsx:308`)
- **Problem:** `_playerColor` wird ignoriert, hartcodierte Farben
- **Fix:** Prop nutzen statt ignorieren

### 3.5 AI response.json() (`cover-generator.ts`, `song-identifier.ts`)
- **Problem:** `response.json()` kann bei HTML-Fehlerseiten SyntaxError werfen
- **Fix:** try/catch um JSON-Parsing

### 3.6 Pitch-Detector doppelte Berechnung (`pitch-detector.ts`)
- **Problem:** `frequencyToMidi()` zweimal im selben Frame
- **Fix:** Einmal berechnen, Variable wiederverwenden

---

## Task 4: Build & Push

- [x] Build getestet mit `bun run next build --webpack` — **ERFOLGREICH**
  - TypeScript: Compiliert fehlerfrei
  - 12 Seiten generiert
  - Alle API-Routes aktiv (inkl. harmonize, server-info)
  - Hinweis: `metadataBase` Warning (kosmetisch)
  - Hinweis: workspace root Lockfile Warning (kosmetisch)
- [x] TypeScript-Fix nach pitch-detector Agent: `frequency!` Non-null Assertion nötig
- [x] Git commit: `ad118a7` — "refactor: remove ~73K lines of dead root-level code + fix 6 critical/high bugs"
- [x] Git push: `main -> main` erfolgreich

---

## Offene Punkte (für zukünftige Reviews)

### Nicht bearbeitet (mittlere Priorität)
- Rust: `**`-Wildcard in capabilities/default.json (Sicherheit)
- Rust: Windows Pfad-Trenner in forbidden-dir Check
- Rust: UTF-8 Panic-Risiko in normalize() → strip_suffix()
- Rust: devtools Feature unbeding enabled (sollte debug-only sein)
- blob URL Cache Aliasing Bug in file-storage-media.ts
- Sprachen-Mismatch: LANGUAGES vs normalizeLanguage()
- ~15 hartcodierte Strings (i18n)
- Safe-dialog Fallback-Timing
- Blob URL Memory Leak in Browser-Fallback
- CompetitiveGame.usedSongIds: Set<string> nicht serialisierbar

### Nicht bearbeitet (niedrige Priorität)
- Unbenutzte npm-Abhängigkeiten (~10 Pakete)
- `removeConsole: false` in next.config.ts
- `db/custom.db` in .gitignore
- leaderboard-api/ komplett entkoppelt
- Große Komponenten aufteilen (daily-challenge.ts, tournament-screen.tsx)
- PlayerAvatar-Komponente extrahieren (~30 Duplikate)
- Magic Numbers als Named Constants

---

## Task 5: Review 15 — Fortsetzung der HIGH/MEDIUM Fixes

**Datum:** 2026-05-26 (Session 2)
**Vorgaben:** Gleiche wie Review 14. Viele Agents, einer pro Datei, pushen.

### 5.1 Vorab-Prüfung

- Root `app/` existiert NICHT mehr (bereits in ad118a7 gelöscht) ✅
- Alle 6 CRITICAL Fixes aus Review 14 bereits erledigt ✅
- `response.json()` hat äußeren try/catch — OK ✅
- Pitch Detector Duplikat bereits behoben ✅

### 5.2 Tauri Capabilities Wildcard (SICHERHEIT)

**Datei:** `src-tauri/capabilities/default.json`

**Problem:** Jede fs-Permission enthielt `{ "path": "**" }` was VOLLEN Dateisystem-Zugriff
erlaubt — komplett negiert die `validate_safe_path()` Prüfung in lib.rs.

**Fix:** Alle 11 `{ "path": "**" }` Einträge entfernt. Verbleibende Paths sind
sinnvoll beschränkt auf `$HOME`, `$RESOURCE`, `$APPDATA`, `$CWD`, etc.

### 5.3 Windows Pfad-Trenner Bug (Rust)

**Datei:** `src-tauri/src/lib.rs:129`

**Problem:** `format!("{}/", dir_lower)` verwendet `/` statt `MAIN_SEPARATOR` auf Windows.
Kanonisierte Windows-Pfade verwenden `\`, daher würde z.B. `c:\windows\system32`
nicht erkannt wenn der Check `c:\windows/` sucht.

**Fix:** `format!("{}{}", dir_lower, std::path::MAIN_SEPARATOR)` — korrekter OS-Trenner.

### 5.4 error_ch Pattern (Rust)

**Datei:** `src-tauri/src/audio/commands.rs:90`

**Analyse:** `let error_ch: &mut Option<Channel<String>> = &mut None;`
→ WORKS_CORRECTLY. Rust's Temporary Lifetime Extension garantiert, dass der
temporäre `None`-Wert für die gesamte Funktionsscope lebt. Stil-Inkonsistenz
zu den anderen Channel-Variablen, aber kein Bug.

### 5.5 Blob URL Cache Aliasing Bug

**Datei:** `src/lib/file-storage-media.ts`

**Problem:** Bei Windows Backslash-Fallback wurde dieselbe blob URL unter ZWEI
verschiedenen Keys (forward-slash + backslash) gecacht. Bei Cache-Eviction
wurde `URL.revokeObjectURL()` aufgerufen, während der andere Key die URL
noch referenzierte → stille Wiedergabefehler.

**Fix:**
1. `loadFileAsBlobUrl()` cached nicht mehr selbst — Caller sind verantwortlich
2. Nur forward-slash Key wird gecacht (kanonisch)
3. Verhindert Aliasing komplett

### 5.6 LANGUAGES vs normalizeLanguage() Mismatch

**Datei:** `src/lib/constants.ts` (LANGUAGES) vs `src/lib/parsers/meta-normalizer.ts` (normalizeLanguage)

**Problem:** `LANGUAGES` verwendete Deutsche Namen (`'Englisch'`, `'Deutsch'`, ...),
aber `normalizeLanguage()` gibt Englische Kanon-Namen zurück (`'English'`, `'German'`, ...).
Das führte zu kaputter Filterung und Gruppierung.

**Fix:** LANGUAGES auf Englische Kanon-Namen geändert (22 Sprachen, +6 neue:
Norwegian, Danish, Finnish, Hindi, Thai, Indonesian).

### 5.7 usedSongIds Set→string[] (Serialisierbarkeit)

**Datei:** `src/lib/game/competitive-words-blind.ts`

**Problem:** `usedSongIds: Set<string>` — JSON.stringify(Set) ergibt `{}`.
Wenn der State jemals serialisiert wird, geht die usedSongIds-Daten verloren.

**Fix:** Geändert zu `string[]`. `.has()` → `.includes()`, `.add()` → Spread-Push.
Konsistent mit `playedSongIds: string[]` im selben File.

### 5.8 DevTools unconditional (debug-only)

**Datei:** `src-tauri/src/lib.rs` (3 Stellen: Setup, Server-running, Server-spawn)

**Problem:** `window.open_devtools()` wurde bedingungslos aufgerufen — auch in
Release/Produktion-Builds. Nutzer würden DevTools-Fenster sehen.

**Fix:** Alle 3 `open_devtools()` Aufrufe mit `#[cfg(debug_assertions)]` markiert.

### Build & Push

- [x] Build getestet `bun run next build --webpack` — **ERFOLGREICH** (12 Seiten)
- [x] Git commit: `fee9a18` — "fix: resolve 7 HIGH/MEDIUM bugs"
- [x] Git push: `main -> main` erfolgreich

---

*Worklog abgeschlossen — Commit fee9a18 gepusht.*
