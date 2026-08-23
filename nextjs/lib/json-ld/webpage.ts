import { SITE_URL } from '@/lib/constants';

interface BuildWebPageNodesArgs {
  // Canonical URL of the page these nodes describe.
  pageUrl: string;
  locale: 'de' | 'en';
  // The picture that stands for this page. Undefined is a valid answer — a
  // district without its own photo and without a single publishable
  // restaurant image has nothing to offer, and an ImageObject pointing at the
  // brand card would just teach Google the wrong thumbnail.
  image?: string;
  // Alt-text-grade caption for the image.
  caption?: string;
}

/**
 * The `WebPage` + `ImageObject` pair that names one representative picture per
 * page.
 *
 * Without it Google free-picks from whatever the page renders — on a hub that
 * is fifty lazy-loaded cards, most of them portrait crops, and the result is
 * usually no thumbnail at all. `primaryImageOfPage` is the documented way to
 * say which one it should be; the home page has carried one since June, the
 * rest of the catalogue did not.
 *
 * No `name`: the page title lives in `generateMetadata`, not in the component
 * that renders this, and a second hand-built copy would drift from the real
 * `<title>` the first time either changes. `width`/`height` are left off for
 * the same reason — Sanity delivers the source width when the original is
 * narrower than the preset, so a declared 1200 would be a guess.
 */
export function buildWebPageNodes({
  pageUrl,
  locale,
  image,
  caption,
}: BuildWebPageNodesArgs): Record<string, unknown>[] {
  const imageId = `${pageUrl}#primaryimage`;
  return [
    {
      '@type': 'WebPage',
      '@id': `${pageUrl}#webpage`,
      url: pageUrl,
      inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      ...(image && {
        primaryImageOfPage: { '@id': imageId },
        image: { '@id': imageId },
      }),
    },
    ...(image
      ? [
          {
            '@type': 'ImageObject',
            '@id': imageId,
            url: image,
            contentUrl: image,
            ...(caption && { caption }),
          },
        ]
      : []),
  ];
}
