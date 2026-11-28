import { getAllSongs } from '@/lib/game/song-library';
import type { TourDefinition } from '../types';

/**
 * Editor-Tour — Aufbau, Lyrics, Noten, Stimmen, Harmonize.
 * Läuft auf einem echten Song der Bibliothek (Sandbox-Hinweis im ersten
 * Schritt: Änderungen lassen sich per Undo/Zurücksetzen verwerfen — am
 * besten einen Test-Song verwenden).
 */
export const editorTour: TourDefinition = {
  id: 'editor',
  icon: '✏️',
  startScreen: 'editor',
  chapters: [
    {
      id: 'entry',
      icon: '🚪',
      steps: [
        { id: 'welcome' },
        {
          id: 'songList',
          navigate: 'editor',
          target: '[data-testid="editor-search-input"]',
          placement: 'bottom',
          skipIf: () => getAllSongs().length === 0,
        },
        {
          id: 'noSongs',
          navigate: 'editor',
          skipIf: () => getAllSongs().length > 0,
        },
        {
          id: 'openSong',
          navigate: 'editor',
          target: '[data-testid^="editor-song-card-"]',
          placement: 'top',
          clickToContinue: true,
          skipIf: () => getAllSongs().length === 0,
        },
      ],
    },
    {
      id: 'layout',
      icon: '🗺️',
      steps: [
        {
          id: 'leftPanel',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-sub-header"]',
          placement: 'bottom',
        },
        {
          id: 'lyricsPanel',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-left-panel"]',
          placement: 'right',
        },
      ],
    },
    {
      id: 'notes',
      icon: '🎵',
      steps: [
        {
          id: 'subHeaderTools',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-sub-add-note"]',
          placement: 'bottom',
        },
        {
          id: 'noteTypes',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-sub-note-types"]',
          placement: 'bottom',
        },
        {
          id: 'voices',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-sub-player-select"]',
          placement: 'bottom',
        },
        {
          id: 'tapMode',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-sub-tap-mode"]',
          placement: 'bottom',
        },
      ],
    },
    {
      // R115: eigenes Kapitel unter dem Editor-Label — Studio selbst,
      // seine Einstellungen (Settings → Metadaten Studio) und das Einbinden
      // von Videolinks der großen Videoplattformen (Song-Info-Tab).
      id: 'metadataStudio',
      icon: '🎛️',
      steps: [
        {
          id: 'metadataStudio',
          navigate: 'editor',
          // Metadata Studio lives in the LIST view (below the song grid):
          // close an opened song first — never discarding unsaved changes.
          action: 'editor-close-song',
          target: '[data-testid="metadata-studio-toggle"]',
          placement: 'top',
        },
        {
          // Einstellungsmöglichkeiten des Studios: eigene Genres/Sprachen
          // + Regel-Editor (Settings → Metadaten Studio).
          id: 'studioSettings',
          navigate: 'settings',
          action: 'settings-open-tab',
          settingsTab: 'taxonomy',
          target: '[data-testid="settings-intro-taxonomy"]',
          placement: 'bottom',
        },
        {
          // Videolinks einbinden: Song öffnen + Metadaten-Panel aufklappen.
          // clickToContinue klickt den echten Panel-Toggle — der nächste
          // Schritt spotlightet dann das Video-URL-Feld (#song-video).
          id: 'videoLinks',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-panel-metadata-toggle"]',
          placement: 'bottom',
          clickToContinue: true,
          skipIf: () => getAllSongs().length === 0,
        },
        {
          // Das Video-URL-Feld im geöffneten Metadaten-Panel (Song-Info-Tab).
          id: 'videoUrl',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '#song-video',
          placement: 'left',
          skipIf: () => getAllSongs().length === 0,
        },
      ],
    },
    {
      id: 'extras',
      icon: '✨',
      steps: [
        {
          id: 'panels',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-panel-metadata-toggle"]',
          placement: 'bottom',
        },
        {
          id: 'shortcuts',
          navigate: 'editor',
          action: 'editor-open-first-song',
          target: '[data-testid="editor-shortcuts-panel"]',
          placement: 'right',
        },
        { id: 'finish' },
      ],
    },
  ],
};
