'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { getAvailableDecades, songMatchesEra, decadeShortLabel } from '@/lib/game/era-filter';
import { filterSongsByMotto } from '@/lib/game/motto-party';
import type { MobileSong, GameMode, GameState, MobileView, DesktopSettingsSnapshot } from '../mobile-types';
import { SongCoverTile } from './mirror-cover-tile';

/** i18n with a hard fallback (mirror views load a lite dictionary — keys
 *  can be missing; then the German fallback keeps the UI usable). */
function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Props =====================

interface MirrorLibraryLiteProps {
  songSearch: string;
  onSongSearchChange: (v: string) => void;
  songsLoading: boolean;
  songsError: string | null;
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
  selectedGameMode: GameMode;
  selectedPartner: { id: string; name: string } | null;
  availablePartners: Array<{ id: string; name: string; code: string }>;
  opponents: any[];
  availableProfiles: any[];
  clientId: string | null;
  onShowSongOptions: (s: MobileSong | null) => void;
  onSelectGameMode: (m: GameMode) => void;
  onSelectPartner: (p: { id: string; name: string } | null) => void;
  onAddToQueue: (s: MobileSong) => Promise<void>;
  onLoadPartners: () => void;
  onLoadOpponents: () => void;
  onRefreshSongs: () => void;
  formatDuration: (ms: number) => string;
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
  playerMicSource: 'companion' | 'microphone';
  onPlayerMicSourceChange: (s: 'companion' | 'microphone') => void;
  partnerMicSource: 'companion' | 'microphone';
  onPartnerMicSourceChange: (s: 'companion' | 'microphone') => void;
  duetPartsSwapped: boolean;
  onDuetPartsSwappedChange: (v: boolean) => void;
  addedQueuePosition: number;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
  onOpenChat: () => void;
  /** R33/P16: Desktop-Settings-Snapshot — optionale Prop, die der Shell
   *  durchreicht. Wird hier NUR als Anzeige-Hinweis genutzt (Badge
   *  "Desktop-Standard: …" über der Difficulty-Auswahl); die eigentliche
   *  Vorauswahl macht der Data-Hook (use-mobile-data.ts) — nicht doppelt. */
  settingsSnapshot?: DesktopSettingsSnapshot | null;
  /** R39/P1: Von der Startseiten-Spielmodus-Kachel vorgewählter Modus.
   *  Ein Effekt übernimmt ihn in den lokalen libGameMode-State, sobald er
   *  sich ändert (null/undefined = kein Preset, lokale Auswahl bleibt). */
  initialGameMode?: 'single' | 'duel' | 'duet';
}

// ===================== Helpers =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function formatDurationSec(ms: number): string {
  const s = Math.round(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function isLikelyDuet(song: MobileSong): boolean {
  // The desktop pre-computes isDuet using the full isDuetSong() logic
  // (metadata flag + [Duet]/(Duet) title check + P1/P2 lyrics scan).
  // Rely on that flag — no lyrics are available on the companion side.
  if (song.isDuet === true) return true;
  // Safety net: bracketed [Duet] / (Duet) in title (catches songs added after last sync)
  if (song.title && /\[\s*duet\s*\]/i.test(song.title)) return true;
  if (song.title && /\(\s*duet\s*\)/i.test(song.title)) return true;
  return false;
}

// ===================== R51/Bug5+6: Kompakter Filter-Chip =====================
// Smartphones öffnen native <select>s ohnehin als Fullscreen-Overlay — breite
// Dropdown-Felder sind reine Platzverschwendung. Der Chip zeigt nur das kurze
// Label (inaktiv) bzw. den gewählten Wert (aktiv, cyan markiert); das
// unsichtbare native Select darüber liefert das gewohnte Overlay-Verhalten.
function FilterChip({
  label, value, onChange, active, displayValue, children, testId,
}: {
  label: string;
  value: string;
  onChange: (_v: string) => void;
  active: boolean;
  /** Sichtbarer Text bei aktivem Filter (z. B. gewähltes Jahr/Dekade) */
  displayValue?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[64px] basis-0" data-testid={testId}>
      <div
        aria-hidden="true"
        className={'w-full flex items-center justify-center rounded-lg px-1 py-2 text-[11px] font-medium text-center border pointer-events-none transition-colors ' +
          (active
            ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
            : 'bg-white/5 border-white/10 text-white/60')}
      >
        <span className="truncate max-w-full">{active && displayValue ? displayValue : label}</span>
      </div>
      <select
        value={value}
        onChange={(e) => { haptic(); onChange(e.target.value); }}
        aria-label={label}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {children}
      </select>
    </div>
  );
}

// ===================== Mini-Cover-Kachel =====================
// R34: SongCoverTile ist jetzt EINE geteilte Komponente (mirror-cover-tile.tsx,
// vorher hier dupliziert) mit 3-Stufen-Fallback + verzögertem API-Retry
// (5 s / 15 s / 60 s) — ein 404 („noch nicht hochgeladen“) ist kein
// Dauerzustand mehr.

// ===================== R39/P4: Gesangs-Gerät-Auswahl =====================
// Segmentierte Auswahl: 📱 Companion-App (Handy-Mikrofon) oder 🎤 ein
// Desktop-Mikrofon (mit Unterauswahl des konkreten Mics). Vorausgewählt:
// Companion für alle, die via Companion verbunden sind — jederzeit änderbar.

function DevicePicker({
  label,
  name,
  connectedViaCompanion,
  device,
  onDeviceChange,
  availableMics,
  t,
}: {
  label: string;
  name?: string;
  connectedViaCompanion: boolean;
  device: string;
  onDeviceChange: (d: string) => void;
  availableMics: Array<{ id: string; name: string }>;
  t: (_key: string) => string;
}) {
  const isCompanion = device === 'companion';
  const selectedMic = availableMics.find(m => m.id === device);
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-2.5">
      <div className="flex items-center justify-between gap-2 mb-1 px-0.5">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/40">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {name && <span className="truncate text-[11px] text-white/50 max-w-[90px]">{name}</span>}
          {connectedViaCompanion && (
            <span className="shrink-0 rounded-full bg-cyan-500/15 border border-cyan-400/25 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300/90">
              {'\u{1F4F1} '}{tOr(t, 'deviceConnectedBadge', 'verbunden')}
            </span>
          )}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { haptic(); onDeviceChange('companion'); }}
          aria-pressed={isCompanion}
          className={
            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold border transition-all active:scale-[0.97] ' +
            (isCompanion
              ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/45')
          }
        >
          <span>{'\u{1F4F1}'}</span>
          <span>{tOr(t, 'deviceCompanion', 'Companion-App')}</span>
        </button>
        <button
          type="button"
          onClick={() => { haptic(); onDeviceChange(availableMics[0]?.id || 'auto'); }}
          aria-pressed={!isCompanion}
          className={
            'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold border transition-all active:scale-[0.97] ' +
            (!isCompanion
              ? 'bg-purple-500/25 border-purple-400/50 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/45')
          }
        >
          <span>{'\u{1F3A4}'}</span>
          <span>{tOr(t, 'deviceMic', 'Mikrofon')}</span>
        </button>
      </div>
      {/* Konkretes Desktop-Mikrofon wählen (nur im Mic-Modus) */}
      {!isCompanion && (
        availableMics.length > 0 ? (
          <select
            value={selectedMic ? device : 'auto'}
            onChange={(e) => { haptic(); onDeviceChange(e.target.value || 'auto'); }}
            className="mt-2 w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white cursor-pointer"
          >
            <option value="auto" className="bg-[#1a1a2e] text-white">
              {tOr(t, 'deviceMicAuto', 'Mikrofon automatisch')}
            </option>
            {availableMics.map(m => (
              <option key={m.id} value={m.id} className="bg-[#1a1a2e] text-white">{m.name}</option>
            ))}
          </select>
        ) : (
          <p className="mt-2 text-[10px] text-white/30 text-center">
            {tOr(t, 'deviceNoMics', 'Keine Desktop-Mikrofone konfiguriert — das Standard-Mikrofon wird genutzt.')}
          </p>
        )
      )}
    </div>
  );
}

// ===================== Component =====================

export function MirrorLibraryLite({
    songSearch,
    onSongSearchChange,
    songsLoading,
    songsError,
    songs,
    filteredSongs,
    onRefreshSongs,
    opponents,
    availableProfiles,
    clientId,
    onLoadOpponents,
    difficulty,
    // R39/P4: playerMicSource/partnerMicSource bleiben als Props im Vertrag
    // (Shell reicht sie durch), werden aber nicht mehr destrukturiert — die
    // Geräte-Auswahl passiert jetzt pro Song im Overlay (ovPlayerDevice).
    duetPartsSwapped,
    onSendDesktopCommand,
    gameState,
    settingsSnapshot,
    initialGameMode,
  }: MirrorLibraryLiteProps) {
    const { t } = useTranslation();
    const searchRef = useRef<HTMLInputElement>(null);
    const [genreFilter, setGenreFilter] = useState('all');
    const [languageFilter, setLanguageFilter] = useState('all');
    // Era/decade filter (decade start year, e.g. '1980') — for themed parties
    const [eraFilter, setEraFilter] = useState('all');
    // R51/Bug6 — Year filter (exact release year from the synced #YEAR: tag)
    const [yearFilter, setYearFilter] = useState('all');
    const [filterViral, setFilterViral] = useState(false);

    // Lokaler Game-Mode (Single/Duell/Duett)
    const [libGameMode, setLibGameMode] = useState<GameMode>('single');

    // R39/P1: Modus-Preset von der Startseiten-Kachel übernehmen (immer wenn
    // sich der Preset-Wert ändert — die Shell setzt ihn beim Kachel-Tap).
    useEffect(() => {
      if (initialGameMode === 'single' || initialGameMode === 'duel' || initialGameMode === 'duet') {
        setLibGameMode(initialGameMode);
      }
    }, [initialGameMode]);

    // ---- Overlay-State ----
    const [overlaySong, setOverlaySong] = useState<MobileSong | null>(null);
    const [ovDifficulty, setOvDifficulty] = useState<'easy' | 'medium' | 'hard'>(difficulty || 'medium');
    // Sync ovDifficulty when the difficulty prop changes (e.g. from desktop
    // global settings) — R51/Bug8+14: NUR solange kein Overlay offen ist. Ein
    // 2s-Gamestate-Push, der eintrifft, während der Nutzer das offene Overlay
    // betrachtet, darf dessen Auswahl nicht überschreiben (Eingabe-Reset-Bug);
    // beim nächsten Overlay-Öffnen greift der neue Default (openOverlay).
    useEffect(() => { if (!overlaySong) setOvDifficulty(difficulty || 'medium'); }, [difficulty, overlaySong]);
    const [ovPartnerId, setOvPartnerId] = useState<string | null>(null);
    const [ovAdding, setOvAdding] = useState(false);
    const [ovChallengeSent, setOvChallengeSent] = useState(false);

    // R39/P4: Gesangs-Gerät — 'companion' (Handy) oder eine Mikrofon-ID aus
    // der Desktop-Konfiguration (gameState.availableMics). Ich selbst bin
    // standardmäßig Companion (ich wünsche vom Handy); der Partner wird
    // automatisch auf Companion vorgewählt, wenn er via Companion verbunden
    // ist, sonst auf ein Desktop-Mikrofon.
    const [ovPlayerDevice, setOvPlayerDevice] = useState<string>('companion');
    const [ovPartnerDevice, setOvPartnerDevice] = useState<string>('auto');
    const availableMics = gameState.availableMics ?? [];
    // Playlist-Picker State
    const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
    const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; isSystem?: boolean }>>([]);
    const [playlistLoading, setPlaylistLoading] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showNewPlaylist, setShowNewPlaylist] = useState(false);
    const [playlistAdding, setPlaylistAdding] = useState<string | null>(null);

    // Desktop-Preview tracking (controlling companion only)
    const [desktopPreviewSongId, setDesktopPreviewSongId] = useState<string | null>(null);

    // Duett: auto-filtere auf Duett-Songs
    const isDuetMode = libGameMode === 'duet';
    // Alle verfuegbaren Partner: verbundene Companion-User + aktive Host-Profile.
    // availablePartners wird NICHT verwendet (redundant mit opponents, das
    // dieselben Companion-User aber mit profile.id statt connectionCode liefert).
    const allPartners = useMemo(() => {
      const list: Array<{ id: string; name: string }> = [
        ...opponents.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
        ...availableProfiles.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      ];
      // Deduplizierung nach ID
      const seen = new Set<string>();
      return list.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }, [opponents, availableProfiles]);

    const displaySongs = useMemo(() => {
      // ── Motto-Party (R25): the motto config synced from the desktop is the
      // single source of truth — search field and the local genre/language/
      // era/viral filters are hidden (replaced by the motto banner), so their
      // values cannot carry user intent. The motto pool is computed from ALL
      // songs with the EXACT same matching logic as the desktop library
      // (filterSongsByMotto is generic — runs on MobileSong[] too). The
      // duet-mode constraint stays functional (game requirement). ──
      const motto = gameState.mottoParty;
      if (motto?.enabled) {
        let mottoSongs = filterSongsByMotto(songs, motto);
        if (isDuetMode) {
          mottoSongs = mottoSongs.filter(isLikelyDuet);
        }
        return [...mottoSongs].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
      }

      let result = filteredSongs;
      if (genreFilter !== 'all') {
        result = result.filter((s) => s.genre === genreFilter);
      }
      if (languageFilter !== 'all') {
        result = result.filter((s) => s.language === languageFilter);
      }
      // R51/Bug6 — exact release-year filter (#YEAR: tag)
      if (yearFilter !== 'all') {
        result = result.filter((s) => String(s.year ?? '') === yearFilter);
      }
      // Era filter (decade bucket from the synced #YEAR: tag)
      if (eraFilter !== 'all') {
        result = result.filter((s) => songMatchesEra(s, eraFilter));
      }
      if (isDuetMode) {
        result = result.filter(isLikelyDuet);
      }
      // Viral-Hits filter (IDs synced from desktop)
      if (filterViral) {
        const viralIds = gameState.viralSongIds;
        if (viralIds && viralIds.length > 0) {
          const viralSet = new Set(viralIds);
          result = result.filter(s => viralSet.has(s.id));
        } else {
          result = [];
        }
      }
      // Nach Songtitel alphabetisch sortieren
      return [...result].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    }, [filteredSongs, genreFilter, languageFilter, yearFilter, eraFilter, isDuetMode, filterViral, gameState.viralSongIds, gameState.mottoParty, songs]);

    // Extrahiere verfuegbare Genres, Sprachen, Jahre und Aeras (Jahrzehnte)
    const { genres, languages, years, decades } = useMemo(() => {
      const gSet = new Set<string>();
      const lSet = new Set<string>();
      const ySet = new Set<string>();
      songs.forEach((s) => {
        if (s.genre) gSet.add(s.genre);
        if (s.language) lSet.add(s.language);
        if (s.year) ySet.add(String(s.year));
      });
      return {
        genres: Array.from(gSet).sort(),
        languages: Array.from(lSet).sort(),
        years: Array.from(ySet).sort(),
        decades: getAvailableDecades(songs),
      };
    }, [songs]);

    const handleClearSearch = useCallback(() => {
      onSongSearchChange('');
      searchRef.current?.focus();
    }, [onSongSearchChange]);

    const handleModeSelect = useCallback((mode: GameMode) => {
      haptic();
      setLibGameMode(mode);
    }, []);

    // Abgeleitete Werte fuer Overlay-Handler (vor den Callbacks deklariert)
    const needsChallenge = libGameMode === 'duel' || libGameMode === 'duet';
    const missingOpponent = needsChallenge && !ovPartnerId;

    // ---- Overlay-Handler ----

    const openOverlay = useCallback((song: MobileSong) => {
      haptic();
      setOverlaySong(song);
      // R33/P16: Vorauswahl folgt dem Desktop-Default — der Data-Hook pflegt
      // die difficulty-Prop (gamestate/defaultDifficulty, bis der User sie
      // selbst ändert). Beim Overlay-Öffnen diesen Stand übernehmen.
      setOvDifficulty(difficulty || 'medium');
      setOvPartnerId(null);
      setOvChallengeSent(false);
      // R39/P4: Gerät-Vorauswahl — ich selbst singe per Companion-App (der
      // Wunsch kommt vom Handy), Partner defaults to 'auto' (wird beim
      // Partnerwechsel neu bewertet, siehe Effekt unten).
      setOvPlayerDevice('companion');
      setOvPartnerDevice('auto');
      // Lade Gegner/Host-Profile fuer Duell/Duett-Auswahl
      onLoadOpponents();
    }, [onLoadOpponents, difficulty]);

    // R39/P4: Partner-Gerät automatisch vorwählen, sobald ein Partner gewählt
    // ist: via Companion verbunden → Companion-App, sonst Desktop-Mikrofon.
    useEffect(() => {
      if (!ovPartnerId) return;
      const partnerConnected = opponents.some((o: { id: string }) => o.id === ovPartnerId);
      setOvPartnerDevice(partnerConnected ? 'companion' : 'auto');
    }, [ovPartnerId, opponents]);

    const closeOverlay = useCallback(() => {
      haptic();
      setOverlaySong(null);
    }, []);

    // Zur Queue: Direkt an die API senden mit lokalem Overlay-State.
    // R39/P4: Gesangs-Gerät wird mitgeschickt — playerMicSource/partnerMicSource
    // ('companion' | 'microphone') plus Mic-ID und Anzeigename, wenn ein
    // Desktop-Mikrofon gewählt ist.
    const handleOverlayQueue = useCallback(async () => {
      if (!overlaySong || ovAdding || missingOpponent) return;
      setOvAdding(true);
      const partner = ovPartnerId ? allPartners.find((p) => p.id === ovPartnerId) : null;
      const playerMic = availableMics.find(m => m.id === ovPlayerDevice);
      const partnerMic = availableMics.find(m => m.id === ovPartnerDevice);
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'queue',
            clientId,
            payload: {
              songId: overlaySong.id,
              songTitle: overlaySong.title,
              songArtist: overlaySong.artist,
              gameMode: libGameMode,
              difficulty: ovDifficulty,
              partnerId: partner?.id || undefined,
              partnerName: partner?.name || undefined,
              playerMicSource: ovPlayerDevice === 'companion' ? 'companion' : 'microphone',
              playerMicId: playerMic?.id,
              playerMicName: playerMic?.name,
              partnerMicSource: ovPartnerDevice === 'companion' ? 'companion' : 'microphone',
              partnerMicId: partnerMic?.id,
              partnerMicName: partnerMic?.name,
              duetPartsSwapped,
            },
          }),
        });
        if (res.ok) closeOverlay();
      } catch { /* ignore */ }
      finally { setOvAdding(false); }
    }, [overlaySong, ovAdding, missingOpponent, libGameMode, ovDifficulty, ovPartnerId, allPartners, clientId, ovPlayerDevice, ovPartnerDevice, availableMics, duetPartsSwapped, closeOverlay]);

    // DO-NOT-CHANGE: Playlist-Add via mobile API. Der Desktop muss den
    // 'playlist_add'-Action-Type unterstuetzen, um den Song in eine
    // gewaehlte Playlist aufzunehmen. Zeigt Playlist-Auswahl an.
    const handleOverlayPlaylist = useCallback(async () => {
      if (!overlaySong) return;
      haptic();
      setShowPlaylistPicker(true);
      setPlaylistLoading(true);
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      setPlaylistAdding(null);
      try {
        const res = await fetch('/api/mobile?action=playlists');
        if (res.ok) {
          const data = await res.json();
          setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
        }
      } catch { /* ignore */ }
      finally { setPlaylistLoading(false); }
    }, [overlaySong]);

    // Song zu einer bestehenden Playlist hinzufuegen
    const handleAddToPlaylist = useCallback(async (playlistId: string) => {
      if (!overlaySong) return;
      haptic();
      setPlaylistAdding(playlistId);
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'playlist_add',
            clientId,
            payload: {
              playlistId,
              songId: overlaySong.id,
            },
          }),
        });
        setShowPlaylistPicker(false);
        closeOverlay();
      } catch { /* ignore */ }
      finally { setPlaylistAdding(null); }
    }, [overlaySong, clientId, closeOverlay]);

    // Neue Playlist erstellen und Song hinzufuegen
    const handleCreateAndAddPlaylist = useCallback(async () => {
      if (!overlaySong || !newPlaylistName.trim()) return;
      haptic();
      setPlaylistAdding('new');
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'playlist_create_add',
            clientId,
            payload: {
              name: newPlaylistName.trim(),
              songId: overlaySong.id,
            },
          }),
        });
        setShowPlaylistPicker(false);
        setShowNewPlaylist(false);
        closeOverlay();
      } catch { /* ignore */ }
      finally { setPlaylistAdding(null); }
    }, [overlaySong, newPlaylistName, clientId, closeOverlay]);

    // Playlist-Picker schliessen
    const closePlaylistPicker = useCallback(() => {
      haptic();
      setShowPlaylistPicker(false);
    }, []);

    // Desktop-Preview: Song auf Desktop-Lautsprechern abspielen (nur kontrollierender Companion)
    const handleDesktopPreview = useCallback((songId: string) => {
      // Stop previous preview if switching to a different song
      if (desktopPreviewSongId && desktopPreviewSongId !== songId) {
        onSendDesktopCommand('song_preview_stop');
      }
      setDesktopPreviewSongId(songId);
      onSendDesktopCommand('song_preview:' + songId);
    }, [desktopPreviewSongId, onSendDesktopCommand]);

    const handleStopDesktopPreview = useCallback(() => {
      if (desktopPreviewSongId) {
        onSendDesktopCommand('song_preview_stop');
        setDesktopPreviewSongId(null);
      }
    }, [desktopPreviewSongId, onSendDesktopCommand]);

    // Stop desktop preview when opening the song-options overlay or switching songs
    const openOverlayWithPreviewStop = useCallback((song: MobileSong) => {
      // Party-Modus: Song direkt fuer Party auswaehlen, kein Overlay
      if (gameState.partyGameMode) {
        haptic();
        onSendDesktopCommand(`party_select_song:${song.id}`);
        return;
      }
      handleStopDesktopPreview();
      openOverlay(song);
    }, [handleStopDesktopPreview, openOverlay, gameState.partyGameMode, onSendDesktopCommand]);

    // R33/P17: "Spiel starten" (Song einreihen + play_queue) ENTFERNT —
    //    Companions legen Songs NUR in die Warteschlange; wann gesungen
    //    wird, entscheidet der Desktop. Uebrig bleibt handleOverlayQueue.

    // DO-NOT-CHANGE: Herausfordern per Chat-Nachricht (wie Desktop-App).
    // Sendet song_challenge an die API, die eine Chat-Nachricht erstellt.
    // clientId MUSS im Body sein, sonst liefert der Server 400.
    const handleOverlayChallenge = useCallback(async () => {
      if (!overlaySong || ovChallengeSent) return;
      haptic();
      setOvChallengeSent(true);
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'song_challenge',
            clientId,
            payload: {
              songId: overlaySong.id,
              songTitle: overlaySong.title,
              songArtist: overlaySong.artist,
              gameMode: libGameMode,
              challengedPartnerId: ovPartnerId || undefined,
            },
          }),
        });
        if (res.ok) {
          setTimeout(() => closeOverlay(), 1200);
        } else {
          setOvChallengeSent(false);
        }
      } catch {
        setOvChallengeSent(false);
      }
    }, [overlaySong, ovChallengeSent, libGameMode, ovPartnerId, clientId, closeOverlay]);

    // Modus-Button-Konfiguration
    const MODE_BUTTONS: { mode: GameMode; icon: string; labelKey: string; fallback: string; activeColor: string }[] = [
      { mode: 'single', icon: '\u{1F3B5}', labelKey: 'gameMode.single', fallback: 'Solo', activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
      { mode: 'duel', icon: '\u2694\uFE0F', labelKey: 'gameMode.duel', fallback: 'Duell', activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
      { mode: 'duet', icon: '\u{1F3AD}', labelKey: 'gameMode.duet', fallback: 'Duett', activeColor: 'bg-pink-500/25 border-pink-400/40 text-pink-400' },
    ];

    // Schwierigkeits-Optionen fuer Overlay
    const DIFF_OPTIONS = [
      { id: 'easy' as const, label: t('mobileViews.easy') || 'Leicht', color: 'bg-green-500/25 border-green-400/40 text-green-400' },
      { id: 'medium' as const, label: t('mobileViews.normal') || 'Normal', color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
      { id: 'hard' as const, label: t('mobileViews.hard') || 'Schwer', color: 'bg-red-500/25 border-red-400/40 text-red-400' },
    ];

    // Dropdown-Pfeil SVG als data-URL
    const dropdownArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;
    const dropdownStyle = {
      backgroundImage: dropdownArrow,
      backgroundRepeat: 'no-repeat' as const,
      backgroundPosition: 'right 10px center',
      backgroundSize: '16px',
    };

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('mobile.mirrorLibrary')}</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
            {displaySongs.length}
          </span>
        </div>

        {/* Game-Mode Buttonleiste */}
        <div className="flex gap-2">
          {MODE_BUTTONS.map(({ mode, icon, labelKey, fallback, activeColor }) => {
            const isActive = libGameMode === mode;
            const label = t(labelKey) === labelKey ? fallback : t(labelKey);
            return (
              <button
                key={mode}
                onClick={() => handleModeSelect(mode)}
                className={'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold active:scale-95 transition-all border ' +
                  (isActive ? activeColor : 'bg-white/5 border-white/10 text-white/50')}
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Duell/Duett Hinweis */}
        {needsChallenge && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2">
            <span className="text-sm">{'\u2694\uFE0F'}</span>
            <span className="text-xs text-amber-300/80">
              {libGameMode === 'duel'
                ? (t('mobile.mirrorDuelHint') || 'Tippe auf einen Song, um einen Gegner herauszufordern')
                : (t('mobile.mirrorDuetHint') || 'Tippe auf einen Song, um einen Duett-Partner zu finden')}
            </span>
          </div>
        )}

        {/* Duett-Filter-Hinweis */}
        {isDuetMode && (
          <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 border border-pink-400/20 px-3 py-2">
            <span className="text-sm">{'\u{1F3AD}'}</span>
            <span className="text-xs text-pink-300/80">{t('mobile.mirrorDuetFilterHint') || 'Es werden nur Duett-Songs angezeigt'}</span>
          </div>
        )}

        {/* ── MOTTO-PARTY (R25): while active, ALL search fields and filters
            are hidden and replaced by the motto banner (like the desktop
            library) — the song list only shows the motto-matching songs ── */}
        {gameState.mottoParty?.enabled ? (
          <div
            className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/15 via-pink-500/10 to-amber-500/15 px-3.5 py-3 flex items-center gap-3"
            data-testid="mirror-library-motto-banner"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl shrink-0" aria-hidden="true">🎉</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
                {tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
              </p>
              <h4 className="text-white font-bold text-base truncate">
                {gameState.mottoParty.name?.trim() || tOr(t, 'unifiedSetup.mottoPartyLabel', 'Motto-Party')}
              </h4>
              <p className="text-white/40 text-[11px] leading-snug">
                {tOr(t, 'unifiedSetup.mottoPartySongs', '{n} von {m} Songs passen zum Motto')
                  .replace('{n}', String(displaySongs.length))
                  .replace('{m}', String(songs.length))}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-purple-500/25 border border-purple-400/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              🎉 {tOr(t, 'settingsMotto.activeBadge', 'Aktiv')}
            </span>
          </div>
        ) : (
        <>
        {/* Suchfeld */}
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={songSearch}
            onChange={(e) => onSongSearchChange(e.target.value)}
            placeholder={t('mobile.mirrorSearchSongs') || 'Suche...'}
            className={'w-full rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-white/30 ' +
              'bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 focus:bg-white/8 transition-colors'}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">{'\u{1F50D}'}</span>
          {songSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm active:text-white/60"
            >{'\u2715'}</button>
          )}
        </div>

        {/* R51/Bug5+6 — Kompakte Filter-Reihe statt breiter Dropdown-Felder:
            Genre / Lang. / Jahr / Ära als schmale Chips nebeneinander (+ Viral
            + Reset). Smartphones öffnen native Selects ohnehin als
            Fullscreen-Overlay über den ganzen Screen — die geschlossenen
            Felder brauchen nur das Kurzlabel bzw. den gewählten Wert zeigen. */}
        <div className="flex flex-wrap gap-1.5" data-testid="mirror-library-filter-row">
          {genres.length > 0 && (
            <FilterChip
              label={tOr(t, 'mobile.filterGenreShort', 'Genre')}
              value={genreFilter}
              onChange={setGenreFilter}
              active={genreFilter !== 'all'}
              displayValue={genreFilter}
              testId="mirror-filter-genre"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">{t('library.allGenres') || 'Alle Genres'}</option>
              {genres.map((g) => (
                <option key={g} value={g} className="bg-[#1a1a2e] text-white">{g}</option>
              ))}
            </FilterChip>
          )}

          {languages.length > 1 && (
            <FilterChip
              label={tOr(t, 'mobile.filterLanguageShort', 'Lang.')}
              value={languageFilter}
              onChange={setLanguageFilter}
              active={languageFilter !== 'all'}
              displayValue={languageFilter}
              testId="mirror-filter-language"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">{t('library.allLanguages') || 'Alle Sprachen'}</option>
              {languages.map((l) => (
                <option key={l} value={l} className="bg-[#1a1a2e] text-white">{l}</option>
              ))}
            </FilterChip>
          )}

          {years.length > 0 && (
            <FilterChip
              label={tOr(t, 'mobile.filterYearShort', 'Jahr')}
              value={yearFilter}
              onChange={setYearFilter}
              active={yearFilter !== 'all'}
              displayValue={yearFilter}
              testId="mirror-filter-year"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">{t('library.allYears') || 'Alle Jahre'}</option>
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#1a1a2e] text-white">{y}</option>
              ))}
            </FilterChip>
          )}

          {decades.length > 0 && (
            <FilterChip
              label={tOr(t, 'mobile.filterEraShort', 'Ära')}
              value={eraFilter}
              onChange={setEraFilter}
              active={eraFilter !== 'all'}
              displayValue={eraFilter !== 'all' ? t('library.eraOption').replace('{decade}', decadeShortLabel(Number(eraFilter))) : undefined}
              testId="mirror-filter-era"
            >
              <option value="all" className="bg-[#1a1a2e] text-white">{t('library.allEras') || 'Alle'}</option>
              {decades.map((d) => (
                <option key={d} value={d} className="bg-[#1a1a2e] text-white">
                  {t('library.eraOption').replace('{decade}', decadeShortLabel(Number(d)))}
                </option>
              ))}
            </FilterChip>
          )}

          {/* Viral-Hits Filter-Chip (kompakt, wie die anderen Filter) */}
          {(gameState.viralSongIds?.length ?? 0) > 0 && (
            <button
              onClick={() => { haptic(); setFilterViral(!filterViral); }}
              className={'flex-1 min-w-[64px] basis-0 flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium border active:scale-[0.98] transition-all ' +
                (filterViral
                  ? 'border-orange-500/50 bg-orange-500/25 text-orange-300'
                  : 'bg-white/5 border-white/10 text-white/60')}
              data-testid="mirror-filter-viral"
            >
              <span>{'\uD83D\uDD25'}</span>
              <span className="truncate">{t('libraryFilters.viralHits') || 'Viral'}</span>
            </button>
          )}

          {/* Reset — erscheint nur, wenn ein Filter aktiv ist */}
          {(genreFilter !== 'all' || languageFilter !== 'all' || yearFilter !== 'all' || eraFilter !== 'all' || filterViral) && (
            <button
              onClick={() => { haptic(); setGenreFilter('all'); setLanguageFilter('all'); setYearFilter('all'); setEraFilter('all'); setFilterViral(false); }}
              className="flex-1 min-w-[56px] basis-0 flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium bg-white/5 border border-white/10 text-white/50 active:scale-[0.98] transition-all"
              aria-label={tOr(t, 'mobile.filterResetShort', 'Zurücksetzen')}
              data-testid="mirror-filter-reset"
            >
              <span>{'\u2715'}</span>
              <span className="truncate">{tOr(t, 'mobile.filterResetShort', 'Reset')}</span>
            </button>
          )}
        </div>
        </>
        )}

        {/* Loading */}
        {songsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error */}
        {songsError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{songsError}</p>
            <button onClick={onRefreshSongs} className="mt-2 text-xs text-red-300 underline">Erneut laden</button>
          </div>
        )}

        {/* Leerer Zustand */}
        {!songsLoading && !songsError && displaySongs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl" aria-hidden="true">{gameState.mottoParty?.enabled ? '🎉' : '🎵'}</span>
            <p className="text-sm text-white/40 text-center">
              {gameState.mottoParty?.enabled
                ? tOr(t, 'library.mottoNoSongs', 'Kein Song passt zum Motto — passe das Motto in den Settings an')
                : (t('mobile.mirrorNoSongs') || 'Keine Songs gefunden')}
            </p>
          </div>
        )}

        {/* Songliste - Tap oeffnet Overlay. Eigener Scroll-Bereich (max-h +
            overflow-y-auto + schlanke Custom-Scrollbar), damit Suche/Filter
            erreichbar bleiben; Cover laden lazy nur fuer sichtbare Zeilen. */}
        <div
          className={
            'flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto pr-1 -mr-1 kz-scroll'
          }
        >
          {displaySongs.map((song) => (
            <button
              key={song.id}
              onClick={() => openOverlayWithPreviewStop(song)}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ' +
                'bg-white/5 border border-white/10 active:bg-white/10'}
            >
              {/* R33/P13 + R34: Mini-Cover (44px, lazy) — 3-Stufen-Fallback:
                  API-Thumbnail → song.coverImage (data:/http:, NICHT blob:)
                  → farbige Initialen-Kachel */}
              <SongCoverTile songId={song.id} title={song.title} coverImage={song.coverImage} className="w-11 h-11 rounded-lg" />
              {/* Song-Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-white">{song.title}</p>
                  {gameState.viralSongIds?.includes(song.id) && (
                    <span className="shrink-0 text-xs">{'\uD83D\uDD25'}</span>
                  )}
                </div>
                <p className="truncate text-xs text-white/40">{song.artist}</p>
              </div>
              {/* Desktop-Preview Button (nur kontrollierender Companion) —
                  span[role=button] instead of <button>: a button inside the
                  song-row <button> is invalid HTML (hydration error). */}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  haptic();
                  if (desktopPreviewSongId === song.id) {
                    handleStopDesktopPreview();
                  } else {
                    handleDesktopPreview(song.id);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    haptic();
                    if (desktopPreviewSongId === song.id) {
                      handleStopDesktopPreview();
                    } else {
                      handleDesktopPreview(song.id);
                    }
                  }
                }}
                className={
                  'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ' +
                  (desktopPreviewSongId === song.id
                    ? 'bg-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 text-white/30 active:text-white/60')
                }
                aria-label={desktopPreviewSongId === song.id
                  ? (t('mobilePreview.stopPreview') || 'Stop Preview')
                  : (t('mobilePreview.playOnDesktop') || 'Preview on Desktop')}
              >
                <span className="text-sm" aria-hidden="true">{desktopPreviewSongId === song.id ? '\u23F9' : '\u{1F50A}'}</span>
              </span>
              {/* Dauer */}
              <span className="shrink-0 text-[10px] font-mono text-white/30 w-8 text-right">{formatDurationSec(song.duration)}</span>
              {/* Chevron */}
              <span className="shrink-0 text-white/20 text-xs">{'\u203A'}</span>
            </button>
          ))}
        </div>

        {/* ============= SONG-OPTIONS-OVERLAY ============= */}
        {overlaySong && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
            onClick={closeOverlay}
          >
            <div
              className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Overlay Header — R52: mit Cover-Kachel + Jahr; das Bottom-Sheet
                  nutzt damit die Previously brachliegenden ⅓ des Screens. */}
              <div className="flex items-start justify-between mb-5 gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-3.5">
                  <SongCoverTile
                    songId={overlaySong.id}
                    title={overlaySong.title}
                    coverImage={overlaySong.coverImage}
                    className="w-[76px] h-[76px] rounded-xl border border-white/10 shadow-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">{overlaySong.title}</h3>
                    <p className="text-sm text-white/50 truncate mt-0.5">{overlaySong.artist}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-white/35 font-mono">{formatDurationSec(overlaySong.duration)}</span>
                      {overlaySong.genre && <span className="text-xs text-white/30">· {overlaySong.genre}</span>}
                      {overlaySong.year ? <span className="text-xs text-white/30">· {overlaySong.year}</span> : null}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeOverlay}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Game-Mode Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-white/40">{t('mobileViews.gameMode') || 'Modus'}:</span>
                <span className={'rounded-lg px-2.5 py-1 text-xs font-bold ' +
                  (libGameMode === 'single' ? 'bg-cyan-500/25 text-cyan-400' : libGameMode === 'duel' ? 'bg-red-500/25 text-red-400' : 'bg-pink-500/25 text-pink-400')}>
                  {MODE_BUTTONS.find((m) => m.mode === libGameMode)?.icon}{' '}
                  {t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '') === MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey
                    ? MODE_BUTTONS.find((m) => m.mode === libGameMode)?.fallback
                    : t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '')}
                </span>
              </div>

              {/* Schwierigkeit */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    {t('mobileViews.difficulty') || 'Schwierigkeit'}
                  </h4>
                  {/* R33/P16: Anzeige-Hinweis auf den Desktop-Default. Die
                      Vorauswahl selbst macht der Data-Hook (difficulty-Prop).
                      Ohne settingsSnapshot entfällt der Hinweis. */}
                  {settingsSnapshot?.defaultDifficulty && (
                    <span className="shrink-0 rounded-full bg-cyan-500/10 border border-cyan-400/25 px-2 py-0.5 text-[10px] font-semibold text-cyan-300/90">
                      {'\u{1F5A5}\uFE0F '}{tOr(t, 'mobileViews.desktopDefaultDifficulty', 'Desktop-Standard')}:{' '}
                      {DIFF_OPTIONS.find((d) => d.id === settingsSnapshot.defaultDifficulty)?.label || settingsSnapshot.defaultDifficulty}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {DIFF_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { haptic(); setOvDifficulty(d.id); }}
                      className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-all border ' +
                        (ovDifficulty === d.id ? d.color : 'bg-white/5 border-white/10 text-white/50')}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gegner/Partner-Auswahl (nur Duell/Duett) */}
              {needsChallenge && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                    {libGameMode === 'duel'
                      ? (t('mobileViews.selectOpponent') || 'Gegner wählen')
                      : (t('mobileViews.selectPartner') || 'Duett-Partner wählen')}
                  </h4>
                  <select
                    value={ovPartnerId || ''}
                    onChange={(e) => { haptic(); setOvPartnerId(e.target.value || null); }}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white cursor-pointer"
                    style={dropdownStyle}
                  >
                    {allPartners.length > 0 ? (
                      <option value="" className="bg-[#1a1a2e] text-white">
                        {t('mobileViews.chooseOpponent') || 'Gegner wählen...'}
                      </option>
                    ) : (
                      <option value="" disabled className="bg-[#1a1a2e] text-white">
                        {t('mobileViews.noOpponentsAvailable') || 'Keine Gegner verfügbar'}
                      </option>
                    )}
                    {allPartners.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* R39/P4: Gesangs-Gerät — Ich (immer Companion vorausgewählt,
                  änderbar auf ein Desktop-Mikrofon) + Partner (nur Duell/
                  Duett; Companion vorausgewählt, wenn via Companion verbunden) */}
              <div className="mb-4 flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1">
                  {tOr(t, 'deviceSectionTitle', 'Gesangs-Gerät')}
                </h4>
                <DevicePicker
                  label={tOr(t, 'deviceMe', 'Ich singe mit')}
                  connectedViaCompanion
                  device={ovPlayerDevice}
                  onDeviceChange={setOvPlayerDevice}
                  availableMics={availableMics}
                  t={t}
                />
                {needsChallenge && ovPartnerId && (
                  <DevicePicker
                    label={tOr(t, 'devicePartner', 'Partner singt mit')}
                    name={allPartners.find(p => p.id === ovPartnerId)?.name}
                    connectedViaCompanion={opponents.some((o: { id: string }) => o.id === ovPartnerId)}
                    device={ovPartnerDevice}
                    onDeviceChange={setOvPartnerDevice}
                    availableMics={availableMics}
                    t={t}
                  />
                )}
              </div>

              {/* Trennlinie */}
              <div className="border-t border-white/10 my-4" />

              {/* Warnung: kein Gegner ausgewaehlt */}
              {missingOpponent && (
                <p className="text-xs text-amber-400 text-center">
                  {t('mobile.mirrorDuetHint') || 'Bitte Gegner auswaehlen oder Herausfordern (Chat)'}
                </p>
              )}

              {/* Aktions-Buttons — R33/P17: NUR noch Queue/Playlist/Party/Chat,
                  KEIN "Spiel starten" mehr: Der Desktop entscheidet, wann
                  gesungen wird. */}
              <div className="flex flex-col gap-2.5">
                {/* Zur Warteschlange hinzufuegen (jetzt primaere Aktion) */}
                <button
                  onClick={handleOverlayQueue}
                  disabled={ovAdding || missingOpponent}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/40 text-cyan-300 active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  <span className="text-base">{'\u{1F4CB}'}</span>
                  <span>{tOr(t, 'mobileViews.queueAddAction', 'Zur Warteschlange hinzufügen')}</span>
                  {ovAdding && <span className="animate-spin text-xs">{'\u23F3'}</span>}
                </button>

                {/* Zur Playlist */}
                <button
                  onClick={handleOverlayPlaylist}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-400 active:scale-[0.97] transition-all"
                >
                  <span className="text-base">{'\u{1F4FB}'}</span>
                  <span>{t('mobile.mirrorPlaylist') || 'Zur Playlist'}</span>
                </button>

                {/* Fuer Party auswaehlen (nur im Party-Setup Library-Modus) */}
                {gameState.partyGameMode && (
                  <button
                    onClick={() => {
                      if (!overlaySong) return;
                      onSendDesktopCommand(`party_select_song:${overlaySong.id}`);
                      closeOverlay();
                    }}
                    disabled={ovAdding}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/20 text-white active:scale-[0.97] transition-all disabled:opacity-40"
                  >
                    <span className="text-base">{'\u{1F3B5}'}</span>
                    <span>{t('mobile.mirrorPartySelect') || 'F\u00fcr Party ausw\u00e4hlen'}</span>
                  </button>
                )}

                {/* Herausfordern (nur Duell/Duett) */}
                {needsChallenge && (
                  <button
                    onClick={handleOverlayChallenge}
                    disabled={ovChallengeSent}
                    className={'w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold active:scale-[0.97] transition-all ' +
                      (ovChallengeSent
                        ? 'bg-green-500/20 border border-green-400/30 text-green-400'
                        : 'bg-red-500/15 border border-red-400/25 text-red-400')}
                  >
                    <span className="text-base">{ovChallengeSent ? '\u2705' : '\u2694\uFE0F'}</span>
                    <span>{ovChallengeSent
                      ? (t('mobile.mirrorChallengeSent') || 'Gesendet!')
                      : (t('desktopChat.challenge') || 'Herausfordern (Chat)')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============= PLAYLIST-PICKER-OVERLAY ============= */}
        {showPlaylistPicker && overlaySong && (
          <div
            className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm"
            onClick={closePlaylistPicker}
          >
            <div
              className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">{t('mobile.mirrorPlaylistPick') || 'Playlist waehlen'}</h3>
                <button
                  onClick={closePlaylistPicker}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Song-Info */}
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 mb-4">
                <span className="text-base">{'\u{1F3B5}'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{overlaySong.title}</p>
                  <p className="truncate text-xs text-white/40">{overlaySong.artist}</p>
                </div>
              </div>

              {/* Loading */}
              {playlistLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                </div>
              )}

              {/* Playlist-Liste */}
              {!playlistLoading && playlists.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {playlists.filter((p) => !p.isSystem).map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id)}
                      disabled={playlistAdding === pl.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-white/5 border border-white/10 active:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <span className="text-base">{'\u{1F4C1}'}</span>
                      <span className="flex-1 text-sm font-medium text-white truncate">{pl.name}</span>
                      {playlistAdding === pl.id && <span className="animate-spin text-xs">{'\u23F3'}</span>}
                      {playlistAdding !== pl.id && <span className="text-white/20 text-xs">{'\u2795'}</span>}
                    </button>
                  ))}
                </div>
              )}

              {!playlistLoading && playlists.filter((p) => !p.isSystem).length === 0 && !showNewPlaylist && (
                <p className="text-xs text-white/30 text-center py-3">
                  {t('mobile.mirrorNoPlaylists') || 'Keine Playlists vorhanden'}
                </p>
              )}

              {/* Neue Playlist */}
              {!showNewPlaylist ? (
                <button
                  onClick={() => { haptic(); setShowNewPlaylist(true); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 active:scale-[0.98] transition-all"
                >
                  <span>{'\u2795'}</span>
                  <span>{t('mobile.mirrorNewPlaylist') || 'Neue Playlist erstellen'}</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder={t('mobile.mirrorPlaylistName') || 'Playlist-Name'}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { haptic(); setShowNewPlaylist(false); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white/70 active:bg-white/20 transition-all"
                    >
                      {t('mobile.mirrorCancel') || 'Abbrechen'}
                    </button>
                    <button
                      onClick={handleCreateAndAddPlaylist}
                      disabled={!newPlaylistName.trim() || playlistAdding === 'new'}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-all disabled:opacity-40"
                    >
                      {playlistAdding === 'new' ? '\u23F3' : t('mobile.mirrorCreateAdd') || 'Erstellen & Hinzufuegen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
}MirrorLibraryLite.displayName = 'MirrorLibraryLite';
