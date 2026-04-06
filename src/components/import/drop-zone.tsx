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
}

export function DropZone({
  file, accept, inputRef, icon, label, description, accentColor = 'cyan', extra, onDrop, onFileChange,
}: DropZoneProps) {
  const hoverBorder = accentColor === 'purple' ? 'hover:border-purple-500/50' : 'hover:border-cyan-500/50';
  const textColor = accentColor === 'purple' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <>
      <div
        className={`border-2 border-dashed border-white/20 rounded-xl p-8 text-center ${hoverBorder} transition-colors cursor-pointer`}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
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
