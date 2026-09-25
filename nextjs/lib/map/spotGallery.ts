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
    const key = img.full.split('?')[0];
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
