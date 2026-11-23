'use client';

import { Button } from '@/components/ui/button';
import type { StudioApplyProgress, StudioWriteTarget } from './types';

/** Apply-all confirmation modal (txt mode modifies source files; local mode
 *  warns about the library reset). Opened via the Apply-All button. */
export function ApplyAllWarning({
  applicableCount,
  writeTarget,
  applyProgress,
  onCancel,
  onConfirm,
  t,
}: {
  applicableCount: number;
  writeTarget: StudioWriteTarget;
  applyProgress: StudioApplyProgress | null;
  onCancel: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 border border-white/20 rounded-xl p-5 max-w-md w-full mx-4 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{t('editor.aiHarmonizeWarnTitle')}</h3>
            <p className="text-white/60 text-xs mt-0.5">{t('editor.aiHarmonizeWarnSubtitle')}</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-white/70 space-y-2">
          {writeTarget === 'txt' ? (
            <>
              <p>{t('editor.aiHarmonizeWarn1')}</p>
              <ul className="list-disc list-inside space-y-1 text-white/60">
                <li>{t('editor.aiHarmonizeWarn2')}</li>
                <li>{t('editor.aiHarmonizeWarn3')}</li>
                <li>{t('editor.aiHarmonizeWarn4')}</li>
              </ul>
            </>
          ) : (
            <p>{t('editor.studioWriteLocalWarn').replace('{count}', String(applicableCount))}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="px-2 py-0.5 rounded bg-white/10 font-mono">{applicableCount}</span>
          <span>{t('editor.aiHarmonizeWarnCount')}</span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={!!applyProgress}
            className="flex-1 border-white/20 text-white/80 hover:bg-white/10 text-xs"
          >
            {t('editor.aiHarmonizeWarnCancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!!applyProgress}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs"
          >
            {applyProgress
              ? `${applyProgress.done}/${applyProgress.total}`
              : t('editor.aiHarmonizeWarnConfirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
