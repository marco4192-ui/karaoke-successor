'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ICON CATALOG — vollständige Referenz aller Icons im Spiel (R93)
//
// Zweck: Der Nutzer möchte eigene "handgemachte" Icons kreieren. Diese Datei
// listet JEDES Icon, das im Spiel vorkommt (Lucide-Importe, eigene
// SVG-Komponenten aus components/icons.tsx sowie inline definierte SVGs),
// zusammen mit seiner Funktion — wo es steht und wofür es gedacht ist.
//
// Die Icon-Galerie (icon-gallery-dialog.tsx) rendert diesen Katalog mit
// Suche, Kategorie-Filter und SVG-Vorlagen-Download.
//
// Pflege: Wenn ein neues Icon eingebaut wird, hier einen Eintrag ergänzen.
// ─────────────────────────────────────────────────────────────────────────────

import type { ComponentType } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Angry, ArrowLeft, ArrowUpDown, Award, BadgeCheck,
  BookOpen, Brain, Calendar, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CloudUploadIcon, Columns2, Copy, Cpu, Crown, Database, Disc3, FileDownIcon,
  FileMusic, FileText, Film, Flame, FolderOpen, Gauge, Hand, HelpCircle, History, Image,
  Info, KeyRoundIcon, Keyboard, Layers, Link2, ListMusic, ListPlus, Loader2, LogOutIcon,
  Magnet, MailIcon, Merge, MessageSquareWarning, Mic, Mic2, Monitor, MonitorPlay,
  MousePointerClick, Music, Music2, Music4, PackageCheck, PackageX, PartyPopper, Pause,
  Play, Plus, Radio, Redo, RefreshCw, Rewind, RotateCcw, Save, ScanLine, Scissors, Search,
  Server, Settings, SkipBack, SkipForward, Sparkles, Square, Star, Tag, Target, Trash2,
  Undo, Upload, Users, Video, Wallpaper, Waves, Wifi, WifiOff, X, XCircle, Zap, ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  MusicIcon, LibraryIcon, PartyIcon, UserIcon, QueueIcon, StarIcon, TrophyIcon, SettingsIcon,
  MicIcon, PhoneIcon, FolderIcon, TrashIcon, PlayIcon, PauseIcon, VolumeIcon, VolumeMutedIcon,
  CheckIcon, PlusIcon, InfoIcon, GlobeIcon, CloudUploadIcon as CustomCloudUploadIcon,
  CloudDownloadIcon, LanguageIcon, KeyboardIcon, PaletteIcon, GamepadIcon, WebcamIcon,
} from '@/components/icons';

// ── Inline-SVG-Icons (direkt in Komponenten definierte SVGs, 1:1 kopiert) ──

/** Navbar: Desktop-Chat öffnen. */
function ChatInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Navbar/Spiel-HUD: Vollbild aktivieren (F12). */
function FullscreenEnterInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

/** Navbar/Spiel-HUD: Vollbild verlassen. */
function FullscreenExitInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

/** Jukebox-Player: vorheriger Song. */
function JukeboxPrevInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

/** Jukebox-Player: nächster Song. */
function JukeboxNextInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

/** Jukebox-Player: Wiederholen (aus / alle / einen). */
function JukeboxRepeatInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/** Jukebox-Player: Video hinzufügen / Video-Link. */
function JukeboxVideoInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 5h18v14H3z" />
    </svg>
  );
}

/** Jukebox-Setup: Jahrzehnt-/Ära-Filter (z.B. 80er, 90er). */
function CalendarRangeInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8" y2="17" /><line x1="12" y1="14" x2="12" y2="17" /><line x1="16" y1="14" x2="16" y2="17" />
    </svg>
  );
}

/** Jukebox-Setup: Uhr (geplanter Start / Wartezeit). */
function ClockInlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Katalog-Typen ────────────────────────────────────────────────────────────

export type IconCategoryId =
  | 'nav' | 'media' | 'actions' | 'editor' | 'game'
  | 'library' | 'profile' | 'status' | 'ui';

export interface IconCatalogEntry {
  /** Stabile ID (u.a. für Download-Dateinamen). */
  id: string;
  /** Anzeigename / Importname. */
  name: string;
  /** Woher kommt das Icon? */
  set: 'lucide' | 'custom' | 'inline';
  /** Kategorie für den Filter. */
  category: IconCategoryId;
  /** Render-Komponente für die Vorschau. */
  component: ComponentType<{ className?: string }>;
  /** Funktion: Wo steht es, wofür ist es da? */
  desc: string;
  /** Spielflächen, auf denen es auftaucht (kurze Badges). */
  areas: string[];
  /** Weitere Importnamen für dasselbe Glyph. */
  aliases?: string[];
}

export const ICON_CATEGORIES: { id: IconCategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'nav', label: 'Navigation' },
  { id: 'media', label: 'Wiedergabe' },
  { id: 'actions', label: 'Aktionen' },
  { id: 'editor', label: 'Editor' },
  { id: 'game', label: 'Spiel & Party' },
  { id: 'library', label: 'Bibliothek & Jukebox' },
  { id: 'profile', label: 'Profil & Online' },
  { id: 'status', label: 'Status & System' },
  { id: 'ui', label: 'UI-Elemente' },
];

// ── Der Katalog ──────────────────────────────────────────────────────────────

export const ICON_CATALOG: IconCatalogEntry[] = [
  // ═══════════════ NAVIGATION ═══════════════
  {
    id: 'library', name: 'LibraryIcon', set: 'custom', category: 'nav', component: LibraryIcon,
    desc: 'Hauptnavigation „Bibliothek" in der Navbar (vier Kacheln) und im Handy-Spiegel. Führt zur Musiksammlung mit allen Songs, Playlists und Ordnern.',
    areas: ['Navbar', 'Handy'],
  },
  {
    id: 'party', name: 'PartyIcon', set: 'custom', category: 'nav', component: PartyIcon,
    desc: 'Hauptnavigation „Party" in der Navbar und auf der Startkarte. Konfetti-Popper — öffnet den Party-Bereich mit allen Partymodi (Duell, Turnier, Battle Royale …).',
    areas: ['Navbar', 'Start'],
  },
  {
    id: 'user', name: 'UserIcon', set: 'custom', category: 'nav', component: UserIcon,
    desc: 'Hauptnavigation „Profile" in der Navbar. Kopf-Silhouette — öffnet die Spieler-Profile (Charaktere) mit Fortschritt und Statistiken.',
    areas: ['Navbar', 'Profil'],
  },
  {
    id: 'queue', name: 'QueueIcon', set: 'custom', category: 'nav', component: QueueIcon,
    desc: 'Hauptnavigation „Warteschlange" in der Navbar (mit Zähler-Badge für anstehende Songs). Liste mit drei Strichen — ebenfalls in Playlist-Ansicht und Song-Start-Dialog.',
    areas: ['Navbar', 'Warteschlange', 'Handy'],
  },
  {
    id: 'star', name: 'StarIcon', set: 'custom', category: 'nav', component: StarIcon,
    desc: 'Navbar-Eintrag „Daily Challenge" (tägliche Herausforderung) und Favoriten-Markierung in der Bibliothek (Stern, optional gefüllt).',
    areas: ['Navbar', 'Bibliothek'],
  },
  {
    id: 'trophy', name: 'TrophyIcon', set: 'custom', category: 'nav', component: TrophyIcon,
    desc: 'Navbar-Einträge „Highscores" und „Erfolge" — beide nutzen den Pokal. Auch auf der Startkarte, im Song-Start-Dialog und im Online-Multiplayer.',
    areas: ['Navbar', 'Highscores', 'Erfolge'],
  },
  {
    id: 'settings', name: 'SettingsIcon', set: 'custom', category: 'nav', component: SettingsIcon,
    desc: 'Hauptnavigation „Einstellungen" in der Navbar; Zahnrad mit Strahlen auch auf der Mikrofon-Karte. Öffnet das komplette Einstellungsmenü.',
    areas: ['Navbar', 'Einstellungen'],
  },
  {
    id: 'music', name: 'MusicIcon', set: 'custom', category: 'nav', component: MusicIcon,
    desc: 'Navbar-Eintrag „Jukebox" (Musiknote) — außerdem Startkarten, Highscores und die komplette Jukebox-Steuerung. Das meistgenutzte Icon im Spiel.',
    areas: ['Navbar', 'Start', 'Jukebox', 'Highscores'],
  },
  {
    id: 'mic', name: 'MicIcon', set: 'custom', category: 'nav', component: MicIcon,
    desc: 'Mikrofon — Tab-Symbol der Mikrofon-Einstellungen, Song-Start-Dialog (Singen starten) und Handy-App. Steht überall für Gesang/Stimme.',
    areas: ['Einstellungen', 'Song-Start', 'Handy'],
  },
  {
    id: 'phone', name: 'PhoneIcon', set: 'custom', category: 'nav', component: PhoneIcon,
    desc: 'Smartphone — Tab-Symbol für Handy/Companion (verbundene Geräte als Controller). In den Einstellungen und der Handy-App selbst.',
    areas: ['Einstellungen', 'Handy'],
  },
  {
    id: 'info', name: 'InfoIcon', set: 'custom', category: 'nav', component: InfoIcon,
    desc: 'Info/i — Tab-Symbol „Über/Info" in den Einstellungen sowie Hinweis-Symbol bei Mikrofon- und Webcam-Einstellungen.',
    areas: ['Einstellungen'],
  },
  {
    id: 'palette', name: 'PaletteIcon', set: 'custom', category: 'nav', component: PaletteIcon,
    desc: 'Malpalette — Tab-Symbol „Erscheinungsbild" (Themes & Design) in den Einstellungen.',
    areas: ['Einstellungen'],
  },
  {
    id: 'gamepad', name: 'GamepadIcon', set: 'custom', category: 'nav', component: GamepadIcon,
    desc: 'Controller — Tab-Symbol „Gameplay" (Spielregeln, Schwierigkeit, Partymodus-Einstellungen).',
    areas: ['Einstellungen'],
  },
  {
    id: 'language', name: 'LanguageIcon', set: 'custom', category: 'nav', component: LanguageIcon,
    desc: 'Globus — Sprachauswahl im „Allgemein"-Tab der Einstellungen.',
    areas: ['Einstellungen'],
  },
  {
    id: 'keyboard', name: 'KeyboardIcon', set: 'custom', category: 'nav', component: KeyboardIcon,
    desc: 'Tastatur — Tastaturbelegung/Shortcuts im „Allgemein"-Tab der Einstellungen.',
    areas: ['Einstellungen'],
  },
  {
    id: 'webcam', name: 'WebcamIcon', set: 'custom', category: 'nav', component: WebcamIcon,
    desc: 'Videokamera — Tab-Symbol „Webcam" (Kamera als Hintergrund beim Singen).',
    areas: ['Einstellungen'],
  },
  {
    id: 'radio', name: 'Radio', set: 'lucide', category: 'nav', component: Radio,
    desc: 'Radio — Jukebox-Kachel auf dem Startbildschirm („Musik abspielen ohne Singen").',
    areas: ['Start'],
  },
  {
    id: 'award', name: 'Award', set: 'lucide', category: 'nav', component: Award,
    desc: 'Medaille — Erfolge-Kachel (Achievements) auf dem Startbildschirm.',
    areas: ['Start'],
  },
  {
    id: 'help-circle', name: 'HelpCircle', set: 'lucide', category: 'nav', component: HelpCircle,
    desc: 'Fragezeichen-Kreis — Hilfe-Menü mit Tutorials und geführten Touren (auch der ?-Button in der Navbar nutzt dieses Motiv).',
    areas: ['Hilfe'],
  },
  {
    id: 'chat', name: 'ChatIcon (inline)', set: 'inline', category: 'nav', component: ChatInlineIcon,
    desc: 'Sprechblase — Chat-Button in der Navbar, öffnet den Desktop-Chat (Nachrichten an verbundene Companion-Handys).',
    areas: ['Navbar'],
  },

  // ═══════════════ WIEDERGABE ═══════════════
  {
    id: 'play', name: 'PlayIcon', set: 'custom', category: 'media', component: PlayIcon,
    desc: 'Start/Abspielen — großes gefülltes Dreieck: Startkarte, Jukebox-Player, Song-Karten und Playlists. Startet Song oder Wiedergabe.',
    areas: ['Start', 'Jukebox', 'Bibliothek'],
  },
  {
    id: 'pause', name: 'PauseIcon', set: 'custom', category: 'media', component: PauseIcon,
    desc: 'Pause — zwei gefüllte Balken, pausiert die Wiedergabe im Jukebox-Player.',
    areas: ['Jukebox'],
  },
  {
    id: 'volume', name: 'VolumeIcon', set: 'custom', category: 'media', component: VolumeIcon,
    desc: 'Lautsprecher mit Schallwellen — Lautstärke-/regler der Musik auf dem Startbildschirm (Splash).',
    areas: ['Start'],
  },
  {
    id: 'volume-muted', name: 'VolumeMutedIcon', set: 'custom', category: 'media', component: VolumeMutedIcon,
    desc: 'Lautsprecher mit X — Stumm-Schalter der Startbildschirm-Musik.',
    areas: ['Start'],
  },
  {
    id: 'jukebox-prev', name: 'Jukebox Prev (inline)', set: 'inline', category: 'media', component: JukeboxPrevInlineIcon,
    desc: 'Doppelpfeil links — vorheriger Song im Jukebox-Player.',
    areas: ['Jukebox'],
  },
  {
    id: 'jukebox-next', name: 'Jukebox Next (inline)', set: 'inline', category: 'media', component: JukeboxNextInlineIcon,
    desc: 'Doppelpfeil rechts — nächster Song im Jukebox-Player.',
    areas: ['Jukebox'],
  },
  {
    id: 'jukebox-repeat', name: 'Jukebox Repeat (inline)', set: 'inline', category: 'media', component: JukeboxRepeatInlineIcon,
    desc: 'Kreispfeile — Wiederholungs-Modus im Jukebox (aus → alle wiederholen → einen wiederholen).',
    areas: ['Jukebox'],
  },
  {
    id: 'lucide-play', name: 'Play', set: 'lucide', category: 'media', component: Play,
    desc: 'Abspielen/Vorschau — Editor (Metadaten & Timeline-Vorschau) und Hilfe-Menü (Tour starten).',
    areas: ['Editor', 'Hilfe'],
  },
  {
    id: 'lucide-pause', name: 'Pause', set: 'lucide', category: 'media', component: Pause,
    desc: 'Pause — hält die Vorschau in der Editor-Timeline an.',
    areas: ['Editor'],
  },
  {
    id: 'skip-back', name: 'SkipBack', set: 'lucide', category: 'media', component: SkipBack,
    desc: 'Springt in der Editor-Timeline zum Anfang/zurück.',
    areas: ['Editor'],
  },
  {
    id: 'skip-forward', name: 'SkipForward', set: 'lucide', category: 'media', component: SkipForward,
    desc: 'Springt in der Editor-Timeline und in den Metadaten nach vorne.',
    areas: ['Editor'],
  },
  {
    id: 'rewind', name: 'Rewind', set: 'lucide', category: 'media', component: Rewind,
    desc: 'Zurückspulen — Video-Sync-Overlay im Editor.',
    areas: ['Editor'],
  },
  {
    id: 'square', name: 'Square', set: 'lucide', category: 'media', component: Square,
    desc: 'Stopp — stoppt die Wiedergabe im Editor.',
    areas: ['Editor'],
  },

  // ═══════════════ AKTIONEN ═══════════════
  {
    id: 'plus', name: 'PlusIcon', set: 'custom', category: 'actions', component: PlusIcon,
    desc: 'Hinzufügen/Neu erstellen — z.B. neues Spielerprofil anlegen, Mikrofon-Profil hinzufügen.',
    areas: ['Profil', 'Einstellungen'],
  },
  {
    id: 'lucide-plus', name: 'Plus', set: 'lucide', category: 'actions', component: Plus,
    desc: 'Hinzufügen — Noten im Editor einfügen, Songs zum Jukebox-Pool, neue Mottos.',
    areas: ['Editor', 'Jukebox', 'Einstellungen'],
  },
  {
    id: 'trash', name: 'TrashIcon', set: 'custom', category: 'actions', component: TrashIcon,
    desc: 'Löschen (Papierkorb) — Playlists, Companion-Geräte, Mikrofon-Profile und Bibliothek-Einträge entfernen.',
    areas: ['Bibliothek', 'Einstellungen'],
  },
  {
    id: 'trash-2', name: 'Trash2', set: 'lucide', category: 'actions', component: Trash2,
    desc: 'Löschen — Editor-Elemente, Party-Verlauf-Einträge und Mottos entfernen.', aliases: ['Trash2Icon (Profil löschen)'],
    areas: ['Editor', 'Party', 'Einstellungen', 'Profil'],
  },
  {
    id: 'check', name: 'CheckIcon', set: 'custom', category: 'actions', component: CheckIcon,
    desc: 'Bestätigt/Fertig — Häkchen nach erfolgreichem Mikrofon-Test, „Bibliothek bereit" im Startbildschirm, Companion-Auswahl.',
    areas: ['Einstellungen', 'Bibliothek', 'Start'],
  },
  {
    id: 'lucide-check', name: 'Check', set: 'lucide', category: 'actions', component: Check,
    desc: 'Häkchen — erledigt/ausgewählt im Hilfe-Menü und der Select-Komponente.', aliases: ['CheckIcon'],
    areas: ['Hilfe', 'UI'],
  },
  {
    id: 'x', name: 'X', set: 'lucide', category: 'actions', component: X,
    desc: 'Schließen/Abbrechen — das Universalsymbol: Dialoge, Fehler-Chips, Tabs, überall.', aliases: ['XIcon'],
    areas: ['Editor', 'Spiel', 'UI', 'Dialoge'],
  },
  {
    id: 'copy', name: 'Copy', set: 'lucide', category: 'actions', component: Copy,
    desc: 'Kopieren — ausgewählte Noten/Elemente im Editor duplizieren.',
    areas: ['Editor'],
  },
  {
    id: 'save', name: 'Save', set: 'lucide', category: 'actions', component: Save,
    desc: 'Speichern (Diskette) — Song im Editor-Header und Neuer-Song-Dialog sichern.',
    areas: ['Editor'],
  },
  {
    id: 'undo', name: 'Undo', set: 'lucide', category: 'actions', component: Undo,
    desc: 'Rückgängig — letzte Aktion im Editor zurücknehmen.',
    areas: ['Editor'],
  },
  {
    id: 'redo', name: 'Redo', set: 'lucide', category: 'actions', component: Redo,
    desc: 'Wiederholen — rückgängig gemachte Aktion im Editor wiederherstellen.',
    areas: ['Editor'],
  },
  {
    id: 'search', name: 'Search', set: 'lucide', category: 'actions', component: Search,
    desc: 'Lupe — Suche nach Songs/Spielern: Party-Setup, Motto-Party-Tab und Handy-Spiegel.',
    areas: ['Party', 'Einstellungen', 'Handy'],
  },
  {
    id: 'refresh', name: 'RefreshCw', set: 'lucide', category: 'actions', component: RefreshCw,
    desc: 'Neu laden (Kreispfeile) — Highscores aktualisieren.',
    areas: ['Highscores'],
  },
  {
    id: 'upload-lucide', name: 'CloudUploadIcon (Lucide)', set: 'lucide', category: 'actions', component: CloudUploadIcon,
    desc: 'Cloud mit Pfeil hoch — Profil-Backup hochladen (vor dem Löschen eines Profils).',
    areas: ['Profil'],
  },

  // ═══════════════ EDITOR ═══════════════
  {
    id: 'note-normal', name: 'Music (Notentyp)', set: 'lucide', category: 'editor', component: Music,
    desc: 'Normale Note — Notentyp-Auswahl in der Editor-Werkzeugleiste; zusätzlich Song-Symbol in Audio-Analyse und Party-Verlauf.',
    areas: ['Editor', 'Party'],
  },
  {
    id: 'note-golden', name: 'Star (Notentyp)', set: 'lucide', category: 'editor', component: Star,
    desc: 'Goldene Note — Notentyp in der Editor-Werkzeugleiste (Bonus-Punkte); Stern auch als Bewertung im MIDI-Import und Party-Verlauf.',
    areas: ['Editor'],
  },
  {
    id: 'note-freestyle', name: 'Zap (Notentyp)', set: 'lucide', category: 'editor', component: Zap,
    desc: 'Freestyle-Note — Blitz-Notentyp in der Editor-Werkzeugleiste (kein Tonhöhen-Score, Rap/gesprochen).',
    areas: ['Editor'],
  },
  {
    id: 'mic-lucide', name: 'Mic', set: 'lucide', category: 'editor', component: Mic,
    desc: 'Mikrofon — Gesangsspur/Noten-Spur im Editor auswählen.',
    areas: ['Editor'],
  },
  {
    id: 'mic2', name: 'Mic2', set: 'lucide', category: 'editor', component: Mic2,
    desc: 'Zweites Mikrofon — zweite Gesangsstimme (Duett P2) im Editor umschalten.',
    areas: ['Editor'],
  },
  {
    id: 'scissors', name: 'Scissors', set: 'lucide', category: 'editor', component: Scissors,
    desc: 'Schere — Note an der Cursor-Position teilen.',
    areas: ['Editor'],
  },
  {
    id: 'merge', name: 'Merge', set: 'lucide', category: 'editor', component: Merge,
    desc: 'Zusammenfügen — mehrere Noten zu einer verbinden.',
    areas: ['Editor'],
  },
  {
    id: 'arrow-up-down', name: 'ArrowUpDown', set: 'lucide', category: 'editor', component: ArrowUpDown,
    desc: 'Doppelpfeil hoch/runter — Tonhöhe der ausgewählten Note ändern.',
    areas: ['Editor'],
  },
  {
    id: 'hand', name: 'Hand', set: 'lucide', category: 'editor', component: Hand,
    desc: 'Hand — Ansicht in der Timeline verschieben (Pan-Werkzeug).',
    areas: ['Editor'],
  },
  {
    id: 'magnet', name: 'Magnet', set: 'lucide', category: 'editor', component: Magnet,
    desc: 'Magnet — Einrasten am Raster (Snapping) in der Timeline an/aus.',
    areas: ['Editor'],
  },
  {
    id: 'columns', name: 'Columns2', set: 'lucide', category: 'editor', component: Columns2,
    desc: 'Zwei Spalten — Duett-Spuren (P1/P2) nebeneinander in der Timeline anzeigen.',
    areas: ['Editor'],
  },
  {
    id: 'zoom-in', name: 'ZoomIn', set: 'lucide', category: 'editor', component: ZoomIn,
    desc: 'Lupe mit Plus — in die Timeline hineinzoomen.',
    areas: ['Editor'],
  },
  {
    id: 'zoom-out', name: 'ZoomOut', set: 'lucide', category: 'editor', component: ZoomOut,
    desc: 'Lupe mit Minus — aus der Timeline herauszoomen.',
    areas: ['Editor'],
  },
  {
    id: 'rotate-ccw', name: 'RotateCcw', set: 'lucide', category: 'editor', component: RotateCcw,
    desc: 'Gegen-Uhrzeigersinn-Pfeil — Ansicht/Zoom zurücksetzen (Timeline, Video-Sync).',
    areas: ['Editor'],
  },
  {
    id: 'gauge', name: 'Gauge', set: 'lucide', category: 'editor', component: Gauge,
    desc: 'Tacho — Tempo/BPM-Anzeige im Notenblatt-Dialog und der Timeline.',
    areas: ['Editor'],
  },
  {
    id: 'layers', name: 'Layers', set: 'lucide', category: 'editor', component: Layers,
    desc: 'Ebenen — Stimmen-/Spuren-Ansicht im Notenblatt-Dialog (P1/P2/Instrumente).',
    areas: ['Editor'],
  },
  {
    id: 'scan-line', name: 'ScanLine', set: 'lucide', category: 'editor', component: ScanLine,
    desc: 'Scan-Linie — Notenblatt-Import (Sheet Music) öffnen; gescanntes Notenmaterial in Noten umwandeln.',
    areas: ['Editor'],
  },
  {
    id: 'file-music', name: 'FileMusic', set: 'lucide', category: 'editor', component: FileMusic,
    desc: 'Datei mit Note — MIDI/KAR-Import (fertige Songs aus anderen Karaoke-Programmen einlesen).',
    areas: ['Editor'],
  },
  {
    id: 'upload', name: 'Upload', set: 'lucide', category: 'editor', component: Upload,
    desc: 'Pfeil hoch — Datei hochladen im MIDI-Import- und Notenblatt-Dialog.',
    areas: ['Editor'],
  },
  {
    id: 'music-2', name: 'Music2', set: 'lucide', category: 'editor', component: Music2,
    desc: 'Noten-Variante — Werkzeugleiste des Editors (Noten-Modus).',
    areas: ['Editor'],
  },
  {
    id: 'music-4', name: 'Music4', set: 'lucide', category: 'editor', component: Music4,
    desc: 'Doppelnote — MIDI-Import-Dialog und Notenblatt (Musik-Elemente).',
    areas: ['Editor'],
  },
  {
    id: 'file-text', name: 'FileText', set: 'lucide', category: 'editor', component: FileText,
    desc: 'Textdatei — Liedtext-Datei (.txt) im Lyrics-Tab, Neuer-Song-Dialog und Notenblatt.',
    areas: ['Editor'],
  },
  {
    id: 'book-open', name: 'BookOpen', set: 'lucide', category: 'editor', component: BookOpen,
    desc: 'Offenes Buch — Liedtext-Ansicht im Lyrics-Tab des Editors.',
    areas: ['Editor'],
  },
  {
    id: 'monitor-play', name: 'MonitorPlay', set: 'lucide', category: 'editor', component: MonitorPlay,
    desc: 'Bildschirm mit Play — Video-Overlay im Editor an/aus (Video über der Timeline).',
    areas: ['Editor'],
  },
  {
    id: 'film', name: 'Film', set: 'lucide', category: 'editor', component: Film,
    desc: 'Filmstreifen — Video-Datei im Neuer-Song-Dialog auswählen.',
    areas: ['Editor'],
  },
  {
    id: 'image', name: 'Image', set: 'lucide', category: 'editor', component: Image,
    desc: 'Bild — Cover-Artwork im Neuer-Song-Dialog auswählen.',
    areas: ['Editor'],
  },
  {
    id: 'link', name: 'Link2', set: 'lucide', category: 'editor', component: Link2,
    desc: 'Kettenglied — Video-/Audio-Link (URL) im Neuer-Song-Dialog einfügen.',
    areas: ['Editor'],
  },
  {
    id: 'wallpaper', name: 'Wallpaper', set: 'lucide', category: 'editor', component: Wallpaper,
    desc: 'Hintergrund-Motiv — Hintergrundbild für den Song festlegen (Neuer-Song-Dialog).',
    areas: ['Editor'],
  },
  {
    id: 'folder-open', name: 'FolderOpen', set: 'lucide', category: 'editor', component: FolderOpen,
    desc: 'Geöffneter Ordner — Song-Dateien (Audio/Video/TXT) im Neuer-Song-Dialog durchsuchen.',
    areas: ['Editor'],
  },
  {
    id: 'keyboard-lucide', name: 'Keyboard', set: 'lucide', category: 'editor', component: Keyboard,
    desc: 'Tastatur — Shortcut-Übersicht des Editors öffnen.',
    areas: ['Editor'],
  },
  {
    id: 'settings-lucide', name: 'Settings', set: 'lucide', category: 'editor', component: Settings,
    desc: 'Zahnrad — Editor-Einstellungen im Header.',
    areas: ['Editor'],
  },
  {
    id: 'alert-circle', name: 'AlertCircle', set: 'lucide', category: 'editor', component: AlertCircle,
    desc: 'Ausrufezeichen-Kreis — Hinweis im Editor-Header (z.B. ungespeicherte Änderungen).',
    areas: ['Editor'],
  },
  {
    id: 'message-warning', name: 'MessageSquareWarning', set: 'lucide', category: 'editor', component: MessageSquareWarning,
    desc: 'Sprechblase mit Warnung — Warnhinweise im Notenblatt-Dialog.',
    areas: ['Editor'],
  },
  {
    id: 'waves', name: 'Waves', set: 'lucide', category: 'editor', component: Waves,
    desc: 'Wellen — Wellenform/Audio-Signal im Analyse-Panel und Editor-Header.',
    areas: ['Editor'],
  },
  {
    id: 'activity', name: 'Activity', set: 'lucide', category: 'editor', component: Activity,
    desc: 'Puls-Kurve — Aktionen im Audio-Analyse-Panel (Wellenform betrachten/Analyse starten).',
    areas: ['Editor'],
  },
  {
    id: 'brain', name: 'Brain', set: 'lucide', category: 'editor', component: Brain,
    desc: 'Gehirn — KI-Unterstützung in der Audio-Analyse (automatische Noten-Erkennung/Harmonisieren).',
    areas: ['Editor'],
  },
  {
    id: 'sparkles', name: 'Sparkles', set: 'lucide', category: 'editor', component: Sparkles,
    desc: 'Funkeln — KI/Magie-Funktionen (Neuer-Song-Dialog) und Runden-Anzahl im Party-Verlauf.',
    areas: ['Editor', 'Party'],
  },
  {
    id: 'info-lucide', name: 'Info', set: 'lucide', category: 'editor', component: Info,
    desc: 'i-Kreis — Info-Hinweise in der Timeline und bei Editor-Werkzeugen.',
    areas: ['Editor'],
  },
  {
    id: 'badge-check', name: 'BadgeCheck', set: 'lucide', category: 'editor', component: BadgeCheck,
    desc: 'Abzeichen mit Häkchen — „geprüft/Regel erfüllt" bei Metadaten-Regeln (Metadata-Studio, Harmonize, Editor).',
    areas: ['Editor'],
  },

  // ═══════════════ SPIEL & PARTY ═══════════════
  {
    id: 'crown', name: 'Crown', set: 'lucide', category: 'game', component: Crown,
    desc: 'Krone — Sieger im Turnier-Baum und Champion im Party-Verlauf.',
    areas: ['Spiel', 'Party'],
  },
  {
    id: 'users', name: 'Users', set: 'lucide', category: 'game', component: Users,
    desc: 'Personengruppe — Spieleranzahl/Duett-Zuordnung in der Editor-Songinfo; Companion-Symbol.',
    areas: ['Editor', 'Spiel'],
  },
  {
    id: 'angry', name: 'Angry', set: 'lucide', category: 'game', component: Angry,
    desc: 'Wütender Smiley — Rivalen-/Duell-Gegner-Anzeige in Ergebnissen, Highscores und Rivalen-Vergleich.',
    areas: ['Ergebnisse', 'Highscores'],
  },
  {
    id: 'arrow-left', name: 'ArrowLeft', set: 'lucide', category: 'game', component: ArrowLeft,
    desc: 'Pfeil links — Zurück aus dem Turnier-Bildschirm.',
    areas: ['Spiel'],
  },
  {
    id: 'history', name: 'History', set: 'lucide', category: 'game', component: History,
    desc: 'Uhr mit Rücklaufpfeil — Party-Verlauf (abgeschlossene Party-Sessions).',
    areas: ['Party'],
  },
  {
    id: 'party-popper', name: 'PartyPopper', set: 'lucide', category: 'game', component: PartyPopper,
    desc: 'Konfetti-Knaller — Badge für den Party-Modus im Party-Verlauf.',
    areas: ['Party'],
  },
  {
    id: 'flame', name: 'Flame', set: 'lucide', category: 'game', component: Flame,
    desc: 'Flamme — Modus-Badge im Party-Verlauf (heiße Runden, Favoriten-Modus).',
    areas: ['Party'],
  },
  {
    id: 'target', name: 'Target', set: 'lucide', category: 'game', component: Target,
    desc: 'Zielscheibe — Modus-Badge im Party-Verlauf (Duell/Ziel-Modi).',
    areas: ['Party'],
  },

  // ═══════════════ BIBLIOTHEK & JUKEBOX ═══════════════
  {
    id: 'folder', name: 'FolderIcon', set: 'custom', category: 'library', component: FolderIcon,
    desc: 'Ordner — Ordneransicht der Bibliothek (Songs nach Verzeichnis) und Bibliotheks-Tab in den Einstellungen.',
    areas: ['Bibliothek', 'Einstellungen'],
  },
  {
    id: 'list-music', name: 'ListMusic', set: 'lucide', category: 'library', component: ListMusic,
    desc: 'Liste mit Note — Playlist-Auswahl im Jukebox-Playlist-Browser.',
    areas: ['Jukebox'],
  },
  {
    id: 'disc', name: 'Disc3', set: 'lucide', category: 'library', component: Disc3,
    desc: 'Schallplatte — Album-/Song-Anzeige im Jukebox-Playlist-Browser.',
    areas: ['Jukebox'],
  },
  {
    id: 'list-plus', name: 'ListPlus', set: 'lucide', category: 'library', component: ListPlus,
    desc: 'Liste mit Plus — Songs zum Jukebox-Pool hinzufügen (Jukebox-Setup).',
    areas: ['Jukebox'],
  },
  {
    id: 'calendar', name: 'Calendar', set: 'lucide', category: 'library', component: Calendar,
    desc: 'Kalender — Zeitraum-Filter im Jukebox-Setup (z.B. nur Songs aus bestimmten Jahren).',
    areas: ['Jukebox'],
  },
  {
    id: 'calendar-range', name: 'CalendarRangeIcon (inline)', set: 'inline', category: 'library', component: CalendarRangeInlineIcon,
    desc: 'Kalender mit Zeitraum — Jahrzehnt-/Ära-Auswahl im Jukebox-Setup (60er, 70er, 80er …).',
    areas: ['Jukebox'],
  },
  {
    id: 'clock', name: 'ClockIcon (inline)', set: 'inline', category: 'library', component: ClockInlineIcon,
    desc: 'Uhr — Zeit-Anzeige im Jukebox-Setup (z.B. geplanter Start/Countdown).',
    areas: ['Jukebox'],
  },
  {
    id: 'video', name: 'Video', set: 'lucide', category: 'library', component: Video,
    desc: 'Videokamera — Video-Pool/Video-Pausen im Jukebox-Setup.',
    areas: ['Jukebox'],
  },
  {
    id: 'jukebox-video', name: 'Jukebox Video (inline)', set: 'inline', category: 'library', component: JukeboxVideoInlineIcon,
    desc: 'Videorahmen — Video-Link/Video hinzufügen im Jukebox-Player (Video-Pausen zwischen Songs).',
    areas: ['Jukebox'],
  },
  {
    id: 'tag', name: 'Tag', set: 'lucide', category: 'library', component: Tag,
    desc: 'Etikett — Kategorien/Tags im Motto-Party-Tab (Einstellungen).',
    areas: ['Einstellungen'],
  },

  // ═══════════════ PROFIL & ONLINE ═══════════════
  {
    id: 'globe', name: 'GlobeIcon', set: 'custom', category: 'profile', component: GlobeIcon,
    desc: 'Globus — Sprache/Region in den Profil-Einstellungen des Charakters.',
    areas: ['Profil'],
  },
  {
    id: 'cloud-upload', name: 'CloudUploadIcon', set: 'custom', category: 'profile', component: CustomCloudUploadIcon,
    desc: 'Cloud mit Pfeil hoch — Profil in die Cloud sichern (Profil-Sync) und auf Handy/PC hochladen.',
    areas: ['Profil', 'Handy'],
  },
  {
    id: 'cloud-download', name: 'CloudDownloadIcon', set: 'custom', category: 'profile', component: CloudDownloadIcon,
    desc: 'Cloud mit Pfeil runter — Profil wiederherstellen/herunterladen: Online-Login, Sync und Konto-Wiederherstellung.',
    areas: ['Profil', 'Handy'],
  },
  {
    id: 'log-out', name: 'LogOutIcon', set: 'lucide', category: 'profile', component: LogOutIcon,
    desc: 'Tür mit Pfeil — Abmelden beim Online-Konto / Profil verlassen.',
    areas: ['Profil'],
  },
  {
    id: 'mail', name: 'MailIcon', set: 'lucide', category: 'profile', component: MailIcon,
    desc: 'Briefumschlag — E-Mail-Adresse des Online-Kontos (Profil-Einstellungen).',
    areas: ['Profil'],
  },
  {
    id: 'key-round', name: 'KeyRoundIcon', set: 'lucide', category: 'profile', component: KeyRoundIcon,
    desc: 'Runder Schlüssel — Wiederherstellungscode des Online-Kontos (Konto wiederherstellen).',
    areas: ['Profil'],
  },
  {
    id: 'file-down', name: 'FileDownIcon', set: 'lucide', category: 'profile', component: FileDownIcon,
    desc: 'Datei mit Pfeil runter — Daten exportieren/herunterladen (Sync-Backup, Wiederherstellungscode speichern).',
    areas: ['Profil', 'Handy'],
  },

  // ═══════════════ STATUS & SYSTEM ═══════════════
  {
    id: 'wifi', name: 'Wifi', set: 'lucide', category: 'status', component: Wifi,
    desc: 'WLAN-Bögen — Verbindung besteht (Offline-Banner ausgeblendet).',
    areas: ['UI'],
  },
  {
    id: 'wifi-off', name: 'WifiOff', set: 'lucide', category: 'status', component: WifiOff,
    desc: 'WLAN durchgestrichen — offline / keine Server-Verbindung (Offline-Banner und Handy-Status).',
    areas: ['UI', 'Handy'],
  },
  {
    id: 'database', name: 'Database', set: 'lucide', category: 'status', component: Database,
    desc: 'Datenbank-Zylinder — lokaler Datenbestand/Cache aktiv (Offline-Banner).',
    areas: ['UI'],
  },
  {
    id: 'loader', name: 'Loader2', set: 'lucide', category: 'status', component: Loader2,
    desc: 'Rotierender Kreis — Lade-Spinner überall: Audio-Analysen, „Bibliothek wird geladen" im Startbildschirm.',
    areas: ['Editor', 'Start'],
  },
  {
    id: 'check-circle', name: 'CheckCircle', set: 'lucide', category: 'status', component: CheckCircle,
    desc: 'Kreis mit Häkchen — Erfolg/abgeschlossen (Analyse fertig, Editor-Header).',
    areas: ['Editor'],
  },
  {
    id: 'x-circle', name: 'XCircle', set: 'lucide', category: 'status', component: XCircle,
    desc: 'Kreis mit X — Fehler/ungültig in der Audio-Analyse.',
    areas: ['Editor'],
  },
  {
    id: 'alert-triangle', name: 'AlertTriangle', set: 'lucide', category: 'status', component: AlertTriangle,
    desc: 'Warndreieck — allgemeine Warnungen: MIDI-Import, Notenblatt-Dialog, Fehlerseite der Handy-App.',
    areas: ['Editor', 'Handy'],
  },
  {
    id: 'monitor', name: 'Monitor', set: 'lucide', category: 'status', component: Monitor,
    desc: 'Bildschirm — Betriebssystem-Anzeige im Über-Tab (Desktop-Diagnose).',
    areas: ['Einstellungen'],
  },
  {
    id: 'cpu', name: 'Cpu', set: 'lucide', category: 'status', component: Cpu,
    desc: 'Chip — Prozessor-Architektur im Über-Tab (z.B. x86_64).',
    areas: ['Einstellungen'],
  },
  {
    id: 'server', name: 'Server', set: 'lucide', category: 'status', component: Server,
    desc: 'Server-Stack — lokaler Server & Online-Leaderboard-Verbindung im Über-Tab.',
    areas: ['Einstellungen'],
  },
  {
    id: 'package-check', name: 'PackageCheck', set: 'lucide', category: 'status', component: PackageCheck,
    desc: 'Paket mit Häkchen — Runtime vorhanden (Node.js/ONNX im Über-Tab).',
    areas: ['Einstellungen'],
  },
  {
    id: 'package-x', name: 'PackageX', set: 'lucide', category: 'status', component: PackageX,
    desc: 'Paket mit X — Runtime fehlt (Über-Tab, Desktop-Diagnose).',
    areas: ['Einstellungen'],
  },

  // ═══════════════ UI-ELEMENTE ═══════════════
  {
    id: 'chevron-down', name: 'ChevronDown', set: 'lucide', category: 'ui', component: ChevronDown,
    desc: 'Dach nach unten — Dropdowns/Selects aufklappen, Akkordeons öffnen, Tutorial weiter.', aliases: ['ChevronDownIcon'],
    areas: ['UI', 'Editor', 'Ergebnisse', 'Jukebox', 'Hilfe'],
  },
  {
    id: 'chevron-up', name: 'ChevronUp', set: 'lucide', category: 'ui', component: ChevronUp,
    desc: 'Dach nach oben — Zuklappen, hoch scrollen, Zusammenfassungen einklappen.', aliases: ['ChevronUpIcon'],
    areas: ['UI', 'Editor', 'Ergebnisse', 'Hilfe'],
  },
  {
    id: 'chevron-left', name: 'ChevronLeft', set: 'lucide', category: 'ui', component: ChevronLeft,
    desc: 'Dach nach links — zurück blättern (Tutorial-Tour, Notenblatt).',
    areas: ['Hilfe', 'Editor'],
  },
  {
    id: 'chevron-right', name: 'ChevronRight', set: 'lucide', category: 'ui', component: ChevronRight,
    desc: 'Dach nach rechts — weiter blättern (Tutorial-Tour, Notenblatt, Jukebox).',
    areas: ['Hilfe', 'Editor', 'Jukebox'],
  },
  {
    id: 'fullscreen-enter', name: 'Vollbild an (inline)', set: 'inline', category: 'ui', component: FullscreenEnterInlineIcon,
    desc: 'Vier Ecken nach außen — Vollbildmodus aktivieren (Navbar & Spiel-HUD, Taste F12).',
    areas: ['Navbar', 'Spiel-HUD'],
  },
  {
    id: 'fullscreen-exit', name: 'Vollbild aus (inline)', set: 'inline', category: 'ui', component: FullscreenExitInlineIcon,
    desc: 'Vier Ecken nach innen — Vollbildmodus verlassen (Navbar & Spiel-HUD).',
    areas: ['Navbar', 'Spiel-HUD'],
  },
  {
    id: 'mouse-click', name: 'MousePointerClick', set: 'lucide', category: 'ui', component: MousePointerClick,
    desc: 'Klickender Mauszeiger — „Hier klicken"-Spots im Tutorial-Tour-Overlay.',
    areas: ['Hilfe'],
  },
];

/** Anzahl Icons je Kategorie (für die Filter-Chips). */
export function iconCountsByCategory(): Record<string, number> {
  const counts: Record<string, number> = { all: ICON_CATALOG.length };
  for (const entry of ICON_CATALOG) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }
  return counts;
}
