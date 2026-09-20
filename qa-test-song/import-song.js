(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clickBtn = (pred) => {
    const btn = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).find(pred);
    if (btn) { btn.click(); return true; }
    return false;
  };
  // Library settings tab (inside Settings screen; NOT the navbar Library)
  const tabs = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === 'Library');
  const libTab = tabs[tabs.length - 1];
  if (!libTab) return 'no-library-tab';
  libTab.click();
  await sleep(1500);
  let inputs = document.querySelectorAll('input[type=file]');
  if (inputs.length < 2) return 'no-file-inputs: ' + inputs.length;
  const txtInput = Array.from(inputs).find(i => (i.accept || '').includes('.txt'));
  const audioInput = Array.from(inputs).find(i => (i.accept || '').includes('audio'));
  const [tRes, aRes] = await Promise.all([fetch('/qa-test.txt'), fetch('/qa-test.mp3')]);
  const [tBlob, aBlob] = await Promise.all([tRes.blob(), aRes.blob()]);
  const dt1 = new DataTransfer();
  dt1.items.add(new File([tBlob], 'qa-test.txt', {type: 'text/plain'}));
  txtInput.files = dt1.files;
  txtInput.dispatchEvent(new Event('change', {bubbles: true}));
  await sleep(800);
  const dt2 = new DataTransfer();
  dt2.items.add(new File([aBlob], 'test.mp3', {type: 'audio/mpeg'}));
  audioInput.files = dt2.files;
  audioInput.dispatchEvent(new Event('change', {bubbles: true}));
  await sleep(800);
  // Process
  if (!clickBtn(b => b.textContent.trim() === 'Process' && !b.disabled)) return 'no-process';
  await sleep(3000);
  // Add to Library
  if (!clickBtn(b => /Add to Library/.test(b.textContent))) return 'no-add-to-library';
  await sleep(2500);
  const ok = !!window.localStorage.getItem('karaoke-successor-custom-songs');
  return ok ? 'song-imported' : 'import-not-persisted';
})()
