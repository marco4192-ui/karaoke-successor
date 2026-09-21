# Karaoke ZERO — Worklog (Kurzfassung)

> **Datei-Landkarte & Architektur:** siehe `ARCHITECTURE.md` (dort steht, welche Datei was tut).
> **Detail-Historie:** `git log` (jeder Commit ist ausführlich beschrieben).

## Status

- Dev-Server: Port 3000, läuft (`tail dev.log`). Lint: 0 Errors.
- **Alle Follow-ups (BR-Rhythmus, Summen-Filter) E2E verifiziert + alle 4 neuen Aufgaben (R10) fertig.**
- **GitHub-Sync aktiv:** post-commit-Hook pusht jeden Commit sofort. `git log origin/main..HEAD` bleibt leer.

## Erledigt (2026-09-20/21, Runde R10)

1. **BR 2.2-R3 — Rhythmus SICHTBAR + robust** (Commit 30f526ad):
   - E2E bewiesen: Rhythmus-Logik funktionierte bereits (30s-Intervall → Eliminierungen mid-song bei 30/60s, Song läuft weiter; 2-Spieler-Runde endet nach finalRoundDuration) — sie war nur unsichtbar (winzines ✕).
   - NEU: `💀 Ns`-Countdown-Badge (HUD unten links) bis zur nächsten Eliminierung + nicht-blockierendes `💀 {name} ist ausgeschieden!`-Banner (3,5s).
   - Ticker selbstheilend (verlorene Deadline re-armt). Freeze-Fix: No-Repeat-Ausschlüsse, die ALLE Songs abdecken → Retry ohne Ausschlüsse; gar nichts Spielbares → Spiel endet sauber (höchster Score gewinnt) statt Endlos-0s.
   - Song-Ende = reiner Rundenwechsel (Round 1 → Round 2 ohne Extra-Eliminierung, E2E verifiziert).
2. **Summen-Filter:** global deaktiviert verifiziert (Kill-Switch in vocal-detector.ts; Scoring-Gates raus seit R9; Phone-seitig derselbe deaktivierte Detector). Keine UI-Strings mehr.
3. **Queue R10-1 — Playlist-Ausnahme** (Commit 6178dac1): `addToQueue` bekommt `options.skipLimit` (nur Playlist-Flow). PlaylistQueueConfigModal trackt manuell zugewiesene Zeilen; wenn ALLE Zeilen manuell gesetzt → Limit automatisch aufgehoben; expliziter Toggle im Footer (\♾️). Normale Einzel-Adds bleiben bei max. 3/Spieler.
4. **Editor-Library R10-3 — Duett-Kennzeichnung** (Commit 6178dac1): violettes 🎭-Badge auf Song-Karten (`isDuetSong`, data-testid `editor-duet-badge-{id}`).
5. **Import R10-2 — Redesign** (letzter Commit):
   - Tabs „Ultrastar import" + „Folder Scan" ENTFERNT (von Multi-Folder-Lösung abgelöst); ImportScreen = einzelner Converter-Bildschirm.
   - Converter FUNKTIONIERT wieder: erzeugt UltraStar-TXT (generateUltraStarTxt) + persistiert txt/audio/video/cover in Media-DB (storedTxt/storedMedia) → Songs überleben Reloads (vorher: Audio nur im RAM, nach Reload unspielbar — E2E verifiziert).
   - File Loads: Audio (existierte), Video, Cover, ASS-Untertitel (Mugen) — alles optional.
   - NEU: `parseAssKaraoke` — ASS/SSA-Parser mit `{\k}`-Silben-Timing; `.ass` wird als karaoke-mugen erkannt, extra `.ass` überschreibt JSON-Lyrics.
   - Entscheidung dokumentiert: Konvertierung nach UltraStar BLEIBT (Pipeline läuft komplett auf UltraStar-Daten; TXT ist editierbar/portabel; Direkt-Support jedes Formats wäre unwartbar).
6. **MIDI/KAR-Import R10-4 — Qualität** (Beispieldateien des Users):
   - Melodie-Erkennung neu: Monophonie (40) + singbare Lage 53-84 (25) + Komfort-Lage 55-77 (10) + Silben-Nähe (25) + Lyric-Coverage (100) + Track-Name-Bonus. Cold Heart .kar: 383-Noten-Gesangsmelodie (100% mono) schlägt jetzt den 888-Noten-Begleit-Track (33% mono); Auld Lang Syne: 110-Noten-Vocallinie statt 581-Noten-Arpeggio.
   - Karakan-Marker: `~`=Melisma→♪, `.`/`...`=instrumental→♪, `{Backing}`-Braces raus, `Sänger:`-Labels raus; Wortgrenzen-Spaces bei 0x01-Text-Events repariert (`It'sahumansign` → `It's a human sign`).
   - `@T`-Titel: optionales Leerzeichen + `Artist - Title`-Splitting bei Credit-Zweizeilen.
   - Taktbasierter Zeilenumbruch für lyriklose MIDIs (Taktarten-Parsing 0x58, 2-Takt-Phrasen): Auld Lang Syne 2×55-Noten-Riesenzeilen → 16 phrasengroße Zeilen. Keine überlappenden Zeilen (0/56 bzw. 0/16).

## QA-Setup (für Cron-Runden)

- **Companion-Simulator läuft:** `node qa-test-song/companion-sim.mjs '<profilesJson>'` (PID in /tmp/companion-sim.log; verbindet Alice/Bob/Carol/Dave als Fake-Companions per HTTP-API mit Fake-IPs + Heartbeat alle 30s). Profile-IDs: `karaoke-host-profiles` in localStorage.
- **Song-Import** (neu, über Converter): Settings → Library → „Import from other karaoke systems" → Format UltraStar → Song-Datei `public/qa-test.txt` + Audio `public/qa-test.mp3` → Importieren als → Zur Bibliothek. Persistiert jetzt korrekt (storedMedia).
- Beispiel-MIDIs des Users: `upload/*.mid` (+ zugehörige .txt mit Lyrics zum Vergleich).

## Offene Punkte / nächste Schritte

1. QA via Cron (läuft alle 15 Min) — Fokus: neue Import-Flows (MIDI/KAR + ASS), Playlist-Queue-Ausnahme, Duett-Badges.
2. BR mit echten Mikrofonen testen (Eliminierungs-Rhythmus + Finale-Länge E2E mit Begleitgeräten).
3. MIDI: Silben-Zuordnung bei mehrstimmigen Spuren ggf. verfeinern (der Track-Picker bleibt die Rückfallebene).
4. `FEATURE_IDEAS.md` priorisieren; prä-existente Lint-Warnings reduzieren.

## Wichtige Konventionen

- i18n: neue Keys immer in **de UND en** (`src/lib/i18n/locales/{de,en}/…`), andere Sprachen haben en-Fallback.
- Browser-QA ohne Tauri: Song-Import über den Converter (siehe oben) — Audio wird jetzt persistent gespeichert.
- `bun run build` in der Sandbox verboten; nur Port 3000.
