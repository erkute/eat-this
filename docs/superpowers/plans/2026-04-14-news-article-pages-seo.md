# News Article Pages — SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the news article modal overlay with statically generated HTML pages at `/news/[slug]`, each containing server-rendered content and full SEO metadata.

**Architecture:** A Node.js build script fetches all published articles from Sanity and generates one `/news/[slug].html` file per article. Each file contains complete meta tags, og tags, JSON-LD structured data, and rendered Portable Text. Firebase Hosting serves these as clean URLs (`/news/slug`). News cards in the SPA link directly to these pages via `<a href="/news/slug">`.

**Tech Stack:** Node.js ≥ 18 (native fetch), Sanity GROQ API, Firebase Hosting cleanUrls, Playwright for e2e verification.

**Note:** The service worker uses stale-while-revalidate (not a SPA navigation fallback), so it correctly fetches real article HTML on first visit — no SW changes needed.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `studio/schemaTypes/newsArticle.js` | Modify | Add SEO object field + inline image block type |
| `scripts/generate-articles.js` | Create | Fetch all articles from Sanity, render HTML, write files |
| `firebase.json` | Modify | Add `"cleanUrls": true` to hosting config |
| `.gitignore` | Modify | Exclude generated `/news/` directory |
| `package.json` | Modify | Add `"build:articles"` npm script |
| `css/style.css` | Modify | Add standalone article page styles + inline image styles |
| `js/i18n.js` | Modify | Update `buildNewsCardHtml()` to link to `/news/[slug]` |

---

## Task 1: Sanity Schema — SEO Object + Inline Images

**Files:**
- Modify: `studio/schemaTypes/newsArticle.js`

- [ ] **Step 1: Replace the content of `studio/schemaTypes/newsArticle.js`**

```js
export default {
  name: 'newsArticle',
  title: 'News Article',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
    },
    {
      name: 'language',
      title: 'Language',
      type: 'string',
      options: { list: ['en', 'de'], layout: 'radio' },
      initialValue: 'en',
      validation: Rule => Rule.required(),
    },
    {
      name: 'category',
      title: 'Category (internal)',
      type: 'string',
      options: { list: ['guides', 'openings', 'culture'], layout: 'radio' },
      validation: Rule => Rule.required(),
    },
    {
      name: 'categoryLabel',
      title: 'Category Label (displayed)',
      type: 'string',
      description: 'E.g. "Guides", "Openings", "Culture"',
    },
    {
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: Rule => Rule.required(),
    },
    {
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'alt',
      title: 'Hero Image Alt Text',
      type: 'string',
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
    },
    {
      name: 'content',
      title: 'Full Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Underline', value: 'underline' },
            ],
          },
        },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Describe the image for screen readers and SEO',
            },
            {
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional caption shown below the image',
            },
          ],
        },
      ],
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        {
          name: 'metaTitle',
          title: 'Meta Title',
          type: 'string',
          description: 'Leave empty to use article title. Max 60 characters.',
          validation: Rule => Rule.max(60),
        },
        {
          name: 'metaDescription',
          title: 'Meta Description',
          type: 'text',
          rows: 3,
          description: 'Leave empty to use excerpt. Max 160 characters.',
          validation: Rule => Rule.max(160),
        },
        {
          name: 'ogImage',
          title: 'Social Sharing Image',
          type: 'image',
          description: 'Leave empty to use hero image. Ideal: 1200×630px.',
        },
        {
          name: 'noIndex',
          title: 'Hide from search engines',
          type: 'boolean',
          initialValue: false,
          description: 'Check to prevent Google from indexing this article.',
        },
      ],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'categoryLabel', media: 'image' },
  },
}
```

- [ ] **Step 2: Deploy the schema to Sanity Studio**

```bash
cd studio
npx sanity deploy
```

Expected output: `Deploy successful` (or similar — Studio reloads with new fields).

- [ ] **Step 3: Verify in Sanity Studio**

Open the Sanity Studio for the project. Open any news article. Confirm:
- An "SEO" section appears at the bottom with metaTitle, metaDescription, ogImage, noIndex fields
- The "Full Content" editor shows an "Insert image" option in the block toolbar

- [ ] **Step 4: Commit**

```bash
cd ..
git add studio/schemaTypes/newsArticle.js
git commit -m "feat(schema): add SEO object and inline images to newsArticle"
```

---

## Task 2: Project Config — .gitignore, firebase.json, package.json

**Files:**
- Modify: `.gitignore`
- Modify: `firebase.json`
- Modify: `package.json`

- [ ] **Step 1: Add `/news/` to `.gitignore`**

Open `.gitignore` and add these lines at the end:

```
# Generated article pages (built by scripts/generate-articles.js, deployed via firebase deploy)
/news/
```

- [ ] **Step 2: Add `cleanUrls` to `firebase.json` hosting config**

In `firebase.json`, inside the `"hosting"` object, add `"cleanUrls": true` after the `"public"` line:

```json
"hosting": {
  "public": ".",
  "cleanUrls": true,
  "ignore": [
```

- [ ] **Step 3: Add `build:articles` script to `package.json`**

In `package.json`, add to the `"scripts"` object:

```json
"build:articles": "node scripts/generate-articles.js"
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore firebase.json package.json
git commit -m "feat(config): cleanUrls for article pages, gitignore /news/, build:articles script"
```

---

## Task 3: Build Script — Create `scripts/generate-articles.js`

**Files:**
- Create: `scripts/generate-articles.js`

- [ ] **Step 1: Create the file with Sanity config and fetch function**

Create `scripts/generate-articles.js`:

```js
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
  const query = `*[_type == "newsArticle"] | order(date desc) {
    "slug": slug.current,
    title,
    language,
    category,
    categoryLabel,
    date,
    "imageUrl": image.asset->url,
    alt,
    excerpt,
    content[] {
      ...,
      _type == "image" => {
        "assetUrl": asset->url,
        alt,
        caption
      }
    },
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
```

- [ ] **Step 2: Add the HTML-escaping and Portable Text converter**

Append to the same file:

```js
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function portableTextToHtml(blocks) {
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}
```

- [ ] **Step 3: Add the HTML template generator**

Append to the same file:

```js
function generateArticleHtml(article) {
  const slug        = article.slug;
  const canonical   = `https://www.eatthisdot.com/news/${slug}`;
  const metaTitle   = article.seo?.metaTitle   || article.title || '';
  const metaDesc    = article.seo?.metaDescription || article.excerpt || '';
  const rawOgImage  = article.seo?.ogImageUrl  || article.imageUrl  || '';
  const ogImage     = rawOgImage ? `${rawOgImage}?w=1200&h=630&fit=crop&auto=format` : '';
  const heroImage   = article.imageUrl ? `${article.imageUrl}?w=1400&auto=format&q=85` : '';
  const noIndexTag  = article.seo?.noIndex
    ? '<meta name="robots" content="noindex,nofollow">'
    : '';
  const contentHtml    = portableTextToHtml(article.content);
  const dateFormatted  = formatDate(article.date);
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
  });

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
          <button class="news-share-btn" onclick="(function(){ const u='${canonical}'; if(navigator.share){navigator.share({title:'${escapeHtml(metaTitle)}',url:u})}else{navigator.clipboard.writeText(u)} })()">
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

</body>
</html>`;
}
```

- [ ] **Step 4: Add the `main()` function**

Append to the same file:

```js
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
    const html = generateArticleHtml(article);
    writeFileSync(join(newsDir, `${article.slug}.html`), html, 'utf-8');
    console.log(`  ✓ /news/${article.slug}.html`);
    generated++;
  }

  console.log(`\nDone. Generated ${generated} article pages → /news/`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

- [ ] **Step 5: Run the script and verify output**

```bash
npm run build:articles
```

Expected output:
```
Fetching articles from Sanity…
Found N articles
  ✓ /news/file-asto-brings-a-taste-of-athens-to-kreuzberg.html
  ✓ /news/the-bun-society-smashburger.html
  …
Done. Generated N article pages → /news/
```

Then verify one file looks correct:
```bash
cat "news/$(ls news/ | head -1)" | head -40
```

Should show a full HTML doc with `<title>`, `<meta name="description">`, og tags, and JSON-LD.

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-articles.js
git commit -m "feat: build script generates static /news/[slug].html pages from Sanity"
```

---

## Task 4: CSS — Standalone Article Page Styles

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Add standalone article page styles at the end of `css/style.css`**

Append the following block to the very end of `css/style.css`:

```css
/* ============================================
   STANDALONE ARTICLE PAGE
   ============================================ */

/* Reset body for article pages */
.article-standalone {
  margin: 0;
  padding: 0;
  background: var(--white);
  min-height: 100dvh;
}

/* Sticky top header with logo + back link */
.article-page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px;
  background: var(--white);
  border-bottom: 1px solid var(--gray-100);
}

.article-page-logo img {
  height: 32px;
  width: auto;
  display: block;
}

.article-page-back {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--black);
  text-decoration: none;
  transition: color 0.15s;
}

.article-page-back:hover { color: var(--orange); }

/* Article main wrapper */
.article-page-main {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 20px 80px;
}

/* Article element — override modal-specific positioning */
.article-standalone .news-article {
  position: static;
  overflow: visible;
  background: var(--white);
}

/* Hero image — full-bleed on mobile */
.article-standalone .news-article-hero {
  margin: 0 -20px;
  max-height: 420px;
  overflow: hidden;
}

.article-standalone .news-article-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Body padding */
.article-standalone .news-article-body {
  padding: 28px 0 0;
}

/* Inline images inserted between paragraphs */
.news-article-inline-img {
  margin: 32px -20px;
}

.news-article-inline-img img {
  width: 100%;
  height: auto;
  display: block;
}

.news-article-inline-img figcaption {
  padding: 8px 20px 0;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--gray-400, #999);
  letter-spacing: 0.04em;
}

/* Footer anchor links (not JS-driven buttons) */
.article-standalone-footer .site-footer-link {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font: inherit;
  padding: 0;
  text-decoration: none;
}

.article-standalone-footer .site-footer-link:hover {
  text-decoration: underline;
}

/* ── Desktop overrides ── */
@media (min-width: 768px) {
  .article-page-header {
    padding: 0 48px;
  }

  .article-page-main {
    padding: 0 48px 120px;
    max-width: 860px;
  }

  .article-standalone .news-article-hero {
    margin: 32px 0 0;
    max-height: 520px;
    border-radius: 2px;
    overflow: hidden;
  }

  .article-standalone .news-article-body {
    padding: 40px 0 0;
  }

  .news-article-inline-img {
    margin: 40px 0;
    border-radius: 2px;
    overflow: hidden;
  }

  .news-article-inline-img figcaption {
    padding: 10px 0 0;
  }
}
```

- [ ] **Step 2: Verify styles don't conflict with existing modal**

Search for any existing `.article-standalone` or `.article-page-header` classes:

```bash
grep -n "article-standalone\|article-page-header\|article-page-back\|article-page-main\|news-article-inline-img" css/style.css | head -20
```

Expected: only the lines you just added (at the end of the file). If any pre-existing rules appear before line ~3400, there's a conflict — rename the class in both the CSS and the build script template.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat(css): standalone article page styles and inline image figure styles"
```

---

## Task 5: App Integration — Update News Card Links

**Files:**
- Modify: `js/i18n.js`

- [ ] **Step 1: Find `buildNewsCardHtml` in `js/i18n.js`**

```bash
grep -n "buildNewsCardHtml\|href=\"#\"" js/i18n.js | head -20
```

Note the line numbers of the two `<a href="#">` occurrences (one in the hero card, one in the compact card).

- [ ] **Step 2: Update the hero card `<a>` to use the article URL**

Find the hero card block (the `if (i === 0)` branch). Change:
```js
`<a href="#">`,
```
to:
```js
`<a href="${a.id ? `/news/${a.id}` : '#'}">`,
```

- [ ] **Step 3: Update the compact card `<a>` to use the article URL**

Find the compact card block. Change:
```js
`<a href="#">`,
```
to:
```js
`<a href="${a.id ? `/news/${a.id}` : '#'}">`,
```

- [ ] **Step 4: Verify the function still builds valid HTML**

Open the local dev server and navigate to the news section. Right-click a news card → "Inspect Element". Verify the `<a>` tag now has `href="/news/your-article-slug"` instead of `href="#"`.

Also verify that clicking a card navigates to `/news/slug` (the generated article page) instead of opening the modal.

- [ ] **Step 5: Commit**

```bash
git add js/i18n.js
git commit -m "feat(news): link cards to /news/[slug] static article pages"
```

---

## Task 6: End-to-End Test — Playwright

**Files:**
- Modify: `tests/` (add a test for article pages)

- [ ] **Step 1: Find the existing Playwright test directory**

```bash
ls tests/
```

Note the naming convention used (e.g., `navigation.spec.js`).

- [ ] **Step 2: Create `tests/article-pages.spec.js`**

```js
import { test, expect } from '@playwright/test';
import { readdirSync } from 'fs';
import { join } from 'path';

// Pick the first generated article slug for testing
const newsDir = join(process.cwd(), 'news');
const slugs = readdirSync(newsDir)
  .filter(f => f.endsWith('.html'))
  .map(f => f.replace('.html', ''));

test.describe('Article pages', () => {
  test.skip(slugs.length === 0, 'No generated article pages found — run npm run build:articles first');

  test('article page loads with correct title', async ({ page }) => {
    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // Page title contains "Eat This Berlin"
    await expect(page).toHaveTitle(/Eat This Berlin/);

    // Hero or article body is visible
    await expect(page.locator('.news-article')).toBeVisible();

    // Back link points to /#news
    const backLink = page.locator('.article-page-back');
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute('href', '/#news');
  });

  test('article page has SEO meta tags', async ({ page }) => {
    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    // canonical URL is set
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toContain(`/news/${slug}`);

    // og:title is set
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle.length).toBeGreaterThan(3);

    // JSON-LD is present
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    const parsed = JSON.parse(jsonLd);
    expect(parsed['@type']).toBe('Article');
    expect(parsed.headline).toBeTruthy();
  });

  test('back link returns to news section', async ({ page }) => {
    const slug = slugs[0];
    await page.goto(`/news/${slug}`);

    await page.locator('.article-page-back').click();

    // Should be on the main app at /#news
    await expect(page).toHaveURL(/#news/);
  });
});
```

- [ ] **Step 3: Run article page tests**

```bash
npm run build:articles
npx playwright test tests/article-pages.spec.js
```

Expected: 3 tests pass. If the back-link test fails on URL matching, adjust the regex to match your actual hash routing.

- [ ] **Step 4: Run the full test suite to check for regressions**

```bash
npm test
```

Expected: all pre-existing tests still pass (news card click behaviour may change — if existing tests click a card and expect a modal, update those expectations to check for navigation instead).

- [ ] **Step 5: Commit**

```bash
git add tests/article-pages.spec.js
git commit -m "test: Playwright tests for static article pages (SEO meta, back link)"
```

---

## Task 7: Deploy

- [ ] **Step 1: Generate all article pages**

```bash
npm run build:articles
```

Verify `/news/` directory contains `.html` files.

- [ ] **Step 2: Check one article file for correctness**

```bash
# Open a generated file and verify it has og:image, JSON-LD, and content
head -60 news/$(ls news/ | head -1)
```

Confirm:
- `<title>` matches article title + "| Eat This Berlin"
- `og:image` has a Sanity CDN URL with `?w=1200&h=630&fit=crop`
- `<script type="application/ld+json">` contains `"@type": "Article"`

- [ ] **Step 3: Deploy to production**

```bash
firebase deploy --only hosting
```

- [ ] **Step 4: Verify a live article page**

Open `https://www.eatthisdot.com/news/[any-slug]` in the browser. Confirm:
- Page renders correctly with article content
- Browser tab title is `[Article Title] | Eat This Berlin`
- Back link is visible and works

- [ ] **Step 5: Test social sharing preview**

Paste a live article URL into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and the [Twitter Card Validator](https://cards-dev.twitter.com/validator). Both should show the article title, description, and og:image.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: post-deploy cleanup"
```

---

## Self-Review Checklist

- **Spec § 2 (SEO object):** Covered in Task 1. All four fields (metaTitle, metaDescription, ogImage, noIndex) implemented with fallback descriptions. ✓
- **Spec § 2 (inline images):** Covered in Task 1. `image` block added to content array with alt + caption fields. ✓
- **Spec § 3 (build script):** Covered in Task 3. GROQ query includes SEO fields, ogImageUrl expansion, and inline image assetUrl. ✓
- **Spec § 3 (fallback logic):** In `generateArticleHtml()`: metaTitle → title, metaDesc → excerpt, ogImage → heroImage. ✓
- **Spec § 3 (Portable Text converter):** All block types handled: p, h2, h3, blockquote, strong, em, underline, image. ✓
- **Spec § 4 (firebase.json cleanUrls):** Covered in Task 2. ✓
- **Spec § 4 (.gitignore):** Covered in Task 2. ✓
- **Spec § 5 (card links):** Covered in Task 5. Both hero and compact cards updated. ✓
- **Spec § 5 (modal fallback):** Cards without slug fall back to `href="#"` which triggers existing modal. ✓
- **Type consistency:** `article.id` (the slug from CMS) used in `i18n.js` matches the field aliased as `"id": slug.current` in `cms.js fetchNews()`. ✓
- **Logo paths:** Using `/pics/logo.webp` and `/pics/logo2.webp` — matches `sw.js` PRECACHE_ASSETS. ✓
