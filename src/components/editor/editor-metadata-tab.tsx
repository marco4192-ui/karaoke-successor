'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import { classifyVideoInput, getEffectiveVideoValue } from '@/lib/editor/video-classification';

interface EditorMetadataTabProps {
  song: Song;
  onSongChange: (updater: (_prev: Song) => Song) => void;
  onSetUnsavedChanges: () => void;
}

export function EditorMetadataTab({ song, onSongChange, onSetUnsavedChanges }: EditorMetadataTabProps) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="text-xs text-slate-400 mb-2">
          {t('editor.metadataTab.title')}
        </div>

        {/* VERSION */}
        <div className="space-y-2">
          <Label htmlFor="meta-version" className="text-slate-400 text-xs">#VERSION:</Label>
          <Input
            id="meta-version"
            value={song.version || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, version: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.versionPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* CREATOR */}
        <div className="space-y-2">
          <Label htmlFor="meta-creator" className="text-slate-400 text-xs">#CREATOR:</Label>
          <Input
            id="meta-creator"
            value={song.creator || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, creator: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.creatorPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* MP3 File */}
        <div className="space-y-2">
          <Label htmlFor="meta-mp3" className="text-slate-400 text-xs">#MP3:</Label>
          <Input
            id="meta-mp3"
            value={song.mp3File || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, mp3File: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="song.mp3"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* COVER File */}
        <div className="space-y-2">
          <Label htmlFor="meta-cover" className="text-slate-400 text-xs">#COVER:</Label>
          <Input
            id="meta-cover"
            value={song.coverFile || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, coverFile: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="cover.jpg"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* BACKGROUND File */}
        <div className="space-y-2">
          <Label htmlFor="meta-background" className="text-slate-400 text-xs">#BACKGROUND:</Label>
          <Input
            id="meta-background"
            value={song.backgroundFile || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, backgroundFile: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder="background.jpg"
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* VIDEO File / URL — accepts local names, URLs and full embed codes.
            #SOURCE: is the new key convention — both keys are parsed identically. */}
        <div className="space-y-2">
          <Label htmlFor="meta-video" className="text-slate-400 text-xs">#VIDEO: / #SOURCE:</Label>
          <Input
            id="meta-video"
            value={getEffectiveVideoValue(song)}
            onChange={(e) => {
              // Classify into the correct Song field (platform URL, direct URL
              // or local file) and CLEAR the other video fields — otherwise a
              // stale platform URL would keep winning in generateUltraStarTxt
              // and the new value would never reach the txt file.
              onSongChange(prev => ({ ...prev, ...classifyVideoInput(e.target.value) }));
              onSetUnsavedChanges();
            }}
            placeholder="video.mp4 · https://… · VK-Einbetten-Code"
            className="bg-slate-800 border-slate-600 h-8"
          />
          <p className="text-[10px] text-slate-500">
            {t('editor.metadataTab.videoHint')}
          </p>
          <p className="text-[10px] text-slate-500">
            {t('editor.newSongDialog.videoKeyNote')}
          </p>
        </div>

        <Separator className="bg-slate-700" />

        {/* PREVIEWSTART */}
        <div className="space-y-2">
          <Label htmlFor="meta-previewstart" className="text-slate-400 text-xs">#PREVIEWSTART: ({t('editor.metadataTab.seconds')})</Label>
          <Input
            id="meta-previewstart"
            type="number"
            value={song.previewStart ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isNaN(v)) return;
              onSongChange(prev => ({ ...prev, previewStart: v }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.gapPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* PREVIEWDURATION */}
        <div className="space-y-2">
          <Label htmlFor="meta-previewduration" className="text-slate-400 text-xs">#PREVIEWDURATION: ({t('editor.metadataTab.seconds')})</Label>
          <Input
            id="meta-previewduration"
            type="number"
            value={song.previewDuration ?? ''}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isNaN(v)) return;
              onSongChange(prev => ({ ...prev, previewDuration: v }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.endGapPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* MEDLEYSTARTBEAT */}
        <div className="space-y-2">
          <Label htmlFor="meta-medleystart" className="text-slate-400 text-xs">#MEDLEYSTARTBEAT:</Label>
          <Input
            id="meta-medleystart"
            type="number"
            value={song.medleyStartBeat ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) return;
              onSongChange(prev => ({ ...prev, medleyStartBeat: v }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.beatPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* MEDLEYENDBEAT */}
        <div className="space-y-2">
          <Label htmlFor="meta-medleyend" className="text-slate-400 text-xs">#MEDLEYENDBEAT:</Label>
          <Input
            id="meta-medleyend"
            type="number"
            value={song.medleyEndBeat ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) return;
              onSongChange(prev => ({ ...prev, medleyEndBeat: v }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.beatPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        <Separator className="bg-slate-700" />

        {/* END */}
        <div className="space-y-2">
          <Label htmlFor="meta-end" className="text-slate-400 text-xs">#END: ({t('editor.metadataTab.milliseconds')})</Label>
          <Input
            id="meta-end"
            type="number"
            value={song.end ?? ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) return;
              onSongChange(prev => ({ ...prev, end: v }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.songEndPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
        </div>

        {/* TAGS */}
        <div className="space-y-2">
          <Label htmlFor="meta-tags" className="text-slate-400 text-xs">#TAGS:</Label>
          <Input
            id="meta-tags"
            value={song.tags || ''}
            onChange={(e) => {
              onSongChange(prev => ({ ...prev, tags: e.target.value || undefined }));
              onSetUnsavedChanges();
            }}
            placeholder={t('editor.metadataTab.tagsPlaceholder')}
            className="bg-slate-800 border-slate-600 h-8"
          />
          <p className="text-xs text-slate-500">{t('editor.metadataTab.commaSeparatedTags')}</p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Voice names — P1/P2 (duet) plus P4/P8 for trio/quartet songs.
            The extra inputs only appear when the song actually has 3rd/4th
            voice notes (P4/P8 tags), so classic duets stay compact. */}
        {(['P1', 'P2', 'P4', 'P8'] as const).map((tag, idx) => {
          // P1/P2 inputs are always shown (classic duet); P4/P8 only when used
          const hasVoice = idx < 2
            || song.lyrics.some(line => line.notes.some(n => n.player === tag));
          if (!hasVoice) return null;
          const label = idx === 0 ? t('editor.metadataTab.duetPlayer1')
            : idx === 1 ? t('editor.metadataTab.duetPlayer2')
              : idx === 2 ? t('editor.metadataTab.duetPlayer3')
                : t('editor.metadataTab.duetPlayer4');
          const setVoiceName = (value: string) => {
            onSongChange(prev => {
              const names = [...(prev.duetPlayerNames ?? ['Player 1', 'Player 2', '', ''])];
              while (names.length < 4) names.push('');
              names[idx] = value;
              return { ...prev, isDuet: true, duetPlayerNames: names };
            });
            onSetUnsavedChanges();
          };
          return (
            <div key={tag} className="space-y-2">
              <Label htmlFor={`meta-${tag.toLowerCase()}`} className="text-slate-400 text-xs">
                {label}
                {idx >= 2 && <span className="ml-1.5 text-[10px] text-slate-600 font-mono">#{tag}</span>}
              </Label>
              <Input
                id={`meta-${tag.toLowerCase()}`}
                value={song.duetPlayerNames?.[idx] || ''}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder={t('editor.metadataTab.duetPlayer1Placeholder')}
                className="bg-slate-800 border-slate-600 h-8"
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
