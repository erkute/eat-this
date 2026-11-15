// Approved Figma variant D (page "Favicon e."): the lowercase "e" cut from the crumpled wordmark, on white hero paper.
// Renders the favicon set, the PWA icons and the Sanity Studio icon. No fonts or runtime rendering.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const wordmark = 'public/pics/eat-this-crumpled-wordmark.webp';
const paper = '../design/auth-mail/hero-paper-square.png';
// The "e" is the first glyph of the wordmark (columns 5–394 of 2600). Two passes: within one pipeline sharp trims before it extracts.
const column = await sharp(wordmark).extract({ left: 0, top: 0, width: 400, height: 645 }).png().toBuffer();
const glyph = await sharp(column).trim().png().toBuffer();
// The "e" on paper at `share` of the edge, optically centred (slightly below the middle).
const onPaper = async (size: number, share: number) => {
  const height = Math.round(size * share);
  const e = await sharp(glyph).resize({ height }).png().toBuffer();
  const { width = 0 } = await sharp(e).metadata();
  return sharp(paper).resize(size, size)
    .composite([{ input: e, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2 + size * 0.02) }])
    .png().toBuffer();
};
// Room for circular favicon masks.
const icon = await onPaper(1024, 0.66);
const sizes = [16, 32, 48, 64];
// At 16/32 px the paper cracks in the letter turn into grey smudges: pull them back to ink.
const tabIcon = (size: number) => size > 32 ? sharp(icon).resize(size, size) : sharp(icon).resize(size, size).linear(1.4, -100);
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
for (const size of [48, 192, 512]) await sharp(icon).resize(size, size).png().toFile(`public/pics/favicon-${size}.png`);
await sharp(icon).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// Maskable safe zone (inner 80 % circle): a smaller "e".
await sharp(await onPaper(512, 0.5)).png().toFile('public/pics/favicon-maskable-512.png');
// Sanity Studio: the file for the start page, the same bytes as data URI in StudioIcon.tsx (the dashboard on sanity.io cannot reach /static/).
const studio = await sharp(icon).resize(128, 128).webp({ quality: 80 }).toBuffer();
await writeFile('../studio/static/eat-this-icon.webp', studio);
const studioIcon = '../studio/components/StudioIcon.tsx';
const source = await readFile(studioIcon, 'utf8');
await writeFile(studioIcon, source.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/, `data:image/webp;base64,${studio.toString('base64')}`));
console.log('Variant D: favicon, Apple Touch, PWA, maskable and Studio icons rendered.');
