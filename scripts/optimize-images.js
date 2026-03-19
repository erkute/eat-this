const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PICS_DIR = path.join(ROOT_DIR, 'pics');
const FOOD_DIR = path.join(ROOT_DIR, 'pics', 'food');
const QUALITY = 80;

async function optimizeImage(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    await sharp(inputPath)
      .webp({ quality: QUALITY })
      .toFile(outputPath.replace(ext, '.webp'));
    
    const stats = fs.statSync(inputPath);
    const webpStats = fs.statSync(outputPath.replace(ext, '.webp'));
    
    console.log(`✓ ${path.basename(inputPath)}`);
    console.log(`  Original: ${(stats.size / 1024).toFixed(1)}KB → WebP: ${(webpStats.size / 1024).toFixed(1)}KB (${Math.round(webpStats.size / stats.size * 100)}%)`);
    return outputPath.replace(ext, '.webp');
  }
  return null;
}

async function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      await processDirectory(filePath);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        await optimizeImage(filePath, filePath);
      }
    }
  }
}

async function main() {
  console.log('🖼️  Bildoptimierung gestartet...\n');
  console.log('Konvertiere zu WebP (Qualität: 80%)\n');
  
  await processDirectory(PICS_DIR);
  
  console.log('\n✅ Fertig! Alle Bilder wurden zu WebP konvertiert.');
  console.log('📝 HTML-Dateien müssen nun auf .webp Endungen aktualisiert werden.');
}

main().catch(console.error);
