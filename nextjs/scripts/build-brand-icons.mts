// Approved Figma variant C (straight wordmark, white hero paper), node 2690:3060. No fonts or runtime rendering.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
const source = '../design/auth-mail/icon-c.png';
const paper = '../design/auth-mail/hero-paper-square.png';
const sizes = [16, 32, 48, 64];
// At 16/32 px the paper cracks in the letters turn into grey smudges: pull them back to ink.
const tabIcon = (size: number) => size > 32 ? sharp(source).resize(size, size) : sharp(source).resize(size, size).linear(1.4, -100);
const images = await Promise.all(sizes.map(size => tabIcon(size).png().toBuffer()));
const directory = Buffer.alloc(6 + images.length * 16);
directory.writeUInt16LE(1, 2); directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
for (const [i, bytes] of images.entries()) {
  const p = 6 + i * 16;
  directory[p] = sizes[i]!; directory[p + 1] = sizes[i]!;
  directory.writeUInt16LE(1, p + 4); directory.writeUInt16LE(32, p + 6);
  directory.writeUInt32LE(bytes.length, p + 8); directory.writeUInt32LE(offset, p + 12);
  offset += bytes.length;
}
await writeFile('public/favicon.ico', Buffer.concat([directory, ...images]));
for (const size of [48, 192, 512]) await sharp(source).resize(size, size).png().toFile(`public/pics/favicon-${size}.png`);
await sharp(source).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// Maskable safe zone: keep the complete wordmark inside platform crops.
const inset = await sharp(source).resize(432, 432).png().toBuffer();
await sharp(paper).resize(512, 512)
  .composite([{input:inset,left:40,top:40}]).png().toFile('public/pics/favicon-maskable-512.png');
console.log('Variant C: favicon, Apple Touch, PWA and maskable icons rendered.');
