'use client';

import React, { ReactNode } from 'react';

interface DropZoneProps {
  file: File | null;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  icon: string;
  label: string;
  description?: string;
  accentColor?: 'cyan' | 'purple';
  extra?: ReactNode;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (file: File) => void;
  /** Tauri native file picker config. When set, uses native dialog instead of browser input. */
  tauriFilter?: { name: string; extensions: string[] };
  tauriPickerTitle?: string;
}

export function DropZone({
  file, accept, inputRef, icon, label, description, accentColor = 'cyan', extra, onDrop, onFileChange,
  tauriFilter, tauriPickerTitle,
}: DropZoneProps) {
  const hoverBorder = accentColor === 'purple' ? 'hover:border-purple-500/50' : 'hover:border-cyan-500/50';
  const textColor = accentColor === 'purple' ? 'text-purple-400' : 'text-cyan-400';

  const handleClick = async () => {
    // ── Tauri: Use native file picker ──
    if (tauriFilter) {
      try {
        const { isTauri } = await import('@/lib/tauri-file-storage');
        if (isTauri()) {
          const { nativePickFileOpen } = await import('@/lib/native-fs');
          const { nativeReadFileBytes } = await import('@/lib/native-fs');
          const selected = await nativePickFileOpen(
            tauriPickerTitle || 'Select File',
            tauriFilter.name,
            tauriFilter.extensions
          );
          if (!selected) return;

          // Read file bytes and create a proper File object
          const base64Data = await nativeReadFileBytes(selected);
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const ext = '.' + selected.split('.').pop()?.toLowerCase();
          const mimeMap: Record<string, string> = {
            '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
            '.m4a': 'audio/mp4', '.flac': 'audio/flac', '.aac': 'audio/aac',
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
            '.avi': 'video/x-msvideo', '.mov': 'video/quicktime',
            '.txt': 'text/plain',
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
          };
          const mimeType = mimeMap[ext] || 'application/octet-stream';
          const fileName = selected.split(/[/\\]/).pop() || 'file';
          const blob = new Blob([bytes], { type: mimeType });
          const fileObj = new File([blob], fileName, { type: mimeType });
          onFileChange(fileObj);
          return;
        }
      } catch (err) {
        console.error('[DropZone] Native file picker error:', err);
        // Fall through to browser input
      }
    }

    // ── Browser: use hidden file input ──
    inputRef.current?.click();
  };

  return (
    <>
      <div
        className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center ${hoverBorder} transition-colors cursor-pointer`}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleClick}
      >
        {file ? (
          <div className={textColor}>
            <p className="font-semibold">{file.name}</p>
            {description && <p className="text-sm text-white/60">{description}</p>}
            {extra}
          </div>
        ) : (
          <div className="text-white/60">
            <p className="text-4xl mb-2">{icon}</p>
            <p>{label}</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileChange(f);
        }}
      />
    </>
  );
}
