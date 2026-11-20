#!/bin/bash
# R85 E2E Phase 2c — full clean flow with weekly-key dumps at EVERY step
set -u
cd /home/z/my-project
S=scripts-tmp/r85

# kill zombies from previous runs
pkill -f "tsx server.ts" 2>/dev/null; pkill -f "tsx/dist/preflight" 2>/dev/null; sleep 1

bun run dev > dev.log 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null; pkill -f "tsx server.ts" 2>/dev/null' EXIT

for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "SERVER READY (${i}s)"; break; }
  sleep 1
done
sleep 3

AB() { agent-browser "$@"; }
WK() { AB eval "(() => { const k = Object.keys(localStorage).find(k => k.startsWith('karaoke_weekly_challenge_')); if(!k) return 'NO-KEY'; const v = JSON.parse(localStorage.getItem(k)); return JSON.stringify({entries: (v.entries||[]).map(e=>e.playerId), slots:(v.slots||[]).length, wk: v.weekNumber+'/'+v.year}); })()" 2>/dev/null; }

echo "===== 1. LOAD + SEED ====="
AB open http://127.0.0.1:3000/
for i in $(seq 1 45); do
  NAV=$(AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); return b ? 'NAV-OK' : 'WAITING'; })()" 2>/dev/null | tr -d '"')
  [ "$NAV" = "NAV-OK" ] && break
  sleep 1
done
echo "hydrated: $NAV"
AB eval "$(cat $S/seed.js)"
echo "--- weekly AFTER seed (slots empty, entries none): "; WK
AB reload
for i in $(seq 1 45); do
  NAV=$(AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); return b ? 'NAV-OK' : 'WAITING'; })()" 2>/dev/null | tr -d '"')
  [ "$NAV" = "NAV-OK" ] && break
  sleep 1
done
echo "re-hydrated: $NAV"
echo "--- weekly AFTER boot: "; WK

echo "===== 2. PATCH (weekly entries + outbox) ====="
AB eval "$(cat $S/patch-phase2.js)"
echo "--- weekly AFTER patch: "; WK

echo "===== 3. NAV + SELECT + DIALOG ====="
AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); if(!b) return 'NAV-NOT-FOUND'; b.click(); return 'nav-clicked'; })()"
for i in $(seq 1 20); do
  CARD=$(AB eval "(() => document.querySelector('[data-testid=\"profile-card-party-guest-online\"]') ? 'CARD-OK' : 'WAITING')()" 2>/dev/null | tr -d '"')
  [ "$CARD" = "CARD-OK" ] && break
  sleep 1
done
AB eval "(() => { document.querySelector('[data-testid=\"profile-card-party-guest-online\"]')?.click(); return 'card-clicked'; })()"
sleep 1.5
echo "--- weekly AFTER card-select: "; WK
AB eval "(() => { document.querySelector('[data-testid=\"signout-button\"]')?.click(); return 'dialog-opened'; })()"
sleep 1.5
echo "--- weekly AFTER dialog-open: "; WK

echo "===== 4. PENDING INFO (wait for dynamic import) ====="
for i in $(seq 1 10); do
  INFO=$(AB eval "(() => { const dlg=document.querySelector('[data-testid=\"remove-profile-dialog\"]'); if(!dlg) return 'NO-DLG'; return /wartende Punkte-Uploads werden vor dem Entfernen/.test(dlg.textContent) ? 'INFO-SHOWN' : 'not-yet'; })()" 2>/dev/null | tr -d '"')
  echo "poll $i: $INFO"
  [ "$INFO" = "INFO-SHOWN" ] && break
  sleep 1
done
AB screenshot $S/shot-10-pending-info.png

echo "===== 5. CONFIRM -> SYNCING -> FAILED ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'confirm-clicked'; })()"
for i in $(seq 1 60); do
  OUT=$(AB eval "(() => { if(document.querySelector('[data-testid=\"signout-uploads-failed\"]')) return 'FAILED-SHOWN'; if(!document.querySelector('[data-testid=\"remove-profile-dialog\"]')) return 'DIALOG-GONE'; return 'SYNCING'; })()" 2>/dev/null | tr -d '"')
  [ "$OUT" = "FAILED-SHOWN" ] && { echo "poll $i: $OUT"; break; }
  [ "$OUT" = "DIALOG-GONE" ] && { echo "poll $i: $OUT (UNEXPECTED)"; break; }
  sleep 1
done
echo "--- weekly AFTER failed flush: "; WK

echo "===== 6. FORCE SIGN-OUT ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'force-clicked'; })()"
sleep 3
echo "--- weekly AFTER force+cleanup: "; WK
echo "--- FULL VERIFY: "
AB eval "$(cat $S/verify.js)"
AB screenshot $S/shot-11-final.png

echo "===== DONE PHASE 2C ====="
