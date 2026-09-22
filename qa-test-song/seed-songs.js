/**
 * Seed 2 custom QA songs (35s, long instrumental pause, all notes within
 * ±2 semitones of MIDI 60 so a companion sending note 60 hits everything).
 * Run via: agent-browser eval "$(cat qa-test-song/seed-songs.js)"
 */
(() => {
  const mkNote = (id, pitch, startTime, duration, lyric) => ({
    id, pitch, frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime, duration, lyric, isBonus: false, isGolden: false,
  });
  // Line pitches within ±2 of 60 (medium tolerance) → constant note 60 hits all
  const mkSong = (id, title) => {
    const lyrics = [];
    const mkLine = (lineId, text, start, notes) => ({
      id: lineId, text, startTime: start,
      endTime: notes.length ? notes[notes.length - 1].startTime + notes[notes.length - 1].duration : start,
      notes,
    });
    // Line 1: 5s-10s  ("la la la la")
    const l1 = [0, 1, 2, 3].map(i => mkNote(`${id}-n1-${i}`, [58, 60, 62, 60][i], 5000 + i * 1250, 1200, ['la ', 'la ', 'la ', 'la'][i]));
    // LONG PAUSE: 10s → 25s (15s instrumental gap — tests the lyrics fade-out)
    // Line 2: 25s-31s ("da da da")
    const l2 = [0, 1, 2].map(i => mkNote(`${id}-n2-${i}`, [60, 62, 58][i], 25000 + i * 2000, 1900, ['da ', 'da ', 'da'][i]));
    // Line 3: 32s-34.5s ("na na na")
    const l3 = [0, 1, 2].map(i => mkNote(`${id}-n3-${i}`, [62, 60, 58][i], 32000 + i * 850, 800, ['na ', 'na ', 'na'][i]));
    lyrics.push(mkLine(`${id}-l1`, 'la la la la', 5000, l1));
    lyrics.push(mkLine(`${id}-l2`, 'da da da', 25000, l2));
    lyrics.push(mkLine(`${id}-l3`, 'na na na', 32000, l3));
    return {
      id, title, artist: 'QA Bot', duration: 35000, bpm: 120,
      difficulty: 'medium', rating: 3, lyrics, gap: 0,
      audioUrl: '/qa-short.mp3', language: 'English', year: 2025,
    };
  };
  const songs = [mkSong('qa-pause-a', 'QA Pause Test A'), mkSong('qa-pause-b', 'QA Pause Test B')];
  localStorage.setItem('karaoke-successor-custom-songs', JSON.stringify(songs));
  return 'seeded ' + songs.length + ' songs (lines: ' + songs[0].lyrics.map(l => (l.startTime / 1000) + '-' + (l.endTime / 1000) + 's').join(', ') + ')';
})()
