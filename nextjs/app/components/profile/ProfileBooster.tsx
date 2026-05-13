'use client';

import { CSSProperties, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLoginModal } from '@/lib/auth/LoginModalContext';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import styles from './ProfileBooster.module.css';

interface Pack {
  id:    string;
  image: string;
  name:  string;
  price: string;
}

const HERO = {
  id:    'all-berlin',
  name:  'All Berlin',
  desc:  'Alle 9 Booster Packs - jetzt und alle, die noch kommen.',
  price: '20,00 €',
};

type PilePack = { slug: string; x: number; y: number; rot: number; z: number }
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

const PACK_ID_BY_DISPLAY: Record<string, string> = {
  breakfast:    'category-breakfast',
  coffee:       'category-coffee',
  dinner:       'category-dinner',
  drinks:       'category-drinks',
  fastfood:     'category-fastfood',
  finedining:   'category-finedining',
  lunch:        'category-lunch',
  pizza:        'category-pizza',
  sweets:       'category-sweets',
  'all-berlin': 'all-berlin',
};

export default function ProfileBooster() {
  const { user } = useAuth();
  const owned = useOwnedEntitlements(user?.uid ?? null);
  const { open: openLoginModal } = useLoginModal();
  const locale = useLocale();
  const search = useSearchParams();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const canceled = search.get('booster') === 'canceled';

  // all-berlin implies every category. Category-purchase doesn't imply
  // all-berlin (a user could theoretically buy all 9 and still not have
  // the bundle — bundle currently the only way to get future categories).
  const ownsAllBerlin = owned?.has('all-berlin') ?? false;
  const isOwned = (displayId: string) => {
    if (ownsAllBerlin) return true;
    return owned?.has(PACK_ID_BY_DISPLAY[displayId]) ?? false;
  };

  async function handleBuy(displayId: string) {
    if (busyId) return;
    if (!user) { openLoginModal(); return; }
    setBusyId(displayId);
    setErrorId(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body:    JSON.stringify({ packId: PACK_ID_BY_DISPLAY[displayId], locale }),
      });
      if (!res.ok) {
        if (res.status !== 409) setErrorId(displayId);
        setBusyId(null);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setErrorId(displayId);
      setBusyId(null);
    }
  }

  const heroOwned    = isOwned(HERO.id);
  const heroBusy     = busyId === HERO.id;
  const heroError    = errorId === HERO.id;
  const heroDisabled = heroOwned || heroBusy;

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <p className={styles.label}>Booster Packs</p>
        <h2 className={styles.title}>Mehr Karten freischalten</h2>
      </div>

      {canceled && (
        <div role="alert" className={styles.cancelNotice}>
          Bezahlung abgebrochen — kein Pack freigeschaltet.
        </div>
      )}

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
          className={`${styles.heroBuyBtn}${heroDisabled ? ` ${styles.buyBtnSoon}` : ''}`}
          onClick={() => handleBuy(HERO.id)}
          disabled={heroDisabled}
        >
          {heroOwned ? (
            <span className={styles.heroBuyAction}>Bereits freigeschaltet</span>
          ) : heroBusy ? (
            <span className={styles.heroBuyAction}>Weiterleitung …</span>
          ) : heroError ? (
            <span className={styles.heroBuyAction}>Fehler — nochmal versuchen</span>
          ) : (
            <>
              <span className={styles.heroBuyAction}>Alles freischalten</span>
              <span className={styles.heroBuyPrice}>{HERO.price}</span>
            </>
          )}
        </button>
      </article>

      <section className={styles.catSection}>
        <p className={styles.sectionLabel}>Nach Kategorie</p>
        <div className={styles.catGrid}>
          {CATEGORIES.map((p) => {
            const o = isOwned(p.id);
            const b = busyId === p.id;
            const e = errorId === p.id;
            return (
              <article key={p.id} className={styles.catPack}>
                <div className={styles.catImgWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className={styles.catImg} loading="lazy" />
                </div>
                <span className={styles.catName}>{p.name}</span>
                <button
                  type="button"
                  className={`${styles.catBuyBtn}${(o || b) ? ` ${styles.buyBtnSoon}` : ''}`}
                  onClick={() => handleBuy(p.id)}
                  disabled={o || b}
                >
                  {o ? 'Hast du' : b ? '…' : e ? 'Nochmal' : p.price}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className={styles.paymentRow} aria-label="Akzeptierte Zahlungsmethoden">
        <svg className={styles.payIcon} viewBox="0 0 80 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PayPal">
          <text x="0" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#003087">Pay</text>
          <text x="26" y="16" fontSize="14" fontWeight="700" fontFamily="Arial,sans-serif" fill="#009cde">Pal</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
        <svg className={styles.payIcon} viewBox="0 0 48 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">
          <text x="0" y="13" fontSize="13" fontWeight="900" fontFamily="Arial,sans-serif" letterSpacing="1" fill="#1a1f71">VISA</text>
        </svg>
        <span className={styles.payDot} aria-hidden="true">·</span>
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
