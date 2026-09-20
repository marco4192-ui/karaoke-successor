(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clickBtn = (pred) => {
    const btn = Array.from(document.querySelectorAll('button')).filter(b => b.offsetParent !== null).find(pred);
    if (btn) { btn.click(); return true; }
    return false;
  };
  // Navigate to Profiles screen (navbar)
  if (!clickBtn(b => b.textContent.trim() === 'Profiles')) return 'no-profiles-nav';
  await sleep(1500);
  for (const name of ['Alice', 'Bob', 'Carol']) {
    const openBtn = Array.from(document.querySelectorAll('button')).find(b => /Create New Profile/.test(b.textContent));
    if (!openBtn) return 'no-open-btn';
    openBtn.click(); await sleep(600);
    const input = document.querySelector('input[placeholder*="Profile name"]');
    if (!input) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, name);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    await sleep(300);
    const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Create' && !b.disabled && b.offsetParent !== null);
    if (!createBtn) return 'no-create-btn for ' + name;
    createBtn.click(); await sleep(800);
  }
  const h2 = document.querySelector('h2');
  return 'done: ' + (h2 ? h2.textContent : '?');
})()
