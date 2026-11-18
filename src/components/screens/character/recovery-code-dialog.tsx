'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeyRoundIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';

interface RecoveryCodeDialogProps {
  /** The one-time recovery code (formatted XXXX-XXXX-XXXX-XXXX). */
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * R69: one-time display of an online-account recovery code. Shown
 *  - right after account registration,
 *  - when a legacy account receives its first code at login,
 *  - after a password recovery (the rotated NEW code).
 *
 * The code is never stored client-side — the user must save it. The server
 * keeps only a bcrypt hash and never reveals it again.
 */
export function RecoveryCodeDialog({ code, open, onOpenChange }: RecoveryCodeDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — user can select manually */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-md" data-testid="recovery-code-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRoundIcon className="w-5 h-5 text-amber-400" />
            {t('profileAuth.recoveryTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-white/60">
            {t('profileAuth.recoveryDesc')}
          </p>

          <button
            type="button"
            onClick={() => void copy()}
            data-testid="recovery-code-value"
            className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center font-mono text-lg tracking-widest text-amber-300 transition-colors hover:bg-amber-500/20"
            title={t('profileAuth.recoveryCopy')}
          >
            {code}
          </button>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-white/35 leading-snug">
              {t('profileAuth.recoverySaveHint')}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void copy()}
              className="h-7 shrink-0 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              data-testid="recovery-code-copy"
            >
              {copied ? `✓ ${t('profileAuth.recoveryCopied')}` : t('profileAuth.recoveryCopy')}
            </Button>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500"
            data-testid="recovery-code-done"
          >
            {t('common.ok')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
