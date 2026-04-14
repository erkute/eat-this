// scripts/generate-articles.js
// Fetches all published news articles from Sanity and generates
// /news/[slug].html static pages with full SEO metadata.

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const SANITY_PROJECT = 'ehwjnjr2';
const SANITY_DATASET = 'production';
const SANITY_API_VER = '2024-01-01';
const SANITY_CDN = `https://${SANITY_PROJECT}.apicdn.sanity.io/v${SANITY_API_VER}/data/query/${SANITY_DATASET}`;

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
    content,
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

function portableTextToHtml(blocks) {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => {
    // Inline image block
    if (block._type === 'image') {
      const src = block.assetUrl ? `${block.assetUrl}?w=900&auto=format&q=85` : '';
      if (!src) return '';
      const alt = escapeHtml(block.alt || '');
      const caption = block.caption
        ? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
        : '';
      return `<figure class="news-article-inline-img"><img src="${src}" alt="${alt}" loading="lazy">${caption}</figure>`;
    }

    // Text block
    if (block._type !== 'block' || !Array.isArray(block.children)) return '';

    const text = block.children.map(span => {
      let t = escapeHtml(span.text || '');
      const marks = span.marks ?? [];
      if (marks.includes('strong')) t = `<strong>${t}</strong>`;
      if (marks.includes('em')) t = `<em>${t}</em>`;
      if (marks.includes('underline')) t = `<u>${t}</u>`;
      return t;
    }).join('');

    if (!text.trim()) return '';

    const style = block.style || 'normal';
    if (style === 'h2') return `<h2>${text}</h2>`;
    if (style === 'h3') return `<h3>${text}</h3>`;
    if (style === 'blockquote') return `<blockquote>${text}</blockquote>`;
    return `<p>${text}</p>`;
  }).filter(Boolean).join('\n');
}

function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function generateRelatedHtml(related) {
  if (!related || !related.length) return '';
  const cards = related.map(r => {
    const slug = (r.slug || '').replace(/[^a-z0-9-_]/gi, '-');
    const imgSrc = r.imageUrl ? `${r.imageUrl}?w=600&auto=format&q=80` : '';
    const imgHtml = imgSrc
      ? `<div class="news-rec-img"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(r.alt || r.title)}" loading="lazy"></div>`
      : '';
    return `<div class="news-rec-card">
      <a href="/news/${escapeHtml(slug)}">
        ${imgHtml}
        <div class="news-rec-body">
          <span class="news-rec-category">${escapeHtml(r.categoryLabel || r.category || '')}</span>
          <h3 class="news-rec-headline">${escapeHtml(r.title || '')}</h3>
        </div>
      </a>
    </div>`;
  }).join('');
  return `<section class="news-article-more" aria-label="More articles">
    <div class="news-article-more-inner">
      <p class="news-article-more-label">More to read</p>
      <div class="news-article-more-grid">${cards}</div>
    </div>
  </section>`;
}

function generateArticleHtml(article, related = []) {
  const slug        = article.slug;
  const canonical   = `https://www.eatthisdot.com/news/${encodeURIComponent(slug)}`;
  const metaTitle   = article.seo?.metaTitle   || article.title || '';
  const metaDesc    = article.seo?.metaDescription || article.excerpt || '';
  const rawOgImage  = article.seo?.ogImageUrl  || article.imageUrl  || '';
  const ogImage     = rawOgImage ? `${rawOgImage}?w=1200&h=630&fit=crop&auto=format` : '';
  const heroImage   = article.imageUrl ? `${article.imageUrl}?w=1400&auto=format&q=85` : '';
  const noIndexTag  = article.seo?.noIndex
    ? '<meta name="robots" content="noindex,nofollow">'
    : '';
  const contentHtml    = portableTextToHtml(article.content);
  const relatedHtml    = generateRelatedHtml(related);
  const dateFormatted  = formatDate(article.date, article.language);
  const categoryLabel  = escapeHtml(article.categoryLabel || article.category || '');
  const lang           = article.language || 'en';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': metaTitle,
    'description': metaDesc,
    'image': ogImage || heroImage,
    'datePublished': article.date || '',
    'publisher': {
      '@type': 'Organization',
      'name': 'Eat This Berlin',
      'url': 'https://www.eatthisdot.com',
    },
  }).replace(/<\//g, '<\\/');

  const heroHtml = heroImage
    ? `<div class="news-article-hero">
        <img src="${heroImage}" alt="${escapeHtml(article.alt || article.title)}" loading="eager">
      </div>`
    : '';

  const ogImageMeta = ogImage
    ? `<meta property="og:image" content="${ogImage}">
  <meta name="twitter:image" content="${ogImage}">`
    : '';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(metaTitle)} | Eat This Berlin</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${canonical}">
  ${noIndexTag}

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(metaTitle)}">
  <meta property="og:description" content="${escapeHtml(metaDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Eat This Berlin">
  ${ogImageMeta}

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(metaTitle)}">
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}">

  <script type="application/ld+json">${jsonLd}</script>

  <link rel="stylesheet" href="/css/style.css">
  <link rel="icon" href="/favicon.ico">
</head>
<body class="article-standalone">

  <header class="article-page-header">
    <a href="/" class="article-page-logo" aria-label="Eat This home">
      <img src="/pics/logo.webp" alt="Eat This Berlin" height="32">
    </a>
    <a href="/#news" class="article-page-back">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Food News
    </a>
  </header>

  <main class="article-page-main">
    <article class="news-article">
      ${heroHtml}
      <div class="news-article-body">
        <div class="news-article-meta">
          <span class="news-modal-category">${categoryLabel}</span>
          <span class="news-modal-meta-dot" aria-hidden="true"></span>
          <time class="news-modal-date" datetime="${escapeHtml(article.date || '')}">${dateFormatted}</time>
        </div>
        <h1 class="news-modal-title">${escapeHtml(article.title)}</h1>
        <div class="news-article-share">
          <button class="news-share-btn" data-share-url="${canonical}" data-share-title="${escapeHtml(metaTitle)}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <a class="news-share-btn" href="https://wa.me/?text=${encodeURIComponent(metaTitle + ' ' + canonical)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a class="news-share-btn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(metaTitle)}&url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener noreferrer">Twitter / X</a>
        </div>
        <div class="news-article-content">${contentHtml}</div>
      </div>
    </article>
  </main>

  ${relatedHtml}

  <footer class="site-footer article-standalone-footer" role="contentinfo">
    <a href="/" class="site-footer-logo-link" aria-label="Eat This home">
      <img src="/pics/logo2.webp" alt="EAT THIS" class="site-footer-logo-img">
    </a>
    <nav class="site-footer-links" aria-label="Footer navigation">
      <a href="/#about" class="site-footer-link">About</a>
      <a href="/#contact" class="site-footer-link">Contact</a>
      <a href="/#press" class="site-footer-link">Press</a>
      <span class="site-footer-divider" aria-hidden="true">|</span>
      <a href="/#impressum" class="site-footer-link">Impressum</a>
      <a href="/#datenschutz" class="site-footer-link">Datenschutz</a>
      <a href="/#agb" class="site-footer-link">AGB</a>
    </nav>
    <p class="site-footer-copy">&copy; 2026 Eat This. All rights reserved.</p>
  </footer>

  <script>
    (function() {
      var btn = document.querySelector('.news-share-btn[data-share-url]');
      if (btn) btn.addEventListener('click', function() {
        var u = this.dataset.shareUrl, t = this.dataset.shareTitle;
        if (navigator.share) navigator.share({ title: t, url: u });
        else navigator.clipboard.writeText(u);
      });
    })();
  </script>
</body>
</html>`;
}

async function main() {
  console.log('Fetching articles from Sanity…');
  const articles = await fetchArticles();
  console.log(`Found ${articles.length} articles`);

  const newsDir = join(PROJECT_ROOT, 'news');
  mkdirSync(newsDir, { recursive: true });

  let generated = 0;
  for (const article of articles) {
    if (!article.slug) {
      console.warn(`  ⚠ Skipping article without slug: "${article.title}"`);
      continue;
    }
    const safeSlug = article.slug.replace(/[^a-z0-9-_]/gi, '-');
    const related = articles
      .filter(a => a.slug !== article.slug)
      .slice(0, 3);
    const html = generateArticleHtml({ ...article, slug: safeSlug }, related);
    writeFileSync(join(newsDir, `${safeSlug}.html`), html, 'utf-8');
    console.log(`  ✓ /news/${safeSlug}.html`);
    generated++;
  }

  console.log(`\nDone. Generated ${generated} article pages → /news/`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
