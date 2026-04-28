import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// TypeScript types for cover generation
interface CoverGenerateRequest {
  title: string;
  artist: string;
  genre?: string;
  style?: 'modern' | 'vintage' | 'minimalist' | 'artistic' | 'neon' | 'retro';
}

interface CoverGenerateResponse {
  success: boolean;
  image?: string; // base64 encoded PNG
  error?: string;
}

// Genre-specific visual themes
const genreThemes: Record<string, string> = {
  pop: 'bright colors, vibrant, modern, glossy, clean design',
  rock: 'gritty textures, bold typography, electric, dark tones with accent colors',
  'hip-hop': 'urban style, street art influence, gold accents, bold graphics',
  rnb: 'smooth gradients, soulful, elegant, warm tones',
  country: 'rustic, western elements, earth tones, vintage feel',
  electronic: 'neon colors, digital, futuristic, geometric patterns',
  jazz: 'art deco style, golden accents, sophisticated, smoky atmosphere',
  classical: 'elegant, ornate, refined, sepia tones, timeless',
  latin: 'tropical colors, vibrant, festive, rhythmic patterns',
  'k-pop': 'korean pop aesthetic, pastel colors, trendy, youthful',
  metal: 'dark, intense, dramatic, gothic elements',
  indie: 'lo-fi aesthetic, vintage film look, organic textures',
  soul: 'warm colors, vinyl record aesthetic, 60s-70s vibe',
  disco: 'glitter, mirror ball reflections, 70s glamour, vibrant',
  reggae: 'rasta colors, tropical, laid-back, island vibes',
};

// Style-specific prompts
const stylePrompts: Record<string, string> = {
  modern: 'contemporary design, clean lines, digital art style, polished finish',
  vintage: 'retro aesthetic, aged paper texture, nostalgic feel, classic design',
  minimalist: 'simple design, limited color palette, lots of negative space, clean typography',
  artistic: 'painterly style, artistic interpretation, creative visuals, expressive',
  neon: 'neon glow effects, dark background with bright neon colors, synthwave aesthetic',
  retro: '80s-90s style, vintage synthesizer aesthetic, VHS vibes, nostalgic graphics',
};

export async function POST(request: NextRequest): Promise<NextResponse<CoverGenerateResponse>> {
  try {
    const body: CoverGenerateRequest = await request.json();
    
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!body.artist || typeof body.artist !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Artist is required' },
        { status: 400 }
      );
    }

    // Sanitize user inputs to prevent prompt injection
    const sanitize = (s: string) => s.replace(/[{}()\[\]\\]/g, '').slice(0, 200);
    const safeTitle = sanitize(body.title);
    const safeArtist = sanitize(body.artist);

    let zai;
    try {
      zai = await ZAI.create();
    } catch (initError) {
      console.error('[CoverGenerate] Failed to initialize ZAI SDK:', initError);
      return NextResponse.json(
        { success: false, error: 'AI service unavailable' },
        { status: 503 }
      );
    }

    // Build the prompt for cover art generation
    const genre = body.genre?.toLowerCase() || 'pop';
    const style = body.style || 'modern';
    
    const genreTheme = genreThemes[genre] || genreThemes.pop;
    const stylePrompt = stylePrompts[style] || stylePrompts.modern;

    // Create a detailed prompt for image generation
    const prompt = `Album cover art for the song "${safeTitle}" by ${safeArtist}.
Style: ${stylePrompt}
Theme: ${genreTheme}
Design requirements:
- Professional music album cover design
- Square format (1:1 aspect ratio)
- Title "${safeTitle}" should be prominently featured
- Artist name "${safeArtist}" clearly visible
- No text on faces or people
- High quality, print-ready appearance
- Visually striking and memorable
- Suitable for digital music platforms`;

    // Generate the image
    try {
      const imageResponse = await zai.images.generations.create({
        prompt,
        size: '1024x1024',
      });

      const base64Image = imageResponse.data?.[0]?.base64;
      
      if (!base64Image) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate cover image' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        image: base64Image,
      });
    } catch (imageError) {
      console.error('[CoverGenerate] Image generation error:', imageError);
      return NextResponse.json(
        { success: false, error: 'Image generation failed' },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[CoverGenerate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
