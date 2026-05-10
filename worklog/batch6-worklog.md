# Batch 6 Worklog

**Datum:** 2026-05-11
**Repo:** karaoke-successor
**Branch:** origin/main

---

## Fix 1: Duet/Duel - Cannot access 'n' before initialization
- Status: 🔧 IN PROGRESS
- Problem: ReferenceError beim Laden eines Duet-/Duel-Songs: Cannot access 'n' before initialization im useMemo/forEach der Duet-Verarbeitung
- Lösung: TBD

## Fix 2: PTM Pause-Button stoppt Video nicht
- Status: ⏳ PENDING
- Problem: Pause-Button stoppt das Game aber Video läuft weiter. Escape-Taste stoppt alles korrekt. Beide sollen gleich funktionieren.
- Lösung: TBD

## Fix 3: PTM - Beenden-Button entfernen
- Status: ⏳ PENDING
- Problem: Beenden-Button soll komplett entfernt werden (Pause/Escape reicht aus)
- Lösung: TBD

## Fix 4: Duet-Songs aus Party-Modes ausschließen
- Status: ⏳ PENDING
- Problem: Duet-Songs erfüllen oft nicht Party-Mode-Kriterien und sollen komplett ausgeschlossen werden
- Lösung: TBD

## Fix 5: Editor volle Breite + Settings-Header zentriert
- Status: ⏳ PENDING
- Problem: Editor soll volle Breite nutzen, Settings-Menü-Header mit Tabs soll zentriert sein
- Lösung: TBD

## Fix 6: Parser forcierten Zeilenumbruch
- Status: ⏳ PENDING
- Problem: Bei zu kurzer Beat-Pause zwischen Dash-Beat-Marker und nächstem Text wird kein Zeilenumbruch durchgeführt
- Lösung: TBD

## Fix 7: Doppelte Blink-/Einblende-Funktion
- Status: ⏳ PENDING
- Problem: Nach Fix 8 (17424e3) scheint die Funktion doppelt vorhanden zu sein
- Lösung: TBD

## Fix 8: Karaoke-Spiel Performance
- Status: ⏳ PENDING
- Problem: Spiel wirkt stockend trotz vorher flüssigerer Performance
- Lösung: TBD
