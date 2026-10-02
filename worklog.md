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

---
Task ID: r46
Agent: main (Z.ai Code)
Task: User-Report „Ich habe immer noch die Cover Fehler" (ERR_FILE_NOT_FOUND auf tote blob:-URLs, erstmals bewusst aufgetreten bei R25) — wirklich intensive Ursachenforschung nach 5 gescheiterten Fix-Runden.

Work Log:
- RE-VOLLAUDIT aller 24 revokeObjectURL-/16 createObjectURL-Stellen; Lebenszyklus-Analyse beider URL-besitzenden Module (media-db songUrlCache, file-storage blobUrlCache) und aller Restore-Pfade; R24/R25-git-diffs geprüft (R24s song-library-Änderung = reine Filter-Logik, kein Blob-Bezug; R25 machte die reactive Library — Verstärker des damaligen Generation-Revoke-Bugs, aber seit R26/R41 behoben).
- EMPIRISCHE TAURI-SIMULATION (die Lücke aller vorherigen Runden): window.__TAURI_INTERNALS__.invoke-Stub (Fake-FS: Cover-PNG/TXT/Dir-Listings) + Revoke/Create-Falle mit Stack-Traces, aktiviert per temporärem document_start-Hook (Layout-Head-Skript, vor Commit wieder ENTFERNT). Damit lief der TAURI-Pfad erstmals vollständig im QA-Browser: isTauri()=true, nativeReadFileBytes → Stub, kompletter Cover-Restore durch getSongMediaUrl.
- WALKTHROUGH-Ergebnisse am VOR-Fix-Code: Boot-Restore sauber (4 Tauri-Cover, 0 Revokes), Motto-Preview lädt KEINE Cover-Bilder (entlastet R24-Verdacht), Voting-Modal 3 lebendige Cover + close-sicher (R43-Fix hält; URLs überleben das Schließen, fetch 200), KEIN reproduzierbarer Täter im aktuellen Code — aber zwei echte Funde: (a) Tauri-Lücke: storedMedia-Songs (Converter-Importe) bekamen im Tauri-Zweig NIE ein Bibliotheks-Cover (Zweig restaurierte nur relativeCoverPath-Songs; das Voting-Modal lud Cover nach, das Grid nicht), (b) media-db-Invalidation + file-storage-Ersetzungspfad revokierten Cover-URLs noch verzögert (30s) — die letzten beiden Code-Stellen, an denen angezeigte Cover sterben konnten.
- SCHLUSSFOLGERUNG: Weiteres Einzel-Täter-Jagen ist das falsche Werkzeug — jede neue Consumer-Stelle kann die Bug-Klasse neu öffnen (R43-Voting-Modal: 9 Runden Audit-Blindspot). FIX-ARCHITEKTUR: FehlerKLASSE unmöglich machen.
- FIX 1 — NEU src/lib/blob-url-guard.ts: URL.revokeObjectURL wird gepatcht; jede als SHARED registrierte URL (media-db-Cache-URLs, Tauri-Cover-URLs: Cache + Scan-Fallback + Heilung) ist vor FREMD-Revokes geschützt — Aufruf wird ignoriert + Console-Warnung mit Stack-Trace und Eigentümer (z.B. „media-db qa-sm-4 cover"). Besitzer revokieren über revokeObjectURLInternal (Escape-Hatch). Unregistrierte URLs unverändert. SSR-sicher, idempotent, Modul-Singleton.
- FIX 2 — song-library.ts Tauri-Zweig: gespeicherte storedMedia-Cover-URLs werden jetzt aus der media-db mitrestauriert (asyncPool 20); Kommentar dokumentiert die Lücke.
- FIX 3 — media-db: invalidateCachedSongUrl (storeMedia-Ersetzung) und revokeAllSongMediaUrls revokieren Covers NIE mehr (nur Cache-Drop; Audio/Video behalten 30s-Revoke); scheduleCachedUrlRevoke läuft über Internal-Hatch.
- FIX 4 — file-storage-media: cacheBlobUrl-Ersetzungspfad deckt Covers jetzt aus (isCoverKey-Helfer vereinheitlicht evict/clear/cache/refresh); alle entstehenden Cover-URLs werden im Guard registriert.
- E2E am FIXIERTEN Code: Tauri-Sim-Bibliothek 8/8 lebendig (4 Tauri + 4 gespeicherte via FIX 2 — vorher 0) · Fremd-Revoke-ANGRIFF: BLOCKIERT, URL lebt (fetch 200), img rendert 300px, Warnung „[BlobUrlGuard] BLOCKIERT: … (media-db qa-sm-4 cover)" · Voting-Modal 3/3, close-sicher (Regression) · Browser-Zweig 4/4 gespeicherte Cover (Regression) · tsc Exit 0 · eslint 0 Errors (8 vor-bekannte song-library-Warnungen, keine in neuen Zeilen).
- QA-Sim-Artefakte dokumentiert: unregisterListener-TypeErrors (@tauri-apps/api-Events gegen den Fake-Callback) NUR in der Simulation; in der echten Tauri-App nicht existent (reale APIs). Temporärer Layout-Hook + public/__kz-sim.js VOR dem Commit entfernt (git status sauber).
- QA-Infrastruktur für Folge-Runden: /tmp/kzqa-chrome-Profil (CDP 9222) enthält den Seed (9 QA-Songs: 4 gespeicherte mit media-db-Covern, 4 Tauri-Ordner-Songs mit baseFolder C:\Users\QA\Songs + relativeCoverPath, 1 ohne Cover; Profile Anna/Ben in karaoke-successor-storage; Fake-Mic qa-mic-1; localStorage kz-sim-active=0). Tauri-Sim-Verfahren: Hook-Skript vor App-Code (document_start) mit __TAURI_INTERNALS__-Stub — Anleitung im r46-Worklog-Kontext des Git-Commits; Chrome-Start: ~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/kzqa-chrome --no-sandbox (Double-Fork).

Stage Summary:
- Die Cover-Fehlerklasse ist jetzt SYSTEMISCH unmöglich: geteilte Cover-URLs können von keinem Consumer mehr getötet werden (Guard blockiert + benennt den Täter im Console-Log — die nächste Nutzer-Report enthält, falls wieder etwas versucht zu töten, den Stack-Täter beim Namen).
- Tauri-Lücke geschlossen: Converter-Importe (gespeicherte) zeigen jetzt auch im TAURI-Bibliotheks-Grid ihre Cover (vorher dauerhaft Platzhalter).
- Letzte zwei tauri-seitigen Sterbe-Stellen (Invalidierung/Eersetzung) decken Covers aus — konsistente Nie-Revoke-Politik für Covers über alle Module.
- An den Nutzer: Bundle neu bauen (node scripts/prepare-bundle.mjs) und testen. Falls die Konsole JETZT noch Cover-Fehler zeigt, aber KEINE „[BlobUrlGuard] BLOCKIERT"-Warnung enthält, sind die toten URLs Überbleibsel aus Vor-R46-Sessions (Seite neu laden behebt sie); falls Warnungen auftauchen: die Warnung nennt den Täter — bitte Console-Log mitschicken.
- Offen/Risiken: (a) die exakte Ursache der Nutzer-Symptome konnte auch diesmal nicht reproduziert werden (alle historischen Killer im aktuellen Code verifiziert geschlossen); der Guard dreht das Verhältnis um — künftige Täter werden beim Namen genannt statt wirken zu können; (b) Nutzer-Verifikation des R46-Bundles ausstehend; (c) unregisterListener-Artefakte nur Sim; (d) Tauri-Sim-Verfahren ist QA-Werkzeug (nicht gepusht), Worklog-Kontext im Commit d997764e dokumentiert es.
