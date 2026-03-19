const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const HTML_FILES = [
  'index.html',
  'about.html',
  'contact.html',
  'advertise.html',
  'press.html',
  'privacy.html',
  'cookies.html',
  'terms.html'
];

function getWebpPath(originalPath) {
  const ext = path.extname(originalPath);
  const base = originalPath.replace(ext, '');
  return base + '.webp';
}

function convertImagePaths(htmlContent) {
  let updated = htmlContent;
  
  const replacements = [
    { from: /\.jpeg/g, to: '.webp' },
    { from: /\.jpg/g, to: '.webp' },
    { from: /\.png/g, to: '.webp' }
  ];
  
  let changes = 0;
  
  for (const r of replacements) {
    const matches = htmlContent.match(new RegExp(r.from, 'g'));
    if (matches) {
      updated = updated.replace(r.from, r.to);
      changes += matches.length;
    }
  }
  
  return { updated, changes };
}

function main() {
  console.log('🔄 Aktualisiere Bildpfade in HTML-Dateien...\n');
  console.log('Ersetze: .jpeg → .webp, .jpg → .webp, .png → .webp\n');
  
  let totalChanges = 0;
  
  for (const file of HTML_FILES) {
    const filePath = path.join(ROOT_DIR, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${file} nicht gefunden, überspringe...`);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const { updated, changes } = convertImagePaths(content);
    
    if (changes > 0) {
      fs.writeFileSync(filePath, updated);
      console.log(`✓ ${file}: ${changes} Bildpfade aktualisiert`);
      totalChanges += changes;
    } else {
      console.log(`○ ${file}: keine Änderungen nötig`);
    }
  }
  
  console.log(`\n✅ ${totalChanges} Bildpfade aktualisiert!`);
  console.log('📝 Stelle sicher, dass alle WebP-Bilder existieren bevor du deployst.');
}

main();
