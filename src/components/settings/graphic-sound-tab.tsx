'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Theme } from '@/lib/game/themes';
import { THEMES } from '@/lib/game/themes';
import { MusicIcon, PaletteIcon } from '@/components/settings/settings-icons';
import { AudioOutputSection } from '@/components/settings/audio-output-section';
import { StorageKeys, setItem, setBool } from '@/lib/storage';

interface GraphicSoundTabProps {
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
  previewVolume: number;
  setPreviewVolume: (_value: number) => void;
  micSensitivity: number;
  setMicSensitivity: (_value: number) => void;
  lyricsStyle: string;
  setLyricsStyle: (_value: string) => void;
  performanceMode: 'full' | 'low';
  setPerformanceMode: (value: 'full' | 'low') => void;
  tx: (_key: string) => string;
  setHasChanges: (_value: boolean) => void;
}

export function GraphicSoundTab({
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
  previewVolume,
  setPreviewVolume,
  micSensitivity,
  setMicSensitivity,
  lyricsStyle,
  setLyricsStyle,
  performanceMode,
  setPerformanceMode,
  tx,
  setHasChanges,
}: GraphicSoundTabProps) {
  const isLowPerf = performanceMode === 'low';
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

      {/* Audio Output / ASIO Device Selection */}
      <AudioOutputSection />

      {/* Video Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MusicIcon className="w-5 h-5 text-cyan-400" />
            {tx('settingsGraphicSound.videoSettings')}
          </CardTitle>
          <CardDescription>{tx('settingsGraphicSound.videoSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Background Video Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settings.backgroundVideo')}</h4>
              <p className="text-sm text-white/60">{tx('settings.backgroundVideoDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBgVideo(!bgVideo);
                setBool(StorageKeys.BG_VIDEO, !bgVideo);
                window.dispatchEvent(new CustomEvent('settingsChange'));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                bgVideo ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${bgVideo ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
          
          {/* Animated Background Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settingsGraphicSound.animatedBackground')}</h4>
              <p className="text-sm text-white/60">{tx('settingsGraphicSound.animatedBackgroundDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newValue = !useAnimatedBg;
                setUseAnimatedBg(newValue);
                setBool(StorageKeys.ANIMATED_BG, newValue);
                window.dispatchEvent(new CustomEvent('settingsChange', { detail: { useAnimatedBackground: newValue } }));
                setHasChanges(true);
              }}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                useAnimatedBg ? 'bg-purple-500' : 'bg-white/20'
              }`}
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
          {/* Theme Presets from themes.ts */}
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
                  <div 
                    className="w-full h-8 rounded-lg mb-2"
                    style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})` }}
                  />
                  <span className="text-sm font-medium theme-adaptive-text">{theme.name}</span>
                  <p className="text-xs theme-adaptive-text-secondary truncate">{theme.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Note Display Style — disabled in low-performance mode */}
          <div className={isLowPerf ? 'opacity-40 pointer-events-none' : ''}>
            <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settingsGraphicSound.noteDisplay')} {isLowPerf && <span>({tx('settingsGraphicSound.lowPerfNote')})</span>}</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'classic', name: tx('settingsGraphicSound.noteStyleClassic'), icon: '➡️', desc: tx('settingsGraphicSound.noteStyleUltraStar') },
                { id: 'fill-level', name: tx('settingsGraphicSound.noteStyleFill'), icon: '📊', desc: tx('settingsGraphicSound.noteStyleGaps') },
                { id: 'color-feedback', name: tx('settingsGraphicSound.noteStyleColor'), icon: '🎨', desc: tx('settingsGraphicSound.noteStyleColorDesc') },
                { id: 'glow-intensity', name: tx('settingsGraphicSound.noteStyleGlow'), icon: '✨', desc: tx('settingsGraphicSound.noteStyleGlowDesc') },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setNoteDisplayStyle(style.id);
                    setItem(StorageKeys.NOTE_STYLE, style.id);
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteDisplayStyle: style.id } }));
                    setHasChanges(true);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteDisplayStyle === style.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                  }`}
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
                { id: 'diamond', name: tx('settingsGraphicSound.shapeDiamond'), icon: '💎', desc: tx('settingsGraphicSound.shapeDiamondDesc') },
              ].map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    setNoteShapeStyle(shape.id);
                    setItem(StorageKeys.NOTE_SHAPE, shape.id);
                    window.dispatchEvent(new CustomEvent('settingsChange', { detail: { noteShapeStyle: shape.id } }));
                    setHasChanges(true);
                  }}
                  className={`p-3 rounded-lg border-2 transition-all text-sm cursor-pointer flex flex-col items-center gap-1 ${
                    noteShapeStyle === shape.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 hover:border-white/30 theme-adaptive-text'
                  }`}
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
      
      {/* Audio Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settings.audioSettings')}</CardTitle>
          <CardDescription>{tx('settings.audioSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview Volume */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">{tx('settings.previewVolume')}</label>
              <span className="text-sm text-cyan-400">{previewVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={previewVolume}
              onChange={(e) => {
                setPreviewVolume(parseInt(e.target.value));
                setHasChanges(true);
              }}
              className="w-full accent-cyan-500"
            />
          </div>
          
          {/* Mic Sensitivity */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium">{tx('settings.micSensitivity')}</label>
              <span className="text-sm text-cyan-400">{micSensitivity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={micSensitivity}
              onChange={(e) => {
                setMicSensitivity(parseInt(e.target.value));
                setHasChanges(true);
              }}
              className="w-full accent-purple-500"
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Lyrics Display Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settingsGraphicSound.lyricsDisplay')}</CardTitle>
          <CardDescription>{tx('settingsGraphicSound.lyricsDisplayDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="text-sm text-white/60 mb-2 block">{tx('settings.lyricsStyle')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'classic', name: tx('settingsGraphicSound.lyricsClassic') },
                { id: 'concert', name: tx('settingsGraphicSound.lyricsConcert') },
                { id: 'retro', name: tx('settingsGraphicSound.lyricsRetro') },
                { id: 'neon', name: tx('settingsGraphicSound.lyricsNeon') },
                { id: 'minimal', name: tx('settingsGraphicSound.lyricsMinimal') },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setLyricsStyle(style.id);
                    setHasChanges(true);
                  }}
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
        </CardContent>
      </Card>
    </div>
  );
}
