'use client';

import { CSSProperties, useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLoginModal } from '@/lib/auth/LoginModalContext';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';
import { getPack } from '@/lib/stripe-catalog';
import packs from '@/app/components/landing/sections/PacksSection.module.css';
import styles from './ProfileBooster.module.css';

// 9 Category Packs — same source-of-truth + rhythm as the landing Speisekarte.
const MENU_PACKS: { slug: string; packId: string; nameDe: string; nameEn: string }[] = [
  { slug: 'coffee',     packId: 'category-coffee',     nameDe: 'Coffee Pack',      nameEn: 'Coffee Pack' },
  { slug: 'breakfast',  packId: 'category-breakfast',  nameDe: 'Breakfast Pack',   nameEn: 'Breakfast Pack' },
  { slug: 'lunch',      packId: 'category-lunch',      nameDe: 'Lunch Pack',       nameEn: 'Lunch Pack' },
  { slug: 'pizza',      packId: 'category-pizza',      nameDe: 'Pizza Pack',       nameEn: 'Pizza Pack' },
  { slug: 'dinner',     packId: 'category-dinner',     nameDe: 'Dinner Pack',      nameEn: 'Dinner Pack' },
  { slug: 'finedining', packId: 'category-finedining', nameDe: 'Fine Dining Pack', nameEn: 'Fine Dining Pack' },
  { slug: 'fastfood',   packId: 'category-fastfood',   nameDe: 'Fast Food Pack',   nameEn: 'Fast Food Pack' },
  { slug: 'drinks',     packId: 'category-drinks',     nameDe: 'Drinks Pack',      nameEn: 'Drinks Pack' },
  { slug: 'sweets',     packId: 'category-sweets',     nameDe: 'Sweets Pack',      nameEn: 'Sweets Pack' },
];

type FanPack = { slug: string; tx: number; ty: number; rot: number; z: number };
const ALL_PACKS_FAN: FanPack[] = [
  { slug: 'breakfast',  tx: -97, ty: -55, rot: -7, z: 1 },
  { slug: 'sweets',     tx:   0, ty: -58, rot:  0, z: 2 },
  { slug: 'pizza',      tx:  97, ty: -55, rot:  7, z: 3 },
  { slug: 'fastfood',   tx: -100, ty:  0, rot: -4, z: 4 },
  { slug: 'lunch',      tx:   0, ty:  0, rot:  0, z: 5 },
  { slug: 'coffee',     tx: 100, ty:  0, rot:  4, z: 6 },
  { slug: 'drinks',     tx: -97, ty: 55, rot: -7, z: 7 },
  { slug: 'dinner',     tx:   0, ty: 58, rot:  0, z: 9 },
  { slug: 'finedining', tx:  97, ty: 55, rot:  7, z: 8 },
];

interface Props {
  restaurantCount: number;
}

export default function ProfileBooster({ restaurantCount }: Props) {
  const { user } = useAuth();
  const owned = useOwnedEntitlements(user?.uid ?? null);
  const { open: openLoginModal } = useLoginModal();
  const localeRaw = useLocale();
  const locale: 'de' | 'en' = localeRaw === 'en' ? 'en' : 'de';
  const search = useSearchParams();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  // Latch the cancel state on first render. We read useSearchParams once
  // because Next 15 unexpectedly invalidates it after history.replaceState,
  // and we want the notice to outlive that invalidation.
  const initialCanceled = search.get('booster') === 'canceled';
  const [canceled] = useState(initialCanceled);

  useEffect(() => {
    if (!initialCanceled) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('booster')) return;
    url.searchParams.delete('booster');
    window.history.replaceState({}, '', url.toString());
  }, [initialCanceled]);

  // all-berlin implies every category. Category-purchase doesn't imply
  // all-berlin (could buy all 9 and still not own the bundle).
  const ownsAllBerlin = owned?.has('all-berlin') ?? false;
  const isOwnedPack = (packId: string) => {
    if (ownsAllBerlin) return true;
    return owned?.has(packId) ?? false;
  };

  async function handleBuy(packId: string) {
    if (busyId) return;
    if (!user) { openLoginModal(); return; }
    setBusyId(packId);
    setErrorId(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body:    JSON.stringify({ packId, locale }),
      });
      if (!res.ok) {
        if (res.status !== 409) setErrorId(packId);
        setBusyId(null);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setErrorId(packId);
      setBusyId(null);
    }
  }

  const t = locale === 'de'
    ? {
        abEyebrow:      'Die ganze Karte —',
        abName:         'All Berlin',
        abDesc:         `${restaurantCount}+ Berliner Spots. Alle neun Kategorien freigeschaltet. Jeder neue Pack inklusive. Einmal zahlen, kein Abo.`,
        abLabel:        'Hol dir All Berlin',
        statSpots:      'Spots',
        statCategories: 'Kategorien',
        statUpdates:    'Updates',
        boosterHeader:  'Boosterpacks',
        buyLabel:       'Hol dir →',
        owned:          'Hast du',
        ownedAll:       'Bereits freigeschaltet',
        busy:           'Weiterleitung …',
        retry:          'Nochmal',
        canceled:       'Kauf abgebrochen.',
      }
    : {
        abEyebrow:      'The whole map —',
        abName:         'All Berlin',
        abDesc:         `${restaurantCount}+ Berlin spots. All nine categories unlocked. Every new pack included. Pay once, no subscription.`,
        abLabel:        'Get All Berlin',
        statSpots:      'Spots',
        statCategories: 'Categories',
        statUpdates:    'Updates',
        boosterHeader:  'Boosterpacks',
        buyLabel:       'Get it →',
        owned:          'Owned',
        ownedAll:       'Already unlocked',
        busy:           'Redirecting …',
        retry:          'Retry',
        canceled:       'Checkout canceled.',
      };

  const heroBusy = busyId === 'all-berlin';

  return (
    <div className={packs.inner}>
      {canceled && (
        <div role="status" className={styles.cancelNotice}>{t.canceled}</div>
      )}

      {/* All Berlin Hero — cream card, stats grid, 9-pack fan, Slackey CTA. */}
      <div className={packs.allBerlin}>
        <div className={packs.abContent}>
          <div className={packs.abText}>
            <p className={packs.abEyebrow}>{t.abEyebrow}</p>
            <h3 className={packs.abName}>{t.abName}</h3>
            <p className={packs.abDesc}>{t.abDesc}</p>

            <div className={packs.stats} role="list">
              <div className={packs.stat} role="listitem">
                <span className={packs.statNum}>{restaurantCount}</span>
                <span className={packs.statLabel}>{t.statSpots}</span>
              </div>
              <div className={packs.stat} role="listitem">
                <span className={packs.statNum}>9</span>
                <span className={packs.statLabel}>{t.statCategories}</span>
              </div>
              <div className={packs.stat} role="listitem">
                <span className={packs.statNum}>∞</span>
                <span className={packs.statLabel}>{t.statUpdates}</span>
              </div>
            </div>

            <button
              type="button"
              className={packs.abCta}
              onClick={() => handleBuy('all-berlin')}
              disabled={ownsAllBerlin || heroBusy}
              aria-label={ownsAllBerlin ? t.ownedAll : `${t.abName} — 20 €`}
            >
              {ownsAllBerlin ? (
                <span>{t.ownedAll}</span>
              ) : heroBusy ? (
                <span>{t.busy}</span>
              ) : (
                <>
                  <span>{t.abLabel}</span>
                  <span className={packs.abCtaPrice}>20&nbsp;€</span>
                </>
              )}
            </button>
          </div>

          <div className={packs.fan} aria-hidden="true">
            {ALL_PACKS_FAN.map(({ slug, tx, ty, rot, z }) => (
              <div
                key={slug}
                className={packs.fanPack}
                style={{
                  ['--tx' as string]: `${tx}%`,
                  ['--ty' as string]: `${ty}%`,
                  ['--rot' as string]: `${rot}deg`,
                  zIndex: z,
                } as CSSProperties}
              >
                <Image
                  src={`/pics/booster/booster_${slug}.webp`}
                  alt=""
                  width={500}
                  height={750}
                  sizes="(max-width: 700px) 100px, 132px"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 9 Boosterpacks — same single-row rhythm as the landing menu. */}
      <div className={packs.menuBlock}>
        <div className={packs.blockHeader}>
          <h3 className={packs.blockTitle}>{t.boosterHeader}</h3>
          <span className={packs.blockCount}>09</span>
        </div>

        <ul className={packs.menuList}>
          {MENU_PACKS.map((p) => {
            const meta = getPack(p.packId);
            const name = locale === 'de' ? p.nameDe : p.nameEn;
            const o = isOwnedPack(p.packId);
            const b = busyId === p.packId;
            const e = errorId === p.packId;
            return (
              <li key={p.packId} className={packs.pack}>
                <div className={packs.thumb} aria-hidden="true">
                  <Image
                    src={`/pics/booster/booster_${p.slug}.webp`}
                    alt=""
                    width={500}
                    height={750}
                    className={packs.thumbImg}
                    sizes="(max-width: 700px) 110px, 160px"
                  />
                </div>
                <div className={packs.body}>
                  <h4 className={packs.packName}>{name}</h4>
                  <p className={packs.packDesc}>{meta?.description ?? ''}</p>
                </div>
                <button
                  type="button"
                  className={packs.buy}
                  onClick={() => handleBuy(p.packId)}
                  disabled={o || b}
                  aria-label={o ? `${name} — ${t.owned}` : `${name} — 2,99 €`}
                >
                  {o ? (
                    <span className={packs.buyPrice}>{t.owned}</span>
                  ) : b ? (
                    <span className={packs.buyPrice}>{t.busy}</span>
                  ) : e ? (
                    <span className={packs.buyPrice}>{t.retry}</span>
                  ) : (
                    <>
                      <span className={packs.buyLabel}>{t.buyLabel}</span>
                      <span className={packs.buyPrice}>2,99&nbsp;€</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={styles.paymentRow} aria-label="Akzeptierte Zahlungsmethoden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/payment/apple-pay.svg"  alt="Apple Pay" className={styles.payMark} loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/payment/maestro.svg"    alt="Maestro"   className={styles.payMark} loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/payment/visa.svg"       alt="Visa"      className={styles.payMark} loading="lazy" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/payment/paypal.svg"     alt="PayPal"    className={styles.payMark} loading="lazy" />
      </div>
    </div>
  );
}
