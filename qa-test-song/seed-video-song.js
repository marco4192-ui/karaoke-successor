/**
 * Seed 1 QA song WITH a background video (40s testsrc pattern clip) for
 * testing the BR video pause behavior (R20-2).
 * Run via: agent-browser eval "$(cat qa-test-song/seed-video-song.js)"
 */
(() => {
  const mkNote = (id, pitch, startTime, duration, lyric) => ({
    id, pitch, frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime, duration, lyric, isBonus: false, isGolden: false,
  });
  const lyrics = [];
  const mkLine = (lineId, text, start, notes) => ({
    id: lineId, text, startTime: start,
    endTime: notes.length ? notes[notes.length - 1].startTime + notes[notes.length - 1].duration : start,
    notes,
  });
  const l1 = [0, 1, 2, 3].map(i => mkNote(`qav-n1-${i}`, [58, 60, 62, 60][i], 5000 + i * 1250, 1200, ['la ', 'la ', 'la ', 'la '][i]));
  const l2 = [0, 1, 2].map(i => mkNote(`qav-n2-${i}`, [60, 62, 58][i], 25000 + i * 2000, 1900, ['da ', 'da ', 'da '][i]));
  const l3 = [0, 1, 2].map(i => mkNote(`qav-n3-${i}`, [62, 60, 58][i], 32000 + i * 850, 800, ['na ', 'na ', 'na '][i]));
  lyrics.push(mkLine('qav-l1', 'la la la la', 5000, l1));
  lyrics.push(mkLine('qav-l2', 'da da da', 25000, l2));
  lyrics.push(mkLine('qav-l3', 'na na na', 32000, l3));

  // Merge with the existing custom songs (keep QA Pause Test A/B)
  const existing = JSON.parse(localStorage.getItem('karaoke-successor-custom-songs') || '[]');
  const videoSong = {
    id: 'qa-video-test', title: 'QA Video Test', artist: 'QA Bot',
    duration: 35000, bpm: 120, difficulty: 'medium', rating: 3,
    lyrics, gap: 0, audioUrl: '/qa-short.mp3', videoBackground: '/qa-test-video.mp4',
    language: 'English', year: 2025,
  };
  const merged = [...existing.filter(s => s.id !== 'qa-video-test'), videoSong];
  localStorage.setItem('karaoke-successor-custom-songs', JSON.stringify(merged));
  return 'seeded video song (total: ' + merged.length + ' songs)';
})()
