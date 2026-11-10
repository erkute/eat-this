'use client';

// Der einzige Weg zu next/image in dieser App (Lint-Regel in eslint.config.mjs).
// Sanity-URLs bekommen den Sanity-Loader und gehen direkt an die CDN, alles
// andere läuft unverändert über Nexts Optimierer. Client-Komponente, weil ein
// `loader`-Prop als Funktion nicht aus einer Server-Komponente heraus
// übergeben werden kann — hier entsteht er erst im Client-Modul.

import { sanityImagePosition } from '@/lib/sanity-image-presets';
import Image, { type ImageProps } from 'next/image';
import { isSanityImage } from '@/lib/imageLoader';
import sanityImageLoader from '@/lib/sanityImageLoader';

export default function SiteImage(props: ImageProps) {
  const sanity = typeof props.src === 'string' && isSanityImage(props.src);
  // eslint-disable-next-line jsx-a11y/alt-text -- `alt` kommt über die Props.
  return <Image {...props} style={sanity ? { objectPosition: sanityImagePosition(props.src as string), ...props.style } : props.style} quality={props.quality ?? 80} loader={sanity ? sanityImageLoader : props.loader} />;
}
