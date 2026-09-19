'use client';

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import { leaderboardService } from '@/lib/api/leaderboard-service';
import { safeAlert } from '@/lib/safe-dialog';
import { MusicIcon } from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';
import { Monitor, Cpu, PackageCheck, PackageX, Server } from 'lucide-react';

interface AboutTabProps {
  tx: (_key: string) => string;
  isTauriDetected: boolean;
}

/** Response of the Rust `app_get_platform` command. */
interface PlatformInfo {
  os: string;
  arch: string;
  family: string;
  bundled_node: boolean;
  bundled_onnx: boolean;
  ort_lib_path: string | null;
  server_port: number;
}

const OS_LABELS: Record<string, string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
};

/** Accent per OS — matches the app's pink/cyan/purple palette (no blue/indigo). */
function osBadgeClass(os: string): string {
  switch (os) {
    case 'windows': return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    case 'macos': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    case 'linux': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    default: return 'bg-white/5 text-white/70 border-white/20';
  }
}

function StatusIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <PackageCheck className="w-5 h-5 text-green-400 shrink-0" aria-hidden />
  ) : (
    <PackageX className="w-5 h-5 text-red-400 shrink-0" aria-hidden />
  );
}

export function AboutTab({
  tx,
  isTauriDetected,
}: AboutTabProps) {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);

  // Fetch platform/runtime diagnostics from the Rust backend (Tauri only).
  // In the browser the card is not rendered at all.
  useEffect(() => {
    if (!isTauriDetected) return;
    let cancelled = false;
    (async () => {
      try {
        const info = await invoke<PlatformInfo>('app_get_platform');
        if (!cancelled) setPlatform(info);
      } catch {
        // Command unavailable (older desktop build) — keep the card hidden.
      }
    })();
    return () => { cancelled = true; };
  }, [isTauriDetected]);

  return (
    <div className="space-y-6">
      <Card className="retro-gradient-card retro-border-pink rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff2d95] via-[#bf5af2] to-[#00e5ff] flex items-center justify-center retro-box-glow-pink">
              <MusicIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-xl font-black">
                <span className="text-[#ff2d95]">Karaoke</span>{' '}
                <span className="text-[#00e5ff]">ZERO</span>
              </div>
              <div className="text-sm text-white/60">{tx('settings.version')} 1.0.0</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 mb-4">
            {tx('settings.aboutDesc')}
          </p>
          <div className="space-y-2 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span className="text-[#00e5ff]">&#10022;</span>
              {tx('settings.feature1')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00e5ff]">&#10022;</span>
              {tx('settings.feature2')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00e5ff]">&#10022;</span>
              {tx('settings.feature3')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00e5ff]">&#10022;</span>
              {tx('settings.feature4')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#00e5ff]">&#10022;</span>
              {tx('settings.feature5')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System & Runtime diagnostics (desktop app only) */}
      {isTauriDetected && platform && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5 text-cyan-400" aria-hidden />
              {t('settingsAbout.platformInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Operating system + architecture */}
              <div className={`rounded-lg border p-3 ${osBadgeClass(platform.os)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className="w-4 h-4 shrink-0" aria-hidden />
                  <span className="text-[11px] uppercase tracking-wider opacity-70">
                    {t('settingsAbout.platformOs')}
                  </span>
                </div>
                <div className="font-bold text-lg leading-tight">
                  {OS_LABELS[platform.os] ?? platform.os}
                </div>
                <div className="flex items-center gap-1.5 text-xs opacity-80 mt-1">
                  <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {platform.arch}
                </div>
              </div>

              {/* Bundled runtimes (Node.js + ONNX Runtime) */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] uppercase tracking-wider text-white/40 mb-2">
                  {t('settingsAbout.platformNode')} / {t('settingsAbout.platformOnnx')}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-white/70 truncate">{t('settingsAbout.platformNode')}</span>
                    <span className="flex items-center gap-1.5">
                      <StatusIcon ok={platform.bundled_node} />
                      <span className={platform.bundled_node ? 'text-green-400' : 'text-red-400'}>
                        {platform.bundled_node ? t('settingsAbout.platformReady') : t('settingsAbout.platformMissing')}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-white/70 truncate">{t('settingsAbout.platformOnnx')}</span>
                    <span className="flex items-center gap-1.5">
                      <StatusIcon ok={platform.bundled_onnx} />
                      <span className={platform.bundled_onnx ? 'text-green-400' : 'text-red-400'}>
                        {platform.bundled_onnx ? t('settingsAbout.platformReady') : t('settingsAbout.platformMissing')}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Local server */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="w-4 h-4 text-pink-400 shrink-0" aria-hidden />
                  <span className="text-[11px] uppercase tracking-wider text-white/40">
                    {t('settingsAbout.platformServer')}
                  </span>
                </div>
                <div className="font-mono text-sm text-cyan-300">localhost:{platform.server_port}</div>
                <div className="text-xs text-white/40 mt-1">
                  {t('settingsAbout.platformReady')}
                </div>
              </div>
            </div>

            {(!platform.bundled_node || !platform.bundled_onnx) && (
              <p className="mt-3 text-xs text-amber-300/80">
                {t('settingsAbout.platformMissingHint')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{t('settingsAbout.technologyStack')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-cyan-400 font-medium">Next.js 15</div>
              <div className="text-xs text-white/40">{tx('settings.framework')}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-purple-400 font-medium">React</div>
              <div className="text-xs text-white/40">{tx('settings.uiLibrary')}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-pink-400 font-medium">Zustand</div>
              <div className="text-xs text-white/40">{tx('settings.stateManagement')}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-yellow-400 font-medium">Tailwind CSS</div>
              <div className="text-xs text-white/40">{tx('settings.styling')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Status */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{t('settingsAbout.onlineLeaderboard')}</h4>
              <p className="text-sm text-white/60">{t('settingsAbout.onlineLeaderboardDesc')}</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const connected = await leaderboardService.testConnection();
                safeAlert(connected ? t('settingsAbout.connected') : t('settingsAbout.notConnected'));
              }}
              className="border-cyan-500/50 text-cyan-400"
            >
              {t('settingsAbout.testConnection')}
            </Button>
          </div>
        </CardContent>
      </Card>

      
      {/* Tauri Desktop App Info - Show in Tauri mode */}
      {isTauriDetected && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-400">{t('settingsAbout.desktopInstalled')}</h4>
              <p className="text-sm text-white/60">{t('settingsAbout.desktopInstalledDesc')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
