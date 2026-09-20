# Karaoke ZERO — Worklog (Kurzfassung)

> **Datei-Landkarte & Architektur:** siehe `ARCHITECTURE.md` (dort steht, welche Datei was tut).
> **Detail-Historie:** `git log` (jeder Commit ist ausführlich beschrieben).

## Status

- Dev-Server: Port 3000, läuft (`tail dev.log`). Lint: 0 Errors.
- **Alle 11 Punkte der Bugfix-Liste erledigt** (letzte: 1.2 Duett-IDs, 1.3 Upsert-Save).
- **GitHub-Sync aktiv:** post-commit-Hook pusht jeden Commit sofort; bei Divergenz auto-`pull --rebase --autostash` + retry-Push. Immer `git log origin/main..HEAD` leer halten.

## Erledigt (2026-09-20, Runde 2.2-R2 + Git)

1. **Git-Divergenz aufgelöst:** Lokale Commits auf `origin/main` (R9-Batch) gerebased; 1.2/1.3 als Best-of-both vereint (Upsert-Flow + Legacy-Purge `purgeAbortedNewSongs`). QA-Assets zurückerhalten. Hook gehärtet.
2. **BR 2.2-R2 — keine festen Intervalle:**
   - Setup-Slider `roundDuration` heißt jetzt **„Ausscheide-Intervall"** (wirkt: Random/Vote-Elim-Takt + Medley-Rundenbudget). `finalRoundDuration`-Slider mit Beschreibung.
   - `getEffectiveRoundDuration()` (battle-royale.ts) ist die EINZIGE Dauer-Quelle: Finale/letztes Duell → `finalRoundDuration`, sonst `roundDuration` (− Shrinking-Timer, nie unter `minRoundDuration`). Exportiert.
   - **Finale-Runden folgen jetzt der Finale-Einstellung** statt der vollen Songlänge (`startRound`: `isGrandFinaleRound || isFinalRound` → `finalRoundDuration`; kürzerer Song endet trotzdem früher via `ended`-Event).
   - **Elim-Takt zeitstempelbasiert** (use-battle-royale-game.ts): Deadline statt `setInterval` → überlebt Pause (Deadline verschoben um Pausenzeit), friert pro Runde ein, re-armt nach jeder Eliminierung mit frischem Settings-Intervall, disarmt beim Finale/Spielende. 13 Logik-Checks grün (verify-Skript gelöscht, siehe Commit).
3. **Summen-Filter deaktiviert:** `VOCAL_CLASSIFIER_ENABLED = false` in `src/lib/audio/vocal-detector.ts` (Kill-Switch, dokumentiert). Grund: Klassifikator verwechselt gehaltene Karaoke-Noten mit Summen — als Scoring-Gate längst raus (R9), als visueller Indikator zeigte er „still" mitten im Ton. Alle Verbraucher laufen jetzt auf zuverlässiger Ton-Erkennung (`pitch != null` + Volume). Rückholbar per Flag.

## Offene Punkte / nächste Schritte

1. QA-Runden via Cron (läuft, alle 15 Min) — Fokus: Party/Companion (Socket.IO), Mobile `/mobile`.
2. BR-Verhalten mit echten Begleitgeräten testen (Elim-Takt + Finale-Länge E2E).
3. `FEATURE_IDEAS.md` priorisieren; prä-existente Lint-Warnings reduzieren.

## Wichtige Konventionen

- i18n: neue Keys immer in **de UND en** (`src/lib/i18n/locales/{de,en}/…`), andere Sprachen haben en-Fallback.
- Browser-QA ohne Tauri: Songs importieren via Settings → Library → UltraStar Import (`public/qa-test.mp3/.txt`).
- `bun run build` in der Sandbox verboten; nur Port 3000.
