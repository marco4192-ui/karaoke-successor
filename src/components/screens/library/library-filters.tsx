'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { LibrarySettings, LibraryViewMode, LibraryGroupBy } from './types';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';

interface LibraryFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  settings: LibrarySettings;
  setSettings: React.Dispatch<React.SetStateAction<LibrarySettings>>;
  viewMode: LibraryViewMode;
  groupBy: LibraryGroupBy;
  availableGenres: string[];
  availableLanguages: string[];
  onSetViewMode: (mode: LibraryViewMode) => void;
  onSetGroupBy: (groupBy: LibraryGroupBy) => void;
  onClearFolder: () => void;
  folderBreadcrumb: string[];
  onBreadcrumbClick: (index: number) => void;
  getGroupDisplayName: (key: string) => string;
  /** Current game start mode (e.g. 'duel', 'duet', 'single') — affects filtering */
  startMode: string;
  /** Reset start mode back to 'single' (called when duet filter is explicitly removed) */
  onResetStartMode: () => void;
}

export function LibraryFilters({
  searchQuery,
  setSearchQuery,
  settings,
  setSettings,
  viewMode,
  groupBy,
  availableGenres,
  availableLanguages,
  onSetViewMode,
  onSetGroupBy,
  onClearFolder,
  folderBreadcrumb,
  onBreadcrumbClick,
  getGroupDisplayName,
  startMode,
  onResetStartMode,
}: LibraryFiltersProps) {
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '32px',
  };

  const smallSelectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 6px center',
    backgroundSize: '14px',
    paddingRight: '28px',
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Search Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            id="song-search"
            name="song-search"
            placeholder="Search songs, artists, or genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        
        {/* Sort dropdown */}
        <select
          value={`${settings.sortBy}-${settings.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [typeof settings.sortBy, typeof settings.sortOrder];
            setSettings(prev => ({ ...prev, sortBy, sortOrder }));
          }}
          className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          style={selectStyle}
        >
          <option value="title-asc" className="bg-gray-800 text-white">Title (A-Z)</option>
          <option value="title-desc" className="bg-gray-800 text-white">Title (Z-A)</option>
          <option value="artist-asc" className="bg-gray-800 text-white">Artist (A-Z)</option>
          <option value="artist-desc" className="bg-gray-800 text-white">Artist (Z-A)</option>
          <option value="dateAdded-desc" className="bg-gray-800 text-white">Recently Added</option>
        </select>
      </div>
      
      {/* Filter Row - Genre, Language, and Duet in same row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Genre Filter */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">🎸 Genre:</span>
          <select
            value={settings.filterGenre || 'all'}
            onChange={(e) => setSettings(prev => ({ ...prev, filterGenre: e.target.value }))}
            className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500 focus:outline-none"
            style={smallSelectStyle}
          >
            {availableGenres.map(g => (
              <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
            ))}
          </select>
        </div>
        
        {/* Language Filter */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">🌍 Language:</span>
          <select
            value={settings.filterLanguage || 'all'}
            onChange={(e) => setSettings(prev => ({ ...prev, filterLanguage: e.target.value }))}
            className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
            style={smallSelectStyle}
          >
            {availableLanguages.map(l => (
              <option key={l} value={l} className="bg-gray-800 text-white">{l === 'all' ? 'All Languages' : (LANGUAGE_NAMES[l] || l)}</option>
            ))}
          </select>
        </div>
        
        {/* Duet Filter Toggle */}
        <button
          onClick={() => {
            const newValue = !settings.filterDuet;
            setSettings(prev => ({ ...prev, filterDuet: newValue }));
            // When explicitly disabling duet filter, also reset startMode
            // so songs are no longer filtered by the duet game mode
            if (!newValue && startMode === 'duet') {
              onResetStartMode();
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            settings.filterDuet || startMode === 'duet'
              ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🎭</span>
          <span>Duet</span>
        </button>
        
        {/* Viral Hits Filter Toggle */}
        <button
          onClick={() => {
            setSettings(prev => ({ ...prev, filterViral: !prev.filterViral }));
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            settings.filterViral
              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>&#128293;</span>
          <span>Viral Hits</span>
        </button>
        
        {/* Active Filters Display */}
        {(settings.filterGenre !== 'all' || settings.filterLanguage !== 'all' || settings.filterDuet || settings.filterViral || startMode === 'duet') && (
          <button
            onClick={() => {
              setSettings(prev => ({ ...prev, filterGenre: 'all', filterLanguage: 'all', filterDuet: false, filterViral: false }));
              // Also reset startMode so duet game mode filter is cleared
              if (startMode === 'duet') {
                onResetStartMode();
              }
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            ✕ Clear filters
          </button>
        )}
      </div>
      
      {/* View Mode and Group By Options */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* View Mode Toggle */}
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { onClearFolder(); onSetViewMode('grid'); onSetGroupBy('none'); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'grid' && groupBy === 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Grid
            </div>
          </button>
          <button
            onClick={() => onSetViewMode('playlists')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'playlists' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              Playlists
            </div>
          </button>
        </div>
        
        <span className="text-white/30">|</span>
        
        {/* Group By Options */}
        <span className="text-white/40 text-sm">Group by:</span>
        <div className="flex flex-wrap gap-1">
          {[
            { value: 'artist', label: 'Artist A-Z', icon: '🎤' },
            { value: 'title', label: 'Title A-Z', icon: '🎵' },
            { value: 'genre', label: 'Genre', icon: '🎸' },
            { value: 'language', label: 'Language', icon: '🌍' },
            { value: 'folder', label: 'Folder', icon: '📁' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onClearFolder();
                onSetViewMode('folder');
                onSetGroupBy(option.value as LibraryGroupBy);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                groupBy === option.value && viewMode === 'folder' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Breadcrumb Navigation */}
      {viewMode === 'folder' && folderBreadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => onBreadcrumbClick(-1)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            All
          </button>
          {folderBreadcrumb.map((folder, index) => (
            <React.Fragment key={index}>
              <span className="text-white/30">/</span>
              <button
                onClick={() => onBreadcrumbClick(index)}
                className={`transition-colors ${
                  index === folderBreadcrumb.length - 1 
                    ? 'text-white font-medium' 
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                {getGroupDisplayName(folder)}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
