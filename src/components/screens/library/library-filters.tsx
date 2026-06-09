'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LibrarySettings, LibraryViewMode, LibraryGroupBy } from './types';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/translations';

interface LibraryFiltersProps {
  searchQuery: string;
  setSearchQuery: (_query: string) => void;
  settings: LibrarySettings;
  setSettings: React.Dispatch<React.SetStateAction<LibrarySettings>>;
  viewMode: LibraryViewMode;
  groupBy: LibraryGroupBy;
  availableGenres: string[];
  availableLanguages: string[];
  availableYears: string[];
  onSetViewMode: (_mode: LibraryViewMode) => void;
  onSetGroupBy: (_groupBy: LibraryGroupBy) => void;
  onClearFolder: () => void;
  folderBreadcrumb: string[];
  onBreadcrumbClick: (_index: number) => void;
  getGroupDisplayName: (_key: string) => string;
  startMode: string;
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
  availableYears,
  onSetViewMode,
  onSetGroupBy,
  onClearFolder,
  folderBreadcrumb,
  onBreadcrumbClick,
  getGroupDisplayName,
  startMode,
  onResetStartMode,
}: LibraryFiltersProps) {
  const { t } = useTranslation();
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '32px',
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            id="song-search"
            name="song-search"
            placeholder={t('libraryFilters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
        
        <select
          value={`${settings.sortBy}-${settings.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [typeof settings.sortBy, typeof settings.sortOrder];
            setSettings(prev => ({ ...prev, sortBy, sortOrder }));
          }}
          className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          style={selectStyle}
        >
          <option value="title-asc" className="bg-gray-800 text-white">{t('libraryFilters.titleAZ')}</option>
          <option value="title-desc" className="bg-gray-800 text-white">{t('libraryFilters.titleZA')}</option>
          <option value="artist-asc" className="bg-gray-800 text-white">{t('libraryFilters.artistAZ')}</option>
          <option value="artist-desc" className="bg-gray-800 text-white">{t('libraryFilters.artistZA')}</option>
          <option value="dateAdded-desc" className="bg-gray-800 text-white">{t('libraryFilters.recentlyAdded')}</option>
        </select>
      </div>
      
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">{t('libraryFilters.genreLabel')}</span>
          <Select
            value={settings.filterGenre || 'all'}
            onValueChange={(value) => setSettings(prev => ({ ...prev, filterGenre: value }))}
          >
            <SelectTrigger className="w-[140px] h-8 bg-gray-800 border-white/20 text-white text-sm hover:border-purple-500/50 focus:border-purple-500 focus:ring-purple-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableGenres.map(g => (
                <SelectItem key={g} value={g}>{g === 'all' ? t('libraryFilters.allGenres') : g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">{t('libraryFilters.languageLabel')}</span>
          <Select
            value={settings.filterLanguage || 'all'}
            onValueChange={(value) => setSettings(prev => ({ ...prev, filterLanguage: value }))}
          >
            <SelectTrigger className="w-[140px] h-8 bg-gray-800 border-white/20 text-white text-sm hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-cyan-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map(l => (
                <SelectItem key={l} value={l}>{l === 'all' ? t('libraryFilters.allLanguages') : (LANGUAGE_NAMES[l as Language] || l)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm">{t('library.yearFilter')}</span>
          <Select
            value={settings.filterYear || 'all'}
            onValueChange={(value) => setSettings(prev => ({ ...prev, filterYear: value }))}
          >
            <SelectTrigger className="w-[120px] h-8 bg-gray-800 border-white/20 text-white text-sm hover:border-cyan-500/50 focus:border-cyan-500 focus:ring-cyan-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y}>{y === 'all' ? t('library.allYears') : y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <button
          onClick={() => {
            const newValue = !settings.filterDuet;
            setSettings(prev => ({ ...prev, filterDuet: newValue }));
            if (!newValue && startMode === 'duet') {
              onResetStartMode();
            }
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            settings.filterDuet || startMode === 'duet'
              ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50 hover:bg-pink-500/40' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>🎭</span>
          <span>{t('libraryFilters.duet')}</span>
        </button>
        
        <button
          onClick={() => {
            setSettings(prev => ({ ...prev, filterViral: !prev.filterViral }));
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            settings.filterViral
              ? 'bg-orange-500/30 text-orange-300 border border-orange-500/50 hover:bg-orange-500/40' 
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
          }`}
        >
          <span>&#128293;</span>
          <span>{t('libraryFilters.viralHits')}</span>
        </button>
        
        {(settings.filterGenre !== 'all' || settings.filterLanguage !== 'all' || settings.filterYear !== 'all' || settings.filterDuet || settings.filterViral || startMode === 'duet') && (
          <button
            onClick={() => {
              setSettings(prev => ({ ...prev, filterGenre: 'all', filterLanguage: 'all', filterYear: 'all', filterDuet: false, filterViral: false }));
              if (startMode === 'duet') {
                onResetStartMode();
              }
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {t('libraryFilters.clearFilters')}
          </button>
        )}
      </div>
      
      <div className="flex gap-2 items-center overflow-x-auto scrollbar-thin">
        <div className="flex bg-white/5 rounded-lg p-1">
          <button
            onClick={() => { onClearFolder(); onSetViewMode('grid'); onSetGroupBy('none'); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'grid' && groupBy === 'none' ? 'bg-cyan-500 text-white hover:bg-cyan-600' : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              {t('libraryFilters.grid')}
            </div>
          </button>
          <button
            onClick={() => onSetViewMode('playlists')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'playlists' ? 'bg-purple-500 text-white hover:bg-purple-600' : 'text-white/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              {t('libraryFilters.playlists')}
            </div>
          </button>
        </div>
        
        <span className="text-white/30">|</span>
        
        <span className="text-white/40 text-sm">{t('libraryFilters.groupBy')}</span>
        <div className="flex gap-1 flex-shrink-0">
          {[
            { value: 'artist', label: t('libraryFilters.groupArtistAZ'), icon: '🎤' },
            { value: 'title', label: t('libraryFilters.groupTitleAZ'), icon: '🎵' },
            { value: 'genre', label: t('libraryFilters.groupGenre'), icon: '🎸' },
            { value: 'language', label: t('libraryFilters.groupLanguage'), icon: '🌍' },
            { value: 'folder', label: t('libraryFilters.groupFolder'), icon: '📁' },
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
                  ? 'bg-purple-500 text-white hover:bg-purple-600' 
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {viewMode === 'folder' && folderBreadcrumb.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => onBreadcrumbClick(-1)}
            className="text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {t('libraryFilters.all')}
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
