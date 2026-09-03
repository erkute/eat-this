'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import {
  formatPackPrice,
  formatPackContents,
  formatBundleSavings,
  packUrlSlug,
  type PackContents,
} from '@/lib/pack/packDetail';
import PackBuyButton from '@/app/[locale]/pack/[slug]/PackBuyButton';
import styles from './AllBerlinSheet.module.css';

/* „Was drin ist" — das Fenster hinter der All-Berlin-Tafel. Ersetzt die
   frühere Seite /pack/all-berlin, die nach dem Umbau nur noch die Tafel plus
   die neun Packs zeigte: die Tafel steht auf /packs schon oben, also bleibt
   hier, was jemand vor 9,99 € wissen will — welche neun Packs genau. Man
   bleibt im Laden und kauft von hier. Dieselbe Ink-Sheet wie das
   Must-Eat-Onboarding; auf dem Telefon kommt sie von unten. */

interface Props {
  locale: 'de' | 'en';
  contents: PackContents;
}

const copy = {
  de: {
    trigger: 'Was drin ist',
    close: 'Schließen',
    kicker: 'All Berlin',
    title: 'Neun Packs drin',
    lead: 'Jeder Kategorie-Pack, den es gibt — und jeder, der noch kommt.',
    cta: 'All Berlin freischalten',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    map: '/map',
  },
  en: {
    trigger: "What's inside",
    close: 'Close',
    kicker: 'All Berlin',
    title: 'Nine packs inside',
    lead: 'Every category pack there is — and every one still to come.',
    cta: 'Unlock All Berlin',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    map: '/en/map',
  },
} as const;

const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');
const allBerlin = CATALOG['all-berlin'];

export default function AllBerlinSheet({ locale, contents }: Props) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Body scroll lock while open (same pattern as MustEatsOnboarding).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {t.trigger}
      </button>

      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={close}>
            <div
              ref={panelRef}
              className={styles.panel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="all-berlin-sheet-title"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className={styles.x} aria-label={t.close} onClick={close}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>

              <p className={styles.kicker}>{t.kicker}</p>
              <h2 id="all-berlin-sheet-title" className={styles.title}>
                {t.title}
              </h2>
              <p className={styles.contents}>{formatPackContents(contents, locale)}</p>
              <p className={styles.lead}>{t.lead}</p>

              <ul className={styles.grid} role="list">
                {categoryPacks.map((pack) => {
                  const art = pack.slug ? categoryArt(pack.slug) : null;
                  return (
                    <li key={pack.packId}>
                      <Link
                        href={`/pack/${packUrlSlug(pack)}`}
                        className={styles.pack}
                        onClick={close}
                      >
                        {art && (
                          <Image
                            src={art}
                            alt=""
                            width={420}
                            height={656}
                            sizes="(max-width: 559px) 28vw, 120px"
                            className={styles.art}
                          />
                        )}
                        <span className={styles.name}>{pack.displayName}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.actions}>
                <PackBuyButton
                  packId={allBerlin.packId}
                  packName={allBerlin.displayName}
                  amountCents={allBerlin.amountCents}
                  locale={locale}
                  className={styles.cta}
                  errorClassName={styles.ctaError}
                  label={`${t.cta} · ${formatPackPrice(allBerlin.amountCents)}`}
                  pendingLabel={t.pending}
                  ownedLabel={t.owned}
                  ownedHref={t.map}
                  errorLabel={t.error}
                />
                <p className={styles.savings}>{formatBundleSavings(locale)}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
