'use client';

// ===================== Library-Lite-Mirror — Filter-Hook =====================
//
// Genre-, Sprach-, Aera- und Viral-Filter-States der Mirror-Bibliothek
// (R27a-Auslagerung aus mirror-library-lite.tsx — States byte-identisch).

import { useState } from 'react';

export function useSongFilters() {
  const [genreFilter, setGenreFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  // Era/decade filter (decade start year, e.g. '1980') — for themed parties
  const [eraFilter, setEraFilter] = useState('all');
  const [filterViral, setFilterViral] = useState(false);

  return {
    genreFilter,
    setGenreFilter,
    languageFilter,
    setLanguageFilter,
    eraFilter,
    setEraFilter,
    filterViral,
    setFilterViral,
  };
}
