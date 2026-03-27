'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WebcamSettingsPanel, WebcamBackground, WebcamBackgroundConfig } from '@/components/game/webcam-background';
import { InfoIcon, WebcamIcon } from '@/components/icons';

interface WebcamTabContentProps {
  webcamConfig: WebcamBackgroundConfig;
  onUpdateWebcamConfig: (updates: Partial<WebcamBackgroundConfig>) => void;
}

export function WebcamTabContent({ webcamConfig, onUpdateWebcamConfig }: WebcamTabContentProps) {
  return (
    <div className="space-y-6">
      <WebcamSettingsPanel 
        config={webcamConfig}
        onConfigChange={onUpdateWebcamConfig}
      />
      
      {/* Webcam Info Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-cyan-400" />
            About Webcam Background
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-white/70">
            <p>
              <strong className="text-white">📹 Purpose:</strong> The webcam is a <span className="text-cyan-400">SEPARATE camera</span> for filming singers while they perform. It is NOT the streaming/microphone camera.
            </p>
            <p>
              <strong className="text-white">📐 Size Options:</strong> Choose from Fullscreen (entire background), or proportional overlays (20%, 30%, 40% of screen height).
            </p>
            <p>
              <strong className="text-white">📍 Position:</strong> Place the webcam strip at the top, bottom, left, or right of the screen.
            </p>
            <p>
              <strong className="text-white">🪞 Mirror Mode:</strong> Enable selfie-style mirroring for a natural self-view.
            </p>
            <p>
              <strong className="text-white">🎨 Filters:</strong> Apply visual filters like Grayscale, Sepia, or Vibrant for artistic effects.
            </p>
            <p className="text-xs text-white/40 mt-4">
              💡 Tip: Use the webcam to record singers and create memorable karaoke moments!
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Webcam Preview Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Preview
          </CardTitle>
          <CardDescription>
            Preview your webcam settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
            <WebcamBackground 
              config={webcamConfig}
              onConfigChange={onUpdateWebcamConfig}
            />
            {!webcamConfig.enabled && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                <div className="text-center">
                  <WebcamIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Enable webcam to see preview</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
