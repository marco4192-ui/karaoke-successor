#!/bin/bash
# R85 E2E Phase 1 — sign-out happy path + local delete path
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

echo "===== 1. OPEN APP ====="
AB open http://127.0.0.1:3000/
AB wait --load networkidle

echo "===== 2. SEED ====="
AB eval "$(cat $S/seed.js)"
AB reload
AB wait --load networkidle

echo "===== 3. NAV TO PROFILES ====="
AB eval "(() => { const b=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^(Profiles?|Profile)$/.test((x.textContent||'').trim())); if(b){b.click();return 'nav-clicked: '+b.textContent.trim();} return 'NAV-NOT-FOUND: '+[...document.querySelectorAll('button')].slice(0,25).map(b=>b.textContent.trim()).filter(Boolean).join('|'); })()"
sleep 3
AB screenshot $S/shot-01-profile-screen.png

echo "===== 4. SELECT PARTYGAST ====="
AB eval "(() => { const c=document.querySelector('[data-testid=\"profile-card-party-guest-online\"]'); if(!c) return 'CARD-NOT-FOUND'; c.click(); return 'card-clicked'; })()"
sleep 1.5
AB eval "(() => { const btn=document.querySelector('[data-testid=\"signout-button\"]'); if(!btn) return 'SIGNOUT-BTN-NOT-FOUND'; const r=btn.getBoundingClientRect(); if(r.bottom>(window.innerHeight||800)) btn.scrollIntoView({block:'center'}); return 'signout-btn: '+btn.textContent.trim()+' | delete-btn-present: '+(!!document.querySelector('[data-testid=\"delete-profile-button\"]')); })()"
sleep 0.5
AB screenshot $S/shot-02-signout-button.png

echo "===== 5. OPEN DIALOG ====="
AB eval "(() => { const b=document.querySelector('[data-testid=\"signout-button\"]'); if(!b) return 'NO-BTN'; b.click(); return 'clicked'; })()"
sleep 1.2
AB eval "(() => { const dlg=document.querySelector('[data-testid=\"remove-profile-dialog\"]'); if(!dlg) return 'DIALOG-NOT-FOUND'; const title=dlg.querySelector('h2,[data-slot=dialog-title]')?.textContent?.trim()||''; const warn=document.querySelector('[data-testid=\"signout-code-warning\"]'); const code=warn?.querySelector('code')?.textContent?.trim()||''; const save=!!document.querySelector('[data-testid=\"signout-save-code\"]'); const confirm=document.querySelector('[data-testid=\"signout-confirm\"]')?.textContent?.trim()||''; const cancel=!!document.querySelector('[data-testid=\"signout-cancel\"]'); return JSON.stringify({title, warnPresent:!!warn, code, saveBtn:save, confirm, cancelBtn:cancel, fullText:dlg.textContent.slice(0,400)}); })()"
AB screenshot $S/shot-03-dialog.png

echo "===== 6. CANCEL PATH ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-cancel\"]')?.click(); return 'cancel-clicked'; })()"
sleep 0.8
AB eval "(() => JSON.stringify({dialogGone: !document.querySelector('[data-testid=\"remove-profile-dialog\"]'), profileStillThere: !!document.querySelector('[data-testid=\"profile-card-party-guest-online\"]')}))()"

echo "===== 7. SIGN OUT (CONFIRM — no pending uploads) ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-button\"]')?.click(); return 'reopened'; })()"
sleep 1
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'confirm-clicked'; })()"
sleep 2.5
AB screenshot $S/shot-04-after-signout.png
echo "--- VERIFY STATE ---"
AB eval "$(cat $S/verify.js)"

echo "===== 8. LOCAL GUEST: DELETE DIALOG ====="
AB eval "(() => { const c=document.querySelector('[data-testid=\"profile-card-local-guest\"]'); if(!c) return 'CARD-NOT-FOUND'; c.click(); return 'card-clicked'; })()"
sleep 1.5
AB eval "(() => { const btn=document.querySelector('[data-testid=\"delete-profile-button\"]'); if(!btn) return 'DELETE-BTN-NOT-FOUND'; btn.scrollIntoView({block:'center'}); return 'delete-btn: '+btn.textContent.trim()+' | signout-btn-present: '+(!!document.querySelector('[data-testid=\"signout-button\"]')); })()"
sleep 0.5
AB eval "(() => { document.querySelector('[data-testid=\"delete-profile-button\"]')?.click(); return 'clicked'; })()"
sleep 1.2
AB eval "(() => { const dlg=document.querySelector('[data-testid=\"remove-profile-dialog\"]'); if(!dlg) return 'DIALOG-NOT-FOUND'; const title=dlg.querySelector('h2,[data-slot=dialog-title]')?.textContent?.trim()||''; const confirm=document.querySelector('[data-testid=\"signout-confirm\"]')?.textContent?.trim()||''; return JSON.stringify({title, confirm, warnPresent: !!document.querySelector('[data-testid=\"signout-code-warning\"]'), text: dlg.textContent.slice(0,300)}); })()"
AB screenshot $S/shot-05-local-delete-dialog.png

echo "===== 9. LOCAL DELETE (CONFIRM) ====="
AB eval "(() => { document.querySelector('[data-testid=\"signout-confirm\"]')?.click(); return 'confirm-clicked'; })()"
sleep 2
echo "--- VERIFY STATE ---"
AB eval "$(cat $S/verify.js)"
AB screenshot $S/shot-06-final.png

echo "===== 10. CONSOLE ERRORS ====="
AB errors
echo "===== DONE PHASE 1 ====="
