'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { safeAlert } from '@/lib/safe-dialog';
import { useTranslation } from '@/lib/i18n/translations';
import { MobilePhotoBooth } from './mobile-photo-booth';
import type { GameResults, MobileView } from './mobile-types';
import {
  loadUserStats,
  saveUserStats,
  updateStatsFromResults,
  checkNewAchievements,
} from '@/lib/mobile-achievements';

interface ResultsViewProps {
  gameResults: GameResults | null;
  onNavigate: (_view: MobileView) => void;
  onPlayAgain?: () => void;
}

export function MobileResultsView({ gameResults, onNavigate, onPlayAgain }: ResultsViewProps) {
  const { t } = useTranslation();
  const [showPhotoBooth, setShowPhotoBooth] = useState(false);

  // Update user stats and check for new achievements when results come in
  useEffect(() => {
    if (!gameResults) return;
    const currentStats = loadUserStats();
    const updatedStats = updateStatsFromResults(currentStats, gameResults);
    saveUserStats(updatedStats);

    // Dispatch a custom event so the profile view can refresh stats
    const newAchievements = checkNewAchievements(updatedStats);
    if (newAchievements.length > 0) {
      window.dispatchEvent(new CustomEvent('mobile-achievements-updated'));
    }
  }, [gameResults]);

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
                  <p className="text-3xl font-bold text-purple-400">{(gameResults.accuracy != null && !isNaN(gameResults.accuracy) ? gameResults.accuracy : 0).toFixed(1)}%</p>
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

          {/* Play Again */}
          {onPlayAgain && gameResults.songId && (
            <Button
              onClick={onPlayAgain}
              className="w-full h-12 text-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25"
            >
              🔄 {t('mobileViews.playAgain')}
            </Button>
          )}
          
          {/* Social Actions */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => setShowPhotoBooth(true)}
              variant="outline"
              className="border-white/20"
            >
              📸 Photo
            </Button>
            <Button 
              onClick={() => {
                safeAlert(t('mobileViews.saveScoreCardSoon'));
              }}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 col-span-1"
            >
              {t('mobileViews.saveScoreCard')}
            </Button>
            <Button 
              onClick={async () => {
                const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n${t('mobileViews.shareHashtag')}`;
                if (navigator.share) {
                  navigator.share({ text }).catch(() => {});
                } else {
                  try {
                    await navigator.clipboard.writeText(text);
                    safeAlert(t('mobileViews.scoreCopied'));
                  } catch {
                    safeAlert(t('mobileViews.copyFailed'));
                  }
                }
              }}
              variant="outline"
              className="border-white/20 col-span-1"
            >
              {t('mobileViews.shareScore')}
            </Button>
          </div>

          {/* Photo Booth Overlay */}
          {showPhotoBooth && (
            <MobilePhotoBooth
              gameResults={gameResults}
              onClose={() => setShowPhotoBooth(false)}
            />
          )}
          
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
