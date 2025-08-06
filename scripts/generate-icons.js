// PWAアイコン生成スクリプト
// 単一のSVGから各サイズのPNGアイコンを生成

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

// アイコンサイズの定義
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// SVGコンテンツ（WebARサービス用のシンプルなアイコン）
const SVG_CONTENT = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#gradient)"/>
  <g transform="translate(256, 256)">
    <circle cx="0" cy="0" r="120" fill="none" stroke="white" stroke-width="12" opacity="0.9"/>
    <circle cx="0" cy="0" r="80" fill="none" stroke="white" stroke-width="12" opacity="0.7"/>
    <circle cx="0" cy="0" r="40" fill="none" stroke="white" stroke-width="12" opacity="0.5"/>
    <circle cx="0" cy="-120" r="20" fill="white"/>
    <circle cx="104" cy="60" r="20" fill="white"/>
    <circle cx="-104" cy="60" r="20" fill="white"/>
    <text x="0" y="10" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white">AR</text>
  </g>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  try {
    // SVGバッファを作成
    const svgBuffer = Buffer.from(SVG_CONTENT);
    
    // 各サイズのアイコンを生成
    for (const size of ICON_SIZES) {
      const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${outputPath}`);
    }
    
    // バッジアイコンも生成（小さいサイズ）
    const badgePath = path.join(publicDir, 'badge-72x72.png');
    await sharp(svgBuffer)
      .resize(72, 72)
      .png()
      .toFile(badgePath);
    console.log(`✅ Generated ${badgePath}`);
    
    // ファビコンを生成
    const faviconPath = path.join(publicDir, 'favicon.png');
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(faviconPath);
    console.log(`✅ Generated ${faviconPath}`);
    
    console.log('\n✨ All icons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// スクリプトを実行
generateIcons();