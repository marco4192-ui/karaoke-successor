import { NextRequest, NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

// API Configuration interface
interface AIConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
}

// Find config file
async function findConfigFile(): Promise<string | null> {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const paths = [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
  ];
  
  for (const p of paths) {
    try {
      await access(p, constants.R_OK);
      return p;
    } catch {
      // File doesn't exist or not readable
    }
  }
  return null;
}

// Load config from file
async function loadConfig(): Promise<AIConfig | null> {
  const configPath = await findConfigFile();
  if (!configPath) {
    return null;
  }
  
  try {
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, prompt, filename, text, voice } = body;

    // Load configuration
    const config = await loadConfig();
    
    if (!config) {
      return NextResponse.json({ 
        error: 'API configuration not found. Please save your API settings first.',
        needsConfig: true
      }, { status: 400 });
    }
    
    if (!config.baseUrl || !config.apiKey) {
      return NextResponse.json({ 
        error: 'API Base URL and Key are required. Please configure them in Settings > AI Asset.',
        needsConfig: true
      }, { status: 400 });
    }

    const baseUrl = config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl.replace(/\/$/, '')}/v1`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Token': config.apiKey,
    };

    // Image generation
    if (type === 'image') {
      if (!prompt || !filename) {
        return NextResponse.json({ error: 'prompt and filename required' }, { status: 400 });
      }

      try {
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt,
            size: body.size || '1024x1024',
            n: 1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[AssetAPI]', 'Image API error:', response.status, errorText);
          return NextResponse.json({ 
            error: `API error (${response.status}): ${errorText}`,
            needsConfig: response.status === 401
          }, { status: response.status });
        }

        const data = await response.json();
        const base64 = data?.data?.[0]?.b64_json || data?.data?.[0]?.base64;
        
        if (!base64) {
          return NextResponse.json({ error: 'No image generated' }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          image: base64,
          filename 
        });
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        logger.error('[AssetAPI]', 'Image fetch error:', fetchError);
        return NextResponse.json({ 
          error: `Connection failed: ${message}. Check if API URL is correct.`
        }, { status: 503 });
      }
    }

    // Audio generation (TTS)
    if (type === 'audio') {
      if (!text || !filename) {
        return NextResponse.json({ error: 'text and filename required' }, { status: 400 });
      }

      try {
        const response = await fetch(`${baseUrl}/audio/tts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            input: text,
            voice: voice || 'tongtong',
            speed: 1.0,
            response_format: 'wav',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('[AssetAPI]', 'TTS API error:', response.status, errorText);
          return NextResponse.json({ 
            error: `API error (${response.status}): ${errorText}`,
            needsConfig: response.status === 401
          }, { status: response.status });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        const base64 = buffer.toString('base64');

        return NextResponse.json({ 
          success: true, 
          audio: base64,
          filename 
        });
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        logger.error('[AssetAPI]', 'TTS fetch error:', fetchError);
        return NextResponse.json({ 
          error: `Connection failed: ${message}. Check if API URL is correct.`
        }, { status: 503 });
      }
    }

    return NextResponse.json({ error: 'Invalid type. Use "image" or "audio"' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[AssetAPI]', 'Asset generation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Batch generation endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { assets } = body;

    if (!Array.isArray(assets)) {
      return NextResponse.json({ error: 'assets array required' }, { status: 400 });
    }

    // Load configuration
    const config = await loadConfig();
    
    if (!config || !config.baseUrl || !config.apiKey) {
      return NextResponse.json({ 
        error: 'API configuration not found. Please save your API settings first.',
        needsConfig: true
      }, { status: 400 });
    }

    const baseUrl = config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl.replace(/\/$/, '')}/v1`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Token': config.apiKey,
    };

    const results: { filename: string; type?: string; success: boolean; data?: string; error?: string }[] = [];

    for (const asset of assets) {
      try {
        if (asset.type === 'image') {
          const response = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              prompt: asset.prompt,
              size: asset.size || '1024x1024',
              n: 1,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            const base64 = data?.data?.[0]?.b64_json || data?.data?.[0]?.base64;
            results.push({ 
              filename: asset.filename, 
              type: 'image',
              success: !!base64,
              data: base64 
            });
          } else {
            results.push({ 
              filename: asset.filename, 
              success: false, 
              error: `API error: ${response.status}` 
            });
          }
        } else if (asset.type === 'audio') {
          const response = await fetch(`${baseUrl}/audio/tts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              input: asset.text,
              voice: asset.voice || 'tongtong',
              speed: 1.0,
              response_format: 'wav',
            }),
          });
          
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(new Uint8Array(arrayBuffer));
            results.push({ 
              filename: asset.filename, 
              type: 'audio',
              success: true,
              data: buffer.toString('base64')
            });
          } else {
            results.push({ 
              filename: asset.filename, 
              success: false, 
              error: `API error: ${response.status}` 
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ 
          filename: asset.filename, 
          success: false, 
          error: message 
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
