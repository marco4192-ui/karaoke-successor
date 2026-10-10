/**
 * Q8 demo-state seeder: 5 test songs (ABBA/Queen/Nena/MJ/Beatles) into IndexedDB
 * + active motto party "80er Jahre Party" (era 1980) + German UI language.
 * Recreates the R24/R25 demo fixtures after a fresh browser profile.
 * Run via: agent-browser eval "$(cat qa-test-song/seed-q8-demo.js)"
 */
(async () => {
  const mkNote = (id, pitch, startTime, duration, lyric) => ({
    id, pitch, frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime, duration, lyric, isBonus: false, isGolden: false,
  });
  const mkLine = (id, text, start, notes) => ({
    id, text, startTime: start,
    endTime: notes.length ? notes[notes.length - 1].startTime + notes[notes.length - 1].duration : start,
    notes,
  });
  const cover = (c1, c2, label) =>
    'data:image/svg+xml;base64,' + btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/>' +
      '<text x="150" y="160" font-size="60" text-anchor="middle" fill="white" font-family="sans-serif">' + label + '</text></svg>');
  const mkSong = (id, title, artist, year, genre, language, c1, c2) => {
    const notes = [0, 1, 2, 3].map(i => mkNote(id + '-n' + i, [60, 62, 64, 62][i], 1000 + i * 1000, 900, ['la ', 'la ', 'la ', 'la'][i]));
    return {
      id, title, artist, year, genre, language,
      duration: 20000, bpm: 120, difficulty: 'medium', rating: 3,
      lyrics: [mkLine(id + '-l1', 'la la la la', 1000, notes)],
      coverImage: cover(c1, c2, title.slice(0, 2)),
      gap: 0, dateAdded: Date.now(),
    };
  };
  const songs = [
    mkSong('q8-abba', 'Dancing Queen', 'ABBA', 1976, 'Pop', 'English', '#e91e63', '#9c27b0'),
    mkSong('q8-queen', 'Bohemian Rhapsody', 'Queen', 1975, 'Rock', 'English', '#2196f3', '#3f51b5'),
    mkSong('q8-nena', '99 Luftballons', 'Nena', 1983, 'Pop', 'German', '#f44336', '#ff9800'),
    mkSong('q8-mj', 'Thriller', 'Michael Jackson', 1982, 'Pop', 'English', '#4caf50', '#009688'),
    mkSong('q8-beatles', 'Hey Jude', 'The Beatles', 1968, 'Rock', 'English', '#ffeb3b', '#f57f17'),
  ];
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('karaoke-successor-custom-songs', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('songs')) {
        const store = db.createObjectStore('songs', { keyPath: 'id' });
        store.createIndex('artist', 'artist', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('songs', 'readwrite');
      const store = tx.objectStore('songs');
      store.clear();
      songs.forEach(s => store.put(s));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
  localStorage.setItem('karaoke-custom-song-ids', JSON.stringify(songs.map(s => s.id)));
  localStorage.setItem('karaoke-motto-party', JSON.stringify({
    enabled: true, name: '80er Jahre Party', logic: 'or',
    searchFields: [], filters: { genre: 'all', language: 'all', releaseYear: 'all', era: '1980' },
  }));
  localStorage.setItem('karaoke-language', 'de');
  return 'seeded ' + songs.length + ' songs + motto party + de';
})()
