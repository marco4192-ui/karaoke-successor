import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { findAIConfigFile } from '@/app/api/lib/find-config';
import { isLocalRequest } from '@/app/api/lib/is-local-request';

// API Configuration interface
interface AIConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
}

// Load config from file
async function loadConfig(): Promise<AIConfig | null> {
  const configPath = await findAIConfigFile();
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
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { type, prompt, filename, text, voice } = body;

    // Load configuration
    const config = await loadConfig();
    
    if (!config) {
      return NextResponse.json({ 
        error: 'API configuration not found. Please save your API settings in Settings > AI Asset Generator.',
        needsConfig: true
      }, { status: 400 });
    }
    
    if (!config.baseUrl || !config.apiKey) {
      return NextResponse.json({ 
        error: 'API Base URL and Key are required. Please configure them in Settings > AI Asset Generator.',
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
          console.error('Image API error:', response.status, errorText);
          
          // Provide helpful error messages
          if (response.status === 405) {
            return NextResponse.json({ 
              error: `API endpoint not found (405). The URL "${baseUrl}/images/generations" does not support image generation. Please check your API Base URL in Settings > AI Asset Generator.`,
              needsConfig: true
            }, { status: 400 });
          }
          
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json({ 
              error: `Authentication failed (${response.status}). Please check your API key in Settings > AI Asset Generator.`,
              needsConfig: true
            }, { status: 400 });
          }
          
          return NextResponse.json({ 
            error: `API error (${response.status}): ${errorText.substring(0, 200)}`,
            needsConfig: response.status >= 400 && response.status < 500
          }, { status: 500 });
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
      } catch (fetchError: unknown) {
        console.error('Image fetch error:', fetchError);
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        // Check if it's a network error
        if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
          return NextResponse.json({ 
            error: `Could not connect to API at "${baseUrl}". Please check if the URL is correct and the server is running.`,
            needsConfig: true
          }, { status: 503 });
        }
        
        return NextResponse.json({ 
          error: `Connection failed: ${msg}. Check if API URL is correct.`
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
          console.error('TTS API error:', response.status, errorText);
          
          // Provide helpful error messages
          if (response.status === 405) {
            return NextResponse.json({ 
              error: `API endpoint not found (405). The URL "${baseUrl}/audio/tts" does not support text-to-speech. Please check your API Base URL in Settings > AI Asset Generator.`,
              needsConfig: true
            }, { status: 400 });
          }
          
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json({ 
              error: `Authentication failed (${response.status}). Please check your API key in Settings > AI Asset Generator.`,
              needsConfig: true
            }, { status: 400 });
          }
          
          return NextResponse.json({ 
            error: `API error (${response.status}): ${errorText.substring(0, 200)}`,
            needsConfig: response.status >= 400 && response.status < 500
          }, { status: 500 });
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        const base64 = buffer.toString('base64');

        return NextResponse.json({ 
          success: true, 
          audio: base64,
          filename 
        });
      } catch (fetchError: unknown) {
        console.error('TTS fetch error:', fetchError);
        const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        
        // Check if it's a network error
        if (msg.includes('fetch') || msg.includes('ECONNREFUSED')) {
          return NextResponse.json({ 
            error: `Could not connect to API at "${baseUrl}". Please check if the URL is correct and the server is running.`,
            needsConfig: true
          }, { status: 503 });
        }
        
        return NextResponse.json({ 
          error: `Connection failed: ${msg}. Check if API URL is correct.`
        }, { status: 503 });
      }
    }

    return NextResponse.json({ error: 'Invalid type. Use "image" or "audio"' }, { status: 400 });
  } catch (error: unknown) {
    console.error('Asset generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Batch generation endpoint
export async function PUT(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
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
      } catch (err: unknown) {
        results.push({
          filename: asset.filename,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
