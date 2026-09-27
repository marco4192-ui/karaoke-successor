(() => {
  const imgs = [...document.querySelectorAll('img')].filter(i => i.closest('[data-testid^=song-card-]'));
  const broken = imgs.filter(i => i.src && i.complete && i.naturalWidth === 0).length;
  const pending = imgs.filter(i => !i.complete).length;
  return JSON.stringify({ total: imgs.length, ok: imgs.length - broken - pending, broken, pending });
})()
