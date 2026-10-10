'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';

/**
 * Einleitungs-Karte für Settings-Submenus (self-contained).
 *
 * Nutzerwunsch R26: Jedes Settings-Submenu erhält — wie bereits
 * "Genres & Sprachen" und "Motto-Party" — einen kurzen Einleitungstext,
 * der den Zweck des Menus erklärt. Titel + Icon kommen aus derselben
 * Quelle wie die Tab-Leiste, der Text aus `settingsTabIntro.<tab>`.
 *
 * Die Karte ist zusätzlich der stabile Anker für die Settings-Tour:
 * data-testid="settings-intro-<tab>".
 */
const TAB_META: Record<string, { icon: string; titleKey: string; descKey?: string }> = {
  general: { icon: '⚙️', titleKey: 'settings.tabGeneral' },
  gameplay: { icon: '🎮', titleKey: 'settingsTabs.gameplay' },
  appearance: { icon: '🎨', titleKey: 'settingsTabs.appearance' },
  graphicSound: { icon: '🔊', titleKey: 'settingsTabs.graphicSound' },
  microphone: { icon: '🎤', titleKey: 'settingsTabs.microphone' },
  mobile: { icon: '📱', titleKey: 'settingsTabs.mobileCompanion' },
  webcam: { icon: '📷', titleKey: 'settingsTabs.webcam' },
  library: { icon: '📁', titleKey: 'settings.tabLibrary' },
  // Taxonomy & Motto haben eigene, bereits in 16 Sprachen übersetzte
  // Beschreibungen — der Override bindet sie ein (statt settingsTabIntro.*).
  taxonomy: { icon: '🏷️', titleKey: 'settingsTabs.taxonomy', descKey: 'settingsTaxonomy.desc' },
  motto: { icon: '🎉', titleKey: 'settingsTabs.mottoParty', descKey: 'settingsMotto.desc' },
  viral: { icon: '📈', titleKey: 'settingsTabs.viralCharts' },
  sync: { icon: '💾', titleKey: 'settingsTabs.syncBackup' },
  about: { icon: 'ℹ️', titleKey: 'settings.tabAbout' },
};

export function SettingsTabIntro({ tab }: { tab: string }) {
  const { t } = useTranslation();
  const meta = TAB_META[tab] ?? { icon: '⚙️', titleKey: 'settings.tabGeneral' };
  return (
    <Card
      className="bg-white/5 border-white/10"
      data-testid={`settings-intro-${tab}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 theme-adaptive-text">
          <span className="text-xl leading-none" aria-hidden="true">{meta.icon}</span>
          {t(meta.titleKey)}
        </CardTitle>
        <CardDescription className="leading-relaxed">
          {t(meta.descKey ?? `settingsTabIntro.${tab}`)}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
