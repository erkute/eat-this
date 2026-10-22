'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/lib/useDialogFocus';
import Image from '@/app/components/SiteImage';
import { Link } from '@/i18n/navigation';
import { CATALOG } from '@/lib/stripe-catalog';
import { categoryArt } from '@/lib/categoryArt';
import { type PackContentsIndex, formatPackPrice, packUrlSlug } from '@/lib/pack/packDetail';
import PackBuyButton from '@/app/[locale]/pack/[slug]/PackBuyButton';
import styles from './AllBerlinSheet.module.css';

/* „Was drin ist" — das Fenster hinter der All-Berlin-Tafel. Ersetzt die
   frühere Seite /pack/all-berlin, die nach dem Umbau nur noch die Tafel plus
   die neun Packs zeigte: die Tafel steht auf /packs schon oben, also bleibt
   hier, was jemand vor 9,99 € wissen will: was All Berlin bringt und welche
   Packs drinstecken (Ansage 22.10.2026: „mehr Infos, was drin ist“). Zahlen
   nennt es nicht, die Stichworte der Packs stehen auf deren eigener Seite.
   Man bleibt im Laden und kauft von hier. Auf dem Telefon kommt das Fenster
   von unten und steht ohne Scrollen. */

interface Props {
  locale: 'de' | 'en';
  triggerLabel?: string;
  contents: PackContentsIndex;
}

const copy = {
  de: {
    trigger: 'Enthaltene Packs ansehen',
    close: 'Schließen',
    title: 'Alles in All Berlin',
    inside: 'Das steckt drin',
    points: [
      'Alle Kategorie-Packs, von Frühstück bis Fine Dining.',
      'Jedes Must Eat liegt sofort offen auf deiner Map. Du musst nicht erst hin.',
      'Neue Packs und Karten kommen ohne weiteren Kauf dazu.',
    ],
    packs: 'Die Packs',
    cta: 'All Berlin freischalten',
    pending: 'Weiter zu Stripe …',
    owned: 'Zur Map',
    error: 'Da ging was schief. Versuch es nochmal.',
    map: '/map',
  },
  en: {
    trigger: 'View included packs',
    close: 'Close',
    title: 'Everything in All Berlin',
    inside: 'What you get',
    points: [
      'Every category pack, from breakfast to fine dining.',
      'Every Must Eat is revealed on your map right away. No need to go there first.',
      'New packs and cards are included at no extra cost.',
    ],
    packs: 'The packs',
    cta: 'Unlock All Berlin',
    pending: 'Going to Stripe …',
    owned: 'Open map',
    error: 'Something went wrong. Please try again.',
    map: '/map',
  },
} as const;

const categoryPacks = Object.values(CATALOG).filter((p) => p.type === 'category');
const allBerlin = CATALOG['all-berlin'];

export default function AllBerlinSheet({ locale, contents, triggerLabel }: Props) {
  const t = copy[locale];
  const orderedPacks = [...categoryPacks].sort(
    (a, b) =>
      Number((contents.byCategory[a.slug ?? '']?.mustEats ?? 0) === 0) -
      Number((contents.byCategory[b.slug ?? '']?.mustEats ?? 0) === 0)
  );
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef, triggerRef);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Body scroll lock while open (same pattern as MustEatsOnboarding).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
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
        className={`et-btn et-btn-alt ${styles.trigger}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={styles.triggerLabel}>{triggerLabel ?? t.trigger}</span>
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

              <h2 id="all-berlin-sheet-title" className={styles.title}>
                {t.title}
              </h2>

              <p className={styles.label}>{t.inside}</p>
              <ul className={styles.points} role="list">
                {t.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <p className={styles.label}>{t.packs}</p>
              <ul className={styles.grid} role="list">
                {orderedPacks.map((pack) => {
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
                        <span className={styles.name}>
                          {pack.displayName}
                          {(contents.byCategory[pack.slug ?? '']?.mustEats ?? 0) === 0 && (
                            <small className={styles.comingSoon}>
                              {locale === 'de' ? 'Kommt bald' : 'Coming soon'}
                            </small>
                          )}
                        </span>
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
                <p className={styles.paymentNote}>
                  {locale === 'de'
                    ? 'Einmalzahlung, kein Abo'
                    : 'One-time payment, no subscription'}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
