#!/bin/bash
# R85 E2E Phase 2b — retry with robust waits (localStorage already seeded + patched)
set -u
cd /home/z/my-project
S=scripts-tmp/r85

bun run dev > dev.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY (${i}s)"; break; }
  sleep 1
done
# give turbopack a moment to settle after the first 200
sleep 3

AB() { agent-browser "$@"; }

echo "===== 0. RELOAD PAGE (state persists in browser) ====="
AB open http://127.0.0.1:3000/
# Robust wait: nav button must appear (app hydrated)
for i in $(seq 1 45); do
  NAV=$(AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); return b ? 'NAV-OK' : 'WAITING'; })()" 2>/dev/null | tr -d '"')
  [ "$NAV" = "NAV-OK" ] && { echo "app hydrated (${i}s)"; break; }
  sleep 1
done
echo "--- confirm outbox still queued ---"
AB eval "(() => { const o=JSON.parse(localStorage.getItem('karaoke-score-outbox')||'{\"entries\":[]}'); const p=JSON.parse(localStorage.getItem('karaoke-successor-storage')||'{}').state?.profiles?.map(p=>p.name); return JSON.stringify({outbox: o.entries.length, profiles: p}); })()"

echo "===== 1. NAV TO PROFILES, SELECT PARTYGAST ====="
AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); if(!b) return 'NAV-NOT-FOUND'; b.click(); return 'nav-clicked'; })()"
# Robust wait: profile screen rendered
for i in $(seq 1 20); do
  CARD=$(AB eval "(() => document.querySelector('[data-testid=\"profile-card-party-guest-online\"]') ? 'CARD-OK' : 'WAITING')()" 2>/dev/null | tr -d '"')
  [ "$CARD" = "CARD-OK" ] && { echo "profile screen ready (${i}s)"; break; }
  sleep 1
done
AB eval "(() => { const c=document.querySelector('[data-testid=\"profile-card-party-guest-online\"]'); if(!c) return 'CARD-NOT-FOUND'; c.click(); return 'card-clicked'; })()"
sleep 1.5

echo "===== 2. OPEN DIALOG — PENDING UPLOADS INFO ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-button\"]')?.click(); return 'opened'; })()"
sleep 1.5
AB eval "(() => { const dlg=document.querySelector('[data-testid=\"remove-profile-dialog\"]'); if(!dlg) return 'DIALOG-NOT-FOUND'; return JSON.stringify({hasPendingInfo: /wartende Punkte-Uploads werden vor dem Entfernen/.test(dlg.textContent), hasTwo: /2 wartende/.test(dlg.textContent)}); })()"
AB screenshot $S/shot-07-pending-info.png

echo "===== 3. CONFIRM — expect SYNCING then UPLOAD-FAILED ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'confirm-clicked'; })()"
SawSyncing=no
for i in $(seq 1 60); do
  OUT=$(AB eval "(() => { if(document.querySelector('[data-testid=\"signout-uploads-failed\"]')) return 'FAILED-SHOWN'; if(document.querySelector('[data-testid=\"signout-syncing\"]')) return 'SYNCING'; if(!document.querySelector('[data-testid=\"remove-profile-dialog\"]')) return 'DIALOG-GONE'; return 'UNKNOWN'; })()" 2>/dev/null | tr -d '"')
  [ "$OUT" = "SYNCING" ] && SawSyncing=yes
  echo "poll $i: $OUT"
  { [ "$OUT" = "FAILED-SHOWN" ] || [ "$OUT" = "DIALOG-GONE" ]; } && break
  sleep 1
done
echo "sawSyncingSpinner: $SawSyncing"
AB eval "(() => { const w=document.querySelector('[data-testid=\"signout-uploads-failed\"]'); if(!w) return 'WARNING-NOT-FOUND'; return 'warning: '+w.textContent.trim(); })()"
AB screenshot $S/shot-08-upload-failed.png

echo "===== 4. FORCE SIGN-OUT ====="
AB eval "(() => { const b=document.querySelector('[data-testid=\"signout-confirm\"]'); if(!b) return 'NO-CONFIRM-BTN'; return 'btn-label: '+b.textContent.trim(); })()"
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'force-clicked'; })()"
sleep 3
echo "--- VERIFY STATE ---"
AB eval "$(cat $S/verify.js)"
AB screenshot $S/shot-09-after-force.png

echo "===== 5. CONSOLE/PAGE ERRORS (filtered) ====="
AB errors 2>&1 | head -8
echo "===== DONE PHASE 2B ====="
