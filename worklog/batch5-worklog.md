# Batch 5 Worklog

**Datum:** 2026-05-10
**Repo:** karaoke-successor
**Branch:** origin/main

---

## Fix 1: Companion App nicht erreichbar
- Status: ✅ DONE
- Commit: 076c611
- Problem: Server band nur an 127.0.0.1 (localhost), IP-Erkennung per WebRTC funktioniert nicht in Tauri
- Lösung:
  - Rust: HOSTNAME von 127.0.0.1 auf 0.0.0.0 geändert (3 Stellen in lib.rs)
  - Rust: Neuer Tauri-Command `network_get_local_ip` via UDP-Socket-Trick
  - Frontend: `detectLocalIP()` nutzt jetzt Tauri-Command als primäre Strategie
  - Dev-Script: `-H 0.0.0.0` hinzugefügt für LAN-Zugriff im Dev-Modus
  - mobile-device-section.tsx: Duplizierte IP-Erkennung entfernt, nutzt jetzt geteilte Funktion

## Fix 2: Settings/Editor Titel zentriert - Alternative Lösung
- Status: ✅ DONE
- Commit: 6b268b0
- Problem: Vorheriger Fix entfernte `max-w-7xl mx-auto` wenn Editor-Tab aktiv war
- Lösung: Container behält IMMER `max-w-7xl mx-auto px-4 md:px-6 lg:px-8`. `text-center` wird nur noch als Wrapper um den Editor-Content gesetzt, nicht mehr um den gesamten Container.

## Fix 3: META-Normalisierung für Library 'Group By'
- Status: ✅ BEREITS IMPLEMENTIERT
- Commit: e3a2bc3 (bereits in vorheriger Session)
- Die `groupSongs()` Funktion in `utils.ts` und die Filter in `use-library-filters.ts` nutzen bereits `normalizeLanguage()`, `splitGenres()` und `normalizeGenreName()` aus `meta-normalizer.ts`. Keine weitere Änderung nötig.

## Fix 4: Mikrofon 'Optimale Einstellungen' Button
- Status: ✅ DONE
- Commit: 54d148d
- Problem: `applyOptimalSettingsToAll()` mutierte nur Config im Speicher und wendete Gain an. Mikrofone wurden nicht mit neuen Audio-Constraints (echoCancellation, noiseSuppression, sampleRate) reconnectet.
- Lösung: Funktion nutzt jetzt `updateExtendedConfig()` für jedes Mikrofon, welche korrekt prüft ob ein Reconnect nötig ist und diesen durchführt.

## Fix 5: Duet P1/P2 Trennung - Unmarkierte Lines fehlten
- Status: ✅ DONE
- Commit: 0fceaa1
- Problem: Notes mit `player === undefined` wurden korrekt zu beiden Playern hinzugefügt, aber bei den LINES (Textanzeige) wurden unmarkierte Zeilen herausgefiltert wenn es explizite P1/P2-Marker gab.
- Lösung: `p1Lines` und `p2Lines` Filter inkludieren jetzt auch `!line.player` (unmarkierte Zeilen) für beide Spieler.

## Fix 6: Parser Zeilenumbruch - Nur explizite Marker
- Status: ✅ DONE
- Commit: c170601
- Problem: Automatischer Zeilenumbruch bei >= 8 Beats Abstand zwischen Noten erzeugte unerwünschte Zeilenumbrüche.
- Lösung: Zeilenumbrüche erfolgen NUR noch bei expliziten `- <beat>` Markern. Kein automatischer Gap-basierter Umbruch mehr. Bei Marker wird Force-Break gesetzt, egal wie knapp der Abstand zum nächsten Textteil.

## Fix 7: Duet/Duel Note-Highway Vorschautext
- Status: ✅ DONE
- Commit: 43891e5
- Problem: Im Duet/Duel-Note-Highway gab es keine Textvorschau für die nächste Zeile, was bei schnellen Liedern problematisch ist.
- Lösung: `PlayerLyrics` Komponente in `duet-note-highway.tsx` sucht jetzt auch die nächste Zeile und zeigt sie als kleinen, ausgegrauten Text (text-xs, text-white/30) unter der aktuellen Zeile an.

## Fix 8: PTM Blinken - Randbereich + früher Start
- Status: ✅ DONE
- Commit: 17424e3
- Problem: Vollbild-Blackout war zu intensiv, Pause zwischen Blinken und Spielerwechsel zu lang.
- Lösung:
  - Overlay zeigt nur noch Rand-Glow (box-shadow inset) statt vollem Bildschirm-Blackout
  - Blinken startet 2 Sekunden VOR Ende des aktuellen Segments (während der Spieler noch singt)
  - Blink-Phase: pointer-events-none, blockiert Gameplay nicht
  - Danach kurze Einblendung des nächsten Spielers (0.8s)
  - Dann sofort weiter zum nächsten Lied
  - Hook nutzt neuen `blinkWarningTriggeredRef` für frühzeitiges Triggern

## Fix 9: PTM-Buttons nicht klickbar
- Status: ✅ DONE
- Commit: 7fccba8
- Problem: Controls-Container hatte `z-0` was UNTER dem Spiel-Bereich lag (Dark Overlay `z-5`). Keine Maus-Events und keine Hover-Effekte erreichten die Buttons.
- Lösung: z-index von `z-0` auf `z-50` geändert, damit Buttons über allen Spiel-Elementen liegen.
