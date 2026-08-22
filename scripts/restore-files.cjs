const fs = require('fs');
const git = require('child_process').execSync('git', ['restore', '--staged', '--', '.'], { encoding: 'utf-8', stdio: 'pipe', cwd: process.cwd() });

const FILES = [
  'src/components/game/note-lane.tsx',
  'src/components/game/note-highway.tsx',
  'src/components/game/ptm-game-hook.ts',
  'src/components/game/ptm-game-screen.tsx',
  'src/components/screens/game-screen-hook.ts',
  'src/components/screens/game-screen-types.ts',
  'src/components/screens/game-screen.tsx',
];

let allOk = true;
for (const f of FILES) {
  const result = git.execSync({ command: 'show HEAD:' + f, encoding: 'utf-8' });
  if (result.status !== 0 || result.stderr) {
    console.error('FAILED to restore ' + f + ':', result.stderr);
    allOk = false;
  }
}
if (allOk) console.log('OK: all 7 files restored');
else console.error('FAILED to restore ' + f);
console.log('Files needing edits:');
for (const f of FILES) {
  const content = fs.readFileSync(f, 'utf-8');
  if (content.includes('smoothedPitch') && !content.includes('pitchOpacity')) {
    console.log('NEEDS SMOOTHED PITCH EDIT: ' + f);
  }
  if (content.includes('animate-pulse')) {
    console.log('NEEDS ANIMATE-PULSE EDIT: ' + f);
  }
}

console.log('Done.');
process.exit(0);
