'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/lib/i18n';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { pickOnboardingDemoCard } from '@/lib/home/mustEatsGallery';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import styles from './MustEatsOnboarding.module.css';

const CARD_BACK = '/pics/card-back.webp?v=7';
// Slide 3 replaces the demo card with the pack art — the thing that brings new
// spots. Which pack depends on whether the visitor has an account: the free
// Starter Pack for guests, the paid Booster Packs once they're in.
const BOOSTER_ART = '/pics/booster/booster.webp';
const STARTER_ART = '/pics/booster/booster_free.webp';
export const ONBOARDING_SEEN_KEY = 'mustEatsOnboardingSeen';

// Dwell on the card back in slide 2 before it auto-flips open — the live
// demo of the on-site reveal. Keep shorter than the user's reading time.
const STEP2_FLIP_DELAY_MS = 800;

// Three casual slides: what a Must Eat is, how revealing works, then where new
// spots come from (Booster Packs). Each slide is kicker + display headline +
// short body (section-head style).
const SLIDES = [
  { kicker: 'mustEats.onb1Kicker', title: 'mustEats.onb1Title', body: 'mustEats.onb1Body' },
  { kicker: 'mustEats.onb2Kicker', title: 'mustEats.onb2Title', body: 'mustEats.onb2Body' },
  { kicker: 'mustEats.onb3Kicker', title: 'mustEats.onb3Title', body: 'mustEats.onb3Body' },
] as const;

interface Props {
  initialMapData: InitialMustEatsData;
  /** Open by itself on the visitor's first look (localStorage-flagged). True
   *  for the Must-Eats page, whose whole job is the catalog. The home teaser
   *  passes false and keeps the trigger only: a modal on the home page's first
   *  paint interrupts a visitor who has not asked anything yet. Either way the
   *  flag is shared, so explaining it here means the catalog page won't
   *  explain it again. */
  autoOpen?: boolean;
}

// First-visit onboarding for the Must-Eats page: 3 steps around a demo card
// that flips like the on-site reveal. Opens once (localStorage flag, set on
// dismiss), re-openable any time via the "how does it work?" trigger link
// this component renders inline. SSR renders only the trigger — `open` flips
// in an effect, so there is no hydration mismatch and no portal on the server.
export default function MustEatsOnboarding({ initialMapData, autoOpen = true }: Props) {
  const { lang, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Same anon face-up set the gallery shows — the demo card is one the
  // visitor can actually see face-up in the grid below.
  const demo = useMemo(
    () =>
      pickOnboardingDemoCard(
        initialMapData.mustEats,
        resolveUnlockedMustEatIds({
          uid: null,
          storedUnlockedIds: new Set<string>(),
          revealedMustEatIds: new Set<string>(initialMapData.revealedMustEatIds),
        })
      ),
    [initialMapData]
  );

  useEffect(() => {
    if (!autoOpen) return;
    let seen: string | null = null;
    try {
      seen = window.localStorage.getItem(ONBOARDING_SEEN_KEY);
    } catch {
      /* storage blocked → show once per pageload */
    }
    if (!seen) setOpen(true);
  }, [autoOpen]);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStep(0);
  }, []);

  const reopen = () => {
    setStep(0);
    setOpen(true);
  };

  // Slide 2 choreography: card turns face-down on entry, then auto-flips
  // open after a short dwell — demonstrating the on-site reveal.
  const [showBack, setShowBack] = useState(false);
  const flipTimer = useRef<number | null>(null);

  const clearFlipTimer = () => {
    if (flipTimer.current === null) return;
    window.clearTimeout(flipTimer.current);
    flipTimer.current = null;
  };

  useEffect(() => {
    if (!open || step !== 1) {
      setShowBack(false);
      return;
    }
    setShowBack(true);
    flipTimer.current = window.setTimeout(() => {
      flipTimer.current = null;
      setShowBack(false);
    }, STEP2_FLIP_DELAY_MS);
    return clearFlipTimer;
  }, [open, step]);

  // Tapping the card is the mechanic itself, so on slide 2 the demo card is
  // the control rather than a picture of one — watching an animation teaches
  // less than doing the thing once. A tap also cancels the pending auto-flip,
  // which would otherwise fight the visitor for the card's state.
  const handleFlipTap = () => {
    clearFlipTimer();
    setShowBack((back) => !back);
  };

  // Slide 3 art should already be decoded by the time the visitor taps next.
  // Both variants: which one shows is decided by CSS from the pre-paint auth
  // flag, so this effect cannot know which to skip.
  useEffect(() => {
    if (!open) return;
    for (const src of [BOOSTER_ART, STARTER_ART]) {
      const preload = new window.Image();
      preload.setAttribute('fetchpriority', 'high');
      preload.decoding = 'async';
      preload.src = src;
      void preload.decode?.().catch(() => {});
    }
  }, [open]);

  // Body scroll lock while open (same pattern as MustEatImageLightbox).
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

  const last = step === SLIDES.length - 1;
  const packsHref = lang === 'en' ? '/en/packs' : '/packs';
  // The home's Starter-Pack section carries this id; same-page it scrolls, from
  // /must-eats it navigates home and HubHashScroll settles the position.
  const starterHref = lang === 'en' ? '/en#hub-starter' : '/#hub-starter';

  const slideClass = (i: number) =>
    i === step ? `${styles.slideCopy} ${styles.slideOn}` : styles.slideCopy;
  const rowClass = (on: boolean) =>
    on ? `${styles.actionRow} ${styles.actionRowOn}` : styles.actionRow;

  const flipper = (
    <div
      data-testid="onb-flipper"
      className={showBack ? `${styles.flipper} ${styles.flipped}` : styles.flipper}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.face} src={demo?.image ?? CARD_BACK} alt={demo?.dish ?? ''} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${styles.face} ${styles.back}`} src={CARD_BACK} alt="" aria-hidden="true" />
    </div>
  );

  return (
    <>
      <button type="button" className={styles.how} onClick={reopen}>
        <span className={styles.howBadge} aria-hidden="true">
          ?
        </span>
        {t('mustEats.howItWorks')}
      </button>

      {open &&
        createPortal(
          <div className={styles.backdrop} onClick={close}>
            <div
              className={styles.panel}
              role="dialog"
              aria-modal="true"
              // Names the dialog, not the current slide. The last slide has two
              // headings (guest / signed-in) and CSS picks one, so pointing
              // aria-labelledby at a heading would sometimes point at a
              // display:none element and leave the dialog unnamed.
              aria-label={t('mustEats.howItWorks')}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.x}
                aria-label={t('mustEats.onbClose')}
                onClick={close}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>

              <div className={styles.cardBox}>
                {last ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      data-testid="onb-pack"
                      data-auth-only=""
                      className={styles.packHero}
                      src={BOOSTER_ART}
                      alt="Booster Pack"
                      loading="eager"
                      decoding="sync"
                      fetchPriority="high"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      data-testid="onb-starter-pack"
                      data-guest-only=""
                      className={styles.packHero}
                      src={STARTER_ART}
                      alt="Eat This Starter Pack"
                      loading="eager"
                      decoding="sync"
                      fetchPriority="high"
                    />
                  </>
                ) : step === 1 ? (
                  <button
                    type="button"
                    className={styles.flipTap}
                    onClick={handleFlipTap}
                    aria-label={t('mustEats.onbFlipAria')}
                  >
                    {flipper}
                  </button>
                ) : (
                  flipper
                )}
              </div>

              <div className={styles.copy}>
                {/* Every slide is in the DOM at once, stacked into one grid
                    cell, with the inactive ones held at visibility:hidden. The
                    cell is therefore always as tall as the tallest slide, so
                    the panel keeps one size from the first "weiter" to the
                    last — without a min-height guessed against one particular
                    copy length, language or column width, which is what used
                    to let the panel resize under the visitor. visibility also
                    keeps the inactive slides out of the a11y tree and out of
                    the tab order, unlike a plain opacity hold. */}
                <div className={styles.slideStack}>
                  {SLIDES.map((s, i) =>
                    i === SLIDES.length - 1 ? (
                      <Fragment key={s.title}>
                        <div className={slideClass(i)} data-auth-only="">
                          <p className={styles.kicker}>{t('mustEats.onb3Kicker')}</p>
                          <h2 className={styles.title}>{t('mustEats.onb3Title')}</h2>
                          <p className={styles.text}>{t('mustEats.onb3Body')}</p>
                        </div>
                        <div className={slideClass(i)} data-guest-only="">
                          <p className={styles.kicker}>{t('mustEats.onbStarterKicker')}</p>
                          <h2 className={styles.title}>{t('mustEats.onbStarterTitle')}</h2>
                          <p className={styles.text}>{t('mustEats.onbStarterBody')}</p>
                        </div>
                      </Fragment>
                    ) : (
                      <div key={s.title} className={slideClass(i)}>
                        <p className={styles.kicker}>{t(s.kicker)}</p>
                        <h2 className={styles.title}>{t(s.title)}</h2>
                        <p className={styles.text}>{t(s.body)}</p>
                      </div>
                    )
                  )}
                </div>

                {/* A segmented bar rather than carousel dots: the active
                    segment widens, so it shows progress instead of just saying
                    "there is more". Each segment jumps to its slide, so the
                    only way back is no longer closing and starting over. The
                    name lives in aria-label — the bar carries no type, which
                    is the point: numerals here sat in whichever font and read
                    as a foreign object next to the display copy. */}
                <ol className={styles.steps}>
                  {SLIDES.map((s, i) => (
                    <li key={s.title}>
                      <button
                        type="button"
                        className={i === step ? `${styles.step} ${styles.stepOn}` : styles.step}
                        onClick={() => setStep(i)}
                        aria-current={i === step ? 'step' : undefined}
                        // Built inline rather than from a keyed string with a
                        // {n} placeholder: next-intl answers an unformatted ICU
                        // placeholder with the key path instead of throwing, so
                        // the shared t()'s raw fallback never fires and the
                        // label came out as "mustEats.onbStepAria".
                        aria-label={
                          lang === 'de' ? `Zu Schritt ${i + 1} von 3` : `Go to step ${i + 1} of 3`
                        }
                      />
                    </li>
                  ))}
                </ol>

                {/* The actions stack for the same reason: the last slide
                    carries two buttons where the others carry one, and on a
                    narrow column that row wraps — a height difference that
                    would land on the visitor exactly at the last "weiter". */}
                <div className={styles.actionStack}>
                  <div className={rowClass(!last)}>
                    <button
                      type="button"
                      className={styles.next}
                      // Clamped because the row is only hidden, not unmounted:
                      // nothing in the UI can reach it on the last slide, but a
                      // step past the end would blank every slide in the stack.
                      onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                    >
                      {t('mustEats.onbNext')}
                    </button>
                  </div>
                  <div className={rowClass(last)} data-testid="onb-actions-auth" data-auth-only="">
                    <button type="button" className={styles.next} onClick={close}>
                      {t('mustEats.onbStart')}
                    </button>
                    <a className={styles.packLink} href={packsHref} onClick={close}>
                      {t('mustEats.onbPacksCta')}
                    </a>
                  </div>
                  {/* For a guest the free pack outranks dismissing, so it takes
                      the primary slot — the paid Booster Packs are a rung up
                      that only makes sense once there is an account. */}
                  <div className={rowClass(last)} data-testid="onb-actions-guest" data-guest-only="">
                    <a className={styles.next} href={starterHref} onClick={close}>
                      {t('mustEats.onbStarterCta')}
                    </a>
                    <button type="button" className={styles.packLink} onClick={close}>
                      {t('mustEats.onbStart')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
