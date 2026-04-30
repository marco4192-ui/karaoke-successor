# Review #7 — Worklog

## Gestartet: 2026-04-30

### Übersicht der gefundenen Probleme
- 5 Kritische Bugs (C1-C5)
- 14 Bugs (B1-B14)
- ~61 Dead Code Einträge (D1-D61)
- ~20 Unsaurer Code (U)
- ~17 Verbesserungen (I1-I17)

---


### C1: getSortedFolderKeys fehlt — FolderView Crash ✅
- **Datei**: `src/components/screens/library/utils.ts`
- **Problem**: `FolderView` importierte `getSortedFolderKeys` aus `./utils`, aber die Funktion existierte nicht
- **Fix**: Funktion implementiert — A-Z Sortierung für Buchstaben-Gruppen mit `#` am Ende, alphabetisch für andere Gruppierungen
- **Commit**: `9047cd8`

---
