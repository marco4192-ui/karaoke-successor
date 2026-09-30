'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JukeboxWishlistItem, GameState, MobileView, MobileSong, JukeboxMirrorState } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { extractEmbedSrc, isSupportedVideoLink } from '@/components/screens/jukebox/video-break';

// ===================== Props =====================

interface MirrorJukeboxLiteProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onRemoveFromJukebox: (id: string) => void;
  onRefreshJukebox: () => void;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Command an den Desktop (optional mit Daten-Payload) */
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  // ── R33/P8: steuernde Companion-Extras (werden von der Shell durchgereicht) ──
  /** false = dieser Companion steuert nicht → Commands werden nicht gesendet. */
  isControlling?: boolean;
  /** Desktop-Jukebox-Zustand (Filter/Pool/Shuffle/Repeat), per POST
   *  type:'jukeboxstate' gepusht und hier gespiegelt. */
  jukeboxState?: JukeboxMirrorState | null;
  /** Zieht den Jukebox-Zustand frisch vom Server (GET getjukeboxstate). */
  onLoadJukeboxState?: () => void;
  /** Song-Bibliothek (falls die Shell sie schon geladen hat) — sonst Fetch. */
  songs?: MobileSong[];
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** tOr-Muster: übersetzter Key oder deutscher/lokaler Fallback. */
function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

type RepeatMode = 'all' | 'none' | 'one';

/** R33/P8-Filter-Felder — identisch zur Desktop-Jukebox (use-jukebox.ts). */
type FilterField = 'genre' | 'artist' | 'era' | 'year';

/** Effektive Filter-Werte ('all' bzw. '' = inaktiv) — Spiegel des Desktop-State. */
interface EffectiveFilters {
  genre: string;
  artist: string;
  era: string;
  year: string;
}

const DEFAULT_FILTERS: EffectiveFilters = { genre: 'all', artist: '', era: 'all', year: 'all' };

function isActiveFilterValue(v: unknown): boolean {
  return typeof v === 'string' && v !== '' && v !== 'all';
}

/** Playlist-Eintrag aus GET /api/mobile?action=playlists (Songs cap 50). */
interface JukeboxPlaylistInfo {
  id: string;
  name: string;
  isSystem?: boolean;
  songs?: Array<{ id: string; title?: string; artist?: string }>;
}

// ── Modul-Caches: überleben Remounts der Mirror-View (die Shell unmountet
//    die Ansicht bei jeder Navigation) — Playlists/Bibliothek werden nicht
//    bei jedem Öffnen neu geladen.
let cachedPlaylists: JukeboxPlaylistInfo[] | null = null;
let playlistsCacheAt = 0;
let cachedLibrarySongs: MobileSong[] | null = null;

// Chevron-down Hintergrund für native Selects (gleiches Muster wie Desktop)
const selectStyle: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '14px',
  paddingRight: '30px',
};

// ===================== Cover-Kachel (Wunschliste) =====================

/**
 * Cover einer Wunschliste-Zeile: bevorzugt das Mini-Thumbnail vom Desktop
 * (GET songcover, 96px JPEG), sonst die mitgeschickte coverImage-Data-URL,
 * sonst Fallback auf eine Initialen-Kachel.
 */
function WishlistCover({ item }: { item: JukeboxWishlistItem }) {
  const [stage, setStage] = useState<'api' | 'inline' | 'initials'>('api');
  const initials = (item.songTitle || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => (w[0] ?? '').toUpperCase()).join('') || '♪';

  if (stage === 'api') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/mobile?action=songcover&songId=${encodeURIComponent(item.songId)}`}
        alt=""
        onError={() => setStage(item.coverImage ? 'inline' : 'initials')}
        className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }
  if (stage === 'inline' && item.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.coverImage}
        alt=""
        onError={() => setStage('initials')}
        className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover"
      />
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/25 to-purple-500/25 text-xs font-bold text-white/70">
      {initials}
    </div>
  );
}

// ===================== Filter-Select =====================

function FilterSelect({
  id, label, value, allValue, allLabel, options, onChange, disabled,
}: {
  id: string;
  label: string;
  value: string;
  allValue: string;
  allLabel: string;
  options: Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] text-white/40">{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full appearance-none rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-400/60 disabled:opacity-40"
        style={selectStyle}
      >
        <option value={allValue} className="bg-gray-800 text-white">{allLabel}</option>
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-gray-800 text-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ===================== Component =====================

export function MirrorJukeboxLite({
  jukeboxWishlist,
  onRemoveFromJukebox,
  onRefreshJukebox,
  onSendDesktopCommand,
  gameState,
  isControlling,
  jukeboxState,
  onLoadJukeboxState,
  songs: songsProp,
}: MirrorJukeboxLiteProps) {
    const { t } = useTranslation();

    // Shell blendet die Ansicht Nicht-steuernden aus — aber sicherheitshalber
    // werden Commands nur gesendet, wenn isControlling !== false ist.
    const sendCommand = useCallback(
      (command: string, data?: unknown) => {
        if (isControlling === false) return;
        haptic();
        onSendDesktopCommand(command, data);
      },
      [isControlling, onSendDesktopCommand],
    );

    // Local UI state for toggle buttons (optimistic fallback, solange kein
    // jukeboxState vom Desktop da ist)
    const [shuffleOn, setShuffleOn] = useState(true);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
    const [lyricsOn, setLyricsOn] = useState(false);

    const handleRemove = useCallback(
      (id: string) => { onRemoveFromJukebox(id); },
      [onRemoveFromJukebox],
    );

    const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'info' } | null>(null);
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showNotice = useCallback((text: string, tone: 'ok' | 'info' = 'ok') => {
      setNotice({ text, tone });
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setNotice(null), 3000);
    }, []);
    useEffect(() => () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    }, []);

    // Nach einem Command den Desktop-Zustand bald wieder ziehen (der Desktop
    // prüft/pusht Änderungen alle 3 s — zwei Pulls überbrücken die Roundtrip-
    // Lücke zuverlässig)
    const pullStateSoon = useCallback((delayMs = 3500) => {
      setTimeout(() => {
        onLoadJukeboxState?.();
        onRefreshJukebox();
      }, delayMs);
      setTimeout(() => {
        onLoadJukeboxState?.();
      }, delayMs + 3500);
    }, [onLoadJukeboxState, onRefreshJukebox]);

    // Einmaliger initialer Pull beim Mount der Ansicht
    const pulledOnceRef = useRef(false);
    useEffect(() => {
      if (pulledOnceRef.current) return;
      pulledOnceRef.current = true;
      onLoadJukeboxState?.();
    }, [onLoadJukeboxState]);

    // ── R33/P8: effektiver Jukebox-Zustand (Desktop-Push + optimistische
    //    Overrides bis der nächste Pull den echten Stand liefert) ──
    // Defensive Entschachtelung: sollte der Zustand (Server-variante) als
    // { jukebox: {…} } ankommen, die innere Ebene verwenden — use-mobile-data
    // reicht data.jukebox 1:1 durch.
    const jbState = useMemo(() => {
      const raw = jukeboxState as (JukeboxMirrorState & { jukebox?: JukeboxMirrorState }) | null | undefined;
      return raw && raw.jukebox && typeof raw.jukebox === 'object' ? raw.jukebox : (raw ?? null);
    }, [jukeboxState]);

    const [optimisticFilters, setOptimisticFilters] = useState<Partial<EffectiveFilters>>({});
    const [optimisticPoolId, setOptimisticPoolId] = useState<string | undefined>(undefined);

    // State-Werte aus dem Desktop-Push (normalisiert: 'all' bzw. '' = inaktiv)
    const stateFiltersRaw = (jbState?.filters ?? {}) as Partial<Record<FilterField, unknown>>;
    const stateFilters: EffectiveFilters = {
      genre: isActiveFilterValue(stateFiltersRaw.genre) ? String(stateFiltersRaw.genre) : DEFAULT_FILTERS.genre,
      artist: isActiveFilterValue(stateFiltersRaw.artist) ? String(stateFiltersRaw.artist) : DEFAULT_FILTERS.artist,
      era: isActiveFilterValue(stateFiltersRaw.era) ? String(stateFiltersRaw.era) : DEFAULT_FILTERS.era,
      year: isActiveFilterValue(stateFiltersRaw.year) ? String(stateFiltersRaw.year) : DEFAULT_FILTERS.year,
    };
    const filters: EffectiveFilters = { ...stateFilters, ...optimisticFilters };
    const statePoolId = jbState?.poolPlaylistId ?? '';
    const activePoolId = optimisticPoolId !== undefined ? optimisticPoolId : statePoolId;

    // Optimistische Overrides zurücksetzen, sobald der Desktop-State sie
    // BESTÄTIGT (Konvergenz-Vergleich — veraltete Pulls führen so nicht zum
    // Zurück-Flackern), plus Ablauf nach 10 s, falls ein Command scheiterte.
    useEffect(() => {
      setOptimisticFilters(prev => {
        if (Object.keys(prev).length === 0) return prev;
        let changed = false;
        const next: Partial<EffectiveFilters> = {};
        (Object.keys(prev) as FilterField[]).forEach(k => {
          if (stateFilters[k] !== prev[k]) next[k] = prev[k];
          else changed = true;
        });
        return changed ? next : prev;
      });
      setOptimisticPoolId(prev => {
        if (prev === undefined) return prev;
        return statePoolId === prev ? undefined : prev;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateFilters/statePoolId sind aus jbState abgeleitet
    }, [jbState]);

    const optimisticExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleOptimisticExpiry = useCallback(() => {
      if (optimisticExpireRef.current) clearTimeout(optimisticExpireRef.current);
      optimisticExpireRef.current = setTimeout(() => {
        setOptimisticFilters({});
        setOptimisticPoolId(undefined);
      }, 10_000);
    }, []);
    useEffect(() => () => {
      if (optimisticExpireRef.current) clearTimeout(optimisticExpireRef.current);
    }, []);

    // Shuffle/Repeat-Anzeige aus dem Desktop-State (read-only Spiegel);
    // ohne State: optimistischer lokaler Fallback.
    const repeatRaw = jbState?.repeat as unknown as RepeatMode | boolean | undefined;
    const repeatFromState: RepeatMode | null =
      repeatRaw === 'all' || repeatRaw === 'one' || repeatRaw === 'none'
        ? repeatRaw
        : typeof repeatRaw === 'boolean'
          ? (repeatRaw ? 'all' : 'none')
          : null;
    const shuffleActive = typeof jbState?.shuffle === 'boolean' ? jbState.shuffle : shuffleOn;
    const repeatModeNow = repeatFromState ?? repeatMode;

    const repeatLabel = repeatModeNow === 'all'
      ? t('mobile.mirrorJukeboxRepeatAll')
      : repeatModeNow === 'one'
        ? t('mobile.mirrorJukeboxRepeatOne')
        : t('mobile.mirrorJukeboxRepeatOff');

    // ── R33/P8: Song-Bibliothek cachen (für Genre/Künstler/Dekade/Jahr) ──
    const [librarySongs, setLibrarySongs] = useState<MobileSong[]>(
      () => songsProp ?? cachedLibrarySongs ?? [],
    );
    useEffect(() => {
      if (songsProp && songsProp.length > 0) {
        cachedLibrarySongs = songsProp;
        setLibrarySongs(songsProp);
        return;
      }
      if (cachedLibrarySongs && cachedLibrarySongs.length > 0) {
        setLibrarySongs(cachedLibrarySongs);
        return;
      }
      let active = true;
      fetch('/api/mobile?action=getsongs')
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (!active || !data?.success || !Array.isArray(data.songs)) return;
          cachedLibrarySongs = data.songs as MobileSong[];
          setLibrarySongs(cachedLibrarySongs);
        })
        .catch(() => { /* ignore — Filter-UI bleibt leer */ });
      return () => { active = false; };
    }, [songsProp]);

    const genreOptions = useMemo(() => {
      const set = new Set<string>();
      librarySongs.forEach(s => { if (s.genre) set.add(s.genre); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [librarySongs]);

    const artistOptions = useMemo(() => {
      const set = new Set<string>();
      librarySongs.forEach(s => { if (s.artist) set.add(s.artist); });
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [librarySongs]);

    const eraOptions = useMemo(() => {
      const set = new Set<string>();
      librarySongs.forEach(s => { if (s.year) set.add(String(Math.floor(s.year / 10) * 10)); });
      return Array.from(set).sort();
    }, [librarySongs]);

    const yearOptions = useMemo(() => {
      const set = new Set<string>();
      librarySongs.forEach(s => { if (s.year) set.add(String(s.year)); });
      return Array.from(set).sort((a, b) => Number(b) - Number(a));
    }, [librarySongs]);

    const eraLabel = useCallback(
      (era: string) => tOr(t, 'library.eraOption', '{decade}s').replace('{decade}', era),
      [t],
    );

    // ── R33/P8: Filter setzen/leeren (jukebox_set_filter) ──
    const applyFilter = useCallback((field: FilterField, value: string) => {
      const cleared = !value || value === 'all';
      setOptimisticFilters(prev => ({
        ...prev,
        [field]: cleared ? (field === 'artist' ? '' : 'all') : value,
      }));
      scheduleOptimisticExpiry();
      sendCommand('jukebox_set_filter', { field, value: cleared ? null : value });
      showNotice(
        cleared
          ? tOr(t, 'mobile.mirrorJukeboxFilterCleared', 'Filter entfernt.')
          : tOr(t, 'mobile.mirrorJukeboxFilterApplied', 'Filter gesetzt — wird auf dem Desktop übernommen.'),
        'info',
      );
      pullStateSoon();
    }, [sendCommand, showNotice, pullStateSoon, t, scheduleOptimisticExpiry]);

    // Aktive Filter als Chips (Genre/Künstler/Dekade/Jahr)
    const activeFilterChips: Array<{ field: FilterField; label: string }> = [];
    if (isActiveFilterValue(filters.genre)) {
      activeFilterChips.push({ field: 'genre', label: `${tOr(t, 'mobile.mirrorJukeboxFilterGenre', 'Genre')}: ${filters.genre}` });
    }
    if (filters.artist) {
      activeFilterChips.push({ field: 'artist', label: `${tOr(t, 'mobile.mirrorJukeboxFilterArtist', 'Künstler')}: ${filters.artist}` });
    }
    if (isActiveFilterValue(filters.era)) {
      activeFilterChips.push({ field: 'era', label: `${tOr(t, 'mobile.mirrorJukeboxFilterEra', 'Dekade')}: ${eraLabel(filters.era)}` });
    }
    if (isActiveFilterValue(filters.year)) {
      activeFilterChips.push({ field: 'year', label: `${tOr(t, 'mobile.mirrorJukeboxFilterYear', 'Jahr')}: ${filters.year}` });
    }

    const [showFilterPicker, setShowFilterPicker] = useState(false);

    // ── R33/P8: Playlists laden (GET action=playlists, Modul-Cache 60 s) ──
    const [playlists, setPlaylists] = useState<JukeboxPlaylistInfo[]>(() => cachedPlaylists ?? []);
    const [playlistsLoading, setPlaylistsLoading] = useState(false);
    const [playlistsError, setPlaylistsError] = useState(false);

    const loadPlaylists = useCallback(async (force = false) => {
      if (!force && cachedPlaylists && Date.now() - playlistsCacheAt < 60_000) {
        setPlaylists(cachedPlaylists);
        return;
      }
      setPlaylistsLoading(true);
      setPlaylistsError(false);
      try {
        const res = await fetch('/api/mobile?action=playlists');
        const data = await res.json();
        if (data?.success && Array.isArray(data.playlists)) {
          cachedPlaylists = data.playlists;
          playlistsCacheAt = Date.now();
          setPlaylists(cachedPlaylists ?? []);
        } else {
          setPlaylistsError(true);
        }
      } catch {
        setPlaylistsError(true);
      } finally {
        setPlaylistsLoading(false);
      }
    }, []);

    useEffect(() => { void loadPlaylists(); }, [loadPlaylists]);

    const activePoolName = useMemo(() => {
      if (!activePoolId) return tOr(t, 'mobile.mirrorJukeboxPoolAll', 'Alle Songs');
      const pl = playlists.find(p => p.id === activePoolId);
      if (pl) return pl.name;
      if (typeof jbState?.poolPlaylistName === 'string' && jbState.poolPlaylistName) {
        return jbState.poolPlaylistName;
      }
      return tOr(t, 'mobile.mirrorJukeboxPoolAll', 'Alle Songs');
    }, [activePoolId, playlists, jbState, t]);

    // ── R33/P8: Pool festlegen / Playlist zur Wunschliste ──
    const setPool = useCallback((playlistId: string) => {
      setOptimisticPoolId(playlistId);
      scheduleOptimisticExpiry();
      sendCommand('jukebox_set_pool', { playlistId });
      showNotice(
        playlistId
          ? tOr(t, 'mobile.mirrorJukeboxPoolSet', 'Song-Pool festgelegt.')
          : tOr(t, 'mobile.mirrorJukeboxPoolCleared', 'Song-Pool zurückgesetzt — alle Songs.'),
        'info',
      );
      pullStateSoon();
    }, [sendCommand, showNotice, pullStateSoon, t, scheduleOptimisticExpiry]);

    const [confirmEnqueueId, setConfirmEnqueueId] = useState<string | null>(null);
    const enqueuePlaylist = useCallback((playlistId: string) => {
      setConfirmEnqueueId(null);
      sendCommand('jukebox_enqueue_playlist', { playlistId });
      showNotice(tOr(t, 'mobile.mirrorJukeboxEnqueued', 'Playlist eingereiht — läuft gleich auf dem Desktop.'));
      pullStateSoon(3500);
    }, [sendCommand, showNotice, pullStateSoon, t]);

    // ── Video-Link: wird auf dem Desktop in die Jukebox-Warteschlange
    //    eingereiht (mit Ton, nach den Wunschsongs). ──
    const [videoLink, setVideoLink] = useState('');
    const [videoLinkError, setVideoLinkError] = useState(false);
    const [videoLinkAdded, setVideoLinkAdded] = useState(false);

    const handleVideoLinkSubmit = useCallback(() => {
      // Embed codes (e.g. VK iframe snippets) are reduced to their src URL
      // BEFORE sending — keeps the command payload a plain link.
      const url = extractEmbedSrc(videoLink.trim()) ?? videoLink.trim();
      if (!url) return;
      if (!isSupportedVideoLink(url)) {
        setVideoLinkError(true);
        setVideoLinkAdded(false);
        return;
      }
      setVideoLinkError(false);
      setVideoLink('');
      haptic();
      onSendDesktopCommand('jukebox_video_add', { url });
      // Kurzes visuelles Feedback (der Desktop reiht den Link asynchron ein)
      setVideoLinkAdded(true);
      setTimeout(() => setVideoLinkAdded(false), 2500);
    }, [videoLink, onSendDesktopCommand]);

    // DO-NOT-CHANGE: Jukebox starten - wenn Playlist leer, wird auf dem
    // Desktop Random-Musik aus der gesamten Bibliothek abgespielt.
    const handleJukeboxStart = useCallback(() => {
      sendCommand('jukebox');
      setTimeout(() => { sendCommand('jukebox_play'); }, 300);
    }, [sendCommand]);

    const handleShuffle = useCallback(() => {
      setShuffleOn(s => !s);
      sendCommand('jukebox_shuffle');
    }, [sendCommand]);

    const handleRepeat = useCallback(() => {
      const modes: RepeatMode[] = ['all', 'none', 'one'];
      setRepeatMode(prev => {
        const idx = modes.indexOf(prev);
        return modes[(idx + 1) % modes.length];
      });
      sendCommand('jukebox_repeat');
    }, [sendCommand]);

    const handleLyricsToggle = useCallback(() => {
      setLyricsOn(s => !s);
      sendCommand('jukebox_lyrics_toggle');
    }, [sendCommand]);

    const handleRefreshAll = useCallback(() => {
      haptic();
      onRefreshJukebox();
      onLoadJukeboxState?.();
      void loadPlaylists(true);
    }, [onRefreshJukebox, onLoadJukeboxState, loadPlaylists]);

    // Current song info from game state
    const currentSong = gameState?.currentSong;
    const isPlaying = gameState?.isPlaying ?? false;

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorJukebox')}
          </h2>
          <div className="flex items-center gap-2">
            {jukeboxWishlist.length > 0 && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
                {jukeboxWishlist.length} {jukeboxWishlist.length === 1 ? t('mobile.mirrorSong') : t('mobile.mirrorSongsplural')}
              </span>
            )}
            <button
              onClick={handleRefreshAll}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/50 active:scale-95 transition-transform"
              title={tOr(t, 'mobile.mirrorJukeboxRefresh', 'Aktualisieren')}
              aria-label={tOr(t, 'mobile.mirrorJukeboxRefresh', 'Aktualisieren')}
            >
              🔄
            </button>
          </div>
        </div>

        {/* Kurzes Feedback zur letzten Aktion (Filter/Pool/Playlist) */}
        {notice && (
          <div className={`rounded-xl border px-3 py-2 text-xs ${
            notice.tone === 'ok'
              ? 'border-green-400/30 bg-green-500/10 text-green-300/90'
              : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200/90'
          }`}>
            {notice.text}
          </div>
        )}

        {/* Now Playing */}
        {currentSong && (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-400/20 px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-lg shrink-0">
              {'\u{1F3B5}'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{currentSong.title}</p>
              <p className="truncate text-xs text-white/40">{currentSong.artist}</p>
            </div>
            {isPlaying && (
              <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        )}

        {/* ── R33/P8: Status-Chips (read-only) — Pool / Shuffle / Repeat ── */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-white/60">
            💿 <span className="text-white/40">{tOr(t, 'mobile.mirrorJukeboxStateChipPool', 'Pool')}:</span>
            <span className="font-semibold text-white/90">{activePoolName}</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            shuffleActive
              ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}>
            🔀 {t('mobile.mirrorJukeboxShuffle')}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
            repeatModeNow !== 'none'
              ? 'bg-purple-500/15 border-purple-400/30 text-purple-300'
              : 'bg-white/5 border-white/10 text-white/40'
          }`}>
            {repeatModeNow === 'one' ? '🔂' : '🔁'} {repeatLabel}
          </span>
        </div>

        {/* ── R33/P8: Filter (Spiegel des Desktop-Jukebox-Setup) ── */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {tOr(t, 'mobile.mirrorJukeboxFilters', 'Filter')}
            </p>
            <button
              onClick={() => { haptic(); setShowFilterPicker(v => !v); }}
              className="rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/30 px-2.5 py-1 text-[11px] font-medium text-fuchsia-300 active:scale-95 transition-transform"
            >
              {showFilterPicker ? '▲ ' : '▼ '}
              {tOr(t, 'mobile.mirrorJukeboxFilterSet', 'Filter setzen')}
            </button>
          </div>

          {/* Aktive Filter als Chips — Tap entfernt den Filter (steuernd) */}
          {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeFilterChips.map(chip => (
                <button
                  key={chip.field}
                  onClick={() => applyFilter(chip.field, '')}
                  title={tOr(t, 'mobile.mirrorJukeboxFilterRemove', 'Filter entfernen')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/40 px-2.5 py-1 text-[11px] font-medium text-fuchsia-200 active:scale-95 transition-transform"
                >
                  {chip.label} ✕
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30">
              {tOr(t, 'mobile.mirrorJukeboxNoFilters', 'Keine Filter aktiv — die Jukebox spielt aus dem gesamten Pool.')}
            </p>
          )}

          {/* Auswahl-UI: Genre als Chips, Künstler/Dekade/Jahr als Dropdown */}
          {showFilterPicker && (
            <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
              {/* Genre */}
              <div>
                <p className="mb-1.5 text-[11px] text-white/40">
                  {tOr(t, 'mobile.mirrorJukeboxFilterGenre', 'Genre')}
                </p>
                {genreOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {genreOptions.map(g => {
                      const active = filters.genre === g;
                      return (
                        <button
                          key={g}
                          onClick={() => applyFilter('genre', active ? '' : g)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium active:scale-95 transition-all ${
                            active
                              ? 'bg-purple-500/25 border-purple-400/50 text-purple-200'
                              : 'bg-white/5 border-white/10 text-white/60'
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/30">
                    {tOr(t, 'mobile.mirrorJukeboxNoLibrary', 'Bibliothek wird geladen…')}
                  </p>
                )}
              </div>

              {/* Künstler */}
              <FilterSelect
                id="jukebox-mirror-artist"
                label={tOr(t, 'mobile.mirrorJukeboxFilterArtist', 'Künstler')}
                value={filters.artist}
                allValue=""
                allLabel={tOr(t, 'mobile.mirrorJukeboxFilterAllArtists', 'Alle Künstler')}
                options={artistOptions.map(a => ({ value: a, label: a }))}
                onChange={(v) => applyFilter('artist', v)}
                disabled={artistOptions.length === 0}
              />

              {/* Dekade */}
              <FilterSelect
                id="jukebox-mirror-era"
                label={tOr(t, 'mobile.mirrorJukeboxFilterEra', 'Dekade')}
                value={filters.era}
                allValue="all"
                allLabel={tOr(t, 'mobile.mirrorJukeboxFilterAllEras', 'Alle Dekaden')}
                options={eraOptions.map(e => ({ value: e, label: eraLabel(e) }))}
                onChange={(v) => applyFilter('era', v === 'all' ? '' : v)}
                disabled={eraOptions.length === 0}
              />

              {/* Jahr */}
              <FilterSelect
                id="jukebox-mirror-year"
                label={tOr(t, 'mobile.mirrorJukeboxFilterYear', 'Jahr')}
                value={filters.year}
                allValue="all"
                allLabel={tOr(t, 'mobile.mirrorJukeboxFilterAllYears', 'Alle Jahre')}
                options={yearOptions.map(y => ({ value: y, label: y }))}
                onChange={(v) => applyFilter('year', v === 'all' ? '' : v)}
                disabled={yearOptions.length === 0}
              />
            </div>
          )}
        </div>

        {/* ── R33/P8: Playlists & Song-Pool ── */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {tOr(t, 'mobile.mirrorJukeboxPlaylistsTitle', 'Playlists & Pool')}
            </p>
            <button
              onClick={() => { haptic(); void loadPlaylists(true); }}
              disabled={playlistsLoading}
              className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white/50 active:scale-95 transition-transform disabled:opacity-40"
              title={tOr(t, 'mobile.mirrorJukeboxRefresh', 'Aktualisieren')}
              aria-label={tOr(t, 'mobile.mirrorJukeboxRefresh', 'Aktualisieren')}
            >
              {playlistsLoading ? '…' : '🔄'}
            </button>
          </div>

          {/* "Alle Songs" — Pool zurücksetzen */}
          <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
            !activePoolId
              ? 'border-cyan-400/40 bg-cyan-500/10'
              : 'border-white/10 bg-white/[0.03]'
          }`}>
            <span className="text-base shrink-0">🎼</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {tOr(t, 'mobile.mirrorJukeboxPoolAll', 'Alle Songs')}
              </p>
              <p className="text-[11px] text-white/40">
                {tOr(t, 'mobile.mirrorJukeboxPlaylistSongs', '{n} Songs').replace('{n}', String(librarySongs.length))}
              </p>
            </div>
            {!activePoolId ? (
              <span className="shrink-0 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                {tOr(t, 'mobile.mirrorJukeboxActivePool', 'Aktiver Pool')}
              </span>
            ) : (
              <button
                onClick={() => setPool('')}
                className="shrink-0 rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300 active:scale-95 transition-transform"
                title={tOr(t, 'mobile.mirrorJukeboxSetPool', 'Als Pool festlegen')}
              >
                📀 {tOr(t, 'mobile.mirrorJukeboxSetPool', 'Als Pool')}
              </button>
            )}
          </div>

          {/* Playlist-Liste */}
          {playlists.map(pl => {
            const isActive = activePoolId === pl.id;
            const confirming = confirmEnqueueId === pl.id;
            return (
              <div
                key={pl.id}
                className={`mt-2 flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
                  isActive
                    ? 'border-cyan-400/40 bg-cyan-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <span className="text-base shrink-0">{pl.isSystem ? '⚙️' : '💿'}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                    <span className="truncate">{pl.name}</span>
                    {pl.isSystem && (
                      <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/50">
                        {tOr(t, 'mobile.mirrorJukeboxSystemBadge', 'System')}
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/40">
                    {tOr(t, 'mobile.mirrorJukeboxPlaylistSongs', '{n} Songs').replace('{n}', String(pl.songs?.length ?? 0))}
                  </p>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[10px] text-white/60">
                      {tOr(t, 'mobile.mirrorJukeboxEnqueueConfirm', 'Einreihen?')}
                    </span>
                    <button
                      onClick={() => enqueuePlaylist(pl.id)}
                      className="rounded-lg bg-green-500/20 border border-green-400/40 px-2 py-1 text-[11px] font-bold text-green-300 active:scale-95 transition-transform"
                      aria-label={tOr(t, 'mobile.mirrorJukeboxEnqueueConfirm', 'Einreihen?')}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setConfirmEnqueueId(null)}
                      className="rounded-lg bg-red-500/15 border border-red-400/30 px-2 py-1 text-[11px] font-bold text-red-400 active:scale-95 transition-transform"
                      aria-label={t('mobile.mirrorJukeboxStop')}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isActive ? (
                      <span className="rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                        {tOr(t, 'mobile.mirrorJukeboxActivePool', 'Aktiver Pool')}
                      </span>
                    ) : !pl.isSystem ? (
                      <button
                        onClick={() => setPool(pl.id)}
                        className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300 active:scale-95 transition-transform"
                        title={tOr(t, 'mobile.mirrorJukeboxSetPool', 'Als Pool festlegen')}
                      >
                        📀
                      </button>
                    ) : null}
                    <button
                      onClick={() => { haptic(); setConfirmEnqueueId(pl.id); }}
                      className="rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/30 px-2.5 py-1.5 text-[11px] font-medium text-fuchsia-300 active:scale-95 transition-transform"
                      title={tOr(t, 'mobile.mirrorJukeboxEnqueue', 'Zur Wunschliste')}
                    >
                      ➕
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {!playlistsLoading && playlists.length === 0 && !playlistsError && (
            <p className="mt-2 text-xs text-white/30">
              {tOr(t, 'mobile.mirrorJukeboxPlaylistsEmpty', 'Keine Playlists vorhanden.')}
            </p>
          )}
          {playlistsError && (
            <p className="mt-2 text-xs text-red-400/80">
              {tOr(t, 'mobile.mirrorJukeboxPlaylistsError', 'Playlists konnten nicht geladen werden.')}
            </p>
          )}
        </div>

        {/* Video-Link: in die Desktop-Jukebox-Warteschlange einreihen */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            {t('mobile.mirrorJukeboxVideoAdd')}
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              inputMode="url"
              value={videoLink}
              onChange={(e) => { setVideoLink(e.target.value); setVideoLinkError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVideoLinkSubmit(); }}
              placeholder={t('mobile.mirrorJukeboxVideoPlaceholder')}
              aria-label={t('mobile.mirrorJukeboxVideoAdd')}
              className={`flex-1 min-w-0 rounded-xl bg-white/10 border text-sm text-white placeholder:text-white/30 outline-none px-3 py-2.5 transition-colors ${
                videoLinkError
                  ? 'border-red-400/60 focus:border-red-400'
                  : videoLinkAdded
                    ? 'border-green-400/60 focus:border-green-400'
                    : 'border-white/10 focus:border-cyan-400/60'
              }`}
            />
            <button
              onClick={handleVideoLinkSubmit}
              disabled={!videoLink.trim()}
              className={`shrink-0 flex items-center justify-center rounded-xl px-4 text-sm font-medium active:scale-95 transition-all disabled:opacity-40 ${
                videoLinkAdded
                  ? 'bg-green-500/20 border border-green-400/40 text-green-300'
                  : 'bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300'
              }`}
              aria-label={t('mobile.mirrorJukeboxVideoButton')}
            >
              {videoLinkAdded ? '✓' : '➕'}
            </button>
          </div>
          {videoLinkError && (
            <p className="mt-1.5 text-xs text-red-400">{t('mobile.mirrorJukeboxVideoInvalid')}</p>
          )}
          {videoLinkAdded && (
            <p className="mt-1.5 text-xs text-green-400/80">{t('mobile.mirrorJukeboxVideoAdded')}</p>
          )}
          <p className="mt-1.5 text-[11px] text-white/30">{t('mobile.mirrorJukeboxVideoHint')}</p>
        </div>

        {/* Start / Stop */}
        <div className="flex gap-2">
          <button
            onClick={handleJukeboxStart}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            <span>{'📻'}</span>
            <span>{t('mobile.mirrorJukeboxStart')}</span>
            {jukeboxWishlist.length === 0 && (
              <span className="text-xs text-white/40 font-normal ml-1">(Random)</span>
            )}
          </button>
          <button
            onClick={() => sendCommand('jukebox_fullscreen')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-transform"
            title="Jukebox-Videofullscreen"
          >
            <span className="text-base">{'\u26F6'}</span>
          </button>
          <button
            onClick={() => sendCommand('jukebox_stop')}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
              'bg-red-500/10 border border-red-500/30 text-red-400 ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            <span>{'⏹'}</span>
          </button>
          {jukeboxWishlist.length > 0 && (
            <button
              onClick={() => sendCommand('jukebox_clear')}
              className={
                'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
                'bg-red-500/10 border border-red-500/30 text-red-400 ' +
                'active:scale-[0.97] transition-transform'
              }
            >
              <span>{'🗑'}</span>
            </button>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => sendCommand('jukebox_prev')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23EE'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxPrev')}</span>
          </button>
          <button
            onClick={() => sendCommand('jukebox_toggle_play')}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 active:scale-95 transition-transform ' +
              (isPlaying
                ? 'bg-yellow-500/15 border border-yellow-400/30 text-yellow-400'
                : 'bg-green-500/15 border border-green-400/30 text-green-400')
            }
          >
            <span className="text-base">{isPlaying ? '\u23F8' : '\u25B6'}</span>
            <span className="text-xs font-medium">{isPlaying ? t('mobile.mirrorJukeboxPause') : t('mobile.mirrorJukeboxPlay')}</span>
          </button>
          <button
            onClick={() => sendCommand('jukebox_next')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23ED'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxNext')}</span>
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => sendCommand('jukebox_volume_down')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F509}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxVolume')} -</span>
          </button>
          <button
            onClick={() => sendCommand('jukebox_volume_up')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F50A}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxVolume')} +</span>
          </button>
        </div>

        {/* Toggle Buttons: Shuffle / Repeat / Lyrics / Playlist */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleShuffle}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (shuffleActive
                ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{'\u{1F500}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxShuffle')}</span>
          </button>
          <button
            onClick={handleRepeat}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (repeatModeNow !== 'none'
                ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{repeatModeNow === 'one' ? '\u{1F502}' : '\u{1F501}'}</span>
            <span className="text-[10px] font-medium">{repeatLabel}</span>
          </button>
          <button
            onClick={handleLyricsToggle}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (lyricsOn
                ? 'bg-green-500/20 border border-green-400/40 text-green-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{'\u{1F4DC}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxLyrics')}</span>
          </button>
          <button
            onClick={() => sendCommand('jukebox_playlist_toggle')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 bg-white/5 border border-white/10 text-white/40 active:scale-95 transition-all"
          >
            <span className="text-base">{'\u{1F3BC}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxPlaylist')}</span>
          </button>
        </div>

        {/* Up Next / Wishlist Section */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            {t('mobile.mirrorJukeboxUpNext')}
          </h3>
          {jukeboxWishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-6">
              <span className="text-2xl">{'📻'}</span>
              <p className="text-xs text-white/30">
                {t('mobile.mirrorJukeboxNoWishlist')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {jukeboxWishlist.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    'flex items-center gap-3 rounded-xl p-3 ' +
                    'bg-white/5 border border-white/10'
                  }
                >
                  <div className="relative shrink-0">
                    <WishlistCover item={item} />
                    <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 border border-white/15 text-[10px] font-bold text-white/70">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.songTitle}</p>
                    <p className="truncate text-xs text-white/40">
                      {item.songArtist}
                      {item.addedBy ? (
                        <span className="text-white/30"> · {tOr(t, 'mobile.mirrorJukeboxRequestedBy', 'von')} {item.addedBy}</span>
                      ) : null}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className={
                      'shrink-0 rounded-lg px-2 py-1 text-xs font-medium ' +
                      'bg-red-500/15 text-red-400/80 ' +
                      'active:scale-95 transition-transform'
                    }
                  >
                    {'\u2715'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
}

MirrorJukeboxLite.displayName = 'MirrorJukeboxLite';
