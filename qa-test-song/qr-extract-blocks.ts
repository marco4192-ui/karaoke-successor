// QR: karaoke-app.tsx — Blöcke 551-911 (Remote-Events) und 925-1246 (2s-Sync)
// zeilenbasiert durch Hook-Aufrufe ersetzen. Von hinten nach vorn.
import { readFileSync, writeFileSync } from 'fs';

const p = '/home/z/my-project/src/app/karaoke-app.tsx';
const lines = readFileSync(p, 'utf8').split('\n');

// Verifikation der Grenzen (1-basiert → 0-basiert Index):
const check = (idx: number, expected: string, label: string) => {
  if (!lines[idx].includes(expected)) {
    throw new Error(`Grenze ${label} falsch: Zeile ${idx + 1} = "${lines[idx].slice(0, 60)}" erwartet "${expected}"`);
  }
};
check(550, '// ── Global remote control from mobile companions ──', 'B1-Start');
check(910, '}, [navigateWithGuard]);', 'B1-Ende');
check(924, '// ── Sync current screen to mobile companions (every 2s) ──', 'B2-Start');
check(1245, '}, [tournamentBracketObj, currentTournamentMatchObj, tournamentVotingMatchObj]);', 'B2-Ende');

const b1 = `  // ── Companion remote events (QR: ausgelagert nach use-companion-remote-events.ts) ──
  useCompanionRemoteEvents({
    navigateWithGuard,
    setScreen,
    screen,
    pauseGame,
    resumeGame,
    toggleFullscreen,
    isPartyActiveDirect,
    setPauseInitiator,
    setAutoPlayNext,
  });`;

const b2 = `  // ── 2s-Companion-Sync (QR: ausgelagert nach use-mobile-screen-sync.ts) ──
  useMobileScreenSync({
    screen,
    pauseInitiator,
    ptmPhase,
    isPartyActiveDirect,
    isPartyGameScreen,
    viralSongIds: viralCharts.viralSongIds,
    syncScreenRef,
  });`;

// Block 2 zuerst (hinten), dann Block 1 — Zeilennummern bleiben valide
lines.splice(924, 322, b2);   // 925-1246 (1-basiert) → Index 924, Länge 322
lines.splice(550, 361, b1);   // 551-911 → Index 550, Länge 361

writeFileSync(p, lines.join('\n'));
console.log('OK — neue Zeilenzahl:', lines.length);
