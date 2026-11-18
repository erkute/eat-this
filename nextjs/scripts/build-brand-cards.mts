// Brand share cards. public/pics/og-card.png (1200×630, link previews): the home hero on paper (wordmark, slogan,
// three Must Eat cards), as palette PNG so link previews stay light (WhatsApp skips heavy images).
// public/pics/og-card-square.png (1200×1200, search thumbnail): a photo. public/pics/og/og_<category>-square.png: packs. After a change bump OG_CARD_VERSION in lib/constants.ts.
import sharp, { type OverlayOptions } from 'sharp';
const dir = 'public/pics/home/silver-hero';
const paper = `${dir}/hero-paper.webp`;
const wordmark = 'public/pics/eat-this-crumpled-wordmark.webp';
const slogan = `${dir}/slogan-desktop.webp`;

// One hero card: rounded like `.heroCard img` (5.85 % / 4.26 %), then turned.
const card = async (name: string, width: number, angle: number) => {
  const height = Math.round(width * 705 / 513);
  const rx = width * 0.0585, ry = height * 0.0426;
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${rx}" ry="${ry}"/></svg>`);
  const rounded = await sharp(`${dir}/${name}.webp`).resize(width, height)
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  return sharp(rounded).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
};

// The fan as in `.heroFan` (728:470): left and right turned by 8°, the front card raised in the middle.
const fan = async (fanWidth: number, left: number, top: number) => {
  const fanHeight = fanWidth * 470 / 728;
  const cardWidth = Math.round(fanWidth * 0.35);
  const cardHeight = cardWidth * 705 / 513;
  const layers = [];
  for (const [name, x, y, angle] of [['sausage', 0.05, 0.35, -8], ['sabich', 0.6, 0.35, 8], ['fish', 0.325, 0.04, 0]] as const) {
    const image = await card(name, cardWidth, angle);
    const { width = 0, height = 0 } = await sharp(image).metadata();
    const cx = left + fanWidth * x + cardWidth / 2, cy = top + fanHeight * y + cardHeight / 2;
    layers.push({ input: image, left: Math.round(cx - width / 2), top: Math.round(cy - height / 2) });
  }
  return layers;
};

const resized = async (src: string, width: number) => sharp(src).resize({ width }).png().toBuffer();
const heightOf = async (image: Buffer) => (await sharp(image).metadata()).height ?? 0;

const render = async (width: number, height: number, out: string, layout: (w: Buffer, s: Buffer) => Promise<OverlayOptions[]>, markWidth: number) => {
  const mark = await resized(wordmark, markWidth);
  const line = await resized(slogan, Math.round(markWidth * 0.97));
  await sharp(paper).resize(width, height, { fit: 'cover' })
    .composite(await layout(mark, line)).png({ palette: true, quality: 90, effort: 10 }).toFile(out);
};

// Wide: text left, fan right (as on the desktop hero).
await render(1200, 630, 'public/pics/og-card.png', async (mark, line) => {
  const markHeight = await heightOf(mark), lineHeight = await heightOf(line);
  const block = markHeight + 28 + lineHeight, top = Math.round((630 - block) / 2);
  return [
    { input: mark, left: 64, top },
    { input: line, left: 64 + 7, top: top + markHeight + 28 },
    ...await fan(590, 560, 92),
  ];
}, 470);

// Square (search thumbnail): the original photo (empty plate, fork, red wine), kept locally under design/ like the other originals.
// Crop from the top so the face and the plate fill the square.
await sharp('../design/google/square-photo.webp').extract({ left: 0, top: 60, width: 1122, height: 1122 })
  .resize(1200, 1200).png({ compressionLevel: 9 }).toFile('public/pics/og-card-square.png');
// Category pages: the booster pack upright on paper, square for the search thumbnail (the wide og_<slug>.png
// stays for link previews). After a change bump OG_PACK_VERSION in lib/constants.ts.
const packs = { breakfast: 'breakfast', coffee: 'coffee', dinner: 'dinner', drinks: 'drinks', 'fast-food': 'fastfood',
  'fine-dining': 'finedining', lunch: 'lunch', pizza: 'pizza', sweets: 'sweets' } as const;
for (const [slug, file] of Object.entries(packs)) {
  const pack = await sharp(`public/pics/booster/booster_${file}.webp`).resize({ height: 1060 }).png().toBuffer();
  const { width = 0 } = await sharp(pack).metadata();
  await sharp(paper).resize(1200, 1200, { fit: 'cover' })
    .composite([{ input: pack, left: Math.round((1200 - width) / 2), top: 70 }])
    .png({ palette: true, quality: 90, effort: 10 }).toFile(`public/pics/og/og_${slug}-square.png`);
}
console.log('Brand share cards rendered: og-card.png, og-card-square.png, og/og_<category>-square.png.');
