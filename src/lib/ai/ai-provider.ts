/**
 * AI provider abstraction (user request: ".z-ai-config einstellen oder eine
 * andere KI hinterlegen").
 *
 * The app's AI features (harmonize, metadata-enrich, lyrics-suggestions,
 * song-identify, cover-generate, ai-status) previously talked to the ZAI SDK
 * directly — which only works on machines with a `.z-ai-config` file. This
 * module adds a configurable second provider:
 *
 *   1. `zai`    — the built-in ZAI SDK (default, sandbox/development)
 *   2. `openai` — any OpenAI-COMPATIBLE endpoint (OpenAI, Azure-compat gateways,
 *                 LM Studio, Ollama's /v1, OpenRouter, …): baseUrl + apiKey + model
 *
 * The configuration lives in `ai-provider.json` next to the server process
 * (project root in dev, bundled server folder in the desktop app) and is
 * edited through the Settings → "KI-Dienst" card (persisted via
 * POST /api/ai-provider).
 *
 * Server-side only (fs access) — all consumers are API routes.
 */

import fs from 'fs';
import path from 'path';
import ZAI from 'z-ai-web-dev-sdk';

export type AiProviderKind = 'zai' | 'openai';

export interface AiProviderConfig {
  provider: AiProviderKind;
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 (no trailing slash). */
  baseUrl?: string;
  /** API key for the openai provider (stored locally, never returned unmasked). */
  apiKey?: string;
  /** Chat model id (e.g. "gpt-4o-mini"). Also used for image generation. */
  model?: string;
}

const CONFIG_FILENAME = 'ai-provider.json';

const DEFAULT_CONFIG: AiProviderConfig = { provider: 'zai' };

function configPath(): string {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

/** Read the persisted provider config (falls back to built-in ZAI). */
export function getAiProviderConfig(): AiProviderConfig {
  try {
    const raw = fs.readFileSync(configPath(), 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AiProviderConfig>;
    if (parsed && (parsed.provider === 'zai' || parsed.provider === 'openai')) {
      return {
        provider: parsed.provider,
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : undefined,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
        model: typeof parsed.model === 'string' ? parsed.model : undefined,
      };
    }
  } catch {
    /* missing/corrupt file → default */
  }
  return { ...DEFAULT_CONFIG };
}

/** Persist the provider config (Settings → KI-Dienst). */
export function saveAiProviderConfig(config: AiProviderConfig): void {
  const clean: AiProviderConfig = {
    provider: config.provider === 'openai' ? 'openai' : 'zai',
    baseUrl: config.baseUrl?.trim() || undefined,
    apiKey: config.apiKey?.trim() || undefined,
    model: config.model?.trim() || undefined,
  };
  if (clean.provider === 'openai' && !clean.baseUrl) {
    throw new Error('Base URL fehlt (OpenAI-kompatibler Endpunkt)');
  }
  fs.writeFileSync(configPath(), JSON.stringify(clean, null, 2), 'utf-8');
}

// ── Chat completions ─────────────────────────────────────────────────────

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  temperature?: number;
  /** Hard timeout for the HTTP call (openai provider). Default 120s. */
  timeoutMs?: number;
}

function trimBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Run a chat completion and return the assistant's message content.
 * Throws when the provider is unavailable or the request fails.
 */
export async function aiChatCompletion(
  messages: AiChatMessage[],
  options: AiChatOptions = {},
): Promise<string> {
  const config = getAiProviderConfig();

  if (config.provider === 'openai') {
    const url = `${trimBaseUrl(config.baseUrl || '')}/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 120_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages,
          temperature: options.temperature ?? 0.2,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`AI-Endpoint ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Leere Antwort vom AI-Endpoint');
      return content;
    } finally {
      clearTimeout(timer);
    }
  }

  // Built-in ZAI SDK
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages,
    temperature: options.temperature ?? 0.2,
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('Leere Antwort vom AI-Dienst');
  return content;
}

// ── Image generation (cover art) ─────────────────────────────────────────

/**
 * Generate an image and return it as a base64 string (no data: prefix).
 * Only the ZAI SDK currently serves images natively; the openai provider
 * uses the OpenAI-compatible /images/generations endpoint with b64_json.
 */
export async function aiImageGeneration(
  prompt: string,
  size: string = '1024x1024',
): Promise<string> {
  const config = getAiProviderConfig();

  if (config.provider === 'openai') {
    const url = `${trimBaseUrl(config.baseUrl || '')}/images/generations`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model || 'dall-e-3',
          prompt,
          size,
          response_format: 'b64_json',
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Image-Endpoint ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json() as {
        data?: Array<{ b64_json?: string }>;
      };
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) throw new Error('Leere Bild-Antwort vom AI-Endpoint');
      return b64;
    } finally {
      clearTimeout(timer);
    }
  }

  const zai = await ZAI.create();
  const imageResponse = await zai.images.generations.create({
    prompt,
    // ZAI SDK types a fixed size union; callers pass the supported default
    size: size as '1024x1024',
  });
  const img = imageResponse.data?.[0]?.base64;
  if (!img) throw new Error('Empty image response');
  return img;
}

// ── Availability probe ───────────────────────────────────────────────────

export interface AiProbeResult {
  available: boolean;
  provider: AiProviderKind;
  model?: string;
  error?: string;
}

/**
 * Probe the configured provider with a minimal chat request.
 * Used by /api/ai-status and the Settings "Test connection" button.
 */
export async function probeAiProvider(): Promise<AiProbeResult> {
  const config = getAiProviderConfig();
  try {
    if (config.provider === 'openai' && !config.baseUrl) {
      return { available: false, provider: 'openai', error: 'Base URL fehlt' };
    }
    await aiChatCompletion(
      [{ role: 'user', content: 'ping' }],
      { temperature: 0, timeoutMs: 20_000 },
    );
    return { available: true, provider: config.provider, model: config.model };
  } catch (err) {
    return {
      available: false,
      provider: config.provider,
      model: config.model,
      error: err instanceof Error ? err.message : 'Unbekannter Fehler',
    };
  }
}
