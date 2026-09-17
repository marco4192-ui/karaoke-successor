/**
 * Jukebox Playlist Browser (user item 8): a dialog that lists the EXISTING
 * library playlists, lets the user INSPECT each playlist's songs (expandable
 * per row) and add a whole playlist to the jukebox queue — or set it as the
 * active jukebox pool.
 *
 * Used by both the jukebox setup view and the running player view
 * (PoolSelector) so playlists are browsable everywhere the jukebox lives.
 */
'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getPlaylists } from '@/lib/playlist-manager';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import type { Song } from '@/types/game';
import { ListMusic, ChevronDown, ChevronRight, Plus, Disc3 } from 'lucide-react';

interface JukeboxPlaylistBrowserProps {
  /** The jukebox's loaded song list (title/artist lookup for the rows). */
  songs: Song[];
  /** Enqueue a whole playlist into the jukebox queue (shared hook action). */
  onEnqueue: (_playlistId: string) => Promise<boolean>;
  /** Optional: make the playlist the active jukebox pool (song source). */
  onSelectPool?: (_playlistId: string) => void;
  /** Currently active pool playlist (highlight). */
  activePlaylistId?: string;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
}

export function JukeboxPlaylistBrowser({
  songs,
  onEnqueue,
  onSelectPool,
  activePlaylistId,
  triggerClassName,
}: JukeboxPlaylistBrowserProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const playlists = useMemo(
    () => getPlaylists().filter(p => !p.isSystem),
    [open], // eslint-disable-line react-hooks/exhaustive-deps -- refresh on every dialog open
  );

  const songById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const s of songs) map.set(s.id, s);
    return map;
  }, [songs]);

  const handleEnqueue = async (playlistId: string) => {
    if (busyId) return;
    setBusyId(playlistId);
    try {
      const ok = await onEnqueue(playlistId);
      if (ok) {
        toast({
          title: `💿 ${t('jukeboxPlayer.browsePlaylistsQueuedToast')}`,
          description: playlists.find(p => p.id === playlistId)?.name,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white hover:border-cyan-400/40 ${triggerClassName ?? ''}`}
          title={t('jukeboxPlayer.browsePlaylists')}
          data-testid="jukebox-playlist-browser-trigger"
        >
          <ListMusic className="w-4 h-4 mr-1.5 text-cyan-400/80" />
          <span className="hidden sm:inline">{t('jukeboxPlayer.browsePlaylists')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900/95 border-white/15 max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-cyan-400" />
            {t('jukeboxPlayer.browsePlaylistsTitle')}
          </DialogTitle>
          <DialogDescription className="text-white/50 text-xs">
            {t('jukeboxPlayer.enqueuePlaylistDesc')}
          </DialogDescription>
        </DialogHeader>

        {playlists.length === 0 ? (
          <p className="text-sm text-white/50 py-6 text-center">
            {t('jukeboxPlayer.browsePlaylistsEmpty')}
          </p>
        ) : (
          <ScrollArea className="flex-1 min-h-0 max-h-[60vh] pr-2" data-testid="jukebox-playlist-browser-list">
            <div className="space-y-2">
              {playlists.map(pl => {
                const expanded = expandedId === pl.id;
                const isActive = activePlaylistId === pl.id;
                const plSongs = pl.songIds
                  .map(id => songById.get(id))
                  .filter((s): s is Song => !!s);
                return (
                  <div
                    key={pl.id}
                    className={`rounded-xl border transition-colors ${
                      isActive
                        ? 'border-cyan-400/40 bg-cyan-500/[0.07]'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    {/* ── Row header: expand toggle + actions ── */}
                    <div className="flex items-center gap-2 p-2.5">
                      <button
                        onClick={() => setExpandedId(expanded ? null : pl.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left group"
                        aria-expanded={expanded}
                        data-testid={`jukebox-playlist-row-${pl.name}`}
                      >
                        {expanded
                          ? <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />}
                        {pl.coverImage ? (
                          <img
                            src={pl.coverImage}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500/25 to-purple-500/25 flex items-center justify-center flex-shrink-0">
                            <Disc3 className="w-4 h-4 text-cyan-300/70" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-white/90 font-medium truncate group-hover:text-white">
                            {pl.name}
                            {isActive && (
                              <span className="ml-1.5 text-[10px] text-cyan-300">●</span>
                            )}
                          </span>
                          <span className="block text-[11px] text-white/40">
                            {t('jukeboxPlayer.browsePlaylistsSongs').replace('{count}', String(pl.songIds.length))}
                            {pl.description ? ` · ${pl.description}` : ''}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {onSelectPool && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isActive}
                            onClick={() => { onSelectPool(pl.id); }}
                            className="h-7 px-2 text-[11px] text-white/60 hover:text-white hover:bg-white/10"
                            title={t('jukeboxPlayer.browsePlaylistsSetPool')}
                          >
                            {isActive ? '●' : t('jukeboxPlayer.browsePlaylistsSetPool')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleEnqueue(pl.id)}
                          disabled={busyId === pl.id || pl.songIds.length === 0}
                          className="h-7 px-2.5 text-[11px] bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 hover:text-white disabled:opacity-40"
                          data-testid={`jukebox-playlist-enqueue-${pl.name}`}
                        >
                          {busyId === pl.id ? (
                            <span className="inline-block w-3 h-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 mr-1" />
                          )}
                          {t('jukeboxPlayer.browsePlaylistsQueue')}
                        </Button>
                      </div>
                    </div>

                    {/* ── Expanded: the playlist's songs ── */}
                    {expanded && (
                      <div className="px-3 pb-2.5 border-t border-white/[0.07] pt-2">
                        {plSongs.length === 0 ? (
                          <p className="text-[11px] text-white/40 py-1">
                            {t('jukeboxPlayer.searchNoMatches')}
                          </p>
                        ) : (
                          <ul className="space-y-0.5 max-h-44 overflow-y-auto">
                            {plSongs.map((s, i) => (
                              <li key={s.id} className="flex items-center gap-2 text-[11px] text-white/55">
                                <span className="text-white/25 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                                <span className="truncate flex-1">{s.title}</span>
                                <span className="text-white/30 truncate max-w-[40%]">{s.artist}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
