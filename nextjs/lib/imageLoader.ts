// next/image-Loader für Sanity-Bilder, gesetzt von
// app/components/SiteImage.tsx.
//
// Sanity-Bilder gehen direkt an die Sanity-CDN, die selbst verkleinert und
// WebP/AVIF liefert. Über Nexts eigenen Optimierer (`/_next/image`) kostete
// jede Variante die Instanz Rechenzeit, rund 100 MiB Speicher für die
// Bildbibliothek und einen Eintrag im Bild-Cache, der auf Cloud Run im RAM
// liegt, weil dort das Dateisystem im Arbeitsspeicher liegt. Zusammen mit neu
// geschriebenen ISR-Seiten reißt das die 1-GiB-Grenze.
//
// Nicht als globaler `images.loaderFile`: Ein eigener globaler Loader schaltet
// `/_next/image` komplett ab (next-server.js, `imagesConfig.loader !==
// 'default'` → 404), und die eigenen Bilder unter /pics und /buddy brauchen den
// Optimierer.

const SANITY_CDN = 'https://cdn.sanity.io/';

export function isSanityImage(src: string): boolean {
  return src.startsWith(SANITY_CDN);
}
