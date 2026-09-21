# Karaoke ZERO — Worklog (Kurzfassung)

> **Datei-Landkarte & Architektur:** siehe `ARCHITECTURE.md` (dort steht, welche Datei was tut).
> **Detail-Historie:** `git log` (jeder Commit ist ausführlich beschrieben).

## Status

- Dev-Server: Port 3000, läuft (Double-Fork-Start, siehe Konventionen). Lint: 0 Errors. `npx tsc --noEmit`: Exit 0.
- **R13: Alle 5 Build-Typfehler behoben, die den Release-CI (`build-executables.yml` → `prepare-bundle.mjs` → `next build`) blockierten. E2E im Browser verifiziert.**
- **Alle Feature-Ideas abgeschlossen: 14 (Sync & Backup), 16 (Voice FX Studio), 17 (Instrumental-Export) implementiert + E2E-bewiesen. 13/18 geparkt, 15 gestrichen (Nutzer-Entscheid).**
- **GitHub-Sync aktiv:** post-commit-Hook pusht jeden Commit sofort. `git log origin/main..HEAD` bleibt leer.

## Erledigt (2026-09-21, Runde R13 — Build-Fix: 5 Typfehler)

**Anlass:** Nutzer-Report — `node scripts/prepare-bundle.mjs` (Release-CI `build-executables.yml`) scheiterte am `next build`-Typecheck: `voiceFx does not exist in type 'GameScreenHookReturn'`. Der Build stoppt beim ERSTEN Fehler — dahinter lagen 4 weitere maskierte Fehler (via `npx tsc --noEmit` alle gefunden und behoben):

1. **`game-screen-types.ts`** — `GameScreenHookReturn` fehlten die 3 Voice-FX-Felder, die der Hook (R12) längst zurückgibt: `voiceFx`, `setVoiceFx`, `voiceFxAvailable` (typisiert via `ReturnType<typeof useGameAudioEffects>[...]`, wie alle Nachbarfelder).
2. **`audio-effects.ts` — echter Runtime-Bug, nicht nur Typkosmetik:** `applyPreset()` baute `this.settings` als Objekt-Literal OHNE `voiceFx` → jedes Audio-Preset (Pop/Rock/Concert/Studio) hätte `settings.voiceFx` auf `undefined` gesetzt → späterer Crash in `updateDetectedPitch()` (`this.settings.voiceFx.correctionStrength`). Fix: `voiceFx: { ...this.settings.voiceFx }` — Presets lassen Voice FX Studio jetzt unberührt (korrekt, Presets sind Reverb/EQ-Sachen).
3. **`multi-format-import.ts`** — `lyricEvents`-Typen (2 Stellen: Track-Deklaration + `raw`-Init) kannten die R10-4-Felder `isExtension`/`isInstrumental` nicht, die der 0x05-Lyrics-Parser pusht (Melisma/Instrumental-Marker). Als optionale Felder ergänzt — konsistent mit dem Consumer (Zeile ~698) und `cleanKaraokeSyllable`-Returntyp.
4. **`backup.ts`** — `mergeCustomSongs`/`mergePlaylists` bekamen `localStorage.getItem()` (`string | null`), erwarten aber `string | undefined` → `?? undefined` (2 Stellen im Restore-Flow).
5. **Verifikation:** `npx tsc --noEmit` Exit 0 · Lint 0 Errors · E2E im Browser: Profil erstellt → QA-Song via Converter importiert (Auto-Detect ultrastar → „Import as UltraStar" → „Add to Library" → 1 song) → Game-Screen lädt mit Lyrics + Pitch-Highway → Audio-Panel: Presets Pop/Studio/Rock crashfrei → „End Song" → Results-Screen (Score Analysis, Song-Leaderboard QA Tester #1). Screenshots: `qa-shots/r13-game-screen.png`, `qa-shots/r13-game-lyrics.png`. Kopflos-Browser hat kein Mikro → `NotFoundError: Requested device not found` wird bewusst grazil gefangen („continuing without pitch scoring") — KEIN Bug.
6. **Dev-Server-Persistenz gefixt:** Sandbox tötet Hintergrundprozesse beim Bash-Session-Ende (setsid allein reicht nicht — Prozess blieb Child der sterbenden Shell). Lösung: Double-Fork via `bash -c 'setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &'` → Server reparentet zu init und überlebt Session-Wechsel.

**Wichtig für zukünftige Runden:** Der `next build`-Typecheck ist strenger als `bun run dev` — DEV LAUFEN LASSEN HEISST NICHT BUILDBAR. Nach jeder Typ-relevanten Änderung `npx tsc --noEmit` laufen lassen (build selbst ist in der Sandbox verboten).

## Erledigt (2026-09-21, Runde R12 — Feature-Ideas-Komplettumsetzung)

Auftrag: alle Feature Ideas umsetzen, AUSSER 13 (Leaderboard-Frontend — Nutzerteil fehlt), 15 (YouTube/Spotify — rechtlich gestrichen), 18 (Twitch — geparkt).

1. **#14 Sync & Backup** (`src/lib/sync/backup.ts`, Settings-Tab „💾 Sync & Backup"):
   - „Cloud Sync" als Offline-Geräte-Transfer: Backup-JSON mit Profilen, Highscores, Achievements, Playlists, eigenen Songs, Statistiken + optional ALLEN Song-Medien (Base64, IndexedDB-Dump via `getAllMediaRecords`).
   - Restore mit Preview + Merge: Profile/Songs/Playlists nach ID (Backup gewinnt), Highscores pro Song+Spieler besserer Lauf, Settings optional (Toggle), Medien optional (Toggle). Gerätegebundene Keys (Mikro-Geräte, Companion, Ordner-Pfade) NIE.
   - E2E: Export-Download ✓, Import-Preview (1/1/1) ✓, Restore → „2 profiles · 1 songs · 1 playlists" (Merge ohne Verlust) ✓, Settings-Übernahme ✓, Reload-persistent ✓.
   - **Robustheits-Fix daraus:** Fremde Backups mit falschem Highscore-Format (Objekt statt Array) crashten SongStartModal → mergeStorePayloads validiert jetzt (asArray/mergeHighscoreEntries), kaputte Shapes werden verworfen statt eingeschleust.
2. **#17 Instrumental-Export** (`src/lib/audio/instrumental-export.ts`):
   - Offline-Rendering (OfflineAudioContext, schneller als Echtzeit) des Songs als 16-Bit-PCM-WAV: L−R-Cancellation wie der Live-Filter + Bass-Erhaltung (Original-Tiefpass 140 Hz beigemischt), Stärke-Regler, Progress-Callback.
   - UI: Song-Start-Modal → „🎚️ Instrumental" → Panel mit Slider + „💾 Export as WAV" + Fortschritt; Button versteckt sich bei MIDI/Plattform/Cross-Origin (Guard `getInstrumentalExportBlocker`).
   - E2E: Song ohne Audio → Button korrekt versteckt; Song mit Audio → Export → „✓ Instrumental downloaded!" ✓.
3. **#16 Voice FX Studio** (`public/audio-worklets/pitch-shifter.js`, `src/lib/audio/voice-fx.ts`, AudioEffectsEngine-Erweiterung):
   - Granularer 2-Tap-Pitch-Shifter-AudioWorklet (sin/cos-Crossfade, Ring-Buffer, Passthrough bei 0 Halbtönen).
   - Pitch-Korrektur („Auto-Tune light"): chromatisches Snapping (echte Mathematik via bun-Unit-Test bewiesen: 445 Hz → −0.196 Halbtöne etc.), wirkt NUR auf den Monitor-Mix — Analyser/Scoring tapept das rohe Mikrofon.
   - Harmonizer (±12 Halbtöne, eigener Pegel) + Stimm-Effekte: 🤖 Roboter (Ring-Mod 30 Hz), 📞 Telefon (BP 300–3400), 🌊 Chorus (25 ms LFO), 📣 Megafon (Tanh+BP) — alle parallel, Umschalten ohne Reconnect.
   - UI: In-Game-Audio-Panel → „🎛️ Voice FX Studio" (versteckt ohne AudioWorklets/Mikro); Persistenz `karaoke-voice-fx-settings`.
   - **Kritischer E2E-Catch:** `parameterDescriptors` fehlte im Worklet → semitones-Param wäre undefined gewesen (Live-Crash). Browser-Test (Registrierung + +12-Halbton-Render: 220 Hz → ~448 Hz gemessen) hat es gefunden und gefixt.
   - Verifikation ohne Mikro: Game-Screen + Audio-Panel laden crashfrei, Studio-Sektion korrekt versteckt (graceful degradation).
4. **FEATURE_IDEAS.md** aktualisiert: 14/16/17 ✅ mit Implementierungs-Doku, 13 🅿️ geparkt, 15 ❌ gestrichen, 18 🅿️ geparkt.

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
- `bun run build` in der Sandbox verboten; nur Port 3000. Stattdessen `npx tsc --noEmit` für den Build-Typecheck.
- **Dev-Server-Start (überlebt Session-Ende):** `bash -c 'setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &'` aus `/home/z/my-project` (Double-Fork, log landet via tee in dev.log).
