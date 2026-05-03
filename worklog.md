# Worklog — Karaoke Successor Code-Review Fixes

## Status: In Progress (10/20 erledigt)

### ✅ Erledigt:
1. **R-C1/C2/C5** (d8e015b): Path-Validation — `..` Komponenten blockiert, validierter Pfad für write/delete/mkdir
2. **R-C3 + R-U7** (10ef7ec): Größenlimits für Schreiboperationen + MAX_FILE_SIZE Konstante
3. **R-C4** (570f820): Vergifteter Mutex Recovery — State wird auf Default zurückgesetzt
4. **T-C1** (fc81e3d): XP/Level-System vereinheitlicht — daily-challenge nutzt jetzt getRankForXP()
5. **T-C2** (88b437a): Challenge-Modifier — GameMode-Mapping (blind-audition→blind, memory-lane→missing-words) + Requirement-Validierung
6. **T-M7** (c326938): Daily-Challenge Date-Format auf ISO YYYY-MM-DD vereinheitlicht
7. **T-M4** (3b6d7f9): PERFECT_ACCURACY von 100 auf 99.5 gesenkt
8. **T-M8** (5f3590a): Native-Audio pause/resume/seek/setVolume/stop mit try/catch abgesichert
9. **T-M1** (5897ad0): Shadowed `const now` → `const pitchNow`
10. **T-M2** (32af692): Volume-State Updates auf ~30fps gedrosselt

### 🔲 Verbleibend:
11. T-M3: P2-Scoring Batching
12. T-M6: useMultiPitchDetector Re-Init
13. R-M2/M3: Stille Fehler-Verschluckung in Charts
14. R-M9: FftPlanner Caching
15. R-M1/M10: Async Chart-Matching
16. R-M4/M5: DB-Validierungen
17. R-M6: Hardcoded Port 3000
18. R-M7: Server Kill bei CloseRequested
19. Dead Code: T-L1 bis T-L6, R-L1, R-L2 + xp-config.ts
20. Unclean: T-U1 bis T-U6, R-U1 bis R-U9
