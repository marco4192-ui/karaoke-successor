# R27-a Arbeitsnachweis — mirror-library-lite.tsx Auslagerung

(Agent-Context: /agent-ctx ist im Sandbox-Root nicht beschreibbar — Permission
denied, siehe R27-b-Hinweis. Arbeitsnachweis daher wie in R10-R13 etabliert in
worklog.md + tmp-analysis/. Dieses Dokument ist die ausführliche Fassung.)

## Aufgabe
mirror-library-lite.tsx (1004 Zeilen, Companion-Mirror-Bibliothek) aufspalten in
Orchestrator + 11 fokussierte Module in library-lite/ — NULL Verhaltensänderung.

## Artefakte
- tmp-analysis/r27a/mirror-library-lite-ORIG.tsx — Backup exakt aus `git show HEAD:...`
- tmp-analysis/r27a/verify-library-split.py — Zeilen-Abdeckung (stripped, Substring)
- tmp-analysis/r27a/verify-block-order.py — Block-Reihenfolge (36 Blöcke, geordnet)

## Ergebniszahlen
- Abdeckung: 938/938 nicht-leere ORIG-Zeilen gemappt = 100,00 %, 0 ungemappt.
  5 dokumentierte Deltas: L3 + L5 (verteilter react-/era-filter-Import; alle
  Symbole in Modulen nachgewiesen), L368/L375/L865 (`gameState.partyGameMode` →
  `partyGameMode`).
- Block-Reihenfolge: 36/36 Blöcke geordnet (stripped; Deltas: 6× export-Keyword
  auf NEU-Seite, 2× partyGameMode auf ORIG-Seite).
- Unicode-Escapes: Multiset identisch (27 Vorkommen / 17 Sequenzen, inkl.
  'F\u00fcr Party ausw\u00e4hlen').
- tsc --noEmit: Exit 0.
- eslint targeted: 0 Errors / 3 Warnungen = exakt Baseline
  (2× no-explicit-any: Interface-Zeilen ORIG L28/29 → Orchestrator L44/45;
  1× set-state-in-effect: ORIG L116 → use-song-overlay.ts L47, identischer
  Effect-Body).
- Tests: 256/256.
- Dev-Server: nicht neu gestartet; HTTP 200 auf / und /mobile; dev.log ohne
  Compile-Fehler.

## Einzige Glue-Zugänge über den Plan hinaus
1. MottoBanner: `if (!gameState.mottoParty?.enabled) return null;` — 1:1 die
   Render-Bedingung des Orchestrators, hier wiederholt, damit TypeScript
   `gameState.mottoParty` wie im Original (Ternary-Narrowing) als non-null
   ableitet. DOM/Verhalten beweisbar identisch: Der Orchestrator mountet
   MottoBanner ausschliesslich bei aktivem Motto; JSX 525-546 unverändert.
2. `}MirrorLibraryLite.displayName = 'MirrorLibraryLite';` — Original-Format
   (Zeile 1004, ohne Zeilenumbruch) bewusst 1:1 erhalten.

## Hook-Reihenfolge (konsistent bei jedem Render, alle top-level)
useTranslation → useState(libGameMode) → useMemo(allPartners) →
useCallback(handleModeSelect) → useSongFilters (4× useState) →
useDisplaySongs (2× useMemo) → useDesktopPreview (1× useState, 2× useCallback)
→ useSongOverlay (5× useState, 1× useEffect zwischen ovDifficulty/ovPartnerId
wie im Original, 2 derived, 6× useCallback) → usePlaylistPicker (6× useState,
4× useCallback).
