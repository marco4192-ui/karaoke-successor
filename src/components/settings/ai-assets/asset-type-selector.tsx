'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AssetTypeSelectorProps {
  assetType: 'image' | 'audio' | 'separator';
  onChange: (type: 'image' | 'audio' | 'separator') => void;
}

export function AssetTypeSelector({ assetType, onChange }: AssetTypeSelectorProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Asset Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onChange('image')}
            className={assetType === 'image' ? 'bg-purple-500' : 'bg-white/10'}
          >
            🖼️ Image
          </Button>
          <Button
            onClick={() => onChange('audio')}
            className={assetType === 'audio' ? 'bg-purple-500' : 'bg-white/10'}
          >
            🔊 Audio
          </Button>
          <Button
            onClick={() => onChange('separator')}
            className={assetType === 'separator' ? 'bg-purple-500' : 'bg-white/10'}
          >
            🎤 Vocal Separator
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
