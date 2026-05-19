'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import type { SelectedPlayer } from './unified-party-setup.types';

// ===================== SONG VOTING MODAL =====================

export function SongVotingModal({ songs, onVote, onClose, gameColor }: {
  songs: Song[];
  players?: SelectedPlayer[];
  onVote: (_songId: string) => void;
  onClose: () => void;
  gameColor: string;
}) {
  const coverBlobUrlsRef = useRef<string[]>([]);

  // Restore cover URLs for voting songs (Tauri: relative paths, Browser: IndexedDB)
  const [enrichedSongs, setEnrichedSongs] = useState<Song[]>(songs);
  useEffect(() => {
    let cancelled = false;
    const restoreCovers = async () => {
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        const restored = await Promise.all(
          songs.map(async (s) => {
            if (s.coverImage) return s; // Already has cover
            // Try ensureSongUrls first (handles Tauri relative paths)
            try {
              const withUrls = await ensureSongUrls(s);
              if (withUrls.coverImage) return withUrls;
            } catch { /* continue fallback */ }
            // Fallback: check IndexedDB for stored media (browser mode)
            try {
              if (s.storedMedia) {
                const { getSongMediaUrls } = await import('@/lib/db/media-db');
                const urls = await getSongMediaUrls(s.id);
                if (urls.coverUrl) {
                  coverBlobUrlsRef.current.push(urls.coverUrl);
                  return { ...s, coverImage: urls.coverUrl };
                }
              }
            } catch { /* non-critical */ }
            // Fallback: try constructing cover from coverFile and folderPath
            if (s.coverFile && s.folderPath) {
              try {
                const { isTauri } = await import('@/lib/tauri-file-storage');
                if (isTauri()) {
                  const { convertFileSrc } = await import('@tauri-apps/api/core');
                  const path = s.baseFolder
                    ? `${s.baseFolder}/${s.folderPath}/${s.coverFile}`
                    : `${s.folderPath}/${s.coverFile}`;
                  const url = convertFileSrc(path);
                  return { ...s, coverImage: url };
                }
              } catch { /* non-critical */ }
            }
            return s;
          })
        );
        if (!cancelled) setEnrichedSongs(restored);
      } catch { /* non-critical */ }
    };
    restoreCovers();
    return () => {
      cancelled = true;
      coverBlobUrlsRef.current.forEach(url => { if (url.startsWith('blob:')) try { URL.revokeObjectURL(url); } catch { /* revoke may fail for already-revoked URLs */ } });
      coverBlobUrlsRef.current = [];
    };
  }, [songs]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-white/20 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">🎵 Choose a Song!</CardTitle>
          <Button variant="ghost" onClick={onClose} className="text-white/60">✕</Button>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 mb-6">Click on a song to start playing!</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {enrichedSongs.map((song, index) => (
              <div
                key={song.id}
                onClick={() => onVote(song.id)}
                className={`relative p-4 rounded-xl cursor-pointer transition-all hover:scale-105 bg-gradient-to-br ${gameColor} border-2 border-transparent hover:border-white/50`}
              >
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full aspect-square rounded-lg object-cover mb-3" />
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-black/20 flex items-center justify-center text-6xl mb-3">🎵</div>
                )}
                <h3 className="font-bold text-white truncate">{song.title}</h3>
                <p className="text-white/70 text-sm truncate">{song.artist}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
