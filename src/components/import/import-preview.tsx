'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song } from '@/types/game';
import { ProgressInfo } from './import-types';

interface ImportPreviewProps {
  progress: ProgressInfo | null;
  error: string | null;
  previewSong: Song | null;
  audioUrl: string;
  videoUrl: string;
}

export function ImportPreview({ progress, error, previewSong, audioUrl, videoUrl }: ImportPreviewProps) {
  return (
    <>
      {progress && progress.stage !== 'complete' && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress.progress} className="flex-1" />
              <span className="text-sm text-white/60">{progress.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4 text-red-400">{error}</CardContent>
        </Card>
      )}

      {previewSong && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold">{previewSong.title}</h3>
            <p className="text-white/60">{previewSong.artist}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{previewSong.bpm} BPM</Badge>
              <Badge variant="outline" className="border-white/20">{previewSong.difficulty}</Badge>
              <Badge variant="outline" className="border-white/20">
                {previewSong.lyrics.reduce((acc, l) => acc + l.notes.length, 0)} notes
              </Badge>
              {previewSong.hasEmbeddedAudio && (
                <Badge className="bg-purple-500">Video Audio</Badge>
              )}
            </div>
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full mt-4" />
            )}
            {videoUrl && (
              <video src={videoUrl} controls className="w-full h-48 rounded-lg object-cover mt-4" />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
