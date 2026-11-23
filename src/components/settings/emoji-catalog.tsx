'use client';

// ─────────────────────────────────────────────────────────────────────────────
// EMOJI CATALOG — vollständige Referenz aller Emojis im Spiel (R94)
//
// Zweck: Der Nutzer möchte die bunten Chat-Icon-artigen Emojis (z.B. ⚔️, 👑,
// 🎤) durch eigene, handgemachte Grafiken ersetzen. Diese Datei listet JEDES
// im Spiel verwendete Emoji zusammen mit seiner Funktion — wo es steht und
// wofür es gedacht ist.
//
// Die Icon-Galerie (icon-gallery-dialog.tsx) rendert diesen Katalog im
// "Emojis"-Tab mit Suche und Kategorie-Filter.
//
// Pflege: Wenn ein neues Emoji eingebaut wird, hier einen Eintrag ergänzen.
// ─────────────────────────────────────────────────────────────────────────────

export type EmojiCategoryId =
  | 'modes' | 'ranks' | 'achievements' | 'daily' | 'players'
  | 'library' | 'media' | 'game' | 'editor' | 'status' | 'flags' | 'deco';

export interface EmojiCatalogEntry {
  /** Stabile ID (u.a. für Dateinamen der Ersatz-Grafiken). */
  id: string;
  /** Das Emoji selbst. */
  emoji: string;
  /** Kurzname / Bedeutung. */
  name: string;
  /** Kategorie für den Filter. */
  category: EmojiCategoryId;
  /** Funktion: Wo steht es, wofür ist es da? */
  desc: string;
  /** Spielflächen, auf denen es auftaucht (kurze Badges). */
  areas: string[];
}

export const EMOJI_CATEGORIES: { id: EmojiCategoryId | 'all'; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'modes', label: 'Spielmodi & Party' },
  { id: 'ranks', label: 'Ränge & Titel' },
  { id: 'achievements', label: 'Erfolge' },
  { id: 'daily', label: 'Daily & Weekly' },
  { id: 'players', label: 'Spieler, Geräte & Chat' },
  { id: 'library', label: 'Bibliothek & Genres' },
  { id: 'media', label: 'Wiedergabe & Medien' },
  { id: 'game', label: 'Gameplay & Punkte' },
  { id: 'editor', label: 'Editor & Metadaten' },
  { id: 'status', label: 'Status & System' },
  { id: 'flags', label: 'Sprach-Flaggen' },
  { id: 'deco', label: 'Deko & Tutorial' },
];

export const EMOJI_CATALOG: EmojiCatalogEntry[] = [
  // ═══════════════ SPIELMODI & PARTY ═══════════════
  {
    id: 'duel', emoji: '⚔️', name: 'Gekreuzte Schwerter', category: 'modes',
    desc: 'Duell-Modus (1 gegen 1): Startkarten-Übersicht, Song-Start-Dialog „Herausfordern", Partymodus-Liste. Im Battle Royale zusätzlich das amberfarbene Stechen-Banner (Showdown bei Gleichstand) und die Duell-Karte im Ergebnis-Screen. Auch Chat-Herausforderung.',
    areas: ['Start', 'Song-Start', 'Party', 'Battle Royale', 'Chat'],
  },
  {
    id: 'duet', emoji: '🎭', name: 'Masken', category: 'modes',
    desc: 'Duett-Modus (zwei Spieler zusammen): Startkarte, Song-Start-Dialog, Playlist-Konfiguration. Kennzeichnet im Ergebnis-Screen den Blind-Modus. Auch Genre „Oper" und diverse Erfolge/Challenges (s. dort).',
    areas: ['Start', 'Song-Start', 'Party', 'Ergebnis'],
  },
  {
    id: 'solo-mic', emoji: '🎤', name: 'Mikrofon', category: 'modes',
    desc: 'Solo-Modus & Gesang allgemein: Spieler-Label („🎤 {Name}"), Songtext-Tab, Solo-Karte auf dem Startbildschirm. Außerdem überall dort, wo „am Gerät gesungen wird" — Battle-Royale-Spielerliste, Medley, Erfolge. Das häufigste Emoji im Spiel (158 Vorkommen).',
    areas: ['Start', 'HUD', 'Party', 'Battle Royale', 'Medley'],
  },
  {
    id: 'companion', emoji: '📱', name: 'Smartphone', category: 'modes',
    desc: 'Companion-App (Handy als Mikrofon/Controller): Gesangsgerät-Auswahl im Party-Setup, Spieler-Badge in Battle Royale/Turnier/Medley, Chat-Kennzeichnung „Mitspieler schreibt vom Handy". 106 Vorkommen.',
    areas: ['Party-Setup', 'Battle Royale', 'Turnier', 'Chat'],
  },
  {
    id: 'battle-royale', emoji: '👑', name: 'Krone', category: 'modes',
    desc: 'Battle-Royale-Modus: Party-Setup-Titel „👑 Battle Royale", große Krone im Sieger-Screen, Grand-Finale-Runde. Klein daneben: Anführer-Badge (gelbe Mini-Krone neben den Punkten des Besten). Auch Rang „Legend" und diverse Erfolge (s. dort).',
    areas: ['Party', 'Battle Royale', 'Sieger', 'Ränge'],
  },
  {
    id: 'medley', emoji: '🎵', name: 'Musiknote', category: 'modes',
    desc: 'Medley-Modus & Musik allgemein: Song-Auswahl-Kachel, „Original-Song"-Label, Lautstärke-Regler, Jukebox-Modus, Song-Zähler im Battle Royale. Zweithäufigstes Emoji (100 Vorkommen).',
    areas: ['Song-Auswahl', 'Party', 'Jukebox', 'Battle Royale'],
  },
  {
    id: 'blind', emoji: '🙈', name: 'Affe mit Deckaugen', category: 'modes',
    desc: 'Blind-Modus (ganze Passagen verschwinden): Startkarte, Modus-Warnbanner beim Singen, „Blind Audition"-Challenge.',
    areas: ['Start', 'HUD', 'Daily'],
  },
  {
    id: 'missing-words', emoji: '📝', name: 'Notizblock', category: 'modes',
    desc: 'Modus „Fehlende Wörter" (Wörter/Zeilen verschwinden): Startkarte, Warnbanner, Modus-Übersicht.',
    areas: ['Start', 'HUD', 'Party'],
  },
  {
    id: 'rate-my-song', emoji: '⭐', name: 'Stern', category: 'modes',
    desc: '„Rate my Song"-Modus (singen & gegenseitig bewerten): Startkachel, „Singen & Bewerten"-Button, Favoriten-Filter, Bewertung „gut (7-8)", diverse Erfolge. Der Stern ist das Universal-Symbol für Favoriten/Bewertung.',
    areas: ['Start', 'Bewertung', 'Bibliothek', 'Erfolge'],
  },
  {
    id: 'vote', emoji: '🗳️', name: 'Wahlurne', category: 'modes',
    desc: 'Song-Auswahl per Abstimmung: Einrichtung („3 Songs, alle stimmen ab"), Battle-Royale-Voting-Ansicht, Turnier-Song-Vote-Overlay, „Stimmt für den nächsten Song".',
    areas: ['Song-Auswahl', 'Battle Royale', 'Turnier'],
  },
  {
    id: 'random', emoji: '🎲', name: 'Würfel', category: 'modes',
    desc: 'Zufälliger Song: Auswahlmethode im Party-Setup, Turnier-Seeding „Zufällig", Song-Beschreibung „Lasst das Spiel entscheiden".',
    areas: ['Song-Auswahl', 'Turnier'],
  },
  {
    id: 'from-library', emoji: '📚', name: 'Bücher', category: 'modes',
    desc: 'Song-Auswahl „Aus Bibliothek" (eigene Sammlung durchsuchen). Auch Erfolgs-Icon für 250 gesungene Songs.',
    areas: ['Song-Auswahl', 'Erfolge'],
  },
  {
    id: 'coop-handshake', emoji: '🤝', name: 'Händedruck', category: 'modes',
    desc: 'Koop-Wettsingen-Modus, „Unentschieden!"-Ergebnis beim Duell, Team-Bewertung (Durchschnitt), Medley-Team-Gleichstand, Erfolge „Duett-Harmonie".',
    areas: ['Wettsingen', 'Duell', 'Medley', 'Erfolge'],
  },
  {
    id: 'elimination', emoji: '💀', name: 'Totenkopf', category: 'modes',
    desc: 'Eliminierung: Battle-Royale-HUD-Karte (rote Runde läuft ab), „Elimination"-Modus-Wahl, Medley-Ausscheiden, Schwierigkeitsgrad „Insane" der Daily Challenge, Chat-Schnellreaktion, Titel „Whispering Wimp" (< 5 Punkte).',
    areas: ['Battle Royale', 'Medley', 'Daily', 'Chat', 'Titel'],
  },
  {
    id: 'coinflip', emoji: '🪙', name: 'Münze', category: 'modes',
    desc: 'Münzwurf-Eliminierung im Battle Royale (bei exaktem Gleichstand entscheidet der Zufall) — amberfarbene HUD-Variante und Sieger-Badge.',
    areas: ['Battle Royale'],
  },
  {
    id: 'mystery', emoji: '🎰', name: 'Spielautomat', category: 'modes',
    desc: 'Mystery-Song im Medley: unbekannter Song-Slot mit „???"-Titel vor der Enthüllung.',
    areas: ['Medley'],
  },
  {
    id: 'shuffle', emoji: '🔀', name: 'Kreuzende Pfeile', category: 'modes',
    desc: 'Zufall: „Teams mischen" (Medley/Turnier), Jukebox-Shuffle, Weekly-Challenge „Double Trouble".',
    areas: ['Medley', 'Turnier', 'Jukebox', 'Weekly'],
  },
  {
    id: 'ffa', emoji: '🎮', name: 'Controller', category: 'modes',
    desc: "„Jeder gegen Jeden“ (FFA): Party-Beschreibungstexte, „So funktioniert's“, Modus-Übersicht, Erfolge „5/20 Spiele“. Auch Kennzeichnung für vom Desktop gestartete Games.",
    areas: ['Party', 'Hilfe', 'Erfolge', 'Historie'],
  },
  {
    id: 'group', emoji: '👥', name: 'Zwei Personen', category: 'modes',
    desc: '„Gesamt"-Spielerzähler im Party-Setup, FFA-Beschreibung (4 Spieler), Wettsingen-Duett-Wahl, Daily „Band-Songs", Erfolge (50 Duette).',
    areas: ['Party-Setup', 'Wettsingen', 'Daily', 'Erfolge'],
  },
  {
    id: 'stage', emoji: '💃', name: 'Tänzerin', category: 'modes',
    desc: '„Bühnen-Pflicht"-Challenge im Rate-my-Song-Modus (Performance/Tanz einbringen), Genre „Dance".',
    areas: ['Rate my Song', 'Bibliothek'],
  },
  {
    id: 'endless', emoji: '♾️', name: 'Unendlich', category: 'modes',
    desc: 'Endlos-Wiederholung in der Playlist-/Queue-Konfiguration (Song läuft in Schleife).',
    areas: ['Playlist'],
  },

  // ═══════════════ RÄNGE & TITEL ═══════════════
  {
    id: 'gold', emoji: '🥇', name: 'Goldmedaille', category: 'ranks',
    desc: 'Platz 1: Podiumsanzeigen (Battle Royale, Turnier, Wettsingen), Daily-Gold-Badge, „Podium Finish"-Badge, Erfolge (5000 Gold-Notes).',
    areas: ['Ergebnis', 'Battle Royale', 'Turnier', 'Daily', 'Erfolge'],
  },
  {
    id: 'silver', emoji: '🥈', name: 'Silbermedaille', category: 'ranks',
    desc: 'Platz 2: Podiumsanzeigen, Daily-Silber-Badge.',
    areas: ['Ergebnis', 'Daily'],
  },
  {
    id: 'bronze', emoji: '🥉', name: 'Bronzemedaille', category: 'ranks',
    desc: 'Platz 3: Podiumsanzeigen, Daily-Bronze-Badge.',
    areas: ['Ergebnis', 'Daily'],
  },
  {
    id: 'trophy', emoji: '🏆', name: 'Pokal', category: 'ranks',
    desc: 'Sieg & Highscore überall: Sieger-Dialog (groß, 4xl), Hall of Fame, „S1/S2 gewinnt!", Grand-Finale-Runde, Weekly-Gold-Badge, diverse Erfolge. 104 Vorkommen.',
    areas: ['Ergebnis', 'Highscores', 'Erfolge', 'Battle Royale'],
  },
  {
    id: 'medal', emoji: '🏅', name: 'Medaille (Sport)', category: 'ranks',
    desc: 'MVP-Award (Medley), All-Time-Highscore, Weekly-Silber, „Daily Champion"-Badge, Erfolge.',
    areas: ['Medley', 'Daily', 'Erfolge'],
  },
  {
    id: 'badge-ribbon', emoji: '🎖️', name: 'Ordensband', category: 'ranks',
    desc: 'Abzeichen-Bereiche: Erfolgs-Tab (Handy), „Deine Abzeichen", Weekly-Bronze, Erfolge (500 Songs, Level 50).',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'reminder-ribbon', emoji: '🎗️', name: 'Rosette', category: 'ranks',
    desc: 'Bronze-Wochenbadge der Daily Challenge, Erfolge „Level 50".',
    areas: ['Daily', 'Erfolge'],
  },
  {
    id: 'diamond', emoji: '💎', name: 'Diamant', category: 'ranks',
    desc: 'Rang „Icon" (50.000+ XP), Titel „Diamond Voice" (80+ Punkte), „Perfektionist"- und „Perfect Song"-Challenges, Erfolge (Perfektion-Serien).',
    areas: ['Ränge', 'Titel', 'Daily', 'Erfolge'],
  },
  {
    id: 'crystal-ball', emoji: '🔮', name: 'Kristallkugel', category: 'ranks',
    desc: 'Rang „Mythic" (100.000+ XP), „Perfect Prophet"-Challenge, Daily „Prism"-Challenges.',
    areas: ['Ränge', 'Daily'],
  },
  {
    id: 'glowing-star', emoji: '🌟', name: 'Leuchtstern', category: 'ranks',
    desc: 'Ränge „Apprentice"/„Superstar"/„Divine", Titel „Vocal Virtuoso" (90+), Top-Bewertung (9-10 Punkte), „Golden Hunter"-Challenge, K-Pop-Genre, diverse Erfolge/Badges.',
    areas: ['Ränge', 'Titel', 'Bewertung', 'Daily', 'Bibliothek'],
  },
  {
    id: 'sparkles', emoji: '✨', name: 'Funkeln', category: 'ranks',
    desc: 'Rang „Performer", Highlights-Überschrift (Medley), Perfekte-Note-Score-Event, „Neu"-Badge der Party, Gold-Notes-Challenges, Erfolge.',
    areas: ['Ränge', 'Medley', 'Gameplay', 'Erfolge'],
  },
  {
    id: 'dizzy', emoji: '💫', name: 'Sternschwindel', category: 'ranks',
    desc: 'Rang „Singer", Medley-Highlights, Erfolge (Gold-Serien), „Speed Demon+"-Challenge, Daily „Nova"-Challenges.',
    areas: ['Ränge', 'Medley', 'Daily', 'Erfolge'],
  },
  {
    id: 'shooting-star', emoji: '🌠', name: 'Sternschnuppe', category: 'ranks',
    desc: 'Daily-Challenges „Accuracy Zenith", „Perfect Aurora", „Virtuoso Accuracy".',
    areas: ['Daily'],
  },
  {
    id: 'heart-1', emoji: '❤️', name: 'Rotes Herz', category: 'ranks',
    desc: 'Turnier „Fan-Lieblinge"-Platz 1 (Publikumsfavorit), Herz-Schnellreaktion, Teilnahme-Overlay (Handy).',
    areas: ['Turnier', 'Chat', 'Handy'],
  },
  {
    id: 'heart-2', emoji: '🧡', name: 'Oranges Herz', category: 'ranks',
    desc: 'Turnier „Fan-Lieblinge"-Platz 2.',
    areas: ['Turnier'],
  },
  {
    id: 'heart-3', emoji: '💛', name: 'Gelbes Herz', category: 'ranks',
    desc: 'Turnier „Fan-Lieblinge"-Platz 3.',
    areas: ['Turnier'],
  },
  {
    id: 'rank-beginner', emoji: '🎵', name: 'Note (Rang Beginner)', category: 'ranks',
    desc: 'XP-Rang „Beginner" (0-499 XP) auf der Profil-Karte und im Start-Dialog.',
    areas: ['Profil', 'Ränge'],
  },
  {
    id: 'rank-novice', emoji: '🎤', name: 'Mikro (Rang Novice)', category: 'ranks',
    desc: 'XP-Rang „Novice" (500-1.499 XP).',
    areas: ['Profil', 'Ränge'],
  },
  {
    id: 'rank-star', emoji: '⭐', name: 'Stern (Rang Star)', category: 'ranks',
    desc: 'XP-Rang „Star" (12.000-17.999 XP); Stern allgemein für Favoriten & Bewertungen (s. ⭐-Modus-Eintrag).',
    areas: ['Profil', 'Ränge'],
  },
  {
    id: 'thumbs-up', emoji: '👍', name: 'Daumen hoch', category: 'ranks',
    desc: 'Bewertung „okay" (5-6 Punkte) in Rate-my-Song-Ergebnissen.',
    areas: ['Bewertung'],
  },
  {
    id: 'neutral', emoji: '😐', name: 'Neutraler Smiley', category: 'ranks',
    desc: 'Bewertung „mäßige 3-4 Punkte" in Rate-my-Song-Ergebnissen.',
    areas: ['Bewertung'],
  },
  {
    id: 'broken-heart', emoji: '💔', name: 'Gebrochenes Herz', category: 'ranks',
    desc: 'Bewertung „schlecht" (1-2 Punkte), Partymodus-Option „Schlechtesten eliminieren".',
    areas: ['Bewertung', 'Party'],
  },
  {
    id: 'hundred', emoji: '💯', name: '100-Punkte-Symbol', category: 'ranks',
    desc: 'Erfolge „100 Perfekte/100 Spiele", Schwierigkeitsgrad-Anzeige auf der Social-Scorecard.',
    areas: ['Erfolge', 'Social'],
  },
  {
    id: 'chart-up', emoji: '📈', name: 'Steigende Kurve', category: 'ranks',
    desc: 'Erfolg „Level 25", Battle-Royale-Hinweis „steigende Schwierigkeit".',
    areas: ['Erfolge', 'Battle Royale'],
  },
  {
    id: 'chart-down', emoji: '📉', name: 'Fallende Kurve', category: 'ranks',
    desc: 'Battle-Royale-Beschreibung „der Spieler mit der niedrigsten Punktzahl scheidet aus".',
    areas: ['Party'],
  },

  // ═══════════════ ERFOLGE (achievements.ts) ═══════════════
  {
    id: 'ach-fire', emoji: '🔥', name: 'Feuer', category: 'achievements',
    desc: 'Combo-Anzeige im HUD (🔥{Combo}), „Meistgespielt"-Filter, Comeback ×1.5 (Medley), Erfolge (Combo Master, Streaks, Ultimate Challenge), Daily „Ember/Phoenix/Forge"-Challenges.',
    areas: ['HUD', 'Bibliothek', 'Medley', 'Erfolge', 'Daily'],
  },
  {
    id: 'lightning', emoji: '⚡', name: 'Blitz', category: 'achievements',
    desc: 'Combo-Rang 2 (Turnier), Cache-Kennzeichnung (Editor), Synergie-Bonus +300 (Medley), „Niedrige Perf."-Modus, „Speed Demon"-Challenge, Erfolge (Speed Demon, Streak Month, Lightning Lips), Daily „Spark/Storm-Tick"-Challenges.',
    areas: ['HUD', 'Editor', 'Medley', 'Daily', 'Erfolge'],
  },
  {
    id: 'target', emoji: '🎯', name: 'Zielscheibe', category: 'achievements',
    desc: 'Challenges/„Short Mode" (Turnier 60s-Matches), Übe-Panel, Erfolge (Genauigkeits-Stufen, „20 Spiele"), Daily „Accuracy"-Challenges, „Ziel"-Anzeige der Tages-Challenge.',
    areas: ['Daily', 'Turnier', 'Gameplay', 'Erfolge'],
  },
  {
    id: 'ach-notes', emoji: '🎶', name: 'Noten (mehrfach)', category: 'achievements',
    desc: 'Standard-Genre-Icon (Fallback), „10 Songs"-Erfolg, „Notes Hit"-Challenges, Mitsing-Modi-Tutorial.',
    areas: ['Bibliothek', 'Erfolge', 'Daily'],
  },
  {
    id: 'circus-tent', emoji: '🎪', name: 'Zirkuszelt', category: 'achievements',
    desc: 'Genre „Schlager", „50 Songs"-Erfolg, Titel „Circus Singer" (60 Punkte), Rate-my-Song-Challenge „Supermarkt-Sänger".',
    areas: ['Bibliothek', 'Titel', 'Rate my Song'],
  },
  {
    id: 'party-popper', emoji: '🎉', name: 'Konfettikanone', category: 'achievements',
    desc: '„Party Time"-Erfolg, neuer Erfolgs-Freischalt-Dialog, Tages-Slots geschafft, Chat-Schnellreaktion.',
    areas: ['Erfolge', 'Daily', 'Chat'],
  },
  {
    id: 'confetti-ball', emoji: '🎊', name: 'Konfettiball', category: 'achievements',
    desc: 'Erfolg „10 Partys".',
    areas: ['Erfolge'],
  },
  {
    id: 'partying-face', emoji: '🥳', name: 'Party-Gesicht', category: 'achievements',
    desc: 'Erfolg „25 Partys".',
    areas: ['Erfolge'],
  },
  {
    id: 'champagne', emoji: '🍾', name: 'Sektflasche', category: 'achievements',
    desc: 'Erfolg „50 Partys".',
    areas: ['Erfolge'],
  },
  {
    id: 'studio-mic', emoji: '🎙️', name: 'Studiomikrofon', category: 'achievements',
    desc: 'Genre „Rap", „Pass the Mic"-Erfolg, Mikrofon-Status „inaktiv" (Handy).',
    areas: ['Bibliothek', 'Erfolge', 'Handy'],
  },
  {
    id: 'shower', emoji: '🚿', name: 'Dusche', category: 'achievements',
    desc: 'Erfolg „Duschen-Sänger", Titel „Shower Singing Sensation" (100 Punkte).',
    areas: ['Erfolge', 'Titel'],
  },
  {
    id: 'superhero', emoji: '🦸', name: 'Superheld', category: 'achievements',
    desc: 'Erfolg „Comeback King" (Rückstand aufgeholt).',
    areas: ['Erfolge'],
  },
  {
    id: 'castle', emoji: '🏰', name: 'Schloss', category: 'achievements',
    desc: 'Erfolg „Disney-Fan" (Disney-Songs gesungen).',
    areas: ['Erfolge'],
  },
  {
    id: 'carousel', emoji: '🎠', name: 'Karussell', category: 'achievements',
    desc: 'Erfolg „25 Disney-Songs".',
    areas: ['Erfolge'],
  },
  {
    id: 'fairy', emoji: '🧚', name: 'Fee', category: 'achievements',
    desc: 'Erfolg „50 Disney-Songs".',
    areas: ['Erfolge'],
  },
  {
    id: 'owl', emoji: '🦉', name: 'Eule', category: 'achievements',
    desc: 'Erfolg „Nachteule" (spät gesungen).',
    areas: ['Erfolge'],
  },
  {
    id: 'bird', emoji: '🐦', name: 'Vogel', category: 'achievements',
    desc: 'Erfolg „Frühaufsteher" (morgens gesungen).',
    areas: ['Erfolge'],
  },
  {
    id: 'runner', emoji: '🏃', name: 'Läufer', category: 'achievements',
    desc: 'Erfolg „Marathon-Sänger", Daily „Endurance/Sprinter", Weekly „Marathon Notes".',
    areas: ['Erfolge', 'Daily', 'Weekly'],
  },
  {
    id: 'moai', emoji: '🗿', name: 'Moai', category: 'achievements',
    desc: 'Erfolge „Combo 300", „Score Titan", „Note Legend"; Daily „Titan Notes"; Weekly „Combo Colossus".',
    areas: ['Erfolge', 'Daily', 'Weekly'],
  },
  {
    id: 'volcano', emoji: '🌋', name: 'Vulkan', category: 'achievements',
    desc: 'Erfolg „Combo 500", Daily „Phoenix Score/Score Volcano".',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'tornado', emoji: '🌪️', name: 'Tornado', category: 'achievements',
    desc: 'Erfolg „150 Perfekte", Titel „Vocal Tornado (Disaster)" (25 Punkte), Daily „Combo Tornado".',
    areas: ['Erfolge', 'Titel', 'Daily'],
  },
  {
    id: 'piano', emoji: '🎹', name: 'Klavier', category: 'achievements',
    desc: 'Erfolg „40 Gold-Notes", Editor-Startsymbor (Noten-Editor).',
    areas: ['Erfolge', 'Editor'],
  },
  {
    id: 'robot', emoji: '🤖', name: 'Roboter', category: 'achievements',
    desc: 'Voice-Effekt „Roboter", Erfolg „500 Perfekte", KI-Kennzeichnungen.',
    areas: ['Voice-FX', 'Erfolge'],
  },
  {
    id: 'gear', emoji: '⚙️', name: 'Zahnrad', category: 'achievements',
    desc: 'Erfolg „1000 Perfekte", Einstellungen (Handy-Tab, UltraStar-Standard), System-Playlist-Kennzeichnung (Jukebox), Party-Spiel-Einstellungen.',
    areas: ['Erfolge', 'Einstellungen', 'Jukebox', 'Party'],
  },
  {
    id: 'mountain', emoji: '🏔️', name: 'Berg (schneebedeckt)', category: 'achievements',
    desc: 'Erfolg „5000 Perfekte", Daily „Combo Avalanche".',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'milky-way', emoji: '🌌', name: 'Milchstraße', category: 'achievements',
    desc: 'Erfolg „10.000 Perfekte", Daily „Perfect Galaxy", Weekly „Nebula"-Challenges.',
    areas: ['Erfolge', 'Daily', 'Weekly'],
  },
  {
    id: 'sheaf', emoji: '🌾', name: 'ÄhrenGarbe', category: 'achievements',
    desc: 'Erfolg „250 Gold-Notes".',
    areas: ['Erfolge'],
  },
  {
    id: 'rain', emoji: '🌧️', name: 'Regen', category: 'achievements',
    desc: 'Erfolg „1000 Gold-Notes".',
    areas: ['Erfolge'],
  },
  {
    id: 'joystick', emoji: '🕹️', name: 'Joystick', category: 'achievements',
    desc: 'Erfolg „50 Spiele".',
    areas: ['Erfolge'],
  },
  {
    id: 'ferris', emoji: '🎡', name: 'Riesenrad', category: 'achievements',
    desc: 'Erfolg „250 Spiele".',
    areas: ['Erfolge'],
  },
  {
    id: 'rocket', emoji: '🚀', name: 'Rakete', category: 'achievements',
    desc: 'Erfolg „500 Spiele", Daily „Combo Race/Virtuoso Combo".',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'fireworks', emoji: '🎆', name: 'Feuerwerk', category: 'achievements',
    desc: 'Erfolg „365-Tage-Streak".',
    areas: ['Erfolge'],
  },
  {
    id: 'blue-book', emoji: '📘', name: 'Blaues Buch', category: 'achievements',
    desc: 'Erfolg „15 Weekly-Challenges", „Note Adept"-Challenge.',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'green-book', emoji: '📗', name: 'Grünes Buch', category: 'achievements',
    desc: '„Note Apprentice"-Challenge (mittlerer Noten-Fortschritt).',
    areas: ['Daily'],
  },
  {
    id: 'red-book', emoji: '📕', name: 'Rotes Buch', category: 'achievements',
    desc: '„Note Virtuoso"-Challenge (hoher Noten-Fortschritt).',
    areas: ['Daily'],
  },
  {
    id: 'classical', emoji: '🏛️', name: 'Antiker Tempel', category: 'achievements',
    desc: 'Erfolg „30 Weekly-Challenges".',
    areas: ['Erfolge'],
  },
  {
    id: 'twins', emoji: '👯', name: 'Zwillinge mit Ohrringen', category: 'achievements',
    desc: 'Erfolg „25 Duette".',
    areas: ['Erfolge'],
  },
  {
    id: 'couple', emoji: '👫', name: 'Pärchen', category: 'achievements',
    desc: 'Erfolg „50 Duette", Daily „Duo Day", Weekly „Duo Week".',
    areas: ['Erfolge', 'Daily', 'Weekly'],
  },
  {
    id: 'revolving-hearts', emoji: '💞', name: 'Kreisende Herzen', category: 'achievements',
    desc: 'Erfolg „100 Duette".',
    areas: ['Erfolge'],
  },
  {
    id: 'fencer', emoji: '🤺', name: 'Fechter', category: 'achievements',
    desc: 'Erfolg „5 Duelle".',
    areas: ['Erfolge'],
  },
  {
    id: 'martial-arts', emoji: '🥋', name: 'Kampfsportanzug', category: 'achievements',
    desc: 'Erfolg „10 Duelle", „Score Sensei"-Challenge.',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'dragon', emoji: '🐉', name: 'Drache', category: 'achievements',
    desc: 'Erfolg „25 Duelle".',
    areas: ['Erfolge'],
  },
  {
    id: 'globe', emoji: '🌍', name: 'Globus (Europa/Afrika)', category: 'achievements',
    desc: 'Erfolg „Genre-Entdecker" (8 Genres), „Alle Länder" (Länderwahl), Sprach-Gruppierung in der Bibliothek, „Globetrotter"-Challenges, „Sprache"-Filter.',
    areas: ['Erfolge', 'Profil', 'Bibliothek', 'Daily'],
  },
  {
    id: 'compass', emoji: '🧭', name: 'Kompass', category: 'achievements',
    desc: 'Erfolg „10 Genres", „Perfect Pilgrim"-Challenge, Daily „Accuracy Navigator".',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'world-map', emoji: '🗺️', name: 'Weltkarte', category: 'achievements',
    desc: 'Erfolg „10 Genres" (Genre-Entdecker-Stufe 2).',
    areas: ['Erfolge'],
  },
  {
    id: 'soap', emoji: '🧼', name: 'Seife', category: 'achievements',
    desc: 'Erfolg „Saubere Sache", „Clean Cut"-Challenge, Daily „Clean Song", Weekly „Clean Peak".',
    areas: ['Erfolge', 'Daily', 'Weekly'],
  },
  {
    id: 'sponge', emoji: '🧽', name: 'Schwamm', category: 'achievements',
    desc: '„Spotless"-Challenge (makellos).',
    areas: ['Daily'],
  },
  {
    id: 'hospital', emoji: '🏥', name: 'Krankenhaus', category: 'achievements',
    desc: '„Surgical Precision"-Challenge, Weekly „Surgical".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'mirror-ach', emoji: '🪞', name: 'Handspiegel', category: 'achievements',
    desc: '„Flawless Mirror"-Challenge (makellose Note), Spiegel-Modus der Webcam, Handy-Spiegel-Bereiche.',
    areas: ['Daily', 'Einstellungen', 'Handy'],
  },
  {
    id: 'palm', emoji: '🌴', name: 'Palme', category: 'achievements',
    desc: 'Erfolg „Wochenend-Sänger", Genre „Latin".',
    areas: ['Erfolge', 'Bibliothek'],
  },
  {
    id: 'sandwich', emoji: '🥪', name: 'Sandwich', category: 'achievements',
    desc: 'Erfolg „Mittagspause" (mittags gesungen).',
    areas: ['Erfolge'],
  },
  {
    id: 'microscope', emoji: '🔬', name: 'Mikroskop', category: 'achievements',
    desc: 'Erfolg „98 % Genauigkeit".',
    areas: ['Erfolge'],
  },
  {
    id: 'violin', emoji: '🎻', name: 'Geige', category: 'achievements',
    desc: 'Erfolg „98 % Genauigkeit" (höchste Genauigkeitsstufe), Genre „Klassik".',
    areas: ['Erfolge', 'Bibliothek'],
  },
  {
    id: 'gem-stone', emoji: '💠', name: 'Diamant-Form (hellblau)', category: 'achievements',
    desc: 'Erfolg „75 Perfekte", „Perfect Path"-Challenge, Daily „Prism Score/Tick Quartz".',
    areas: ['Erfolge', 'Daily'],
  },
  {
    id: 'desert-island', emoji: '🏜️', name: 'Wüste', category: 'achievements',
    desc: 'Daily „Accuracy Mirage".',
    areas: ['Daily'],
  },
  {
    id: 'hourglass-ach', emoji: '⏳', name: 'Sanduhr', category: 'achievements',
    desc: 'Erfolg „500 Daily Challenges", „Warten"-Badge (Party), „Warte auf Gegner" (Chat-Duell), Reset-Countdown (Start), Daily „Long Ballad", Weekly „Long Songs".',
    areas: ['Erfolge', 'Party', 'Chat', 'Start', 'Daily'],
  },
  {
    id: 'alarm', emoji: '⏰', name: 'Wecker', category: 'achievements',
    desc: 'Erfolg „100-Tage-Streak".',
    areas: ['Erfolge'],
  },
  {
    id: 'spiral-calendar', emoji: '🗓️', name: 'Spiralkalender', category: 'achievements',
    desc: 'Erfolge „Daily Regular", „180-Tage-Streak".',
    areas: ['Erfolge'],
  },
  {
    id: 'tear-off-calendar', emoji: '📆', name: 'Abreißkalender', category: 'achievements',
    desc: 'Erfolge „Weekly Warrior", „52 Weeklys".',
    areas: ['Erfolge'],
  },
  {
    id: 'calendar', emoji: '📅', name: 'Kalender', category: 'achievements',
    desc: 'Erfolg „Daily Starter", Jahr-/Ära-Filter (Bibliothek), „Kein Jahr"-Metadatum, Turnier-Ära-Anzeige, Medley-Beschreibung.',
    areas: ['Erfolge', 'Bibliothek', 'Editor', 'Turnier'],
  },
  {
    id: 'repeat-ach', emoji: '🔁', name: 'Wiederholen (Pfeile)', category: 'achievements',
    desc: 'Erfolg „250 Dailys", Profil-Sync-Refresh, Jukebox „Alle wiederholen".',
    areas: ['Erfolge', 'Profil', 'Jukebox'],
  },
  {
    id: 'shield-ach', emoji: '🛡️', name: 'Schild', category: 'achievements',
    desc: 'Erfolge „60-Tage-Streak", „Note Legend", „Extreme"-Challenges; Tauri-Desktop-App-Kennzeichnung (Sync-Tab).',
    areas: ['Erfolge', 'Daily', 'Einstellungen'],
  },

  // ═══════════════ RATE MY SONG & CHALLENGES ═══════════════
  {
    id: 'rms-masks', emoji: '🎭', name: 'Masken (Rate my Song)', category: 'achievements',
    desc: 'Rate-my-Song-Challenges „Akzent" und „Oper-Stil", „Blind Master"-Challenge.',
    areas: ['Rate my Song', 'Daily'],
  },
  {
    id: 'rms-mute', emoji: '🔇', name: 'Lautlos', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Stille Minute", Urheberrechtshinweis „Video-Shorts ohne Ton".',
    areas: ['Rate my Song', 'Ergebnis'],
  },
  {
    id: 'rms-phone', emoji: '📱', name: 'Handy (Rate my Song)', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Handy-Sänger" (Telefon-Haltung singen).',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-cycle', emoji: '🔄', name: 'Zyklus-Pfeile', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Tempo-Wechsel", „Game wiederholen"-Button, „Neu"-Badge, Daily „Comeback", Weekly „Comeback King".',
    areas: ['Rate my Song', 'Ergebnis', 'Daily', 'Weekly'],
  },
  {
    id: 'rms-smirk', emoji: '😏', name: 'Grinsendes Gesicht', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Smirk Mode" (schmunzelnd singen).',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-guitar', emoji: '🎸', name: 'E-Gitarre', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Luftgitarre", Genre-Metadatum/-Filter, „Kein Genre"-Kennzeichnung.',
    areas: ['Rate my Song', 'Bibliothek', 'Editor'],
  },
  {
    id: 'rms-diva', emoji: '👑', name: 'Krone (Diva)', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Diva-Modus".',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-whisper', emoji: '🤫', name: 'Bemühtes Schweigen', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Flüsterstart" (leise beginnen).',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-disco', emoji: '🕺', name: 'Tänzer (männlich)', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Disko-Fieber".',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-cry', emoji: '😢', name: 'Weinendes Gesicht', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Achterbahn der Gefühle".',
    areas: ['Rate my Song'],
  },
  {
    id: 'rms-country', emoji: '🤠', name: 'Cowboyhut', category: 'achievements',
    desc: 'Rate-my-Song-Challenge „Country-Twist", Genre „Country".',
    areas: ['Rate my Song', 'Bibliothek'],
  },
  {
    id: 'heart-eyes', emoji: '😍', name: 'Verliebtes Gesicht', category: 'achievements',
    desc: 'Schnellreaktion im Rate-my-Song-Live-Feed (Zuschauer-Reaktion).',
    areas: ['Rate my Song', 'Chat'],
  },
  {
    id: 'clap', emoji: '👏', name: 'Klatschende Hände', category: 'achievements',
    desc: 'Schnellreaktion im Rate-my-Song-Live-Feed (Applaus).',
    areas: ['Rate my Song', 'Chat'],
  },
  {
    id: 'plane', emoji: '✈️', name: 'Flugzeug', category: 'achievements',
    desc: '„Free Flight"-Challenge (ohne Tonhöhen-Hilfe singen).',
    areas: ['Daily'],
  },
  {
    id: 'puzzle', emoji: '🧩', name: 'Puzzleteil', category: 'achievements',
    desc: '„Memory Lane"-Challenge (Song aus dem Gedächtnis).',
    areas: ['Daily'],
  },
  {
    id: 'hatching', emoji: '🐣', name: 'Schlüpfendes Küken', category: 'achievements',
    desc: '„Note Novice"-Challenge (Anfänger-Noten).',
    areas: ['Daily'],
  },
  {
    id: 'pickaxe', emoji: '⛏️', name: 'Spitzhacke', category: 'achievements',
    desc: '„Gold Panner"/„Gold Miner"-Challenges (Gold-Notes sammeln).',
    areas: ['Daily'],
  },
  {
    id: 'flag-post', emoji: '🚩', name: 'Fahne (dreieckig)', category: 'achievements',
    desc: '„Combo Commander"-Challenge, „Kein Land"-Platzhalter (Länderwahl).',
    areas: ['Daily', 'Profil'],
  },
  {
    id: 'magnifier-side', emoji: '🔎', name: 'Lupe (seitlich)', category: 'achievements',
    desc: '„Score Scout"-Challenge, Motto-Suche (Einstellungen).',
    areas: ['Daily', 'Einstellungen'],
  },
  {
    id: 'graduation', emoji: '🎓', name: 'Studentenkappe', category: 'achievements',
    desc: '„Score Scholar"-Challenge, Tutorial-Abschluss-Screen.',
    areas: ['Daily', 'Tutorial'],
  },
  {
    id: 'snail', emoji: '🐌', name: 'Schnecke', category: 'achievements',
    desc: 'Medley-Modifikator „Slow-Mo" (0,8x Tempo), „Slow Motion"-Challenge, Daily „Slow BPM".',
    areas: ['Medley', 'Daily'],
  },
  {
    id: 'chipmunk', emoji: '🐿️', name: 'Eichhörnchen', category: 'achievements',
    desc: 'Medley-Modifikator „Chipmunk" (1,4x Tempo — Stimme klingt wie ein Eichhörnchen).',
    areas: ['Medley'],
  },
  {
    id: 'sunglasses-cat', emoji: '🕶️', name: 'Sonnenbrille', category: 'achievements',
    desc: '„Blind Master"-Challenge (schwere Blind-Variante), Genre „Indie".',
    areas: ['Daily', 'Bibliothek'],
  },
  {
    id: 'slot-machine', emoji: '🎰', name: 'Spielautomat (s. Mystery)', category: 'achievements',
    desc: 'Siehe Mystery-Song-Eintrag (Medley).',
    areas: ['Medley'],
  },

  // ═══════════════ DAILY & WEEKLY CHALLENGE-ICONS (challenge-pools.ts) ═══════════════
  {
    id: 'pool-sun', emoji: '☀️', name: 'Sonne', category: 'daily',
    desc: 'Daily „Solar"-Serie (Solar Score/Notes/Combo/Tick), Wake-Lock-Badge „Bildschirm bleibt an" (Handy).',
    areas: ['Daily', 'Handy'],
  },
  {
    id: 'pool-comet', emoji: '☄️', name: 'Komet', category: 'daily',
    desc: 'Daily „Score Comet", Weekly „Comet"-Serie (Notes/Perfect/Tick).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-anchor', emoji: '⚓', name: 'Anker', category: 'daily',
    desc: 'Daily „Miss Anchor" (maximal 25/14/8/4/2 Fehler).',
    areas: ['Daily'],
  },
  {
    id: 'pool-storm', emoji: '⛈️', name: 'Gewitter', category: 'daily',
    desc: 'Daily „Notes Storm"/„Storm Notes", Weekly „Notes Monsoon".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-lightning-storm', emoji: '🌩️', name: 'Blitz mit Regen', category: 'daily',
    desc: 'Daily „Storm Score", Weekly „Perfect Storm".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-mountain', emoji: '⛰️', name: 'Berg (unbedeckt)', category: 'daily',
    desc: 'Daily „Perfect Summit".',
    areas: ['Daily'],
  },
  {
    id: 'pool-hand', emoji: '✋', name: 'Hand (Stopp)', category: 'daily',
    desc: 'Daily „Steady Hand"; „Manuell klären"-Option bei Genre-Regeln.',
    areas: ['Daily', 'Einstellungen'],
  },
  {
    id: 'pool-question', emoji: '❓', name: 'Fragezeichen', category: 'daily',
    desc: 'Daily „???" (zufällige Songs), Weekly „Question Songs", Mystery-Song (Medley), Fallback-Icon.',
    areas: ['Daily', 'Weekly', 'Medley'],
  },
  {
    id: 'pool-mahjong', emoji: '🀄', name: 'Mahjong-Stein', category: 'daily',
    desc: 'Weekly „Mixed" (gemischte Sprachen).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-a', emoji: '🅰️', name: 'A-Blutgruppe', category: 'daily',
    desc: 'Weekly „Interpret A-M" (Künstler mit A-M).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-ab', emoji: '🆎', name: 'AB-Blutgruppe', category: 'daily',
    desc: 'Weekly „Interpret N-Z" (Künstler mit N-Z).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-new', emoji: '🆕', name: 'NEU-Symbol', category: 'daily',
    desc: 'Daily/Weekly „Frische Songs" (noch nie gesungen).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-dawn', emoji: '🌅', name: 'Sonnenaufgang', category: 'daily',
    desc: 'Daily „Accuracy Horizon"/„Perfect Dawn", Weekly „Dawn"-Serie.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-dusk', emoji: '🌆', name: 'Stadtsilhouette bei Dämmerung', category: 'daily',
    desc: 'Weekly „Dusk"-Serie (Score/Accuracy/Combo), Daily-Challenge „hart".',
    areas: ['Weekly', 'Daily'],
  },
  {
    id: 'pool-rainbow', emoji: '🌈', name: 'Regenbogen', category: 'daily',
    desc: 'Daily „Flawless Finale" (makelloses Ende), Genre „Alternative".',
    areas: ['Daily', 'Bibliothek'],
  },
  {
    id: 'pool-wave', emoji: '🌊', name: 'Welle', category: 'daily',
    desc: 'Daily „Combo Tsunami", Weekly „Tide"-Serie, Voice-FX „Chorus", Erfolg „30 Gold-Notes".',
    areas: ['Daily', 'Weekly', 'Voice-FX', 'Erfolge'],
  },
  {
    id: 'pool-eclipse', emoji: '🌑', name: 'Neumond', category: 'daily',
    desc: 'Daily „Score Eclipse" (Score ohne Hilfe).',
    areas: ['Daily'],
  },
  {
    id: 'pool-waning-moon', emoji: '🌘', name: 'Abnehmender Mond', category: 'daily',
    desc: 'Daily „Golden Eclipse".',
    areas: ['Daily'],
  },
  {
    id: 'pool-crescent', emoji: '🌙', name: 'Sichelmond', category: 'daily',
    desc: 'Daily „Lunar"-Serie (Score/Accuracy/Perfect/Golden).',
    areas: ['Daily'],
  },
  {
    id: 'pool-breeze', emoji: '🌬️', name: 'Windgesicht', category: 'daily',
    desc: 'Weekly „Zephyr"-Serie (Score/Combo/Perfect).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-sprout', emoji: '🌱', name: 'Sprössling', category: 'daily',
    desc: 'Daily „Score Sprout" (kleiner Score).',
    areas: ['Daily'],
  },
  {
    id: 'pool-chili', emoji: '🌶️', name: 'Chili', category: 'daily',
    desc: 'Daily/Weekly „Schwierigkeit hart" (nur harte Songs).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-leaf', emoji: '🍃', name: 'Blatt im Wind', category: 'daily',
    desc: 'Daily/Weekly „Schwierigkeit leicht" (nur leichte Songs).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-blossom', emoji: '🌸', name: 'Kirschblüte', category: 'daily',
    desc: 'Daily „Perfect Bloom".',
    areas: ['Daily'],
  },
  {
    id: 'pool-fallen-leaves', emoji: '🍂', name: 'Laubblätter', category: 'daily',
    desc: 'Daily „Drift"-Serie (Accuracy/Combo/Score/Notes).',
    areas: ['Daily'],
  },
  {
    id: 'pool-popcorn', emoji: '🍿', name: 'Popcorn', category: 'daily',
    desc: 'Weekly „15 Songs".',
    areas: ['Weekly'],
  },
  {
    id: 'pool-film-frames', emoji: '🎞️', name: 'Filmframes', category: 'daily',
    desc: 'Daily/Weekly „Vintage" (Songs vor 1960/1970).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-clapper', emoji: '🎬', name: 'Filmklappe', category: 'daily',
    desc: 'Weekly „5 Songs", „Video-Short"-Tab (Teilen), Genre „Soundtrack", Video-Link-Toast (Jukebox), Backup-Medien.',
    areas: ['Weekly', 'Ergebnis', 'Bibliothek', 'Jukebox'],
  },
  {
    id: 'pool-camera', emoji: '🎥', name: 'Filmkamera', category: 'daily',
    desc: 'Weekly „10 Songs".',
    areas: ['Weekly'],
  },
  {
    id: 'pool-trumpet', emoji: '🎺', name: 'Trompete', category: 'daily',
    desc: 'Daily „Sharpshooter", Genre „Jazz".',
    areas: ['Daily', 'Bibliothek'],
  },
  {
    id: 'pool-score', emoji: '🎼', name: 'Partitur', category: 'daily',
    desc: 'Daily „Tick Symphony", Weekly „Symphony", „92 % Genauigkeit"-Erfolg, Jukebox-Song-Zeilen, Editor.',
    areas: ['Daily', 'Weekly', 'Jukebox', 'Editor'],
  },
  {
    id: 'pool-finish', emoji: '🏁', name: 'Zielflagge', category: 'daily',
    desc: 'Daily „Sprint" (Songs unter 2:30 min), Daily-Challenge „leicht".',
    areas: ['Daily'],
  },
  {
    id: 'pool-medal-2', emoji: '🏅', name: 'Medaille (s. Ränge)', category: 'daily',
    desc: 'Daily „Virtuoso Golden" — siehe auch Medaille unter Ränge & Titel.',
    areas: ['Daily'],
  },
  {
    id: 'pool-legend', emoji: '🏆', name: 'Pokal (Daily)', category: 'daily',
    desc: 'Daily „Golden Legend", Weekly „Score Sum".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-ghost', emoji: '👻', name: 'Geist', category: 'daily',
    desc: 'Daily „Ghost Miss"/„Score Phantom"/„Ghost Score", Weekly „Score Phantom", Titel „Phantom Phony" (40 Punkte).',
    areas: ['Daily', 'Weekly', 'Titel'],
  },
  {
    id: 'pool-dash', emoji: '💨', name: 'Windlauf', category: 'daily',
    desc: 'Daily „Ghost Combo".',
    areas: ['Daily'],
  },
  {
    id: 'pool-slayer', emoji: '⚔️', name: 'Schwerter (Daily)', category: 'daily',
    desc: 'Daily „Score Slayer", „Fortnight Fighter"-Badge, „25 Duette"-Erfolg — siehe auch Duell unter Spielmodi.',
    areas: ['Daily', 'Badges', 'Erfolge'],
  },
  {
    id: 'pool-notes', emoji: '🎶', name: 'Noten (Daily)', category: 'daily',
    desc: 'Daily/Weekly „Notes Peak/Sum"-Challenges.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-sparkle', emoji: '✨', name: 'Funkeln (Daily)', category: 'daily',
    desc: 'Daily/Weekly „Golden Notes/Peak/Galore/Sum"-Challenges (Gold-Notes).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-star', emoji: '⭐', name: 'Stern (Daily)', category: 'daily',
    desc: 'Daily „5-Sterne-Songs", Weekly „Five Star" — siehe auch Stern unter Spielmodi.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-bullet', emoji: '🎯', name: 'Zielscheibe (Daily)', category: 'daily',
    desc: 'Daily „Accuracy/Adept/Maestro", Weekly „Accuracy Peak/Ellte" — siehe auch Zielscheibe unter Erfolge.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-crown', emoji: '👑', name: 'Krone (Apex/Titan)', category: 'daily',
    desc: 'Daily „Apex"-Serie und „Titan" (höchste Daily-Herausforderungen), Weekly „Elite/Baron", „Gold Baron"-Challenge.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-person', emoji: '👤', name: 'Silhouette', category: 'daily',
    desc: 'Daily „Ghost Score", Profil-Platzhalter in den Handy-Spiegel-Ansichten.',
    areas: ['Daily', 'Handy'],
  },
  {
    id: 'pool-duo', emoji: '👫', name: 'Pärchen (Daily)', category: 'daily',
    desc: 'Daily „Duo Day", Weekly „Duo Week" — Duett-Songs.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-diamond', emoji: '💎', name: 'Diamant (Daily)', category: 'daily',
    desc: 'Daily „Maestro Perfect"/„Perfect Notes"/„Miss Diamond", Weekly „Perfect Peak".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-heartbeat', emoji: '💓', name: 'Herzschlag', category: 'daily',
    desc: 'Daily „Pulse"-Serie (Score/Combo/Perfect/Tick).',
    areas: ['Daily'],
  },
  {
    id: 'pool-growing-heart', emoji: '💗', name: 'Wachsendes Herz', category: 'daily',
    desc: 'Daily „Liebeslieder", Weekly „Love Songs".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-drop', emoji: '💧', name: 'Wassertropfen', category: 'daily',
    desc: 'Daily „Perfect Cascade".',
    areas: ['Daily'],
  },
  {
    id: 'pool-dizzy', emoji: '💫', name: 'Sternschwindel (Daily)', category: 'daily',
    desc: 'Daily „Nova"-Serie und „Shape Epic", „Virtuoso Perfect".',
    areas: ['Daily'],
  },
  {
    id: 'pool-speech', emoji: '💬', name: 'Sprechblase (Daily)', category: 'daily',
    desc: 'Daily „Ein-Wort-Songs", Weekly „One Word" — siehe auch Chat unter Spieler & Geräte.',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-money', emoji: '💰', name: 'Geldsack', category: 'daily',
    desc: 'Daily „Golden Rush" (Gold-Notes-Wette), Wetten-Ergebnis-Titel (Turnier).',
    areas: ['Daily', 'Turnier'],
  },
  {
    id: 'pool-loudspeaker', emoji: '📢', name: 'Lautsprecher', category: 'daily',
    desc: 'Daily „Echo"-Serie (Score/Golden/Perfect/Combo).',
    areas: ['Daily'],
  },
  {
    id: 'pool-link', emoji: '🔗', name: 'Kettenglieder (Daily)', category: 'daily',
    desc: 'Daily „Combo Master"/„Maestro Combo", Geräte-Verbindung, „UND"-Filterlogik (Motto-Party).',
    areas: ['Daily', 'Party-Setup', 'Einstellungen'],
  },
  {
    id: 'pool-abcd', emoji: '🔠', name: 'ABCD-Kästchen', category: 'daily',
    desc: 'Daily „Titel N-Z", Weekly „Titel mit N".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-lowercase', emoji: '🔡', name: 'abcd-Kästchen', category: 'daily',
    desc: 'Daily „Titel A-M", Weekly „Titel mit A".',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-numbers', emoji: '🔢', name: '1234-Kästchen', category: 'daily',
    desc: 'Daily „Song mit Zahl im Titel".',
    areas: ['Daily'],
  },
  {
    id: 'pool-dove', emoji: '🕊️', name: 'Taube', category: 'daily',
    desc: 'Daily „Combo Phoenix".',
    areas: ['Daily'],
  },
  {
    id: 'pool-clock', emoji: '🕰️', name: 'Standuhr', category: 'daily',
    desc: 'Daily „Tick Metro", „Titan Tick" (Takt-Genauigkeit).',
    areas: ['Daily'],
  },
  {
    id: 'pool-key', emoji: '🗝️', name: 'Alter Schlüssel', category: 'daily',
    desc: 'Daily „Golden Treasure" (Gold-Notes-Schatz).',
    areas: ['Daily'],
  },
  {
    id: 'pool-speaking', emoji: '🗣️', name: 'Sprechender Kopf', category: 'daily',
    desc: 'Weekly „Polyglott" (fremdsprachige Songs).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-mountain-snow', emoji: '🗻', name: 'Fudschijama', category: 'daily',
    desc: 'Daily „Notes Mountain".',
    areas: ['Daily'],
  },
  {
    id: 'pool-halo', emoji: '😇', name: 'Heiligenschein-Smiley', category: 'daily',
    desc: 'Weekly „Apex Accuracy/Score" (höchste Weekly-Herausforderungen).',
    areas: ['Weekly'],
  },
  {
    id: 'pool-prohibited', emoji: '🚫', name: 'Verboten', category: 'daily',
    desc: 'Daily „Miss Zero" (keine Fehler), Mikrofon verweigert, „Kein Land"-Eintrag.',
    areas: ['Daily', 'Handy', 'Profil'],
  },
  {
    id: 'pool-rails', emoji: '🛤️', name: 'Bahngleise', category: 'daily',
    desc: 'Daily „Notes Horizon".',
    areas: ['Daily'],
  },
  {
    id: 'pool-pinch', emoji: '🤌', name: 'Pinzettengriff', category: 'daily',
    desc: 'Daily „Golden Fingers".',
    areas: ['Daily'],
  },
  {
    id: 'pool-feat', emoji: '🤝', name: 'Händedruck (Daily)', category: 'daily',
    desc: 'Daily/Weekly „Feat.-Songs" (Songs mit Gastkünstler).',
    areas: ['Daily', 'Weekly'],
  },
  {
    id: 'pool-drum', emoji: '🥁', name: 'Trommel', category: 'daily',
    desc: 'Daily/Weekly „Schnelles BPM" (Songs über 140 BPM), Tap-Modus-Tutorial.',
    areas: ['Daily', 'Weekly', 'Tutorial'],
  },
  {
    id: 'pool-eagle', emoji: '🦅', name: 'Adler', category: 'daily',
    desc: 'Daily „Phoenix Perfect".',
    areas: ['Daily'],
  },
  {
    id: 'pool-ice', emoji: '🧊', name: 'Eiswürfel', category: 'daily',
    desc: 'Daily „Combo Glacier".',
    areas: ['Daily'],
  },
  {
    id: 'pool-rock', emoji: '🪨', name: 'Fels', category: 'daily',
    desc: 'Daily „Score Boulder".',
    areas: ['Daily'],
  },
  {
    id: 'pool-bubbles', emoji: '🫧', name: 'Blasen', category: 'daily',
    desc: 'Daily „Miss Bubble" (wenige Fehler).',
    areas: ['Daily'],
  },

  // ═══════════════ SPIELER, GERÄTE & CHAT ═══════════════
  {
    id: 'person', emoji: '👤', name: 'Person (Silhouette)', category: 'players',
    desc: 'Profil-Platzhalter in allen Handy-Spiegel-Ansichten (Profil, Erfolge, Daily), Duell-Karte „👤 P1 / 👤 P2" beim Teilen.',
    areas: ['Handy', 'Ergebnis', 'Teilen'],
  },
  {
    id: 'desktop', emoji: '🖥️', name: 'Desktop-PC', category: 'players',
    desc: 'Host-Kennzeichnung im Chat („🖥️ = Host schreibt"), Desktop-Wünsche in der Handy-Queue, Chat-Identitäts-Auswahl.',
    areas: ['Chat', 'Queue'],
  },
  {
    id: 'chat', emoji: '💬', name: 'Sprechblase', category: 'players',
    desc: 'Chat-Bereich: Handy-Header, Desktop-Chat-Panel, Chat-Benachrichtigung, „Chat"-Toast, Tutorial, Hilfe-Bereich.',
    areas: ['Handy', 'Desktop', 'Benachrichtigung'],
  },
  {
    id: 'lock', emoji: '🔒', name: 'Schloss (zu)', category: 'players',
    desc: 'Gesperrte Bereiche ohne Steuerung (Party, Challenge, Jukebox, Einstellungen auf dem Handy), HTTPS/Mikrofon-Hinweis, WLAN-QR-Karte.',
    areas: ['Handy', 'Einstellungen'],
  },
  {
    id: 'unlock', emoji: '🔓', name: 'Schloss (offen)', category: 'players',
    desc: 'Freigeschaltete Bereiche (mit Steuerung) in der Handy-Hilfe und Startseite.',
    areas: ['Handy'],
  },
  {
    id: 'locked-key', emoji: '🔐', name: 'Schloss mit Schlüssel', category: 'players',
    desc: 'Online-Konto: Anmeldung, „Konto vorhanden", Registrierung, Profil-Konto-Bereich.',
    areas: ['Profil'],
  },
  {
    id: 'key', emoji: '🔑', name: 'Schlüssel', category: 'players',
    desc: 'Wiederherstellungscode (Profilsicherung), Passwort ändern.',
    areas: ['Profil'],
  },
  {
    id: 'old-key', emoji: '🗝️', name: 'Alter Schlüssel (Profil)', category: 'players',
    desc: 'Siehe Daily „Golden Treasure".',
    areas: ['Daily'],
  },
  {
    id: 'camera-photo', emoji: '📷', name: 'Fotoapparat', category: 'players',
    desc: 'Profil-Foto (Datenschutz-Schalter „Foto anzeigen"), Foto-Auswahl bei der Profil-Erstellung (Handy), Hilfe.',
    areas: ['Profil', 'Handy'],
  },
  {
    id: 'cloud', emoji: '☁️', name: 'Wolke', category: 'players',
    desc: 'Cloud-/Online-Speicher-Kennzeichnung beim Profil-Sync.',
    areas: ['Profil'],
  },
  {
    id: 'link', emoji: '🔗', name: 'Kette (verbinden)', category: 'players',
    desc: 'Gerät verbinden (Party-Setup), „Verbunden!"-Tutorial, UND-Filterlogik, Combo-Challenges.',
    areas: ['Party-Setup', 'Tutorial', 'Einstellungen'],
  },
  {
    id: 'plug', emoji: '🔌', name: 'Stecker', category: 'players',
    desc: 'Verbindungsstatus (Hilfe), Mikrofon-Typ „3,5-mm-Klinke" in den Mikrofon-Einstellungen.',
    areas: ['Hilfe', 'Einstellungen'],
  },
  {
    id: 'antenna', emoji: '📡', name: 'Satellitenschüssel', category: 'players',
    desc: 'Online-Status/Verbindung: Online-Statistikkarte, Spiegel-Ansichten (Verbindungsanzeige).',
    areas: ['Profil', 'Handy'],
  },
  {
    id: 'hand-wave', emoji: '👋', name: 'Winkende Hand', category: 'players',
    desc: 'Tutorial-Begrüßung („Willkommen!"), Einstellungs-Tutorial.',
    areas: ['Tutorial'],
  },
  {
    id: 'writing', emoji: '✍️', name: 'Schreibende Hand', category: 'players',
    desc: 'Chat-Tutorial (Nachricht schreiben).',
    areas: ['Tutorial'],
  },
  {
    id: 'love-letter', emoji: '💌', name: 'Liebesbrief', category: 'players',
    desc: 'Chat-Tutorial („Angeschrieben!").',
    areas: ['Tutorial'],
  },
  {
    id: 'raise-hand', emoji: '🙋', name: 'Hand hoch', category: 'players',
    desc: 'Tutorial „Gäste ohne Steuerung" (Handy-Nutzer ohne Host-Rechte).',
    areas: ['Tutorial'],
  },
  {
    id: 'eyes', emoji: '👀', name: 'Augen', category: 'players',
    desc: 'Vorschau-Bereich (Motto-Party-Einstellungen), Hilfe „Queue ansehen".',
    areas: ['Einstellungen', 'Hilfe'],
  },
  {
    id: 'eye', emoji: '👁️', name: 'Auge', category: 'players',
    desc: 'Zuschauer-Lounge im Battle Royale (Spieler ohne Mikrofon schauen zu).',
    areas: ['Battle Royale'],
  },
  {
    id: 'door', emoji: '🚪', name: 'Tür', category: 'players',
    desc: 'Hilfe: Party verlassen / verlassen-Bereich.',
    areas: ['Hilfe'],
  },
  {
    id: 'sun-wake', emoji: '☀️', name: 'Sonne (Wake-Lock)', category: 'players',
    desc: 'Handy-Status-Badge „Bildschirm bleibt an" (Wake Lock während des Singens).',
    areas: ['Handy'],
  },
  {
    id: 'point-up', emoji: '☝️', name: 'Zeigefinger hoch', category: 'players',
    desc: 'Hilfe: „Tippe oben rechts auf 💬" — Chat-Bereich finden.',
    areas: ['Hilfe'],
  },
  {
    id: 'point-tap', emoji: '👆', name: 'Zeigefinger (tippen)', category: 'players',
    desc: '„Zuerst Spieler auswählen" (Daily Challenge), „Tippen zum Aktivieren" (Mikrofon), HTTPS-Hinweis (Handy).',
    areas: ['Daily', 'Handy'],
  },
  {
    id: 'bulb', emoji: '💡', name: 'Glühbirne', category: 'players',
    desc: 'Tipps: Editor-Hinweise, Webcam-Tipp, „Mehr erfahren"-Bereich.',
    areas: ['Editor', 'Einstellungen', 'Hilfe'],
  },
  {
    id: 'trash', emoji: '🗑', name: 'Papierkorb', category: 'players',
    desc: 'Löschen-Aktionen: Jukebox-Wunsch entfernen, Online-Profil löschen, Editor „Notiz löschen" (Tutorial).',
    areas: ['Jukebox', 'Profil', 'Editor'],
  },
  {
    id: 'trash-2', emoji: '🗑️', name: 'Papierkorb (variante)', category: 'players',
    desc: '„Online-Konto löschen" (Profil-Sync, Handy).',
    areas: ['Profil', 'Handy'],
  },
  {
    id: 'parrot', emoji: '🦜', name: 'Papagei', category: 'players',
    desc: 'Titel „Pitchy Parrot" (65 Punkte — trifft Töne nur papageienhaft).',
    areas: ['Titel'],
  },
  {
    id: 'shrug', emoji: '🤷', name: 'Achselzucken', category: 'players',
    desc: 'Titel „Humble Hummer" (55 Punkte — summt bescheiden vor sich hin).',
    areas: ['Titel'],
  },
  {
    id: 'construction', emoji: '🚧', name: 'Baustelle', category: 'players',
    desc: 'Titel „Under Construction" (50 Punkte — Stimme im Aufbau).',
    areas: ['Titel'],
  },
  {
    id: 'wink-tongue', emoji: '😜', name: 'Zwinkerndes Gesicht mit Zunge', category: 'players',
    desc: 'Titel „Bathroom Baritone" (45 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'duck', emoji: '🦆', name: 'Ente', category: 'players',
    desc: 'Titel „Duck Tape Singer" (35 Punkte — Entchorgesang).',
    areas: ['Titel'],
  },
  {
    id: 'woozy', emoji: '🥴', name: 'Benommenes Gesicht', category: 'players',
    desc: 'Titel „Tuneless Troubadour" (30 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'peeking', emoji: '🫣', name: 'Gesicht hinter Hand', category: 'players',
    desc: 'Titel „Tone Deaf Titan" (20 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'clown', emoji: '🤡', name: 'Clown', category: 'players',
    desc: 'Titel „Clown Car Crooner" (15 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'zombie', emoji: '🧟', name: 'Zombie', category: 'players',
    desc: 'Titel „Tone Zombie" (10 Punkte).',
    areas: ['Titel'],
  },

  // ═══════════════ BIBLIOTHEK & GENRES ═══════════════
  {
    id: 'genre-hiphop', emoji: '🎧', name: 'Kopfhörer', category: 'library',
    desc: 'Genre-Ordner „Hip-Hop" in der Bibliothek, Queue-Tutorial („Die Queue wartet!").',
    areas: ['Bibliothek', 'Tutorial'],
  },
  {
    id: 'genre-rap', emoji: '🎙️', name: 'Studiomikro (Rap)', category: 'library',
    desc: 'Genre-Ordner „Rap".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-rnb', emoji: '🎷', name: 'Saxofon', category: 'library',
    desc: 'Genre-Ordner „R&B" und „Swing".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-dance', emoji: '💃', name: 'Tänzerin (Dance)', category: 'library',
    desc: 'Genre-Ordner „Dance".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-classical', emoji: '🎻', name: 'Geige (Klassik)', category: 'library',
    desc: 'Genre-Ordner „Klassik".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-jazz', emoji: '🎺', name: 'Trompete (Jazz)', category: 'library',
    desc: 'Genre-Ordner „Jazz".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-folk', emoji: '🪕', name: 'Banjo', category: 'library',
    desc: 'Genre-Ordner „Folk".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-indie', emoji: '🕶️', name: 'Sonnenbrille (Indie)', category: 'library',
    desc: 'Genre-Ordner „Indie".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-alternative', emoji: '🌈', name: 'Regenbogen (Alternative)', category: 'library',
    desc: 'Genre-Ordner „Alternative".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-soul', emoji: '💜', name: 'Lila Herz (Soul)', category: 'library',
    desc: 'Genre-Ordner „Soul".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-house', emoji: '🔊', name: 'Lautsprecher (House)', category: 'library',
    desc: 'Genre-Ordner „House".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-trance', emoji: '🌀', name: 'Wirbel (Trance)', category: 'library',
    desc: 'Genre-Ordner „Trance".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-ballad', emoji: '💕', name: 'Zwei Herzen (Ballade)', category: 'library',
    desc: 'Genre-Ordner „Ballade".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-schlager', emoji: '🎪', name: 'Zirkuszelt (Schlager)', category: 'library',
    desc: 'Genre-Ordner „Schlager".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-disco', emoji: '🪩', name: 'Discokugel', category: 'library',
    desc: 'Genre-Ordner „Disco".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-soundtrack', emoji: '🎬', name: 'Filmklappe (Soundtrack)', category: 'library',
    desc: 'Genre-Ordner „Soundtrack" (Filmmusik).',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-gospel', emoji: '⛪', name: 'Kirche', category: 'library',
    desc: 'Genre-Ordner „Gospel".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-children', emoji: '🧸', name: 'Teddybär', category: 'library',
    desc: 'Genre-Ordner „Kinderlieder".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-christmas', emoji: '🎄', name: 'Weihnachtsbaum', category: 'library',
    desc: 'Genre-Ordner „Weihnachten" (geschütztes Saison-Genre), Saison-Hinweis der Genre-Regeln.',
    areas: ['Bibliothek', 'Einstellungen'],
  },
  {
    id: 'genre-oldies', emoji: '📻', name: 'Retro-Radio', category: 'library',
    desc: 'Genre-Ordner „Oldies", Jukebox-Tab (Handy), Jukebox-Radio-Bereich.',
    areas: ['Bibliothek', 'Jukebox', 'Handy'],
  },
  {
    id: 'genre-latin', emoji: '🌴', name: 'Palme (Latin)', category: 'library',
    desc: 'Genre-Ordner „Latin".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-kpop', emoji: '🌟', name: 'Leuchtstern (K-Pop)', category: 'library',
    desc: 'Genre-Ordner „K-Pop".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-opera', emoji: '🎭', name: 'Masken (Oper)', category: 'library',
    desc: 'Genre-Ordner „Oper".',
    areas: ['Bibliothek'],
  },
  {
    id: 'genre-metal', emoji: '🤘', name: 'Metall-Hörner (Metal)', category: 'library',
    desc: 'Genre-Ordner „Metal".',
    areas: ['Bibliothek'],
  },
  {
    id: 'folder', emoji: '📁', name: 'Ordner', category: 'library',
    desc: 'Gruppierungs-Option „Ordner" in der Bibliothek (Verzeichnisansicht).',
    areas: ['Bibliothek'],
  },
  {
    id: 'folder-open', emoji: '📂', name: 'Offener Ordner', category: 'library',
    desc: 'Bibliotheks-Tab in den Einstellungen.',
    areas: ['Einstellungen'],
  },
  {
    id: 'dividers', emoji: '🗂️', name: 'Karteikarten-Ordner', category: 'library',
    desc: 'Hinweis auf Genre-Gruppen (Genre-Regeln, Einstellungen).',
    areas: ['Einstellungen'],
  },
  {
    id: 'clock-recent', emoji: '🕐', name: 'Uhr (eins)', category: 'library',
    desc: 'Playlist „Zuletzt gespielt", Filter in der Bibliothek.',
    areas: ['Bibliothek'],
  },
  {
    id: 'clock-nine', emoji: '🕘', name: 'Uhr (neun)', category: 'library',
    desc: 'Party-Wartescreen auf dem Handy (Countdown bis Party-Start).',
    areas: ['Handy'],
  },
  {
    id: 'tag', emoji: '🏷️', name: 'Etikett', category: 'library',
    desc: 'Tag-Filter (Motto-Party), Genre-Kennzeichnung (Taxonomie-Tab).',
    areas: ['Einstellungen', 'Party'],
  },
  {
    id: 'cd', emoji: '💿', name: 'CD', category: 'library',
    desc: 'Playlist-Symbol (Jukebox-Browser, Playlisten), „Playlist eingereiht"-Toast.',
    areas: ['Jukebox', 'Bibliothek'],
  },
  {
    id: 'dvd', emoji: '📀', name: 'DVD', category: 'library',
    desc: '„Als Pool verwenden" (Jukebox-Wiedergabeliste).',
    areas: ['Jukebox'],
  },
  {
    id: 'books', emoji: '📖', name: 'Offenes Buch', category: 'library',
    desc: '„Playlist anzeigen/ausblenden", Editor-Anleitung, Regel-Referenz.',
    areas: ['Bibliothek', 'Editor', 'Einstellungen'],
  },
  {
    id: 'plus', emoji: '➕', name: 'Plus', category: 'library',
    desc: 'Hinzufügen: Video-Link (Jukebox), Note hinzufügen (Editor-Tutorial).',
    areas: ['Jukebox', 'Editor'],
  },
  {
    id: 'scissors', emoji: '✂', name: 'Schere', category: 'library',
    desc: 'Editor-Tutorial: Noten ausschneiden.',
    areas: ['Tutorial'],
  },
  {
    id: 'clipboard', emoji: '📋', name: 'Klemmbrett', category: 'library',
    desc: 'Handy-Tab „Queue", „Text kopieren", Playlisten-Browser, „Kommende Duelle" (Turnier), Medley-Share.',
    areas: ['Handy', 'Ergebnis', 'Turnier', 'Medley'],
  },
  {
    id: 'down-arrow-short', emoji: '⬇', name: 'Pfeil abwärts (schmal)', category: 'library',
    desc: '„Export"-Button (Ergebnis, Editor).',
    areas: ['Ergebnis', 'Editor'],
  },
  {
    id: 'down-arrow', emoji: '⬇️', name: 'Pfeil abwärts', category: 'library',
    desc: '„Zertifikat herunterladen" (HTTPS-Setup, Handy).',
    areas: ['Handy'],
  },
  {
    id: 'slider', emoji: '🎚️', name: 'Schieberegler', category: 'library',
    desc: 'Instrumental-Option (Song-Start), Motto-Filter, „92 % Genauigkeit"-Erfolg, Tick-Challenges, Pitch-Shift-Challenge.',
    areas: ['Song-Start', 'Einstellungen', 'Erfolge', 'Daily'],
  },
  {
    id: 'palette', emoji: '🎨', name: 'Palette', category: 'library',
    desc: 'Tab „Erscheinungsbild" (Einstellungen), „Filter"-Info, Daily „Accuracy Artisan".',
    areas: ['Einstellungen', 'Daily'],
  },
  {
    id: 'search', emoji: '🔍', name: 'Lupe', category: 'library',
    desc: 'Suche: Interpret/Titel (Party), Editor-Verifizieren-Modus, Songfilter.',
    areas: ['Party', 'Editor', 'Bibliothek'],
  },
  {
    id: 'globe-lang', emoji: '🌐', name: 'Globus mit Meridianen', category: 'library',
    desc: 'Sprache (Metadatum „Keine Sprache", Sprachfilter), Online-Speicher-Kennzeichnung beim Profil, Web-App-Kennzeichnung (Sync-Tab).',
    areas: ['Bibliothek', 'Editor', 'Profil', 'Einstellungen'],
  },
  {
    id: 'infinity', emoji: '♾️', name: 'Unendlich (Playlist)', category: 'library',
    desc: 'Siehe Spielmodi — Endlos-Wiederholung.',
    areas: ['Playlist'],
  },

  // ═══════════════ WIEDERGABE & MEDIEN ═══════════════
  {
    id: 'play', emoji: '▶', name: 'Play-Dreieck (schmal)', category: 'media',
    desc: 'Abspielen überall: Play-Button (HUD, Jukebox, Editor, Handy-Spiegel), „Nächsten Song spielen", Party-Start „Spieler X startet".',
    areas: ['HUD', 'Jukebox', 'Queue', 'Editor', 'Handy'],
  },
  {
    id: 'play-color', emoji: '▶️', name: 'Play-Dreieck (farbig)', category: 'media',
    desc: 'Gate-Start: „Musik/Video läuft — Los!" (Wettstart-Countdown), Jukebox-Play.',
    areas: ['Gameplay', 'Jukebox'],
  },
  {
    id: 'pause', emoji: '⏸', name: 'Pause (schmal)', category: 'media',
    desc: 'Pause-Button (HUD, Handy-Spiegel), Pause-Dialog, „Nicht harmonisieren" (Regel-Ziel).',
    areas: ['HUD', 'Editor', 'Handy'],
  },
  {
    id: 'pause-color', emoji: '⏸️', name: 'Pause (farbig)', category: 'media',
    desc: 'Song-Pause-Dialog (großes Symbol).',
    areas: ['Pause-Dialog'],
  },
  {
    id: 'skip', emoji: '⏭', name: 'Skip (schmal)', category: 'media',
    desc: 'Song beenden/überspringen (HUD-Button), Handy-Spiegel.',
    areas: ['HUD', 'Handy'],
  },
  {
    id: 'skip-color', emoji: '⏭️', name: 'Skip (farbig)', category: 'media',
    desc: '„Werbung überspringen", Editor „Manuell klären: alle überspringen".',
    areas: ['Gameplay', 'Editor'],
  },
  {
    id: 'stop', emoji: '⏹', name: 'Stopp (schmal)', category: 'media',
    desc: 'Stopp-Button (Handy-Jukebox).',
    areas: ['Handy'],
  },
  {
    id: 'stop-color', emoji: '⏹️', name: 'Stopp (farbig)', category: 'media',
    desc: '„Stopp"-Button (Handy-Steuerung), abgeschlossener Regel-Job (Editor).',
    areas: ['Handy', 'Editor'],
  },
  {
    id: 'repeat-one', emoji: '🔂', name: 'Wiederholen (eins)', category: 'media',
    desc: 'Jukebox: aktuellen Song wiederholen.',
    areas: ['Jukebox'],
  },
  {
    id: 'record', emoji: '🔴', name: 'Roter Punkt', category: 'media',
    desc: 'Aufnehmen (Video-Short, mit Sekunden-Anzeige), Schwierigkeitsgrad „Very Hard" (Daily).',
    areas: ['Video', 'Daily'],
  },
  {
    id: 'record-dot', emoji: '⏺', name: 'Aufnahme-Punkt', category: 'media',
    desc: '„Leertaste halten" (Tap-Modus / Aufnahme-Gate).',
    areas: ['Song-Start'],
  },
  {
    id: 'mute', emoji: '🔇', name: 'Lautlos (s. RMS)', category: 'media',
    desc: 'Urheberrechtshinweis „Video-Shorts ohne Ton", „Stille Minute"-Challenge.',
    areas: ['Ergebnis', 'Rate my Song'],
  },
  {
    id: 'video-camera', emoji: '📹', name: 'Videokamera', category: 'media',
    desc: 'Webcam-Zweck (Einstellungen), „Kamera"-Option (Handy-Aufnahme).',
    areas: ['Einstellungen', 'Handy'],
  },
  {
    id: 'photo', emoji: '📸', name: 'Foto mit Blitz', category: 'media',
    desc: '„Punktekarte"-Tab beim Teilen (Screenshot-Karte), „Punktekarte speichern" (Handy).',
    areas: ['Ergebnis', 'Handy'],
  },
  {
    id: 'share', emoji: '📤', name: 'Postausgang', category: 'media',
    desc: '„Ergebnis teilen" (Dialog-Titel, Buttons, Ergebnis-Aktionen).',
    areas: ['Ergebnis'],
  },
  {
    id: 'download', emoji: '📥', name: 'Posteingang', category: 'media',
    desc: '„Karte herunterladen", „Herunterladen", Sync-Tab (Einstellungen).',
    areas: ['Ergebnis', 'Einstellungen', 'Handy'],
  },
  {
    id: 'mobile-camera', emoji: '📲', name: 'Handy mit Pfeil', category: 'media',
    desc: '„Mobilkamera"-Option: Video-Short mit dem Handy aufnehmen.',
    areas: ['Video'],
  },
  {
    id: 'picture', emoji: '🖼️', name: 'Bilderrahmen', category: 'media',
    desc: '„Bild kopieren" (Teilen-Dialog).',
    areas: ['Ergebnis'],
  },
  {
    id: 'videotape', emoji: '📼', name: 'Videokassette', category: 'media',
    desc: 'Deko in Jukebox-/Video-Bereichen.',
    areas: ['Jukebox'],
  },

  // ═══════════════ GAMEPLAY & PUNKTE ═══════════════
  {
    id: 'timer', emoji: '⏱️', name: 'Stoppuhr (farbig)', category: 'game',
    desc: 'Countdown-Anzeige (verbleibende Zeit), „Kurz (60s)"-Turniermodus, „Schrumpfender Timer" (Battle Royale).',
    areas: ['HUD', 'Turnier', 'Battle Royale'],
  },
  {
    id: 'timer-plain', emoji: '⏱', name: 'Stoppuhr (schmal)', category: 'game',
    desc: 'Medley-Gesamtzeit (vergangen / gesamt), „Quickie"-Challenge.',
    areas: ['Medley', 'Daily'],
  },
  {
    id: 'mic-dot', emoji: '🎤', name: 'Mikrofon-Punkt (Noten)', category: 'game',
    desc: 'Winziges „🎤●" im Battle-Royale-Spieler-Raster: Spieler hat gerade eine Note getroffen.',
    areas: ['Battle Royale'],
  },
  {
    id: 'voice-robot', emoji: '🤖', name: 'Voice-FX Roboter', category: 'game',
    desc: 'Stimmeffekt „Roboter" im Gameplay-HUD (live Stimme verzerren).',
    areas: ['Voice-FX'],
  },
  {
    id: 'voice-phone', emoji: '📞', name: 'Voice-FX Telefon', category: 'game',
    desc: 'Stimmeffekt „Telefon" (Stimme klingt wie aus dem Hörer).',
    areas: ['Voice-FX'],
  },
  {
    id: 'voice-chorus', emoji: '🌊', name: 'Voice-FX Chorus', category: 'game',
    desc: 'Stimmeffekt „Chorus" (Stimmverdopplung).',
    areas: ['Voice-FX'],
  },
  {
    id: 'voice-megaphone', emoji: '📣', name: 'Voice-FX Megafon', category: 'game',
    desc: 'Stimmeffekt „Megafon" (Stimme laut/verzerrt).',
    areas: ['Voice-FX'],
  },
  {
    id: 'voice-off', emoji: '⬜', name: 'Voice-FX Aus', category: 'game',
    desc: '„Voice-Effekte aus"-Option im Gameplay-HUD.',
    areas: ['Voice-FX'],
  },
  {
    id: 'mixing', emoji: '🎛️', name: 'Mischpult', category: 'game',
    desc: 'Voice-FX-Titel („Stimm-Effekte"), MIDI-Synthese-Option, Editor-Studio-Header.',
    areas: ['HUD', 'Einstellungen', 'Editor'],
  },
  {
    id: 'mixing-plain', emoji: '🎛', name: 'Mischpult (schmal)', category: 'game',
    desc: '„MIDI-Synthese"-Qualitätsoption (Einstellungen).',
    areas: ['Einstellungen'],
  },
  {
    id: 'warning', emoji: '⚠️', name: 'Warndreieck (farbig)', category: 'game',
    desc: 'Warnungen überall: Party-Verlassen/Beenden-Dialoge (groß), Editor-Fehler, Doppelte Songs, Mikrofon-Warnung, Fehler-Toasts. 51 Vorkommen.',
    areas: ['Dialoge', 'Editor', 'Toasts'],
  },
  {
    id: 'warning-plain', emoji: '⚠', name: 'Warndreieck (schmal)', category: 'game',
    desc: 'Kompakte Warnhinweise: Spieler-Neuauswahl, localhost-Warnung, Geräte-Zuweisung, Outlier-Badge.',
    areas: ['HUD', 'Einstellungen', 'Ergebnis'],
  },
  {
    id: 'check', emoji: '✅', name: 'Häkchen (grün)', category: 'game',
    desc: 'Erfolg/OK überall: Verbunden, Challenge geschafft, Registrierung, Bestätigungen, Medley-Statistik-Symbol.',
    areas: ['Überall'],
  },
  {
    id: 'cross', emoji: '❌', name: 'Kreuz (rot)', category: 'game',
    desc: 'Fehler/Nicht verbunden: Leaderboard-Verbindung fehlgeschlagen, Challenge verfehlt, Miss-Score-Event.',
    areas: ['Toasts', 'Bewertung', 'Gameplay'],
  },
  {
    id: 'info', emoji: 'ℹ️', name: 'Info (i)', category: 'game',
    desc: 'Info-Toasts, About-Tab, Upload-Status-Hinweis, „Bereits in Playlist"-Toast.',
    areas: ['Toasts', 'Einstellungen', 'Ergebnis'],
  },
  {
    id: 'star-event', emoji: '⭐', name: 'Stern (Score-Event)', category: 'game',
    desc: '„Perfekte Note"-Ereignis in der Punkte-Anzeige (Score-Events).',
    areas: ['Gameplay'],
  },
  {
    id: 'sparkle-event', emoji: '✨', name: 'Funkeln (Score-Event)', category: 'game',
    desc: '„Gold-Note"-Ereignis in der Punkte-Anzeige.',
    areas: ['Gameplay'],
  },
  {
    id: 'notes-event', emoji: '🎵', name: 'Note (Score-Event)', category: 'game',
    desc: 'Normales „Treffer"-Ereignis in der Punkte-Anzeige.',
    areas: ['Gameplay'],
  },
  {
    id: 'melody-event', emoji: '🎶', name: 'Melodie (Score-Event)', category: 'game',
    desc: '„Combo"-Ereignis in der Punkte-Anzeige.',
    areas: ['Gameplay'],
  },
  {
    id: 'cross-event', emoji: '❌', name: 'Kreuz (Score-Event)', category: 'game',
    desc: '„Daneben"-Ereignis in der Punkte-Anzeige.',
    areas: ['Gameplay'],
  },

  // ═══════════════ EDITOR & METADATEN ═══════════════
  {
    id: 'pencil', emoji: '✏️', name: 'Bleistift', category: 'editor',
    desc: 'Editor „Manuell"-Modus (Metadaten selbst bearbeiten), Profil bearbeiten (Handy), Editor-Tutorial.',
    areas: ['Editor', 'Handy'],
  },
  {
    id: 'checkbox', emoji: '☑️', name: 'Angekreuztes Kästchen', category: 'editor',
    desc: 'Editor-Auswahlmodus (Songs für Regel-Batch markieren), „Nichts zu tun"-Hinweis.',
    areas: ['Editor'],
  },
  {
    id: 'broom', emoji: '🧹', name: 'Besen', category: 'editor',
    desc: '„Regeln anwenden/Bereinigen"-Aktion (Genre-Säuberung), Genre-Regeln-Statistik.',
    areas: ['Editor', 'Einstellungen'],
  },
  {
    id: 'page', emoji: '📄', name: 'Seite mit Knick', category: 'editor',
    desc: 'Editor-Schreibziel „TXT-Datei" (Metadaten als Text exportieren).',
    areas: ['Editor'],
  },
  {
    id: 'floppy', emoji: '💾', name: 'Diskette', category: 'editor',
    desc: '„Lokal speichern" (Metadaten-Ziel), Cache-Quelle (Harmonize), „Backup erstellen" (Einstellungen), lokale Profil-Speicherung.',
    areas: ['Editor', 'Einstellungen', 'Profil'],
  },
  {
    id: 'apple', emoji: '🍎', name: 'Apfel', category: 'editor',
    desc: 'iTunes als Metadaten-Quelle beim Harmonisieren (Editor).',
    areas: ['Editor'],
  },
  {
    id: 'brain', emoji: '🧠', name: 'Gehirn', category: 'editor',
    desc: 'MusicBrainz als Metadaten-Quelle; „aus dem Gedächtnis singen" (Blind-Modus-Beschreibung).',
    areas: ['Editor', 'Party'],
  },
  {
    id: 'note-deezer', emoji: '🎵', name: 'Note (Deezer)', category: 'editor',
    desc: 'Deezer als Metadaten-Quelle beim Harmonisieren.',
    areas: ['Editor'],
  },
  {
    id: 'keyboard', emoji: '⌨️', name: 'Tastatur', category: 'editor',
    desc: 'Tastatur-Kürzel-Bereich (Start-Dialog/Einstellungen).',
    areas: ['Einstellungen'],
  },
  {
    id: 'piano-editor', emoji: '🎹', name: 'Klavier (Editor)', category: 'editor',
    desc: 'Noten-Editor-Startsymbol (Song in Noten bearbeiten).',
    areas: ['Editor'],
  },
  {
    id: 'score-editor', emoji: '🎼', name: 'Partitur (Editor)', category: 'editor',
    desc: 'Editor-Bereichs-Symbol (Notensatz).',
    areas: ['Editor'],
  },

  // ═══════════════ STATUS & SYSTEM ═══════════════
  {
    id: 'home', emoji: '🏠', name: 'Haus', category: 'status',
    desc: '„Zurück zum Start"/Hauptmenü (Turnier, Spiegel-Ansichten), Handy-Tab „Start".',
    areas: ['Turnier', 'Handy', 'Medley'],
  },
  {
    id: 'wrench', emoji: '🔧', name: 'Schraubenschlüssel', category: 'status',
    desc: '„Challenge-Mixer" (zufällige Challenge-Kombination), Gameplay-Tab.',
    areas: ['Daily', 'Einstellungen'],
  },
  {
    id: 'boom', emoji: '💥', name: 'Kollision', category: 'status',
    desc: 'Fehler-Boundary: großes Symbol im Absturz-Dialog („Ups, etwas ist schiefgelaufen").',
    areas: ['Fehler'],
  },
  {
    id: 'shower-none', emoji: '🚿', name: 'Dusche (Titel)', category: 'status',
    desc: 'Siehe Erfolge — „Duschen-Sänger" & Titel „Shower Singing Sensation".',
    areas: ['Erfolge', 'Titel'],
  },
  {
    id: 'turtle', emoji: '🐢', name: 'Schildkröte (Medley)', category: 'status',
    desc: 'Siehe Challenges — Slow-Mo-Modifikator & „Slow BPM"-Daily.',
    areas: ['Medley', 'Daily'],
  },

  // ═══════════════ SPRACH-FLAGGEN (translations.ts) ═══════════════
  {
    id: 'flag-gb', emoji: '🇬🇧', name: 'Flagge Großbritannien', category: 'flags',
    desc: 'Sprache „English" — Sprachauswahl (Einstellungen) und Sprach-Gruppierung in der Bibliothek. Wird wo möglich durch flagcdn-Bilder ersetzt (Windows zeigt keine Flaggen-Emojis).',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-de', emoji: '🇩🇪', name: 'Flagge Deutschland', category: 'flags',
    desc: 'Sprache „Deutsch" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-es', emoji: '🇪🇸', name: 'Flagge Spanien', category: 'flags',
    desc: 'Sprache „Español" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-fr', emoji: '🇫🇷', name: 'Flagge Frankreich', category: 'flags',
    desc: 'Sprache „Français" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-it', emoji: '🇮🇹', name: 'Flagge Italien', category: 'flags',
    desc: 'Sprache „Italiano" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-pt', emoji: '🇵🇹', name: 'Flagge Portugal', category: 'flags',
    desc: 'Sprache „Português" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-jp', emoji: '🇯🇵', name: 'Flagge Japan', category: 'flags',
    desc: 'Sprache „日本語" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-kr', emoji: '🇰🇷', name: 'Flagge Südkorea', category: 'flags',
    desc: 'Sprache „한국어" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-cn', emoji: '🇨🇳', name: 'Flagge China', category: 'flags',
    desc: 'Sprache „中文" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-ru', emoji: '🇷🇺', name: 'Flagge Russland', category: 'flags',
    desc: 'Sprache „Русский" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-nl', emoji: '🇳🇱', name: 'Flagge Niederlande', category: 'flags',
    desc: 'Sprache „Nederlands" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-pl', emoji: '🇵🇱', name: 'Flagge Polen', category: 'flags',
    desc: 'Sprache „Polski" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-se', emoji: '🇸🇪', name: 'Flagge Schweden', category: 'flags',
    desc: 'Sprache „Svenska" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-no', emoji: '🇳🇴', name: 'Flagge Norwegen', category: 'flags',
    desc: 'Sprache „Norsk" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-dk', emoji: '🇩🇰', name: 'Flagge Dänemark', category: 'flags',
    desc: 'Sprache „Dansk" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },
  {
    id: 'flag-fi', emoji: '🇫🇮', name: 'Flagge Finnland', category: 'flags',
    desc: 'Sprache „Suomi" — Sprachauswahl und Bibliothek.',
    areas: ['Einstellungen', 'Bibliothek'],
  },

  // ═══════════════ DEKO & TUTORIAL ═══════════════
  {
    id: 'drum-tutorial', emoji: '🥁', name: 'Trommel (Tutorial)', category: 'deco',
    desc: 'Tutorial „Tap-Modus — der Turbo"; Daily/Weekly „Schnelles BPM".',
    areas: ['Tutorial', 'Daily'],
  },
  {
    id: 'graduation-tutorial', emoji: '🎓', name: 'Studentenkappe (Tutorial)', category: 'deco',
    desc: 'Tutorial-Abschluss („Geschafft!").',
    areas: ['Tutorial'],
  },
  {
    id: 'tools', emoji: '🛠️', name: 'Hammer & Schraubenschlüssel', category: 'deco',
    desc: 'Tutorial „Bereit zum Bauen!" (Editor-Tour).',
    areas: ['Tutorial'],
  },
  {
    id: 'party-none', emoji: '🥳', name: 'Party-Gesicht (Deko)', category: 'deco',
    desc: 'Siehe Erfolge — „25 Partys".',
    areas: ['Erfolge'],
  },
  {
    id: 'sparkle-new', emoji: '✨', name: 'Funkeln (Neu-Badge)', category: 'deco',
    desc: '„Neu"-Badge am Party-Modus (kürzlich hinzugefügt).',
    areas: ['Party'],
  },
  {
    id: 'mic-drop', emoji: '🎤', name: 'Mikro (Mic Drop)', category: 'deco',
    desc: 'Titel „Mic Drop Master" (85 Punkte), Rate-my-Song-Challenge „Mic Drop".',
    areas: ['Titel', 'Rate my Song'],
  },
  {
    id: 'note-nailer', emoji: '🎵', name: 'Note (Note Nailer)', category: 'deco',
    desc: 'Titel „Note Nailer" (70 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'broadway', emoji: '🎭', name: 'Masken (Broadway)', category: 'deco',
    desc: 'Titel „Broadway Wannabe" (75 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'royalty', emoji: '👑', name: 'Krone (Royalty)', category: 'deco',
    desc: 'Titel „Karaoke Royalty" (95 Punkte).',
    areas: ['Titel'],
  },
  {
    id: 'virtuoso', emoji: '🌟', name: 'Stern (Virtuoso)', category: 'deco',
    desc: 'Titel „Vocal Virtuoso" (90 Punkte).',
    areas: ['Titel'],
  },
];

/** Zählt Einträge pro Kategorie (für die Filter-Badges). */
export function emojiCountsByCategory(): Record<string, number> {
  const counts: Record<string, number> = { all: EMOJI_CATALOG.length };
  for (const cat of EMOJI_CATEGORIES) {
    if (cat.id === 'all') continue;
    counts[cat.id] = EMOJI_CATALOG.filter((e) => e.category === cat.id).length;
  }
  return counts;
}
