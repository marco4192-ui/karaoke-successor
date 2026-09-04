'use client';

import { useState, useCallback } from 'react';
import type { Song, PlayerProfile } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

/** Per-song configuration for the queue */
interface SongConfig {
  songId: string;
  song: Song;
  gameMode: 'single' | 'duel' | 'duet';
  playerId: string;
  playerName: string;
  partnerId: string;
  partnerName: string;
}

interface PlaylistQueueConfigModalProps {
  show: boolean;
  onClose: (_open: boolean) => void;
  songs: Song[];
}

/** Chevron-down icon for native selects */
function ChevronDown() {
  return (
    <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Drag handle icon */
function DragHandleIcon() {
  return (
    <svg className="w-5 h-5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" />
      <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
      <circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
  );
}

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 8px center',
  backgroundSize: '16px',
  paddingRight: '32px',
};

export function PlaylistQueueConfigModal({
  show,
  onClose,
  songs,
}: PlaylistQueueConfigModalProps) {
  const { t } = useTranslation();
  const { profiles, activeProfileId, addToQueue } = useGameStore();

  const activeProfiles = profiles.filter(p => p.isActive !== false);

  // Default player: the active profile, or first active profile
  const defaultPlayer = activeProfiles.find(p => p.id === activeProfileId) || activeProfiles[0];

  // Initialize song configs from the songs list
  const [configs, setConfigs] = useState<SongConfig[]>(() =>
    songs.map(song => ({
      songId: song.id,
      song,
      gameMode: song.isDuet ? 'duet' : 'single',
      playerId: defaultPlayer?.id || '',
      playerName: defaultPlayer?.name || '',
      partnerId: '',
      partnerName: '',
    }))
  );

  // Reset configs when songs change (modal reopened with different playlist)
  const [lastSongHash, setLastSongHash] = useState('');
  const currentHash = songs.map(s => s.id).join(',');
  if (currentHash !== lastSongHash && show) {
    setLastSongHash(currentHash);
    setConfigs(songs.map(song => ({
      songId: song.id,
      song,
      gameMode: song.isDuet ? 'duet' : 'single',
      playerId: defaultPlayer?.id || '',
      playerName: defaultPlayer?.name || '',
      partnerId: '',
      partnerName: '',
    })));
  }

  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Update a single config
  const updateConfig = useCallback((index: number, updates: Partial<SongConfig>) => {
    setConfigs(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  }, []);

  // Move item (drag and drop)
  const moveItem = useCallback((from: number, to: number) => {
    if (from === to) return;
    setConfigs(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedIndex(null);
  }, []);

  // Add all configured songs to the queue
  const handleAddAll = () => {
    const { queue } = useGameStore.getState();
    for (const config of configs) {
      // Check max 3 per player
      const playerQueueCount = queue.filter(
        item => item.playerId === config.playerId || item.partnerId === config.playerId
      ).length;
      if (playerQueueCount >= 3) continue;

      const opts: { partnerId?: string; partnerName?: string; gameMode?: 'single' | 'duel' | 'duet' } = {
        gameMode: config.gameMode,
      };
      if (config.gameMode !== 'single' && config.partnerId) {
        opts.partnerId = config.partnerId;
        opts.partnerName = config.partnerName;
      }

      addToQueue(config.song, config.playerId, config.playerName, opts);
    }
    onClose(false);
  };

  // Count how many would be added (respecting max-3 rule)
  const countAddable = () => {
    const { queue } = useGameStore.getState();
    let count = 0;
    const perPlayer = new Map<string, number>();
    // Pre-populate existing queue counts
    for (const item of queue) {
      perPlayer.set(item.playerId, (perPlayer.get(item.playerId) || 0) + 1);
      if (item.partnerId) {
        perPlayer.set(item.partnerId, (perPlayer.get(item.partnerId) || 0) + 1);
      }
    }
    for (const config of configs) {
      const current = perPlayer.get(config.playerId) || 0;
      if (current >= 3) continue;
      perPlayer.set(config.playerId, current + 1);
      if (config.gameMode !== 'single' && config.partnerId) {
        const partnerCurrent = perPlayer.get(config.partnerId) || 0;
        if (partnerCurrent >= 3) continue;
        perPlayer.set(config.partnerId, partnerCurrent + 1);
      }
      count++;
    }
    return count;
  };

  if (!show || songs.length === 0) return null;

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-5xl w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('playlistQueueConfig.title')}</DialogTitle>
          <DialogDescription className="text-white/60">
            {t('playlistQueueConfig.desc')}
          </DialogDescription>
        </DialogHeader>

        {/* Song list with per-song config */}
        <div className="flex-1 overflow-y-auto py-2 space-y-1 min-h-0">
          {configs.map((config, index) => {
            const song = config.song;
            const isDuetSong = song.isDuet;
            const needsPartner = config.gameMode === 'duel' || config.gameMode === 'duet';

            return (
              <div
                key={config.songId}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 p-2 rounded-lg bg-white/5 border border-white/10 transition-opacity ${
                  draggedIndex === index ? 'opacity-40' : ''
                }`}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null && draggedIndex !== index) {
                    moveItem(draggedIndex, index);
                  }
                }}
                onDragEnd={() => setDraggedIndex(null)}
              >
                {/* Row 1: Drag + Position + Song info | Row 2 on mobile: Controls */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing flex-shrink-0">
                    <DragHandleIcon />
                  </div>

                  {/* Position */}
                  <span className="w-6 text-center text-white/40 text-sm flex-shrink-0">{index + 1}</span>

                  {/* Song info */}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{song.title}</div>
                    <div className="text-xs text-white/50 truncate">{song.artist}</div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center gap-2 flex-shrink-0 sm:flex-shrink-0 pl-8 sm:pl-0">

                {/* Game mode selector */}
                <div className="flex-shrink-0 w-24">
                  <select
                    value={config.gameMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'single' | 'duel' | 'duet';
                      const updates: Partial<SongConfig> = { gameMode: mode };
                      // If switching to single, clear partner
                      if (mode === 'single') {
                        updates.partnerId = '';
                        updates.partnerName = '';
                      }
                      // If duet song, force duet mode
                      if (isDuetSong && mode !== 'duet') {
                        return; // don't allow switching away from duet for duet songs
                      }
                      updateConfig(index, updates);
                    }}
                    disabled={isDuetSong}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white appearance-none cursor-pointer hover:border-cyan-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={selectStyle}
                  >
                    <option value="single" className="bg-gray-800 text-white">🎤 {t('playlistQueueConfig.single')}</option>
                    <option value="duel" className="bg-gray-800 text-white" disabled={isDuetSong}>⚔️ {t('playlistQueueConfig.duel')}</option>
                    <option value="duet" className="bg-gray-800 text-white">🎭 {t('playlistQueueConfig.duet')}</option>
                  </select>
                </div>

                {/* Player selector */}
                <div className="flex-shrink-0 w-28">
                  <select
                    value={config.playerId}
                    onChange={(e) => {
                      const profile = activeProfiles.find(p => p.id === e.target.value);
                      if (profile) {
                        updateConfig(index, { playerId: profile.id, playerName: profile.name });
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white appearance-none cursor-pointer hover:border-cyan-500/50"
                    style={selectStyle}
                  >
                    {activeProfiles.map(p => (
                      <option key={p.id} value={p.id} className="bg-gray-800 text-white">{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Partner selector (only for duel/duet) */}
                {needsPartner ? (
                  <div className="flex-shrink-0 w-28">
                    <select
                      value={config.partnerId}
                      onChange={(e) => {
                        const profile = activeProfiles.find(p => p.id === e.target.value);
                        if (profile) {
                          updateConfig(index, { partnerId: profile.id, partnerName: profile.name });
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white appearance-none cursor-pointer hover:border-cyan-500/50"
                      style={selectStyle}
                    >
                      <option value="" className="bg-gray-800 text-white">—</option>
                      {activeProfiles
                        .filter(p => p.id !== config.playerId)
                        .map(p => (
                          <option key={p.id} value={p.id} className="bg-gray-800 text-white">{p.name}</option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-28" />
                )}

                {/* Remove from list */}
                <button
                  onClick={() => setConfigs(prev => prev.filter((_, i) => i !== index))}
                  className="flex-shrink-0 p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title={t('playlistQueueConfig.remove')}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                </div>{/* end Controls row */}
              </div>
            );
          })}

          {configs.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <p>{t('playlistQueueConfig.empty')}</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 mt-2">
          <div className="text-sm text-white/50">
            {t('playlistQueueConfig.willAdd').replace('{count}', String(countAddable())).replace('{total}', String(configs.length))}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onClose(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              {t('playlistQueueConfig.cancel')}
            </Button>
            <Button
              onClick={handleAddAll}
              disabled={configs.length === 0 || countAddable() === 0}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t('playlistQueueConfig.addAll').replace('{count}', String(countAddable()))}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
