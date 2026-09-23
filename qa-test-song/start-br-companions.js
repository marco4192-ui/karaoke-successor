(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const visible = el => el && el.offsetParent !== null;
  const setNative = (el, value) => {
    const proto = el instanceof HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const cellText = c => c.textContent.trim().replace(/\s+/g, ' ');
  // 1. Party
  const partyBtn = Array.from(document.querySelectorAll('button')).filter(visible).find(b => b.textContent.trim() === 'Party');
  if (!partyBtn) return 'no-party: ' + document.body.innerText.slice(0, 80);
  partyBtn.click();
  await sleep(1800);
  // 2. Battle Royale card
  const brCard = Array.from(document.querySelectorAll('[role=gridcell], div')).find(e => /Battle Royale/.test(e.textContent) && e.textContent.length < 160 && e.querySelector('h3,h2'));
  if (!brCard) return 'no-br-card';
  brCard.click();
  await sleep(2200);
  // 3. Each player: click cell → click the LAST "📱 Companion App" button that appears
  for (const name of ['Alice', 'Bob', 'Carol']) {
    const cell = Array.from(document.querySelectorAll('[role=gridcell]')).find(c => cellText(c).startsWith(name.charAt(0) + ' ' + name) || cellText(c).replace(/\s/g, '').startsWith(name.charAt(0) + name));
    if (!cell) return 'no-cell: ' + name + ' → ' + JSON.stringify(Array.from(document.querySelectorAll('[role=gridcell]')).map(c => cellText(c).slice(0, 20)));
    cell.click();
    await sleep(500);
    const compBtns = Array.from(document.querySelectorAll('button')).filter(b => visible(b) && /^📱\s*Companion App$/.test(b.textContent.trim()));
    if (compBtns.length === 0) return 'no-companion-btn: ' + name;
    compBtns[compBtns.length - 1].click();
    await sleep(600);
  }
  // 4. Random Song card (emoji has NO space in raw textContent)
  const randomCell = Array.from(document.querySelectorAll('[role=gridcell]')).find(c => cellText(c).replace(/\s/g, '').startsWith('🎲RandomSong'));
  if (!randomCell) return 'no-random-cell: ' + JSON.stringify(Array.from(document.querySelectorAll('[role=gridcell]')).map(c => cellText(c).slice(0, 22)));
  randomCell.click();
  await sleep(700);
  // 5. Interval slider → 30
  const sliders = Array.from(document.querySelectorAll('input[type=range]')).filter(visible);
  if (sliders.length === 0) return 'no-sliders';
  setNative(sliders[0], '30');
  await sleep(400);
  // 6. Ready to Play
  const ready = Array.from(document.querySelectorAll('button')).filter(visible).find(b => /Ready to Play|Bereit zum Kämpfen/.test(b.textContent));
  if (!ready) return 'no-ready';
  if (ready.disabled) return 'ready-disabled: players not registered?';
  ready.click();
  await sleep(2200);
  // 7. Start Round 1
  const start = Array.from(document.querySelectorAll('button')).filter(visible).find(b => /Start Round 1|Runde 1 starten/.test(b.textContent));
  if (!start) return 'no-start: ' + document.body.innerText.slice(0, 150);
  start.click();
  await sleep(500);
  return 'GAME-STARTED ' + new Date().toISOString();
})()
