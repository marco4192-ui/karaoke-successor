# Karaoke ZERO — Worklog (Kurzfassung)

> **Datei-Landkarte & Architektur:** siehe `ARCHITECTURE.md` (dort steht, welche Datei was tut).
> **Detail-Historie:** `git log` (jeder Commit ist ausführlich beschrieben).

## Status

- Dev-Server: Port 3000, läuft (`tail dev.log`). Lint: 0 Errors.
- **Alle Follow-ups (BR-Rhythmus, Summen-Filter) E2E verifiziert + alle 4 neuen Aufgaben (R10) fertig + R11-Vollverifikation aller Flows im Browser.**
- **GitHub-Sync aktiv:** post-commit-Hook pusht jeden Commit sofort. `git log origin/main..HEAD` bleibt leer.

## Erledigt (2026-09-21, Runde R11 — Voll-QA aller R10-Features + UX-Fix)

1. **Vollständige E2E-Verifikation aller R10-Features im Browser** (agent-browser, Dev-Server war abgestürzt → neu gestartet):
   - **MIDI/KAR-Import (Cold Heart .kar):** Format „MIDI Karaoke" → Song-File + Audio-File injiziert → Track-Picker erscheint, 383-Noten-Gesangsmelodie (Ch 1) automatisch selektiert → „Create preview" → „Add to Library" → Song landet persistent in der Library („1 songs available"). Qualität im Editor: echte Lyrics („It's a human sign / When things go wrong / …") korrekt an Noten, Zeilen strikt sequenziell (0:04 → 4:39, monoton steigend, keine Stapelung/Überlagerung), Intro als ♪, Melismen als ♪ markiert. Screenshots: `qa-shots/midi-coldheart-editor.png`.
   - **Duett-Badge (Editor Library):** Duett-Song importiert (`public/qa-duet.txt`) → violettes 🎭-Badge erscheint NUR auf der Duett-Karte (`data-testid=editor-duet-badge-{id}`, genau 1 gefunden), Solo-Karten ohne. Auch Haupt-Library zeigt 🎭Duet-Tag. Screenshot: `qa-shots/editor-duet-badge.png`.
   - **Queue-Playlist-Ausnahme:** Playlist „QA Abend-Playlist" mit 2 Songs angelegt → „Add to Queue" → Config-Modal: „No per-player limit"-Toggle initial UNCHECKED → beide Zeilen manuell auf Duel gesetzt → Toggle flippt AUTOMATISCH auf checked + Text wechselt auf „All pairings were set manually — limit lifted" → „Add 2 songs" → beide Songs in der Queue. Ausnahme-Regel (R10-1) damit erstmals komplett im Browser bewiesen.
   - **Import-Redesign:** Alter Zustand bestätigt entfernt (keine Ultrastar/FolderScan-Tabs); Format-Karten (UltraStar/MIDI/Mugen/SingStar/StepMania), Song-Dropzone + File Loads (🎵 Audio, 🎬 Video, 🖼️ Cover) alle funktional.
2. **UX-Fix: Erstes Profil wird automatisch aktiviert** (`store.ts` `createProfile`): Vorher blieb `activeProfileId` null, nachdem man aus dem „Profile required"-Prompt ein Profil erstellte — „Add to Queue", Song-Start etc. blieben blockiert, bis man die Karte manuell anklickte (im QA entdeckt). Jetzt: `activeProfileId` wird gesetzt, wenn es das ALLERERSTE Profil ist (`state.profiles.length === 0`). E2E verifiziert: localStorage geleert → Profil erstellt → `activeProfileId` sofort gesetzt, „Profile required"-Prompt verschwindet.
3. QA-Testdateien bereitgestellt: `public/qa-coldheart.mid`, `public/qa-auld.mid`, `public/qa-duet.txt` (Duett, 2 Stimmen P1/P2) für zukünftige Cron-Runden.

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
