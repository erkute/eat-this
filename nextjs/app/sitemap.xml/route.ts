import { sitemapEntries, type SitemapEntry } from '@/lib/seo/sitemap-entries';

// Hand-serialized instead of Next's `app/sitemap.ts` metadata route, for one
// reason: that route cannot emit the `<?xml-stylesheet?>` processing
// instruction. Without it a browser shows the sitemap as one run-together
// wall of text — Chrome dropped its built-in XML tree viewer, so nothing
// formats the file for a human any more. The XML itself is byte-for-byte the
// same offer to crawlers, just indented; they ignore the stylesheet line.
//
// Cache the generated sitemap for a day instead of rebuilding it (full Sanity
// fetch of all restaurants/articles/bezirke) on every crawler hit. Content
// changes still surface immediately: /api/revalidate calls
// revalidatePath('/sitemap.xml') on Sanity webhooks.
export const revalidate = 86400;

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

function urlBlock(entry: SitemapEntry): string {
  const alternates = Object.entries(entry.alternates ?? {}).map(
    ([hreflang, href]) =>
      `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}" />`
  );
  return [
    '  <url>',
    `    <loc>${escapeXml(entry.url)}</loc>`,
    ...alternates,
    `    <lastmod>${entry.lastModified}</lastmod>`,
    `    <changefreq>${entry.changeFrequency}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

export async function GET(): Promise<Response> {
  const entries = await sitemapEntries();

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries.map(urlBlock),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Same as the old metadata route served: the CDN and the browser
      // revalidate every time, Next's own ISR cache above absorbs the load.
      // A longer s-maxage would outlive the Sanity webhook's revalidatePath.
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
