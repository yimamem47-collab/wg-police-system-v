
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgLogo = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Metallic Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="20%" style="stop-color:#FFF8DC;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#D4AF37;stop-opacity:1" />
      <stop offset="80%" style="stop-color:#B8860B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8B6508;stop-opacity:1" />
    </linearGradient>
    
    <!-- Deep Royal Blue for Shield -->
    <radialGradient id="blueRadial" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#003366;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#001A4D;stop-opacity:1" />
    </radialGradient>

    <!-- Glossy Overlay -->
    <linearGradient id="gloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.4" />
      <stop offset="50%" style="stop-color:#FFFFFF;stop-opacity:0" />
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="12" />
      <feOffset dx="0" dy="12" result="offsetblur" />
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="innerShadow">
      <feOffset dx="0" dy="4"/>
      <feGaussianBlur stdDeviation="4" result="offset-blur"/>
      <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
      <feFlood flood-color="black" flood-opacity="0.5" result="color"/>
      <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
      <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
    </filter>
  </defs>

  <!-- Outer Rounded Square Container (App Icon Style) -->
  <rect x="20" y="20" width="984" height="984" rx="200" fill="#001A4D" stroke="#C0C0C0" stroke-width="12" />
  
  <!-- Main Circular Shield Background -->
  <circle cx="512" cy="512" r="460" fill="url(#blueRadial)" stroke="url(#goldGrad)" stroke-width="20" filter="url(#shadow)" />
  
  <!-- Rays / Sunburst (Premium detail) -->
  <g opacity="0.1" stroke="#FFD700" stroke-width="1">
    ${Array.from({ length: 72 }, (_, i) => `<line x1="512" y1="512" x2="${512 + 400 * Math.cos((i * 5 * Math.PI) / 180)}" y2="${512 + 400 * Math.sin((i * 5 * Math.PI) / 180)}" />`).join('')}
  </g>

  <!-- Inner Rings -->
  <circle cx="512" cy="512" r="410" fill="none" stroke="url(#goldGrad)" stroke-width="8" />
  <circle cx="512" cy="512" r="340" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-dasharray="10,15" />

  <!-- Laurel Wreath -->
  <g fill="url(#goldGrad)" filter="url(#shadow)">
    <path d="M220 512 Q220 280 400 180 L420 200 Q260 280 260 512 Z" />
    <path d="M804 512 Q804 280 624 180 L604 200 Q764 280 764 512 Z" />
  </g>

  <!-- Central Star (3D Look) -->
  <path d="M512 300 L575 465 L745 465 L605 565 L655 730 L512 630 L369 730 L419 565 L279 465 L449 465 Z" 
        fill="url(#goldGrad)" stroke="#8B6508" stroke-width="3" filter="url(#shadow)" />

  <!-- Justice Scales (Top Shield Position) -->
  <g transform="translate(512, 420) scale(0.65)" filter="url(#shadow)">
    <!-- Scale Base -->
    <path d="M-120 0 L120 0" stroke="url(#goldGrad)" stroke-width="10" stroke-linecap="round" />
    <path d="M0 -80 L0 10" stroke="#8B6508" stroke-width="14" stroke-linecap="round" />
    <!-- Cups -->
    <path d="M-120 0 L-150 80 Q-120 105 -90 80 Z" fill="url(#goldGrad)" stroke="#8B6508" stroke-width="2" />
    <path d="M120 0 L90 80 Q120 105 150 80 Z" fill="url(#goldGrad)" stroke="#8B6508" stroke-width="2" />
  </g>

  <!-- Text Paths -->
  <defs>
    <path id="topCurve" d="M 160,512 A 352,352 0 0,1 864,512" />
    <path id="bottomCurve" d="M 160,512 A 352,352 0 0,0 864,512" />
  </defs>

  <!-- Language Branding (Corrected Spelling) -->
  <text font-family="Arial, sans-serif" font-weight="950" text-anchor="middle" letter-spacing="2">
    <textPath href="#topCurve" startOffset="50%" fill="#FFD700" font-size="80" filter="url(#shadow)">የአማራ ክልል ፖሊስ</textPath>
  </text>
  <text font-family="Arial, sans-serif" font-weight="950" text-anchor="middle" letter-spacing="5">
    <textPath href="#bottomCurve" startOffset="50%" fill="#FFD700" font-size="64" filter="url(#shadow)">AMHARA REGION POLICE</textPath>
  </text>

  <!-- Final Gloss Overlay -->
  <circle cx="512" cy="512" r="460" fill="url(#gloss)" opacity="0.6" pointer-events="none" />
</svg>
`;

async function generate() {
  const publicDir = path.join(__dirname, 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const buf = Buffer.from(svgLogo);

  console.log('Generating premium fixed logo assets with corrected spelling...');

  const options = {
    policeLogo: { width: 1024, height: 1024, name: 'police-logo.png' },
    favicon: { width: 256, height: 256, name: 'favicon.png' },
    splash: { width: 2048, height: 2048, name: 'splash-logo.png' },
    transparent: { width: 1024, height: 1024, name: 'transparent-logo.png' },
    appIcon: { width: 1024, height: 1024, name: 'rounded-app-icon.png' }
  };

  for (const key in options) {
    const config = options[key];
    let s = sharp(buf).resize(config.width, config.height);
    
    // For transparent version, we can use a version without the dark background rect if needed,
    // but here we just output png from the buffer which has the design.
    
    await s.png().toFile(path.join(publicDir, config.name));
    console.log(`Generated: ${config.name}`);
  }

  process.exit(0);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
