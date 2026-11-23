// R95 E2E: Injects two QA songs (duel + duet) into the custom-songs IndexedDB.
// Run inside the app page via agent-browser eval.
(async () => {
  const mkNote = (id, pitch, startBeat, durBeats, lyric, player, golden) => ({
    id, pitch, frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime: 4000 + startBeat * 500, duration: durBeats * 500, lyric,
    isBonus: false, isGolden: !!golden, ...(player ? { player } : {}),
  });
  const mkLine = (id, text, startTime, endTime, notes, player) => ({
    id, text, startTime, endTime, notes, ...(player ? { player } : {}),
  });

  // ── Song 1: QA Duel Song (no player markers → duel on same notes) ──
  const duelNotes = [
    mkNote('d1', 60, 0, 4, 'la '), mkNote('d2', 62, 4, 4, 'da '),
    mkNote('d3', 64, 8, 4, 'na '), mkNote('d4', 65, 12, 4, 'ta ', null, true),
    mkNote('d5', 67, 16, 4, 'ra '), mkNote('d6', 65, 20, 4, 'ma '),
  ];
  const duelSong = {
    id: 'qa-duel-song', title: 'QA Duel Song', artist: 'QA Bot', album: 'QA', year: 2025,
    genre: 'Pop', language: 'en', duration: 30000, bpm: 120, difficulty: 'easy', rating: 3,
    lyrics: [
      mkLine('dl1', 'la da na ta ', 4000, 12000, duelNotes.slice(0, 4)),
      mkLine('dl2', 'ra ma ', 12000, 20000, duelNotes.slice(4)),
    ],
    audioUrl: '/qa-test.mp3', hasEmbeddedAudio: false,
  };

  // ── Song 2: QA Duet Song (explicit P1/P2 markers + part names) ──
  const duetP1 = [mkNote('u1', 60, 0, 4, 'la ', 'P1'), mkNote('u2', 62, 4, 4, 'da ', 'P1')];
  const duetP2 = [mkNote('u3', 64, 8, 4, 'na ', 'P2'), mkNote('u4', 65, 12, 4, 'ta ', 'P2', true)];
  const duetSong = {
    id: 'qa-duet-song', title: 'QA Duet Song', artist: 'QA Bot', album: 'QA', year: 2025,
    genre: 'Pop', language: 'en', duration: 30000, bpm: 120, difficulty: 'easy', rating: 3,
    lyrics: [
      mkLine('ul1', 'la da ', 4000, 8000, duetP1, 'P1'),
      mkLine('ul2', 'na ta ', 8000, 12000, duetP2, 'P2'),
    ],
    isDuet: true, duetPlayerNames: ['Lead Part', 'Harmony Part'],
    audioUrl: '/qa-test.mp3', hasEmbeddedAudio: false,
  };

  const db = await new Promise((res, rej) => {
    const r = indexedDB.open('karaoke-successor-custom-songs', 1);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  await new Promise((res, rej) => {
    const tx = db.transaction('songs', 'readwrite');
    tx.objectStore('songs').put(duelSong);
    tx.objectStore('songs').put(duetSong);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  window.localStorage.setItem('karaoke-custom-song-ids', JSON.stringify(['qa-duel-song', 'qa-duet-song']));
  return 'injected: qa-duel-song, qa-duet-song';
})()
