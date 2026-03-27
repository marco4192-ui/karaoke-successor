'use client';

import React, { useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface FileDropZoneProps {
  title: string;
  description: string;
  accept: string;
  icon: string;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  accentColor?: 'cyan' | 'purple';
  children?: React.ReactNode;
}

export function FileDropZone({
  title,
  description,
  accept,
  icon,
  selectedFile,
  onFileSelect,
  accentColor = 'cyan',
  children,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const borderHoverColor = accentColor === 'purple' ? 'border-purple-500/50' : 'border-cyan-500/50';
  const selectedTextColor = accentColor === 'purple' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          {selectedFile ? (
            <div className={selectedTextColor}>
              <p className="font-semibold">{selectedFile.name}</p>
              <p className="text-sm text-white/60">Click to change</p>
              {children}
            </div>
          ) : (
            <div className="text-white/60">
              <p className="text-4xl mb-2">{icon}</p>
              <p>Drop file here</p>
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        />
      </CardContent>
    </Card>
  );
}
