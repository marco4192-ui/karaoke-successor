import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = './public/assets/images';
const AUDIO_DIR = './public/assets/audio';

// Ensure directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

async function generateImage(zai: any, prompt: string, filename: string, size: string = '1024x1024') {
  console.log(`🎨 Generating: ${filename}`);
  console.log(`   Prompt: ${prompt.substring(0, 60)}...`);
  
  try {
    const response = await zai.images.generations.create({
      prompt: prompt,
      size: size as any
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`   ✅ Saved: ${outputPath}`);
    return { success: true, path: outputPath };
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function generateAudio(zai: any, text: string, filename: string, voice: string = 'tongtong') {
  console.log(`🔊 Generating: ${filename}`);
  console.log(`   Text: ${text}`);
  
  try {
    const response = await zai.audio.tts.create({
      input: text,
      voice: voice as any,
      speed: 1.0,
      response_format: 'wav',
      stream: false
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    const outputPath = path.join(AUDIO_DIR, filename);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`   ✅ Saved: ${outputPath}`);
    return { success: true, path: outputPath };
  } catch (error: any) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting asset generation for Karaoke Successor...\n');
  
  const zai = await ZAI.create();
  
  // ========================
  // VISUAL ASSETS
  // ========================
  console.log('📸 GENERATING VISUAL ASSETS\n');
  console.log('=' .repeat(50));
  
  // 1. Title Screen Background
  await generateImage(
    zai,
    'Karaoke game title screen background, neon lights, microphone silhouette on stage, vibrant purple and cyan gradient, musical notes floating, concert stage atmosphere, modern gaming aesthetic, no text, high quality digital art',
    'title-bg.png',
    '1440x720'
  );

  // 2. Menu Background
  await generateImage(
    zai,
    'Abstract music visualization background, flowing sound waves, neon glow effects, dark purple and blue gradients, suitable for game menu, no text, modern digital art style',
    'menu-bg.png',
    '1440x720'
  );

  // 3. Game Screen Background
  await generateImage(
    zai,
    'Concert stage view from singer perspective, crowd silhouette in darkness, spotlights and stage lights, dramatic lighting, purple and blue atmosphere, karaoke stage background, no text',
    'game-bg.png',
    '1440x720'
  );

  // 4. Rank Badges
  const rankBadges = [
    { name: 'beginner', desc: 'bronze microphone badge icon, simple design, warm bronze metallic color, gaming achievement style, clean vector art on transparent background' },
    { name: 'amateur', desc: 'silver microphone badge icon, moderate design, shiny silver metallic color, gaming achievement style, clean vector art on transparent background' },
    { name: 'singer', desc: 'gold microphone badge icon, elegant design, shiny gold metallic color, gaming achievement style, clean vector art on transparent background' },
    { name: 'performer', desc: 'platinum microphone badge icon, premium design, gleaming platinum metallic color, gaming achievement style, clean vector art on transparent background' },
    { name: 'star', desc: 'diamond microphone badge icon, luxury design, sparkling diamond crystal effect, gaming achievement style, clean vector art on transparent background' },
    { name: 'legend', desc: 'legendary microphone badge icon, majestic design, rainbow holographic effect with golden trim, gaming achievement style, clean vector art on transparent background' },
    { name: 'divine', desc: 'divine microphone badge icon, godlike design, celestial glow with angelic wings, pure white and golden light rays, gaming achievement style, clean vector art on transparent background' },
  ];

  for (const badge of rankBadges) {
    await generateImage(
      zai,
      badge.desc,
      `rank-${badge.name}.png`,
      '1024x1024'
    );
  }

  // 5. Achievement Icons
  const achievements = [
    { name: 'first-song', desc: 'achievement icon, golden music note trophy, celebration theme, gaming style icon, clean design on dark background' },
    { name: 'perfect-score', desc: 'achievement icon, sparkling golden star with 100% text, perfect score celebration, gaming style icon, clean design on dark background' },
    { name: 'streak-10', desc: 'achievement icon, flame icon with number 10, winning streak celebration, gaming style icon, clean design on dark background' },
    { name: 'challenge-won', desc: 'achievement icon, golden trophy cup with star, winner celebration, gaming style icon, clean design on dark background' },
    { name: 'level-up', desc: 'achievement icon, upward arrow with sparkles, level up celebration, gaming style icon, clean design on dark background' },
  ];

  for (const achievement of achievements) {
    await generateImage(
      zai,
      achievement.desc,
      `achievement-${achievement.name}.png`,
      '1024x1024'
    );
  }

  // 6. Character Avatar Placeholders
  const avatars = [
    { name: 'avatar-1', desc: 'anime style karaoke singer avatar, cute character holding microphone, vibrant colors, circular frame, clean digital art' },
    { name: 'avatar-2', desc: 'anime style rock star avatar, cool character with electric guitar, vibrant colors, circular frame, clean digital art' },
    { name: 'avatar-3', desc: 'anime style pop star avatar, elegant character with sparkles, vibrant colors, circular frame, clean digital art' },
  ];

  for (const avatar of avatars) {
    await generateImage(
      zai,
      avatar.desc,
      `${avatar.name}.png`,
      '1024x1024'
    );
  }

  // ========================
  // AUDIO ASSETS
  // ========================
  console.log('\n🔊 GENERATING AUDIO ASSETS\n');
  console.log('=' .repeat(50));

  // Audio announcements
  const audioAssets = [
    { text: 'Level Up!', file: 'level-up.wav' },
    { text: 'New High Score!', file: 'high-score.wav' },
    { text: 'Challenge Complete!', file: 'challenge-complete.wav' },
    { text: 'Perfect Score!', file: 'perfect-score.wav' },
    { text: 'Achievement Unlocked!', file: 'achievement.wav' },
    { text: 'Game Over', file: 'game-over.wav' },
    { text: 'Welcome to Karaoke Successor!', file: 'welcome.wav' },
    { text: 'Get ready to sing!', file: 'get-ready.wav' },
    { text: 'Amazing performance!', file: 'amazing.wav' },
    { text: 'You are a Star!', file: 'star.wav' },
  ];

  for (const audio of audioAssets) {
    await generateAudio(zai, audio.text, audio.file);
  }

  console.log('\n✨ Asset generation complete!');
  console.log(`   Images: ${OUTPUT_DIR}`);
  console.log(`   Audio: ${AUDIO_DIR}`);
}

main().catch(console.error);
