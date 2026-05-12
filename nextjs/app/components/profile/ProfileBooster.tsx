'use client';

import { CSSProperties, useState } from 'react';
import styles from './ProfileBooster.module.css';

interface Pack {
  id:    string;
  image: string;
  name:  string;
  price: string;
}

// "All Berlin" hero — mirrors the landing-page bundle: every category pack
// unlocked, one-time €20. Image is composed client-side as a 9-pack pile
// (see BUNDLE_PACKS below) rather than a single asset, so the bundle
// always reflects the live category lineup.
const HERO = {
  id:    'all-berlin',
  name:  'All Berlin',
  desc:  'Alle 9 Booster Packs - jetzt und alle, die noch kommen.',
  price: '20,00 €',
};

// Symmetric heap geometry copied from PacksSection's BUNDLE_PACKS, scaled
// down to fit the profile hero card. Three pairs sit at mirrored x, three
// centre packs stack vertically; z runs 1-9 with pizza on top.
type PilePack = {
  slug: string
  x: number; y: number; rot: number; z: number
}
const BUNDLE_PACKS: PilePack[] = [
  { slug: 'breakfast',  x: -56, y: -36, rot: -28, z: 2 },
  { slug: 'coffee',     x:   0, y: -52, rot:   3, z: 3 },
  { slug: 'dinner',     x:  56, y: -36, rot:  28, z: 1 },
  { slug: 'drinks',     x: -60, y:   0, rot: -16, z: 4 },
  { slug: 'fastfood',   x:   0, y:   0, rot:  -2, z: 6 },
  { slug: 'finedining', x:  60, y:   0, rot:  16, z: 5 },
  { slug: 'lunch',      x: -46, y:  34, rot: -22, z: 7 },
  { slug: 'pizza',      x:   0, y:  44, rot:   4, z: 9 },
  { slug: 'sweets',     x:  46, y:  34, rot:  22, z: 8 },
];

// 9 category packs, €2,99 each. Names are English to match the print on
// the actual pack art (same convention as landing's PACK_LABEL).
const CATEGORIES: Pack[] = [
  { id: 'breakfast',  image: '/pics/booster/booster_breakfast.webp',  name: 'Breakfast',   price: '2,99 €' },
  { id: 'coffee',     image: '/pics/booster/booster_coffee.webp',     name: 'Coffee',      price: '2,99 €' },
  { id: 'dinner',     image: '/pics/booster/booster_dinner.webp',     name: 'Dinner',      price: '2,99 €' },
  { id: 'drinks',     image: '/pics/booster/booster_drinks.webp',     name: 'Drinks',      price: '2,99 €' },
  { id: 'fastfood',   image: '/pics/booster/booster_fastfood.webp',   name: 'Fast Food',   price: '2,99 €' },
  { id: 'finedining', image: '/pics/booster/booster_finedining.webp', name: 'Fine Dining', price: '2,99 €' },
  { id: 'lunch',      image: '/pics/booster/booster_lunch.webp',      name: 'Lunch',       price: '2,99 €' },
  { id: 'pizza',      image: '/pics/booster/booster_pizza.webp',      name: 'Pizza',       price: '2,99 €' },
  { id: 'sweets',     image: '/pics/booster/booster_sweets.webp',     name: 'Sweets',      price: '2,99 €' },
];

export default function ProfileBooster() {
  const [comingSoonId, setComingSoonId] = useState<string | null>(null);

  function handleBuy(id: string) {
    setComingSoonId(id);
    setTimeout(() => setComingSoonId(null), 2600);
  }
  const isSoon = (id: string) => comingSoonId === id;

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Packs</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
      </div>

      {/* ── Hero pack: All Berlin (bundle) ── */}
      <article className={styles.heroPack}>
        <div className={styles.heroPileWrap} aria-hidden="true">
          {BUNDLE_PACKS.map(({ slug, x, y, rot, z }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slug}
              src={`/pics/booster/booster_${slug}.webp`}
              alt=""
              className={styles.heroPileItem}
              loading="lazy"
              style={{
                ['--x' as string]: `${x}px`,
                ['--y' as string]: `${y}px`,
                ['--rot' as string]: `${rot}deg`,
                zIndex: z,
              } as CSSProperties}
            />
          ))}
        </div>
        <h3 className={styles.heroName}>{HERO.name}</h3>
        <p className={styles.heroDesc}>{HERO.desc}</p>
        <button
          type="button"
          className={`${styles.heroBuyBtn}${isSoon(HERO.id) ? ` ${styles.buyBtnSoon}` : ''}`}
          onClick={() => handleBuy(HERO.id)}
          disabled={isSoon(HERO.id)}
        >
          {isSoon(HERO.id) ? (
            <span className={styles.heroBuyAction}>Coming Soon</span>
          ) : (
            <>
              <span className={styles.heroBuyAction}>Alles freischalten</span>
              <span className={styles.heroBuyPrice}>{HERO.price}</span>
            </>
          )}
        </button>
      </article>

      {/* ── Category 3×3 grid ── */}
      <section className={styles.catSection}>
        <p className={styles.sectionLabel}>Nach Kategorie</p>
        <div className={styles.catGrid}>
          {CATEGORIES.map((p) => (
            <article key={p.id} className={styles.catPack}>
              <div className={styles.catImgWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className={styles.catImg} loading="lazy" />
              </div>
              <span className={styles.catName}>{p.name}</span>
              <button
                type="button"
                className={`${styles.catBuyBtn}${isSoon(p.id) ? ` ${styles.buyBtnSoon}` : ''}`}
                onClick={() => handleBuy(p.id)}
                disabled={isSoon(p.id)}
              >
                {isSoon(p.id) ? 'Bald' : p.price}
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.paymentRow} aria-label="Akzeptierte Zahlungsmethoden">
        {/* PayPal wordmark */}
        <svg className={styles.payIcon} viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal">
          <text x="0" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#003087">Pay</text>
          <text x="26" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#009cde">Pal</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        {/* Visa wordmark */}
        <svg className={styles.payIcon} viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
          <text x="0" y="13" fontSize="13" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="1" fill="#1a1f71">VISA</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        {/* Mastercard two-circle mark */}
        <svg className={styles.payIconMc} viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">
          <circle cx="14" cy="12" r="10" fill="#eb001b"/>
          <circle cx="24" cy="12" r="10" fill="#f79e1b"/>
          <path d="M19 5.4a10 10 0 0 1 0 13.2A10 10 0 0 1 19 5.4z" fill="#ff5f00"/>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        <span className={styles.payLabel}>Apple Pay</span>
      </div>
    </div>
  );
}
