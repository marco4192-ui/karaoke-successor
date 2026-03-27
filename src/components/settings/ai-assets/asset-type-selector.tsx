'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AssetTypeSelectorProps {
  assetType: 'image' | 'audio';
  onChange: (type: 'image' | 'audio') => void;
}

export function AssetTypeSelector({ assetType, onChange }: AssetTypeSelectorProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle>Asset Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
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
        </div>
      </CardContent>
    </Card>
  );
}
