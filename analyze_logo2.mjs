import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  try {
    const zai = await ZAI.create();

    // Read and encode the tiny image
    const imageBuffer = fs.readFileSync('/home/z/my-project/upload/logo_tiny.jpg');
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    const prompt = `Analyze this logo image in extreme detail. Provide:
1) Visual style (comic, retro, pop art, punk, etc.)
2) Color palette with hex codes for every color
3) Typography details
4) All visual elements (shapes, icons, illustrations)
5) All text content exactly as written
6) Mood/vibe
7) Border/frame style
8) Background style
9) Design patterns (halftone, textures, etc.)
10) Composition layout`;

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ];

    console.log('Sending request to VLM (tiny image)...');
    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages,
      thinking: { type: 'disabled' }
    });

    const reply = response.choices?.[0]?.message?.content;
    console.log(reply ?? JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Failed:', err?.message || err);
  }
}

main();
