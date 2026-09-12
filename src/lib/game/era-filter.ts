// Era (decade) filter helpers — shared by the Library, the unified party
// setups, the Jukebox and the companion Library-Lite.
//
// An "era" value is the decade's START YEAR as a string (e.g. '1980' = the
// 80s, '2000' = the 2000s); 'all' (or ''/undefined) means no filter. Decade
// options are derived dynamically from the songs that are actually available,
// so a library containing a 1948 song automatically offers a '40s' entry —
// there is no hardcoded ceiling.
//
// Display labels are formatted via the i18n key `library.eraOption`
// (de: "{decade}er", en: "{decade}s") using the SHORT decade label
// (1980 → '80', 2000 → '2000') so the options read "80er"/"80s",
// "2000er"/"2000s", …

/** Minimal song shape needed for era filtering (avoids full Song dependency). */
export interface EraSongSubset {
  year?: number;
}

/** Start year of the decade a year belongs to (1985 → 1980, 2007 → 2000). */
export function decadeStartOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

/**
 * Short decade label passed to the i18n formatter:
 * 1980 → '80' ("80er"/"80s"), 2000 → '2000' ("2000er"/"2000s").
 */
export function decadeShortLabel(decadeStart: number): string {
  return decadeStart >= 2000 ? String(decadeStart) : String(decadeStart % 100);
}

/**
 * Era (decade) option values present in the given songs, sorted ascending —
 * e.g. ['1960', '1980', '2000', '2020']. WITHOUT an 'all' entry: callers
 * prepend their own "no filter" option following their UI pattern.
 * Songs without a usable year are ignored.
 */
export function getAvailableDecades(songs: EraSongSubset[]): string[] {
  const decades = new Set<number>();
  songs.forEach(s => {
    if (typeof s.year === 'number' && !isNaN(s.year) && s.year > 0) {
      decades.add(decadeStartOf(s.year));
    }
  });
  return Array.from(decades).sort((a, b) => a - b).map(String);
}

/**
 * True when the song's year falls into the era's decade range
 * ('1980' matches 1980-1989, '2000' matches 2000-2009, …).
 * 'all', '' and undefined disable the filter (always true); songs without
 * a year never match a concrete era.
 */
export function songMatchesEra(song: EraSongSubset, era?: string): boolean {
  if (!era || era === 'all') return true;
  const decade = parseInt(era, 10);
  if (isNaN(decade)) return true;
  if (typeof song.year !== 'number' || isNaN(song.year)) return false;
  return decadeStartOf(song.year) === decade;
}
