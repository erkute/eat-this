// The stylesheet the sitemap points at. A route rather than a file in
// `public/`, because the MIME type decides whether it runs at all: Blink only
// accepts `text/xsl`, `text/xml` and `application/xml` for XSLT, while the
// static-file mapping for a `.xsl` extension is `application/xslt+xml` — which
// it rejects, silently, leaving the wall of text the stylesheet exists to fix.
// Here the header is ours to set.
export const dynamic = 'force-static';

const STYLESHEET = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
<!-- indent="no": the serializer would otherwise break lines between
     elements, and every such break lands in the rendered text as a
     stray space — "/robots.txt ." instead of "/robots.txt." -->
<xsl:output method="html" encoding="UTF-8" indent="no" />

<xsl:template match="/">
<html lang="de">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sitemap – Eat This</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0 20px 80px;
    background: #fff;
    color: #15120e;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-text-size-adjust: 100%;
  }
  .wrap { max-width: 1040px; margin: 0 auto; }
  header { padding: 48px 0 28px; border-bottom: 3px solid #15120e; }
  .kicker {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(21, 18, 14, 0.64);
  }
  h1 { margin: 0; font-size: clamp(30px, 6vw, 46px); line-height: 1.1; letter-spacing: -0.02em; }
  h1 em { font-style: normal; background: #ffc600; padding: 0 6px; }
  .lede { margin: 14px 0 0; max-width: 62ch; color: rgba(21, 18, 14, 0.64); }
  section { margin: 44px 0 0; }
  h2 {
    position: sticky;
    top: 0;
    z-index: 2;
    margin: 0;
    padding: 14px 0 10px;
    background: #fff;
    border-bottom: 2px solid #15120e;
    font-size: 18px;
    letter-spacing: -0.01em;
  }
  h2 .count {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 999px;
    background: #ffc600;
    font-size: 12px;
    font-weight: 700;
    vertical-align: 2px;
  }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    padding: 9px 10px 9px 0;
    text-align: left;
    border-bottom: 1px solid #e4e1dc;
    vertical-align: baseline;
  }
  th {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(21, 18, 14, 0.64);
  }
  tbody tr:hover { background: #fffbe9; }
  td.url { width: 100%; word-break: break-word; }
  td.url a {
    color: #15120e;
    text-decoration: none;
    border-bottom: 1px solid rgba(21, 18, 14, 0.22);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13.5px;
  }
  td.url a:hover { border-bottom-color: #15120e; background: #ffc600; }
  td.meta { white-space: nowrap; color: rgba(21, 18, 14, 0.64); font-size: 13px; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; font-size: 13px; }
  .empty { margin: 40px 0; padding: 20px; background: #f4f2ee; border-radius: 8px; }
  footer { margin: 56px 0 0; padding-top: 18px; border-top: 1px solid #e4e1dc; color: rgba(21, 18, 14, 0.64); font-size: 13px; }
  footer a { color: inherit; }
  @media (max-width: 640px) {
    th.hide-s, td.hide-s { display: none; }
  }
</style>
</head>
<body>
<div class="wrap">

<header>
  <p class="kicker">Eat This</p>
  <h1>XML-<em>Sitemap</em></h1>
  <p class="lede">
    <xsl:value-of select="count(/s:urlset/s:url)" /> URLs für Suchmaschinen.
    Diese Ansicht ist nur für Menschen — Google liest dieselbe Datei roh und
    ignoriert das Stylesheet.
  </p>
</header>

<xsl:if test="count(/s:urlset/s:url) = 0">
  <p class="empty">Diese Sitemap ist leer. Auf Staging ist das so gewollt: dort soll nichts indexiert werden.</p>
</xsl:if>

<xsl:call-template name="section">
  <xsl:with-param name="label">Seiten</xsl:with-param>
  <xsl:with-param name="rows" select="/s:urlset/s:url[not(contains(s:loc, '/restaurant/') or contains(s:loc, '/news/') or contains(s:loc, '/bezirk/') or contains(s:loc, '/kategorie/'))]" />
</xsl:call-template>

<xsl:call-template name="section">
  <xsl:with-param name="label">Spots</xsl:with-param>
  <xsl:with-param name="rows" select="/s:urlset/s:url[contains(s:loc, '/restaurant/')]" />
</xsl:call-template>

<xsl:call-template name="section">
  <xsl:with-param name="label">Artikel</xsl:with-param>
  <xsl:with-param name="rows" select="/s:urlset/s:url[contains(s:loc, '/news/')]" />
</xsl:call-template>

<xsl:call-template name="section">
  <xsl:with-param name="label">Bezirke</xsl:with-param>
  <xsl:with-param name="rows" select="/s:urlset/s:url[contains(s:loc, '/bezirk/')]" />
</xsl:call-template>

<xsl:call-template name="section">
  <xsl:with-param name="label">Kategorien</xsl:with-param>
  <xsl:with-param name="rows" select="/s:urlset/s:url[contains(s:loc, '/kategorie/')]" />
</xsl:call-template>

<footer>
  Das rohe XML steht unter „Seitenquelltext anzeigen“. Angemeldet ist diese
  Datei in der <a href="/robots.txt">robots.txt</a>.
</footer>

</div>
</body>
</html>
</xsl:template>

<xsl:template name="section">
  <xsl:param name="label" />
  <xsl:param name="rows" />
  <xsl:if test="count($rows) &gt; 0">
    <section>
      <h2><xsl:value-of select="$label" /><span class="count"><xsl:value-of select="count($rows)" /></span></h2>
      <table>
        <thead>
          <tr>
            <th>Pfad</th>
            <th class="hide-s">Sprachen</th>
            <th class="hide-s">Geändert</th>
            <th class="num">Prio</th>
          </tr>
        </thead>
        <tbody>
          <xsl:for-each select="$rows">
            <tr>
              <td class="url">
                <a href="{s:loc}">
                  <xsl:value-of select="concat('/', substring-after(substring-after(s:loc, '//'), '/'))" />
                </a>
              </td>
              <td class="meta hide-s">
                <xsl:choose>
                  <xsl:when test="xhtml:link[@hreflang='en']">DE + EN</xsl:when>
                  <xsl:otherwise>nur DE</xsl:otherwise>
                </xsl:choose>
              </td>
              <td class="meta hide-s"><xsl:value-of select="substring(s:lastmod, 1, 10)" /></td>
              <td class="num"><xsl:value-of select="s:priority" /></td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </section>
  </xsl:if>
</xsl:template>

</xsl:stylesheet>
`;

export async function GET(): Promise<Response> {
  return new Response(STYLESHEET, {
    headers: {
      'Content-Type': 'text/xsl; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
