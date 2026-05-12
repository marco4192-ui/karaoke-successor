'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MusicIcon, TrophyIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== LOCAL ICONS (unique to this screen) =====================
function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// ===================== COMING SOON SCREEN =====================
export function OnlineMultiplayerScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-white/60 hover:text-white mb-4 flex items-center gap-2 transition-colors"
        >
          {t('onlineMultiplayer.backToParty')}
        </button>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <WifiIcon className="w-8 h-8 text-cyan-400" />
          {t('onlineMultiplayer.title')}
        </h1>
      </div>

      {/* Coming Soon Hero Card */}
      <Card className="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-white/10 mb-6 overflow-hidden">
        <CardContent className="py-12 text-center">
          <div className="text-7xl mb-6">🌐</div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {t('onlineMultiplayer.comingSoon')}
          </h2>
          <p className="text-white/60 text-lg max-w-md mx-auto mb-6">
            {t('onlineMultiplayer.description')}
          </p>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-sm px-4 py-1.5">
            {t('onlineMultiplayer.inDevelopment')}
          </Badge>
        </CardContent>
      </Card>

      {/* Planned Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.duelMode')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.duelModeDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.battleRoyale')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.battleRoyaleDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-pink-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.quickMatch')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.quickMatchDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <MusicIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.songVoting')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.songVotingDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <ShieldIcon className="w-5 h-5 text-green-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.rankingLeaderboard')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.rankingLeaderboardDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ZapIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="font-medium">{t('onlineMultiplayer.realTimeScoring')}</div>
            </div>
            <p className="text-sm text-white/50">
              {t('onlineMultiplayer.realTimeScoringDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Technical Preview Notice */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ZapIcon className="w-5 h-5 text-amber-400" />
            {t('onlineMultiplayer.technicalPreview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-white/60 leading-relaxed">
            {t('onlineMultiplayer.technicalPreviewDesc')}
          </p>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button
        onClick={onBack}
        className="w-full py-5 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
      >
        {t('onlineMultiplayer.backToPartyMode')}
      </Button>
    </div>
  );
}
