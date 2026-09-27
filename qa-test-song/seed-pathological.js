/**
 * R26 verification seed: 2 pathological songs.
 * - r26-dead-blob: storedMedia=true, coverImage=DEAD blob URL (simulates a
 *   revoked/previous-session URL cached in a song record), NO cover in media-db
 * - r26-path-cover: coverImage='cover.jpg' (raw path, like old New-Song-Dialog
 *   records), storedMedia=false
 * Both must render the MusicIcon placeholder — never the broken-image icon.
 */
(async () => {
  const openDB = (name, version, store) => new Promise((res, rej) => {
    const rq = indexedDB.open(name, version);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  const sdb = await openDB('karaoke-successor-custom-songs', 1, 'songs');
  await new Promise((res, rej) => {
    const tx = sdb.transaction('songs', 'readwrite');
    const st = tx.objectStore('songs');
    st.put({
      id: 'r26-dead-blob', title: 'Dead Blob Cover', artist: 'QA Pathology',
      duration: 180000, bpm: 120, difficulty: 'medium', rating: 3, lyrics: [], gap: 0,
      language: 'English', genre: 'Pop', year: 1990, dateAdded: Date.now(),
      audioUrl: '/qa-test.mp3', storedMedia: true,
      coverImage: 'blob:http://localhost:3000/00000000-dead-dead-dead-000000000000',
    });
    st.put({
      id: 'r26-path-cover', title: 'Path Cover Song', artist: 'QA Pathology',
      duration: 180000, bpm: 120, difficulty: 'medium', rating: 3, lyrics: [], gap: 0,
      language: 'English', genre: 'Pop', year: 1991, dateAdded: Date.now(),
      audioUrl: '/qa-test.mp3', storedMedia: false,
      coverImage: 'cover.jpg',
    });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  return 'seeded 2 pathological songs';
})()
