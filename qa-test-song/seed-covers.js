/**
 * R26 bug repro seed: 6 songs — 4 with storedMedia covers (IndexedDB blobs,
 * like Converter imports) + 2 with inline data-URL covers.
 * Run via: agent-browser eval "$(cat qa-test-song/seed-covers.js)"
 */
(async () => {
  const mkCoverPng = async (r, g, b) => {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 120;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 120, 120);
    grad.addColorStop(0, `rgb(${r},${g},${b})`);
    grad.addColorStop(1, `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 40)},${Math.max(0, b - 40)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('♪', 45, 72);
    return new Promise(res => c.toBlob(res, 'image/png'));
  };
  const openDB = (name, version, store) => new Promise((res, rej) => {
    const rq = indexedDB.open(name, version);
    rq.onupgradeneeded = () => {
      if (!rq.result.objectStoreNames.contains(store)) {
        rq.result.createObjectStore(store, { keyPath: store === 'songs' ? 'id' : 'id' });
      }
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });

  const palette = [[200, 30, 30], [30, 160, 60], [40, 90, 200], [220, 140, 20], [140, 40, 180], [20, 170, 170]];
  const mkSong = async (i, title, artist, year) => ({
    id: `r26-song-${i}`,
    title, artist,
    duration: 210000, bpm: 120, difficulty: 'medium', rating: 3,
    lyrics: [], gap: 0,
    language: 'English', genre: 'Pop', year,
    dateAdded: Date.now() - i * 86400000,
    audioUrl: '/qa-test.mp3',
    storedMedia: i < 4, // first 4: cover lives in media-db (blob restore path)
    coverImage: i >= 4 ? await (async () => {
      const blob = await mkCoverPng(...palette[i]);
      return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    })() : undefined,
  });
  const songs = [
    await mkSong(0, 'Take On Me', 'a-ha', 1985),
    await mkSong(1, 'Billie Jean', 'Michael Jackson', 1983),
    await mkSong(2, 'I Will Survive', 'Gloria Gaynor', 1978),
    await mkSong(3, 'Girls Just Want to Have Fun', 'Cyndi Lauper', 1983),
    await mkSong(4, 'Like a Prayer', 'Madonna', 1989),
    await mkSong(5, 'Africa', 'Toto', 1982),
  ];

  // 1) custom songs DB
  const sdb = await openDB('karaoke-successor-custom-songs', 1, 'songs');
  await new Promise((res, rej) => {
    const tx = sdb.transaction('songs', 'readwrite');
    const st = tx.objectStore('songs');
    st.clear();
    for (const s of songs) st.put(s);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });

  // 2) media DB covers for the first 4
  // IMPORTANT: materialize all blobs BEFORE opening the transaction —
  // IndexedDB txs auto-commit when the microtask queue drains.
  const coverBlobs = [];
  for (let i = 0; i < 4; i++) coverBlobs.push(await mkCoverPng(...palette[i]));
  const mdb = await openDB('karaoke-successor-media', 2, 'media');
  await new Promise((res, rej) => {
    const tx = mdb.transaction('media', 'readwrite');
    const st = tx.objectStore('media');
    st.clear();
    for (let i = 0; i < 4; i++) {
      st.put({ id: `r26-song-${i}-cover`, songId: `r26-song-${i}`, type: 'cover', data: coverBlobs[i], createdAt: Date.now() });
      st.put({ id: `r26-song-${i}-audio`, songId: `r26-song-${i}`, type: 'audio', data: new Blob([new Uint8Array(1000)], { type: 'audio/mpeg' }), createdAt: Date.now() });
    }
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });

  // clear stale localStorage song copies so the IndexedDB load wins
  localStorage.removeItem('karaoke-successor-custom-songs');
  return 'seeded 6 songs (4 storedMedia covers + 2 data-URL covers)';
})()
