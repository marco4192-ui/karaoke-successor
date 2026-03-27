'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PlayIcon } from '@/components/icons';
import { Song } from '@/types/game';

export interface JukeboxSetupViewProps {
  // Filters
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  filterGenre: string;
  setFilterGenre: (value: string) => void;
  filterArtist: string;
  setFilterArtist: (value: string) => void;

  // Options
  shuffle: boolean;
  setShuffle: (value: boolean) => void;
  repeat: 'none' | 'all' | 'one';
  setRepeat: (value: 'none' | 'all' | 'one') => void;

  // Data
  genres: string[];
  artists: string[];
  filteredSongs: Song[];

  // Actions
  startJukebox: () => void;
}

export function JukeboxSetupView({
  searchQuery,
  setSearchQuery,
  filterGenre,
  setFilterGenre,
  filterArtist,
  setFilterArtist,
  shuffle,
  setShuffle,
  repeat,
  setRepeat,
  genres,
  artists,
  filteredSongs,
  startJukebox,
}: JukeboxSetupViewProps) {
  return (
    <div className="mb-6 space-y-6">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <Input
          id="library-search"
          name="library-search"
          type="text"
          placeholder="Search songs, artists, albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
          className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
        >
          {genres.map(g => (
            <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
          ))}
        </select>

        <select
          value={filterArtist}
          onChange={(e) => setFilterArtist(e.target.value)}
          className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
        >
          <option value="" className="bg-gray-800 text-white">All Artists</option>
          {artists.map(a => (
            <option key={a} value={a} className="bg-gray-800 text-white">{a}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`p-2 rounded-lg transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Song count and start button */}
      <div className="flex items-center justify-between">
        <p className="text-white/60">{filteredSongs.length} songs found</p>
        <Button
          onClick={startJukebox}
          disabled={filteredSongs.length === 0}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50"
        >
          <PlayIcon className="w-4 h-4 mr-2" /> Start Jukebox
        </Button>
      </div>

      {/* Playlist Settings Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Playlist Settings</CardTitle>
          <CardDescription>Customize your music experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Genre Filter */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Filter by Genre</label>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
            >
              {genres.map(genre => (
                <option key={genre} value={genre}>
                  {genre === 'all' ? 'All Genres' : genre}
                </option>
              ))}
            </select>
          </div>

          {/* Artist Filter */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Filter by Artist</label>
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
            >
              <option value="">All Artists</option>
              {artists.map(artist => (
                <option key={artist} value={artist}>{artist}</option>
              ))}
            </select>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-white">Shuffle</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="repeat"
                checked={repeat === 'none'}
                onChange={() => setRepeat('none')}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-white">No Repeat</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="repeat"
                checked={repeat === 'all'}
                onChange={() => setRepeat('all')}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-white">Repeat All</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="repeat"
                checked={repeat === 'one'}
                onChange={() => setRepeat('one')}
                className="w-4 h-4 accent-cyan-500"
              />
              <span className="text-white">Repeat One</span>
            </label>
          </div>

          {/* Song count */}
          <div className="text-center py-4 bg-white/5 rounded-lg">
            <p className="text-2xl font-bold text-cyan-400">{filteredSongs.length}</p>
            <p className="text-white/60 text-sm">songs available</p>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={startJukebox}
        disabled={filteredSongs.length === 0}
        className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white"
      >
        <PlayIcon className="w-6 h-6 mr-2" /> Start Jukebox
      </Button>

      {filteredSongs.length === 0 && (
        <p className="text-center text-white/60">
          No songs match your filters. Try different settings or import some songs.
        </p>
      )}
    </div>
  );
}
