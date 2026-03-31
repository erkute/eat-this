# Start Page Scroll Sections – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five scrollable content sections below the existing hero on the Start page, using real images from `pics/about/` and the provided brand copy.

**Architecture:** Pure HTML/CSS addition to a vanilla single-page app. No JavaScript changes. New sections live inside the existing `data-page="start"` div, directly after the hero `<header>`. Two CSS media-query overrides (`overflow: hidden`) must be removed first to allow scrolling.

**Tech Stack:** HTML5, CSS3 (no framework), images served as WebP

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `pics/about/*.jpg` | Convert → WebP | Consistent with rest of project |
| `css/style.css` | Modify lines 2673, 3353 | Remove `overflow: hidden` from start page |
| `css/style.css` | Append | New `.start-*` CSS classes |
| `index.html` | Modify line 316–317 | Insert scroll sections HTML after `</header>` |

---

## Task 1: Convert images to WebP

**Files:**
- Modify: `pics/about/*.jpg` → `pics/about/*.webp`

- [ ] **Step 1: Convert all JPGs in pics/about/ to WebP**

```bash
cd "pics/about"
for f in *.jpg; do
  sips -s format webp "$f" --out "${f%.jpg}.webp"
done
```

Expected: 7 `.webp` files appear alongside the originals.

- [ ] **Step 2: Remove the original JPGs**

```bash
rm pics/about/*.jpg
```

- [ ] **Step 3: Verify**

```bash
ls pics/about/
```

Expected: Only `.webp` files listed.

- [ ] **Step 4: Commit**

```bash
git add pics/about/
git commit -m "perf: convert about images to WebP"
```

---

## Task 2: Fix CSS overflow to allow scrolling

**Files:**
- Modify: `css/style.css` line 2673 (mobile media query)
- Modify: `css/style.css` line 3353 (desktop media query)

Both occurrences are inside `.app-page[data-page="start"] { overflow: hidden; }` blocks. Remove only the `overflow: hidden;` line from each — leave the `background: #1a1a1a;` line intact.

- [ ] **Step 1: Remove `overflow: hidden` at line 2673 (mobile)**

Find:
```css
  .app-page[data-page="start"] {
    overflow: hidden;
    background: #1a1a1a;
  }
```
(first occurrence, inside `max-width: 767px` block)

Replace with:
```css
  .app-page[data-page="start"] {
    background: #1a1a1a;
  }
```

- [ ] **Step 2: Remove `overflow: hidden` at line 3353 (desktop)**

Find:
```css
  .app-page[data-page="start"] {
    overflow: hidden;
    background: #1a1a1a;
  }
```
(second occurrence, inside `min-width: 768px` block)

Replace with:
```css
  .app-page[data-page="start"] {
    background: #1a1a1a;
  }
```

- [ ] **Step 3: Verify in browser**

Open the app → click "Start" tab. The hero should still show. If the page previously clipped, you should now be able to scroll (nothing to scroll yet, but no clipping either).

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "fix: allow scrolling on start page by removing overflow:hidden"
```

---

## Task 3: Add scroll section CSS

**Files:**
- Modify: `css/style.css` (append at end of file)

- [ ] **Step 1: Append all new CSS classes to the end of `css/style.css`**

```css
/* ============================================
   START PAGE – SCROLL SECTIONS
   ============================================ */

/* Scroll hint */
.start-scroll-hint {
  text-align: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--gray-100);
}
.start-scroll-hint-line {
  width: 1px;
  height: 28px;
  background: #ccc;
  margin: 0 auto 8px;
}
.start-scroll-hint-text {
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #aaa;
}
@media (min-width: 768px) {
  .start-scroll-hint { display: none; }
}

/* Section wrapper */
.start-scroll-content { background: var(--white); }

.start-section {
  padding: 52px 24px;
  border-bottom: 1px solid var(--gray-100);
}
.start-section:last-child { border-bottom: none; }
.start-section--alt { background: var(--gray-50); }

@media (min-width: 768px) {
  .start-section {
    padding: 72px 48px;
    max-width: 900px;
    margin: 0 auto;
  }
}

/* Section label (black pill) */
.start-section-label {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--white);
  background: var(--black);
  padding: 4px 12px;
  border-radius: 100px;
  margin-bottom: 20px;
}

/* Heading */
.start-section-title {
  font-size: clamp(1.6rem, 4vw, 2.8rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.05;
  margin-bottom: 16px;
}

/* Body text */
.start-section-body {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--gray-600);
}
.start-section-body p + p {
  margin-top: 1em;
}

/* Editorial two-column row */
.start-editorial-row {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.start-editorial-text { flex: 1; }

@media (min-width: 768px) {
  .start-editorial-row {
    flex-direction: row;
    align-items: flex-start;
    gap: 48px;
  }
  .start-editorial-row--reverse {
    flex-direction: row-reverse;
  }
}

/* Images */
.start-img {
  width: 100%;
  object-fit: cover;
  display: block;
  border-radius: 2px;
}
.start-img.tall  { height: 260px; }
.start-img.medium { height: 200px; }
.start-img.wide  { height: 220px; }

@media (min-width: 768px) {
  .start-editorial-row .start-img.tall {
    width: 280px;
    flex-shrink: 0;
  }
}

/* Philosophie numbered list */
.start-philo-list {
  display: flex;
  flex-direction: column;
  gap: 28px;
  margin-top: 32px;
}
@media (min-width: 768px) {
  .start-philo-list {
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }
}
.start-philo-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.start-philo-num {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--orange);
  flex-shrink: 0;
  min-width: 24px;
  padding-top: 3px;
}
.start-philo-title {
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}
.start-philo-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--gray-600);
}

/* What's next – city line */
.start-cities {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--black);
  margin-top: 20px;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat: add start page scroll section CSS"
```

---

## Task 4: Add scroll sections HTML

**Files:**
- Modify: `index.html` — insert after `</header>` at line 316, before the closing `</div>` of `data-page="start"` at line 317

Use the 7 images from `pics/about/` distributed across sections. Replace the filenames below with the actual `.webp` filenames from `pics/about/`:

```
pics/about/0e31267041a5313842159b11e92fc3c5.webp  → Section 1 (Intro)
pics/about/2a5614a1b1dbbcb45d32b02206a80f7c.webp  → Section 2 (About)
pics/about/4713a700a189670fd58b29c90a92388a.webp  → Section 3 (Philosophie)
pics/about/9752c312e2cf297e267f2bc506ad5f5a.webp  → Section 4 (How we choose)
pics/about/all-in-daliah-hoffmann-konieczka-1.webp → Section 5 (What's next)
pics/about/cb17a6a8a2ca7d887a3ba93f4f26cbbd.webp  → (spare)
pics/about/e6dbe0165f24ac9ca281f1c04cfef49b.webp  → (spare)
```

- [ ] **Step 1: Insert the following HTML directly after `</header>` (line 316) and before `</div>` (line 317)**

```html
      <!-- SCROLL SECTIONS -->
      <div class="start-scroll-content">

        <!-- Scroll hint (mobile only) -->
        <div class="start-scroll-hint">
          <div class="start-scroll-hint-line"></div>
          <div class="start-scroll-hint-text">Scroll</div>
        </div>

        <!-- 1. Intro -->
        <div class="start-section">
          <div class="start-editorial-row">
            <div class="start-editorial-text">
              <span class="start-section-label">Eat This</span>
              <h2 class="start-section-title">One dish.<br>That's it.</h2>
              <p class="start-section-body">We don't do lists. We find the one thing you have to order — and we mean it.</p>
            </div>
            <img src="pics/about/0e31267041a5313842159b11e92fc3c5.webp" alt="" class="start-img tall">
          </div>
        </div>

        <!-- 2. About -->
        <div class="start-section start-section--alt">
          <div class="start-editorial-row start-editorial-row--reverse">
            <div class="start-editorial-text">
              <span class="start-section-label">About</span>
              <h2 class="start-section-title">We started<br>in 2024.</h2>
              <div class="start-section-body">
                <p>One rule: one dish per restaurant. No exceptions.</p>
                <p>A small team based in Berlin, eating our way through the city — from hidden ramen bars to Michelin stars. We visit every place ourselves. We talk to the chefs. We go back.</p>
                <p>If we recommend it, we'd order it again.</p>
              </div>
            </div>
            <img src="pics/about/2a5614a1b1dbbcb45d32b02206a80f7c.webp" alt="" class="start-img tall">
          </div>
        </div>

        <!-- 3. Philosophie -->
        <div class="start-section">
          <span class="start-section-label">Philosophie</span>
          <img src="pics/about/4713a700a189670fd58b29c90a92388a.webp" alt="" class="start-img wide">
          <div class="start-philo-list">
            <div class="start-philo-item">
              <div class="start-philo-num">01</div>
              <div>
                <div class="start-philo-title">One dish. That's the point.</div>
                <div class="start-philo-text">Anyone can write a list. We find the thing worth ordering.</div>
              </div>
            </div>
            <div class="start-philo-item">
              <div class="start-philo-num">02</div>
              <div>
                <div class="start-philo-title">We show up.</div>
                <div class="start-philo-text">We eat there ourselves. We go back. We talk to the chef. Then we make a call.</div>
              </div>
            </div>
            <div class="start-philo-item">
              <div class="start-philo-num">03</div>
              <div>
                <div class="start-philo-title">We don't take money for recommendations.</div>
                <div class="start-philo-text">Simple as that.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. How we choose -->
        <div class="start-section start-section--alt">
          <div class="start-editorial-row">
            <div class="start-editorial-text">
              <span class="start-section-label">How we choose</span>
              <h2 class="start-section-title">Most reviews happen once.<br>Ours don't.</h2>
              <div class="start-section-body">
                <p>We visit every place more than once, talk to the people behind it, and order everything that looks worth ordering. Then we pick one thing.</p>
                <p>That's how we choose.</p>
              </div>
            </div>
            <img src="pics/about/9752c312e2cf297e267f2bc506ad5f5a.webp" alt="" class="start-img tall">
          </div>
        </div>

        <!-- 5. What's next -->
        <div class="start-section">
          <span class="start-section-label">What's next</span>
          <h2 class="start-section-title">Berlin is where<br>we started.</h2>
          <p class="start-section-body">It won't be where we stop.</p>
          <img src="pics/about/all-in-daliah-hoffmann-konieczka-1.webp" alt="" class="start-img medium" style="margin-top: 24px;">
          <p class="start-cities">Istanbul, Amsterdam, Paris — we're working on it.</p>
          <p class="start-section-body">Same rules, different cities.</p>
        </div>

      </div>
      <!-- END SCROLL SECTIONS -->
```

- [ ] **Step 2: Verify in browser**

Open the app on the Start tab. You should be able to scroll below the hero and see all 5 sections with images and correct text.

- [ ] **Step 3: Check mobile view**

Resize browser to < 768px. Sections should stack single-column. Images appear below their text block. Scroll hint ("SCROLL") appears below the hero.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add scroll sections to start page"
```

---

## Task 5: Final check and push

- [ ] **Step 1: Check all 5 sections render correctly on both mobile and desktop**

- desktop (≥ 768px): sections 1, 2, 4 show two-column editorial layout; section 3 shows wide image then stacked numbered items; section 5 is single-column centered.
- mobile (< 768px): all sections single-column, images below text, scroll hint visible.

- [ ] **Step 2: Push**

```bash
git push
```
