'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import { leaderboardService } from '@/lib/api/leaderboard-service';
import { safeAlert } from '@/lib/safe-dialog';
import { MusicIcon } from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';

interface AboutTabProps {
  tx: (_key: string) => string;
  isTauriDetected: boolean;
}

export function AboutTab({
  tx,
  isTauriDetected,
}: AboutTabProps) {
  const { t } = useTranslation();
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
                <span className="text-[#00e5ff]">Eleven</span>
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
      
      <Card className="bg-[#0a0014]/60 border-[#bf5af2]/20 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-[#00e5ff]">{t('settingsAbout.technologyStack')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a0014]/80 rounded-lg p-3 text-center border border-white/5">
              <div className="text-[#00e5ff] font-medium">Next.js 15</div>
              <div className="text-xs text-white/40">{tx('settings.framework')}</div>
            </div>
            <div className="bg-[#0a0014]/80 rounded-lg p-3 text-center border border-white/5">
              <div className="text-[#bf5af2] font-medium">React</div>
              <div className="text-xs text-white/40">{tx('settings.uiLibrary')}</div>
            </div>
            <div className="bg-[#0a0014]/80 rounded-lg p-3 text-center border border-white/5">
              <div className="text-[#ff2d95] font-medium">Zustand</div>
              <div className="text-xs text-white/40">{tx('settings.stateManagement')}</div>
            </div>
            <div className="bg-[#0a0014]/80 rounded-lg p-3 text-center border border-white/5">
              <div className="text-[#ffd60a] font-medium">Tailwind CSS</div>
              <div className="text-xs text-white/40">{tx('settings.styling')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Status */}
      <Card className="bg-[#0a0014]/60 border-[#bf5af2]/20 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-[#00e5ff]">{t('settingsAbout.onlineLeaderboard')}</h4>
              <p className="text-sm text-white/60">{t('settingsAbout.onlineLeaderboardDesc')}</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const connected = await leaderboardService.testConnection();
                safeAlert(connected ? t('settingsAbout.connected') : t('settingsAbout.notConnected'));
              }}
              className="border-[#00e5ff]/50 text-[#00e5ff] hover:bg-[#00e5ff]/10 hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] transition-shadow"
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
