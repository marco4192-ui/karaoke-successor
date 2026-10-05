// ===================== R54: Nav-Regeln des Companion-Clients =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring-Aufgabe des Nutzers:
// „mobile-view.ts extrem groß — auslagern?"). Reine Funktionen ohne State —
// ideal getrennt test- und wiederverwendbar.

// Desktop screens where the DESKTOP always wins over the localNav grace
// window (party/game flow — the big screen must never be overridable by a
// stale local tab highlight while a game runs).
export function isDesktopPartyScreen(desktop: string): boolean {
  return desktop === 'party' || desktop === 'party-setup'
    || desktop === 'song-voting'
    || desktop === 'game' || desktop.endsWith('-game')
    || desktop === 'results';
}

// R33/P1: Active GAME-FLOW screens. Nicht-steuernde Companion folgen dem
// Desktop-Screen NIE für Menü-Screens — ABER während eines laufenden Spiels
// zeigt jeder Companion den Game-Mirror, denn dort leben die
// Partizipations-Overlays (Pause-Dialog, Party-Leave, Song-Voting,
// BR-Singing-Monitor, Turn-Signale). Menu/config screens (party,
// party-setup, settings, …) werden NICHT erzwungen.
export function isGameFlowScreen(desktop: string): boolean {
  return desktop === 'game' || desktop.endsWith('-game')
    || desktop === 'song-voting'
    || desktop === 'results';
}

// R33/P2+P14: Für nicht-steuernde Companion gesperrte Nav-Ziele.
// (R40: Der Profile-Tab ist zurück — Spieler aktivieren/deaktivieren ist
// eine Steuerungs-Aktion, daher für nicht-steuernde gesperrt. Das EDIT des
// eigenen Profils bleibt trotzdem erlaubt — läuft über den Header-Avatar,
// nicht über die Tab-Leiste.)
export const NON_CONTROLLING_LOCKED_NAV = ['party', 'dailyChallenge', 'jukebox', 'profile', 'settings'];

export function isLockedForNonControlling(screen: string): boolean {
  return NON_CONTROLLING_LOCKED_NAV.includes(screen) || screen === 'party-setup';
}
