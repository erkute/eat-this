import { safeHttpUrl } from '@/lib/safeHttpUrl';
import type { RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';

/* Die Fotos eines Spots in der Reihenfolge, in der man sie durchwischt:
   Titelbild, dann die Galerie. Gilt für das Detail und die Listenkarte —
   beide sollen dieselben Bilder in derselben Folge zeigen.

   Ein Foto ohne Credit samt Link fällt raus (siehe das Foto-Gate der
   Restaurant-Seite), und jedes Asset kommt nur einmal vor, auch wenn es mit
   anderer Query als Titelbild und in der Galerie steht.

   `trustHero`: die Listenkarte zeigt ihr Foto schon, bevor die Credits
   geladen sind. Fiele es danach wegen des Credits heraus, spränge die Karte
   auf ein anderes Bild — also bleibt es dort, wo es ohnehin steht. */
export function spotGallery(
  hero: RestaurantGalleryImage | null,
  gallery: RestaurantGalleryImage[] | undefined,
  { trustHero = false }: { trustHero?: boolean } = {}
): RestaurantGalleryImage[] {
  const images: RestaurantGalleryImage[] = [];
  const seen = new Set<string>();
  const add = (img: RestaurantGalleryImage | null, trusted: boolean) => {
    if (!img?.thumb || !img.full) return;
    if (!trusted && !hasLinkedCredit(img)) return;
    const key = photoAssetKey(img.full);
    if (seen.has(key)) return;
    seen.add(key);
    images.push(img);
  };
  add(hero, trustHero);
  gallery?.forEach((img) => add(img, false));
  return images;
}

function hasLinkedCredit(img: Pick<RestaurantGalleryImage, 'credit' | 'creditUrl'>) {
  return !!img.credit?.trim() && !!safeHttpUrl(img.creditUrl);
}

/* Dasselbe Asset kommt mit verschiedenen Bild-Parametern (Karte, Detail,
   Galerie) — verglichen wird ohne Query. */
function photoAssetKey(url: string) {
  return url.split('?')[0];
}

/* Welches Foto eines Spots zuletzt zu sehen war, über Liste und Detail
   hinweg: wer in der Liste auf Foto 3 wischt und tippt, landet im Detail auf
   Foto 3, und zurück in der Liste steht die Karte auf dem Foto, auf dem man
   das Detail verlassen hat. Gemerkt wird das Asset, nicht die Nummer — die
   Liste zeigt ihr Titelbild auch ohne Credit, das Detail nicht, die Nummern
   können also auseinanderliegen. Nur für die Sitzung, pro Slug. */
const lastPhoto = new Map<string, string>();

export function rememberSpotPhoto(slug: string, photo: RestaurantGalleryImage | undefined) {
  if (photo) lastPhoto.set(slug, photoAssetKey(photo.full));
}

export function rememberedSpotPhotoIndex(slug: string, photos: RestaurantGalleryImage[]): number {
  const key = lastPhoto.get(slug);
  if (!key) return 0;
  return Math.max(0, photos.findIndex((img) => photoAssetKey(img.full) === key));
}
