import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, access, unlink } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

// Config file path - check multiple locations
const getConfigPaths = () => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  return [
    path.join(process.cwd(), '.z-ai-config'),
    path.join(homeDir, '.z-ai-config'),
  ];
};

const findConfigFile = async (): Promise<string | null> => {
  const paths = getConfigPaths();
  for (const p of paths) {
    try {
      await access(p, constants.R_OK);
      return p;
    } catch {
      // File doesn't exist or not readable
    }
  }
  return null;
};

// GET - Read current config
export async function GET() {
  try {
    const configPath = await findConfigFile();
    
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
      configPath,
      message: 'Configuration loaded'
    });
  } catch (error: any) {
    console.error('Error reading config:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// POST - Save config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, chatId, userId } = body;

    // Validate required fields
    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Base URL is required'
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
  } catch (error: any) {
    console.error('Error saving config:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// PUT - Test connection
export async function PUT(request: NextRequest) {
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
    } catch (fetchError: any) {
      // Connection failed
      return NextResponse.json({
        success: false,
        error: `Could not connect to API: ${fetchError.message}`
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// DELETE - Remove config
export async function DELETE() {
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
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
