# Karaoke ZERO — Worklog

> **Datei-Landkarte & Architektur:** `ARCHITECTURE.md` · **Detail-Historie (jede Runde ausführlich beschrieben):** `git log` (Runden-Commits findbar per `git log --grep='R44:'` usw.) · **Frühere Worklog-Fassungen:** `git log -- worklog.md`.
>
> **Neue Einträge:** unten im Format `--- / Task ID: r<N> / Agent / Task / Work Log / Stage Summary` anhängen — bestehende Abschnitte nie überschreiben. Nächste freie Runde: **R50**.

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

---
Task ID: r47
Agent: main (Z.ai Code)
Task: Zwei Nutzer-Wünsche: (1) Fill-Missing-Quote verbessern (nur 5-10 von 100 Songs zuordenbar, auch populäre Titel nicht) + ggf. weitere Quellen; (2) Rule-based Harmonization um die komplette Genre-Liste aller bekannten Ultrastar-Datenbanken erweitern (upload/Genres.txt, ~780 Zeilen).

Work Log:
- Ursachenanalyse Fill Missing: Deezer-Quoted-Search (`artist:"X" track:"Y"`) scheitert an feat.-Artists/Klammern/Tippfehlern (0 Ergebnisse, kein Fallback); MB-Recording-Genres sind dünn + Score-Gate 85 streng; im Sandbox ist Deezer zusätzlich 403-geoblockt. Nutzer-App (Tauri, ohne AI-Config) lief also fast nur auf MB → 5-10 %.
- NEUE PRIMÄRQUELLE iTunes/Apple Music Search API: keyless, country=DE (deutsche Künstler → korrekt „Schlager"), plain term search (robust), primaryGenreName + releaseDate. Quelle 1 der Kette: iTunes → Deezer → MusicBrainz (per-Feld-Merge; MB-Release-Group-Jahr überschreibt als Original-Release-Autorität).
- Query-Cleaning (feat./Parenthelsen/Brackets) + gemeinsame Kandidaten-Gate (Artist-Containment mit The-Stripping, Title-Scoring exakt>Prefix, Bevorzugung un-dekorierter Original-Releases) + Apostroph-Toleranz („Dont Stop Me Now" ≡ „Don't Stop Me Now").
- Deezer: plain-Fallback wenn quoted nichts liefert. MB: Score 85→70, RG-Genre-Lookup (inc=genres) als letzte Genre-Hoffnung.
- mapGenre-Fallback auf canonicalizeGenre: die ~700 GENRE_ALIASES sind jetzt Single Source of Truth für Factual-Lookup UND Rule-Harmonizer (Quell-spezifische Maps nur noch für Deezer-FR-Schreibweisen).
- GENRE_ALIASES um ~370 Einträge erweitert (komplette Ultrastar-Inventarliste: 699 unique Tags — inkl. Typo- und Diakritika-Varianten), familien-organisiert nach logischen Eltern-Regeln; +42 UNMAPPABLE-Pseudo-Genres; SEASONAL_GENRE_PATTERN um carol/villancico/kolędy erweitert (beide Dateien synchron).
- Voll-Verifikation der Liste per bun-Skript: 640 auto-gemappt, 53 manuell, 6 saisonal geschützt, 0 Durchrutscher (ursprünglich 18 — u. a. Misch-Schreibweisen „Québecois"/„Variete Française" aus der Liste entdeckt und ergänzt).
- E2E: API-curl 12/12 populäre Songs in 11 s (11 iTunes, 1 MB; genres+jahre korrekt), 13/16 dreckige Daten (feat./Typo/Umlaute/Klammern) → gesamt 25/28 = 89 % (vorher 5-10 %). UI-E2E im QA-Chrome (CDP 9222): Test-Songs per IndexedDB eingefügt → Fill Missing zeigt 🍎 iTunes-Badge „Rock"/„1987" mit Begründung; Rule-Plan zeigt „Neue Deutsche Härte → Metal" live; Test-Songs danach entfernt (9 Seeds unversehrt).
- tsc 0 Fehler, eslint 0 Errors (830 Warnungen, unter Bestandsniveau), Dev-Server-Neustart nach HMR-Kill (Double-Fork-Konvention), Konsole nach Reload sauber.

Stage Summary:
- Fill Missing: erwartbare Quote von 5-10 % auf ~90 % (populäre Songs 100 %) — iTunes als Primärquelle + robustes Matching; alle drei Quellen mit Fast-Fail-Markern; Antwortzeit ~1 s/Song (vorher ~5.4 s).
- Rule-based Harmonization: jedes bekannte Ultrastar-Genre-Tag hat jetzt ein definiertes Verhalten (Auto-Mapping, manuelle Liste oder saisonal geschützt).
- OFFENE FRAGEN an den Nutzer (Grenzfälle, im Code mit `// → ASK` markiert): (1) Anime/Manga/Ghibli/Cartoons → Soundtrack (alternativ J-Pop)? (2) City Pop → J-Pop (alternativ Pop)? (3) Christian/Worship/Papiez-Cluster → Soul wie Gospel (stil-spezifische bleiben: Christian Rock→Rock, Christian Metal→Metal)? (4) Nationalhymnen (national anthem/himno patrio/hymne) → Classical? (5) Disco Fox/Disco Polo → Electronic (alternativ Schlager)? (6) Pimba (PT) → Schlager, Narodno zabavna (Balkan) → Volksmusik? (7) Cabaret/Kabaret → Folk (Chanson-Familie)? (8) Traditional → Folk, Brass → Volksmusik? (9) Epa Dunk (SE) → Schlager, Fußballhits/Karneval/Lagersong → Schlager? (10) Obskure Tags mit Defaults: elektro lore→Electronic, suara→manuell, sprock/grog'n roll/belgium drunk→Rock/Punk, melodica→Reggae, rag→Classical, hauntology/plunderphonics→Electronic, hardmusette→Folk, denpa→Electronic, pony/drag/epic/avantgarde/dreamsmp→manuell. Antworten einfach als Korrekturliste — Einträge werden in meta-normalizer.ts geflippt.
- Risiko: iTunes-Genre ist bewusst grob (primärGenreName); Jahr kann bei Best-of-Tracks vom Original abweichen (MB-RG greift als Korrektur, wenn es läuft). Deezer bleibt in geoblockten Netzen tot — unkritisch, iTunes deckt ab.
- Nutzer-Hinweis: Bundle neu bauen (`node scripts/prepare-bundle.mjs`) und Fill Missing erneut laufen lassen — die Quote sollte nun drastisch höher sein; alte Cache-Einträge (30 Tage TTL) können zuerst noch alte Ergebnisse liefern.

---
Task ID: r48
Agent: main (Z.ai Code)
Task: Nutzer-Antwort auf die R47-Grenzfallfragen: „Ich stimme deinen Vorschlägen zu" + wichtiger Zusatzhinweis — Schlager ist nicht immer DEUTSCHER Schlager, es gibt Schlager auch in anderen Sprachen.

Work Log:
- Alle 10 R47-Grenzfallfragen waren vom Nutzer bestätigt → Werte in meta-normalizer.ts unverändert; alle `// → ASK`-Marker zu `R48-bestätigt` umbenannt + Header-Kommentar dokumentiert, dass die Werte final sind (Anime/Ghibli/Manga→Soundtrack, City Pop→J-Pop, Christian/Worship/Papiez→Soul, Nationalhymnen→Classical, Disco Fox/Disco Polo→Electronic, Pimba/Epa Dunk/Fußballhits/Karneval→Schlager, Cabaret/Kabaret/Traditional/Hardmusette→Folk, Brass/Narodno zabavna→Volksmusik, Melodica→Reggae, obskure Tags→Electronic/Rock/Punk bzw. manuell).
- Analyse aller Schlager→Sprache-Kopplungen im Code: genau 3 Stellen — harmonize/route.ts (Genre-Zeile „distinct German genre" + Language-Hint „Schlager→German") und song-identify/route.ts („German-language genre"). Fill Missing (music-lookup) leitet NIE Sprache ab (nur Genre/Jahr) — dort war nichts zu ändern. Volksmusik/Chanson/Canzone bleiben bewusst sprachgebunden (per Definition).
- harmonize/route.ts: Language-Hints umgebaut — „Genre→language (by definition)" nur noch Volksmusik/Chanson/Canzone; NEU explizite Regel „Schlager does NOT imply German — derive language from the ARTIST, never the genre" mit Beispielen (Helene Fischer→German, André Hazes→Dutch, Katri Helena→Finnish). Genre-Zeile: „distinct genre that also exists OUTSIDE German (Dutch levenslied, Belgian, Danish, Italian, Finnish iskelmä)".
- song-identify/route.ts: „distinct German-language genre" ersetzt durch sprach-agnostische Formulierung + Beispiele inkl. André Hazes/Katri Helena; Sprache immer aus Text/Künstler, nie aus dem Genre.
- meta-normalizer.ts Schlager-Familie erweitert um die nationalen Pendants (waren NICHT im Ultrastar-Inventar, machen die Map aber robust): levenslied/smartlap (nl), dansband/dansbandsmusik (se), danseband (no/dk), iskelmä/iskelma (fi) — alle → Schlager.
- Verifikation: 38 Alias-Checks + 7 UNMAPPABLE-Checks per bun-Skript bestanden · AI-E2E live am Dev-Server: harmonize-API schlägt für André Hazes „De Vlieger" (Genre Schlager, Sprache null) jetzt **Dutch** vor (Begründung nennt den Künstler, nicht das Genre), Helene Fischer→German (Regression), Katri Helena→Finnish; song-identify „André Hazes - De Vlieger.txt" → Schlager + Dutch. tsc 0 Fehler, ESLint 0 Errors/0 Warnungen in allen 3 geänderten Dateien. Commit 848c9783, Remote verifiziert.

Stage Summary:
- Genre-Harmonization: alle 699 Ultrastar-Tags haben jetzt FINAL entschiedenes Verhalten (keine offenen ASK-Fragen mehr); Schlager-Familie ist sprach-agnostisch und deckt die internationalen Pendants ab.
- AI-Harmonisierung schließt aus Genre „Schlager" nicht mehr auf deutsche Sprache — die Sprache folgt Künstler/Text (E2E mit 3 Sprachen bewiesen). Nur die echten Sprach-Genres (Volksmusik/Chanson/Canzone) bleiben Kopplungen per Definition.
- Nutzer-Verifikation R46 (Cover-Guard) und R47 (Fill-Missing-Quote ~90 % im Bundle) weiterhin ausstehend — Bundle-Neubau via `node scripts/prepare-bundle.mjs` durch den Nutzer.
- Keine neuen offenen Fragen; nächster sinnvoller Schritt wäre Nutzer-Feedback zu R46/R47/R48 im realen Tauri-Bundle.

---
Task ID: r49
Agent: main (Z.ai Code)
Task: Nutzer-Report: „Cover-guard scheint zu funktionieren. Gut!" + neuer Wunsch — die 89-dB-Reduktion greift in den Previews nicht; bitte auch dort einführen.

Work Log:
- Analyse aller Preview-Audiopfade: genau 3 Stellen mit `new Audio()` und hardcoded Volume, keine las die Preview-Volume-Einstellung oder die Loudness-Normalisierung an: use-library-preview.ts (Bibliotheks-Hover, 0.3), metadata-studio.tsx (Manual-Review-Vorschau, 0.5), use-mobile-song-preview.ts (Companion-Vorschau, 0.6). Neben-Fund: die PREVIEW_VOLUME-Einstellung (Grafik & Sound, Default 30) hatte NULL Consumer — sie fütterte nur den Settings-Slider. Zusätzlich: das SongCard-Video-Element läuft mit Volume 1.0, wenn es die Audiospur trägt (hasEmbeddedAudio/kein audioUrl).
- loudness.ts: NEU applyPreviewVolume(el, songId, mediaUrl, isStillActive?) — wendet sofort die Preview-Volume-Einstellung an (schneller Pfad) und danach asynchron den gecachten 89-dB-Gain (applyLoudnessVolume: Attenuation über element.volume, Boost über Gain-Node — identisch zum Game-Screen); nie werfend, nie blockierend, isStillActive-Guard gegen veraltete Previews. Dazu getPreviewVolumePercent()/isLoudnessNormalizationEnabled().
- Alle 3 Hooks umgestellt + clearLoudnessGain beim Dispose/Stop/Unmount (Gain-Node-Reset). Video-Element in der Bibliothek bekommt dieselbe Behandlung, wenn es hörbar ist (hasEmbeddedAudio || kein audioUrl) — Loudness-Analyse läuft nur für das tatsächlich hörbare Element, kein Doppel-Decodieren.
- Companion-Vorschau (Handy): Analyse läuft einmal pro Song auf dem Gerät (localStorage-Cache), Wiedergabe startet sofort auf Basis-Volume — gleicher Vertrag wie Desktop. iOS-Volume-Limitierung unverändert (element.volume dort read-only, gleiche Limit wie bei den alten Hardcodes).
- E2E im QA-Chrome (CDP 9222, Instrumentierung: Audio-Subclass + createGain-Patch, Test-Song mit echter Audio-URL /qa-test.mp3): (1) Analyse-Pipeline läuft durch den Preview-Pfad (Cache-Eintrag +3.49 dB nach Hover), (2) Boost: Setting 60 → Element-Volume 0.6 + Gain-Node 1.494, (3) Attenuation: Cache −6 dB → Volume 0.3007 = exakt 0.6·10^(−6/20), (4) Normalisierung aus → Volume 0.6 pur, keine Gain-Nodes. Cleanup: Test-Song + gesetzte localStorage-Keys entfernt, 9 Seeds unversehrt, Reload.
- tsc 0 Fehler · ESLint 0 Errors / 7 Warnungen (alle prä-existent, vorher=nachher) · Commit 0130def1, Remote verifiziert.

Stage Summary:
- Alle Preview-Wege (Bibliothek-Hover inkl. Companion-Fernsteuerung, Metadata-Studio-Review, Companion-Songbrowser) nutzen jetzt dieselbe Lautstärke-Pipeline wie das Spiel: Preview-Volume-Einstellung × 89-dB-Normalisierung, asynchron, nie blockierend.
- Die Preview-Volume-Einstellung steuert erstmals tatsächlich etwas (vorher wirkungsloser Slider).
- Video-getragene Previews (eingebettetes Audio) laufen nicht mehr mit Volume 1.0.
- Offen: Nutzer-Verifikation im Tauri-Bundle (R46 Cover-Guard läuft laut Nutzer; R47 Fill-Missing-Quote + R49 Preview-Volume noch ohne Bundle-Feedback).

---
Task ID: r50-i18n
Agent: i18n-subagent (general-purpose)
Task: R50 i18n updates for the 14 remaining locales (delta.ts + tutorial.ts)

Work Log:
- All 14 locales (zh, nl, ru, da, fr, it, fi, ja, no, sv, pl, es, pt, ko) updated in `src/lib/i18n/locales/<locale>/delta.ts` and `tutorial.ts` to mirror the R50 de/en changes (Metadata Studio rename, Rule-based Harmonization editor, select-all warning, Harmonize-AI removal).
- delta.ts per locale: (a) `settingsTabs.taxonomy` → neue Tab-Übersetzung ("Metadata Studio"; zh 元数据工作室, ru Студия метаданных, fr Studio de Métadonnées, es Estudio de Metadatos, ja メタデータ スタジオ, ko 메타데이터 스튜디오, no/sv Metadata-studio, Rest Loanword "Metadata Studio"); (b) `settingsTaxonomy.title/desc/harmonizeHint` erneuert (desc + "view & adjust the harmonization rules", harmonizeHint ohne "AI-" — nur noch regelbasiert); (c) NEUES `settingsRules`-Objekt (37 Keys, alphabetisch, Placeholder {n}/{name} + Emojis ⏸/✋/🎄 erhalten, Doppelquote-Stil des jeweiligen Files); (d) `editor`: +selectAllTitle/Desc/Hint/Confirm (Warnung vor dem Editieren aller Songs, Batch-20-Tipp verweist auf die lokalisierte "Select next {n}"-Schaltfläche) + `studioDesc` neu übersetzt — delta überschreibt damit den veralteten AI-Wortlaut aus library.ts (Merge-Reihenfolge: delta zuletzt).
- tutorial.ts per locale: Settings-Tour-`taxonomy`-Eintrag (title/body/details) neu übersetzt (inkl. neuem "Rule-based Harmonization"-Absatz); 4 weitere Textstellen mit altem Tab-Namen aktualisiert — Bibliotheks-Tour-Filter-Bullet (Verweis "Einstellungen → <Tab>"), Settings-Übersichts-Bullet (jetzt "<Tab>: eigene Genres/Sprachen + Harmonisierungs-Regeln" wie en/de), Begrüßungs-Details + TabBar-Body (Tab-Liste, je 2×). Filter-Bullet-Label ("Custom genres & languages" als FILTER-Name) bewusst NICHT umbenannt (nur der Tab-Verweis), wie in en/de.
- Entfernte R50-Keys (studioModeHarmonize, studioBatchHint, studioBigBatch*) waren in KEINEM der 14 deltas vorhanden (sie leben in den unangetasteten library.ts-Domaindateien) → nichts zu löschen; ungenutzte Alt-Keys dort sind harmlos (en/de-Referenz hat sie ebenfalls nicht mehr, UI verlinkt sie nicht mehr).
- Translation-QA-Fixes während der Runde: fr/tutorial.ts unescaped Apostroph in "règles d'harmonisation" (TS1005, → \'); ja+ko doppeltes Komma nach harmonizeHint-Replace behoben.

Stage Summary:
- 14/14 Locales vollständig aktualisiert (zh, nl, ru, da, fr, it, fi, ja, no, sv, pl, es, pt, ko) — nur delta.ts + tutorial.ts angerührt (28 Dateien), keine anderen Dateien verändert.
- Verifikation: `npx tsc --noEmit` Exit 0 · ESLint auf allen 28 geänderten Dateien: 0 Errors/0 Warnings · `settingsRules` = 37 Keys in ALLEN 14 Locales = exakt en (Aufgabenstellung sagte 36 — en hat real 37; Key-Menge wurde 1:1 auf en gespiegelt, inkl. addTargetLabel) · Flat-Map-Abgleich (merged Barrel, delta merged last) für zh/nl/ru: alle en-settingsRules-Keys + editor.selectAll*/studioDesc vorhanden, effektive Werte zeigen die NEUEN Texte (delta überschreibt library.ts korrekt) · Tutorial-Taxonomy-Titles aller 14 Locales = neue Tab-Namen · Placeholder-Check {n}/{name} bestanden.
- Tab-Namen-Konvention für Folge-Runden: zh 元数据工作室 · ru Студия метаданных · fr Studio de Métadonnées · es Estudio de Metadatos · ja メタデータ スタジオ · ko 메타데이터 스튜디오 · no/sv Metadata-studio · nl/da/it/fi/pl/pt "Metadata Studio" (Loanword).

