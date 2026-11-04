import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// A small, cacheable paper texture, preloaded only when the consent question is pending.
const paper = await sharp('public/pics/paper/folded-white.webp')
  .resize({ width: 1080 })
  .webp({ quality: 80 })
  .toBuffer();
await writeFile('public/pics/paper/consent-paper.webp', paper);
console.log(`Cookie paper: ${paper.byteLength} bytes.`);
