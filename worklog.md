# Karaoke ZERO — Worklog

> **Datei-Landkarte & Architektur:** `ARCHITECTURE.md` · **Detail-Historie (jede Runde ausführlich beschrieben):** `git log` (Runden-Commits findbar per `git log --grep='R44:'` usw.) · **Frühere Worklog-Fassungen:** `git log -- worklog.md`.
>
> **Neue Einträge:** unten im Format `--- / Task ID: r<N> / Agent / Task / Work Log / Stage Summary` anhängen — bestehende Abschnitte nie überschreiben. Nächste freie Runde: **R46**.

## Projekt-Status (nach R45)

- Karaoke ZERO — Next.js 16 (App Router) · Desktop `localhost:3000` + Companion-App `/mobile` · Produktionsziel: Tauri-WebView (Windows). Dev-Server läuft auf Port 3000.
- Qualität: `npx tsc --noEmit` 0 Fehler · Lint 0 Errors (~867 Warnungen, prä-existentes Bestands-Niveau). HEAD: `e3dd32a8` (R45). GitHub-Sync per post-commit-Hook aktiv.
- Letzte User-Feedback-Iteration **R43–R45** abgeschlossen und E2E-verifiziert:
  - **Cover-Bug endgültig behoben** (3 Root-Cause-Runden): SongVotingModal revokierte geteilte media-db-URLs (R43) · Tauri-Eviction/Restore-Politik (R44) · Self-Healing in SongCard für beide Quellen (media-db + Tauri-Ordner).
  - **PTM-Spielerwechsel ist rein logisch:** Mic-Handoff-Effekt komplett entfernt — EIN Gerät wird 1× pro Spiel geöffnet, der Wechsel ändert nur Punkteverteilung + Übergabe-Overlay; MicIndicator zeigt den Live-Sänger.
  - **Humming-Filter komplett entfernt** (VocalDetector gelöscht, 20+ Dateien befreit) + Scoring-Volume-Deadzone raus (war strenger als der Pitch-Detector → Wertungs-Aussetzer bei leisen langen Noten).
  - **409-Spam behoben:** alle 8 gamestate-Sender laufen über `postGameState()` (senderId + Backoff).
  - **UI/UX:** Tutorial-Overlay 0.92 · Mic-Aktivkarte im Setup · Auswertungs-Redesign + ShareBox 5.1–5.9 (Video garantiert ohne Ton) · Companion-Sprachwahl · 8-stufige Rating-Skala · Fuzzy-Exakt-Suche per Anführungszeichen.

## Offene Punkte / nächste Schritte

1. **Nutzer-Verifikation ausstehend:** Tauri-Cover-Fixes sind code-verifiziert (tsc + Logik-Review + Browser-Regression des geteilten Heilungs-Codes), laufen real aber nur in der Nutzer-App — Bestätigung kommt mit dem nächsten Nutzer-Report.
2. `node scripts/prepare-bundle.mjs` (TS-Check) führt der NUTZER selbst aus — nie der Agent.
3. PTM unterstützt bewusst keine Per-Spieler-Mics (Shared-Mic-Architektur) — bei künftigem Wunsch wäre der Spielerwechsel-Punkt wieder der Angriffspunkt.
4. Audio-/Video-Blob-URLs werden bei Cache-Eviction verzögert revokiert (gewollt; Covers niemals) — theoretisch könnte eine Session mit >2000 Medien-Zugriffen ein pausiertes Audio treffen.
5. **Backlog (nachrangig):** `FEATURE_IDEAS.md` priorisieren · BR mit echten Mikrofonen testen (nicht headless-fähig) · MIDI-Silben-Zuordnung bei mehrstimmigen Spuren verfeinern (Track-Picker = Rückfallebene) · prä-existente Lint-Warnings (~867) schrittweise abbauen.

## Wichtige Konventionen

- **i18n:** neue Keys immer zuerst in **de UND en** (`src/lib/i18n/locales/{de,en}/…`); 14 weitere Locales per Subagent über delta.ts (nested objects, alphabetisch, Locale-Quote-Stil); en-Fallback; Verifikation über Flat-Map aus `locales/index.ts`.
- **Sandbox:** `bun run build` verboten → stattdessen `npx tsc --noEmit`. Nur Port 3000. Lint + tsc laufen in jeder Runde.
- **Dev-Server:** Start/Neustart nur als Double-Fork-Orphan: `( setsid bun run dev > dev.log 2>&1 < /dev/null & )` aus `/home/z/my-project` — ein Reaper tötet zwischen Tool-Calls alles andere; HMR-Recompile kann ihn trotzdem killen (Neustart + ~16s Warmup einplanen). Custom-Server `server.ts` lädt Socket-Handler nur beim Start → nach Änderungen immer Neustart.
- **gamestate-POSTs:** ausschließlich über `postGameState()` (desktop-instance.ts; senderId + 409-Backoff) — niemals bare fetch mit `type:'gamestate'`.
- **blob-URLs:** Konsumenten revoken NIEMALS URLs, die sie nicht selbst erstellt haben — der Lebenszyklus gehört media-db/file-storage. Covers werden grundsätzlich nie revokiert.
- **Scoring:** genau EIN Noise-Gate (Pitch-Detector: RMS + Volume-Threshold + YIN-Clarity) — keine zweiten Volume-Gates in Scoring-Pfaden.
- **Git:** eine Runde = ein ausführlicher Commit (post-commit-Hook pusht sofort); danach Worklog-Abschnitt anhängen und separat committen.

## QA-Setup (für Cron-/QA-Runden)

- QA-Seeds (Songs, Fake-Mics, Profile) leben im agent-browser-Chrome-Profil (localStorage/IndexedDB) und überleben Server-Neustarts. Demo-Bibliothek: 5 Songs (ABBA/Queen/Nena/MJ/Beatles); Motto „80er Jahre Party" war zuletzt aktiv — vor Motto-abhängigen Tests prüfen.
- Companion-Simulator: `node qa-test-song/companion-sim.mjs '<profilesJson>'` (Fake-Companions per HTTP-API, Heartbeat 30s).
- Browser-QA ohne Tauri: Song-Import über den Converter (Settings → Library → „Import from other karaoke systems", `public/qa-test.txt` + `qa-test.mp3`; User-MIDI-Beispiele: `upload/*.mid`).
- **Bekannte QA-Fallen:** (a) PTM lehnt Songs <60s still ab (Toast „Song too short") → 70s-QA-Song verwenden; (b) versionsloses `indexedDB.open` erzeugt LEERE DB → Seeds nur von DB-freier Same-Origin-Seite (`/api/songs`) mit eigenem Upgrade-Handler; (c) echter Mic-Storage-Key: `karaoke-multi-mic-config`; (d) Fake-Mics brauchen einen `navigator.mediaDevices.enumerateDevices`-Patch, sonst prunt sie R41 weg; (e) headless: getUserMedia-NotFoundError ist erwartbar — Spiel läuft ohne Pitch-Scoring weiter; (f) PTM-Schedule (Fisher-Yates): Startspieler + Segment-Reihenfolge sind pro Runde zufällig — kein Bug.

## Runden-Index (Kurzfassung — Details: git log)

| Runde | Thema |
|---|---|
| R45 | PTM-Spielerwechsel rein logisch (Mic-Handoff entfernt) · MicIndicator Live-Sänger |
| R44 | Cover-Tauri-Fix (3 Schichten) · PTM-Rucken behoben (überlappungsfreier Mic-Switch + RAF-Churn) · Humming komplett raus · Socket-Log geklärt · ShareBox 5.1–5.9 |
| R43 | Cover-Root-Cause Voting-Modal + Self-Healing · 409-Spam (postGameState) · Tutorial-Overlay 0.92 · Mic-Aktivkarte |
| R42 | Companion-Sprachwahl · Auswertungs-Redesign (8-stufige Rating, 1080p ohne Scroll) · Fuzzy-Exakt-Suche per Anführungszeichen |
| R41 | 11 Punkte: Cover-URLs (3 Tötungspfade) · Library-Snapshot · Filter-Highlights · Mic-Prune · Flaggen |
| R40 | Build-Fix + Companion-Profiles-Menü zurück (R39/P9-Rücknahme) |
| R39 | Companion-App-Überarbeitung, 10 Punkte (Modus-Kacheln, Cover-Proxy, Queue-Vollsteuerung, Jukebox, Webcam-Sync) |
| R38 | Neon-Scrollbars app-weit (theme-gebunden) · Double-Fork-Dev-Server-Konvention etabliert |
| R37 | Handy „Song beenden" (companion_end_early) · getpitch-429-Flut behoben · Pause-Latch CPTM/PTM |
| R36 | GAME_PIN/Loopback-Fix · Medley-Companion-Gesang komplett (Mirror + Auto-Sing) |
| R35 | Companion-Verbindungserkennung Root-Cause (Server-Purge/Re-Register + Reconcile) |
| R34 | Cover-Robustheit (3-Ebenen-Retry) · Companion-Erkennung (Zuweisungs-Panel + Profil-QR) · PTM-Tutorial-Fakten korrigiert |
| R33 | Companion-Shell-Neubau, 20 Punkte (Jukebox, Daten-Views, Settings-Mirror, Rechte) |
| R32 | Feinschliff („Glätte den Rest") · Tutorial-Beschreibungen vs. reale Funktionen geprüft |
| R31 | i18n-Vollabdeckung (1054 fehlende Keys je Sprache nachgeholt) |
| R30 | Tutorial-i18n in alle 16 Sprachen |
| R29 | Tutorial-Großausbau: 8 Touren + „Mehr erfahren"-Deep-Dives |
| R28 | Settings-Intro-Karten · Settings-Tour · ?-Hilfebutton in der Navbar |
| R27 | Companion-Remount-Fix (Single-Writer-Election + Grace-Window) |
| R26 | Cover-Bug-Klasse (4 Auslöser: Generations-Grace, SafeImage, Media-Persistenz) |
| R25 | Motto-Party auf Library + Companion ausgeweitet (generischer Filter) |
| R24 | Motto-Party-Settings (Filter-Engine + Live-Vorschau + Persistenz) |
| R23 | Setting „Genres & Sprachen" (Custom-Taxonomie, systemweit kanonisch) |
| R22 | UltraStar Variante-2-Klarstellung (Doppel-Space-Regel, Unit 48/48) |
| R21 | UltraStar Variante 2 (Leading-Space-Wortgrenzen) |
| R20 | Medley-Abort-Dialog · BR friert bei Dialogen ein · Note-Colors entfernt |
| R19 | BR-Neugestaltung: Per-Runden-Reset + Stechen/Münzwurf (Bounty/Trend entfernt) |
| R18 | Design-Diskussion Score-Reset pro Runde (Entscheid → R19) |
| R17 | Bounty-Fairness-Analyse (mathematisch; Entscheidung → Reset-Variante) |
| R16 | BR-Eliminations-Countdown prominent + Bounty-Unit-Test |
| R15 | BR-Feinschliff + Import-Funktionen aus Settings entfernt |
| R14 | Editor-Drag-Feel · Zoom 500% · Import-Preview (Dead Code) · AppData-Persistenz · BR-Pitch-Hold |
| R13 | Build-Fix (5 Typfehler) |
| R12 | Feature-Ideas-Komplettumsetzung |
| R11 | Voll-QA aller R10-Features + UX-Fix |
| R10 | BR-Rhythmus sichtbar · Queue-Playlist-Ausnahme · Duett-Badges · Converter-Redesign · MIDI/KAR-Qualität |
