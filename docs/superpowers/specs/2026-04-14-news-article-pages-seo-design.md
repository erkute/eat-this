# News Article Pages — SEO & Static Generation

**Date:** 2026-04-14  
**Approach:** Option A — Static HTML generation (SSG) via build script

---

## 1. Goal

Replace the news article modal overlay with dedicated, statically generated HTML pages at `/news/[slug]`. Each page contains fully server-rendered content and complete SEO metadata in the HTML source, enabling Google indexing, social sharing previews (WhatsApp, Facebook, Twitter), and shareable article URLs.

---

## 2. Sanity Schema Changes (`studio/schemaTypes/newsArticle.js`)

### 2a. SEO Object

Add a top-level `seo` object field with the following child fields:

| Field | Type | Description | Fallback if empty |
|---|---|---|---|
| `metaTitle` | `string` | Browser tab title / Google headline | Article `title` |
| `metaDescription` | `text` | Google search snippet | Article `excerpt` |
| `ogImage` | `image` | Social sharing image (ideal: 1200×630px) | Article `image` |
| `noIndex` | `boolean` | Exclude from search engines | `false` |

All fields are optional. The build script applies fallback values automatically.

Helper text in Sanity UI:
- `metaTitle`: "Leave empty to use article title (max 60 characters)"
- `metaDescription`: "Leave empty to use article excerpt (max 160 characters)"
- `ogImage`: "Leave empty to use hero image. Ideal: 1200×630px"

### 2b. Inline Images in Content Body

Extend the `content` field's `of` array with an `image` block type:

```js
{
  type: 'image',
  options: { hotspot: true },
  fields: [
    { name: 'alt', title: 'Alt Text', type: 'string' },
    { name: 'caption', title: 'Caption', type: 'string' },
  ],
}
```

This allows editors to insert images between text paragraphs in the Portable Text editor.

---

## 3. Build Script (`scripts/generate-articles.js`)

### Runtime
Node.js ≥ 18 (native `fetch`, no additional dependencies required). ES module syntax (`"type": "module"` in package.json).

### GROQ Query

Fetches all published articles in both languages:

```groq
*[_type == "newsArticle"] | order(date desc) {
  "slug": slug.current,
  title,
  language,
  category,
  categoryLabel,
  date,
  "imageUrl": image.asset->url,
  "imageRef": image.asset._ref,
  alt,
  excerpt,
  content[] {
    ...,
    _type == "image" => {
      "assetRef": asset._ref,
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
}
```

### Fallback Logic

```
resolvedMetaTitle      = seo.metaTitle      || article.title
resolvedMetaDesc       = seo.metaDescription || article.excerpt || ''
resolvedOgImage        = seo.ogImageUrl      || article.imageUrl + '?w=1200&auto=format'
resolvedCanonical      = 'https://www.eatthisdot.com/news/' + article.slug
```

### Output

One file per article: `/news/[slug].html` in the project root.

The `/news/` directory is excluded from git (add to `.gitignore`) but included in Firebase Hosting deploys (not in the `ignore` list in `firebase.json`).

### Article HTML Template

Each generated file is a full HTML document with:

**`<head>`:**
```html
<title>{metaTitle} | Eat This Berlin</title>
<meta name="description" content="{metaDescription}">
<link rel="canonical" href="{canonical}">
<!-- if noIndex: -->
<meta name="robots" content="noindex,nofollow">

<!-- Open Graph (social sharing) -->
<meta property="og:type" content="article">
<meta property="og:title" content="{metaTitle}">
<meta property="og:description" content="{metaDescription}">
<meta property="og:image" content="{ogImage}?w=1200&h=630&fit=crop&auto=format">
<meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="Eat This Berlin">

<!-- Twitter / X Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{metaTitle}">
<meta name="twitter:description" content="{metaDescription}">
<meta name="twitter:image" content="{ogImage}?w=1200&h=630&fit=crop&auto=format">

<!-- JSON-LD Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "description": "{metaDescription}",
  "image": "{ogImage}",
  "datePublished": "{date}",
  "publisher": {
    "@type": "Organization",
    "name": "Eat This Berlin",
    "url": "https://www.eatthisdot.com"
  }
}
</script>

<!-- Shared app CSS -->
<link rel="stylesheet" href="/css/style.css">
```

**`<body>` structure:**
```
.article-page-header (logo + back link to /#news)
article.news-article
  .news-article-hero (hero image)
  .news-article-body
    .news-article-meta (category · date)
    h1.news-modal-title
    .news-article-content (rendered Portable Text HTML)
    .article-share (share buttons: copy link, WhatsApp, Twitter)
.site-footer
```

Reuses existing CSS classes from the current modal design (same visual appearance: Anton headline, drop cap, reading typography, orange accents).

### Portable Text → HTML (in build script)

A self-contained converter in the script (no npm packages needed) handles:

| Block type | Output |
|---|---|
| `normal` paragraph | `<p>…</p>` |
| `h2` | `<h2>…</h2>` |
| `h3` | `<h3>…</h3>` |
| `blockquote` | `<blockquote>…</blockquote>` |
| `strong` mark | `<strong>…</strong>` |
| `em` mark | `<em>…</em>` |
| `underline` mark | `<u>…</u>` |
| `image` block | `<figure><img src="…?w=900&auto=format" alt="…"><figcaption>…</figcaption></figure>` |

### npm Script

Add to `package.json`:
```json
"build:articles": "node scripts/generate-articles.js"
```

---

## 4. Firebase Hosting Config Changes (`firebase.json`)

Add `"cleanUrls": true` to the `hosting` object so `/news/article-slug.html` is served at `/news/article-slug` without the `.html` extension.

The `/news/` directory is already **not** in the `ignore` list, so generated files are deployed automatically.

---

## 5. App Integration

### 5a. News Card Links (`js/i18n.js`)

In `buildNewsCardHtml()`, replace the `<a href="#">` with `<a href="/news/${slug}">` when a slug is present. This makes cards into standard browser links — no modal trigger needed.

```js
const href = a.id ? `/news/${a.id}` : '#';
// <a href="${href}"> instead of <a href="#">
```

### 5b. Modal Removal

The `#newsModal` overlay and its JS (`openNewsModal`, `closeNewsModal`, `bindNewsCards`) can be removed once all articles have slugs. Until then, keep the modal as fallback for slug-less cards (`href="#"` triggers the old modal behaviour).

### 5c. CMS Query Update (`js/cms.js`)

The `fetchNews()` query already fetches `"id": slug.current`. No change needed to the card rendering pipeline — slugs are already available in `buildNewsCardHtml()`.

---

## 6. Deploy Workflow

```bash
npm run build:articles   # generates /news/*.html from Sanity data
firebase deploy --only hosting
```

This is run manually for now. Automation via Sanity webhook is out of scope for this spec and can be added as a follow-up.

---

## 7. Out of Scope

- Sanity webhook → automatic redeploy (follow-up task)
- Pagination or filtering on the article page
- Comments or user-generated content
- Article translation auto-generation (language field already exists, both languages are generated if articles exist)
