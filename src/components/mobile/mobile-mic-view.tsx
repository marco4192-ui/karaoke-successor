'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicIcon } from '@/components/icons';
import { midiToNoteName } from '@/types/game';
import { apiClient } from '@/lib/api-client';
import type { MobilePitchData } from '@/hooks/use-mobile-microphone';

interface MobileMicViewProps {
  clientId: string | null;
  isAdPlaying: boolean;
  isListening: boolean;
  currentPitch: MobilePitchData;
  onStartMicrophone: () => Promise<void>;
  onStopMicrophone: () => void;
}

/**
 * Microphone view for mobile companion app
 * Shows pitch detection and microphone controls
 */
export function MobileMicView({
  clientId,
  isAdPlaying,
  isListening,
  currentPitch,
  onStartMicrophone,
  onStopMicrophone,
}: MobileMicViewProps) {
  return (
    <div className="p-4">
      {/* Ad Playing Banner */}
      {isAdPlaying && (
        <Card className="bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 mb-4">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                <div>
                  <p className="font-bold text-orange-300">Werbung läuft</p>
                  <p className="text-sm text-white/70">Spiel pausiert</p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  try {
                    await apiClient.mobileAction('skipAd', clientId || undefined);
                  } catch (error) {
                    console.error('Skip ad failed:', error);
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold px-6 py-3"
              >
                ⏭️ Werbung überspringen
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
                style={{ width: `${currentPitch.volume * 100}%` }}
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
              onClick={isListening ? onStopMicrophone : onStartMicrophone}
              className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500 hover:bg-red-400 animate-pulse shadow-lg shadow-red-500/50'
                  : 'bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-purple-500/30'
              }`}
            >
              <MicIcon className="w-20 h-20 text-white" />
            </button>
            <p className="mt-6 text-lg text-white/60">
              {isListening ? 'Tap to stop' : 'Tap to sing'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileMicView;
