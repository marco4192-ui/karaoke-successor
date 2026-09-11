'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayIcon, MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { getPlaylists } from '@/lib/playlist-manager';
import { getJsonOptional, setJson } from '@/lib/storage';
import { StorageKeys } from '@/lib/storage';
import type { UseJukeboxReturn } from './jukebox-types';
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
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

// ==================== SETUP VIEW ====================

export function JukeboxSetupView({ j }: { j: UseJukeboxReturn }) {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [linkListText, setLinkListText] = useState('');
  const [enqueueing, setEnqueueing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();
  const { toast } = useToast();

  // Playlist-Auswahl fuer Jukebox
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const playlists = useMemo(() => {
    try {
      return getPlaylists().filter(p => !p.isSystem);
    } catch { return []; }
  }, [selectedPlaylistId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlaylistSelect = (plId: string) => {
    setSelectedPlaylistId(plId);
    if (!plId) {
      // "Alle Songs" - JUKEBOX_PLAYLIST loeschen
      try { localStorage.removeItem(StorageKeys.JUKEBOX_PLAYLIST); } catch { /* ignore */ }
    } else {
      const pl = playlists.find(p => p.id === plId);
      if (pl && pl.songIds.length > 0) {
        setJson(StorageKeys.JUKEBOX_PLAYLIST, pl.songIds);
      }
    }
  };

  // Aktive Playlist beim Mount erkennen
  useEffect(() => {
    const saved = getJsonOptional<string[]>(StorageKeys.JUKEBOX_PLAYLIST);
    if (saved && saved.length > 0) {
      // Versuche die Playlist anhand der Song-IDs zu finden
      try {
        const allPls = getPlaylists();
        const match = allPls.find(p => !p.isSystem && p.songIds.length > 0 &&
          saved.length === p.songIds.length &&
          saved.every((sid, idx) => sid === p.songIds[idx]));
        if (match) setSelectedPlaylistId(match.id);
      } catch { /* ignore */ }
    }
  }, []);

  // ── Video-Link: einzeln in die Warteschlange einreihen ──
  // Unterstützt auch die „URL | Titel"-Syntax der Link-Liste.
  const handleVideoSubmit = () => {
    const raw = videoUrl.trim();
    if (!raw) return;
    const link = parseVideoLinkInput(raw)[0];
    if (!link) {
      setVideoError(t('jukeboxPlayer.videoLinkInvalid'));
      return;
    }
    setVideoError('');
    setVideoUrl('');
    const ok = j.addVideoToQueue(link.url, link.label);
    if (ok) {
      toast({
        title: `🎬 ${t('jukeboxPlayer.videoLinkQueued')}`,
        description: t('jukeboxPlayer.videoLinkHint'),
      });
    }
  };

  // ── Link-Liste: mehrere Links nacheinander abspielen ──
  const parsedLinks = useMemo(() => parseVideoLinkInput(linkListText), [linkListText]);

  const handleLinkListSubmit = () => {
    if (parsedLinks.length === 0) return;
    const queued = j.addVideoListToQueue(parsedLinks);
    setLinkListText('');
    toast({
      title: `🎬 ${t('jukeboxPlayer.linkListQueued').replace('{n}', String(queued))}`,
      description: t('jukeboxPlayer.videoLinkHint'),
    });
  };

  const handleFileUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setLinkListText(prev => (prev ? `${prev.trim()}\n${text}` : text));
    };
    reader.readAsText(file);
  };

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
        </div>
      </section>

      {/* ── Search ── */}
      <div className="mb-6 group">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 group-focus-within:text-cyan-400 transition-colors"
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
            onChange={(e) => j.setSearchQuery(e.target.value)}
            className="h-12 pl-12 pr-4 rounded-2xl bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500/60 focus-visible:shadow-[0_0_30px_rgba(34,211,238,0.12)] transition-all"
          />
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
                <label htmlFor="jukebox-playlist-select" className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
                  <ListMusicIcon className="w-3.5 h-3.5 text-cyan-400/70" />
                  {t('jukeboxPlayer.playlist')}
                </label>
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

            {/* Genre + Artist filters in a grid */}
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

        {/* Video-Link + Link-Liste (rechte Spalte, gestapelt) */}
        <div className="flex flex-col gap-6">
          {/* ── Video-Link: einzelner Link mit Ton in die Warteschlange ── */}
          <Card className="bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-fuchsia-500/30 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-400/25 shrink-0">
                  <LinkIcon className="w-5 h-5 text-fuchsia-300" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate">{t('jukeboxPlayer.videoLinkTitle')}</CardTitle>
                  <CardDescription>{t('jukeboxPlayer.videoLinkDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1 group">
                  <Input
                    type="text"
                    inputMode="url"
                    placeholder={t('jukeboxPlayer.videoLinkPlaceholder')}
                    value={videoUrl}
                    onChange={(e) => { setVideoError(''); setVideoUrl(e.target.value); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVideoSubmit()}
                    aria-label={t('jukeboxPlayer.videoLinkTitle')}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-fuchsia-500/30 focus-visible:border-fuchsia-500/40 transition-all"
                  />
                </div>
                <Button
                  onClick={handleVideoSubmit}
                  variant="outline"
                  className="border-fuchsia-500/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200 shrink-0"
                >
                  {t('jukeboxPlayer.videoLinkAdd')}
                </Button>
              </div>
              <p className="text-white/35 text-xs">{t('jukeboxPlayer.videoLinkHint')}</p>
              {videoError && (
                <p className="text-red-400 text-sm" role="alert">{videoError}</p>
              )}
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

          {/* ── Link-Liste: viele Links nacheinander abspielen ── */}
          <Card className="bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-purple-500/30 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-400/25 shrink-0">
                  <ListIcon className="w-5 h-5 text-purple-300" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate">{t('jukeboxPlayer.linkListTitle')}</CardTitle>
                  <CardDescription>{t('jukeboxPlayer.linkListDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={linkListText}
                onChange={(e) => setLinkListText(e.target.value)}
                placeholder={t('jukeboxPlayer.linkListPlaceholder')}
                aria-label={t('jukeboxPlayer.linkListTitle')}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:ring-purple-500/30 focus:border-purple-500/40 outline-none transition-all resize-y jukebox-queue-scroll"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleLinkListSubmit}
                  disabled={parsedLinks.length === 0}
                  variant="outline"
                  className="flex-1 border-purple-500/50 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200 disabled:opacity-40"
                >
                  <PlayBadgeIcon className="w-4 h-4 mr-2" />
                  {t('jukeboxPlayer.linkListAdd')}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.m3u,.m3u8,.csv,.text,text/plain"
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
              </div>
              {linkListText && (
                <p className={`text-xs ${parsedLinks.length > 0 ? 'text-purple-300/70' : 'text-white/35'}`}>
                  {t('jukeboxPlayer.linkListParsed').replace('{n}', String(parsedLinks.length))}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
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
