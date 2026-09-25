'use client';

// Der einzige Weg zu next/image in dieser App (Lint-Regel in eslint.config.mjs).
// Sanity-URLs bekommen den Sanity-Loader und gehen direkt an die CDN, alles
// andere läuft unverändert über Nexts Optimierer. Client-Komponente, weil ein
// `loader`-Prop als Funktion nicht aus einer Server-Komponente heraus
// übergeben werden kann — hier entsteht er erst im Client-Modul.

import Image, { type ImageProps } from 'next/image';
import { isSanityImage, sanityNextImageLoader } from '@/lib/imageLoader';

export default function SiteImage(props: ImageProps) {
  const sanity = typeof props.src === 'string' && isSanityImage(props.src);
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` kommt über die Props.
  return <Image {...props} loader={sanity ? sanityNextImageLoader : props.loader} />;
}
