import { NextRequest, NextResponse } from 'next/server';
import { isLocalRequest } from '@/app/api/lib/is-local-request';
import {
  getAiProviderConfig,
  saveAiProviderConfig,
  probeAiProvider,
  type AiProviderConfig,
} from '@/lib/ai/ai-provider';

/**
 * Settings endpoint for the AI provider (Settings → "KI-Dienst").
 *
 *  GET  → current config (apiKey masked to its last 4 chars) + probe result
 *  POST → { config, test? } — saves the config, optionally probes it.
 *         When `config` is omitted, only a test of the CURRENT config runs.
 *
 * Local-only like every other AI route.
 */

function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  const config = getAiProviderConfig();
  const probe = await probeAiProvider();
  return NextResponse.json({
    success: true,
    config: {
      provider: config.provider,
      baseUrl: config.baseUrl ?? null,
      model: config.model ?? null,
      // Never send the full key back to the client
      apiKeyMasked: maskKey(config.apiKey) ?? null,
      hasApiKey: !!config.apiKey,
    },
    probe,
  });
}

export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json() as {
      config?: Partial<AiProviderConfig>;
      test?: boolean;
    };

    let savedError: string | null = null;
    if (body.config) {
      const cfg = body.config;
      const next: AiProviderConfig = {
        provider: cfg.provider === 'openai' ? 'openai' : 'zai',
        baseUrl: typeof cfg.baseUrl === 'string' ? cfg.baseUrl : undefined,
        model: typeof cfg.model === 'string' ? cfg.model : undefined,
        apiKey:
          typeof cfg.apiKey === 'string' && cfg.apiKey && !cfg.apiKey.startsWith('••••')
            ? cfg.apiKey
            : undefined,
      };
      // Keep the previously stored key when the client sends the masked
      // placeholder (user edited the model but not the key field).
      if (!next.apiKey && next.provider !== 'zai') {
        const current = getAiProviderConfig();
        if (current.apiKey && current.provider === next.provider && cfg.apiKey !== null) {
          next.apiKey = current.apiKey;
        }
      }
      try {
        saveAiProviderConfig(next);
      } catch (err) {
        savedError = err instanceof Error ? err.message : 'Konfiguration konnte nicht gespeichert werden';
      }
    }

    const config = getAiProviderConfig();
    const probe = body.test || body.config ? await probeAiProvider() : null;

    return NextResponse.json({
      success: savedError === null,
      error: savedError ?? undefined,
      config: {
        provider: config.provider,
        baseUrl: config.baseUrl ?? null,
        model: config.model ?? null,
        apiKeyMasked: maskKey(config.apiKey) ?? null,
        hasApiKey: !!config.apiKey,
      },
      probe,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
