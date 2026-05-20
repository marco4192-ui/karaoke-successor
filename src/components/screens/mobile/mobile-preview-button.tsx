'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface MobilePreviewButtonProps {
  songId: string;
  audioUrl?: string;
  isPlaying: boolean;
  progress: number; // 0–1
  onPlayPreview: (songId: string, url: string) => void;
  onStopPreview: () => void;
}

export function MobilePreviewButton({
  songId,
  audioUrl,
  isPlaying,
  progress,
  onPlayPreview,
  onStopPreview,
}: MobilePreviewButtonProps) {
  const { t } = useTranslation();

  const disabled = !audioUrl;

  const handleClick = () => {
    if (disabled) return;

    if (isPlaying) {
      onStopPreview();
    } else {
      onPlayPreview(songId, audioUrl!);
    }
  };

  const size = 28;
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="flex-shrink-0 relative flex items-center justify-center transition-all active:scale-95"
      style={{ width: size, height: size }}
      aria-label={
        isPlaying
          ? t('mobilePreview.listening')
          : t('mobilePreview.preview15s')
      }
      title={
        isPlaying
          ? t('mobilePreview.listening')
          : t('mobilePreview.preview15s')
      }
    >
      {!disabled && isPlaying && (
        <svg
          className="absolute inset-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(6,182,212,0.9)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-200"
          />
        </svg>
      )}

      <span
        className={`text-xs flex items-center justify-center ${
          disabled
            ? 'text-white/20 cursor-not-allowed'
            : isPlaying
              ? 'text-cyan-400'
              : 'text-white/50 hover:text-white/80'
        }`}
      >
        {disabled ? null : isPlaying ? '⏹' : '▶'}
      </span>
    </button>
  );
}
