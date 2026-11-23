'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HandmadeIcon } from '@/components/ui/handmade-icon';

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
  /** R95: Optionale handgemachte Grafik statt des Emoji-Icons (lib/game/handmade-icons.ts). */
  handmadeId?: string;
  title: string;
  description: string;
  testId: string;
}

export function SettingsIntroCard({ icon, handmadeId, title, description, testId }: SettingsIntroCardProps) {
  return (
    <Card className="bg-white/5 border-white/10" data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 theme-adaptive-text">
          <span aria-hidden>
            {handmadeId
              ? <HandmadeIcon id={handmadeId} className="h-[1.3em] w-[1.3em] align-[-0.25em]" />
              : icon}
          </span> {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
