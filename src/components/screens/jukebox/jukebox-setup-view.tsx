'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayIcon, MusicIcon } from '@/components/icons';
import { Plus, ListPlus, Calendar, Video } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { getPlaylists } from '@/lib/playlist-manager';
import { decadeShortLabel } from '@/lib/game/era-filter';
import type { Song } from '@/types/game';
import type { UseJukeboxReturn } from './jukebox-types';
import { JukeboxPlaylistBrowser } from './jukebox-playlist-browser';
import { setJukeboxPool, useJukeboxPoolId } from './jukebox-pool';
import {
  isVideoBreak,
  parseVideoLinkInput,
  platformDisplayName,
  videoBreakPlatform,
} from './video-break';
import { EqualizerBars, VinylDisc, StatChip } from './jukebox-visuals';

// ==================== LOCAL ICONS ====================

function ListMusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15V6" /><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" />
    </svg>
  );
}

function GenreDiscIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
      <path d="M12 2a10 10 0 0 1 0 20" opacity="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MicVocalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

function CalendarRangeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="8" y2="17" /><line x1="12" y1="14" x2="12" y2="17" /><line x1="16" y1="14" x2="16" y2="17" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" />
      <path d="M15 15l6 6" /><path d="M4 4l5 5" />
    </svg>
  );
}

function RepeatIcon({ className, one }: { className?: string; one?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
      {one && (
        <text x="10.5" y="15" fontSize="9" fontWeight="bold" fill="currentColor" stroke="none" dominantBaseline="middle">1</text>
      )}
    </svg>
  );
}

function PlayBadgeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

// ==================== HELPERS ====================

/** Human label for total listening time of the filtered pool. */
function formatPoolDuration(ms: number): string {
  if (ms <= 0) return '–';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `~${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `~${hours} h ${rest} min` : `~${hours} h`;
}

/** Highlight the first case-insensitive occurrence of `query` inside `text`. */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-cyan-300 font-semibold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Platforms accepted by the video link field — mirrors the platforms that
 *  createVideoBreakSong()/isSupportedVideoLink() detect, plus direct video
 *  files (MP4/WebM/…). Proper names — no translation needed. */
const SUPPORTED_VIDEO_PLATFORMS = [
  'YouTube', 'Niconico', 'bilibili', 'VK Video', 'Vimeo', 'Dailymotion', 'Rutube', 'MP4/WebM',
];

// ==================== SETUP VIEW ====================

export function JukeboxSetupView({ j }: { j: UseJukeboxReturn }) {
  // All-round video link field: ONE or MANY links (one per line) — bare URLs,
  // complete iframe embed codes (e.g. VK), „URL | Titel" pipes and m3u
  // entries are all understood by parseVideoLinkInput().
  const [videoLinksInput, setVideoLinksInput] = useState('');
  const [videoLinksError, setVideoLinksError] = useState('');
  const [enqueueing, setEnqueueing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Search suggestion dropdown (local open state — Escape/outside click close)
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);
  const searchWrapperRef = useRef<HTMLDivElement | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  // Playlist-Auswahl fuer Jukebox — shared pool state, synced with the
  // running player (controls bar / fullscreen header) via the pool-changed event.
  const selectedPlaylistId = useJukeboxPoolId();
  const [playlistTick, setPlaylistTick] = useState(0);
  // Live refresh: playlists created/edited in the library or on a companion
  // dispatch 'karaoke-playlists-changed' — the pool select updates without
  // remounting the jukebox.
  useEffect(() => {
    const bump = () => setPlaylistTick(t => t + 1);
    window.addEventListener('karaoke-playlists-changed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('karaoke-playlists-changed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);
  const playlists = useMemo(() => {
    try {
      return getPlaylists().filter(p => !p.isSystem);
    } catch { return []; }
  }, [playlistTick, selectedPlaylistId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaylistSelect = (plId: string) => {
    setJukeboxPool(plId);
    setPlaylistTick(t => t + 1);
  };

  // ── Video-Links: EIN Feld für einen oder viele Links ──
  const parsedLinks = useMemo(() => parseVideoLinkInput(videoLinksInput), [videoLinksInput]);

  const handleVideoLinksSubmit = () => {
    if (!videoLinksInput.trim()) return;
    const links = parsedLinks;
    if (links.length === 0) {
      setVideoLinksError(t('jukeboxPlayer.videoLinkInvalid'));
      return;
    }
    setVideoLinksError('');
    if (links.length === 1) {
      // Single valid link → same flow as the former video link field
      const ok = j.addVideoToQueue(links[0].url, links[0].label);
      if (ok) {
        setVideoLinksInput('');
        toast({
          title: `🎬 ${t('jukeboxPlayer.videoLinkQueued')}`,
          description: t('jukeboxPlayer.videoLinkHint'),
        });
      }
      return;
    }
    // Multiple valid links → queue the whole list in order
    const queued = j.addVideoListToQueue(links);
    if (queued > 0) {
      setVideoLinksInput('');
      toast({
        title: `🎬 ${t('jukeboxPlayer.linkListQueued').replace('{n}', String(queued))}`,
        description: t('jukeboxPlayer.videoLinkHint'),
      });
    }
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setVideoLinksInput(prev => (prev ? `${prev.trim()}\n${text}` : text));
    };
    reader.readAsText(file);
  };

  // ── Search suggestions: add a single song / add all ──
  const handleAddSuggestion = async (song: Song) => {
    const ok = await j.addSongToQueue(song);
    if (ok) {
      toast({
        title: `🎵 ${t('jukeboxPlayer.addedToPlaylist')}`,
        description: `${song.title} — ${song.artist}`,
      });
    } else if (j.playlist.some(s => s.id === song.id)) {
      // Duplicate rejection (insertSongIntoQueue returns -1) — explicit
      // feedback instead of a silent no-op
      toast({
        title: `ℹ️ ${t('jukeboxPlayer.alreadyInPlaylist')}`,
        description: `${song.title} — ${song.artist}`,
      });
    }
  };

  const handleAddAllSuggestions = async () => {
    const songsToAdd = j.searchSuggestions.map(s => s.song);
    if (songsToAdd.length === 0) return;
    const queued = await j.addSongsToQueue(songsToAdd);
    if (queued > 0) {
      const preview = songsToAdd.slice(0, 3).map(s => s.title).join(' · ');
      toast({
        title: `🎵 ${t('jukeboxPlayer.addedNToPlaylist').replace('{n}', String(queued))}`,
        description: songsToAdd.length > 3 ? `${preview} …` : preview,
      });
    }
  };

  // Suggestion dropdown: close when clicking outside the search area
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Library-Playlist direkt in der Jukebox abspielen ──
  const handleEnqueuePlaylist = async () => {
    if (!selectedPlaylistId || enqueueing) return;
    setEnqueueing(true);
    try {
      const ok = await j.enqueueLibraryPlaylist(selectedPlaylistId);
      if (ok) {
        toast({
          title: `💿 ${t('jukeboxPlayer.playlistQueued')}`,
          description: playlists.find(p => p.id === selectedPlaylistId)?.name,
        });
      }
    } finally {
      setEnqueueing(false);
    }
  };

  // Bereits eingereihte Videos (nur die wartenden — das laufende steht im Player)
  const queuedVideos = useMemo(
    () => j.playlist.filter((s, idx) => isVideoBreak(s) && idx > j.currentIndex),
    [j.playlist, j.currentIndex]
  );

  // Hero data: cover for the vinyl + pool stats
  const heroCover = useMemo(
    () => j.filteredSongs.find(s => s.coverImage)?.coverImage ?? null,
    [j.filteredSongs]
  );
  const totalPoolMs = useMemo(
    () => j.filteredSongs.reduce((sum, s) => sum + (s.duration || 0), 0),
    [j.filteredSongs]
  );
  const genreCount = Math.max(0, j.genres.length - 1); // without the 'all' entry

  // Chevron-down background image style for native selects (#21)
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 10px center',
    backgroundSize: '16px',
    paddingRight: '34px',
  };

  const hasSongs = j.filteredSongs.length > 0;

  // Suggestion dropdown: visible while typing, with matches or a "no matches"
  // hint (from 2 chars on). Escape / clicking outside sets suggestionsOpen=false.
  const trimmedQuery = j.searchQuery.trim();
  const showSuggestions = suggestionsOpen
    && trimmedQuery !== ''
    && (j.searchSuggestions.length > 0 || trimmedQuery.length >= 2);

  return (
    <div className="relative">
      {/* ── Ambient background blobs ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="jukebox-blob-a absolute -top-24 -left-20 w-80 h-80 md:w-96 md:h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="jukebox-blob-b absolute top-1/4 -right-24 w-96 h-96 md:w-[28rem] md:h-[28rem] rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-fuchsia-500/5 blur-3xl" />
      </div>

      {/* ── Hero: Vinyl + Title + Stats ── */}
      <section className="mb-8 md:mb-10 flex flex-col sm:flex-row items-center sm:items-center gap-6 md:gap-8">
        <VinylDisc
          cover={heroCover}
          spinning={hasSongs}
          size={168}
          label={t('jukeboxPlayer.vinylLabel')}
        />
        <div className="flex-1 text-center sm:text-left min-w-0">
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <EqualizerBars active={hasSongs} label={t('jukeboxPlayer.equalizerLabel')} />
            <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.25)]">
              {t('jukeboxPlayer.jukeboxMode')}
            </h1>
          </div>
          <p className="text-white/60 mt-2 md:mt-3 max-w-xl mx-auto sm:mx-0">
            {t('jukeboxPlayer.heroTagline')}
          </p>
          <div className="flex flex-wrap gap-2.5 mt-4 md:mt-5 justify-center sm:justify-start">
            <StatChip
              icon={<MusicIcon className="w-4 h-4" />}
              value={j.filteredSongs.length}
              label={t('jukeboxPlayer.songsAvailable')}
            />
            <StatChip
              icon={<GenreDiscIcon className="w-4 h-4" />}
              value={genreCount}
              label={t('jukeboxPlayer.genresAvailable')}
              accent="text-purple-400"
            />
            <StatChip
              icon={<MicVocalIcon className="w-4 h-4" />}
              value={j.artists.length}
              label={t('jukeboxPlayer.artistsAvailable')}
              accent="text-fuchsia-400"
            />
            <StatChip
              icon={<ClockIcon className="w-4 h-4" />}
              value={formatPoolDuration(totalPoolMs)}
              label=""
              accent="text-amber-400"
            />
          </div>

          {/* Prominent "Playlists ansehen" entry — always visible in the
              jukebox menu (even with zero playlists), no library detour. */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5 justify-center sm:justify-start">
            <JukeboxPlaylistBrowser
              songs={j.songs}
              onEnqueue={j.enqueueLibraryPlaylist}
              onSelectPool={handlePlaylistSelect}
              activePlaylistId={selectedPlaylistId}
              triggerClassName="h-11 px-5 rounded-2xl text-sm bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/40 text-cyan-100 hover:from-cyan-500/30 hover:to-purple-500/30 hover:border-cyan-300/60 hover:text-white"
            />
          </div>
        </div>
      </section>

      {/* ── Search + fuzzy suggestion dropdown ── */}
      <div className="mb-6 group" ref={searchWrapperRef}>
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-cyan-400 transition-colors z-10 pointer-events-none"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <Input
            id="library-search"
            name="library-search"
            type="text"
            placeholder={t('jukeboxPlayer.searchPlaceholder')}
            value={j.searchQuery}
            onChange={(e) => { j.setSearchQuery(e.target.value); setSuggestionsOpen(true); }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSuggestionsOpen(false); }}
            role="combobox"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-controls="jukebox-search-suggestions"
            autoComplete="off"
            className="h-12 pl-12 pr-4 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500/60 focus-visible:shadow-[0_0_30px_rgba(34,211,238,0.12)] transition-all"
          />
          {showSuggestions && (
            <div
              id="jukebox-search-suggestions"
              className="absolute left-0 right-0 top-full mt-2 z-40 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {j.searchSuggestions.length === 0 ? (
                <p className="px-4 py-3 text-sm text-white/40" role="status">
                  {t('jukeboxPlayer.searchNoMatches')}
                </p>
              ) : (
                <>
                  <div
                    role="listbox"
                    aria-label={t('jukeboxPlayer.searchSuggestions')}
                    className="max-h-96 overflow-y-auto jukebox-queue-scroll py-1.5"
                  >
                    {j.searchSuggestions.map(({ song }) => (
                      <div
                        key={song.id}
                        role="option"
                        aria-selected={false}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <span className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                          {song.coverImage ? (
                            <img src={song.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <MusicIcon className="w-4 h-4 text-white/30" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/90 truncate">{highlightMatch(song.title, j.searchQuery)}</p>
                          <p className="text-xs text-white/45 truncate">
                            {song.artist}{song.year ? ` · ${song.year}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSuggestion(song)}
                          aria-label={t('jukeboxPlayer.addToPlaylist')}
                          title={t('jukeboxPlayer.addToPlaylist')}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-500/50 outline-none transition-colors shrink-0"
                        >
                          <Plus className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button
                      type="button"
                      onClick={handleAddAllSuggestions}
                      className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 focus-visible:ring-2 focus-visible:ring-purple-500/50 outline-none transition-colors"
                    >
                      <ListPlus className="w-4 h-4" aria-hidden />
                      {t('jukeboxPlayer.addAllToPlaylist').replace('{n}', String(j.searchSuggestions.length))}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Settings + YouTube cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Playlist Settings — Single source of truth for all filters (#7, #8 FIX: no duplicate controls) */}
        <Card className="lg:col-span-2 bg-white/[0.04] backdrop-blur-sm border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.05)] hover:border-white/20 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                  <ListMusicIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate">{t('jukeboxPlayer.playlistSettings')}</CardTitle>
                  <CardDescription className="truncate">{t('jukeboxPlayer.customizeExperience')}</CardDescription>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-3xl font-black tabular-nums ${hasSongs ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'text-white/30'}`}>
                  {j.filteredSongs.length}
                </p>
                <p className="text-white/50 text-xs">{t('jukeboxPlayer.songsAvailable')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Playlist-Auswahl + direkter Playlist-Start */}
            {playlists.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor="jukebox-playlist-select" className="text-sm text-white/60 flex items-center gap-1.5">
                    <ListMusicIcon className="w-3.5 h-3.5 text-cyan-400/70" />
                    {t('jukeboxPlayer.playlist')}
                  </label>
                  {/* Playlist-Browser (user item 8): bestehende Playlists
                      ansehen (inkl. Songs) und zur Jukebox hinzufügen. */}
                  <JukeboxPlaylistBrowser
                    songs={j.songs}
                    onEnqueue={j.enqueueLibraryPlaylist}
                    onSelectPool={handlePlaylistSelect}
                    activePlaylistId={selectedPlaylistId}
                    triggerClassName="h-7 px-2.5 text-[11px] rounded-lg"
                  />
                </div>
                <select
                  id="jukebox-playlist-select"
                  value={selectedPlaylistId}
                  onChange={(e) => handlePlaylistSelect(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/25 outline-none transition-all"
                  style={selectStyle}
                >
                  <option value="" className="bg-gray-800 text-white">{t('jukeboxPlayer.allSongs') || 'Alle Songs'}</option>
                  {playlists.map(pl => (
                    <option key={pl.id} value={pl.id} className="bg-gray-800 text-white">
                      {pl.name} ({pl.songIds.length} Songs)
                    </option>
                  ))}
                </select>
                {/* Playlist aus der Library direkt in der Jukebox abspielen */}
                <Button
                  onClick={handleEnqueuePlaylist}
                  disabled={!selectedPlaylistId || enqueueing}
                  className="mt-2 w-full bg-gradient-to-r from-purple-500/80 to-fuchsia-500/80 hover:from-purple-400 hover:to-fuchsia-400 text-white border border-purple-300/30 disabled:opacity-40"
                  title={t('jukeboxPlayer.enqueuePlaylistDesc')}
                >
                  <PlayBadgeIcon className="w-4 h-4 mr-2" />
                  {enqueueing ? t('jukeboxPlayer.startJukebox') + '…' : t('jukeboxPlayer.enqueuePlaylist')}
                </Button>
              </div>
            )}

            {/* Genre + Artist + Era filters in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Genre Filter */}
              <div>
                <label htmlFor="jukebox-genre-select" className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <GenreDiscIcon className="w-3.5 h-3.5 text-purple-400/70" />
                  {t('jukeboxPlayer.filterByGenre')}
                </label>
                <select
                  id="jukebox-genre-select"
                  value={j.filterGenre}
                  onChange={(e) => j.setFilterGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/25 outline-none transition-all"
                  style={selectStyle}
                >
                  {j.genres.map(genre => (
                    <option key={genre} value={genre} className="bg-gray-800 text-white">
                      {genre === 'all' ? t('jukeboxPlayer.allGenres') : genre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Artist Filter */}
              <div>
                <label htmlFor="jukebox-artist-select" className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <MicVocalIcon className="w-3.5 h-3.5 text-fuchsia-400/70" />
                  {t('jukeboxPlayer.filterByArtist')}
                </label>
                <select
                  id="jukebox-artist-select"
                  value={j.filterArtist}
                  onChange={(e) => j.setFilterArtist(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-fuchsia-500/50 focus:border-fuchsia-500/60 focus:ring-2 focus:ring-fuchsia-500/25 outline-none transition-all"
                  style={selectStyle}
                >
                  <option value="" className="bg-gray-800 text-white">{t('jukeboxPlayer.allArtists')}</option>
                  {j.artists.map(artist => (
                    <option key={artist} value={artist} className="bg-gray-800 text-white">{artist}</option>
                  ))}
                </select>
              </div>

              {/* Era (Decade) Filter — for themed parties ("Motto-Party") */}
              <div>
                <label htmlFor="jukebox-era-select" className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <CalendarRangeIcon className="w-3.5 h-3.5 text-cyan-400/70" />
                  {t('jukeboxPlayer.filterByEra')}
                </label>
                <select
                  id="jukebox-era-select"
                  value={j.filterEra}
                  onChange={(e) => j.setFilterEra(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/25 outline-none transition-all"
                  style={selectStyle}
                >
                  {j.eras.map(era => (
                    <option key={era} value={era} className="bg-gray-800 text-white">
                      {era === 'all'
                        ? t('jukeboxPlayer.allEras')
                        : t('library.eraOption').replace('{decade}', decadeShortLabel(Number(era)))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter — exact year (finer than the era/decade filter) */}
              <div>
                <label htmlFor="jukebox-year-select" className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400/70" aria-hidden />
                  {t('jukeboxPlayer.filterByYear')}
                </label>
                <select
                  id="jukebox-year-select"
                  value={j.filterYear}
                  onChange={(e) => j.setFilterYear(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer hover:border-amber-500/50 focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/25 outline-none transition-all"
                  style={selectStyle}
                >
                  {j.years.map(year => (
                    <option key={year} value={year} className="bg-gray-800 text-white">
                      {year === 'all' ? t('jukeboxPlayer.allYears') : year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Playback options: Shuffle + Repeat */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
              <label htmlFor="jukebox-shuffle" className="text-sm text-white/60 flex items-center gap-1.5">
                <ShuffleIcon className="w-3.5 h-3.5 text-cyan-400/70" />
                {t('jukeboxPlayer.shuffle')}
              </label>
              <button
                id="jukebox-shuffle"
                type="button"
                role="switch"
                aria-checked={j.shuffle}
                onClick={() => j.setShuffle(!j.shuffle)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                  j.shuffle
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.4)]'
                    : 'bg-white/10'
                }`}
                title={t('jukeboxPlayer.shuffle')}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                    j.shuffle ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Repeat: segmented icon control */}
              <div
                className="inline-flex items-center rounded-xl bg-white/5 border border-white/10 p-1 gap-1"
                role="radiogroup"
                aria-label={t('jukeboxA11y.repeat')}
              >
                {(['none', 'all', 'one'] as const).map(mode => {
                  const selected = j.repeat === mode;
                  const title = mode === 'none' ? t('jukeboxPlayer.noRepeat') : mode === 'all' ? t('jukeboxPlayer.repeatAll') : t('jukeboxPlayer.repeatOne');
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={title}
                      onClick={() => j.setRepeat(mode)}
                      className={`relative px-3.5 py-1.5 rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                        selected
                          ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white shadow-[0_0_14px_rgba(34,211,238,0.45)]'
                          : 'text-white/45 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {mode === 'one' ? (
                        <RepeatIcon className="w-[18px] h-[18px]" one />
                      ) : (
                        <RepeatIcon className={`w-[18px] h-[18px] ${selected ? '' : 'opacity-60'}`} />
                      )}
                      <span className="sr-only">{title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Video-Links: EIN Allround-Feld für einzelne Links, Listen und Dateien ── */}
        <Card className="bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-fuchsia-500/30 transition-colors">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-400/25 shrink-0">
                <Video className="w-5 h-5 text-fuchsia-300" aria-hidden />
              </span>
              <div className="min-w-0">
                <CardTitle className="truncate">{t('jukeboxPlayer.videoLinksTitle')}</CardTitle>
                <CardDescription>{t('jukeboxPlayer.videoLinksDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={videoLinksInput}
              onChange={(e) => { setVideoLinksError(''); setVideoLinksInput(e.target.value); }}
              placeholder={t('jukeboxPlayer.videoLinksPlaceholder')}
              aria-label={t('jukeboxPlayer.videoLinksTitle')}
              rows={3}
              className="min-h-[76px] bg-white/5 border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus-visible:ring-fuchsia-500/30 focus-visible:border-fuchsia-500/40 transition-all resize-y jukebox-queue-scroll"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleVideoLinksSubmit}
                disabled={!videoLinksInput.trim()}
                className="bg-gradient-to-r from-fuchsia-500/80 to-purple-500/80 hover:from-fuchsia-400 hover:to-purple-400 text-white border border-fuchsia-300/30 disabled:opacity-40"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden />
                {t('jukeboxPlayer.videoLinksAdd')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.text,.csv,.tsv,.m3u,.m3u8,.md,.markdown,.log,text/plain,text/csv"
                onChange={(e) => { handleFileUpload(e.target.files?.[0]); e.target.value = ''; }}
                className="hidden"
                aria-hidden
                tabIndex={-1}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-white/15 text-white/70 hover:bg-white/10 shrink-0"
                title={t('jukeboxPlayer.linkListFile')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="hidden sm:inline ml-2">{t('jukeboxPlayer.linkListFile')}</span>
              </Button>
              {videoLinksInput.trim() && (
                <span className={`text-xs ${parsedLinks.length > 0 ? 'text-fuchsia-300/70' : 'text-white/35'}`}>
                  {t('jukeboxPlayer.linkListParsed').replace('{n}', String(parsedLinks.length))}
                </span>
              )}
            </div>
            {videoLinksError && (
              <p className="text-red-400 text-sm" role="alert">{videoLinksError}</p>
            )}
            {/* Kurze Erklärung: unterstützte Plattformen + Hinweise */}
            <div className="space-y-1.5 pt-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-white/40 text-xs">{t('jukeboxPlayer.videoLinksSupported')}</span>
                {SUPPORTED_VIDEO_PLATFORMS.map(platform => (
                  <span
                    key={platform}
                    className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] text-white/55 whitespace-nowrap"
                  >
                    {platform}
                  </span>
                ))}
              </div>
              <p className="text-white/35 text-xs">
                {t('jukeboxPlayer.videoLinksSimpleHint')} {t('jukeboxPlayer.videoLinksVkNote')}
              </p>
              <p className="text-white/30 text-[11px]">{t('jukeboxPlayer.videoLinksFileTypes')}</p>
            </div>
            {/* Wartende Videos aus der laufenden Warteschlange */}
            {queuedVideos.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <p className="text-white/40 text-xs font-medium">{t('jukeboxPlayer.videoQueuedCount').replace('{n}', String(queuedVideos.length))}</p>
                <div className="max-h-40 overflow-y-auto jukebox-queue-scroll space-y-1 pr-1">
                  {queuedVideos.map(v => (
                    <div key={v.id} className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/5 px-2.5 py-1.5">
                      <PlayBadgeIcon className="w-3.5 h-3.5 text-fuchsia-400/80 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-xs text-white/70">{v.title}</span>
                      <span className="text-[10px] text-white/35 shrink-0">{platformDisplayName(videoBreakPlatform(v))}</span>
                      <button
                        onClick={() => j.removeQueueVideo(v.id)}
                        className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        aria-label={t('jukeboxPlayer.queueVideoRemove')}
                        title={t('jukeboxPlayer.queueVideoRemove')}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Start Button — #8 FIX: only one start button ── */}
      <div className="mt-8 space-y-3">
        <Button
          onClick={j.startJukebox}
          disabled={!hasSongs}
          className={`relative overflow-hidden w-full py-7 text-xl font-bold rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 hover:from-cyan-400 hover:via-cyan-300 hover:to-purple-400 text-white transition-all group ${
            hasSongs ? 'jukebox-start-glow hover:scale-[1.01] active:scale-[0.99]' : 'disabled:opacity-40'
          }`}
        >
          {hasSongs && (
            <span
              aria-hidden
              className="jukebox-shine absolute top-0 bottom-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
            />
          )}
          <PlayIcon className="w-7 h-7 mr-3 group-hover:scale-110 transition-transform" />
          {t('jukeboxPlayer.startJukebox')}
        </Button>

        {/* Readiness hint */}
        <div className="flex items-center justify-center gap-2 text-sm min-h-5">
          {hasSongs ? (
            <span className="text-cyan-300/80 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden />
              {t('jukeboxPlayer.startReady')}: {j.filteredSongs.length} {t('jukeboxPlayer.songsAvailable')} · {formatPoolDuration(totalPoolMs)}
            </span>
          ) : (
            <span className="text-white/50">{t('jukeboxPlayer.noSongsMatchFilters')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
