/**
 * R41/P4 — Highlight-Rahmen für AKTIVE Filter (Nutzerwunsch: „Filter sollen
 * im aktiven Zustand einen prominenten farbigen Rahmen bekommen").
 *
 * Familienweit einheitliches Rezept über ALLE Filter-UIs der App
 * (Bibliothek, Jukebox, Party-Setup, Medley, Rate-My-Song, Editor):
 * - Dropdowns/Suchfelder ohne eigene Aktiv-Farbe → CYAN-Rahmen (App-weiter
 *   Akzent, rgb(34,211,238) = cyan-400), bestehend aus: kräftiger Rand +
 *   1px-Ring + sanftem Glow + leicht angehobenem Hintergrund.
 * - Suchfelder mit Text → subtilere Variante (Rand + dezenter Ring, kein
 *   Glow), damit der Fokus-Ring dominant bleibt.
 * - Chips/Buttons mit bereits etablierter Aktiv-Farbe (pink = Duett,
 *   orange = Viral, purple = Gruppen/Playlists, …) behalten ihre Farbe und
 *   bekommen Ring + Glow in derselben Farbe (siehe Aufrufstellen).
 *
 * Barrierefreiheit: Fokus-Ringe bleiben intakt — Tailwind-Fokus-Varianten
 * (focus:/focus-visible:) überschreiben den Aktiv-Rahmen im fokussierten
 * Zustand; un-fokussiert zeigt der Aktiv-Rahmen. Die Klassen sind reine
 * Rahmen-/Glow-Utilities und verändern nichts an Layout oder Touch-Größe.
 *
 * HINWEIS für native <select>/<input> (kein cn()/tailwind-merge!):
 * Dort dürfen die Aktiv-Klassen NICHT zusätzlich zu den Inaktiven ins
 * className-String gesetzt werden (Konflikt bei bg- und border-Klassen,
 * CSS-Reihenfolge unbestimmt) — stattdessen per Ternary entweder/oder
 * einsetzen. Bei shadcn-Komponenten (Input/SelectTrigger, cn() mit
 * tailwind-merge) gewinnt die später übergebene Klasse automatisch.
 */
export const FILTER_ACTIVE_FRAME =
  'border-cyan-400/70 bg-cyan-500/10 ring-1 ring-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]';

/**
 * R51/Bug1 — Aktiv-Rahmen für native <select>-Elemente: gleiche Cyan-Optik
 * (Rand + Ring + Glow) wie FILTER_ACTIVE_FRAME, aber mit OPHEQUEM
 * Hintergrund. Native Select-Popups (v.a. WebView2/Tauri, aber auch Chrome)
 * brauchen eine deckende background-color auf dem <select>, sonst rendert
 * das aufklappende Optionsmenü hell — die weiße Schrift wird unlesbar.
 * bg-cyan-500/10 (transluzent) reicht dafür nicht.
 */
export const FILTER_ACTIVE_FRAME_SELECT =
  'border-cyan-400/70 bg-gray-800 ring-1 ring-cyan-400/40 shadow-[0_0_10px_rgba(34,211,238,0.25)]';

/** Subtilere Variante für Suchfelder mit Inhalt (kein Glow). */
export const SEARCH_ACTIVE_FRAME = 'border-cyan-400/60 ring-1 ring-cyan-400/30';

/** Inaktiv-Zustand der Standard-Dropdowns (weißer Rand auf dunklem Grund). */
export const FILTER_INACTIVE_FRAME = 'border-white/20 bg-gray-800';
