# Karaoke Successor — Worklog

## Session: 2026-05-06 (Code Review #8 — Fresh Implementation)

### Review-Ergebnis
- **TSC:** 0 Errors | **ESLint:** 8 Errors / 53 Warnings
- **319 TypeScript-Dateien**
- **Gefunden:** 1 Critical, 1 High, 4 Medium, 5 Low Bugs | 10 Dead Code | 10 Verbesserungen

### TODO-Liste
| ID | Schwere | Beschreibung | Status |
|----|---------|-------------|--------|
| C1 | Critical | Mobile Pitch Polling startet nie | ⏳ |
| H1 | High | Medley-Snippet Startzeit ignoriert Song-GAP | |
| M1 | Medium | Rating-Threshold Inkonsistenz (95% vs 99.5%) | |
| M2 | Medium | Ref-Zuweisungen während Render | |
| M3 | Medium | Resume während Countdown ohne Media | |
| M4 | Medium | accuracyDelta Parametername irreführend | |
| L1 | Low | Missing response.ok check | |
| L2 | Low | Replay Recorder Unmount-Guard | |
| L3 | Low | ___audioReady Write-Only State | |
| L4 | Low | p2StateRef Dead Code | |
| L5 | Low | addToJukeboxWishlist ohne Server-Check | |
| DC-1–DC-10 | Chore | Dead Code Prüfung und Bereinigung | |
| V1–V10 | Improvement | Verbesserungsvorschläge | |

---

