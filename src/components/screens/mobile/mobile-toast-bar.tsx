'use client';

// ===================== R54: Toast-Leiste (P7/P18) =====================
// Aus mobile-client-view.tsx ausgelagert (Refactoring). Schlanke Toast-
// Leiste DIREKT ÜBER der unteren Menüleiste. Auto-Dismiss nach 3 s,
// Slide-up-Animation, Tap schließt vorzeitig.

export interface MobileToastItem {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success' | 'chat';
  detail?: string;
}

export function ToastBar({ toasts, onDismiss }: { toasts: MobileToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-3 right-3 z-40 flex flex-col gap-1.5"
      style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={
            'pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left shadow-2xl backdrop-blur-md ' +
            'transition-all duration-300 ease-out animate-[toast-slide-up_0.28s_ease-out] ' +
            (toast.kind === 'error'
              ? 'bg-red-950/90 border-red-500/40'
              : toast.kind === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40'
                : 'bg-black/90 border-white/15')
          }
        >
          <span className="shrink-0 text-sm leading-none" aria-hidden="true">
            {toast.kind === 'error' ? '⚠️' : toast.kind === 'success' ? '✅' : toast.kind === 'chat' ? '💬' : 'ℹ️'}
          </span>
          <span className="min-w-0 flex-1">
            {toast.detail && (
              <span className={`block text-[11px] font-semibold leading-tight ${toast.kind === 'chat' ? 'text-cyan-400' : 'text-white/60'}`}>
                {toast.detail}
              </span>
            )}
            <span className="block truncate text-xs leading-snug text-white/85">{toast.text}</span>
          </span>
        </button>
      ))}
      <style>{`
        @keyframes toast-slide-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
