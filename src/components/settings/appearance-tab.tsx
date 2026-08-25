'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Theme } from '@/lib/game/themes';
import { THEMES } from '@/lib/game/themes';
import { NOTE_COLOR_PROFILES } from '@/lib/game/note-color-profiles';
import { PaletteIcon } from '@/components/settings/settings-icons';
import { StorageKeys, setItem, setBool, getString, getBool } from '@/lib/storage';

interface AppearanceTabProps {
  bgVideo: boolean;
  setBgVideo: (_value: boolean) => void;
  useAnimatedBg: boolean;
  setUseAnimatedBg: (_value: boolean) => void;
  currentThemeId: string;
  handleThemeChange: (_theme: Theme) => void;
  lyricsStyle: string;
  setLyricsStyle: (_value: string) => void;
  lyricsSize: string;
  setLyricsSize: (_value: string) => void;
  performanceMode: 'full' | 'low';
  setPerformanceMode: (_value: 'full' | 'low') => void;
  noteColorProfile: string;
  setNoteColorProfile: (_value: string) => void;
  tx: (_key: string) => string;
  setHasChanges: (_value: boolean) => void;
}

export function AppearanceTab({
  bgVideo,
  setBgVideo,
  useAnimatedBg,
  setUseAnimatedBg,
  currentThemeId,
  handleThemeChange,
  lyricsStyle,
  setLyricsStyle,
  lyricsSize,
  setLyricsSize,
  performanceMode,
  setPerformanceMode,
  noteColorProfile,
  setNoteColorProfile,
  tx,
  setHasChanges,
}: AppearanceTabProps) {
  const isLowPerf = performanceMode === 'low';

  const saveSetting = (key: string, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setBool(key, value);
    } else {
      setItem(key, value);
    }
    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { [key]: value } }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Performance Mode */}
      <Card className={`bg-white/5 border-white/10 ${isLowPerf ? 'border-orange-500/50' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            {tx('settingsGraphicSound.performanceMode')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.performanceModeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settingsGraphicSound.lowPerfMode')}</h4>
              <p className="text-sm text-white/60">{tx('settingsGraphicSound.lowPerfModeDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = isLowPerf ? 'full' : 'low';
                setPerformanceMode(newValue);
                setItem(StorageKeys.PERFORMANCE_MODE, newValue);
                window.dispatchEvent(new CustomEvent('settingsChange', { detail: { performanceMode: newValue } }));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                isLowPerf ? 'bg-orange-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isLowPerf ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          {isLowPerf && (
            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm space-y-1">
              <p className="font-medium text-orange-300">{tx('settingsGraphicSound.lowPerfFeatures')}</p>
              <ul className="text-white/60 space-y-0.5 ml-4 list-disc">
                <li>{tx('settingsGraphicSound.featureSplitScreen')}</li>
                <li>{tx('settingsGraphicSound.featureNoteStyles')}</li>
                <li>{tx('settingsGraphicSound.featureAccuracy')}</li>
                <li>{tx('settingsGraphicSound.featureParticles')}</li>
                <li>{tx('settingsGraphicSound.featureSpectrogram')}</li>
                <li>{tx('settingsGraphicSound.featureComboFire')}</li>
                <li>{tx('settingsGraphicSound.featureScorePopups')}</li>
                <li>{tx('settingsGraphicSound.featureWebcam')}</li>
                <li>{tx('settingsGraphicSound.featureAnimatedBg')}</li>
                <li>{tx('settingsGraphicSound.featureYoutubeBg')}</li>
                <li>{tx('settingsGraphicSound.featureEnergyViz')}</li>
              </ul>
              <p className="text-white/80 mt-2 font-medium">{tx('settingsGraphicSound.remainAvailable')}</p>
              <ul className="text-green-400/80 space-y-0.5 ml-4 list-disc">
                <li>{tx('settingsGraphicSound.remainCore')}</li>
                <li>{tx('settingsGraphicSound.remainPitch')}</li>
                <li>{tx('settingsGraphicSound.remainLyrics')}</li>
                <li>{tx('settingsGraphicSound.remainPractice')}</li>
                <li>{tx('settingsGraphicSound.remainAudioEffects')}</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Video Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            {tx('settingsGraphicSound.videoSettings')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.videoSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
              <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => { setBgVideo(!bgVideo); saveSetting(StorageKeys.BG_VIDEO, !bgVideo); }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${bgVideo ? 'bg-cyan-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settingsGraphicSound.animatedBackground')}</h4>
              <p className="text-sm text-white/60">{tx('settingsGraphicSound.animatedBackgroundDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => { const v = !useAnimatedBg; setUseAnimatedBg(v); saveSetting(StorageKeys.ANIMATED_BG, v); }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${useAnimatedBg ? 'bg-purple-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${useAnimatedBg ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text">
            <PaletteIcon className="w-5 h-5 text-purple-400" />
            {tx('settings.themeSettings')}
          </CardTitle>
          <CardDescription className="theme-adaptive-text-secondary">{tx('settings.themeSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm theme-adaptive-text-secondary mb-3 block">{tx('settings.colorTheme')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleThemeChange(theme)}
                  className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${
                    currentThemeId === theme.id
                      ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="w-full h-8 rounded-lg mb-2" style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }} />
                  <span className="text-sm font-medium theme-adaptive-text">{theme.name}</span>
                  <p className="text-xs theme-adaptive-text-secondary truncate">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Note Color Profiles */
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">{'\u{1F3B6}'}</span>
            {tx('settings.noteColorProfile') || 'Note Colors'}
          </CardTitle>
          <CardDescription>{tx('settings.noteColorProfileDesc') || 'Choose a color palette for the note bars during gameplay'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {NOTE_COLOR_PROFILES.map((prof) => (
              <button
                key={prof.id}
                type="button"
                onClick={() => {
                  setNoteColorProfile(prof.id);
                  saveSetting(StorageKeys.NOTE_COLOR_PROFILE, prof.id);
                }}
                className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer ${
                  noteColorProfile === prof.id
                    ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/50'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="w-full h-6 rounded-lg mb-2 flex overflow-hidden">
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Perfect }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Great }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Good }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Okay }} />
                </div>
                <span className="text-sm font-medium theme-adaptive-text">{prof.name}</span>
                <p className="text-xs theme-adaptive-text-secondary truncate">{prof.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lyrics Display Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settingsGraphicSound.lyricsDisplay')}</CardTitle>
          <CardDescription>{tx('settingsGraphicSound.lyricsDisplayDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium">{tx('settings.lyricsStyle')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'classic', name: tx('settingsGraphicSound.lyricsClassic') },
                { id: 'concert', name: tx('settingsGraphicSound.lyricsConcert') },
                { id: 'retro', name: tx('settingsGraphicSound.lyricsRetro') },
                { id: 'neon', name: tx('settingsGraphicSound.lyricsNeon') },
                { id: 'minimal', name: tx('settingsGraphicSound.lyricsMinimal') },
                { id: 'sunset', name: tx('settingsGraphicSound.lyricsSunset') },
                { id: 'ocean', name: tx('settingsGraphicSound.lyricsOcean') },
                { id: 'fire', name: tx('settingsGraphicSound.lyricsFire') },
                { id: 'disco', name: tx('settingsGraphicSound.lyricsDisco') },
                { id: 'synthwave', name: tx('settingsGraphicSound.lyricsSynthwave') },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => { setLyricsStyle(style.id); saveSetting(StorageKeys.LYRICS_STYLE, style.id); }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                    lyricsStyle === style.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">{tx('settingsGraphicSound.lyricsSize')}</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'small', name: tx('settingsGraphicSound.lyricsSizeSmall') },
                { id: 'medium', name: tx('settingsGraphicSound.lyricsSizeMedium') },
                { id: 'large', name: tx('settingsGraphicSound.lyricsSizeLarge') },
              ].map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => { setLyricsSize(size.id); saveSetting(StorageKeys.LYRICS_SIZE, size.id); }}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm cursor-pointer ${
                    lyricsSize === size.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {size.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40">{tx('settingsGraphicSound.lyricsSizeDesc')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
