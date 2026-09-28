#!/bin/bash
# R5 smoke test — Editor öffnen (F10) → Dancing Queen → Struktur + Interaktionen
# Läuft als EIN Befehl (der Dev-Server überlebt nur während ein Bash-Kommando aktiv ist).
cd /home/z/my-project

echo "=== [1] Dev-Server starten (falls down) ==="
if ss -tln 2>/dev/null | grep -q ":3000 "; then
  echo "server already listening"
else
  setsid nohup npx tsx server.ts >> dev.log 2>&1 &
  echo "server started (bg)"
fi

for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000/ 2>/dev/null)
  if [ "$code" = "200" ]; then echo "HTTP 200 (attempt $i)"; break; fi
  sleep 3
done
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 http://localhost:3000/ 2>/dev/null)
echo "final http=$code"
if [ "$code" != "200" ]; then echo "SERVER NOT REACHABLE — ABORT"; exit 1; fi

echo "=== [2] Browser öffnen ==="
agent-browser open http://localhost:3000/
agent-browser wait --load networkidle --timeout 60000 2>/dev/null || true
agent-browser wait 2500

echo "=== [3] Demo-Songs seeden + reload ==="
agent-browser eval "$(cat qa-test-song/seed-q8-demo.js)"
agent-browser wait 1200
agent-browser reload
agent-browser wait --load networkidle --timeout 60000 2>/dev/null || true
agent-browser wait 3000
agent-browser get title

echo "=== [4] F10 → Editor-Screen ==="
agent-browser press F10
agent-browser wait 3500
agent-browser eval "JSON.stringify({url: location.href.slice(-40), editorListVisible: !!document.querySelector('[data-testid=editor-new-song-button]'), songButtons: [...document.querySelectorAll('button')].filter(b => b.textContent.includes('Dancing Queen')).length})"

echo "=== [4b] Fallback: home-nav-library → library-editor-button ==="
if ! agent-browser eval "!!document.querySelector('[data-testid=editor-new-song-button]')" 2>/dev/null | grep -q true; then
  echo "F10 failed — navigating via library"
  agent-browser find text "Bibliothek" click 2>/dev/null || agent-browser eval "document.querySelector('[data-testid=home-nav-library]')?.click(); 'clicked'"
  agent-browser wait 2500
  agent-browser eval "document.querySelector('[data-testid=library-editor-button]')?.click(); 'editor nav clicked'"
  agent-browser wait 3500
fi

echo "=== [5] Dancing Queen anklicken → KaraokeEditor ==="
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Dancing Queen')); if (b) { b.click(); return 'song card clicked'; } return 'SONG CARD NOT FOUND'; })()"
agent-browser wait 7000

echo "=== [6] Editor-Struktur prüfen ==="
agent-browser eval "JSON.stringify({bootOverlayGone: !document.querySelector('[data-testid=editor-boot-overlay]'), leftPanel: !!document.querySelector('[data-testid=editor-left-panel]'), leftPanelHasLyrics: (document.querySelector('[data-testid=editor-left-panel]')?.textContent || '').includes('la'), subHeader: !!document.querySelector('[data-testid=editor-sub-header]'), subNoteTypes: !!document.querySelector('[data-testid=editor-sub-note-types]'), addNote: !!document.querySelector('[data-testid=editor-sub-add-note]'), detailsBand: !!document.querySelector('[data-testid=editor-note-details-band]'), snapToggle: !!document.querySelector('[data-testid=editor-snap-toggle]'), duetToggle: !!document.querySelector('[data-testid=editor-duet-split-toggle]'), panelToggles: ['editor-panel-metadata-toggle','editor-panel-analysis-toggle','editor-panel-ai-toggle'].filter(id => !!document.querySelector('[data-testid=' + id + ']')), noteBlocks: [...document.querySelectorAll('div.absolute.rounded.cursor-pointer')].filter(e => e.getBoundingClientRect().width > 10).length, headerTitle: (document.querySelector('h1')?.textContent || '') })"

echo "=== [7] Interaktion 1: Notenklick → Details füllen sich ==="
agent-browser eval "(() => { const notes = [...document.querySelectorAll('div.absolute.rounded.cursor-pointer')].filter(e => e.getBoundingClientRect().width > 10 && e.textContent.includes('la')); if (notes.length) { notes[0].click(); return 'clicked note block 0 of ' + notes.length; } return 'NO NOTE BLOCKS RENDERED'; })()"
agent-browser wait 900
agent-browser eval "JSON.stringify({lyric: document.querySelector('[data-testid=editor-note-details-lyric]')?.value, pitch: document.querySelector('[data-testid=editor-note-details-pitch]')?.value, pitchName: (document.querySelector('[data-testid=editor-note-details-pitch-name]')?.textContent || '').trim(), start: document.querySelector('[data-testid=editor-note-details-start]')?.value, duration: document.querySelector('[data-testid=editor-note-details-duration]')?.value, beat: (document.querySelector('[data-testid=editor-note-details-beat]')?.textContent || '').replace(/\\s+/g, ' ').trim(), frequency: (document.querySelector('[data-testid=editor-note-details-frequency]')?.textContent || '').replace(/\\s+/g, ' ').trim(), line: (document.querySelector('[data-testid=editor-note-details-line]')?.textContent || '').replace(/\\s+/g, ' ').trim() })"

echo "=== [8] Interaktion 2: Play → Zeit läuft, Pause-Icon ==="
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-play')); if (b) { b.click(); return 'play clicked, timeBefore=' + (document.querySelector('span.text-cyan-400.font-mono')?.textContent || '?'); } return 'NO PLAY BUTTON'; })()"
agent-browser wait 1800
agent-browser eval "JSON.stringify({timeAfter: (document.querySelector('span.text-cyan-400.font-mono')?.textContent || '?'), pauseIconVisible: !!document.querySelector('svg.lucide-pause')})"

echo "=== [9] Pause ==="
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-pause')); if (b) { b.click(); return 'pause clicked, time=' + (document.querySelector('span.text-cyan-400.font-mono')?.textContent || '?'); } return 'NO PAUSE BUTTON'; })()"
agent-browser wait 600

echo "=== [10] Interaktion 3: Header-Panel (Metadaten) → Sidebar-Modul ==="
agent-browser eval "document.querySelector('[data-testid=editor-panel-metadata-toggle]')?.click(); 'metadata toggle clicked'"
agent-browser wait 1500
agent-browser eval "JSON.stringify({sidebarOpen: !!document.querySelector('[data-testid=editor-header-panel-metadata]'), sidebarHasSongInfo: (document.querySelector('[data-testid=editor-header-panel-metadata]')?.textContent || '').length > 50})"
agent-browser eval "(() => { const c = document.querySelector('[data-testid=editor-header-panel-metadata] button'); if (c) { c.click(); return 'sidebar closed'; } return 'no close button'; })()"
agent-browser wait 800

echo "=== [11] Notenauswahl erneut (für Screenshot) + Screenshot ==="
agent-browser eval "(() => { const notes = [...document.querySelectorAll('div.absolute.rounded.cursor-pointer')].filter(e => e.getBoundingClientRect().width > 10 && e.textContent.includes('la')); if (notes.length) { notes[0].click(); return 'note re-selected'; } return 'no notes'; })()"
agent-browser wait 700
mkdir -p qa-shots
agent-browser screenshot qa-shots/r5-editor.png

echo "=== [12] Verifikation: Server-Antworten + dev.log ==="
curl -s -o /dev/null -w "home=%{http_code}\n" --max-time 30 http://localhost:3000/
echo "--- dev.log tail (letzte 30 Zeilen) ---"
tail -30 dev.log
echo "=== SMOKE DONE ==="
