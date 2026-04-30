import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import { findAIConfigFile } from '@/app/api/lib/find-config';

// Config file path - check multiple locations
const getConfigPaths = () => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
  ];
};

// Only allow requests from the Tauri webview or localhost
const isLocalRequest = (request: NextRequest): boolean => {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';
  const host = request.headers.get('host') || '';
  return (
    origin.startsWith('tauri://') ||
    origin.startsWith('https://tauri.') ||
    origin.startsWith('http://tauri.') ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1') ||
    referer.startsWith('tauri://') ||
    referer.startsWith('https://tauri.') ||
    referer.startsWith('http://localhost') ||
    referer.startsWith('http://127.0.0.1') ||
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1')
  );
};

// GET - Read current config
export async function GET() {
  try {
    const configPath = await findAIConfigFile();
    
    if (!configPath) {
      return NextResponse.json({
        success: true,
        config: null,
        message: 'No configuration file found. Please create one.'
      });
    }

    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Mask the API key for security
    const maskedConfig = {
      ...config,
      apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : '',
      hasApiKey: !!config.apiKey,
    };

    return NextResponse.json({
      success: true,
      config: maskedConfig,
      message: 'Configuration loaded'
    });
  } catch (error) {
    console.error('Error reading config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

// POST - Save config
export async function POST(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { baseUrl, apiKey, chatId, userId } = body;

    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Base URL is required and must be a string'
      }, { status: 400 });
    }

    // Validate baseUrl is a valid URL format
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Base URL must be a valid URL'
      }, { status: 400 });
    }

    // Build config object
    const config = {
      baseUrl: baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/v1`,
      apiKey: apiKey || '',
      chatId: chatId || '',
      userId: userId || ''
    };

    // Save to project directory (most reliable location)
    const configPath = path.join(process.cwd(), '.z-ai-config');
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

    // Also try to save to home directory for CLI tools
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
      try {
        const homeConfigPath = path.join(homeDir, '.z-ai-config');
        await writeFile(homeConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      } catch {
        // Ignore errors writing to home directory
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      configPath
    });
  } catch (error) {
    console.error('Error saving config:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

// PUT - Test connection
export async function PUT(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { baseUrl, apiKey } = body;

    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Base URL is required'
      }, { status: 400 });
    }

    // Try to make a simple request to test the connection
    const testUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/v1`;
    
    try {
      const response = await fetch(`${testUrl}/models`, {
        method: 'GET',
        headers: apiKey ? {
          'X-Token': apiKey,
          'Authorization': `Bearer ${apiKey}`
        } : {}
      });

      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: 'Connection successful! API is reachable.'
        });
      } else if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Authentication failed. Please check your API key.'
        }, { status: 401 });
      } else {
        return NextResponse.json({
          success: false,
          error: `API returned status ${response.status}`
        }, { status: 400 });
      }
    } catch (fetchError) {
      // Connection failed
      const message = fetchError instanceof Error ? fetchError.message : 'Connection failed';
      return NextResponse.json({
        success: false,
        error: `Could not connect to API: ${message}`
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

// DELETE - Remove config
export async function DELETE(request: NextRequest) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  try {
    const paths = getConfigPaths();
    
    for (const p of paths) {
      try {
        await unlink(p);
      } catch {
        // Ignore errors
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration removed'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}
