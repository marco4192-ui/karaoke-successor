// Shared constants for the karaoke app.
// Single source of truth for genre/language lists used across multiple components.

/**
 * Canonical genre list (user item 12 — Genre Harmonization).
 *
 * Curated to 23 well-known genres: enough musical distinction for meaningful
 * filters (Schlager/Volksmusik stay separate for the German karaoke audience),
 * small enough to keep dropdowns and the AI harmonization vocabulary tight.
 *
 * Removed vs. the old list:
 *  - 'Dance'      → subsumed by 'Electronic'
 *  - 'Deutsch-Pop'→ maps to 'Schlager' or 'Pop' (harmonization aliases)
 *  - 'Indie'      → fragments Pop/Rock (indie sub-genres normalize to parents)
 * Added: 'Children's' (family karaoke is a real use case).
 *
 * The AI harmonize prompt restricts suggestions to THIS list; any sub-genre
 * or "freak genre" from imports is mapped via meta-normalizer aliases.
 */
export const GENRES = [
  'Pop', 'Rock', 'Metal', 'Punk', 'Hip-Hop', 'R&B', 'Soul', 'Funk',
  'Jazz', 'Blues', 'Folk', 'Country', 'Electronic', 'Reggae', 'Latin',
  'Classical', 'Schlager', 'Volksmusik', 'Musical', 'Soundtrack',
  "Children's", 'K-Pop', 'J-Pop',
] as const;

/** Language suggestions shown in editor and new-song dialog. */
export const LANGUAGES = [
  'English', 'German', 'Spanish', 'French', 'Italian',
  'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian',
  'Dutch', 'Polish', 'Turkish', 'Arabic', 'Swedish', 'Latin',
  'Norwegian', 'Danish', 'Finnish', 'Hindi', 'Thai', 'Indonesian',
] as const;
