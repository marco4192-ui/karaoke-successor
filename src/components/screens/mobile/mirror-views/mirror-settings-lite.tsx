'use client';

import React, { useCallback, useState, useEffect } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { NOTE_COLOR_PROFILES } from '@/lib/game/note-color-profiles';

// ===================== Props =====================

interface MirrorSettingsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Sektionen =====================

interface SettingsSection {
  id: string;
  icon: string;
  labelKey: string;
  fallback: string;
  descKey: string;
  descFallback: string;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: 'general',      icon: '\u2699\uFE0F',  labelKey: 'settings.tabGeneral',        fallback: 'General',      descKey: 'mobile.mirrorSettingsDescGeneral',    descFallback: 'Sprache, Schwierigkeit, Tonh\u00F6henanzeige' },
  { id: 'gameplay',     icon: '\u{1F3AE}',  labelKey: 'settingsTabs.gameplay',    fallback: 'Gameplay',     descKey: 'mobile.mirrorSettingsDescGameplay',   descFallback: 'Scoring-Optionen, Timings, Hilfen' },
  { id: 'appearance',   icon: '\u{1F3A8}',  labelKey: 'settingsTabs.appearance',  fallback: 'Appearance',   descKey: 'mobile.mirrorSettingsDescAppearance', descFallback: 'Theme, Lyrics-Stil, Hintergrund' },
  { id: 'graphicsound',icon: '\u{1F50A}',  labelKey: 'settingsTabs.graphicSound',fallback: 'Graphics & Sound', descKey: 'mobile.mirrorSettingsDescGraphicSound', descFallback: 'Lautst\u00E4rke, Mikrofon, YouTube' },
  { id: 'microphone',   icon: '\u{1F3A4}',  labelKey: 'settingsTabs.microphone',  fallback: 'Microphone',   descKey: 'mobile.mirrorSettingsDescMicrophone', descFallback: 'Eingang, Empfindlichkeit, Presets' },
  { id: 'mobile',       icon: '\u{1F4F1}',  labelKey: 'settingsTabs.mobileCompanion', fallback: 'Companion',   descKey: 'mobile.mirrorSettingsDescMobile',     descFallback: 'Verbundene Ger\u00E4te, Fernsteuerung' },
  { id: 'webcam',       icon: '\u{1F4F7}',  labelKey: 'settingsTabs.webcam',      fallback: 'Webcam',       descKey: 'mobile.mirrorSettingsDescWebcam',     descFallback: 'Hintergrund-Kamera-Einstellungen' },
  { id: 'library',      icon: '\u{1F4C1}',  labelKey: 'settings.tabLibrary',     fallback: 'Library',      descKey: 'mobile.mirrorSettingsDescLibrary',    descFallback: 'Song-Ordner, Scannen, Zur\u00FCcksetzen' },
  { id: 'about',        icon: '\u2139\uFE0F',  labelKey: 'settings.tabAbout',       fallback: 'About',        descKey: 'mobile.mirrorSettingsDescAbout',      descFallback: 'Version, Credits, Lizenzen' },
];

// ===================== Lokale Storage-Keys =====================

const SK = {
  DIFFICULTY: 'karaoke-default-difficulty',
  SHOW_PITCH_GUIDE: 'karaoke-show-pitch-guide',
  SHOW_SCORE: 'karaoke-show-score',
  SHOW_PARTICLES: 'karaoke-show-particles',
  SHOW_COMBO: 'karaoke-show-combo',
  REPLAY_ENABLED: 'karaoke-replay-enabled',
  AUTO_FULLSCREEN: 'karaoke-auto-fullscreen',
  BG_VIDEO: 'karaoke-bg-video',
  ANIMATED_BG: 'karaoke-animated-bg',
  PERFORMANCE_MODE: 'karaoke-performance-mode',
  LYRICS_STYLE: 'karaoke-lyrics-style',
  LYRICS_SIZE: 'karaoke-lyrics-size',
  THEME: 'karaoke-theme',
  MASTER_VOLUME: 'karaoke-master-volume',
  PREVIEW_VOLUME: 'karaoke-preview-volume',
  MIC_SENSITIVITY: 'karaoke-mic-sensitivity',
  YOUTUBE_QUALITY: 'karaoke-youtube-quality',
  LANGUAGE: 'karaoke-language',
  NOTE_COLOR_PROFILE: 'karaoke-note-color-profile',
} as const;

// ===================== Defaults =====================

const DEFAULTS: Record<string, string | boolean | number> = {
  [SK.DIFFICULTY]: 'medium',
  [SK.SHOW_PITCH_GUIDE]: true,
  [SK.SHOW_SCORE]: true,
  [SK.SHOW_PARTICLES]: true,
  [SK.SHOW_COMBO]: true,
  [SK.REPLAY_ENABLED]: true,
  [SK.AUTO_FULLSCREEN]: false,
  [SK.BG_VIDEO]: true,
  [SK.ANIMATED_BG]: false,
  [SK.PERFORMANCE_MODE]: 'full',
  [SK.LYRICS_STYLE]: 'classic',
  [SK.LYRICS_SIZE]: 'medium',
  [SK.THEME]: 'neon-nights',
  [SK.NOTE_COLOR_PROFILE]: 'neon',
  [SK.MASTER_VOLUME]: 100,
  [SK.PREVIEW_VOLUME]: 30,
  [SK.MIC_SENSITIVITY]: 50,
  [SK.YOUTUBE_QUALITY]: 'default',
  [SK.LANGUAGE]: 'de',
};

// ===================== Optionen-Listen =====================

const LANGUAGES = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espa\u00F1ol' },
  { value: 'fr', label: 'Fran\u00E7ais' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: '\u65E5\u672C\u8A9E' },
  { value: 'ko', label: '\uD55C\uAD6D\uC5B4' },
  { value: 'pt', label: 'Portugu\u00EAs' },
  { value: 'ru', label: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
  { value: 'zh', label: '\u4E2D\u6587' },
];

// i18n-able label helpers (called at render time with t function)
function lyricsStyles(t: (_key: string) => string) {
  return [
    { value: 'classic', label: tOr(t, 'settingsGraphicSound.lyricsClassic', 'Classic') },
    { value: 'concert', label: tOr(t, 'settingsGraphicSound.lyricsConcert', 'Concert') },
    { value: 'retro', label: tOr(t, 'settingsGraphicSound.lyricsRetro', 'Retro') },
    { value: 'neon', label: tOr(t, 'settingsGraphicSound.lyricsNeon', 'Neon') },
    { value: 'minimal', label: tOr(t, 'settingsGraphicSound.lyricsMinimal', 'Minimal') },
    { value: 'sunset', label: tOr(t, 'settingsGraphicSound.lyricsSunset', 'Sunset') },
    { value: 'ocean', label: tOr(t, 'settingsGraphicSound.lyricsOcean', 'Ocean') },
    { value: 'fire', label: tOr(t, 'settingsGraphicSound.lyricsFire', 'Fire') },
    { value: 'disco', label: tOr(t, 'settingsGraphicSound.lyricsDisco', 'Disco') },
    { value: 'synthwave', label: tOr(t, 'settingsGraphicSound.lyricsSynthwave', 'Synthwave') },
  ];
}

function themes(t: (_key: string) => string) {
  return [
    { value: 'neon-nights', label: tOr(t, 'appearance.themeNeonNights', 'Neon Nights'), color: '#00ffff' },
    { value: 'retro-arcade', label: tOr(t, 'appearance.themeRetroArcade', 'Retro Arcade'), color: '#ff6600' },
    { value: 'sunset-vibes', label: tOr(t, 'appearance.themeSunsetVibes', 'Sunset Vibes'), color: '#ff4488' },
    { value: 'ocean-deep', label: tOr(t, 'appearance.themeOceanDeep', 'Ocean Deep'), color: '#0088ff' },
    { value: 'galaxy-pop', label: tOr(t, 'appearance.themeGalaxyPop', 'Galaxy Pop'), color: '#aa44ff' },
    { value: 'minimal-light', label: tOr(t, 'appearance.themeMinimalLight', 'Minimal Light'), color: '#888888' },
  ];
}

function ytQuality(t: (_key: string) => string) {
  return [
    { value: 'default', label: tOr(t, 'settingsGraphicSound.youtubeQualityAuto', 'Auto') },
    { value: 'hd1080', label: tOr(t, 'settingsGraphicSound.youtubeQuality1080', '1080p') },
    { value: 'hd720', label: tOr(t, 'settingsGraphicSound.youtubeQuality720', '720p') },
    { value: 'large', label: tOr(t, 'settingsGraphicSound.youtubeQuality480', '480p') },
    { value: 'medium', label: tOr(t, 'settingsGraphicSound.youtubeQuality360', '360p') },
  ];
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Wiederverwendbare UI-Bausteine =====================

/** Mobile Toggle Switch */
function Toggle({ value, onToggle }: { value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => { haptic(); onToggle(!value); }}
      className={'relative w-11 h-6 rounded-full shrink-0 transition-colors ' + (value ? 'bg-cyan-500' : 'bg-white/20')}
    >
      <span className={'absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ' + (value ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/** Mobile Dropdown */
function Dropdown({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => { haptic(); onChange(e.target.value); }}
      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '16px',
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#1a1a2e] text-white">
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/** Tappable Number Buttons (mobile-freundlich statt Slider) */
function TappableNumber({ value, min, max, step, unit, onChange }: {
  value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  const steps = [];
  for (let v = min; v <= max; v += step) steps.push(v);
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {steps.map((s) => (
        <button
          key={s}
          onClick={() => { haptic(); onChange(s); }}
          className={'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold active:scale-95 transition-all border ' +
            (value === s
              ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400'
              : 'bg-white/5 border-white/10 text-white/50')}
        >{s}{unit || ''}</button>
      ))}
    </div>
  );
}

/** Toggle-Zeile */
function SettingToggle({ label, description, value, onToggle }: {
  label: string; description?: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-3">
      <div className="min-w-0 mr-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {description && <p className="text-[11px] text-white/30 mt-0.5">{description}</p>}
      </div>
      <Toggle value={value} onToggle={onToggle} />
    </div>
  );
}

/** Desktop-Only Hinweis */
function DesktopOnlyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-6 text-center">
      <span className="text-2xl">{'\u{1F5A5}\uFE0F'}</span>
      <p className="text-sm text-white/40">{text}</p>
      <p className="text-xs text-white/25">{'Auf Desktop \u00F6ffnen'}</p>
    </div>
  );
}

// ===================== Sub-View: General =====================

function GeneralSettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Sprache */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'settings.language', 'Sprache')}</span>
        <div className="mt-2">
          <Dropdown
            options={LANGUAGES}
            value={String(settings[SK.LANGUAGE] || 'de')}
            onChange={(v) => sendSetting(SK.LANGUAGE, v)}
          />
        </div>
      </div>

      {/* Schwierigkeit */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'settings.defaultDifficulty', 'Standard-Schwierigkeit')}</span>
        <div className="flex gap-2 mt-2">
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const isActive = String(settings[SK.DIFFICULTY]) === d;
            const labels: Record<string, string> = { easy: tOr(t, 'difficulty.easy', 'Leicht'), medium: tOr(t, 'difficulty.medium', 'Normal'), hard: tOr(t, 'difficulty.hard', 'Schwer') };
            const colors: Record<string, string> = { easy: 'bg-green-500/25 border-green-400/40 text-green-400', medium: 'bg-amber-500/25 border-amber-400/40 text-amber-400', hard: 'bg-red-500/25 border-red-400/40 text-red-400' };
            return (
              <button
                key={d}
                onClick={() => sendSetting(SK.DIFFICULTY, d)}
                className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform border ' +
                  (isActive ? colors[d] : 'bg-white/5 border-white/10 text-white/50')}
              >{labels[d]}</button>
            );
          })}
        </div>
      </div>

      {/* Tonhoehenanzeige */}
      <SettingToggle
        label={tOr(t, 'settings.showPitchGuide', 'Tonh\u00F6henanzeige')}
        description={tOr(t, 'settings.showPitchGuideDesc', 'Hilfestellung beim Singen')}
        value={!!settings[SK.SHOW_PITCH_GUIDE]}
        onToggle={(v) => sendSetting(SK.SHOW_PITCH_GUIDE, String(v))}
      />
    </div>
  );
}

// ===================== Sub-View: Gameplay =====================

function GameplaySettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  const items = [
    { key: SK.SHOW_SCORE, label: tOr(t, 'gameplay.showScore', 'Punkte-Anzeige'), desc: tOr(t, 'gameplay.showScoreDesc', 'Punkte w\u00E4hrend des Singens anzeigen') },
    { key: SK.SHOW_PARTICLES, label: tOr(t, 'gameplay.showParticles', 'Partikel-Effekte'), desc: tOr(t, 'gameplay.showParticlesDesc', 'Visuelle Effekte bei guten Noten') },
    { key: SK.SHOW_COMBO, label: tOr(t, 'gameplay.showCombo', 'Combo-Anzeige'), desc: tOr(t, 'gameplay.showComboDesc', 'Combo-Z\u00E4hler anzeigen') },
    { key: SK.REPLAY_ENABLED, label: tOr(t, 'gameplay.replayEnabled', 'Replay'), desc: tOr(t, 'gameplay.replayEnabledDesc', 'Song nach Ende automatisch wiederholen') },
    { key: SK.AUTO_FULLSCREEN, label: tOr(t, 'gameplay.autoFullscreen', 'Auto-Vollbild'), desc: tOr(t, 'gameplay.autoFullscreenDesc', 'Beim Singen automatisch Vollbild aktivieren') },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <SettingToggle
          key={item.key}
          label={item.label}
          description={item.desc}
          value={!!settings[item.key]}
          onToggle={(v) => sendSetting(item.key, String(v))}
        />
      ))}
    </div>
  );
}

// ===================== Sub-View: Appearance =====================

function AppearanceSettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Performance-Modus */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.performanceMode', 'Performance-Modus')}</span>
        <p className="text-[11px] text-white/30 mt-0.5">{tOr(t, 'appearance.performanceModeDesc', 'Reduzierte Animationen f\u00FCr schw\u00E4chere Ger\u00E4te')}</p>
        <div className="flex gap-2 mt-2">
          {(['full', 'low'] as const).map((m) => {
            const isActive = String(settings[SK.PERFORMANCE_MODE]) === m;
            const labels: Record<string, string> = { full: tOr(t, 'appearance.perfFull', 'Voll'), low: tOr(t, 'appearance.perfLow', 'Reduziert') };
            return (
              <button
                key={m}
                onClick={() => sendSetting(SK.PERFORMANCE_MODE, m)}
                className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform border ' +
                  (isActive ? 'bg-purple-500/25 border-purple-400/40 text-purple-400' : 'bg-white/5 border-white/10 text-white/50')}
              >{labels[m]}</button>
            );
          })}
        </div>
      </div>

      {/* Hintergrund-Video */}
      <SettingToggle
        label={tOr(t, 'appearance.bgVideo', 'Hintergrund-Video')}
        value={!!settings[SK.BG_VIDEO]}
        onToggle={(v) => sendSetting(SK.BG_VIDEO, String(v))}
      />

      {/* Animierte Hintergrund */}
      <SettingToggle
        label={tOr(t, 'appearance.animatedBg', 'Animierter Hintergrund')}
        value={!!settings[SK.ANIMATED_BG]}
        onToggle={(v) => sendSetting(SK.ANIMATED_BG, String(v))}
      />

      {/* Farbschema (Theme) */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.colorTheme', 'Farbschema')}</span>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {themes(t).map((th) => {
            const isActive = String(settings[SK.THEME]) === th.value;
            return (
              <button
                key={th.value}
                onClick={() => sendSetting(SK.THEME, th.value)}
                className={'flex items-center gap-2 rounded-lg px-3 py-2.5 text-left active:scale-95 transition-all border ' +
                  (isActive ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5')}
              >
                <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: th.color, border: isActive ? '2px solid white' : '2px solid transparent' }} />
                <span className="text-xs font-medium text-white">{th.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lyrics-Stil */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.lyricsStyle', 'Lyrics-Stil')}</span>
        <div className="mt-2">
          <Dropdown
            options={lyricsStyles(t)}
            value={String(settings[SK.LYRICS_STYLE] || 'classic')}
            onChange={(v) => sendSetting(SK.LYRICS_STYLE, v)}
          />
        </div>
      </div>

      {/* Lyrics-Groesse */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.lyricsSize', 'Lyrics-Gr\u00F6\u00DFe')}</span>
        <div className="flex gap-2 mt-2">
          {(['small', 'medium', 'large'] as const).map((s) => {
            const isActive = String(settings[SK.LYRICS_SIZE]) === s;
            const labels: Record<string, string> = { small: tOr(t, 'settingsGraphicSound.lyricsSizeSmall', 'Small'), medium: tOr(t, 'settingsGraphicSound.lyricsSizeMedium', 'Normal'), large: tOr(t, 'settingsGraphicSound.lyricsSizeLarge', 'Large') };
            return (
              <button
                key={s}
                onClick={() => sendSetting(SK.LYRICS_SIZE, s)}
                className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform border ' +
                  (isActive ? 'bg-pink-500/25 border-pink-400/40 text-pink-400' : 'bg-white/5 border-white/10 text-white/50')}
              >{labels[s]}</button>
            );
          })}
        </div>
      </div>

      {/* Note-Color-Profil */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.noteColorProfile', 'Note-Farben')}</span>
        <p className="text-[11px] text-white/30 mt-0.5">{tOr(t, 'appearance.noteColorProfileDesc', 'Farbpalette fuer die Notenbalken')}</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {NOTE_COLOR_PROFILES.map((prof) => {
            const isActive = String(settings[SK.NOTE_COLOR_PROFILE]) === prof.id;
            return (
              <button
                key={prof.id}
                onClick={() => sendSetting(SK.NOTE_COLOR_PROFILE, prof.id)}
                className={'flex flex-col items-center gap-1.5 rounded-lg px-3 py-2.5 active:scale-95 transition-all border ' +
                  (isActive ? 'border-white/40 bg-white/10' : 'border-white/10 bg-white/5')}
              >
                <div className="w-full h-4 rounded overflow-hidden flex">
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Perfect }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Great }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Good }} />
                  <div className="flex-1" style={{ backgroundColor: prof.hitColors.Okay }} />
                </div>
                <span className="text-xs font-medium text-white">{prof.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===================== Sub-View: Graphics & Sound =====================

function GraphicSoundSettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Master-Lautstaerke */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'graphicSound.masterVolume', 'Master-Lautst\u00E4rke')}</span>
          <span className="text-xs font-mono text-cyan-400">{settings[SK.MASTER_VOLUME]}%</span>
        </div>
        <TappableNumber
          value={Number(settings[SK.MASTER_VOLUME]) || 100}
          min={0} max={100} step={10} unit="%"
          onChange={(v) => sendSetting(SK.MASTER_VOLUME, String(v))}
        />
      </div>

      {/* Preview-Lautstaerke */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'graphicSound.previewVolume', 'Preview-Lautst\u00E4rke')}</span>
          <span className="text-xs font-mono text-cyan-400">{settings[SK.PREVIEW_VOLUME]}%</span>
        </div>
        <TappableNumber
          value={Number(settings[SK.PREVIEW_VOLUME]) || 30}
          min={0} max={100} step={10} unit="%"
          onChange={(v) => sendSetting(SK.PREVIEW_VOLUME, String(v))}
        />
      </div>

      {/* Mikrofon-Empfindlichkeit */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'graphicSound.micSensitivity', 'Mikrofon-Empfindlichkeit')}</span>
          <span className="text-xs font-mono text-cyan-400">{settings[SK.MIC_SENSITIVITY]}%</span>
        </div>
        <TappableNumber
          value={Number(settings[SK.MIC_SENSITIVITY]) || 50}
          min={0} max={100} step={5} unit="%"
          onChange={(v) => sendSetting(SK.MIC_SENSITIVITY, String(v))}
        />
      </div>

      {/* YouTube-Qualitaet */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'graphicSound.youtubeQuality', 'YouTube-Qualit\u00E4t')}</span>
        <div className="mt-2">
          <Dropdown
            options={ytQuality(t)}
            value={String(settings[SK.YOUTUBE_QUALITY] || 'default')}
            onChange={(v) => sendSetting(SK.YOUTUBE_QUALITY, v)}
          />
        </div>
      </div>
    </div>
  );
}

// ===================== Sub-View: About =====================

function AboutSettings({ t }: { t: (_key: string) => string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-center">
        <span className="text-3xl">{'\u{1F3B6}'}</span>
        <h3 className="text-lg font-bold text-white mt-2">Karaoke ZERO</h3>
        <p className="text-xs text-white/30 mt-1">{tOr(t, 'about.version', 'Version')} 1.0.0</p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <p className="text-xs text-white/40 leading-relaxed">
          {tOr(t, 'about.description', 'Ein modernes Karaoke-Erlebnis mit Begleitung, Scoring und Party-Modi.')}
        </p>
      </div>
      <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <p className="text-[10px] text-white/20">Built with Next.js + Tauri + Web Audio API</p>
      </div>
    </div>
  );
}

// ===================== Sub-View: Mobile (QR-Code) =====================

function MobileSettings({ t }: { t: (_key: string) => string }) {
  const [localIP, setLocalIP] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    detectLocalIP().then((ip) => {
      if (isMounted && ip) setLocalIP(ip);
    });
    return () => { isMounted = false; };
  }, []);

  const companionUrl = localIP ? buildCompanionUrl(localIP) : '';
  const qrCodeSrc = useQRCode(companionUrl, 220);

  const handleCopy = useCallback(async () => {
    if (!companionUrl) return;
    haptic();
    try {
      await navigator.clipboard.writeText(companionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [companionUrl]);

  return (
    <div className="flex flex-col gap-4 items-center">
      <p className="text-xs text-white/50 text-center">
        {tOr(t, 'mobile.mirrorQRHint', 'Scanne diesen QR-Code mit einem anderen Handy, um die Companion-App zu oeffnen.')}
      </p>

      {/* QR Code */}
      <div className="w-48 h-48 bg-white rounded-xl p-2 shadow-lg">
        {qrCodeSrc ? (
          <img src={qrCodeSrc} alt="QR Code" className="w-full h-full" />
        ) : (
          <div className="w-full h-full animate-pulse bg-white/20 rounded-lg" />
        )}
      </div>

      {/* URL Anzeige */}
      {companionUrl && (
        <div className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <p className="text-[11px] text-white/30 mb-1">Verbindungs-URL</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs text-cyan-400 truncate font-mono">{companionUrl}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium bg-cyan-500/20 text-cyan-400 active:bg-cyan-500/30 transition-colors"
            >
              {copied ? '\u2705' : '\u{1F4CB}'}
            </button>
          </div>
        </div>
      )}

      {!localIP && (
        <p className="text-xs text-amber-400/70 text-center">
          {tOr(t, 'mobile.mirrorQRNoIP', 'Lokale IP konnte nicht ermittelt werden.')}
        </p>
      )}

      {localIP && (
        <p className="text-xs text-green-400/60 text-center">
          IP: {localIP}
        </p>
      )}
    </div>
  );
}

// ===================== Hauptkomponente =====================

export const MirrorSettingsLite = React.memo<MirrorSettingsLiteProps>(
  function MirrorSettingsLite({ onSendDesktopCommand }) {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Lokaler Einstellungs-State (startet mit Desktop-Defaults)
    const [settings, setSettings] = useState<Record<string, string | boolean | number>>(() => ({ ...DEFAULTS }));

    // Einstellung senden + lokal aktualisieren
    const sendSetting = useCallback((key: string, value: string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      onSendDesktopCommand(`settings_set:${encodeURIComponent(key)}:${encodeURIComponent(value)}`);
    }, [onSendDesktopCommand]);

    // Zurueck zur Liste
    const handleBack = useCallback(() => {
      haptic();
      setActiveSection(null);
    }, []);

    // Sektion oeffnen
    const handleOpen = useCallback((id: string) => {
      haptic();
      setActiveSection(id);
      // Auch Desktop-Tab wechseln
      onSendDesktopCommand(`settings_tab:${id}`);
    }, [onSendDesktopCommand]);

    // -------- Sub-View: eine bestimmte Sektion --------
    if (activeSection) {
      const sectionInfo = SETTINGS_SECTIONS.find((s) => s.id === activeSection);
      const sectionLabel = sectionInfo ? tOr(t, sectionInfo.labelKey, sectionInfo.fallback) : '';
      const sectionIcon = sectionInfo?.icon || '';

      // Desktop-only Sektionen (ohne Mobile - Mobile hat eigenen QR-Code-View)
      if (['microphone', 'webcam', 'library'].includes(activeSection)) {
        const descKey = sectionInfo?.descKey || '';
        const descFallback = sectionInfo?.descFallback || '';
        return (
          <div className="flex flex-col gap-3 px-4 pb-8">
            {/* Header mit Zurueck */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm text-white/60 active:scale-95 transition-transform"
              >{'\u2190'}</button>
              <span className="text-lg">{sectionIcon}</span>
              <h2 className="text-lg font-semibold text-white">{sectionLabel}</h2>
            </div>
            <DesktopOnlyHint text={tOr(t, descKey, descFallback)} />
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          {/* Header mit Zurueck */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm text-white/60 active:scale-95 transition-transform"
            >{'\u2190'}</button>
            <span className="text-lg">{sectionIcon}</span>
            <h2 className="text-lg font-semibold text-white">{sectionLabel}</h2>
          </div>

          {/* Sub-View Inhalt */}
          {activeSection === 'general' && (
            <GeneralSettings settings={settings} sendSetting={sendSetting} t={t} />
          )}
          {activeSection === 'gameplay' && (
            <GameplaySettings settings={settings} sendSetting={sendSetting} t={t} />
          )}
          {activeSection === 'appearance' && (
            <AppearanceSettings settings={settings} sendSetting={sendSetting} t={t} />
          )}
          {activeSection === 'graphicsound' && (
            <GraphicSoundSettings settings={settings} sendSetting={sendSetting} t={t} />
          )}
          {activeSection === 'about' && (
            <AboutSettings t={t} />
          )}
          {activeSection === 'mobile' && (
            <MobileSettings t={t} />
          )}
        </div>
      );
    }

    // -------- Hauptansicht: Sektions-Liste --------
    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">\u2699\uFE0F</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorSettings')}
          </h2>
        </div>

        {/* Settings-Buttons mit Beschreibung */}
        <div className="flex flex-col gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const label = t(section.labelKey) === section.labelKey
              ? section.fallback
              : t(section.labelKey);
            const desc = t(section.descKey) === section.descKey
              ? section.descFallback
              : t(section.descKey);
            const isDesktopOnly = ['microphone', 'webcam', 'library'].includes(section.id);
            return (
              <button
                key={section.id}
                onClick={() => handleOpen(section.id)}
                className={
                  'flex items-center gap-3 rounded-xl px-4 py-3.5 text-left ' +
                  'bg-white/5 border border-white/10 ' +
                  'active:scale-[0.98] active:bg-white/10 transition-all'
                }
              >
                <span className="text-lg leading-none shrink-0">{section.icon}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-white block">{label}</span>
                  <span className="text-[11px] text-white/30 block mt-0.5">{desc}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isDesktopOnly && (
                    <span className="text-[9px] font-medium bg-white/10 text-white/30 px-1.5 py-0.5 rounded-full">DESKTOP</span>
                  )}
                  <span className="text-white/30 text-xs">{'\u2192'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
