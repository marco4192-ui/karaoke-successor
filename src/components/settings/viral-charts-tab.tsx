'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const COUNTRY_OPTIONS = [
  { code: 'de', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'at', name: 'Österreich', flag: '🇦🇹' },
  { code: 'ch', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'us', name: 'USA', flag: '🇺🇸' },
  { code: 'gb', name: 'UK', flag: '🇬🇧' },
  { code: 'fr', name: 'Frankreich', flag: '🇫🇷' },
  { code: 'es', name: 'Spanien', flag: '🇪🇸' },
  { code: 'it', name: 'Italien', flag: '🇮🇹' },
  { code: 'nl', name: 'Niederlande', flag: '🇳🇱' },
  { code: 'pl', name: 'Polen', flag: '🇵🇱' },
  { code: 'se', name: 'Schweden', flag: '🇸🇪' },
  { code: 'jp', name: 'Japan', flag: '🇯🇵' },
  { code: 'br', name: 'Brasilien', flag: '🇧🇷' },
  { code: 'mx', name: 'Mexiko', flag: '🇲🇽' },
  { code: 'kr', name: 'Südkorea', flag: '🇰🇷' },
  { code: 'au', name: 'Australien', flag: '🇦🇺' },
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
      setMessage('Land gespeichert. Charts werden beim nächsten Laden aktualisiert.');
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
      setMessage('Charts erfolgreich aktualisiert!');
    } catch (e) {
      setMessage(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
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
            <span>&#128293;</span> Virale Charts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/60 text-sm">
            Dieses Feature ist nur in der Tauri-App verfügbar. Es fragt aktuelle Chart-Hits
            von Apple Music, Deezer und iTunes ab und markiert Songs in deiner Bibliothek,
            die gerade viral sind.
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
          <span className="text-xl">&#128293;</span> Virale Charts
        </CardTitle>
        <CardDescription>
          Finde trending Songs in deiner Bibliothek — abgeglichen mit Apple Music, Deezer und iTunes Charts.
          Keine Anmeldung nötig!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Country Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Region für Charts</label>
          <select
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-orange-500/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
          >
            {COUNTRY_OPTIONS.map(c => (
              <option key={c.code} value={c.code} className="bg-gray-800 text-white">
                {c.flag} {c.name}
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
              Charts werden geladen...
            </>
          ) : (
            <>
              <span>&#128260;</span> Charts jetzt aktualisieren
            </>
          )}
        </button>

        {/* Status */}
        {status && (
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Region:</span>
              <span>{selectedCountryData?.flag} {selectedCountryData?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Chart-Einträge:</span>
              <span>{status.totalEntries}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">In Bibliothek gefunden:</span>
              <span className="font-medium text-orange-400">{status.matchedCount}</span>
            </div>
            {status.lastFetchedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Letztes Update:</span>
                <span>{formatDate(status.lastFetchedAt)}</span>
              </div>
            )}
            {status.sources.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Quellen:</span>
                <span>{status.sources.join(', ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <p className={`text-sm ${message.startsWith('Fehler') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        {/* Info */}
        <p className="text-xs text-white/40">
          Charts werden automatisch beim Öffnen der Bibliothek aktualisiert (1x pro Tag).
          Du kannst hier manuell ein Update auslösen oder die Region ändern.
        </p>
      </CardContent>
    </Card>
  );
}
