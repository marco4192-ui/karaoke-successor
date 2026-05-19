'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QueueRulesCardProps {
  t: (key: string) => string;
}

export function QueueRulesCard({ t }: QueueRulesCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 mt-8">
      <CardHeader>
        <CardTitle className="text-lg">{t('queueScreen.rules')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-white/60">
        <p>{t('queueScreen.rule1')}</p>
        <p>{t('queueScreen.rule2')}</p>
        <p>{t('queueScreen.rule3')}</p>
        <p>{t('queueScreen.rule4')}</p>
        <p>{t('queueScreen.rule5')}</p>
        <p>{t('queueScreen.rule6')}</p>
      </CardContent>
    </Card>
  );
}
