const fs = require('fs');
const { execSync } = require('child_process');


const FILES = [
  'src/components/game/note-lane.tsx',
  'src/components/game/note-highway.tsx',
  'src/components/game/ptm-game-hook.ts',
  'src/components/game/ptm-game-screen.tsx',
  'src/components/screens/game-screen-hook.ts',
  'src/components/screens/game-screen-types.ts',
  'src/components/screens/game-screen.tsx',
];

let gitArgs = ['restore', '--staged', '--', '.'];
let allOk = true;
for (const f of FILES) {
  try {
    const result = execSync({ command: 'show HEAD:' + f + ' --format=' }', encoding: 'utf-8', stdio: 'pipe', cwd: process.cwd() });
    if (result.status !== 0 || result.stderr) {
      console.error('FAILED to restore ' + f + ':', result.stderr);
      allOk = false;
    }
    console.log('OK: restored ' + f);
  }
process.exit(0);
