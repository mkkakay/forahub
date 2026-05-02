import sharp from "sharp";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "..", "public", "icons");

await mkdir(outputDir, { recursive: true });

// Geometric FH monogram — pure rect/path, no font dependency
function makeSvg(size) {
  const r = Math.round(size * 0.18); // corner radius
  // All coordinates as % of size for clean scaling
  const u = size / 100;

  // F strokes
  const fX = 12 * u, fY = 22 * u;
  const stroke = 9 * u;
  const fHeight = 56 * u;
  const fTopW = 26 * u;
  const fMidW = 20 * u;
  const fMidY = 44 * u;

  // H strokes — right half
  const hLeft = 53 * u;
  const hRight = 76 * u;
  const hHeight = 56 * u;
  const hMidY = 44 * u;
  const hMidW = (hRight - hLeft) + stroke;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0f2a4a"/>
  <!-- F -->
  <rect x="${fX}" y="${fY}" width="${stroke}" height="${fHeight}" fill="#4ea8de"/>
  <rect x="${fX}" y="${fY}" width="${fTopW}" height="${stroke}" fill="#4ea8de"/>
  <rect x="${fX}" y="${fMidY}" width="${fMidW}" height="${stroke}" fill="#4ea8de"/>
  <!-- H -->
  <rect x="${hLeft}" y="${fY}" width="${stroke}" height="${hHeight}" fill="#4ea8de"/>
  <rect x="${hRight}" y="${fY}" width="${stroke}" height="${hHeight}" fill="#4ea8de"/>
  <rect x="${hLeft}" y="${hMidY}" width="${hMidW}" height="${stroke}" fill="#4ea8de"/>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

for (const size of sizes) {
  const svg = makeSvg(size);
  await sharp(Buffer.from(svg)).png().toFile(join(outputDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Maskable variant at 512 — same design works (background fills safe zone)
await sharp(Buffer.from(makeSvg(512))).png().toFile(join(outputDir, "icon-maskable-512x512.png"));
console.log("✓ icon-maskable-512x512.png");

console.log("\nAll icons generated in public/icons/");
