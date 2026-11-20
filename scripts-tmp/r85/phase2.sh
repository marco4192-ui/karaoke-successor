#!/bin/bash
# R85 E2E Phase 2 — pending uploads (server unreachable) + weekly cleanup proof
set -u
cd /home/z/my-project
S=scripts-tmp/r85

bun run dev > dev.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY (${i}s)"; break; }
  sleep 1
done

AB() { agent-browser "$@"; }

echo "===== 1. RELOAD + RESEED ====="
AB open http://127.0.0.1:3000/
AB wait --load networkidle
AB eval "$(cat $S/seed.js)"
AB reload
AB wait --load networkidle
echo "--- patch weekly + outbox AFTER boot ---"
AB eval "$(cat $S/patch-phase2.js)"

echo "===== 2. NAV TO PROFILES, SELECT PARTYGAST ====="
AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); if(b){b.click();return 'nav-clicked';} return 'NAV-NOT-FOUND'; })()"
sleep 2.5
AB eval "(() => { const c=document.querySelector('[data-testid=\"profile-card-party-guest-online\"]'); if(!c) return 'CARD-NOT-FOUND'; c.click(); return 'card-clicked'; })()"
sleep 1.5

echo "===== 3. OPEN DIALOG — PENDING UPLOADS INFO ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-button\"]')?.click(); return 'opened'; })()"
sleep 1.5
AB eval "(() => { const dlg=document.querySelector('[data-testid=\"remove-profile-dialog\"]'); if(!dlg) return 'DIALOG-NOT-FOUND'; return JSON.stringify({hasPendingInfo: /wartende Punkte-Uploads werden vor dem Entfernen/.test(dlg.textContent), snippet: dlg.textContent.slice(0, 500)}); })()"
AB screenshot $S/shot-07-pending-info.png

echo "===== 4. CONFIRM — expect SYNCING then UPLOAD-FAILED (netcup unreachable) ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'confirm-clicked'; })()"
# The flush will try the netcup server (up to 15 s fetch timeout) — poll for the outcome
for i in $(seq 1 40); do
  OUT=$(AB eval "(() => { if(document.querySelector('[data-testid=\"signout-uploads-failed\"]')) return 'FAILED-SHOWN'; if(document.querySelector('[data-testid=\"signout-syncing\"]')) return 'SYNCING'; if(!document.querySelector('[data-testid=\"remove-profile-dialog\"]')) return 'DIALOG-GONE'; return 'UNKNOWN'; })()" 2>/dev/null | tr -d '"')
  echo "poll $i: $OUT"
  [ "$OUT" = "FAILED-SHOWN" ] && break
  [ "$OUT" = "DIALOG-GONE" ] && break
  sleep 1
done
AB eval "(() => { const w=document.querySelector('[data-testid=\"signout-uploads-failed\"]'); if(!w) return 'WARNING-NOT-FOUND'; return 'warning: '+w.textContent.trim(); })()"
AB screenshot $S/shot-08-upload-failed.png

echo "===== 5. FORCE SIGN-OUT (Trotzdem abmelden) ====="
AB eval "(() => { const b=document.querySelector('[data-testid=\"signout-confirm\"]'); if(!b) return 'NO-CONFIRM-BTN'; return 'btn-label: '+b.textContent.trim(); })()"
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'force-clicked'; })()"
sleep 2.5
echo "--- VERIFY STATE ---"
AB eval "$(cat $S/verify.js)"
AB screenshot $S/shot-09-after-force.png

echo "===== 6. CONSOLE ERRORS ====="
AB errors
echo "===== DONE PHASE 2 ====="
