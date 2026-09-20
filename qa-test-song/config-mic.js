(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clickBtn = (pred) => {
    const btn = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).find(pred);
    if (btn) { btn.click(); return true; }
    return false;
  };
  // Settings
  if (!clickBtn(b => b.textContent.trim() === 'Settings')) return 'no-settings';
  await sleep(1500);
  // Leave party dialog if it appears
  clickBtn(b => b.textContent.trim() === 'Leave');
  await sleep(1200);
  // Microphone tab (second-level, inside settings)
  if (!clickBtn(b => b.textContent.trim() === 'Microphone' && b.closest('main, [class*=settings], body') !== null)) return 'no-mic-tab';
  await sleep(1500);
  // Add Microphone 1
  if (!clickBtn(b => /Add Microphone/.test(b.textContent))) return 'no-add-mic';
  await sleep(800);
  // Confirm Add (device dialog)
  if (!clickBtn(b => b.textContent.trim() === 'Add')) return 'no-confirm-add';
  await sleep(1500);
  // Enable stereo split
  if (!clickBtn(b => /Enable/.test(b.textContent) && /Stereo/i.test((b.closest('div')?.innerText || '')))) return 'no-stereo';
  await sleep(1200);
  const txt = document.body.innerText;
  const ok = /Stereo Split active/.test(txt);
  return ok ? 'mic-config-ok: L/R split active' : 'stereo-not-active';
})()
