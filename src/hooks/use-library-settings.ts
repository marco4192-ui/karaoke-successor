/**
 * Custom hook for managing library view settings
 * Handles sort, filter, and group preferences with localStorage persistence
 */
import { useState, useEffect, useCallback } from 'react';
import { Difficulty } from '@/types/game';
import { storage } from '@/lib/storage';

export type LibrarySortBy = 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
export type LibrarySortOrder = 'asc' | 'desc';
export type LibraryViewMode = 'grid' | 'folder' | 'playlists';
export type LibraryGroupBy = 'none' | 'artist' | 'genre' | 'language' | 'folder';

export interface LibrarySettings {
  sortBy: LibrarySortBy;
  sortOrder: LibrarySortOrder;
  filterDifficulty: Difficulty | 'all';
  filterGenre: string;
  filterLanguage: string;
  filterDuet: boolean;
}

export interface LibraryViewState {
  viewMode: LibraryViewMode;
  groupBy: LibraryGroupBy;
  currentFolder: string | null;
  folderBreadcrumb: string[];
}

const STORAGE_KEY = 'karaoke-library-settings';
const VIEW_STATE_KEY = 'karaoke-library-view-state';

const DEFAULT_SETTINGS: LibrarySettings = {
  sortBy: 'title',
  sortOrder: 'asc',
  filterDifficulty: 'all',
  filterGenre: 'all',
  filterLanguage: 'all',
  filterDuet: false,
};

const DEFAULT_VIEW_STATE: LibraryViewState = {
  viewMode: 'grid',
  groupBy: 'none',
  currentFolder: null,
  folderBreadcrumb: [],
};

export function useLibrarySettings() {
  const [settings, setSettings] = useState<LibrarySettings>(DEFAULT_SETTINGS);
  const [viewState, setViewState] = useState<LibraryViewState>(DEFAULT_VIEW_STATE);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = storage.get<LibrarySettings>(STORAGE_KEY);
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...savedSettings }));
      }

      const savedViewState = storage.get<LibraryViewState>(VIEW_STATE_KEY);
      if (savedViewState) {
        setViewState(prev => ({ ...prev, ...savedViewState }));
      }
    } catch (error) {
      // Use defaults if loading fails
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    storage.set(STORAGE_KEY, settings);
  }, [settings]);

  // Save view state when changed
  useEffect(() => {
    storage.set(VIEW_STATE_KEY, viewState);
  }, [viewState]);

  const updateSettings = useCallback((updates: Partial<LibrarySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateViewState = useCallback((updates: Partial<LibraryViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  }, []);

  const setViewMode = useCallback((mode: LibraryViewMode) => {
    updateViewState({ viewMode: mode, currentFolder: null, folderBreadcrumb: [] });
  }, [updateViewState]);

  const navigateToFolder = useCallback((folder: string, breadcrumb: string[]) => {
    updateViewState({ currentFolder: folder, folderBreadcrumb: breadcrumb });
  }, [updateViewState]);

  const exitFolder = useCallback(() => {
    updateViewState({ currentFolder: null, folderBreadcrumb: [] });
  }, [updateViewState]);

  return {
    settings,
    viewState,
    updateSettings,
    updateViewState,
    setViewMode,
    navigateToFolder,
    exitFolder,
    setSortBy: (sortBy: LibrarySortBy) => updateSettings({ sortBy }),
    setSortOrder: (sortOrder: LibrarySortOrder) => updateSettings({ sortOrder }),
    toggleSortOrder: () => updateSettings({ 
      sortOrder: settings.sortOrder === 'asc' ? 'desc' : 'asc' 
    }),
    setFilterDifficulty: (filterDifficulty: Difficulty | 'all') => updateSettings({ filterDifficulty }),
    setFilterGenre: (filterGenre: string) => updateSettings({ filterGenre }),
    setFilterLanguage: (filterLanguage: string) => updateSettings({ filterLanguage }),
    setFilterDuet: (filterDuet: boolean) => updateSettings({ filterDuet }),
    setGroupBy: (groupBy: LibraryGroupBy) => updateViewState({ groupBy }),
  };
}

export default useLibrarySettings;
