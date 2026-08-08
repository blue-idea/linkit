import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#256ee4" />
      <stop offset="100%" stop-color="#19c083" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" rx="224" ry="224" fill="url(#bgGrad)" />
  <g transform="translate(224, 224) scale(24)" fill="none" stroke="#ffffff" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/>
    <path d="m7 16.5-4.74-2.85"/>
    <path d="m7 16.5 5-3"/>
    <path d="M7 16.5v5.17"/>
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/>
    <path d="m17 16.5-5-3"/>
    <path d="m17 16.5 4.74-2.85"/>
    <path d="M17 16.5v5.17"/>
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/>
    <path d="M12 8 7.26 5.15"/>
    <path d="m12 8 4.74-2.85"/>
    <path d="M12 13.5V8"/>
  </g>
</svg>`;

async function main() {
  const browser = await chromium.launch();
  
  // Render 1024x1024 appicon
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    svg { display: block; width: 1024px; height: 1024px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  await page.setContent(html);
  const appiconPath = path.join(rootDir, 'build', 'appicon.png');
  await page.screenshot({ path: appiconPath, omitBackground: true });
  console.log('Saved appicon.png to', appiconPath);

  // Copy to ui/public/appicon.png
  const publicDir = path.join(rootDir, 'ui', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicAppiconPath = path.join(publicDir, 'appicon.png');
  fs.copyFileSync(appiconPath, publicAppiconPath);
  console.log('Saved ui/public/appicon.png');

  // Render 44x44 trayicon
  const trayPage = await browser.newPage({
    viewport: { width: 44, height: 44 },
    deviceScaleFactor: 1,
  });
  const trayHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; overflow: hidden; }
    svg { display: block; width: 44px; height: 44px; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
  await trayPage.setContent(trayHtml);
  const trayiconPath = path.join(rootDir, 'build', 'darwin', 'trayicon.png');
  await trayPage.screenshot({ path: trayiconPath, omitBackground: true });
  console.log('Saved trayicon.png to', trayiconPath);

  await browser.close();

  // Now build windows/icon.ico using Python script
  const pythonScript = `
from PIL import Image

src = Image.open(r'${appiconPath.replace(/\\/g, '\\\\')}')
ico_path = r'${path.join(rootDir, 'build', 'windows', 'icon.ico').replace(/\\/g, '\\\\')}'

sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
images = [src.resize(size, Image.Resampling.LANCZOS) for size in sizes]
images[0].save(ico_path, format='ICO', sizes=sizes)
print('Generated icon.ico successfully')
`;
  execSync(`python -c "${pythonScript.replace(/\n/g, ' ')}"`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
