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
| `hooks/` (root) | 34/47 Dateien veraltet, 12 neue Hooks fehlen | **LÖSCHEN** |
| `components/` (root) | Alle ~165 Dateien veraltet, 80+ neue fehlen | **LÖSCHEN** |
| `lib/` (root) | 35 veraltet, 140+ neue fehlen (inkl. i18n) | **LÖSCHEN** |
| `types/` (root) | 3/5 Dateien veraltet | **LÖSCHEN** |
| `__tests__/` (root) | 2/7 Tests veraltet, Vitest nutzt src/__tests__ | **LÖSCHEN** |
| `css.d.ts` (root) | Identisch mit src/css.d.ts | **LÖSCHEN** |
| `db/` (root) | NUR custom.db (Laufzeitdaten) | **BEHALTEN** |
| `examples/` (root) | WebSocket-Beispiele, excluded | **BEHALTEN** |

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

- [ ] Build testen mit `bun run next build --webpack`
- [ ] Git commit & push

---

*Worklog aktiv gepflegt — Einträge werden fortlaufend ergänzt.*
