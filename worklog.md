# Karaoke Successor — Worklog

## Session: 2026-05-05 (Kontinuierliches Review)

### Schritt 1: TODO-Dateien gelöscht
- `TODO_IMPROVEMENTS.md` und `docs/remaining-issues.md` gelöscht
- Commit: e0d1e87

### Schritt 2: TSC-Fehler-Analyse
**Gesamt: ~39 Fehler** (excl. examples/ + skills/ false positives)

**Kategorie A: Fehlende Module (9 Fehler)**
| Modul | Referenziert von |
|-------|-----------------|
| `@/lib/url-utils` | ultrastar-parser.ts, youtube-player.tsx |
| `@/lib/media-extensions` | folder-scanner.ts, tauri-file-storage.ts |
| `@/lib/rate-limiter` | mobile-state.ts, songs/route.ts |
| `@/lib/game/rating-utils` | results-screen.tsx, score-card.tsx, shorts-creator.tsx |

**Kategorie B: Fehlende Exports (11 Fehler)**
| Export | Definiert in | Referenziert von |
|--------|-------------|-----------------|
| `estimatePerfectNotes` | scoring.ts | results-screen.tsx, use-game-flow-handlers.ts |
| `EMPTY_PLAYER_SCORE` | types/game.ts | 4 Dateien |
| `parseNoteShape` | use-game-settings.ts | note-lane.tsx |
| `generateCode` | utils.ts | battle-royale.ts, mobile-state.ts |
| `COMPANION_CODE_CHARS` | utils.ts | mobile-state.ts |
| `FULL_CODE_CHARS` | utils.ts | battle-royale.ts |
| `ChallengeModifier` | player-progression.ts | use-note-scoring.ts |

**Kategorie C: Fehlende Typ-Eigenschaften (8 Fehler)**
| Property | Type | Referenziert von |
|----------|------|-----------------|
| `isRap` | Note | ultrastar-parser.ts |
| `challengeMode` | GameState, PlayerGameResult | results-screen.tsx |
| `challengeModifiers` | UseNoteScoringOptions | game-screen.tsx |
| `playbackRate` | UseGameLoopOptions | game-screen.tsx |
| `setChallengeMode` | GameStore | page.tsx |
| `bracket` | MatchAbortDialogProps | tournament-screen.tsx |
| `songs` | TournamentBracketViewProps | party-game-screens.tsx |

**Kategorie D: Sonstige (2 Fehler)**
| Datei | Fehler |
|-------|--------|
| folder-scan-tab.tsx | File[] nicht zuweisbar zu FileList |
| tauri-file-storage.ts | `ext` Parameter implicitly any |
