// Shared constants for the karaoke app.
// Single source of truth for genre/language lists used across multiple components.

/** Genre suggestions shown in editor, new-song dialog, and filter dropdowns. */
export const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic', 'Dance',
  'Jazz', 'Blues', 'Soul', 'Funk', 'Reggae', 'Latin', 'Metal',
  'Punk', 'Indie', 'Folk', 'Classical', 'Soundtrack', 'Musical',
  'Schlager', 'Deutsch-Pop', 'Volksmusik', 'K-Pop', 'J-Pop',
] as const;

/** Language suggestions shown in editor and new-song dialog. */
export const LANGUAGES = [
  'Englisch', 'Deutsch', 'Spanisch', 'Französisch', 'Italienisch',
  'Portugiesisch', 'Japanisch', 'Koreanisch', 'Chinesisch', 'Russisch',
  'Niederländisch', 'Polnisch', 'Türkisch', 'Arabisch', 'Schwedisch', 'Latein',
] as const;
