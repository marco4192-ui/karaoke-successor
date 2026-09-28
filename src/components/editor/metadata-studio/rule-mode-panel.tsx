'use client';

/**
 * Rule-mode panel for the Metadata Studio.
 *
 * Split out of metadata-studio.tsx (R3 refactor): everything rendered while
 * the "rule" mode is active —
 *  - the plan info line (🎸 genres / 🌐 languages) + the 8-item plan preview
 *  - the "nothing to harmonize" state
 *  - the manual genre correction list (songs with pseudo-genres the rules
 *    can never map, with listen-preview, 23-genre dropdown, skip/restore)
 */

import { Button } from '@/components/ui/button';
import { Play, SkipForward, Square } from 'lucide-react';
import { Song } from '@/types/game';
import { ManualGenreReviewItem, RuleHarmonizeItem } from '@/lib/editor/rule-harmonizer';
import type { StudioProgress, StudioTranslate } from './types';

interface RuleModePanelProps {
  /** Merged genre + language rule plan (drive the preview list + counts). */
  rulePlan: RuleHarmonizeItem[];
  /** Plan breakdown for the info line (🎸 genres). */
  ruleGenrePlanCount: number;
  /** Plan breakdown for the info line (🌐 languages). */
  ruleLanguagePlanCount: number;
  /** The background rule job is currently running (hides the plan blocks). */
  ruleRunning: boolean;
  /** Songs with unmappable pseudo-genres awaiting manual correction. */
  manualReview: ManualGenreReviewItem[];
  /** Songs skipped this session (info line + restore link). */
  skippedManualCount: number;
  /** user's genre pick per song (songId → main genre) in the correction list. */
  manualPicks: Record<string, string>;
  onManualPickChange: (songId: string, genre: string) => void;
  /** Skip one manual-review song (keeps its genre as-is for this session). */
  onSkipManualSong: (songId: string) => void;
  /** Skip all open manual-review songs (stops a running preview). */
  onSkipAllManual: () => void;
  /** Restore all session-skipped manual-review songs. */
  onRestoreSkippedManual: () => void;
  /** Apply the manual genre corrections (txt-first when txt is the target). */
  onApplyManualPicks: () => void;
  manualApplyProgress: StudioProgress | null;
  /** Full song lookup for the review preview (items only carry title/artist/genre). */
  songById: Map<string, Song>;
  /** Song currently playing in the listen preview (null = none). */
  previewSongId: string | null;
  onTogglePreview: (songId: string) => void;
  /** Genre vocabulary for the dropdowns (built-in + user-defined, reactive). */
  allGenres: string[];
  t: StudioTranslate;
}

export function RuleModePanel({
  rulePlan,
  ruleGenrePlanCount,
  ruleLanguagePlanCount,
  ruleRunning,
  manualReview,
  skippedManualCount,
  manualPicks,
  onManualPickChange,
  onSkipManualSong,
  onSkipAllManual,
  onRestoreSkippedManual,
  onApplyManualPicks,
  manualApplyProgress,
  songById,
  previewSongId,
  onTogglePreview,
  allGenres,
  t,
}: RuleModePanelProps) {
  const rulePreview = rulePlan.slice(0, 8);

  return (
    <>
      {/* ── Mode-specific info ── */}
      {!ruleRunning && rulePlan.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-cyan-300/80 font-medium">
            {t('editor.ruleHarmonizeCount').replace('{count}', String(rulePlan.length))}
            <span className="text-white/40 font-normal">
              {' '}(🎸 {ruleGenrePlanCount} · 🌐 {ruleLanguagePlanCount})
            </span>
          </p>
          {/* Non-harmonizable remainder (user item 7): songs the rules
              can NEVER fix (pseudo-genres) — always visible so the user
              immediately sees what stays untouched. */}
          {manualReview.length > 0 && (
            <p className="text-[10px] text-amber-300/80">
              ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
            </p>
          )}
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1 text-[10px] font-mono" data-testid="studio-rule-preview">
            {rulePreview.map(item => (
              <div key={`${item.field}-${item.songId}`} className="flex items-center gap-1.5 text-white/50">
                <span className="flex-shrink-0" title={item.field === 'language' ? 'Sprache' : 'Genre'}>
                  {item.field === 'language' ? '🌐' : '🎸'}
                </span>
                <span className="truncate flex-1" title={`${item.artist} — ${item.title}`}>
                  {item.field === 'language' ? item.currentLanguage : item.currentGenre}
                </span>
                <span className="text-white/30">→</span>
                <span className="text-cyan-300 truncate">
                  {item.field === 'language' ? item.newLanguage : item.newGenre}
                </span>
              </div>
            ))}
            {rulePlan.length > rulePreview.length && (
              <p className="text-white/30 pt-1">+{rulePlan.length - rulePreview.length} …</p>
            )}
          </div>
        </div>
      )}
      {rulePlan.length === 0 && !ruleRunning && (
        <div className="space-y-1">
          <p className="text-[11px] text-white/40">✅ {t('editor.ruleHarmonizeNothing')}</p>
          {manualReview.length > 0 && (
            <p className="text-[10px] text-amber-300/80">
              ⚠️ {t('editor.ruleHarmonizeNotFixable').replace('{count}', String(manualReview.length))}
            </p>
          )}
        </div>
      )}

      {/* ── Manual genre correction list (rule mode) ──
          Songs with pseudo-genres ("AI", "Oldies", "A Cappella", "TV"…)
          that no logical rule can map. The user picks the correct main
          genre per song from the 23-genre dropdown, then applies — or
          skips them (kept as-is). Rendered as long as there are open
          items OR skipped ones (so the restore link stays reachable
          even after "Skip all"). */}
      {(manualReview.length > 0 || skippedManualCount > 0) && (
        <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3" data-testid="studio-manual-review">
          {manualReview.length > 0 && (<>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-amber-300 font-medium">
              ✋ {t('editor.manualReviewCount').replace('{count}', String(manualReview.length))}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 tabular-nums">
                {Object.keys(manualPicks).filter(k => manualReview.some(m => m.songId === k)).length}/{manualReview.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={manualReview.length === 0 || manualApplyProgress !== null}
                onClick={onSkipAllManual}
                className="h-7 px-3 border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-[11px]"
                title={t('editor.manualReviewSkipAllHint')}
                data-testid="studio-manual-skip-all"
              >
                ⏭️ {t('editor.manualReviewSkipAll')}
              </Button>
              <Button
                size="sm"
                disabled={manualApplyProgress !== null || Object.values(manualPicks).length === 0}
                onClick={onApplyManualPicks}
                className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
                data-testid="studio-manual-apply"
              >
                {manualApplyProgress
                  ? `${manualApplyProgress.done}/${manualApplyProgress.total}`
                  : t('editor.manualReviewApply')}
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-white/40 leading-relaxed">{t('editor.manualReviewDesc')}</p>
          </>)}
          {skippedManualCount > 0 && (
            <p className="text-[10px] text-white/35 flex items-center gap-2 flex-wrap" data-testid="studio-manual-skipped-info">
              <span>⏭️ {t('editor.manualReviewSkippedInfo').replace('{count}', String(skippedManualCount))}</span>
              <button
                onClick={onRestoreSkippedManual}
                className="underline underline-offset-2 hover:text-white/70 text-white/50 transition-colors"
                data-testid="studio-manual-restore"
              >
                {t('editor.manualReviewRestore')}
              </button>
            </p>
          )}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1" data-testid="studio-manual-review-list">
            {manualReview.map(item => {
              const previewSong = songById.get(item.songId);
              const hasAudio = !!(previewSong && (
                previewSong.audioUrl || previewSong.relativeAudioPath || previewSong.storedMedia
                || previewSong.videoUrl || previewSong.videoBackground || previewSong.relativeVideoPath
              ));
              const isPlaying = previewSongId === item.songId;
              return (
                <div
                  key={item.songId}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-2 bg-black/30 border rounded-lg px-2.5 py-1.5 transition-colors ${
                    isPlaying ? 'border-cyan-400/50 bg-cyan-500/[0.06]' : 'border-white/10'
                  }`}
                >
                  {/* Listen-before-you-assign preview (user feedback point 1) */}
                  <button
                    onClick={() => void onTogglePreview(item.songId)}
                    disabled={!hasAudio}
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                      isPlaying
                        ? 'bg-cyan-500/25 border-cyan-400/60 text-cyan-300'
                        : hasAudio
                          ? 'bg-white/5 border-white/15 text-white/60 hover:bg-cyan-500/15 hover:text-cyan-300 hover:border-cyan-400/40'
                          : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
                    }`}
                    title={!hasAudio
                      ? t('editor.manualReviewNoAudio')
                      : isPlaying
                        ? t('editor.manualReviewStopPreview')
                        : t('editor.manualReviewPlay')}
                    aria-label={`${isPlaying ? t('editor.manualReviewStopPreview') : t('editor.manualReviewPlay')}: ${item.title}`}
                    data-testid={`studio-manual-play-${item.songId}`}
                  >
                    {isPlaying
                      ? <Square className="w-3 h-3" />
                      : <Play className="w-3 h-3 ml-0.5" />}
                  </button>
                  {/* Title + Artist */}
                  <div className="flex-1 min-w-[140px] sm:min-w-[200px]">
                    <p className="text-[11px] text-white/85 font-medium truncate" title={item.title}>{item.title}</p>
                    <p className="text-[10px] text-white/40 truncate" title={item.artist}>{item.artist}</p>
                  </div>
                  {/* Current (pseudo) genre */}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border border-white/15 text-amber-200/90 whitespace-nowrap">
                    {item.currentGenre}
                  </span>
                  <span className="text-white/30 text-[10px]">→</span>
                  {/* Main genre dropdown (23 genres) */}
                  <select
                    value={manualPicks[item.songId] ?? ''}
                    onChange={e => onManualPickChange(item.songId, e.target.value)}
                    className="bg-gray-800 border border-white/20 rounded-lg px-2 py-1 text-[11px] text-white focus:border-amber-500 focus:outline-none min-w-[110px]"
                    aria-label={`${t('editor.manualReviewApply')}: ${item.title}`}
                    data-testid={`studio-manual-select-${item.songId}`}
                  >
                    <option value="">{t('editor.manualReviewChoose')}</option>
                    {allGenres.map(g => (
                      <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>
                    ))}
                  </select>
                  {/* Skip — keep this song's genre as-is (user feedback point 2) */}
                  <button
                    onClick={() => onSkipManualSong(item.songId)}
                    className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                    title={t('editor.manualReviewSkip')}
                    aria-label={`${t('editor.manualReviewSkip')}: ${item.title}`}
                    data-testid={`studio-manual-skip-${item.songId}`}
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
