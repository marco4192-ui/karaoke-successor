'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { midiToNoteName } from '@/types/game';
import { MicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameState} from './mobile-types';

interface MicViewProps {
  gameState: GameState;
  clientId: string | null;
  currentPitch: { frequency: number | null; note: number | null; volume: number };
  isListening: boolean;
  micPermissionDenied?: boolean;
  onStartMic: () => void;
  onStopMic: () => void;
}

export function MobileMicView({ gameState, clientId, currentPitch, isListening, micPermissionDenied, onStartMic, onStopMic }: MicViewProps) {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      {/* Microphone Permission Denied Banner */}
      {micPermissionDenied && (
        <Card className="bg-gradient-to-r from-red-500/30 to-orange-500/30 border-red-500/50 mb-4">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center text-xl">
                  🚫
                </div>
                <div>
                  <p className="font-bold text-red-300">{t('mobileMicView.permissionDenied')}</p>
                  <p className="text-sm text-white/70">{t('mobileMicView.permissionDesc')}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-white/60">
                <p>{t('mobileMicView.howToAllow')}</p>
                <p>1. {t('mobileMicView.step1')}</p>
                <p>2. {t('mobileMicView.step2')}</p>
                <p>3. {t('mobileMicView.step3')}</p>
              </div>
              <details className="text-xs text-white/40">
                <summary className="cursor-pointer hover:text-white/60">{t('mobileMicView.moreHelp')}</summary>
                <div className="mt-2 space-y-1">
                  <p className="font-semibold text-white/60">{t('mobileMicView.iOS')}</p>
                  <p>{t('mobileMicView.iOSSteps')}</p>
                  <p className="font-semibold text-white/60 mt-1">{t('mobileMicView.android')}</p>
                  <p>{t('mobileMicView.androidSteps')}</p>
                  <p className="font-semibold text-white/60 mt-1">{t('mobileMicView.desktop')}</p>
                  <p>{t('mobileMicView.desktopSteps')}</p>
                </div>
              </details>
              <Button
                onClick={onStartMic}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold"
              >
                {t('mobileMicView.tapToRetry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Ad Playing Banner */}
      {gameState.isAdPlaying && (
        <Card className="bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-bold text-orange-300">{t('mobileMicView.adPlaying')}</p>
                  <p className="text-sm text-white/70">{t('mobileMicView.gamePaused')}</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await fetch('/api/mobile', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        type: 'skipAd',
                        clientId: clientId,
                      }),
                    });
                  } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Skip ad failed:', error);
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold px-6 py-3"
              >
                {t('mobileMicView.skipAd')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card className="bg-white/10 border-white/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center">
            {/* Volume Indicator */}
            <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-6">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, currentPitch.volume * 100))}%` }}
              />
            </div>
            
            {/* Pitch Display */}
            {currentPitch.note !== null && (
              <div className="text-center mb-6">
                <div className="text-6xl font-bold text-cyan-400">
                  {midiToNoteName(Math.round(currentPitch.note))}
                </div>
                <div className="text-sm text-white/60">
                  {currentPitch.frequency?.toFixed(1)} Hz
                </div>
              </div>
            )}
            
            {/* Microphone Button */}
            <button
              onClick={isListening ? onStopMic : onStartMic}
              aria-label={isListening ? t('mobileMicView.tapToStop') : t('mobileMicView.tapToSing')}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-400 animate-pulse shadow-lg shadow-red-500/50' 
                  : 'bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-purple-500/30'
              }`}
            >
              <MicIcon className="w-20 h-20 text-white" />
            </button>
            <p className="mt-6 text-lg text-white/60">
              {isListening ? t('mobileMicView.tapToStop') : t('mobileMicView.tapToSing')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
