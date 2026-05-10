# Batch 6 Worklog

**Datum:** 2026-05-11
**Repo:** karaoke-successor
**Branch:** origin/main

---

## Fix 1: Duet/Duel - Cannot access 'n' before initialization
- Status: ✅ DONE
- Commit: 4e9a148
- Problem: `hasExplicitPlayerMarkers` wurde mit `const` deklariert NACH der forEach-Schleife,
  aber DARIN verwendet → Temporal Dead Zone Fehler.
- Lösung: `sortedLines` und `hasExplicitPlayerMarkers` VOR der forEach-Schleife deklariert.

## Fix 2: PTM Pause-Button stoppt Video nicht
- Status: ✅ DONE
- Commit: 1f5a55e
- Problem: `togglePause()` pausierte nur EIN Media-Element (audio ODER video), nicht beide.
- Lösung: Beide Elemente (audio UND video) unabhängig pausieren/resumen.
  Zusaetzlich `isSongPlaying` im Party-Store synchronisiert.

## Fix 3: PTM - Beenden-Button entfernen
- Status: ✅ DONE
- Commit: 6dc7ac5
- Problem: Redundanter Beenden-Button sollte entfernt werden (Pause/Escape reicht aus).
- Lösung: Button und `onEndSong` Prop aus PtmHudControls und PtmGameScreen entfernt.

## Fix 4: Duet-Songs aus allen Party-Modes ausschließen
- Status: ✅ DONE
- Commit: b4d4448
- Problem: Duet-Songs erfüllen oft nicht Party-Mode-Kriterien.
- Lösung: Neue Funktion `getNonDuetSongs()` in song-library.ts filtert Duet-Songs
  (isDuet=true, [Duet] im Titel, P1/P2 Marker). Ersetzt getAllSongs() in
  allen Party-Mode Kontexten:
  - party-game-screens.tsx (Tournament, Battle Royale, Missing Words, Blind)
  - party-setup-section.tsx (UnifiedPartySetup)
  - ptm-next-song.ts (Random/Medley Song-Auswahl)
  - medley-setup.tsx (Medley Song-Pool)

## Fix 5: Editor volle Breite + Settings-Header zentriert
- Status: ✅ DONE
- Commit: 8f5a0f9
- Problem: Editor sollte volle Breite nutzen, Settings-Header mit Tabs sollte zentriert sein.
- Lösung:
  - Settings-Header (Titel + Untertitel): `text-center` hinzugefügt
  - Tab-Bar bleibt zentriert (`flex justify-center`)
  - Editor: `max-w-7xl mx-auto` wird entfernt wenn Editor aktiv UND bearbeitet
  - `text-center` Wrapper um EditorSettingsTab entfernt (blockiert Vollbreite)

## Fix 6: Parser forcierten Zeilenumbruch
- Status: ✅ DONE
- Commit: 84488dd
- Problem: Bei zu kurzer Beat-Pause wurde kein Zeilenumbruch durchgeführt.
- Lösung: Alte Logik prüfte nur exakte Gleichheit (Set.has).
  Neue Logik: Sortiert alle Line-Breaks sequenziell und scannt pro Note vorwärts.
  Jeder Dash-Beat der bei oder nach dem Noten-Ende liegt, oder vor dem Start
  der nächsten Note, erzeugt einen erzwungenen Zeilenumbruch.

## Fix 7: Doppelte Spielerwechsel-Animation entfernt
- Status: ✅ DONE
- Commit: 72c214b
- Problem: Overlay-Vollendung und useEffect-Segmentwechsel passierten zeitlich versetzt,
  was zu einem doppelten visuellen Effekt führte.
- Lösung: `completeTransition` führt den Segmentwechsel SOFORT aus wenn die Transition
  vom pre-end Warning ausgelöst wurde (`pendingSegmentSwitchRef`). Der useEffect-Fallback
  bleibt für Fälle ohne Warning (z.B. sehr kurze Segmente).
  Das verhindert die doppelte Animation.

## Fix 8: Performance-Optimierung
- Status: ✅ DONE
- Commit: f856569
- Problem: Spiel wirkt stockend/laggy.
- Lösung: Drei Optimierungen:
  1. P0: `useGameStore()` ohne Selector → einzelne Selektoren.
     Destructuring der gesamten Store verursachte ~20-30 Re-Renders/Sekunde.
  2. P0: `React.memo` für `NoteHighway` und `SinglePlayerLyrics`.
     Beide rendernten ~20-30x pro Sekunde ohne Memo.
  3. P1: `notePerformance` Map-Referenz stabilisiert.
     `new Map()` alle 100ms erzeugte neue Referenz, die React.memo
     auf NoteBlock ausser Kraft setzte. Jetzt gleiche Referenz + Versions-Counter.
