# Start Page Scroll Sections – Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Overview

Extend the existing Start Page (`data-page="start"`) with scrollable content sections below the hero. The hero slideshow (EAT THIS logo, background images) remains unchanged. Users can scroll down to read about the brand, its philosophy, and what's coming next.

---

## Design Direction

**Style:** Editorial, alternating text/image layout. White background (`#fff`) and off-white (`#fafafa`) sections alternating. Black text. Orange (`#FF3B00`) as section label accent. Consistent with the existing site design language (Inter font, tight letter-spacing, bold headings).

**Image placeholders:** Grey boxes (`background: #f5f5f5`, `border: 1px solid #e8e8e8`) with the text "Bild". Real images will be supplied later and dropped in by replacing the placeholder elements.

---

## Critical CSS Prerequisites

Before adding the new sections, one existing rule must be changed in `css/style.css`:

1. **Remove `overflow: hidden`** from `.app-page[data-page="start"]` in both the mobile (`max-width: 767px`) and desktop (`min-width: 768px`) media query blocks. Simply delete those two `overflow: hidden` lines — the base `.app-page` rule already provides `overflow-y: auto`, so no replacement value is needed.

---

## Sections (in order)

### 0. Scroll Indicator
A thin centered vertical line (1px, 28px tall, `background: #ccc`) above a small "SCROLL" label (`font-size: 9px`, `letter-spacing: 2px`, `text-transform: uppercase`, `color: #aaa`). Sits between the hero and the first content section.

- **Mobile:** visible
- **Desktop (≥ 768px):** hidden via `display: none`

### 1. Intro — "One dish. That's it."
- **Background:** `#fff`
- **Layout:** `.start-editorial-row` — text left, image placeholder right
- **Label:** Black pill — "Eat This"
- **Heading:** "One dish. That's it."
- **Body:** "We don't do lists. We find the one thing you have to order — and we mean it."
- **Image:** `.start-img-placeholder.tall` (height: 220px)

### 2. About
- **Background:** `#fafafa`
- **Layout:** `.start-editorial-row.start-editorial-row--reverse` — image left, text right
- **Label:** Black pill — "About"
- **Heading:** "We started in 2024."
- **Body:**
  > One rule: one dish per restaurant. No exceptions.
  > A small team based in Berlin, eating our way through the city — from hidden ramen bars to Michelin stars. We visit every place ourselves. We talk to the chefs. We go back.
  > If we recommend it, we'd order it again.
- **Image:** `.start-img-placeholder.tall` (height: 220px)

### 3. Philosophie
- **Background:** `#fff`
- **Layout:** Full-width image at top, then a `.start-philo-list` of 3 numbered items below
- **Label:** Black pill — "Philosophie" (above the image)
- **Image:** `.start-img-placeholder.wide` (height: 200px, full container width)
- **Numbered items** (`.start-philo-list`):
  - Each item: `.start-philo-item` — flex row, number (`div.start-philo-num`) left, text block right
  - Number style: `font-size: 0.75rem`, `font-weight: 700`, `color: #FF3B00`, min-width: 24px
  - Title: `.start-philo-title` — `font-size: 1rem`, `font-weight: 800`, `letter-spacing: -0.02em`
  - Body: `.start-philo-text` — `font-size: 0.875rem`, `line-height: 1.6`, `color: #555`
  - Gap between items: `28px`
  - **Desktop:** single column (max-width 560px, centered) — the numbered list does not go multi-column

  Items:
  - 01 · **One dish. That's the point.** — "Anyone can write a list. We find the thing worth ordering."
  - 02 · **We show up.** — "We eat there ourselves. We go back. We talk to the chef. Then we make a call."
  - 03 · **We don't take money for recommendations.** — "Simple as that."

### 4. How We Choose
- **Background:** `#fafafa`
- **Layout:** `.start-editorial-row` — text left, image right (same as section 1)
- **Label:** Black pill — "How we choose"
- **Heading:** "Most reviews happen once. Ours don't."
- **Body:**
  > We visit every place more than once, talk to the people behind it, and order everything that looks worth ordering. Then we pick one thing.
  > That's how we choose.
- **Image:** `.start-img-placeholder.tall` (height: 220px)

### 5. What's Next
- **Background:** `#fff`
- **Layout:** Single column, centered
- **Label:** Black pill — "What's next"
- **Heading:** "Berlin is where we started."
- **Body (above image):** "It won't be where we stop."
- **Image:** `.start-img-placeholder.medium` (height: 160px, full container width) — placed after body text
- **Cities line:** `font-size: 1.05rem`, `font-weight: 700`, `color: #000` — "Istanbul, Amsterdam, Paris — we're working on it."
- **Closing line:** `font-size: 1rem`, `color: #555` — "Same rules, different cities."

---

## CSS Definitions

### New classes to add to `css/style.css`

```css
/* Scroll hint */
.start-scroll-hint { text-align: center; padding: 16px 0; border-bottom: 1px solid #e8e8e8; }
.start-scroll-hint-line { width: 1px; height: 28px; background: #ccc; margin: 0 auto 8px; }
.start-scroll-hint-text { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #aaa; }
@media (min-width: 768px) { .start-scroll-hint { display: none; } }

/* Section wrapper */
.start-scroll-content { background: #fff; }
.start-section { padding: 52px 24px; border-bottom: 1px solid #e8e8e8; }
.start-section:last-child { border-bottom: none; }
.start-section--alt { background: #fafafa; }
@media (min-width: 768px) {
  .start-section { padding: 72px 48px; max-width: 900px; margin: 0 auto; }
}

/* Label (black pill) */
.start-section-label {
  display: inline-block; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.15em;
  color: #fff; background: #000;
  padding: 4px 12px; border-radius: 100px;
  margin-bottom: 20px;
}

/* Heading */
.start-section-title {
  font-size: clamp(1.6rem, 4vw, 2.8rem);
  font-weight: 900; letter-spacing: -0.04em; line-height: 1.05;
  margin-bottom: 16px;
}

/* Body text */
.start-section-body {
  font-size: 1rem; line-height: 1.75; color: #555;
}

/* Editorial row (two-column: text + image) */
.start-editorial-row { display: flex; flex-direction: column; gap: 24px; }
@media (min-width: 768px) {
  .start-editorial-row { flex-direction: row; align-items: flex-start; gap: 40px; }
  .start-editorial-row .start-editorial-text { flex: 1; }
  .start-editorial-row--reverse { flex-direction: row-reverse; }
}

/* Image placeholders */
.start-img-placeholder {
  width: 100%; background: #f5f5f5; border: 1px solid #e8e8e8;
  border-radius: 2px; display: flex; align-items: center;
  justify-content: center; color: #bbb;
  font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
  flex-shrink: 0;
}
.start-img-placeholder.tall  { height: 220px; }
.start-img-placeholder.medium { height: 160px; }
.start-img-placeholder.wide  { height: 200px; }
@media (min-width: 768px) {
  .start-editorial-row .start-img-placeholder.tall { width: 280px; }
}

/* Philosophie list */
.start-philo-list { display: flex; flex-direction: column; gap: 28px; margin-top: 32px; }
@media (min-width: 768px) {
  .start-philo-list { max-width: 560px; margin-left: auto; margin-right: auto; }
}
.start-philo-item { display: flex; gap: 16px; align-items: flex-start; }
.start-philo-num { font-size: 0.75rem; font-weight: 700; color: #FF3B00; flex-shrink: 0; min-width: 24px; padding-top: 2px; }
.start-philo-title { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; }
.start-philo-text { font-size: 0.875rem; line-height: 1.6; color: #555; }

/* What's next cities */
.start-cities { font-size: 1.05rem; font-weight: 700; color: #000; margin-top: 20px; margin-bottom: 8px; }
```

---

## Files to Modify

| File | Change |
|------|--------|
| `css/style.css` | (1) Remove the two `overflow: hidden` lines from `.app-page[data-page="start"]` inside the mobile and desktop media query blocks. (2) Add all new CSS classes listed above. |
| `index.html` | Add scroll sections HTML inside the `data-page="start"` div, directly after the closing `</header>` of `.hero`. |

No JavaScript changes needed.

---

## Out of Scope

- Replacing image placeholders (user will supply images later)
- Animation/reveal effects on scroll (can be added later)
- Any changes to the existing hero, navbar, or footer
