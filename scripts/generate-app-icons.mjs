/**
 * Rasterize Office Attend eye mark into Expo icon assets.
 * Run: npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const images = path.join(root, 'assets', 'images');
const brand = '#1F5C45';
const ink = '#FFFEFC';

/** Material Symbols path from eye_tracking.svg (viewBox 0 -960 960 960). */
const EYE_PATH =
  'M240-40H120q-33 0-56.5-23.5T40-120v-120h80v120h120v80Zm480 0v-80h120v-120h80v120q0 33-23.5 56.5T840-40H720ZM480-220q-120 0-217.5-71T120-480q45-118 142.5-189T480-740q120 0 217.5 71T840-480q-45 118-142.5 189T480-220Zm0-80q88 0 161-48t112-132q-39-84-112-132t-161-48q-88 0-161 48T207-480q39 84 112 132t161 48Zm0-40q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Zm0-80q-25 0-42.5-17.5T420-480q0-25 17.5-42.5T480-540q25 0 42.5 17.5T540-480q0 25-17.5 42.5T480-420ZM40-720v-120q0-33 23.5-56.5T120-920h120v80H120v120H40Zm800 0v-120H720v-80h120q33 0 56.5 23.5T920-840v120h-80ZM480-480Z';

function eyeSvg(size, fill) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 -960 960 960">` +
      `<path fill="${fill}" d="${EYE_PATH}"/>` +
      `</svg>`
  );
}

async function solid(size, color) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

async function compositeIcon(outPath, canvas, eyeSize, bg) {
  const eye = await sharp(eyeSvg(eyeSize, ink)).resize(eyeSize, eyeSize).png().toBuffer();
  const base = await solid(canvas, bg);
  await sharp(base)
    .composite([{ input: eye, gravity: 'centre' }])
    .png()
    .toFile(outPath);
  console.log('wrote', path.relative(root, outPath));
}

async function foregroundAdaptive(outPath) {
  // Transparent 1024 with eye in ~66% safe zone
  const eyeSize = 560;
  const eye = await sharp(eyeSvg(eyeSize, ink)).resize(eyeSize, eyeSize).png().toBuffer();
  const base = await solid(1024, { r: 0, g: 0, b: 0, alpha: 0 });
  await sharp(base)
    .composite([{ input: eye, gravity: 'centre' }])
    .png()
    .toFile(outPath);
  console.log('wrote', path.relative(root, outPath));
}

async function main() {
  await mkdir(images, { recursive: true });

  await compositeIcon(path.join(images, 'icon.png'), 1024, 720, brand);
  await compositeIcon(path.join(images, 'splash-icon.png'), 512, 360, brand);
  await compositeIcon(path.join(images, 'favicon.png'), 48, 34, brand);
  await foregroundAdaptive(path.join(images, 'android-icon-foreground.png'));

  await sharp(await solid(1024, brand)).png().toFile(path.join(images, 'android-icon-background.png'));
  console.log('wrote assets/images/android-icon-background.png');

  const monoEye = await sharp(eyeSvg(560, '#FFFFFF')).resize(560, 560).png().toBuffer();
  const monoBase = await solid(1024, { r: 0, g: 0, b: 0, alpha: 0 });
  await sharp(monoBase)
    .composite([{ input: monoEye, gravity: 'centre' }])
    .png()
    .toFile(path.join(images, 'android-icon-monochrome.png'));
  console.log('wrote assets/images/android-icon-monochrome.png');

  // Source SVG for design tools (rounded app icon preview)
  await writeFile(
    path.join(images, 'icon-source.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="${brand}"/>
  <svg x="152" y="152" width="720" height="720" viewBox="0 -960 960 960">
    <path fill="${ink}" d="${EYE_PATH}"/>
  </svg>
</svg>
`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
