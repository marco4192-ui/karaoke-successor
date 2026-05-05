# Karaoke Successor — Worklog

## Session: 2026-05-05 (Kontinuierliches Review — Fortsetzung)

### Schritt 1: TODO-Dateien gelöscht (vorherige Session)
- Commit: e0d1e87

### Schritt 2-10: Vorherige Session (15 Fixes über 5 Commits)
- Siehe oben — alle implementiert und gepusht

### Schritt 11: TSC-Fehlerbehebung nach Branch-Rebase
- `youtube-player.tsx`: Doppelter `export { isYouTubeUrl, isDirectVideoUrl }` entfernt
- 7 Dateien: Icon-Imports von gelöschten Re-Export-Dateien auf `@/components/icons` aktualisiert
  - `add-to-playlist-modal.tsx`, `folder-view.tsx`, `playlist-view.tsx`, `song-card.tsx`,
    `song-start-modal.tsx`, `mobile-mic-view.tsx`, `mobile-songs-view.tsx`
- Commit: 9dbea15 (in Rebase mit c504329 konsolidiert)

### Schritt 12: Offene Verbesserungen (#2 - #15)

| ID | Ergebnis | Begründung |
|----|---------|-----------|
| **#2** | **NOT AN ISSUE** | `DIFFICULTY_SETTINGS` ist `as const` — Property-Zugriff gibt immer dieselbe Referenz zurück |
| **#4** | **FIXED** | lyric-line-display.tsx: 5s Polling-Interval entfernt (Tauri = Single-Window) |
| **#5** | **FIXED** | use-multi-pitch-detector: `isInitialized` aus Dependency entfernt, `isInitializedRef` im catch |
| **#6** | **FIXED** | use-multi-pitch-detector: `getPlayerPitch` nutzt `playerPitchesRef` statt State |
| **#7** | **FIXED** | use-multi-pitch-detector: Cleanup ruft jetzt `destroy()` auf Singleton |
| **#8** | **NOT AN ISSUE** | `updatePlayerScore` wird immer mit 1 Tick pro Call aufgerufen — korrektes Design |
| **#11** | **NOT AN ISSUE** | 80ms setInterval ist korrekt für Audio-gesteuertes Spiel (nicht Display-gesteuert) |
| **#12** | **FIXED** | medley: `initialMappedPlayers` mit `useMemo` statt jedem Render neu berechnet |
| **#13** | **FIXED** | medley: Double-click-Guard für `onRecordAndEnd` in Round Results |
| **#14** | **NOT AN ISSUE** | Shallow Clone ist in Ordnung — lyrics werden nie in-place mutiert |
| **#15** | **NOT AN ISSUE** | Cache-Length-Vergleich ist korrekt — bei App-Start ist Cache null |

**Commits:**
- `3eb32a6` — imp#4: lyric-line-display Polling entfernt
- `f3eb8ed` — imp#5,6,7: multi-pitch-detector stale closure + ref + destroy
- `ccb311e` — imp#12,#13: medley initialMappedPlayers useMemo + double-click guard

### Zusammenfassung aller Sessions
- **18 Fixes** über 8 Commits gepusht
- **0 TSC-Fehler**, 0 ESLint-Fehler
- **7 Dead-Code-Items** entfernt
- **20 False Positives** verifiziert und dokumentiert
- Alle 13 offenen Verbesserungsvorschläge geprüft: 5 implementiert, 8 als Non-Issues bestätigt
