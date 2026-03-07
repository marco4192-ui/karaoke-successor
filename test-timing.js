// Test script to verify UltraStar timing calculations
// Run with: node test-timing.js

// UltraStar format explanation:
// - BPM: beats per minute
// - GAP: milliseconds before first note
// - Note format: `: startBeat duration pitch lyric`
// - Timing: startTime = GAP + (startBeat * beatDuration)
// -          duration = noteDuration * beatDuration
// -          where beatDuration = 60000 / BPM

const testCases = [
  {
    name: "RAYE - WHERE IS MY HUSBAND!",
    bpm: 464,
    gap: 3100,
    notes: [
      { startBeat: 0, duration: 6, lyric: "Ba" },
      { startBeat: 8, duration: 6, lyric: "by," },
      { startBeat: 20, duration: 3, lyric: "whoo–" },
    ]
  },
  {
    name: "Standard song at 120 BPM",
    bpm: 120,
    gap: 2000,
    notes: [
      { startBeat: 0, duration: 4, lyric: "Test" },
      { startBeat: 4, duration: 4, lyric: "song" },
    ]
  }
];

function calculateTiming(bpm, gap, note) {
  const beatDuration = 60000 / bpm; // ms per beat
  const startTime = gap + (note.startBeat * beatDuration);
  const duration = note.duration * beatDuration;
  const endTime = startTime + duration;
  
  return {
    beatDuration: beatDuration.toFixed(2),
    startTime: startTime.toFixed(2),
    duration: duration.toFixed(2),
    endTime: endTime.toFixed(2),
    startTimeSec: (startTime / 1000).toFixed(3),
    endTimeSec: (endTime / 1000).toFixed(3),
    durationSec: (duration / 1000).toFixed(3)
  };
}

console.log("=== UltraStar Timing Calculation Test ===\n");

for (const testCase of testCases) {
  console.log(`\n--- ${testCase.name} ---`);
  console.log(`BPM: ${testCase.bpm}`);
  console.log(`GAP: ${testCase.gap}ms`);
  console.log(`Beat Duration: ${(60000 / testCase.bpm).toFixed(2)}ms\n`);
  
  console.log("Notes:");
  for (const note of testCase.notes) {
    const timing = calculateTiming(testCase.bpm, testCase.gap, note);
    console.log(`  "${note.lyric}" (beat ${note.startBeat}, duration ${note.duration})`);
    console.log(`    Start: ${timing.startTime}ms (${timing.startTimeSec}s)`);
    console.log(`    End:   ${timing.endTime}ms (${timing.endTimeSec}s)`);
    console.log(`    Duration: ${timing.duration}ms (${timing.durationSec}s)`);
    console.log(`    Note should be active for exactly ${timing.durationSec} seconds`);
  }
}

console.log("\n=== Verification ===");
console.log("If the lyric display timing doesn't match these calculated values,");
console.log("there's an issue with the parser or display logic.");

// Simulate what should happen during playback
console.log("\n=== Playback Simulation (RAYE song) ===");
const bpm = 464;
const gap = 3100;
const beatDuration = 60000 / bpm;

const notes = [
  { startBeat: 0, duration: 6, lyric: "Ba" },
  { startBeat: 8, duration: 6, lyric: "by," },
];

console.log(`At audio time 0ms: No notes active (waiting for gap)`);
console.log(`At audio time 3000ms: Still waiting (gap is 3100ms)`);
console.log(`At audio time 3100ms: Note "Ba" becomes active (white)`);
console.log(`At audio time 3875ms: Note "Ba" ends, should be colored as "sung"`);
console.log(`At audio time 4134ms: Note "by," becomes active (3100 + 8*129.31)`);
console.log(`At audio time 4910ms: Note "by," ends, should be colored as "sung"`);

// Check if timing drifts
console.log("\n=== Checking for timing drift ===");
console.log("If text falls behind over time, check:");
console.log("1. Is audio.currentTime being used correctly?");
console.log("2. Is there any accumulated rounding error?");
console.log("3. Is the BPM/GAP parsed correctly from the file?");
