'use client';

/**
 * Manual edit panel for the Metadata Studio (R5-1).
 *
 * Split out of metadata-studio.tsx (R3 refactor): the "manual" mode view —
 * direct per-song editing for ALL songs in scope: the current value + an
 * editor side by side for every ACTIVE field (genre dropdown, language/year
 * free text). Changed inputs get an amber ring; the Apply button in the
 * header replaces the Run button.
 */

import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';
import { Song } from '@/types/game';
import type { ManualEditDraft, StudioFields, StudioProgress, StudioTranslate } from './types';

/** Normalized updates that differ from the current value (see manualUpdatesFor). */
export interface ManualEditUpdates {
  genre?: string;
  language?: string;
  year?: number;
}

interface ManualEditPanelProps {
  /** Songs in the active scope (all or selection). */
  scopeSongs: Song[];
  /** Active field toggles — inactive fields are not rendered/edited. */
  fields: StudioFields;
  /** Per-song edited draft values (songId → raw input strings). */
  edits: Record<string, ManualEditDraft>;
  /** Patch one song's draft (merged into the existing draft). */
  onEditChange: (songId: string, patch: Partial<ManualEditDraft>) => void;
  /** Effective normalized changes for one song (only fields that differ). */
  getUpdates: (song: Song) => ManualEditUpdates;
  /** Songs with at least one changed field ("X von Y" counter). */
  changedCount: number;
  /** Progress while the changes are being applied (null = idle). */
  applyProgress: StudioProgress | null;
  /** Apply ALL changed manual edits (txt-first when txt is the target). */
  onApply: () => void;
  /** Song currently playing in the listen preview (null = none). */
  previewSongId: string | null;
  onTogglePreview: (songId: string) => void;
  /** Genre vocabulary for the dropdowns (built-in + user-defined, reactive). */
  allGenres: string[];
  t: StudioTranslate;
}

export function ManualEditPanel({
  scopeSongs,
  fields,
  edits,
  onEditChange,
  getUpdates,
  changedCount,
  applyProgress,
  onApply,
  previewSongId,
  onTogglePreview,
  allGenres,
  t,
}: ManualEditPanelProps) {
  return (
    <div className="space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3" data-testid="manual-edit-panel">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-amber-300 font-medium">
          ✏️ {t('editor.manualEditChangedCount')
            .replace('{changed}', String(changedCount))
            .replace('{total}', String(scopeSongs.length))}
        </p>
        <Button
          size="sm"
          disabled={changedCount === 0 || applyProgress !== null}
          onClick={onApply}
          title={changedCount === 0 ? t('editor.manualEditNoChanges') : undefined}
          className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold"
          data-testid="manual-edit-apply"
        >
          {applyProgress
            ? `${applyProgress.done}/${applyProgress.total}`
            : t('editor.manualReviewApply')}
        </Button>
      </div>
      <p className="text-[10px] text-white/40 leading-relaxed">{t('editor.manualEditHint')}</p>
      {scopeSongs.length === 0 ? (
        <p className="text-[10px] text-white/40" data-testid="manual-edit-empty">
          ☑️ {t('editor.manualEditEmptyScope')}
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1" data-testid="manual-edit-list">
          {scopeSongs.map(song => {
            const edit = edits[song.id];
            const updates = getUpdates(song);
            const changedFields =
              (updates.genre !== undefined ? 1 : 0) +
              (updates.language !== undefined ? 1 : 0) +
              (updates.year !== undefined ? 1 : 0);
            return (
              <div
                key={song.id}
                data-testid={`manual-edit-row-${song.id}`}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1.5 bg-black/30 border rounded-lg px-2.5 py-1.5 transition-colors ${
                  previewSongId === song.id ? 'border-cyan-400/50 bg-cyan-500/[0.06]' : 'border-white/10'
                }`}
              >
                {/* Listen-before-you-edit preview (same as the rule-based
                    manual review list — user request: parity). */}
                {(() => {
                  const hasAudio = !!(
                    song.audioUrl || song.relativeAudioPath || song.storedMedia
                    || song.videoUrl || song.videoBackground || song.relativeVideoPath
                  );
                  const isPlaying = previewSongId === song.id;
                  return (
                    <button
                      onClick={() => void onTogglePreview(song.id)}
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
                      aria-label={`${isPlaying ? t('editor.manualReviewStopPreview') : t('editor.manualReviewPlay')}: ${song.title}`}
                      data-testid={`manual-edit-play-${song.id}`}
                    >
                      {isPlaying
                        ? <Square className="w-3 h-3" />
                        : <Play className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })()}
                {/* Title + Artist */}
                <div className="flex-1 min-w-[130px] sm:min-w-[180px]">
                  <p className="text-[11px] text-white/85 font-medium truncate" title={song.title}>{song.title}</p>
                  <p className="text-[10px] text-white/40 truncate" title={song.artist}>{song.artist}</p>
                </div>

                {/* Genre: current value + genre dropdown (23 genres) */}
                {fields.genre && (<>
                  <span
                    title={t('editor.manualEditCurrent')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                      song.genre ? 'border-white/15 text-amber-200/90' : 'border-white/10 text-white/30 italic'
                    }`}
                  >
                    {song.genre || '—'}
                  </span>
                  <span className="text-white/30 text-[10px]">→</span>
                  <select
                    value={edit?.genre ?? ''}
                    onChange={e => onEditChange(song.id, { genre: e.target.value })}
                    className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none min-w-[110px] ${
                      updates.genre !== undefined
                        ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                        : 'border-white/20 focus:border-amber-500'
                    }`}
                    aria-label={`${t('editor.songInfoTab.genre')}: ${song.title}`}
                    data-testid={`manual-edit-genre-${song.id}`}
                  >
                    <option value="">{t('editor.manualReviewChoose')}</option>
                    {allGenres.map(g => (
                      <option key={g} value={g} className="bg-gray-800 text-white">{g}</option>
                    ))}
                  </select>
                </>)}

                {/* Language: current value + free text input */}
                {fields.language && (<>
                  <span
                    title={t('editor.manualEditCurrent')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                      song.language ? 'border-white/15 text-purple-200/90' : 'border-white/10 text-white/30 italic'
                    }`}
                  >
                    {song.language || '—'}
                  </span>
                  <span className="text-white/30 text-[10px]">→</span>
                  <input
                    type="text"
                    value={edit?.language ?? ''}
                    onChange={e => onEditChange(song.id, { language: e.target.value })}
                    placeholder={t('editor.songInfoTab.language')}
                    className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none w-28 ${
                      updates.language !== undefined
                        ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                        : 'border-white/20 focus:border-amber-500'
                    }`}
                    aria-label={`${t('editor.songInfoTab.language')}: ${song.title}`}
                    data-testid={`manual-edit-language-${song.id}`}
                  />
                </>)}

                {/* Year: current value + numeric input (4 digits) */}
                {fields.year && (<>
                  <span
                    title={t('editor.manualEditCurrent')}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border whitespace-nowrap ${
                      song.year ? 'border-white/15 text-emerald-200/90' : 'border-white/10 text-white/30 italic'
                    }`}
                  >
                    {song.year || '—'}
                  </span>
                  <span className="text-white/30 text-[10px]">→</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={edit?.year ?? ''}
                    onChange={e => onEditChange(song.id, { year: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder={t('editor.songInfoTab.yearPlaceholder')}
                    className={`bg-gray-800 border rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none w-16 text-center ${
                      updates.year !== undefined
                        ? 'border-amber-500/70 ring-1 ring-amber-500/40'
                        : 'border-white/20 focus:border-amber-500'
                    }`}
                    aria-label={`${t('editor.songInfoTab.year')}: ${song.title}`}
                    data-testid={`manual-edit-year-${song.id}`}
                  />
                </>)}

                {/* Changed-field count for this row (subtle amber) */}
                {changedFields > 0 && (
                  <span className="text-[10px] text-amber-300 font-mono whitespace-nowrap">
                    ✏️ {changedFields}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
