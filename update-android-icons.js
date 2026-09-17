
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');
const logoPath = path.join(__dirname, 'public', 'police-logo.png');

const densities = {
  'mdpi': { size: 48, adaptive: 108 },
  'hdpi': { size: 72, adaptive: 162 },
  'xhdpi': { size: 96, adaptive: 216 },
  'xxhdpi': { size: 144, adaptive: 324 },
  'xxxhdpi': { size: 192, adaptive: 432 }
};

async function generate() {
  console.log('Regenerating Fixed Android Launcher Icons...');
  for (const [density, config] of Object.entries(densities)) {
    const mipmapDir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(mipmapDir)) fs.mkdirSync(mipmapDir, { recursive: true });

    // Legacy
    await sharp(logoPath).resize(config.size, config.size).png().toFile(path.join(mipmapDir, 'ic_launcher.png'));

    // Round
    const radius = config.size / 2;
    const roundMask = Buffer.from(`<svg><circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/></svg>`);
    await sharp(logoPath).resize(config.size, config.size).composite([{ input: roundMask, blend: 'dest-in' }]).png().toFile(path.join(mipmapDir, 'ic_launcher_round.png'));

    // Adaptive Foreground
    const foregroundSize = Math.floor(config.adaptive * 0.65);
    await sharp(logoPath).resize(foregroundSize, foregroundSize).extend({
        top: Math.floor((config.adaptive - foregroundSize) / 2),
        bottom: Math.ceil((config.adaptive - foregroundSize) / 2),
        left: Math.floor((config.adaptive - foregroundSize) / 2),
        right: Math.ceil((config.adaptive - foregroundSize) / 2),
        background: { r: 0, g: 26, b: 77, alpha: 0 }
      }).png().toFile(path.join(mipmapDir, 'ic_launcher_foreground.png'));
    console.log(`- Updated ${density}`);
  }
}
generate().catch(console.error);
