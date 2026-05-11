# Batch 7 Worklog — Universal HUD + Dateistruktur-Aufräumung + Score-Vereinheitlichung

**Datum:** 2026-05-11
**Repo:** karaoke-successor
**Branch:** origin/main

---

## Schritt 1: Doppelte Dateistruktur aufräumen
- Status: ✅ DONE
- Commit: b5d366a
- Problem: Alle Dateien existieren doppelt (`src/components/` und `components/` auf Root). Die `tsconfig.json` mappt `@/*` auf `./src/*`, also baut der CI nur aus `src/`. Die Root-Duplikate sind toter Code.
- Plan: Root-Verzeichnisse (`components/`, `app/`, `hooks/`, `lib/`, `types/`, `__tests__/`) prüfen ob sie Duplikate von `src/` sind, dann löschen.

## Schritt 2: Universal HUD — Grundkomponenten extrahieren
- Status: ✅ DONE
- Commit: 141618c
- Plan: `PauseButton`, `FullscreenButton`, `WebcamButton`, `DifficultyBadge` als eigene Komponenten in `src/components/game/hud/` extrahieren.

## Schritt 3: Universal HUD — GameHudShell zusammenbauen
- Status: ✅ DONE
- Commit: 141618c
- Plan: `GameHudShell` Komponente mit Layout-Slots:
  - Links: PauseButton
  - Rechts: DifficultyBadge + WebcamButton + FullscreenButton
  - Unten: BottomBar (GameProgressBar + TimeDisplay)
  - Overlay: GameCountdown

## Schritt 4: Universal HUD — In Game-Screens integrieren
- Status: 🔲 PENDING
- Plan: GameHudShell in Single-Player, PTM, Battle Royale, Medley, Companion Screens integrieren. Inline-Controls entfernen.

## Schritt 5: Score-Anzeige — Single-Player
- Status: 🔲 PENDING
- Plan: Prominente Score-Anzeige oben zentral: Real-Time-Score groß, Combo-Counter klein darunter. Playername links + Profilbild. ProminentScoreDisplay + GameScoreDisplay vereinen.

## Schritt 6: Score-Anzeige — Duel/Duet/Game-Modes (Split-Screen)
- Status: 🔲 PENDING
- Plan: Bestehende Split-Screen-Lösung beibehalten, Combo-Counter ergänzen, Profilbilder ergänzen. Anwendbar auf: Duel, Duet, Medley, Missing Words, Blind, Tournament, Online Multiplayer.

## Schritt 7: Score-Anzeige — PTM + Companion
- Status: 🔲 PENDING
- Plan: PTM: Prominente Score-Anzeige zentral (Score+Combo+Name+Profilbild), wechselt pro Spieler. Team-Score rechts daneben. Live-Table links (smooth sortiert). Companion: Gleiche Lösung vorbereiten und implementieren.

## Schritt 8: Score-Anzeige — Battle Royale
- Status: 🔲 PENDING
- Plan: Alle Player am oberen Rand (ggf. mehrere Reihen). Score-Card: Real-Time-Score + Name + Profilbild. Eliminierte Player ausgegraut + geschrumpft, Score stoppt.
