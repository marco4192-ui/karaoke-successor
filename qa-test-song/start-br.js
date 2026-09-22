(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clickBtn = (pred) => {
    const btn = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).find(pred);
    if (btn) { btn.click(); return true; }
    return false;
  };
  const setNative = (el, value) => {
    const proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  // 1. Party
  if (!clickBtn(b => b.textContent.trim() === 'Party')) return 'no-party';
  await sleep(2000);
  // 2. Battle Royale card
  const brCard = Array.from(document.querySelectorAll('[role=gridcell], div')).find(e => /Battle Royale/.test(e.textContent) && e.textContent.length < 160 && e.querySelector('h3,h2'));
  if (!brCard) return 'no-br-card';
  brCard.click();
  await sleep(2000);
  // 3. Add players
  for (const name of ['Alice', 'Bob', 'Carol']) {
    const cell = Array.from(document.querySelectorAll('[role=gridcell]')).find(c => c.textContent.trim().endsWith(name));
    if (!cell) return 'no-player-cell: ' + name;
    cell.click();
    await sleep(400);
  }
  await sleep(700);
  // 4. Assign mics: Alice L, Bob R, Carol Companion App
  const selects = Array.from(document.querySelectorAll('select')).filter(s => /Mikrofon|microphone/i.test(s.textContent));
  if (selects.length < 3) return 'no-mic-selects: ' + selects.length;
  setNative(selects[0], selects[0].options[1].value);
  await sleep(250);
  setNative(selects[1], selects[1].options[2].value);
  await sleep(250);
  const lastIdx = selects[2].options.length - 1;
  setNative(selects[2], selects[2].options[lastIdx].value);
  await sleep(500);
  // 5. Random Song
  const randomCell = Array.from(document.querySelectorAll('[role=gridcell]')).find(c => /Random Song/.test(c.textContent) && c.textContent.length < 120);
  if (!randomCell) return 'no-random-cell';
  randomCell.click();
  await sleep(600);
  // 6. Interval 60s (elimination rhythm), final 60s
  const labels = Array.from(document.querySelectorAll('label'));
  const intLabel = labels.find(l => /Round Duration \(Elimination Interval\)|Rundenl/.test(l.textContent) && /Interval|Intervall/.test(l.textContent));
  if (!intLabel) return 'no-interval-label';
  setNative(intLabel.parentElement.querySelector('input[type=range]'), '60');
  await sleep(300);
  // 7. Ready to Play
  const ready = Array.from(document.querySelectorAll('button')).find(b => /Ready to Play|Bereit/.test(b.textContent));
  if (!ready) return 'no-ready';
  if (ready.disabled) return 'ready-still-disabled';
  ready.click();
  await sleep(2000);
  // 8. Start Round 1
  const start = Array.from(document.querySelectorAll('button')).find(b => /Start Round 1|Runde 1 starten/.test(b.textContent));
  if (!start) return 'no-start-btn: ' + document.body.innerText.slice(0, 120);
  start.click();
  await sleep(1000);
  return 'game-started';
})()
