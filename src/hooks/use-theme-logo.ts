'use client';

// R92: theme-aware brand logos. The active theme defines which logo assets
// are shown (e.g. AfterTen Green → green clock badge + green lockup). This
// hook resolves the asset paths and keeps them in sync with theme changes.

import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_THEME,
  getStoredTheme,
  themeLogoAssets,
  type Theme,
} from '@/lib/game/themes';

export interface ThemeLogoState {
  /** Clock badge src (navbar brand mark, settings about card). */
  badge: string;
  /** Full lockup src (home hero). */
  lockup: string;
  /** Active theme primary color (#rrggbb) — use for glow drop-shadows. */
  primary: string;
  /** Active theme id ('afterten' = default cyan look). */
  themeId: string;
}

/**
 * Returns the logo assets matching the active theme.
 *
 * - Initial render uses the DEFAULT theme (SSR/hydration-safe, no
 *   server/client mismatch — same contract as the rest of the theming,
 *   which is applied client-side after mount too).
 * - On mount the stored theme is applied.
 * - `themeChanged` (dispatched by applyTheme) updates reactively, so the
 *   logos swap live while the user picks themes in the settings.
 * - The swap waits until the new assets are preloaded — no broken-image
 *   flash. If an asset fails to load the previous logo stays visible.
 */
export function useThemeLogo(): ThemeLogoState {
  const [state, setState] = useState<ThemeLogoState>(() => ({
    ...themeLogoAssets(DEFAULT_THEME),
    primary: DEFAULT_THEME.colors.primary,
    themeId: DEFAULT_THEME.id,
  }));

  // Guard against stale preloads when the user switches themes rapidly:
  // only the most recent request may commit its state.
  const requestRef = useRef(0);

  useEffect(() => {
    const commit = (theme: Theme) => {
      const assets = themeLogoAssets(theme);
      const next: ThemeLogoState = {
        ...assets,
        primary: theme.colors.primary,
        themeId: theme.id,
      };

      const current = requestRef.current;
      const needed = [assets.badge, assets.lockup];
      let remaining = needed.length;
      let failed = false;

      needed.forEach((src) => {
        const img = new Image();
        img.onload = () => {
          if (requestRef.current !== current) return;
          remaining -= 1;
          if (remaining === 0 && !failed) setState(next);
        };
        img.onerror = () => {
          if (requestRef.current !== current) return;
          failed = true;
          // eslint-disable-next-line no-console
          console.warn(`[useThemeLogo] asset failed to load, keeping previous logo: ${src}`);
        };
        img.src = src;
      });
    };

    // Apply the stored preference after mount (client-only read).
    requestRef.current += 1;
    commit(getStoredTheme() ?? DEFAULT_THEME);

    // Live swap when a theme gets applied (settings picker, app boot echo).
    const onThemeChanged = (e: Event) => {
      const theme = (e as CustomEvent<Theme>).detail;
      if (!theme || !theme.colors) return;
      requestRef.current += 1;
      commit(theme);
    };
    window.addEventListener('themeChanged', onThemeChanged);
    return () => window.removeEventListener('themeChanged', onThemeChanged);
  }, []);

  return state;
}
