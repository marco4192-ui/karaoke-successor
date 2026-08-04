#!/usr/bin/env python3
"""Add missing mobile.mirror* translation keys to all 16 locale mobile.ts files."""

import re
import os

BASE = '/home/z/my-project/karaoke-successor/src/lib/i18n/locales'

# All keys that need to be added under the `mobile` object
NEW_KEYS_EN = {
    'mirrorResults': 'Results',
    'mirrorNoResults': 'No results yet. Play a song first!',
    'mirrorLastPlayed': 'Last Played',
    'mirrorPoints': 'Points',
    'mirrorAccuracy': 'Accuracy',
    'mirrorMaxCombo': 'Max Combo',
    'mirrorRating': 'Rating',
    'mirrorQueue': 'Queue',
    'mirrorQueueEmpty': 'Queue is empty',
    'mirrorQueueEmptyHint': 'Add songs from the library to get started',
    'mirrorJukebox': 'Jukebox',
    'mirrorJukeboxEmpty': 'Jukebox wishlist is empty',
    'mirrorJukeboxEmptyHint': 'Songs will appear here when added from the desktop',
    'mirrorSettings': 'Settings',
    'mirrorSettingsDesc': 'Select a category to open it on the desktop',
    'mirrorOpenOnDesktop': 'Open on Desktop',
    'mirrorHighscores': 'Highscores',
    'mirrorDailyChallenge': 'Daily Challenge',
    'mirrorPartyMode': 'Party Mode',
    'mirrorAchievements': 'Achievements',
    'mirrorComingSoon': 'This feature will be available here soon.',
    'mirrorNowPlaying': 'Now Playing',
    'mirrorPaused': 'Paused',
    'mirrorNoSong': 'No song playing',
    'mirrorScoreComingSoon': 'Live scoring coming soon',
    'mirrorScoreHint': 'Your score will appear here during the song',
    'mirrorLiveScores': 'Live Scores',
    'mirrorSetupWaiting': 'Setting Up...',
    'mirrorSetupWaitingDesc': 'The desktop is configuring the next game. Please wait.',
    'mirrorAcquireRemote': 'Take Control',
    'mirrorRemoteActive': 'Control active',
    'mirrorRemoteLockedBy': 'Controlled by {name}',
    'mirrorReleaseControl': 'Release',
    'mirrorSing': 'Sing',
    'mirrorSongs': 'Songs',
    'mirrorGameMode': 'Game Mode',
    'mirrorChat': 'Chat',
    'mirrorShowAll': 'Show all',
    'queueSlotRemaining': '{n} slot remaining',
    'queueSlotsRemaining': '{n} slots remaining',
    # Settings descriptions
    'mirrorSettingsDescGeneral': 'Language, difficulty, pitch display',
    'mirrorSettingsDescGameplay': 'Scoring options, timings, assists',
    'mirrorSettingsDescAppearance': 'Theme, lyrics style, background',
    'mirrorSettingsDescGraphicSound': 'Volume, microphone, YouTube',
    'mirrorSettingsDescMicrophone': 'Input, sensitivity, presets',
    'mirrorSettingsDescMobile': 'Connected devices, remote control',
    'mirrorSettingsDescWebcam': 'Background camera settings',
    'mirrorSettingsDescLibrary': 'Song folders, scanning, reset',
    'mirrorSettingsDescAbout': 'Version, credits, licenses',
    # Jukebox
    'mirrorJukeboxStart': 'Start Jukebox',
    'mirrorSong': 'Song',
    'mirrorSongsplural': 'Songs',
    # Profile
    'mirrorProfileNoProfiles': 'No profiles on the desktop',
    'mirrorProfileActiveCount': '{active} of {total} active',
    'mirrorProfileActive': 'Active',
    'mirrorProfileInactive': 'Inactive',
    'mirrorProfileSyncNote': 'Changes are applied immediately on the desktop',
}

# DE translations
NEW_KEYS_DE = {
    'mirrorResults': 'Ergebnisse',
    'mirrorNoResults': 'Noch keine Ergebnisse. Spiele zuerst einen Song!',
    'mirrorLastPlayed': 'Zuletzt gespielt',
    'mirrorPoints': 'Punkte',
    'mirrorAccuracy': 'Genauigkeit',
    'mirrorMaxCombo': 'Max. Combo',
    'mirrorRating': 'Bewertung',
    'mirrorQueue': 'Warteschlange',
    'mirrorQueueEmpty': 'Warteschlange ist leer',
    'mirrorQueueEmptyHint': 'Füge Songs aus der Bibliothek hinzu, um zu starten',
    'mirrorJukebox': 'Jukebox',
    'mirrorJukeboxEmpty': 'Jukebox-Wunschliste ist leer',
    'mirrorJukeboxEmptyHint': 'Songs erscheinen hier, wenn sie vom Desktop hinzugefügt werden',
    'mirrorSettings': 'Einstellungen',
    'mirrorSettingsDesc': 'Wähle eine Kategorie, um sie auf dem Desktop zu öffnen',
    'mirrorOpenOnDesktop': 'Auf Desktop öffnen',
    'mirrorHighscores': 'Highscores',
    'mirrorDailyChallenge': 'Tägliche Herausforderung',
    'mirrorPartyMode': 'Party-Modus',
    'mirrorAchievements': 'Erfolge',
    'mirrorComingSoon': 'Dieses Feature wird hier bald verfügbar sein.',
    'mirrorNowPlaying': 'Jetzt läuft',
    'mirrorPaused': 'Pausiert',
    'mirrorNoSong': 'Kein Song aktiv',
    'mirrorScoreComingSoon': 'Live-Punkte kommen bald',
    'mirrorScoreHint': 'Deine Punkte erscheinen hier während des Songs',
    'mirrorLiveScores': 'Live-Punkte',
    'mirrorSetupWaiting': 'Wird eingerichtet...',
    'mirrorSetupWaitingDesc': 'Der Desktop konfiguriert das nächste Spiel. Bitte warten.',
    'mirrorAcquireRemote': 'Steuerung übernehmen',
    'mirrorRemoteActive': 'Steuerung aktiv',
    'mirrorRemoteLockedBy': 'Gesteuert von {name}',
    'mirrorReleaseControl': 'Freigeben',
    'mirrorSing': 'Singen',
    'mirrorSongs': 'Lieder',
    'mirrorGameMode': 'Spielmodus',
    'mirrorChat': 'Chat',
    'mirrorShowAll': 'Alle anzeigen',
    'queueSlotRemaining': '{n} Platz frei',
    'queueSlotsRemaining': '{n} Plätze frei',
    'mirrorSettingsDescGeneral': 'Sprache, Schwierigkeit, Tonhöhenanzeige',
    'mirrorSettingsDescGameplay': 'Scoring-Optionen, Timings, Hilfen',
    'mirrorSettingsDescAppearance': 'Theme, Lyrics-Stil, Hintergrund',
    'mirrorSettingsDescGraphicSound': 'Lautstärke, Mikrofon, YouTube',
    'mirrorSettingsDescMicrophone': 'Eingang, Empfindlichkeit, Presets',
    'mirrorSettingsDescMobile': 'Verbundene Geräte, Fernsteuerung',
    'mirrorSettingsDescWebcam': 'Hintergrund-Kamera-Einstellungen',
    'mirrorSettingsDescLibrary': 'Song-Ordner, Scannen, Zurücksetzen',
    'mirrorSettingsDescAbout': 'Version, Credits, Lizenzen',
    'mirrorJukeboxStart': 'Jukebox starten',
    'mirrorSong': 'Song',
    'mirrorSongsplural': 'Songs',
    'mirrorProfileNoProfiles': 'Keine Profile auf dem Desktop vorhanden',
    'mirrorProfileActiveCount': '{active} von {total} aktiv',
    'mirrorProfileActive': 'Aktiv',
    'mirrorProfileInactive': 'Inaktiv',
    'mirrorProfileSyncNote': 'Änderungen werden sofort auf dem Desktop übernommen',
}

# For other languages, use EN as fallback (we'll add a TODO comment)
LANGS = ['en','de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi']

def get_translations_for_lang(lang):
    if lang == 'de':
        return NEW_KEYS_DE
    return NEW_KEYS_EN

def patch_mobile_file(filepath, new_keys):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the closing `};` of the mobileTranslations export
    # We need to insert before the final closing of the object
    
    # Strategy: find the `mobile: {` block's closing and insert keys there
    # The mobile object ends with the last key before `mobileClient:` or the closing `};`
    
    # Find all existing keys in the mobile section
    # We'll insert new keys right before the closing of the mobile object
    
    # Find the pattern: the last entry in `mobile: { ... }` before `mobileClient:`
    # or before `};` if mobileClient doesn't follow
    
    # Actually simpler: find the line with `tournamentVoteDesc:` (last key in mobile)
    # and insert after it
    
    # Find the last key-value pair in the mobile section
    # Look for `tournamentVoteDesc:` which is the last known key
    match = re.search(r'tournamentVoteDesc:\s*["\']([^"\']*)["\']', content)
    if not match:
        print(f"  WARNING: Could not find tournamentVoteDesc in {filepath}")
        return False
    
    # Build the insertion text
    lines = []
    lines.append('')
    lines.append('    // --- Mirror view translations ---')
    for key, value in new_keys.items():
        lines.append(f"    {key}: '{value}',")
    
    insertion = '\n'.join(lines)
    
    # Insert after the tournamentVoteDesc line
    pos = match.end()
    content = content[:pos] + ',' + insertion + content[pos:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

count = 0
for lang in LANGS:
    filepath = os.path.join(BASE, lang, 'mobile.ts')
    if not os.path.exists(filepath):
        print(f"  SKIP: {filepath} not found")
        continue
    
    keys = get_translations_for_lang(lang)
    if patch_mobile_file(filepath, keys):
        count += 1
        print(f"  PATCHED: {lang}/mobile.ts ({len(keys)} keys)")
    else:
        print(f"  FAILED:  {lang}/mobile.ts")

print(f"\nDone! Patched {count}/{len(LANGS)} locale files.")
