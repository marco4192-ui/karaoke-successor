'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song } from '@/types/game';
import { ProgressInfo } from './import-types';
import { useTranslation } from '@/lib/i18n/translations';

interface ImportPreviewProps {
  progress: ProgressInfo | null;
  error: string | null;
  previewSong: Song | null;
  audioUrl: string;
  videoUrl: string;
}

/** "m:ss" timestamp for the lyric line list. */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

/**
 * Song preview for the converter (Settings → Library → Import from other
 * karaoke systems).
 *
 * R14 (user request 4): this component existed but was never rendered — after
 * a successful Mugen/ASS/SingStar/StepMania import the user only saw a status
 * line, NO preview at all ("es wird kein Text dargestellt"). It is now shown
 * by AlternateFormatTab directly above the "Add to Library" button and
 * additionally displays the converted LYRIC TEXT line by line so the user can
 * verify the conversion result BEFORE committing it to the library.
 */
export function ImportPreview({ progress, error, previewSong, audioUrl, videoUrl }: ImportPreviewProps) {
  const { t } = useTranslation();

  const lineCount = previewSong?.lyrics.length ?? 0;
  const noteCount = previewSong?.lyrics.reduce((acc, l) => acc + l.notes.length, 0) ?? 0;

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
        <Card className="bg-white/5 border-white/10" data-testid="import-song-preview">
          <CardHeader>
            <CardTitle>{t('library.song.preview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold">{previewSong.title}</h3>
            <p className="text-white/60">{previewSong.artist}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>{previewSong.bpm} BPM</Badge>
              <Badge variant="outline" className="border-white/20">{previewSong.difficulty}</Badge>
              <Badge variant="outline" className="border-white/20">
                {noteCount} {t('game.notes')}
              </Badge>
              {previewSong.hasEmbeddedAudio && (
                <Badge className="bg-purple-500">{t('importExtra.videoAudio')}</Badge>
              )}
            </div>

            {/* ── R14: converted lyric text — the actual conversion result ── */}
            {lineCount > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    {t('importAlternateFormat.lyricsPreview')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {t('importAlternateFormat.lyricsPreviewStats')
                      .replace('{lines}', String(lineCount))
                      .replace('{notes}', String(noteCount))}
                  </span>
                </div>
                <div
                  className="max-h-64 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3 space-y-1"
                  data-testid="import-lyrics-preview"
                  role="log"
                  aria-label={t('importAlternateFormat.lyricsPreview')}
                >
                  {previewSong.lyrics.map((line, i) => (
                    <div key={line.id || `line-${i}`} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="shrink-0 pt-px font-mono text-[10px] tabular-nums text-cyan-400/70">
                        {formatTime(line.startTime)}
                      </span>
                      <span className="text-slate-200">
                        {line.text || (line.notes.length > 0
                          ? line.notes.map(n => n.lyric).filter(Boolean).join(' ')
                          : '—')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
