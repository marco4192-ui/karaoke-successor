import { StorageKeys, getItem } from '@/lib/storage';

/**
 * R33: Builds the settings snapshot the desktop embeds in its 2s gamestate
 * POST. The companion Settings mirror reads it via GET action=settingssnapshot
 * so it shows the REAL desktop values instead of hardcoded defaults.
 *
 * Whitelist: only the keys the companion Settings mirror can display or edit.
 * The webcam config is included as a parsed JSON object (full
 * WebcamBackgroundConfig) so the mirror can toggle enable/size/position.
 */

const SNAPSHOT_KEYS: readonly string[] = [
  StorageKeys.DEFAULT_DIFFICULTY,
  StorageKeys.LANGUAGE,
  StorageKeys.SHOW_SCORE,
  StorageKeys.SHOW_PARTICLES,
  StorageKeys.SHOW_COMBO,
  StorageKeys.REPLAY_ENABLED,
  StorageKeys.AUTO_FULLSCREEN,
  StorageKeys.WARNING_CUES,
  StorageKeys.BG_VIDEO,
  StorageKeys.ANIMATED_BG,
  StorageKeys.PERFORMANCE_MODE,
  StorageKeys.LYRICS_STYLE,
  StorageKeys.LYRICS_SIZE,
  StorageKeys.THEME,
  StorageKeys.NOTE_DISPLAY_MODE,
  StorageKeys.NOTE_SEALED_HIT_COLOR,
  StorageKeys.MASTER_VOLUME,
  StorageKeys.PREVIEW_VOLUME,
  StorageKeys.MIC_SENSITIVITY,
  StorageKeys.YOUTUBE_QUALITY,
  // R58: LOUDNESS_NORMALIZATION removed from the snapshot — the 89 dB
  // normalization is permanently active (no toggle anymore, nothing to sync).
];

export interface DesktopSettingsSnapshot {
  values: Record<string, string>;
  webcam: Record<string, unknown> | null;
  defaultDifficulty?: string;
}

export function buildSettingsSnapshot(): DesktopSettingsSnapshot {
  const values: Record<string, string> = {};
  for (const key of SNAPSHOT_KEYS) {
    const v = getItem(key);
    if (v !== null) values[key] = v;
  }

  let webcam: Record<string, unknown> | null = null;
  const webcamRaw = getItem(StorageKeys.WEBCAM_CONFIG);
  if (webcamRaw) {
    try {
      const parsed = JSON.parse(webcamRaw);
      if (parsed && typeof parsed === 'object') webcam = parsed as Record<string, unknown>;
    } catch { /* corrupt config — treat as absent */ }
  }

  const defaultDifficulty =
    (values[StorageKeys.DEFAULT_DIFFICULTY] as 'easy' | 'medium' | 'hard' | undefined) ?? 'medium';

  return { values, webcam, defaultDifficulty };
}
