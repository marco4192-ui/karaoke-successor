'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export interface GeneratedAsset {
  type: 'image' | 'audio';
  data: string;
  filename: string;
}

interface GeneratedAssetsCardProps {
  assets: GeneratedAsset[];
  onDownload: (asset: GeneratedAsset) => void;
}

export function GeneratedAssetsCard({ assets, onDownload }: GeneratedAssetsCardProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Generated Assets</CardTitle>
        <CardDescription>Click to download your generated assets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {assets.map((asset, index) => (
            <button
              key={index}
              onClick={() => onDownload(asset)}
              className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors text-center"
            >
              {asset.type === 'image' ? (
                <img
                  src={`data:image/png;base64,${asset.data}`}
                  alt={asset.filename}
                  className="w-full aspect-square object-cover rounded-lg mb-2"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-purple-500/20 rounded-lg mb-2">
                  <span className="text-4xl">🔊</span>
                </div>
              )}
              <p className="text-sm text-white/60 truncate">{asset.filename}</p>
              <p className="text-xs text-purple-400 mt-1">Click to download</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
