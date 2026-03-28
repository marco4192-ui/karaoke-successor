'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import { LibraryViewMode, LibraryGroupBy } from '@/hooks/use-library-settings';

export interface LibraryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: 'title' | 'artist' | 'dateAdded' | 'difficulty' | 'rating';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'title' | 'artist' | 'dateAdded' | 'difficulty' | 'rating', sortOrder: 'asc' | 'desc') => void;
  filterGenre: string;
  onFilterGenreChange: (value: string) => void;
  filterLanguage: string;
  onFilterLanguageChange: (value: string) => void;
  filterDuet: boolean;
  onFilterDuetChange: (value: boolean) => void;
  viewMode: LibraryViewMode;
  groupBy: LibraryGroupBy;
  onViewModeChange: (mode: LibraryViewMode) => void;
  onGroupByChange: (groupBy: LibraryGroupBy) => void;
  availableGenres: string[];
  availableLanguages: string[];
  folderBreadcrumb: string[];
  onBreadcrumbClick: (index: number) => void;
  onClearFilters: () => void;
}

/**
 * LibraryFilters component
 * Contains search input, sort dropdown, genre/language/duet filters,
 * view mode toggle, group by options, and breadcrumb navigation.
 */
export function LibraryFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  filterGenre,
  onFilterGenreChange,
  filterLanguage,
  onFilterLanguageChange,
  filterDuet,
  onFilterDuetChange,
  viewMode,
  groupBy,
  onViewModeChange,
  onGroupByChange,
  availableGenres,
  availableLanguages,
  folderBreadcrumb,
  onBreadcrumbClick,
  onClearFilters,
}: LibraryFiltersProps) {
  const getGroupDisplayName = (key: string): string => {
    // This is used for breadcrumb display
    return LANGUAGE_NAMES[key] || key;
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        
        {/* Sort dropdown */}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
            onSortChange(newSortBy, newSortOrder);
          }}
          className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
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
        {/* Genre Filter - reads from #Genre: tag in txt files */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">🎸 Genre:</span>
          <select
            value={filterGenre || 'all'}
            onChange={(e) => onFilterGenreChange(e.target.value)}
            className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500 focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
          >
            {availableGenres.map(g => (
              <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
            ))}
          </select>
        </div>
        
        {/* Language Filter - reads from #Language: tag in txt files */}
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">🌍 Language:</span>
          <select
            value={filterLanguage || 'all'}
            onChange={(e) => onFilterLanguageChange(e.target.value)}
            className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
          >
            {availableLanguages.map(l => (
              <option key={l} value={l} className="bg-gray-800 text-white">{l === 'all' ? 'All Languages' : (LANGUAGE_NAMES[l] || l)}</option>
            ))}
          </select>
        </div>
        
        {/* Duet Filter Toggle - in same row as other filters */}
        <button
          onClick={() => onFilterDuetChange(!filterDuet)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filterDuet 
              ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🎭</span>
          <span>Duet</span>
        </button>
        
        {/* Active Filters Display */}
        {(filterGenre !== 'all' || filterLanguage !== 'all' || filterDuet) && (
          <button
            onClick={onClearFilters}
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
            onClick={() => { onViewModeChange('grid'); onGroupByChange('none'); }}
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
            onClick={() => onViewModeChange('playlists')}
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
                onViewModeChange('folder');
                onGroupByChange(option.value as LibraryGroupBy);
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
