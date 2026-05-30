'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Theme } from '@/lib/game/themes';
import { THEMES } from '@/lib/game/themes';
import { PaletteIcon } from '@/components/settings/settings-icons';
import { StorageKeys, setItem, setBool, getString, getBool } from '@/lib/storage';

interface AppearanceTabProps {
  bgVideo: boolean;
  setBgVideo: (_value: boolean) => void;
  useAnimatedBg: boolean;
  setUseAnimatedBg: (_value: boolean) => void;
  currentThemeId: string;
  handleThemeChange: (_theme: Theme) => void;
  noteDisplayStyle: string;
  setNoteDisplayStyle: (_value: string) => void;
  noteShapeStyle: string;
  setNoteShapeStyle: (_value: string) => void;
  lyricsStyle: string;
  setLyricsStyle: (_value: string) => void;
  lyricsSize: string;
  setLyricsSize: (_value: string) => void;
  performanceMode: 'full' | 'low';
  setPerformanceMode: (_value: 'full' | 'low') => void;
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
  noteDisplayStyle,
  setNoteDisplayStyle,
  noteShapeStyle,
  setNoteShapeStyle,
  lyricsStyle,
  setLyricsStyle,
  lyricsSize,
  setLyricsSize,
  performanceMode,
  setPerformanceMode,
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
      <Card className={`bg-[#2a1a3e] border-[3px] border-black ${isLowPerf ? 'border-[#FC6B48]' : ''}`} style={{ boxShadow: '4px 4px 0px #6B2E77' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            {tx('settingsGraphicSound.performanceMode')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.performanceModeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#1a0a2e] rounded-lg border-[2px] border-black">
            <div>
              <h4 className="font-medium text-[#FDE601]" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>{tx('settingsGraphicSound.lowPerfMode')}</h4>
              <p className="text-sm text-[#c0b8d0]">{tx('settingsGraphicSound.lowPerfModeDesc')}</p>
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
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer border-[2px] border-black ${
                isLowPerf ? 'bg-[#FC6B48]' : 'bg-[#c0b8d0]'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${isLowPerf ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          {isLowPerf && (
            <div className="p-3 bg-[#FC6B48]/10 border-[2px] border-[#FC6B48] rounded-lg text-sm space-y-1">
              <p className="font-medium text-[#FC6B48]">{tx('settingsGraphicSound.lowPerfFeatures')}</p>
              <ul className="text-[#c0b8d0] space-y-0.5 ml-4 list-disc">
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
              <ul className="text-[#00F3B2] space-y-0.5 ml-4 list-disc">
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
      <Card className="bg-[#2a1a3e] border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #00F3B2' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#FDFEFD]" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>
            <svg className="w-5 h-5 text-[#00F3B2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" />
            </svg>
            {tx('settingsGraphicSound.videoSettings')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.videoSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#1a0a2e] rounded-lg border-[2px] border-black">
            <div>
              <h4 className="font-medium text-[#FDFEFD]">{tx('settings.backgroundVideo')}</h4>
              <p className="text-sm text-[#c0b8d0]">{tx('settings.backgroundVideoDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => { setBgVideo(!bgVideo); saveSetting(StorageKeys.BG_VIDEO, !bgVideo); }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer border-[2px] border-black ${bgVideo ? 'bg-[#00F3B2]' : 'bg-[#c0b8d0]'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white border-[1px] border-black transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-[#1a0a2e] rounded-lg border-[2px] border-black">
            <div>
              <h4 className="font-medium text-[#FDFEFD]">{tx('settingsGraphicSound.animatedBackground')}</h4>
              <p className="text-sm text-[#c0b8d0]">{tx('settingsGraphicSound.animatedBackgroundDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => { const v = !useAnimatedBg; setUseAnimatedBg(v); saveSetting(StorageKeys.ANIMATED_BG, v); }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer border-[2px] border-black ${useAnimatedBg ? 'bg-[#6B2E77]' : 'bg-[#c0b8d0]'}`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white border-[1px] border-black transition-all ${useAnimatedBg ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card className="bg-[#2a1a3e] border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #F939A3' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 theme-adaptive-text" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>
            <PaletteIcon className="w-5 h-5 text-[#6B2E77]" />
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
                  className={`p-3 rounded-xl border-[3px] border-black transition-all hover:scale-105 cursor-pointer ${
                    currentThemeId === theme.id
                      ? 'bg-[#00F3B2]/20 ring-2 ring-[#00F3B2]/50'
                      : 'bg-[#1a0a2e] hover:border-[#c0b8d0]'
                  }`}
                  style={{ boxShadow: currentThemeId === theme.id ? '3px 3px 0px #00F3B2' : '3px 3px 0px #6B2E77' }}
                >
                  <div className="w-full h-8 rounded-lg mb-2 border-[2px] border-black" style={{ background: theme.colors.primary }} />
                  <span className="text-sm font-medium theme-adaptive-text">{theme.name}</span>
                  <p className="text-xs theme-adaptive-text-secondary truncate">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Note Display Style */}
          <div className={isLowPerf ? 'opacity-40 pointer-events-none' : ''}>
            <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settingsGraphicSound.noteDisplay')} {isLowPerf && <span>({tx('settingsGraphicSound.lowPerfNote')})</span>}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'classic', name: tx('settingsGraphicSound.noteStyleClassic'), icon: '➡️', desc: tx('settingsGraphicSound.noteStyleUltraStar') },
                { id: 'fill-level', name: tx('settingsGraphicSound.noteStyleFill'), icon: '📊', desc: tx('settingsGraphicSound.noteStyleGaps') },
                { id: 'color-feedback', name: tx('settingsGraphicSound.noteStyleColor'), icon: '🎨', desc: tx('settingsGraphicSound.noteStyleColorDesc') },
                { id: 'glow-intensity', name: tx('settingsGraphicSound.noteStyleGlow'), icon: '✨', desc: tx('settingsGraphicSound.noteStyleGlowDesc') },
                { id: 'hit-fill', name: tx('settingsGraphicSound.noteStyleHitFill'), icon: '🥊', desc: tx('settingsGraphicSound.noteStyleHitFillDesc') },
                { id: 'trail-effect', name: tx('settingsGraphicSound.noteStyleTrail'), icon: '🌌', desc: tx('settingsGraphicSound.noteStyleTrailDesc') },
                { id: 'retro-bars', name: tx('settingsGraphicSound.noteStyleRetroBars'), icon: '🕹️', desc: tx('settingsGraphicSound.noteStyleRetroBarsDesc') },
                { id: 'particle-fade', name: tx('settingsGraphicSound.noteStyleParticleFade'), icon: '💫', desc: tx('settingsGraphicSound.noteStyleParticleFadeDesc') },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => { setNoteDisplayStyle(style.id); saveSetting(StorageKeys.NOTE_STYLE, style.id); }}
                  className={`p-3 rounded-lg border-[3px] border-black transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteDisplayStyle === style.id
                      ? 'border-[#00F3B2] bg-[#00F3B2]/20 text-[#00F3B2]'
                      : 'bg-[#1a0a2e] hover:border-[#c0b8d0] theme-adaptive-text'
                  }`}
                  style={{ boxShadow: noteDisplayStyle === style.id ? '3px 3px 0px #00F3B2' : '3px 3px 0px #6B2E77' }}
                >
                  <span className="text-lg">{style.icon}</span>
                  <span className="font-medium">{style.name}</span>
                  <span className="text-xs theme-adaptive-text-secondary">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Shape Style */}
          <div className={isLowPerf ? 'opacity-40 pointer-events-none' : ''}>
            <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settingsGraphicSound.noteShape')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'rounded', name: tx('settingsGraphicSound.shapeRounded'), icon: '🔵', desc: tx('settingsGraphicSound.shapeRectangle') },
                { id: 'sharp', name: tx('settingsGraphicSound.shapeAngular'), icon: '🔷', desc: tx('settingsGraphicSound.shapeAngularDesc') },
                { id: 'pill', name: tx('settingsGraphicSound.shapePill'), icon: '💊', desc: tx('settingsGraphicSound.shapePillDesc') },
                { id: 'music-note', name: tx('settingsGraphicSound.shapeMusicNote'), icon: '♪', desc: tx('settingsGraphicSound.shapeMusicNoteDesc') },
                { id: 'star', name: tx('settingsGraphicSound.shapeStar'), icon: '⭐', desc: tx('settingsGraphicSound.shapeStarDesc') },
                { id: 'circle', name: tx('settingsGraphicSound.shapeCircle'), icon: '⭕', desc: tx('settingsGraphicSound.shapeCircleDesc') },
                { id: 'hexagon', name: tx('settingsGraphicSound.shapeHexagon'), icon: '⬡', desc: tx('settingsGraphicSound.shapeHexagonDesc') },
                { id: 'triangle', name: tx('settingsGraphicSound.shapeTriangle'), icon: '◀', desc: tx('settingsGraphicSound.shapeTriangleDesc') },
              ].map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => { setNoteShapeStyle(shape.id); saveSetting(StorageKeys.NOTE_SHAPE, shape.id); }}
                  className={`p-3 rounded-lg border-[3px] border-black transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteShapeStyle === shape.id
                      ? 'border-[#6B2E77] bg-[#6B2E77]/20 text-[#BA279D]'
                      : 'bg-[#1a0a2e] hover:border-[#c0b8d0] theme-adaptive-text'
                  }`}
                  style={{ boxShadow: noteShapeStyle === shape.id ? '3px 3px 0px #6B2E77' : '3px 3px 0px #F939A3' }}
                >
                  <span className="text-lg">{shape.icon}</span>
                  <span className="font-medium">{shape.name}</span>
                  <span className="text-xs theme-adaptive-text-secondary">{shape.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lyrics Display Settings */}
      <Card className="bg-[#2a1a3e] border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #FDE601' }}>
        <CardHeader>
          <CardTitle className="text-[#FDFEFD]" style={{ WebkitTextStroke: '0.5px #000', paintOrder: 'stroke fill' }}>{tx('settingsGraphicSound.lyricsDisplay')}</CardTitle>
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
                  className={`px-3 py-2 rounded-lg border-[3px] border-black transition-all text-sm cursor-pointer ${
                    lyricsStyle === style.id
                      ? 'border-[#6B2E77] bg-[#6B2E77]/20 text-[#BA279D]'
                      : 'bg-[#1a0a2e] hover:border-[#c0b8d0] text-white'
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
                  className={`px-3 py-2 rounded-lg border-[3px] border-black transition-all text-sm cursor-pointer ${
                    lyricsSize === size.id
                      ? 'border-[#00F3B2] bg-[#00F3B2]/20 text-[#00F3B2]'
                      : 'bg-[#1a0a2e] hover:border-[#c0b8d0] text-white'
                  }`}
                >
                  {size.name}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#c0b8d0]">{tx('settingsGraphicSound.lyricsSizeDesc')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
