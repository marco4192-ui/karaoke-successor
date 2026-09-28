#!/bin/bash
# R5 smoke test Teil 2 — Play/Pause-Zeit-Beweis mit präzisem Selektor
cd /home/z/my-project

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

agent-browser open http://localhost:3000/
agent-browser wait --load networkidle --timeout 60000 2>/dev/null || true
agent-browser wait 2000
agent-browser eval "$(cat qa-test-song/seed-q8-demo.js)" >/dev/null 2>&1
agent-browser reload
agent-browser wait --load networkidle --timeout 60000 2>/dev/null || true
agent-browser wait 2500
agent-browser press F10
agent-browser wait 3000
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Dancing Queen')); if (b) { b.click(); return 'song clicked'; } return 'NOT FOUND'; })()"
agent-browser wait 6500

echo "=== Play → Zeit läuft (Zeit-Anzeige: Format m:ss.cc) ==="
agent-browser eval "(() => { const spans = [...document.querySelectorAll('span')].filter(s => /^\d+:\d\d\.\d\d$/.test(s.textContent.trim())); const b = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-play')); if (b) { b.click(); return JSON.stringify({timeDisplays: spans.map(s => s.textContent.trim()), timeBefore: spans[0]?.textContent.trim()}); } return 'NO PLAY'; })()"
agent-browser wait 2000
agent-browser eval "JSON.stringify({timeAfter2s: [...document.querySelectorAll('span')].filter(s => /^\d+:\d\d\.\d\d$/.test(s.textContent.trim())).map(s => s.textContent.trim()), pauseIcon: !!document.querySelector('svg.lucide-pause')})"
echo "=== Pause → Play-Icon zurück ==="
agent-browser eval "(() => { const b = [...document.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-pause')); if (b) { b.click(); return 'paused'; } return 'NO PAUSE'; })()"
agent-browser wait 500
agent-browser eval "JSON.stringify({playIconBack: !!document.querySelector('svg.lucide-play')})"

echo "=== Tab-Wechsel-Beweis: Analysis-Panel öffnen/schließen ==="
agent-browser eval "document.querySelector('[data-testid=editor-panel-analysis-toggle]')?.click(); 'analysis toggle clicked'"
agent-browser wait 1200
agent-browser eval "JSON.stringify({analysisSidebar: !!document.querySelector('[data-testid=editor-header-panel-analysis]')})"
agent-browser eval "(() => { const c = document.querySelector('[data-testid=editor-header-panel-analysis] button'); if (c) { c.click(); return 'closed'; } return 'no close'; })()"
echo "=== server check ==="
curl -s -o /dev/null -w "home=%{http_code}\n" --max-time 30 http://localhost:3000/
echo "=== PART 2 DONE ==="
