'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Kurzer Einleitungstext für Settings-Submenus (R28, Nutzerwunsch):
 * Zeigt Icon + Tab-Titel + 1–3 Sätze Erläuterung — dasselbe Muster wie
 * „Genres & Sprachen" (R23) und „Motto-Party" (R24), jetzt einheitlich
 * für ALLE Tabs.
 *
 * `data-testid="settings-intro-{tab}"` ist der Tour-Anker für die
 * Settings-Tour (R28).
 */
interface SettingsIntroCardProps {
  icon: string;
  title: string;
  description: string;
  testId: string;
}

export function SettingsIntroCard({ icon, title, description, testId }: SettingsIntroCardProps) {
  return (
    <Card className="bg-white/5 border-white/10" data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 theme-adaptive-text">
          <span aria-hidden>{icon}</span> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
