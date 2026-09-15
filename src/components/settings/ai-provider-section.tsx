'use client';

/**
 * Settings → "KI-Dienst" card (user request: ".z-ai-config einstellen oder
 * eine andere KI hinterlegen").
 *
 * Lets the user switch the AI backend for all AI features (harmonize,
 * metadata-enrich, lyrics-suggestions, song-identify, cover-generate):
 *  - Built-in ZAI SDK (default; needs .z-ai-config on the machine)
 *  - Any OpenAI-COMPATIBLE endpoint (OpenAI, OpenRouter, LM Studio, Ollama /v1…)
 *    with baseUrl + API key + model
 *
 * Config is persisted server-side (ai-provider.json via POST /api/ai-provider).
 * "Testen" probes the selected provider; on save the client-side AI
 * availability cache is reset so the next harmonize run picks the change up.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { resetAiAvailabilityCache } from '@/lib/ai/harmonize-client';

interface ProviderConfigState {
  provider: 'zai' | 'openai';
  baseUrl: string;
  apiKey: string;
  model: string;
  hasApiKey: boolean;
}

type ProbeResult = { available: boolean; provider: string; model?: string; error?: string } | null;

const INPUT_CLASS =
  'w-full bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500';

export function AiProviderSection() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ProviderConfigState>({
    provider: 'zai', baseUrl: '', apiKey: '', model: '', hasApiKey: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<ProbeResult>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-provider');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig({
          provider: data.config.provider === 'openai' ? 'openai' : 'zai',
          baseUrl: data.config.baseUrl ?? '',
          apiKey: data.config.apiKeyMasked ?? '',
          model: data.config.model ?? '',
          hasApiKey: !!data.config.hasApiKey,
        });
        setProbe(data.probe ?? null);
      }
    } catch {
      /* offline — keep defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (test: boolean) => {
    setSaving(true);
    setTesting(test);
    setMessage(null);
    try {
      const res = await fetch('/api/ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            provider: config.provider,
            baseUrl: config.baseUrl || undefined,
            model: config.model || undefined,
            // Send the key only when the user typed a NEW one (masked
            // placeholders starting with •••• are kept server-side)
            apiKey: config.apiKey && !config.apiKey.startsWith('••••') ? config.apiKey : undefined,
          },
          test,
        }),
      });
      const data = await res.json();
      if (data.probe) setProbe(data.probe);
      if (!data.success) {
        setMessage({ kind: 'err', text: data.error || t('settings.aiProvider.saveFailed') });
      } else if (test && data.probe) {
        setMessage(
          data.probe.available
            ? { kind: 'ok', text: t('settings.aiProvider.testOk') }
            : { kind: 'err', text: `${t('settings.aiProvider.testFailed')}${data.probe.error ? ` — ${data.probe.error}` : ''}` },
        );
      } else {
        setMessage({ kind: 'ok', text: t('settings.aiProvider.saved') });
      }
      if (data.config) {
        setConfig(prev => ({
          ...prev,
          provider: data.config.provider === 'openai' ? 'openai' : 'zai',
          baseUrl: data.config.baseUrl ?? '',
          apiKey: data.config.apiKeyMasked ?? '',
          model: data.config.model ?? '',
          hasApiKey: !!data.config.hasApiKey,
        }));
      }
      // The harmonize client caches AI availability for 60s — reset so the
      // next run immediately uses the new provider.
      resetAiAvailabilityCache();
    } catch {
      setMessage({ kind: 'err', text: t('settings.aiProvider.saveFailed') });
    } finally {
      setSaving(false);
      setTesting(false);
    }
  }, [config, t]);

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-6 text-center text-sm text-white/40">…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          {t('settings.aiProvider.title')}
        </CardTitle>
        <CardDescription>{t('settings.aiProvider.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Provider switch */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, provider: 'zai' }))}
            aria-pressed={config.provider === 'zai'}
            className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer ${
              config.provider === 'zai'
                ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                : 'border-white/10 bg-white/5 hover:border-white/30 text-white/60'
            }`}
          >
            ⚡ Z.ai (built-in)
          </button>
          <button
            type="button"
            onClick={() => setConfig(prev => ({ ...prev, provider: 'openai' }))}
            aria-pressed={config.provider === 'openai'}
            className={`flex-1 py-2 px-3 rounded-lg border-2 text-xs font-semibold transition-all cursor-pointer ${
              config.provider === 'openai'
                ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                : 'border-white/10 bg-white/5 hover:border-white/30 text-white/60'
            }`}
          >
            🔗 {t('settings.aiProvider.custom')}
          </button>
        </div>

        {config.provider === 'zai' ? (
          <p className="text-xs text-white/40 leading-relaxed">
            {t('settings.aiProvider.zaiHint')}
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1" htmlFor="ai-base-url">
                {t('settings.aiProvider.baseUrl')}
              </label>
              <input
                id="ai-base-url"
                type="text"
                value={config.baseUrl}
                onChange={e => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1" htmlFor="ai-api-key">
                {t('settings.aiProvider.apiKey')}
              </label>
              <input
                id="ai-api-key"
                type="password"
                value={config.apiKey}
                onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder={config.hasApiKey ? '••••••••' : 'sk-…'}
                className={INPUT_CLASS}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1" htmlFor="ai-model">
                {t('settings.aiProvider.model')}
              </label>
              <input
                id="ai-model"
                type="text"
                value={config.model}
                onChange={e => setConfig(prev => ({ ...prev, model: e.target.value }))}
                placeholder="gpt-4o-mini"
                className={INPUT_CLASS}
                autoComplete="off"
              />
              <p className="text-[10px] text-white/30 mt-1">{t('settings.aiProvider.modelHint')}</p>
            </div>
          </div>
        )}

        {/* Status line */}
        {probe && (
          <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
            probe.available
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${probe.available ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {probe.available
              ? t('settings.aiProvider.statusAvailable').replace('{provider}', probe.provider === 'openai' ? 'Custom' : 'Z.ai')
              : t('settings.aiProvider.statusUnavailable')}
            {probe.available && probe.model ? <span className="text-white/40 font-mono">({probe.model})</span> : null}
          </div>
        )}

        {message && (
          <p className={`text-xs ${message.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || testing}
            onClick={() => handleSave(true)}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold transition-colors cursor-pointer"
          >
            {testing ? '…' : `✓ ${t('settings.aiProvider.saveAndTest')}`}
          </button>
          <button
            type="button"
            disabled={saving || testing}
            onClick={() => handleSave(false)}
            className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 disabled:opacity-50 text-white/80 text-xs font-medium transition-colors cursor-pointer"
          >
            {t('settings.aiProvider.saveOnly')}
          </button>
        </div>

        <p className="text-[10px] text-white/30 leading-relaxed">
          {t('settings.aiProvider.privacyHint')}
        </p>
      </CardContent>
    </Card>
  );
}
