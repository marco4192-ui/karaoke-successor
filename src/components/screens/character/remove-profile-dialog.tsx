'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogOutIcon, Trash2Icon, FileDownIcon, CloudUploadIcon } from 'lucide-react';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { useToast } from '@/hooks/use-toast';
import { downloadTextFile, todayStamp } from '@/lib/download-text';
import type { PlayerProfile } from '@/types/game';

interface RemoveProfileDialogProps {
  /** The profile to sign out / delete. Null while closed. */
  profile: PlayerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the profile was actually removed from this device. */
  onRemoved?: () => void;
}

/**
 * R85: "Sign out on this device" — the party scenario. A guest logs into a
 * stranger's computer with their online profile, sings, and wants their data
 * GONE from that machine at the end of the night without touching the
 * online identity.
 *
 * Two flavors, picked by the profile's linkage:
 *  - online-linked (syncCode present): "Von diesem Gerät abmelden" — the
 *    server profile stays intact; every LOCAL trace is wiped (profile row,
 *    avatar, local highscores, daily/weekly/quest progress, queued score
 *    uploads). Safety notice pushes the sync code / login credentials
 *    before the user locks themselves out.
 *  - local-only: "Endgültig löschen" — same local wipe, framed as final
 *    (there is no online backup).
 *
 * Pending score uploads are flushed FIRST (party scores must reach the
 * server); if the server is unreachable the dialog warns and lets the user
 * decide between discarding the uploads or cancelling.
 */
export function RemoveProfileDialog({ profile, open, onOpenChange, onRemoved }: RemoveProfileDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [pendingUploads, setPendingUploads] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'syncing' | 'upload-failed'>('idle');

  const isOnlineLinked = !!profile?.syncCode;
  const uid = profile ? (profile.syncUid || profile.id) : '';

  // Count THIS profile's queued score uploads whenever the dialog opens —
  // they must reach the server before the local data disappears.
  useEffect(() => {
    if (!open || !profile) {
      setPhase('idle');
      setPendingUploads(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { scoreOutboxSizeForProfile } = await import('@/lib/leaderboard/outbox');
        const count = scoreOutboxSizeForProfile(profile.syncUid || profile.id);
        if (!cancelled) setPendingUploads(count);
      } catch { /* count stays 0 — removal still clears the queue */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recount per dialog open
  }, [open, uid]);

  /** Wipe every local trace of the profile. Server data is NOT touched. */
  const performRemoval = async () => {
    if (!profile) return;
    const { clearScoreOutboxForProfile } = await import('@/lib/leaderboard/outbox');
    const { removeDailyDataForPlayer } = await import('@/lib/game/daily-challenge');
    // Remaining queued uploads of this profile die here (the user was warned).
    clearScoreOutboxForProfile(profile.syncUid || profile.id);
    removeDailyDataForPlayer(profile.id);
    // Profile row + its local highscores (R85 store semantics).
    useGameStore.getState().deleteProfile(profile.id);
    onOpenChange(false);
    onRemoved?.();
    toast({ title: t('profile.signOutSuccess') });
  };

  const handleConfirm = async () => {
    if (!profile) return;
    // Scores are waiting → try to push them to the server first.
    if (pendingUploads > 0 && phase !== 'upload-failed') {
      setPhase('syncing');
      try {
        const { flushScoreOutbox, scoreOutboxSizeForProfile } = await import('@/lib/leaderboard/outbox');
        await flushScoreOutbox();
        const remaining = scoreOutboxSizeForProfile(profile.syncUid || profile.id);
        if (remaining > 0) {
          // Server unreachable — the party scores would be lost. Let the
          // user decide instead of silently discarding them.
          setPendingUploads(remaining);
          setPhase('upload-failed');
          return;
        }
      } catch {
        setPhase('upload-failed');
        return;
      }
    }
    await performRemoval();
  };

  const isBusy = phase === 'syncing';

  const handleSaveCodeFile = () => {
    if (!profile?.syncCode) return;
    const content = [
      'KARAOKE ZERO — SYNC-CODE',
      '=========================',
      '',
      `Code:    ${profile.syncCode}`,
      `Profile: ${profile.name}`,
      `Date:    ${todayStamp()}`,
      '',
      `⚠ ${t('profileSync.syncCodeWarning')}`,
      '',
    ].join('\n');
    downloadTextFile(`karaoke-zero-sync-code-${profile.syncCode}.txt`, content);
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!isBusy) onOpenChange(next); }}>
      <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-md" data-testid="remove-profile-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOnlineLinked ? (
              <LogOutIcon className="w-5 h-5 text-amber-400" />
            ) : (
              <Trash2Icon className="w-5 h-5 text-red-400" />
            )}
            {isOnlineLinked ? t('profile.signOutTitle') : t('profile.deleteLocalTitle')}
          </DialogTitle>
          {/* Visible text doubles as the accessible description — keeps the
              shadcn "Missing Description" warning away. */}
          <DialogDescription asChild>
            <span className="sr-only">
              {isOnlineLinked ? t('profile.signOutText') : t('profile.deleteLocalText')}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* ── What happens ── */}
          <p className="text-xs leading-relaxed text-white/70">
            {isOnlineLinked ? t('profile.signOutText') : t('profile.deleteLocalText')}
          </p>

          {/* ── Online-linked: recovery paths ── */}
          {isOnlineLinked && (
            <div className="space-y-2">
              {profile.authEmail ? (
                <div className="flex items-start gap-2 rounded-lg border border-purple-500/25 bg-purple-500/10 p-2.5">
                  <span className="text-sm">🔐</span>
                  <p className="text-[11px] leading-relaxed text-purple-200/90">
                    {t('profile.signOutHintAccount')}
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5"
                  data-testid="signout-code-warning"
                >
                  <p className="text-[11px] leading-relaxed text-amber-300/90">
                    ⚠️ {t('profileSync.syncCodeWarning')}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/50">{t('profileSync.syncCode')}</span>
                    <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
                      {profile.syncCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleSaveCodeFile}
                      aria-label={t('profileSync.saveCodeFile')}
                      title={t('profileSync.saveCodeFile')}
                      data-testid="signout-save-code"
                      className="inline-flex items-center gap-1 rounded border border-cyan-500/30 px-1.5 py-0.5 text-[10px] text-cyan-400 transition-colors hover:bg-cyan-500/10"
                    >
                      <FileDownIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Pending score uploads ── */}
          {phase === 'idle' && pendingUploads > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-2.5">
              <CloudUploadIcon className="w-4 h-4 mt-0.5 text-cyan-400 shrink-0" />
              <p className="text-[11px] leading-relaxed text-cyan-200/90">
                {t('profile.pendingUploadsInfo').replace('{n}', String(pendingUploads))}
              </p>
            </div>
          )}

          {/* ── Syncing phase ── */}
          {phase === 'syncing' && (
            <div className="flex items-center justify-center gap-3 py-3" data-testid="signout-syncing">
              <div className="animate-spin w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
              <span className="text-xs text-white/60">{t('profile.signOutUploading')}</span>
            </div>
          )}

          {/* ── Flush failed: warn before discarding party scores ── */}
          {phase === 'upload-failed' && (
            <div
              className="rounded-lg border border-red-500/25 bg-red-500/10 p-2.5"
              role="alert"
              data-testid="signout-uploads-failed"
            >
              <p className="text-[11px] leading-relaxed text-red-300">
                {t('profile.signOutUploadsFailed').replace('{n}', String(pendingUploads))}
              </p>
            </div>
          )}

          {/* ── Buttons ── */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isBusy}
              className="border-white/20 text-white/70 hover:bg-white/10"
              data-testid="signout-cancel"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleConfirm()}
              disabled={isBusy}
              className={
                isOnlineLinked
                  ? 'bg-amber-600 hover:bg-amber-500 gap-2'
                  : 'bg-red-600 hover:bg-red-500 gap-2'
              }
              data-testid="signout-confirm"
            >
              {isBusy && <div className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />}
              {!isOnlineLinked && !isBusy && <Trash2Icon className="w-3.5 h-3.5" />}
              {isOnlineLinked && !isBusy && <LogOutIcon className="w-3.5 h-3.5" />}
              {phase === 'upload-failed'
                ? t('profile.signOutForce')
                : isOnlineLinked
                  ? t('profile.signOutConfirm')
                  : t('profile.deleteLocalConfirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
