#!/usr/bin/env python3
"""Restore missing functionality to mobile-songs-view.tsx and related files.

Changes:
1. Add onAddToJukebox prop + jukebox button in wizard
2. Add duet indicators (isDuet) in song list items
3. Add playlist action button in wizard step 1 footer
4. Add isDuet to MobileSong + SongSummary types
5. Add isDuet to song sync payload
6. Add missing i18n keys for jukebox
"""

import re
import os

BASE = '/home/z/my-project'

# ============================================================
# 1. Fix mobile-songs-view.tsx
# ============================================================
filepath = os.path.join(BASE, 'src/components/screens/mobile/mobile-songs-view.tsx')
with open(filepath, 'r') as f:
    content = f.read()

# --- 1a. Add onAddToJukebox to interface ---
old_prop = "  onSendSongChallenge?: (_song: MobileSong) => void;"
new_prop = """  onSendSongChallenge?: (_song: MobileSong) => void;
  onAddToJukebox?: (_song: MobileSong) => void;"""
content = content.replace(old_prop, new_prop, 1)

# --- 1b. Add onAddToJukebox to destructuring ---
old_destruct = "  onSendSongChallenge,"
new_destruct = """  onSendSongChallenge,
  onAddToJukebox,"""
content = content.replace(old_destruct, new_destruct, 1)

# --- 1c. Add addedToJukebox state after wizardStep state ---
old_state = "  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);"
new_state = """  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [addedToJukebox, setAddedToJukebox] = useState(false);"""
content = content.replace(old_state, new_state, 1)

# --- 1d. Add addedToJukebox reset effect after wizard reset effect ---
# Find the closing of the wizard reset effect and add jukebox reset after
old_reset = """  // Reset wizard when song options change
  useEffect(() => {
    if (showSongOptions) {
      setWizardStep(0);
    }
  }, [showSongOptions]);"""
new_reset = """  // Reset wizard when song options change
  useEffect(() => {
    if (showSongOptions) {
      setWizardStep(0);
      setAddedToJukebox(false);
    }
  }, [showSongOptions]);"""
content = content.replace(old_reset, new_reset, 1)

# --- 1e. Reset addedToJukebox in closeWizard ---
old_close = """  const closeWizard = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setWizardStep(0);"""
new_close = """  const closeWizard = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setAddedToJukebox(false);
    setWizardStep(0);"""
content = content.replace(old_close, new_close, 1)

# --- 1f. Update feedback step to show jukebox-specific message ---
old_feedback = """              <div className="p-6 text-center">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-white font-bold text-sm">{t('mobileViews.songAddedToQueue')}</p>
                {addedQueuePosition > 0 && (
                  <p className="text-white/50 text-xs mt-1">{t('mobileViews.positionInQueue').replace('{n}', String(addedQueuePosition))}</p>
                )}"""
new_feedback = """              <div className="p-6 text-center">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-white font-bold text-sm">
                  {addedToJukebox ? t('mobileViews.addedToJukebox') : t('mobileViews.songAddedToQueue')}
                </p>
                {!addedToJukebox && addedQueuePosition > 0 && (
                  <p className="text-white/50 text-xs mt-1">{t('mobileViews.positionInQueue').replace('{n}', String(addedQueuePosition))}</p>
                )}"""
content = content.replace(old_feedback, new_feedback, 1)

# --- 1g. Replace game mode grid with jukebox button version ---
old_grid = """                  {/* Game Mode */}
                  <div>
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.gameMode')}</label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                      {(['single', 'duel', 'duet'] as const).map((mode) => {
                        const icons = { single: '🎤', duel: '⚔️', duet: '🎭' };
                        const labels = { single: 'mobileViews.gameModeSingle', duel: 'mobileViews.gameModeDuel', duet: 'mobileViews.gameModeDuet' };
                        const isActive = selectedGameMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => onSelectGameMode(mode)}
                            className={`px-2 py-2 rounded-lg text-center transition-all text-xs ${
                              isActive
                                ? mode === 'single' ? 'bg-cyan-500/30 text-white border border-cyan-500/50'
                                  : mode === 'duel' ? 'bg-red-500/30 text-white border border-red-500/50'
                                  : 'bg-pink-500/30 text-white border border-pink-500/50'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <span className="text-lg block mb-0.5">{icons[mode]}</span>
                            <span className="text-[10px]">{t(labels[mode])}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>"""
new_grid = """                  {/* Game Mode + Jukebox */}
                  <div>
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.gameMode')}</label>
                    <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                      {(['single', 'duel', 'duet'] as const).map((mode) => {
                        const icons: Record<'single' | 'duel' | 'duet', string> = { single: '🎤', duel: '⚔️', duet: '🎭' };
                        const labels: Record<'single' | 'duel' | 'duet', string> = { single: 'mobileViews.gameModeSingle', duel: 'mobileViews.gameModeDuel', duet: 'mobileViews.gameModeDuet' };
                        const isActive = selectedGameMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => onSelectGameMode(mode)}
                            className={`px-2 py-2 rounded-lg text-center transition-all text-xs ${
                              isActive
                                ? mode === 'single' ? 'bg-cyan-500/30 text-white border border-cyan-500/50'
                                  : mode === 'duel' ? 'bg-red-500/30 text-white border border-red-500/50'
                                  : 'bg-pink-500/30 text-white border border-pink-500/50'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <span className="text-lg block mb-0.5">{icons[mode]}</span>
                            <span className="text-[10px]">{t(labels[mode])}</span>
                          </button>
                        );
                      })}
                      {/* Jukebox button */}
                      <button
                        onClick={() => {
                          if (!showSongOptions || !onAddToJukebox) return;
                          onAddToJukebox(showSongOptions);
                          setAddedToJukebox(true);
                          setWizardStep(3);
                        }}
                        disabled={!onAddToJukebox}
                        className="px-2 py-2 rounded-lg text-center transition-all text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-lg block mb-0.5">📻</span>
                        <span className="text-[10px]">{t('mobileViews.jukeboxBtn')}</span>
                      </button>
                    </div>
                  </div>"""
content = content.replace(old_grid, new_grid, 1)

# --- 1h. Add playlist button in Step 1 footer (after addToQueue button) ---
old_footer1 = """                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
                    {t('mobileViews.cancel')}
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                  >
                    + {t('mobileViews.addToQueueBtn')}
                  </button>
                </div>"""
new_footer1 = """                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
                    {t('mobileViews.cancel')}
                  </button>
                  {onPlaylistAction && playlists && playlists.length > 0 && (
                    <button
                      onClick={() => {
                        if (!showSongOptions || !onPlaylistAction) return;
                        onPlaylistAction({ songId: showSongOptions.id, songTitle: showSongOptions.title, songArtist: showSongOptions.artist });
                      }}
                      className="py-2 px-3 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 text-xs font-medium"
                    >
                      📋 {t('mobileViews.addToPlaylistBtn')}
                    </button>
                  )}
                  <button
                    onClick={handleAddToQueue}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                  >
                    + {t('mobileViews.addToQueueBtn')}
                  </button>
                </div>"""
content = content.replace(old_footer1, new_footer1, 1)

# --- 1i. Add duet indicator in song list cover area ---
old_cover = """              {/* Cover */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-white/30" />
                  </div>
                )}
              </div>"""
new_cover = """              {/* Cover */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0 relative">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {song.isDuet ? (
                      <span className="text-lg">🎭</span>
                    ) : (
                      <MusicIcon className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                )}
                {/* Duet badge overlay for songs with cover */}
                {song.isDuet && song.coverImage && (
                  <div className="absolute bottom-0 right-0 bg-pink-500/90 rounded-tl text-[8px] px-1 leading-tight font-bold">🎭</div>
                )}
              </div>"""
content = content.replace(old_cover, new_cover, 1)

with open(filepath, 'w') as f:
    f.write(content)
print(f'[OK] mobile-songs-view.tsx updated ({len(content.splitlines())} lines)')

# ============================================================
# 2. Add isDuet to MobileSong type
# ============================================================
filepath = os.path.join(BASE, 'src/components/screens/mobile/mobile-types.ts')
with open(filepath, 'r') as f:
    content = f.read()

old_song = """export interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}"""
new_song = """export interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
  isDuet?: boolean;
}"""
content = content.replace(old_song, new_song, 1)

with open(filepath, 'w') as f:
    f.write(content)
print('[OK] mobile-types.ts updated')

# ============================================================
# 3. Add isDuet to SongSummary in mobile API types
# ============================================================
filepath = os.path.join(BASE, 'src/app/api/mobile/mobile-types.ts')
with open(filepath, 'r') as f:
    content = f.read()

old_summary = """export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}"""
new_summary = """export interface SongSummary {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
  isDuet?: boolean;
}"""
content = content.replace(old_summary, new_summary, 1)

with open(filepath, 'w') as f:
    f.write(content)
print('[OK] mobile API mobile-types.ts updated')

# ============================================================
# 4. Add isDuet to song sync payload
# ============================================================
filepath = os.path.join(BASE, 'src/hooks/use-song-library-sync.ts')
with open(filepath, 'r') as f:
    content = f.read()

old_sync = """          // Don't send coverImage if it's a blob: URL — companions can't access main app blobs
          coverImage: song.coverImage && !song.coverImage.startsWith('blob:')
            ? song.coverImage
            : undefined,
        }));"""
new_sync = """          // Don't send coverImage if it's a blob: URL — companions can't access main app blobs
          coverImage: song.coverImage && !song.coverImage.startsWith('blob:')
            ? song.coverImage
            : undefined,
          isDuet: song.isDuet || false,
        }));"""
content = content.replace(old_sync, new_sync, 1)

with open(filepath, 'w') as f:
    f.write(content)
print('[OK] use-song-library-sync.ts updated')

# ============================================================
# 5. Wire onAddToJukebox in mobile-client-view.tsx
# ============================================================
filepath = os.path.join(BASE, 'src/components/screens/mobile-client-view.tsx')
with open(filepath, 'r') as f:
    content = f.read()

old_props = """              addedQueuePosition={data.addedQueuePosition}
            />"""
new_props = """              addedQueuePosition={data.addedQueuePosition}
              onAddToJukebox={data.addToJukeboxWishlist}
              clientId={clientId}
              playlists={playlists}
              onPlaylistAction={handlePlaylistAction}
            />"""
content = content.replace(old_props, new_props, 1)

with open(filepath, 'w') as f:
    f.write(content)
print('[OK] mobile-client-view.tsx updated')

# Check if playlists/handlePlaylistAction exist
if 'playlists' not in content or 'handlePlaylistAction' not in content:
    print('[WARN] Need to add playlists state and handlePlaylistAction function to mobile-client-view.tsx')

# ============================================================
# 6. Add i18n keys for jukebox button
# ============================================================
locales = ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt', 'sv', 'no', 'da', 'fi', 'pl', 'ko', 'ja', 'zh', 'ru']

jukebox_translations = {
    'de': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Zur Jukebox hinzugefügt' },
    'en': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Added to Jukebox' },
    'es': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Añadido al Jukebox' },
    'fr': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Ajouté au Jukebox' },
    'it': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Aggiunto al Jukebox' },
    'nl': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Toegevoegd aan Jukebox' },
    'pt': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Adicionado ao Jukebox' },
    'sv': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Tillagd i Jukebox' },
    'no': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Lagt til i Jukebox' },
    'da': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Tilføjet til Jukebox' },
    'fi': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Lisätty Jukeboxiin' },
    'pl': { 'jukeboxBtn': 'Jukebox', 'addedToJukebox': 'Dodano do Jukeboxa' },
    'ko': { 'jukeboxBtn': '주크박스', 'addedToJukebox': '주크박스에 추가됨' },
    'ja': { 'jukeboxBtn': 'ジュークボックス', 'addedToJukebox': 'ジュークボックスに追加' },
    'zh': { 'jukeboxBtn': '点播', 'addedToJukebox': '已添加到点播' },
    'ru': { 'jukeboxBtn': 'Джукбокс', 'addedToJukebox': 'Добавлено в Джукбокс' },
}

for locale in locales:
    filepath = os.path.join(BASE, f'src/lib/i18n/locales/{locale}/mobile.ts')
    if not os.path.exists(filepath):
        print(f'[SKIP] {locale}/mobile.ts not found')
        continue
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    trans = jukebox_translations.get(locale, jukebox_translations['en'])
    
    # Add after addToPlaylistBtn line if it exists
    if 'addToPlaylistBtn' in content:
        old_i18n = f"    addToPlaylistBtn: '{trans['jukeboxBtn']}'"  # reuse for reference
        # Find the addToPlaylistBtn line and add jukebox keys after it
        lines = content.split('\n')
        new_lines = []
        added = False
        for line in lines:
            new_lines.append(line)
            if 'addToPlaylistBtn:' in line and not added:
                new_lines.append(f"    jukeboxBtn: '{trans['jukeboxBtn']}',")
                new_lines.append(f"    addedToJukebox: '{trans['addedToJukebox']}',")
                added = True
        content = '\n'.join(new_lines)
    else:
        # Add near the end of the mobileViews section
        content = content.rstrip()
        if content.endswith('}'):
            content = content[:-1]  # remove last }
            content += f"    jukeboxBtn: '{trans['jukeboxBtn']}',\n    addedToJukebox: '{trans['addedToJukebox']}',\n}}\n"
    
    # Also ensure addToPlaylistBtn exists
    if 'addToPlaylistBtn' not in content:
        content = content.rstrip()
        if content.endswith('}'):
            content = content[:-1]
            content += f"    addToPlaylistBtn: '{trans.get('jukeboxBtn', 'Jukebox')}',\n}}\n"
    
    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[OK] {locale}/mobile.ts updated')

print('\n[DONE] All files updated successfully')