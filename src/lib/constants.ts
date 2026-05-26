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
  'English', 'German', 'Spanish', 'French', 'Italian',
  'Portuguese', 'Japanese', 'Korean', 'Chinese', 'Russian',
  'Dutch', 'Polish', 'Turkish', 'Arabic', 'Swedish', 'Latin',
  'Norwegian', 'Danish', 'Finnish', 'Hindi', 'Thai', 'Indonesian',
] as const;
