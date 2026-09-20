(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const setSel = (sel, val) => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(sel, val);
    sel.dispatchEvent(new Event('change', {bubbles: true}));
  };
  const selects = Array.from(document.querySelectorAll('select')).filter(s => /Mikrofon/i.test(s.textContent));
  if (selects.length < 3) return 'selects: ' + selects.length;
  const L = selects[0].options[1].value;
  const R = selects[0].options[2].value;
  setSel(selects[0], L); await sleep(300);
  setSel(selects[1], R); await sleep(300);
  const blocks = Array.from(document.querySelectorAll('button')).filter(b => /Companion App/.test(b.textContent) && b.textContent.length < 25);
  if (blocks.length >= 3) { blocks[2].click(); await sleep(600); }
  const txt = document.body.innerText;
  const i = txt.indexOf('Singing Device Assignment');
  const ready = Array.from(document.querySelectorAll('button')).find(b => /Ready to Play/.test(b.textContent));
  return JSON.stringify({assign: txt.slice(i, i + 260).replace(/\n+/g, ' | '), readyDisabled: ready ? ready.disabled : null});
})()
