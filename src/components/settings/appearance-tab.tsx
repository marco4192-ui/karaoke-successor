'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Theme } from '@/lib/game/themes';
import { THEMES } from '@/lib/game/themes';
import {
  NOTE_COLOR_PROFILES,
  NoteDisplayMode,
  SEALED_HIT_COLOR_PRESETS,
  DEFAULT_SEALED_HIT_COLOR,
  SEALED_MISS_COLOR,
  SEALED_GOLD_COLOR,
  EXACT_NOTE_COLORS,
} from '@/lib/game/note-color-profiles';
import { PaletteIcon } from '@/components/settings/settings-icons';
import { StorageKeys, setItem, setBool } from '@/lib/storage';

// ═══════════════════════════════════════════════════════════════
//  NOTE DISPLAY PREVIEWS (mirror the real note-bar rendering)
// ═══════════════════════════════════════════════════════════════

/** Sealed-mode preview bar: gold + hit + hit + miss + hit segments.
 *  key={hitColor} re-mounts on change → re-plays the heat-seal animation. */
function SealedNotePreview({ hitColor, tx }: { hitColor: string; tx: (_k: string) => string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2.5" data-testid="sealed-note-preview">
      <div className="flex h-8 rounded-md overflow-hidden gap-[2px]" key={hitColor}>
        <div className="note-seal-seg flex-[1.2]" style={{ backgroundColor: SEALED_GOLD_COLOR }} title={tx('settings.previewGolden')} />
        <div className="note-seal-seg flex-1" style={{ backgroundColor: hitColor }} title={tx('settings.previewHit')} />
        <div className="note-seal-seg flex-1" style={{ backgroundColor: hitColor }} title={tx('settings.previewHit')} />
        <div className="note-seal-seg flex-[0.8]" style={{ backgroundColor: SEALED_MISS_COLOR }} title={tx('settings.previewMiss')} />
        <div className="note-seal-seg flex-1" style={{ backgroundColor: hitColor }} title={tx('settings.previewHit')} />
        <div className="flex-[1.4] bg-white/[0.08] border border-white/10" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ backgroundColor: SEALED_GOLD_COLOR }} />{tx('settings.previewGolden')}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ backgroundColor: hitColor }} />{tx('settings.previewHit')}</span>
        <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ backgroundColor: SEALED_MISS_COLOR }} />{tx('settings.previewMiss')}</span>
      </div>
    </div>
  );
}

/** Exact-mode preview bar: Perfect/Great/Good gradation + unsung tail. */
function ExactNotePreview({ tx }: { tx: (_k: string) => string }) {
  const legend = [
    { color: EXACT_NOTE_COLORS.hitColors.Perfect, label: tx('settings.exactPerfect'), w: 'flex-[2]' },
    { color: EXACT_NOTE_COLORS.hitColors.Great, label: tx('settings.exactGreat'), w: 'flex-[1.5]' },
    { color: EXACT_NOTE_COLORS.hitColors.Good, label: tx('settings.exactGood'), w: 'flex-1' },
    { color: EXACT_NOTE_COLORS.nearMissGhost, label: tx('settings.exactNearMiss'), w: 'w-2.5' },
    { color: EXACT_NOTE_COLORS.farMissGhost, label: tx('settings.exactFarMiss'), w: 'w-2.5' },
  ];
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2.5" data-testid="exact-note-preview">
      <div className="flex h-8 rounded-md overflow-hidden gap-[2px]">
        <div className={legend[0].w} style={{ backgroundColor: legend[0].color, boxShadow: EXACT_NOTE_COLORS.hitGlows.Perfect }} title={legend[0].label} />
        <div className={legend[1].w} style={{ backgroundColor: legend[1].color }} title={legend[1].label} />
        <div className={legend[2].w} style={{ backgroundColor: legend[2].color }} title={legend[2].label} />
        <div className="flex-[2] bg-white/[0.08] border border-white/10" />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-white/50">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-1.5">
            <i className={`${l.w} h-2.5 rounded-[3px] inline-block`} style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-white/30 leading-snug">{tx('settings.noteDisplayExactDesc')}</p>
    </div>
  );
}

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
  /** Note bar display mode: 'sealed' (uniform hit colour + red misses) or 'exact' (5-colour quality code) */
  noteDisplayMode: NoteDisplayMode;
  setNoteDisplayMode: (_value: NoteDisplayMode) => void;
  /** Uniform hit colour for the sealed mode (#rrggbb) */
  sealedHitColor: string;
  setSealedHitColor: (_value: string) => void;
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
  noteDisplayMode,
  setNoteDisplayMode,
  sealedHitColor,
  setSealedHitColor,
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

      {/* Note Display Mode — sealed / exact ("Gesangsbalken aufwerten") */}
      <Card className="bg-white/5 border-white/10" data-testid="note-display-mode-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="9" width="18" height="6" rx="2" /><line x1="8" y1="12" x2="8" y2="12" strokeLinecap="round" /><line x1="12" y1="12" x2="12" y2="12" strokeLinecap="round" /><line x1="16" y1="12" x2="16" y2="12" strokeLinecap="round" />
            </svg>
            {tx('settings.noteDisplayMode')}
          </CardTitle>
          <CardDescription>{tx('settings.noteDisplayModeDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={tx('settings.noteDisplayMode')}>
            <button
              type="button"
              role="radio"
              aria-checked={noteDisplayMode === 'sealed'}
              data-testid="note-display-mode-sealed"
              onClick={() => {
                setNoteDisplayMode('sealed');
                saveSetting(StorageKeys.NOTE_DISPLAY_MODE, 'sealed');
              }}
              className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.02] cursor-pointer text-left space-y-2 ${
                noteDisplayMode === 'sealed'
                  ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/50'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <div className="flex h-5 rounded overflow-hidden gap-[2px]" aria-hidden="true">
                <div className="flex-[1.2]" style={{ backgroundColor: SEALED_GOLD_COLOR }} />
                <div className="flex-1" style={{ backgroundColor: DEFAULT_SEALED_HIT_COLOR }} />
                <div className="flex-1" style={{ backgroundColor: DEFAULT_SEALED_HIT_COLOR }} />
                <div className="flex-[0.8]" style={{ backgroundColor: SEALED_MISS_COLOR }} />
                <div className="flex-[1.4] bg-white/[0.08]" />
              </div>
              <div>
                <span className="text-sm font-medium theme-adaptive-text block">{tx('settings.noteDisplaySealed')}</span>
                <p className="text-xs theme-adaptive-text-secondary leading-snug">{tx('settings.noteDisplaySealedDesc')}</p>
              </div>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={noteDisplayMode === 'exact'}
              data-testid="note-display-mode-exact"
              onClick={() => {
                setNoteDisplayMode('exact');
                saveSetting(StorageKeys.NOTE_DISPLAY_MODE, 'exact');
              }}
              className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.02] cursor-pointer text-left space-y-2 ${
                noteDisplayMode === 'exact'
                  ? 'border-green-500 bg-green-500/10 ring-2 ring-green-500/50'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
            >
              <div className="flex h-5 rounded overflow-hidden gap-[2px]" aria-hidden="true">
                <div className="flex-[2]" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Perfect }} />
                <div className="flex-[1.5]" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Great }} />
                <div className="flex-1" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Good }} />
                <div className="flex-[2] bg-white/[0.08]" />
              </div>
              <div>
                <span className="text-sm font-medium theme-adaptive-text block">{tx('settings.noteDisplayExact')}</span>
                <p className="text-xs theme-adaptive-text-secondary leading-snug">{tx('settings.noteDisplayExactDesc')}</p>
              </div>
            </button>
          </div>

          {/* Sealed options: hit colour presets + free colour picker + live preview */}
          {noteDisplayMode === 'sealed' && (
            <div className="space-y-3" data-testid="sealed-options">
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settings.sealedHitColor')}</label>
                <div className="flex flex-wrap items-center gap-2">
                  {SEALED_HIT_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={`${tx('settings.sealedHitColor')} ${c}`}
                      onClick={() => {
                        setSealedHitColor(c);
                        saveSetting(StorageKeys.NOTE_SEALED_HIT_COLOR, c);
                      }}
                      className={`w-9 h-9 rounded-lg transition-all hover:scale-110 cursor-pointer border-2 ${
                        sealedHitColor.toLowerCase() === c.toLowerCase()
                          ? 'border-white ring-2 ring-white/60 scale-110'
                          : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label
                    className="relative w-9 h-9 rounded-lg border-2 border-dashed border-white/25 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                    title={tx('settings.customColor')}
                    data-testid="sealed-custom-color"
                  >
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(sealedHitColor) ? sealedHitColor : DEFAULT_SEALED_HIT_COLOR}
                      onChange={(e) => {
                        setSealedHitColor(e.target.value);
                        saveSetting(StorageKeys.NOTE_SEALED_HIT_COLOR, e.target.value);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label={tx('settings.customColor')}
                    />
                    <span className="text-white/50 text-sm select-none">+</span>
                  </label>
                </div>
                <p className="text-xs text-white/40 mt-2">{tx('settings.sealedHitColorDesc')}</p>
              </div>
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settings.noteDisplayPreview')}</label>
                <SealedNotePreview hitColor={sealedHitColor} tx={tx} />
              </div>
            </div>
          )}

          {/* Exact options: fixed 5-colour legend + preview */}
          {noteDisplayMode === 'exact' && (
            <div className="space-y-3" data-testid="exact-options">
              <div>
                <label className="text-sm theme-adaptive-text-secondary mb-2 block">{tx('settings.noteDisplayPreview')}</label>
                <ExactNotePreview tx={tx} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note Color Profiles */}
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
          <p className="text-xs text-white/40 mt-3 flex items-start gap-1.5">
            <span aria-hidden="true">ℹ</span>
            <span>{tx('settings.noteColorsLegacyHint')}</span>
          </p>
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
