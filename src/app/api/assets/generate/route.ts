import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, prompt, filename, text, voice } = body;

    const zai = await ZAI.create();

    // Image generation
    if (type === 'image') {
      if (!prompt || !filename) {
        return NextResponse.json({ error: 'prompt and filename required' }, { status: 400 });
      }

      const response = await zai.images.generations.create({
        prompt,
        size: body.size || '1024x1024'
      });

      const base64 = response?.data?.[0]?.base64;
      if (!base64) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        image: base64,
        filename 
      });
    }

    // Audio generation (TTS)
    if (type === 'audio') {
      if (!text || !filename) {
        return NextResponse.json({ error: 'text and filename required' }, { status: 400 });
      }

      const response = await zai.audio.tts.create({
        input: text,
        voice: voice || 'tongtong',
        speed: 1.0,
        response_format: 'wav',
        stream: false
      });

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      const base64 = buffer.toString('base64');

      return NextResponse.json({ 
        success: true, 
        audio: base64,
        filename 
      });
    }

    return NextResponse.json({ error: 'Invalid type. Use "image" or "audio"' }, { status: 400 });
  } catch (error: any) {
    console.error('Asset generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    const zai = await ZAI.create();
    const results = [];

    for (const asset of assets) {
      try {
        if (asset.type === 'image') {
          const response = await zai.images.generations.create({
            prompt: asset.prompt,
            size: asset.size || '1024x1024'
          });
          const base64 = response?.data?.[0]?.base64;
          results.push({ 
            filename: asset.filename, 
            type: 'image',
            success: !!base64,
            data: base64 
          });
        } else if (asset.type === 'audio') {
          const response = await zai.audio.tts.create({
            input: asset.text,
            voice: asset.voice || 'tongtong',
            speed: 1.0,
            response_format: 'wav',
            stream: false
          });
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(new Uint8Array(arrayBuffer));
          results.push({ 
            filename: asset.filename, 
            type: 'audio',
            success: true,
            data: buffer.toString('base64')
          });
        }
      } catch (err: any) {
        results.push({ 
          filename: asset.filename, 
          success: false, 
          error: err.message 
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
