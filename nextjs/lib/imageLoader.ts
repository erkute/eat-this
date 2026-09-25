// next/image-Loader für Sanity-Bilder, gesetzt von app/components/SiteImage.tsx.
//
// Sanity-Bilder gehen direkt an die Sanity-CDN, die selbst verkleinert und
// WebP/AVIF liefert. Bis 25.09.2026 liefen sie durch Nexts eigenen Optimierer
// (`/_next/image`): jede Variante kostete die Instanz Rechenzeit, rund 100 MiB
// Speicher für die Bildbibliothek und einen Eintrag im Bild-Cache — der auf
// Cloud Run im RAM liegt, weil dort das Dateisystem im Arbeitsspeicher liegt.
// Zusammen mit den neu geschriebenen ISR-Seiten riss das die 1-GiB-Grenze.
//
// Nicht als globaler `images.loaderFile`: ein eigener globaler Loader schaltet
// `/_next/image` komplett ab (next-server.js, `imagesConfig.loader !==
// 'default'` → 404), und die eigenen Bilder unter /pics und /buddy brauchen
// den Optimierer weiter.

import sanityImageLoader from './sanityImageLoader';

const SANITY_CDN = 'https://cdn.sanity.io/';

export function isSanityImage(src: string): boolean {
  return src.startsWith(SANITY_CDN);
}

/* Die GROQ-Presets (lib/sanity-image-presets.ts) liefern schon eine Breite,
   manche einen Zuschnitt (`h` + `fit=crop`). Die Breite ersetzt next/image
   pro srcset-Stufe; die Höhe wird mitskaliert, damit der Zuschnitt sein
   Seitenverhältnis behält. Ohne Zuschnitt ist das Ergebnis dasselbe wie beim
   `sanityImageLoader` der rohen <img>-Stellen. */
export function sanityNextImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const [base, query = ''] = src.split('?', 2);
  const preset = new URLSearchParams(query);
  const presetW = Number(preset.get('w'));
  const presetH = Number(preset.get('h'));
  const fit = preset.get('fit');
  if (!presetH || !fit) return sanityImageLoader({ src: base, width, quality });

  const params = new URLSearchParams({ w: String(width) });
  params.set('h', String(presetW ? Math.round((presetH * width) / presetW) : presetH));
  params.set('fit', fit);
  params.set('auto', 'format');
  params.set('q', String(quality ?? preset.get('q') ?? 80));
  return `${base}?${params.toString()}`;
}
