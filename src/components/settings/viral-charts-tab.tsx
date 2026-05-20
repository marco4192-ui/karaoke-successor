'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';

const COUNTRY_OPTIONS = [
  { code: 'de', name: 'settingsViralCharts.country.de', flag: '🇩🇪' },
  { code: 'at', name: 'settingsViralCharts.country.at', flag: '🇦🇹' },
  { code: 'ch', name: 'settingsViralCharts.country.ch', flag: '🇨🇭' },
  { code: 'us', name: 'settingsViralCharts.country.us', flag: '🇺🇸' },
  { code: 'gb', name: 'settingsViralCharts.country.gb', flag: '🇬🇧' },
  { code: 'fr', name: 'settingsViralCharts.country.fr', flag: '🇫🇷' },
  { code: 'es', name: 'settingsViralCharts.country.es', flag: '🇪🇸' },
  { code: 'it', name: 'settingsViralCharts.country.it', flag: '🇮🇹' },
  { code: 'nl', name: 'settingsViralCharts.country.nl', flag: '🇳🇱' },
  { code: 'pl', name: 'settingsViralCharts.country.pl', flag: '🇵🇱' },
  { code: 'se', name: 'settingsViralCharts.country.se', flag: '🇸🇪' },
  { code: 'jp', name: 'settingsViralCharts.country.jp', flag: '🇯🇵' },
  { code: 'br', name: 'settingsViralCharts.country.br', flag: '🇧🇷' },
  { code: 'mx', name: 'settingsViralCharts.country.mx', flag: '🇲🇽' },
  { code: 'kr', name: 'settingsViralCharts.country.kr', flag: '🇰🇷' },
  { code: 'au', name: 'settingsViralCharts.country.au', flag: '🇦🇺' },
];

interface ViralChartsStatus {
  totalEntries: number;
  matchedCount: number;
  lastFetchedAt: number | null;
  sources: string[];
  country: string;
}

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString(undefined, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function ViralChartsSettings() {
  const [country, setCountry] = useState('de');
  const [status, setStatus] = useState<ViralChartsStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  // Load current status on mount
  useEffect(() => {
    if (!isTauri()) return;
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const s = await invoke<ViralChartsStatus>('viral_get_status');
      setStatus(s);
      setCountry(s.country);
    } catch {
      // Not available (non-Tauri mode)
    }
  };

  const handleCountryChange = async (newCountry: string) => {
    setCountry(newCountry);
    if (!isTauri()) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('viral_set_country', { country: newCountry });
      setMessage(t('settingsViralCharts.regionSaved'));
      setTimeout(() => setMessage(null), 3000);
    } catch {
      // Silently fail
    }
  };

  const handleRefresh = async () => {
    if (!isTauri() || isRefreshing) return;
    setIsRefreshing(true);
    setMessage(null);
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('viral_refresh_charts', { country });
      await loadStatus();
      setMessage(t('settingsViralCharts.chartsRefreshed'));
    } catch (e) {
      setMessage(`${t('settingsViralCharts.errorPrefix')} ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (!isTauri()) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>&#128293;</span> {t('settingsViralCharts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 text-sm">
            {t('settingsViralCharts.tauriOnly')} {t('settingsViralCharts.tauriOnlyDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedCountryData = COUNTRY_OPTIONS.find(c => c.code === country);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">&#128293;</span> {t('settingsViralCharts.title')}
        </CardTitle>
        <CardDescription>
          {t('settingsViralCharts.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Country Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">{t('settingsViralCharts.region')}</label>
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-orange-500/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code} className="bg-gray-800 text-white">
                {c.flag} {t(c.name)}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium transition-all hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRefreshing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              {t('settingsViralCharts.loadingCharts')}
            </>
          ) : (
            <>
              <span>&#128260;</span> {t('settingsViralCharts.refreshCharts')}
            </>
          )}
        </button>

        {/* Status */}
        {status && (
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('settingsViralCharts.regionLabel')}</span>
              <span>{selectedCountryData?.flag} {selectedCountryData ? t(selectedCountryData.name) : ''}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('settingsViralCharts.chartEntries')}</span>
              <span>{status.totalEntries}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">{t('settingsViralCharts.foundInLibrary')}</span>
              <span className="font-medium text-orange-400">{status.matchedCount}</span>
            </div>
            {status.lastFetchedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('settingsViralCharts.lastUpdate')}</span>
                <span>{formatDate(status.lastFetchedAt)}</span>
              </div>
            )}
            {status.sources.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">{t('settingsViralCharts.sources')}</span>
                <span>{status.sources.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <p className={`text-sm ${message.startsWith(t('settingsViralCharts.errorPrefix')) ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        {/* Info */}
        <p className="text-xs text-white/40">
          {t('settingsViralCharts.autoUpdate')}
        </p>
      </CardContent>
    </Card>
  );
}
