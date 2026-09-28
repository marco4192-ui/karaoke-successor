# i18n Completion Agent Spec — Karaoke ZERO

## Ziel
Das Karaoke-Spiel unterstützt 16 Sprachen. EN ist die Basis. Für viele Sprachen fehlen ~1136 Keys (neuere Features: Daily-Types, Editor-MIDI-Import, Tutorials, Motto-Party, Taxonomy, Sync-Backup, Game-HUD u.a.). DU ergänzt die fehlenden Übersetzungen für dir zugewiesene Sprachen — natürlich, idiomatisch und kontexttreu.

## Arbeitsablauf PRO Sprache (z. B. `es`)
1. **Input lesen:** `/home/z/my-project/tmp-analysis/missing-es.json` (ca. 78 KB — ggf. in Chunks mit Read-Offset lesen).
   - Struktur: `{ missingByFile: { core: {...}, library: {...}, game: {...}, settings: {...}, party: {...}, mobile: {...}, tutorial: {...} }, suspiciousIdenticalByFile: {...} }`
   - `missingByFile.<file>` enthält verschachtelte Blöcke. **Keys = Struktur (NICHT ändern), Values = EN-Quelltext (übersetzen).**
2. **Completion-Datei erstellen:** `/home/z/my-project/src/lib/i18n/locales/es/completion.ts` (NEUE Datei) mit ALLEN Blöcken aus `missingByFile` **außer** `party.extendedDesc` (Sonderfall, siehe unten):
   ```ts
   // Completion file for ES — füllt Lücken, die in den Domain-Dateien fehlen
   // (daily types, editor midi import, tutorials, motto party, taxonomy, ...)
   // Wird via deepMerge in den Barrel integriert — Position im Objekt ist egal,
   // aber Keys dürfen hier keine bestehenden Werte überschreiben.
   export const completionTranslations = {
     // ══════════ core ══════════
     dailyBadges: {
       'first-challenge': { name: '...', description: '...' },
       // ...
     },
     // ══════════ library ══════════
     editor: {
       midiImport: { /* ... */ },
     },
     // ══════════ game / settings / party(ohne extendedDesc!) / mobile / tutorial ══════════
     // ...
   };
   ```
   - **Inkrementell schreiben:** Erst Write mit Gerüst + core + library, dann per Edit die weiteren Domains anhängen (game, settings, party, mobile, tutorial). So bleibt jeder Schritt beherrschbar.
3. **Barrel registrieren:** `/home/z/my-project/src/lib/i18n/locales/es/index.ts`:
   - `import { completionTranslations } from './completion';` hinzufügen
   - `completionTranslations` als **letztes** Element ins `reduce(deepMerge, ...)`-Array
4. **SONDERFALL `extendedDesc.battleRoyale.6`:** NICHT in completion.ts! In der bestehenden Datei `src/lib/i18n/locales/es/party.ts` im Array `extendedDesc.battleRoyale` fehlt der 5. Bullet. Füge den übersetzten Text für EN `'⚔️ Ties go to a 10s showdown — then the coin decides!'` an **Position Index 4** ein (zwischen dem `🔄`-Bullet und dem `🏆 Grand Finale`-Bullet). Danach muss das Array **7 Elemente** haben (👑 bleibt letzter).
5. **suspiciousIdenticalByFile prüfen:** Jeder Eintrag ist in der Zielsprache momentan identisch mit EN (3+ Wörter, verdächtig). Öffne die jeweilige Original-Datei, prüfe den Wert:
   - Echtes unübersetztes Englisch, das in der Zielsprache natürlich übersetzt würde → **direkt in der Original-Datei den Wert übersetzen** (nur Wert ersetzen, Key/Struktur unverändert)
   - Legitim identisch (Proper Nouns wie „Karaoke ZERO", „YouTube", „MIDI", gebräuchliche Lehnwörter, technische Kurzbegriffe) → unverändert lassen
   - Sei selektiv — nicht übereifrig. Wenn du unsicher bist, lass es.
6. **Verifikation:** `cd /home/z/my-project && bun run tmp-analysis/verify-lang.ts es` → muss `0 still missing` ausgeben (Exit 0).
   - **FÜHRE NICHT `extract-missing.ts` AUS** (Race-Gefahr mit parallelen Agenten)! Nur verify-lang.ts verwenden.
7. **Type-Check:** `cd /home/z/my-project && npx tsc --noEmit` → Exit 0.

## Übersetzungs-Richtlinien (QUALITÄT IST KRITISCH)
- **Natürlich & idiomatisch** — keine Wort-für-Wort-Maschinenübersetzung. Lies 1–2 bestehende Blöcke der Zielsprache, um Ton und Terminologie aufzunehmen, und bleib konsistent dabei.
- **Kontext:** Karaoke-Spiel. Domänen:
  - `dailyTypes.names` (150): **kurze, knackige Challenge-Namen** (EN: "High Score", "Sharp Aim", "Combo Chain", "Clean Sweep" ...) — in der Zielsprache ebenfalls kurz & griffig
  - `dailyTypes.patterns` / `weeklyTypes.patterns`: Muster-Beschreibungen der Challenges (z. B. "Score ≥ {n} on any song")
  - `dailyTypes.descs`: Kurzebeschreibungen der Challenge-Typen
  - `challenges` (game): In-Game-Challenge-Beschreibungen (Modifikatoren)
  - `editor.*`: Musik-Editor-UI (Noten, Lyrics, Waveform, MIDI-Import, Harmonisation, Zeitleiste)
  - `tutorial`: Live-Tour-Texte (freundlich, „du"-Form, `\n\n` = Absatz)
  - `settingsMotto`: Motto-Party (Party-Motto z. B. „80er Jahre", Suchoptionen AND/OR)
  - `settingsTaxonomy`: Verwaltung eigener Genres/Sprachen
  - `syncBackup`: Sync/Backup der Spieldaten
  - `gameHud`, `battleRoyale`, `unifiedSetup`, `modeSettings`: In-Game-UI
- **Platzhalter EXAKT beibehalten:** `{n}`, `{name}`, `{count}`, `{points}`, `{date}`, `{song}`, `{mode}` usw.
- **Emojis beibehalten** (z. B. `'🎤 ...'`, `'⚔️ ...'`).
- **Escapes:** Neue Zeilen in der JSON sind echte `\n` — in TS-Strings als Backslash-n schreiben: `'Zeile1\n\nZeile2'`. Apostrophe escapen: `'L\'étude'`. Stil: Single-Quotes wie in den bestehenden Dateien.
- **Keys mit Sonderzeichen in TS quoten:** `'top-3'`, `'first-challenge'`, `'80s'`, `'0'`.
- **Anrede:** An existing files orientieren (ES/FR/IT/PT/RU: Informell; DE: du; NL: je; JA/KO/ZH: höfliche Standardform).
- **Fachbegriffe bleiben unübersetzt:** Karaoke ZERO, YouTube, MIDI, UltraStar, AI-Provider-Namen (OpenAI, Anthropic, ...), Genre-Namen wenn etabliert.
- **Zahlenformate:** Punkte/Kommata wie in der Zielsprache üblich (z. B. 10,000 → 10.000 im Deutschen).

## Verboten
- Andere Dateien verändern (nur: completion.ts NEU, index.ts der Sprache, party.ts der Sprache [nur extendedDesc.battleRoyale], Original-Dateien der Sprache [nur suspicious-identical WERTE])
- `tmp-analysis/extract-missing.ts` oder andere missing-*.json verändern/ausführen
- Bestehende Keys in den Original-Dateien umbenennen oder löschen

## Worklog (PFLICHT)
Nach Abschluss pro Sprache: 
```bash
cat >> /home/z/my-project/worklog.md << 'EOF'

---
Task ID: <deine Task-ID>
Agent: i18n-completion
Task: Fehlende i18n-Keys für <sprache> ergänzen (completion.ts + barrel + suspicious-identical review)

Work Log:
- <Schritte>

Stage Summary:
- <Ergebnis: X Keys übersetzt, Y suspicious-identical geprüft/fixiert, verify-lang Ergebnis>
EOF
```
Führe das bash-Append NUR einmal am ENDE aus (nicht parallel mitten in der Arbeit).
