// scripts/generate-articles.js
// Generates /news/[slug].html SEO shells by cloning index.html and
// patching per-article meta tags (title, description, OG/Twitter, JSON-LD).
// The SPA still handles the actual article rendering on page load — so
// the user sees the in-app design, and crawlers/social sites see rich meta.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SANITY_PROJECT = 'ehwjnjr2';
const SANITY_DATASET = 'production';
const SANITY_API_VER = '2024-01-01';
const SANITY_CDN = `https://${SANITY_PROJECT}.apicdn.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;
const SITE_URL = 'https://www.eatthisdot.com';

async function fetchArticles() {
  const query = `*[_type == "newsArticle" && !(_id in path("drafts.**"))] | order(date desc) {
    "slug": slug.current,
    title,
    language,
    category,
    categoryLabel,
    date,
    "imageUrl": image.asset->url,
    alt,
    excerpt,
    seo {
      metaTitle,
      metaDescription,
      "ogImageUrl": ogImage.asset->url,
      noIndex
    }
  }`;
  const url = `${SANITY_CDN}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity fetch failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.result ?? [];
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildJsonLd(article, canonical, ogImage) {
  const metaTitle = article.seo?.metaTitle || article.title || '';
  const metaDesc  = article.seo?.metaDescription || article.excerpt || '';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    'headline': metaTitle,
    'description': metaDesc,
    'image': ogImage,
    'datePublished': article.date || '',
    'dateModified': article.date || '',
    'author': {
      '@type': 'Organization',
      'name': 'Eat This Berlin',
      'url': SITE_URL,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Eat This Berlin',
      'url': SITE_URL,
      'logo': {
        '@type': 'ImageObject',
        'url': `${SITE_URL}/pics/logo.webp`,
      },
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': canonical,
    },
    'inLanguage': article.language || 'en',
  }).replace(/<\//g, '<\\/');
}

// Replace the content of a meta tag matched by an anchor attribute.
// Works across line breaks. Anchor must be unique in <head>.
function replaceMetaContent(html, anchorAttr, newContent) {
  const re = new RegExp(
    `(<meta\\s[^>]*${anchorAttr}[^>]*content=")[^"]*(")`,
    'i'
  );
  return html.replace(re, `$1${escapeHtml(newContent)}$2`);
}

function patchTemplate(template, article) {
  const slug       = article.slug;
  const canonical  = `${SITE_URL}/news/${slug}`;
  const rawTitle   = article.seo?.metaTitle || article.title || '';
  const pageTitle  = `${rawTitle} | Eat This Berlin`;
  const metaDesc   = article.seo?.metaDescription || article.excerpt || '';
  const rawOgImage = article.seo?.ogImageUrl || article.imageUrl || '';
  const ogImage    = rawOgImage
    ? `${rawOgImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/table.jpg`;
  const lang       = article.language || 'en';
  const locale     = lang === 'de' ? 'de_DE' : 'en_US';
  const jsonLd     = buildJsonLd(article, canonical, ogImage);

  let html = template;

  // <html lang="...">
  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${lang}"`);

  // <title>
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(pageTitle)}</title>`
  );

  // <meta name="description">
  html = replaceMetaContent(html, 'name="description"', metaDesc);

  // Canonical — swap the single-URL canonical for the article URL
  html = html.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${canonical}" />`
  );

  // OG + Twitter tags
  html = replaceMetaContent(html, 'property="og:type"',         'article');
  html = replaceMetaContent(html, 'property="og:title"',        pageTitle);
  html = replaceMetaContent(html, 'property="og:description"',  metaDesc);
  html = replaceMetaContent(html, 'property="og:url"',          canonical);
  html = replaceMetaContent(html, 'property="og:image"',        ogImage);
  html = replaceMetaContent(html, 'property="og:image:alt"',    rawTitle);
  html = replaceMetaContent(html, 'property="og:locale"',       locale);
  html = replaceMetaContent(html, 'name="twitter:title"',       pageTitle);
  html = replaceMetaContent(html, 'name="twitter:description"', metaDesc);
  html = replaceMetaContent(html, 'name="twitter:image"',       ogImage);

  // noindex override for drafts / hidden articles
  if (article.seo?.noIndex) {
    html = replaceMetaContent(html, 'name="robots"', 'noindex,nofollow');
  }

  // Inject article JSON-LD right before </head> (additive — keeps site Org/LocalBusiness LD)
  const articleLdTag = `    <script type="application/ld+json">${jsonLd}</script>\n  `;
  html = html.replace(/<\/head>/i, `${articleLdTag}</head>`);

  return html;
}

function cleanNewsDir(dir) {
  try {
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.html')) unlinkSync(join(dir, f));
    }
  } catch { /* dir may not exist yet */ }
}

function buildSitemap(articles) {
  const today = new Date().toISOString().slice(0, 10);
  const staticPages = [
    { loc: '/',           priority: '1.0', changefreq: 'weekly'  },
    { loc: '/about',      priority: '0.5', changefreq: 'monthly' },
    { loc: '/contact',    priority: '0.4', changefreq: 'monthly' },
    { loc: '/press',      priority: '0.4', changefreq: 'monthly' },
    { loc: '/impressum',  priority: '0.2', changefreq: 'yearly'  },
    { loc: '/datenschutz',priority: '0.2', changefreq: 'yearly'  },
    { loc: '/agb',        priority: '0.2', changefreq: 'yearly'  },
  ];

  const entries = [];

  for (const p of staticPages) {
    entries.push(
      `  <url>\n` +
      `    <loc>${SITE_URL}${p.loc}</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>${p.changefreq}</changefreq>\n` +
      `    <priority>${p.priority}</priority>\n` +
      `  </url>`
    );
  }

  for (const a of articles) {
    if (!a.slug || a.seo?.noIndex) continue;
    const slug = a.slug.replace(/[^a-z0-9-_]/gi, '-');
    const lastmod = (a.date || today).slice(0, 10);
    const imgBlock = a.imageUrl
      ? `    <image:image>\n` +
        `      <image:loc>${a.imageUrl}?w=1200&amp;auto=format</image:loc>\n` +
        `      <image:title>${escapeHtml(a.title || '')}</image:title>\n` +
        `    </image:image>\n`
      : '';
    entries.push(
      `  <url>\n` +
      `    <loc>${SITE_URL}/news/${slug}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>0.7</priority>\n` +
      imgBlock +
      `  </url>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n` +
    entries.join('\n\n') +
    `\n\n</urlset>\n`;
}

async function main() {
  console.log('Loading index.html template…');
  const template = readFileSync(join(PROJECT_ROOT, 'index.html'), 'utf-8');

  console.log('Fetching articles from Sanity…');
  const articles = await fetchArticles();
  console.log(`Found ${articles.length} articles`);

  const newsDir = join(PROJECT_ROOT, 'news');
  mkdirSync(newsDir, { recursive: true });
  cleanNewsDir(newsDir);

  let generated = 0;
  const seen = new Set();
  for (const article of articles) {
    if (!article.slug) {
      console.warn(`  ⚠ Skipping article without slug: "${article.title}"`);
      continue;
    }
    const safeSlug = article.slug.replace(/[^a-z0-9-_]/gi, '-');
    if (seen.has(safeSlug)) continue;
    seen.add(safeSlug);

    const html = patchTemplate(template, { ...article, slug: safeSlug });
    writeFileSync(join(newsDir, `${safeSlug}.html`), html, 'utf-8');
    console.log(`  ✓ /news/${safeSlug}.html`);
    generated++;
  }

  console.log(`\nDone. Generated ${generated} article shells → /news/`);

  // Sitemap — regenerated every run so added/removed articles stay in sync
  const sitemap = buildSitemap(articles.filter(a => a.slug));
  writeFileSync(join(PROJECT_ROOT, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`Wrote sitemap.xml with ${articles.length} article entries`);
}

main().catch(err => {
  console.error('Error generating articles:', err);
  process.exit(1);
});
