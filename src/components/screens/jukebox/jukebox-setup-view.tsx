'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayIcon } from '@/components/icons';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from './jukebox-types';

/** Reusable chevron-down icon to replace inline SVGs (#21) */
function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function JukeboxSetupView({ j }: { j: UseJukeboxReturn }) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const { t } = useTranslation();

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl.trim()) return;
    const id = extractYouTubeId(youtubeUrl.trim());
    if (!id) {
      setYoutubeError(t('jukeboxPlayer.invalidYoutubeUrl'));
      return;
    }
    setYoutubeError('');
    setYoutubeUrl('');
    j.handleYoutubeUrlSubmit(youtubeUrl.trim());
  };

  // Chevron-down background image style for native selects (#21)
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '32px',
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('jukeboxPlayer.jukeboxMode')}</h1>
        <p className="text-white/60">{t('jukeboxPlayer.sitBackEnjoy')}</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Setup Screen — All settings in one unified Card (#7, #8 FIX: No duplicate controls) */}
      <div className="space-y-6">
        {/* Playlist Settings — Single source of truth for all filters */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('jukeboxPlayer.playlistSettings')}</CardTitle>
                <CardDescription>{t('jukeboxPlayer.customizeExperience')}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{j.filteredSongs.length}</p>
                <p className="text-white/60 text-sm">{t('jukeboxPlayer.songsAvailable')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Genre + Artist filters in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Genre Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">{t('jukeboxPlayer.filterByGenre')}</label>
                <select
                  value={j.filterGenre}
                  onChange={(e) => j.setFilterGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
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
                <label className="text-sm text-white/60 mb-2 block">{t('jukeboxPlayer.filterByArtist')}</label>
                <select
                  value={j.filterArtist}
                  onChange={(e) => j.setFilterArtist(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
                  style={selectStyle}
                >
                  <option value="" className="bg-gray-800 text-white">{t('jukeboxPlayer.allArtists')}</option>
                  {j.artists.map(artist => (
                    <option key={artist} value={artist} className="bg-gray-800 text-white">{artist}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Options row: Shuffle + Repeat */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={j.shuffle} onChange={(e) => j.setShuffle(e.target.checked)} className="w-4 h-4 accent-cyan-500" />
                <span className="text-white">{t('jukeboxPlayer.shuffle')}</span>
              </label>

              {(['none', 'all', 'one'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="repeat" checked={j.repeat === mode} onChange={() => j.setRepeat(mode)} className="w-4 h-4 accent-cyan-500" />
                  <span className="text-white">
                    {mode === 'none' ? t('jukeboxPlayer.noRepeat') : mode === 'all' ? t('jukeboxPlayer.repeatAll') : t('jukeboxPlayer.repeatOne')}
                  </span>
                </label>
              ))}
            </div>

          </CardContent>
        </Card>

        {/* YouTube URL Input */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>{t('jukeboxPlayer.youtubeVideo')}</CardTitle>
            <CardDescription>{t('jukeboxPlayer.youtubeVideoDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder={t('jukeboxPlayer.youtubeUrlPlaceholder')}
                value={youtubeUrl}
                onChange={(e) => { setYoutubeError(''); setYoutubeUrl(e.target.value); }}
                onKeyDown={(e) => e.key === 'Enter' && handleYoutubeSubmit()}
                className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <Button
                onClick={handleYoutubeSubmit}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              >
                {t('jukeboxPlayer.set')}
              </Button>
            </div>
            {youtubeError && <p className="text-red-400 text-sm">{youtubeError}</p>}
            {j.customYoutubeId && (
              <div className="flex items-center gap-2 text-cyan-400 text-sm">
                <span>{t('jukeboxPlayer.activeLabel').replace('{id}', j.customYoutubeId)}</span>
                <button
                  onClick={j.clearCustomYoutube}
                  className="text-white/60 hover:text-white underline"
                >
                  {t('jukeboxPlayer.remove')}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Button — #8 FIX: Only one start button */}
        <Button
          onClick={j.startJukebox}
          disabled={j.filteredSongs.length === 0}
          className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white disabled:opacity-50"
        >
          <PlayIcon className="w-6 h-6 mr-2" /> {t('jukeboxPlayer.startJukebox')}
        </Button>

        {j.filteredSongs.length === 0 && (
          <p className="text-center text-white/60">
            {t('jukeboxPlayer.noSongsMatchFilters')}
          </p>
        )}
      </div>
    </>
  );
}
