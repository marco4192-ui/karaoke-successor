import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  try {
    const zai = await ZAI.create();

    const imageBuffer = fs.readFileSync('/home/z/my-project/upload/logo_256.jpg');
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    const prompt = `Describe what you see in this logo image. What text is written? What is the visual style? What colors are used? What shapes and decorative elements are present? Be specific and detailed.`;

    const response = await zai.chat.completions.createVision({
      model: 'glm-4.6v',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    console.log('SUCCESS:', response.choices?.[0]?.message?.content);
  } catch (err) {
    console.error('Failed:', err?.message || err);
  }
}

main();
