'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
import type { GameState, MobileView, DesktopSettingsSnapshot } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { useCompanionHttpsInfo } from '@/hooks/use-companion-https-info';
import { QrWlanHint } from '@/components/qr-wlan-hint';
import { StorageKeys } from '@/lib/storage';
import { SEALED_HIT_COLOR_PRESETS, DEFAULT_SEALED_HIT_COLOR, SEALED_GOLD_COLOR, EXACT_NOTE_COLORS } from '@/lib/game/note-color-profiles';

// ===================== Props =====================

interface MirrorSettingsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
  /** R33: Echter Desktop-Settings-Snapshot (StorageKey→Wert + Webcam-Config).
   *  Kommt als optionale Prop vom MirrorView-Dispatcher. Fehlt er (noch nicht
   *  gepusht), zeigt die Ansicht wie bisher die lokalen Default-Werte. */
  settingsSnapshot?: DesktopSettingsSnapshot | null;
  /** R33: true = dieses Handy hält die Fernsteuerung. Nur dann werden
   *  Schreibbefehle wirklich gesendet (defensiv — die Companion-Shell blendet
   *  die Settings-Ansicht ohnehin nur für Steuernde ein, der Server blockt
   *  CONTROL-Kommandos ohne Remote-Lock). */
  isControlling?: boolean;
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
  { id: 'general',      icon: '\u2699\uFE0F',  labelKey: 'settings.tabGeneral',        fallback: 'General',      descKey: 'mobile.mirrorSettingsDescGeneral',    descFallback: 'Sprache, Schwierigkeit, Spiel-Standards' },
  { id: 'gameplay',     icon: '\u{1F3AE}',  labelKey: 'settingsTabs.gameplay',    fallback: 'Gameplay',     descKey: 'mobile.mirrorSettingsDescGameplay',   descFallback: 'Scoring-Optionen, Timings, Hilfen' },
  { id: 'appearance',   icon: '\u{1F3A8}',  labelKey: 'settingsTabs.appearance',  fallback: 'Appearance',   descKey: 'mobile.mirrorSettingsDescAppearance', descFallback: 'Theme, Lyrics-Stil, Hintergrund' },
  { id: 'graphicsound',icon: '\u{1F50A}',  labelKey: 'settingsTabs.graphicSound',fallback: 'Graphics & Sound', descKey: 'mobile.mirrorSettingsDescGraphicSound', descFallback: 'Lautst\u00E4rke, Mikrofon, YouTube' },
  { id: 'microphone',   icon: '\u{1F3A4}',  labelKey: 'settingsTabs.microphone',  fallback: 'Microphone',   descKey: 'mobile.mirrorSettingsDescMicrophone', descFallback: 'Eingang, Empfindlichkeit, Presets' },
  { id: 'mobile',       icon: '\u{1F4F1}',  labelKey: 'settingsTabs.mobileCompanion', fallback: 'Companion',   descKey: 'mobile.mirrorSettingsDescMobile',     descFallback: 'Verbundene Ger\u00E4te, Fernsteuerung' },
  { id: 'webcam',       icon: '\u{1F4F7}',  labelKey: 'settingsTabs.webcam',      fallback: 'Webcam',       descKey: 'mobile.mirrorSettingsDescWebcam',     descFallback: 'Hintergrund-Kamera-Einstellungen' },
  { id: 'library',      icon: '\u{1F4C1}',  labelKey: 'settings.tabLibrary',     fallback: 'Library',      descKey: 'mobile.mirrorSettingsDescLibrary',    descFallback: 'Song-Ordner, Scannen, Zur\u00FCcksetzen' },
  { id: 'about',        icon: '\u2139\uFE0F',  labelKey: 'settings.tabAbout',       fallback: 'About',        descKey: 'mobile.mirrorSettingsDescAbout',      descFallback: 'Version, Credits, Lizenzen' },
];

// ===================== Storage-Keys (echte Keys aus @/lib/storage) =====================

const SK = {
  DIFFICULTY: StorageKeys.DEFAULT_DIFFICULTY,
  SHOW_SCORE: StorageKeys.SHOW_SCORE,
  SHOW_PARTICLES: StorageKeys.SHOW_PARTICLES,
  SHOW_COMBO: StorageKeys.SHOW_COMBO,
  REPLAY_ENABLED: StorageKeys.REPLAY_ENABLED,
  AUTO_FULLSCREEN: StorageKeys.AUTO_FULLSCREEN,
  WARNING_CUES: StorageKeys.WARNING_CUES,
  BG_VIDEO: StorageKeys.BG_VIDEO,
  ANIMATED_BG: StorageKeys.ANIMATED_BG,
  PERFORMANCE_MODE: StorageKeys.PERFORMANCE_MODE,
  LYRICS_STYLE: StorageKeys.LYRICS_STYLE,
  LYRICS_SIZE: StorageKeys.LYRICS_SIZE,
  THEME: StorageKeys.THEME,
  MASTER_VOLUME: StorageKeys.MASTER_VOLUME,
  PREVIEW_VOLUME: StorageKeys.PREVIEW_VOLUME,
  MIC_SENSITIVITY: StorageKeys.MIC_SENSITIVITY,
  YOUTUBE_QUALITY: StorageKeys.YOUTUBE_QUALITY,
  LANGUAGE: StorageKeys.LANGUAGE,
  NOTE_DISPLAY_MODE: StorageKeys.NOTE_DISPLAY_MODE,
  NOTE_SEALED_HIT_COLOR: StorageKeys.NOTE_SEALED_HIT_COLOR,
  WEBCAM_CONFIG: StorageKeys.WEBCAM_CONFIG,
} as const;

/** Alle skalaren Settings, die der Desktop im Snapshot liefert (ohne den
 *  Webcam-JSON-Blob, der separat gehandhabt wird). */
const SNAPSHOT_SETTING_KEYS: readonly string[] = [
  SK.DIFFICULTY, SK.SHOW_SCORE, SK.SHOW_PARTICLES, SK.SHOW_COMBO, SK.REPLAY_ENABLED,
  SK.AUTO_FULLSCREEN, SK.WARNING_CUES, SK.BG_VIDEO, SK.ANIMATED_BG, SK.PERFORMANCE_MODE,
  SK.LYRICS_STYLE, SK.LYRICS_SIZE, SK.THEME, SK.NOTE_DISPLAY_MODE, SK.NOTE_SEALED_HIT_COLOR,
  SK.MASTER_VOLUME, SK.PREVIEW_VOLUME, SK.MIC_SENSITIVITY, SK.YOUTUBE_QUALITY, SK.LANGUAGE,
];

// ===================== Defaults =====================
// Fallbacks, falls der Desktop-Snapshot (noch) nicht vorliegt.
// Die Werte entsprechen den Desktop-Defaults (settings-screen.tsx).

const DEFAULTS: Record<string, string | boolean | number> = {
  [SK.DIFFICULTY]: 'medium',
  [SK.SHOW_SCORE]: true,
  [SK.SHOW_PARTICLES]: true,
  [SK.SHOW_COMBO]: true,
  [SK.REPLAY_ENABLED]: true,
  [SK.AUTO_FULLSCREEN]: false,
  [SK.WARNING_CUES]: true,
  [SK.BG_VIDEO]: true,
  [SK.ANIMATED_BG]: false,
  [SK.PERFORMANCE_MODE]: 'full',
  [SK.LYRICS_STYLE]: 'classic',
  [SK.LYRICS_SIZE]: 'medium',
  [SK.THEME]: 'neon-nights',
  [SK.NOTE_DISPLAY_MODE]: 'sealed',
  [SK.NOTE_SEALED_HIT_COLOR]: DEFAULT_SEALED_HIT_COLOR,
  [SK.MASTER_VOLUME]: 100,
  [SK.PREVIEW_VOLUME]: 30,
  [SK.MIC_SENSITIVITY]: 50,
  [SK.YOUTUBE_QUALITY]: 'default',
  [SK.LANGUAGE]: 'de',
};

// ===================== Webcam-Config (Desktop-Format, webcam-types.ts) =====================

type WebcamSizeModeLite = 'fullscreen' | '2:10' | '3:10' | '4:10';
type WebcamPositionLite = 'top' | 'bottom' | 'left' | 'right';
type WebcamFilterLite = 'none' | 'grayscale' | 'sepia' | 'contrast' | 'brightness' | 'saturate' | 'blur';

function isWebcamSize(v: unknown): v is WebcamSizeModeLite {
  return v === 'fullscreen' || v === '2:10' || v === '3:10' || v === '4:10';
}
function isWebcamPosition(v: unknown): v is WebcamPositionLite {
  return v === 'top' || v === 'bottom' || v === 'left' || v === 'right';
}
function isWebcamFilter(v: unknown): v is WebcamFilterLite {
  return v === 'none' || v === 'grayscale' || v === 'sepia' || v === 'contrast'
    || v === 'brightness' || v === 'saturate' || v === 'blur';
}

/** 1:1-Kopie von DEFAULT_WEBCAM_CONFIG (webcam-types.ts) — bewusst als
 *  Record geführt, damit unbekannte/zukünftige Desktop-Felder beim
 *  Zurücksenden des kompletten JSON nicht verloren gehen. */
const DEFAULT_WEBCAM_RECORD: Record<string, unknown> = {
  enabled: false,
  sizeMode: '2:10',
  position: 'bottom',
  deviceId: null,
  mirrored: true,
  opacity: 1,
  borderRadius: 16,
  showBorder: true,
  borderColor: 'rgba(0, 255, 255, 0.5)',
  filter: 'none',
  zIndex: 5,
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

/** Snapshot-Werte kommen als Strings ('true'/'false'/'42') — sicher parsen. */
function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  return fallback;
}

function asNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
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

/** Touch-Slider mit Commit-on-Release: Während des Ziehens wird nur der
 *  lokale Wert angezeigt; erst beim Loslassen wird EIN Befehl an den Desktop
 *  gesendet (kein Command-Spam bei jedem Slider-Tick). */
function TouchSlider({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const shown = dragValue !== null ? dragValue : value;
  const commit = useCallback(() => {
    if (dragValue !== null) {
      haptic();
      onChange(dragValue);
      setDragValue(null);
    }
  }, [dragValue, onChange]);
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={shown}
      onChange={(e) => setDragValue(Number(e.target.value))}
      onPointerUp={commit}
      onTouchEnd={commit}
      onKeyUp={commit}
      onBlur={commit}
      onPointerCancel={() => setDragValue(null)}
      className="w-full accent-cyan-500 cursor-pointer"
    />
  );
}

/** Kompakte Options-Pills (grid oder horizontal scrollbar) */
function PillRow({ options, value, onSelect, layout }: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  layout?: 'grid' | 'scroll';
}) {
  const cls = layout === 'scroll'
    ? 'flex gap-1.5 overflow-x-auto no-scrollbar'
    : 'grid grid-cols-4 gap-1.5';
  return (
    <div className={cls}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => { haptic(); onSelect(opt.value); }}
          className={'shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-center active:scale-95 transition-all border ' +
            (value === opt.value
              ? 'bg-cyan-500/25 border-cyan-400/40 text-cyan-300'
              : 'bg-white/5 border-white/10 text-white/50')}
        >{opt.label}</button>
      ))}
    </div>
  );
}

/** Toggle-Zeile */
function SettingToggle({ label, description, value, onToggle, testId }: {
  label: string; description?: string; value: boolean; onToggle: (v: boolean) => void; testId?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-3 py-3" data-testid={testId}>
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

/** Sticky Sub-View-Header mit Zurück-Button */
function SubViewHeader({ icon, label, onBack }: { icon: string; label: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-[#160f28]/95 backdrop-blur-md flex items-center gap-2.5">
      <button
        onClick={onBack}
        className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm text-white/60 active:scale-95 transition-transform shrink-0"
      >{'\u2190'}</button>
      <span className="text-lg shrink-0">{icon}</span>
      <h2 className="text-lg font-semibold text-white truncate">{label}</h2>
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
            value={asStr(settings[SK.LANGUAGE], 'de')}
            onChange={(v) => sendSetting(SK.LANGUAGE, v)}
          />
        </div>
      </div>

      {/* Schwierigkeit */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'settings.defaultDifficulty', 'Standard-Schwierigkeit')}</span>
        <div className="flex gap-2 mt-2">
          {(['easy', 'medium', 'hard'] as const).map((d) => {
            const isActive = asStr(settings[SK.DIFFICULTY], 'medium') === d;
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
    </div>
  );
}

// ===================== Sub-View: Gameplay =====================
// Reihenfolge + Labels wie Desktop-Gameplay-Tab (gameplay-tab.tsx):
// Punkteanzeige → Partikel → Combo → Replay → Auto-Vollbild → Warn-Sound-Cues.

function GameplaySettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  const items: Array<{ key: string; label: string; desc: string; testId?: string }> = [
    {
      key: SK.SHOW_SCORE,
      label: tOr(t, 'settingsGameplay.scoring', 'Punkteanzeige'),
      desc: tOr(t, 'settingsGameplay.scoringDesc', 'Zeigt den aktuellen Punktestand w\u00E4hrend des Singens an.'),
    },
    {
      key: SK.SHOW_PARTICLES,
      label: tOr(t, 'settingsGameplay.particles', 'Partikel-Effekte'),
      desc: tOr(t, 'settingsGameplay.particlesDesc', 'Visuelle Effekte bei getroffenen Noten.'),
    },
    {
      key: SK.SHOW_COMBO,
      label: tOr(t, 'settingsGameplay.combo', 'Combo-Anzeige'),
      desc: tOr(t, 'settingsGameplay.comboDesc', 'Zeigt den Combo-Counter bei aufeinanderfolgenden Treffern.'),
    },
    {
      key: SK.REPLAY_ENABLED,
      label: tOr(t, 'settingsGameplay.replay', 'Song-Replay aufnehmen'),
      desc: tOr(t, 'settingsGameplay.replayDesc', 'Nimmt Audio und Webcam w\u00E4hrend des Singens auf.'),
    },
    {
      key: SK.AUTO_FULLSCREEN,
      label: tOr(t, 'settingsGameplay.autoFullscreen', 'Auto-Vollbild'),
      desc: tOr(t, 'settingsGameplay.autoFullscreenDesc', 'Wechselt beim Spielstart automatisch in den Vollbild-Modus.'),
    },
    {
      key: SK.WARNING_CUES,
      label: tOr(t, 'settingsGameplay.warningCues', 'Warn-Sound-Cues'),
      desc: tOr(t, 'settingsGameplay.warningCuesDesc', 'Kurze Signalt\u00F6ne vor Blind-/Wort-ausblenden-Passagen (Blind Karaoke & Missing Words).'),
      testId: 'mirror-warning-cues',
    },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <SettingToggle
          key={item.key}
          label={item.label}
          description={item.desc}
          value={asBool(settings[item.key], DEFAULTS[item.key] === true)}
          onToggle={(v) => sendSetting(item.key, String(v))}
          testId={item.testId}
        />
      ))}
    </div>
  );
}

// ===================== Sub-View: Appearance =====================
// R33/P4: EXAKT wie der Desktop-Appearance-Tab sortiert
// (appearance-tab.tsx): Performance-Modus → Video/Hintergrund → Theme →
// Notendarstellung → Lyrics-Stil/Größe.

function AppearanceSettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* 1. Performance-Modus */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.performanceMode', 'Performance-Modus')}</span>
        <p className="text-[11px] text-white/30 mt-0.5">{tOr(t, 'appearance.performanceModeDesc', 'Reduzierte Animationen f\u00FCr schw\u00E4chere Ger\u00E4te')}</p>
        <div className="flex gap-2 mt-2">
          {(['full', 'low'] as const).map((m) => {
            const isActive = asStr(settings[SK.PERFORMANCE_MODE], 'full') === m;
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

      {/* 2. Video / Hintergrund */}
      <SettingToggle
        label={tOr(t, 'appearance.bgVideo', 'Hintergrund-Video')}
        value={asBool(settings[SK.BG_VIDEO], true)}
        onToggle={(v) => sendSetting(SK.BG_VIDEO, String(v))}
      />

      <SettingToggle
        label={tOr(t, 'appearance.animatedBg', 'Animierter Hintergrund')}
        value={asBool(settings[SK.ANIMATED_BG], false)}
        onToggle={(v) => sendSetting(SK.ANIMATED_BG, String(v))}
      />

      {/* 3. Farbschema (Theme) */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.colorTheme', 'Farbschema')}</span>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {themes(t).map((th) => {
            const isActive = asStr(settings[SK.THEME], 'neon-nights') === th.value;
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

      {/* 4. Notendarstellung (sealed / exact) */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5" data-testid="mirror-note-display">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.noteDisplayMode', 'Notendarstellung')}</span>
        <p className="text-[11px] text-white/30 mt-0.5">{tOr(t, 'appearance.noteDisplayModeDesc', 'Look der Notenbalken im Spiel')}</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* Sealed */}
          <button
            onClick={() => sendSetting(SK.NOTE_DISPLAY_MODE, 'sealed')}
            className={'rounded-lg px-3 py-2.5 active:scale-95 transition-all border flex flex-col gap-1.5 items-start ' +
              (asStr(settings[SK.NOTE_DISPLAY_MODE], 'sealed') !== 'exact'
                ? 'bg-green-500/25 border-green-400/40'
                : 'bg-white/5 border-white/10 text-white/50')}
          >
            <div className="flex h-3.5 w-full rounded overflow-hidden gap-[2px]" aria-hidden="true">
              <div className="flex-[1.2]" style={{ backgroundColor: SEALED_GOLD_COLOR }} />
              <div className="flex-1" style={{ backgroundColor: asStr(settings[SK.NOTE_SEALED_HIT_COLOR], DEFAULT_SEALED_HIT_COLOR) }} />
              <div className="flex-1" style={{ backgroundColor: asStr(settings[SK.NOTE_SEALED_HIT_COLOR], DEFAULT_SEALED_HIT_COLOR) }} />
              <div className="flex-[0.8]" style={{ backgroundColor: 'rgba(140, 21, 21, 0.45)', boxShadow: 'inset 0 0 3px rgba(0, 0, 0, 0.4)' }} />
              <div className="flex-[1.4] bg-white/[0.08]" />
            </div>
            <span className="text-xs font-semibold">{tOr(t, 'appearance.noteDisplaySealed', 'Laser')}</span>
          </button>
          {/* Exact */}
          <button
            onClick={() => sendSetting(SK.NOTE_DISPLAY_MODE, 'exact')}
            className={'rounded-lg px-3 py-2.5 active:scale-95 transition-all border flex flex-col gap-1.5 items-start ' +
              (asStr(settings[SK.NOTE_DISPLAY_MODE], 'sealed') === 'exact'
                ? 'bg-green-500/25 border-green-400/40'
                : 'bg-white/5 border-white/10 text-white/50')}
          >
            <div className="flex h-3.5 w-full rounded overflow-hidden gap-[2px]" aria-hidden="true">
              <div className="flex-[2]" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Perfect }} />
              <div className="flex-[1.5]" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Great }} />
              <div className="flex-1" style={{ backgroundColor: EXACT_NOTE_COLORS.hitColors.Good }} />
              <div className="flex-[2] bg-white/[0.08]" />
            </div>
            <span className="text-xs font-semibold">{tOr(t, 'appearance.noteDisplayExact', 'Exakt')}</span>
          </button>
        </div>

        {/* Sealed: Treffer-Farb-Swatches */}
        {asStr(settings[SK.NOTE_DISPLAY_MODE], 'sealed') !== 'exact' && (
          <div className="mt-2.5">
            <span className="text-[11px] text-white/40">{tOr(t, 'appearance.sealedHitColor', 'Treffer-Farbe')}</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SEALED_HIT_COLOR_PRESETS.map((c: string) => {
                const active = asStr(settings[SK.NOTE_SEALED_HIT_COLOR], DEFAULT_SEALED_HIT_COLOR).toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => sendSetting(SK.NOTE_SEALED_HIT_COLOR, c)}
                    title={c}
                    aria-label={c}
                    className={'w-8 h-8 rounded-lg border-2 active:scale-90 transition-all ' + (active ? 'border-white ring-2 ring-white/60 scale-110' : 'border-white/20')}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Lyrics-Stil */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.lyricsStyle', 'Lyrics-Stil')}</span>
        <div className="mt-2">
          <Dropdown
            options={lyricsStyles(t)}
            value={asStr(settings[SK.LYRICS_STYLE], 'classic')}
            onChange={(v) => sendSetting(SK.LYRICS_STYLE, v)}
          />
        </div>
      </div>

      {/* 6. Lyrics-Groesse */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'appearance.lyricsSize', 'Lyrics-Gr\u00F6\u00DFe')}</span>
        <div className="flex gap-2 mt-2">
          {(['small', 'medium', 'large'] as const).map((s) => {
            const isActive = asStr(settings[SK.LYRICS_SIZE], 'medium') === s;
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
    </div>
  );
}

// ===================== Sub-View: Graphics & Sound (Audio) =====================
// Reihenfolge wie Desktop-Audio-Tab (graphic-sound-tab.tsx):
// Master → Preview → Mikrofon → YouTube.
// (ASIO/Ausgabegerät bleibt Desktop-only. R58: Lautstärke-Normalisierung ist
//  permanent aktiv — kein Toggle mehr, wie am Desktop.)

function GraphicSoundSettings({ settings, sendSetting, t }: {
  settings: Record<string, string | boolean | number>;
  sendSetting: (key: string, val: string) => void;
  t: (_key: string) => string;
}) {
  const master = asNum(settings[SK.MASTER_VOLUME], 100);
  const preview = asNum(settings[SK.PREVIEW_VOLUME], 30);
  const mic = asNum(settings[SK.MIC_SENSITIVITY], 50);
  return (
    <div className="flex flex-col gap-3">
      {/* Master-Lautstaerke */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'settingsGraphicSound.masterVolume', 'Master-Lautst\u00E4rke')}</span>
          <span className="text-xs font-mono text-cyan-400">{master}%</span>
        </div>
        <TouchSlider
          value={master}
          min={0} max={100} step={1}
          onChange={(v) => sendSetting(SK.MASTER_VOLUME, String(v))}
        />
        <p className="text-[11px] text-white/30 mt-1">{tOr(t, 'settingsGraphicSound.masterVolumeDesc', 'Gesamtlautst\u00E4rke der Wiedergabe w\u00E4hrend des Singens.')}</p>
      </div>

      {/* R58: Lautstärke-Normalisierung (89 dB) ist permanent aktiv — der
          Toggle wurde entfernt (Nutzer-Vorgabe: keine Ausnahmen). */}

      {/* Preview-Lautstaerke */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'settings.previewVolume', 'Preview-Lautst\u00E4rke')}</span>
          <span className="text-xs font-mono text-cyan-400">{preview}%</span>
        </div>
        <TouchSlider
          value={preview}
          min={0} max={100} step={1}
          onChange={(v) => sendSetting(SK.PREVIEW_VOLUME, String(v))}
        />
      </div>

      {/* Mikrofon-Empfindlichkeit */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-white">{tOr(t, 'settings.micSensitivity', 'Mikrofon-Empfindlichkeit')}</span>
          <span className="text-xs font-mono text-cyan-400">{mic}%</span>
        </div>
        <TouchSlider
          value={mic}
          min={0} max={100} step={1}
          onChange={(v) => sendSetting(SK.MIC_SENSITIVITY, String(v))}
        />
        <p className="text-[11px] text-white/30 mt-1">{tOr(t, 'settings.micSensitivityDesc', 'Mikrofon-Eingangsempfindlichkeit anpassen')}</p>
      </div>

      {/* YouTube-Qualitaet */}
      <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
        <span className="text-sm font-medium text-white">{tOr(t, 'settingsGraphicSound.youtubeQuality', 'YouTube-Qualit\u00E4t')}</span>
        <div className="mt-2">
          <Dropdown
            options={ytQuality(t)}
            value={asStr(settings[SK.YOUTUBE_QUALITY], 'default')}
            onChange={(v) => sendSetting(SK.YOUTUBE_QUALITY, v)}
          />
        </div>
      </div>
    </div>
  );
}

// ===================== Sub-View: Webcam (R33/P6, telefonfreundlich) =====================
// Steuert die echte Desktop-Webcam-Config (WEBCAM_CONFIG als JSON-Blob).
// Jede Änderung wird als KOMPLETTES JSON via settings_set gesendet —
// genau das Format, das der Desktop via saveWebcamConfig() speichert.

function WebcamSettingsSection({ webcam, webcamKnown, snapshotAvailable, onUpdate, t }: {
  webcam: Record<string, unknown>;
  webcamKnown: boolean;
  snapshotAvailable: boolean;
  onUpdate: (updates: Record<string, unknown>) => void;
  t: (_key: string) => string;
}) {
  const enabled = webcam.enabled === true;
  const sizeMode = isWebcamSize(webcam.sizeMode) ? webcam.sizeMode : '2:10';
  const position = isWebcamPosition(webcam.position) ? webcam.position : 'bottom';
  const mirrored = webcam.mirrored !== false;
  const filter = isWebcamFilter(webcam.filter) ? webcam.filter : 'none';
  const opacityPct = Math.round(Math.min(1, Math.max(0.1, asNum(webcam.opacity, 1))) * 100);

  // Echte Desktop-Werte (webcam-types.ts): Vollbild / 20% / 30% / 40% Höhe.
  const sizeOptions = [
    { value: 'fullscreen', label: tOr(t, 'webcamSettings.fullscreen', 'Vollbild') },
    { value: '2:10', label: tOr(t, 'webcamSettings.smallStrip', '20%') },
    { value: '3:10', label: tOr(t, 'webcamSettings.mediumStrip', '30%') },
    { value: '4:10', label: tOr(t, 'webcamSettings.largeStrip', '40%') },
  ];

  // Echte Desktop-Positionen: Streifen oben/unten/links/rechts.
  const positionOptions = [
    { value: 'top', label: tOr(t, 'webcamSettings.top', 'Oben') },
    { value: 'bottom', label: tOr(t, 'webcamSettings.bottom', 'Unten') },
    { value: 'left', label: tOr(t, 'webcamSettings.left', 'Links') },
    { value: 'right', label: tOr(t, 'webcamSettings.right', 'Rechts') },
  ];

  const filterOptions = [
    { value: 'none', label: tOr(t, 'webcamSettings.filterNone', 'Keiner') },
    { value: 'grayscale', label: tOr(t, 'webcamSettings.filterGrayscale', 'Graustufen') },
    { value: 'sepia', label: tOr(t, 'webcamSettings.filterSepia', 'Sepia') },
    { value: 'contrast', label: tOr(t, 'webcamSettings.filterContrast', 'Kontrast') },
    { value: 'brightness', label: tOr(t, 'webcamSettings.filterBrightness', 'Helligkeit') },
    { value: 'saturate', label: tOr(t, 'webcamSettings.filterVibrant', 'Lebhaft') },
    { value: 'blur', label: tOr(t, 'webcamSettings.filterBlur', 'Weichzeichner') },
  ];

  // Noch keine Webcam-Config auf dem Desktop → kompakter Hinweis
  // (+ Aktivieren-Button, der eine Standard-Config remote anlegt).
  if (!webcamKnown) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-5 text-center" data-testid="mirror-webcam-empty">
          <p className="text-sm text-white/50 leading-relaxed">
            {snapshotAvailable
              ? tOr(t, 'mobile.mirrorSettingsWebcamNone', 'Auf dem Desktop ist noch keine Webcam eingerichtet. Aktiviere sie hier, um eine Standard-Konfiguration anzulegen.')
              : tOr(t, 'mobile.mirrorSettingsNoSnapshot', 'Desktop-Werte noch nicht empfangen — Standardwerte werden angezeigt')}
          </p>
          <button
            type="button"
            onClick={() => { haptic(); onUpdate({ enabled: true }); }}
            className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-semibold bg-cyan-500 text-white active:scale-[0.98] transition-transform"
            data-testid="mirror-webcam-enable"
          >
            {tOr(t, 'webcamSettings.enableWebcam', 'Webcam aktivieren')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="mirror-webcam-section">
      {/* An / Aus */}
      <SettingToggle
        label={tOr(t, 'webcamSettings.enableWebcam', 'Webcam aktivieren')}
        description={tOr(t, 'webcamSettings.enableWebcamDesc', 'S\u00E4nger w\u00E4hrend des Auftritts filmen')}
        value={enabled}
        onToggle={(v) => onUpdate({ enabled: v })}
        testId="mirror-webcam-toggle"
      />

      {enabled && (
        <>
          {/* Groesse */}
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <span className="text-sm font-medium text-white">{tOr(t, 'webcamSettings.size', 'Gr\u00F6\u00DFe')}</span>
            <p className="text-[11px] text-white/30 mt-0.5">{tOr(t, 'settingsWebcam.sizeOptionsDesc', 'Vollbild (gesamter Hintergrund) oder Overlays mit 20%, 30% bzw. 40% der Bildschirmh\u00F6he')}</p>
            <div className="mt-2">
              <PillRow
                options={sizeOptions}
                value={sizeMode}
                onSelect={(v) => onUpdate({ sizeMode: v })}
              />
            </div>
          </div>

          {/* Position (nur im Streifen-Modus, wie Desktop) */}
          {sizeMode !== 'fullscreen' && (
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
              <span className="text-sm font-medium text-white">{tOr(t, 'webcamSettings.position', 'Position')}</span>
              <div className="mt-2">
                <PillRow
                  options={positionOptions}
                  value={position}
                  onSelect={(v) => onUpdate({ position: v })}
                />
              </div>
            </div>
          )}

          {/* Spiegeln (Selfie-Modus) */}
          <SettingToggle
            label={tOr(t, 'webcamSettings.mirror', 'Spiegeln (Selfie-Modus)')}
            value={mirrored}
            onToggle={(v) => onUpdate({ mirrored: v })}
          />

          {/* Filter */}
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <span className="text-sm font-medium text-white">{tOr(t, 'webcamSettings.filter', 'Filter')}</span>
            <div className="mt-2">
              <PillRow
                options={filterOptions}
                value={filter}
                onSelect={(v) => onUpdate({ filter: v })}
                layout="scroll"
              />
            </div>
          </div>

          {/* Deckkraft */}
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-white">{tOr(t, 'webcamSettings.opacity', 'Deckkraft')}</span>
              <span className="text-xs font-mono text-cyan-400">{opacityPct}%</span>
            </div>
            <TouchSlider
              value={opacityPct}
              min={10} max={100} step={10}
              onChange={(v) => onUpdate({ opacity: v / 100 })}
            />
          </div>
        </>
      )}

      {/* Hinweis: Wann Änderungen auf dem Desktop ankommen */}
      <p className="text-[11px] text-white/30 text-center px-2 leading-relaxed">
        {tOr(t, 'mobile.mirrorSettingsWebcamSent', '\u00C4nderungen werden auf dem Desktop gespeichert und gelten ab dem n\u00E4chsten Song.')}
      </p>
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

  // R60-D: Reaktiver HTTPS-Info-Cache — im Companion füllt er sich über die
  // Selbst-Erkennung in buildCompanionUrl (eigenes https:// + DNS-Host =
  // DuckDNS-Domain), auf dem Desktop über den Boot-Fetch. Der Re-Render
  // aktualisiert QR + URL-Anzeige + Copy-Button-Inhalt synchron.
  const httpsInfo = useCompanionHttpsInfo();
  void httpsInfo; // bewusste Re-Render-Abhängigkeit

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

      <QrWlanHint className="justify-center text-center" />

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

export function MirrorSettingsLite({ onSendDesktopCommand, settingsSnapshot, isControlling }: MirrorSettingsLiteProps) {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState<string | null>(null);

    // Lokaler Einstellungs-State — startet mit Desktop-Defaults und wird per
    // settingsSnapshot (Prop-Push vom Desktop) mit den ECHTEN Werten befüllt.
    const [settings, setSettings] = useState<Record<string, string | boolean | number>>(() => ({ ...DEFAULTS }));

    // Webcam-Config als rohes Record (Desktop-JSON 1:1) + Flag, ob der
    // Desktop überhaupt eine Webcam-Config gespeichert hat.
    const [webcam, setWebcam] = useState<Record<string, unknown>>(() => ({ ...DEFAULT_WEBCAM_RECORD }));
    const [webcamKnown, setWebcamKnown] = useState(false);
    const webcamRef = useRef<Record<string, unknown>>(webcam);

    const applyWebcam = useCallback((next: Record<string, unknown>, known: boolean) => {
      webcamRef.current = next;
      setWebcam(next);
      setWebcamKnown(known);
    }, []);

    // R33: Echte Desktop-Werte übernehmen, sobald der Snapshot ankommt bzw.
    // sich ändert (Push-on-Change). Kein eigenes Fetchen nötig.
    useEffect(() => {
      if (!settingsSnapshot) return;
      const values = settingsSnapshot.values || {};
      setSettings(() => {
        const next: Record<string, string | boolean | number> = {};
        for (const key of SNAPSHOT_SETTING_KEYS) {
          const v = values[key];
          next[key] = (typeof v === 'string' && v.length > 0) ? v : DEFAULTS[key];
        }
        return next;
      });
      const rawCam = settingsSnapshot.webcam;
      if (rawCam && typeof rawCam === 'object') {
        applyWebcam({ ...DEFAULT_WEBCAM_RECORD, ...rawCam }, true);
      } else {
        applyWebcam({ ...DEFAULT_WEBCAM_RECORD }, false);
      }
    }, [settingsSnapshot, applyWebcam]);

    // Einstellung senden + lokal aktualisieren (optimistic update).
    // Muster exakt wie bisher: settings_set:<url-encoded key>:<url-encoded value>
    const sendSetting = useCallback((key: string, value: string) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (isControlling !== false) {
        onSendDesktopCommand(`settings_set:${encodeURIComponent(key)}:${encodeURIComponent(value)}`);
      }
    }, [onSendDesktopCommand, isControlling]);

    // Webcam-Änderung: lokal sofort reagieren (optimistic) und das KOMPLETTE
    // geänderte JSON an den Desktop senden (WEBCAM_CONFIG ist ein JSON-Blob —
    // der Desktop schreibt ihn 1:1 in den StorageKey, wie saveWebcamConfig()).
    const updateWebcam = useCallback((updates: Record<string, unknown>) => {
      const merged: Record<string, unknown> = { ...webcamRef.current, ...updates };
      // Desktop-Parität: beim Aktivieren nie im Vollbild-Modus starten
      // (WebcamSettingsPanel-An/Aus-Logik).
      if (updates.enabled === true && merged.sizeMode === 'fullscreen') {
        merged.sizeMode = '2:10';
      }
      applyWebcam(merged, true);
      if (isControlling !== false) {
        onSendDesktopCommand(`settings_set:${encodeURIComponent(SK.WEBCAM_CONFIG)}:${encodeURIComponent(JSON.stringify(merged))}`);
      }
    }, [applyWebcam, onSendDesktopCommand, isControlling]);

    // Zurueck zur Liste
    const handleBack = useCallback(() => {
      haptic();
      setActiveSection(null);
    }, []);

    // Sektion oeffnen (+ Desktop-Tab mitwechseln lassen)
    const handleOpen = useCallback((id: string) => {
      haptic();
      setActiveSection(id);
      if (isControlling !== false) {
        onSendDesktopCommand(`settings_tab:${id}`);
      }
    }, [onSendDesktopCommand, isControlling]);

    // -------- Sub-View: eine bestimmte Sektion --------
    if (activeSection) {
      const sectionInfo = SETTINGS_SECTIONS.find((s) => s.id === activeSection);
      const sectionLabel = sectionInfo ? tOr(t, sectionInfo.labelKey, sectionInfo.fallback) : '';
      const sectionIcon = sectionInfo?.icon || '';

      // Desktop-only Sektionen (komplexe Editor-/Device-Settings).
      // Webcam ist seit R33/P6 voll steuerbar und gehört NICHT mehr dazu.
      if (['microphone', 'library'].includes(activeSection)) {
        const descKey = sectionInfo?.descKey || '';
        const descFallback = sectionInfo?.descFallback || '';
        return (
          <div className="flex flex-col gap-3 px-4 pb-8">
            <SubViewHeader icon={sectionIcon} label={sectionLabel} onBack={handleBack} />
            <DesktopOnlyHint text={tOr(t, descKey, descFallback)} />
          </div>
        );
      }

      return (
        <div className="flex flex-col gap-3 px-4 pb-8">
          <SubViewHeader icon={sectionIcon} label={sectionLabel} onBack={handleBack} />

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
          {activeSection === 'webcam' && (
            <WebcamSettingsSection
              webcam={webcam}
              webcamKnown={webcamKnown}
              snapshotAvailable={!!settingsSnapshot}
              onUpdate={updateWebcam}
              t={t}
            />
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
        {/* Header — R33/P2: der Emoji-Muell-Rest ('\u2699\uFE0F' als roher
            JSX-Text) ist entfernt, stattdessen ein sinnvoller Untertitel. */}
        <div className="py-2">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorSettings')}
          </h2>
          <p className="text-[11px] text-white/40 mt-0.5">
            {tOr(t, 'mobile.mirrorSettingsSubtitle', 'Desktop-Einstellungen live vom Handy aus steuern')}
          </p>
        </div>

        {/* Hinweis: Snapshot noch nicht da → Defaults sichtbar */}
        {!settingsSnapshot && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 px-3 py-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <p className="text-[11px] text-amber-200/70">
              {tOr(t, 'mobile.mirrorSettingsNoSnapshot', 'Desktop-Werte noch nicht empfangen — Standardwerte werden angezeigt')}
            </p>
          </div>
        )}

        {/* Hinweis: keine Fernsteuerung (defensiv, Shell gated die View) */}
        {isControlling === false && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <p className="text-[11px] text-white/50">
              {tOr(t, 'mobile.mirrorSettingsNeedControl', '\u00DCbernimm die Fernsteuerung, um \u00C4nderungen an den Desktop zu senden')}
            </p>
          </div>
        )}

        {/* Settings-Buttons mit Beschreibung */}
        <div className="flex flex-col gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const label = t(section.labelKey) === section.labelKey
              ? section.fallback
              : t(section.labelKey);
            const desc = t(section.descKey) === section.descKey
              ? section.descFallback
              : t(section.descKey);
            const isDesktopOnly = ['microphone', 'library'].includes(section.id);
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
                  {section.id === 'webcam' && webcamKnown && webcam.enabled === true && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  )}
                  <span className="text-white/30 text-xs">{'\u2192'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
}

MirrorSettingsLite.displayName = 'MirrorSettingsLite';
