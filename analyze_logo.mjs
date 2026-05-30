import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  try {
    const zai = await ZAI.create();

    // Read and encode the compressed image
    const imageBuffer = fs.readFileSync('/home/z/my-project/upload/logo_small.jpg');
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    const prompt = `You are an expert graphic design analyst. Analyze this logo image in extreme detail. Provide:

1) OVERALL VISUAL STYLE: Is this comic, retro, pop art, punk, psychedelic, vintage, modern, etc.? Be specific about era and style references.

2) COMPLETE COLOR PALETTE: List EVERY distinct color with approximate hex codes. Group by primary, secondary, accent, text, and background colors.

3) TYPOGRAPHY: Describe all text - font characteristics (serif/sans-serif/display), weight, size hierarchy, letter spacing, text effects (outline, shadow, gradient, 3D, distress), placement.

4) VISUAL ELEMENTS: Every shape, character, icon, illustration, mascot, decorative element. Their position, style, interaction.

5) ALL TEXT CONTENT: Extract ALL text exactly as written.

6) MOOD/VIBE: Emotional tone and energy.

7) BORDER/FRAME STYLE: Any borders, frames, containers.

8) BACKGROUND STYLE: Background treatment - solid, pattern, texture, gradient.

9) DESIGN PATTERNS: Halftone dots, Ben-Day dots, screen print textures, noise, crosshatching, gradients, drop shadows, strokes, distress effects, etc.

10) COMPOSITION LAYOUT: Overall arrangement - centered, asymmetric, layered, etc.

Be maximally detailed for a full UI redesign.`;

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    console.log('Sending request to VLM...');
    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages,
      thinking: { type: 'disabled' },
      timeout: 120000
    });

    const reply = response.choices?.[0]?.message?.content;
    console.log('Vision model reply:');
    console.log(reply ?? JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Vision chat failed:', err?.message || err);
  }
}

main();
