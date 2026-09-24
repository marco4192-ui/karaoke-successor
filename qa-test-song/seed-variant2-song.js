/**
 * Seed 1 QA song using the UltraStar variant-2 spacing convention
 * (leading space before each new word) with its TXT stored in the
 * IndexedDB media store — the game parses it fresh via
 * loadSongLyrics() on every start (R21 word-boundary support).
 *
 * Run via: agent-browser eval "$(cat qa-test-song/seed-variant2-song.js)"
 * (returns a Promise — the TXT blob is written to IndexedDB)
 */
(async () => {
  const TXT = [
    '#TITLE:QA Variant Two',
    '#ARTIST:QA Bot',
    '#MP3:qa-short.mp3',
    '#BPM:300',
    '#GAP:0',
    // Variant 2: the space sits BEFORE each new word (never after)
    ': 0 8 60 Hel',
    ': 16 8 60 lo',
    ': 32 8 60  World',      // ← leading space = new word
    '- 52',
    ': 64 8 60  This',       // line start → boundary dropped
    ': 80 8 60  is',
    ': 96 8 60  a',
    ': 112 8 60  test',
    '- 132',
    // syllables of the same word stay connected ("Singing"),
    // then one boundary → "karaoke" starts a new word
    ': 144 8 60 Sing',
    ': 160 8 60 ing',
    ': 176 8 60  karaoke',
    '- 196',
    'E',
  ].join('\n');

  // 1) Song in localStorage (custom songs) — lyrics EMPTY so the game
  //    loads them on demand from the stored TXT (the parser under test)
  const existing = JSON.parse(localStorage.getItem('karaoke-successor-custom-songs') || '[]');
  const song = {
    id: 'qa-variant2-test', title: 'QA Variant Two', artist: 'QA Bot',
    duration: 16000, bpm: 300, difficulty: 'medium', rating: 3,
    lyrics: [], gap: 0, audioUrl: '/qa-short.mp3',
    language: 'English', year: 2025, storedTxt: true,
  };
  const merged = [...existing.filter(s => s.id !== 'qa-variant2-test'), song];
  localStorage.setItem('karaoke-successor-custom-songs', JSON.stringify(merged));

  // custom-song-ids: the IndexedDB reconciliation needs the id listed
  try {
    const ids = JSON.parse(localStorage.getItem('karaoke-custom-song-ids') || '[]');
    if (!ids.includes('qa-variant2-test')) {
      ids.push('qa-variant2-test');
      localStorage.setItem('karaoke-custom-song-ids', JSON.stringify(ids));
    }
  } catch (e) { /* optional */ }

  // 2) TXT blob into the IndexedDB media store (same record shape as
  //    storeMedia() in src/lib/db/media-db.ts — key `${songId}-txt`)
  const blob = new Blob([TXT], { type: 'text/plain' });
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('karaoke-successor-media', 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(['media'], 'readwrite');
      const store = tx.objectStore('media');
      store.put({
        id: 'qa-variant2-test-txt',
        songId: 'qa-variant2-test',
        type: 'txt',
        data: blob,
        createdAt: Date.now(),
      });
      tx.oncomplete = () => { db.close(); resolve(null); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });

  return 'seeded variant-2 song "' + song.title + '" (TXT ' + TXT.length + ' bytes in media-db, ' + merged.length + ' songs total)';
})()
