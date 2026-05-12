'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { safeAlert } from '@/lib/safe-dialog';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameResults, MobileView } from './mobile-types';

interface ResultsViewProps {
  gameResults: GameResults | null;
  onNavigate: (_view: MobileView) => void;
}

export function MobileResultsView({ gameResults, onNavigate }: ResultsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4 max-w-md mx-auto">
      {gameResults ? (
        <div className="space-y-4">
          {/* Score Card */}
          <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
            <CardContent className="py-6">
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">{t('mobileViews.youJustPlayed')}</p>
                <h2 className="text-xl font-bold mb-1">{gameResults.songTitle}</h2>
                <p className="text-white/60">{gameResults.songArtist}</p>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{gameResults.score.toLocaleString()}</p>
                  <p className="text-xs text-white/40">{t('mobileViews.score')}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">{gameResults.accuracy.toFixed(1)}%</p>
                  <p className="text-xs text-white/40">{t('mobileViews.accuracy')}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{gameResults.maxCombo}x</p>
                  <p className="text-xs text-white/40">{t('mobileViews.bestCombo')}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{gameResults.rating}</p>
                  <p className="text-xs text-white/40">{t('mobileViews.rating')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Social Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => {
                safeAlert(t('mobileViews.saveScoreCardSoon'));
              }}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {t('mobileViews.saveScoreCard')}
            </Button>
            <Button 
              onClick={() => {
                const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n#KaraokeZERO`;
                if (navigator.share) {
                  navigator.share({ text }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(text);
                  safeAlert(t('mobileViews.scoreCopied'));
                }
              }}
              variant="outline"
              className="border-white/20"
            >
              {t('mobileViews.shareScore')}
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={() => onNavigate('home')}
              variant="outline"
              className="flex-1 border-white/20"
            >
              {t('mobileViews.home')}
            </Button>
            <Button 
              onClick={() => onNavigate('queue')}
              variant="outline"
              className="flex-1 border-white/20"
            >
              {t('mobileViews.queueBtn')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-white/40">
          <span className="text-4xl mb-4 block">📊</span>
          <p>{t('mobileViews.noRecentResults')}</p>
          <p className="text-sm mt-2">{t('mobileViews.singForResults')}</p>
          <Button 
            onClick={() => onNavigate('home')}
            variant="outline"
            className="mt-4 border-white/20"
          >
            {t('mobileViews.goHome')}
          </Button>
        </div>
      )}
    </div>
  );
}
