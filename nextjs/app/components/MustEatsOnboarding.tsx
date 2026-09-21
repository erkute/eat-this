'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { useTranslation } from '@/lib/i18n';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { pickOnboardingDemoCard } from '@/lib/home/mustEatsGallery';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import styles from './MustEatsOnboarding.module.css';
import tour from './Tour.module.css';

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
  /** `ink`: der Auslöser steht auf einer Ink-Tafel (Kopf der Must-Eats-Seite)
   *  und wird zum Ring — Ink auf Ink verschwände. Default: Ink-Knopf auf Weiß. */
  tone?: 'paper' | 'ink';
}

// First-visit onboarding for the Must-Eats page: 3 steps around a demo card
// that flips like the on-site reveal. Opens once (localStorage flag, set on
// dismiss), re-openable any time via the "how does it work?" trigger link
// this component renders inline. SSR renders only the trigger — `open` flips
// in an effect, so there is no hydration mismatch and no portal on the server.
export default function MustEatsOnboarding({
  initialMapData,
  autoOpen = true,
  tone = 'paper',
}: Props) {
  const { lang, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, panelRef, triggerRef);

  // Der Fokus folgt der Überschrift des Schritts, damit Screenreader ihn
  // ansagen. Auf der letzten Seite stehen zwei Fassungen im DOM, CSS zeigt
  // eine — fokussiert wird die sichtbare.
  useEffect(() => {
    if (!open) return;
    const heading = [...(copyRef.current?.querySelectorAll('h2') ?? [])].find(
      (h) => h.getClientRects().length > 0
    );
    heading?.focus({ preventScroll: true });
  }, [open, step]);

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
  const de = lang === 'de';

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

  const copy = (kicker: string, title: string, body: string) => (
    <>
      <p className={tour.kicker}>{t(kicker)}</p>
      <h2 tabIndex={-1} className={tour.headline}>
        {t(title)}
      </h2>
      <p className={tour.body}>{t(body)}</p>
    </>
  );

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={tone === 'ink' ? `${styles.how} ${styles.howInk}` : styles.how}
        onClick={reopen}
      >
        <span className={styles.howBadge} aria-hidden="true">
          ?
        </span>
        {t('mustEats.howItWorks')}
      </button>

      {open &&
        createPortal(
          /* Dieselbe Hülle wie die Tour nach der Anmeldung (Tour.module.css):
             Kopfzeile, Bild und Text, Fortschritt, Zurück und Weiter. */
          <div className={tour.layer}>
            <div
              ref={panelRef}
              tabIndex={-1}
              className={tour.panel}
              role="dialog"
              aria-modal="true"
              aria-label={t('mustEats.howItWorks')}
            >
              <header className={tour.header}>
                <span>{t('mustEats.howItWorks')}</span>
                <button type="button" className={tour.quiet} onClick={close}>
                  {last ? t('mustEats.onbClose') : de ? 'Überspringen' : 'Skip'}
                </button>
              </header>

              <div className={tour.content}>
                <div className={tour.art}>
                  {last ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        data-testid="onb-pack"
                        data-auth-only=""
                        className={tour.artImg}
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
                        className={tour.artImg}
                        src={STARTER_ART}
                        alt="Eat This Starter Pack"
                        loading="eager"
                        decoding="sync"
                        fetchPriority="high"
                      />
                    </>
                  ) : (
                    <div className={styles.cardBox}>
                      {step === 1 ? (
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
                  )}
                </div>

                <div className={tour.copy} ref={copyRef}>
                  {last ? (
                    <>
                      {/* Welche Fassung steht, entscheidet das Auth-Flag vor dem
                          ersten Paint (globals.css) — kein Flackern. */}
                      <div data-auth-only="">
                        {copy('mustEats.onb3Kicker', 'mustEats.onb3Title', 'mustEats.onb3Body')}
                      </div>
                      <div data-guest-only="">
                        {copy(
                          'mustEats.onbStarterKicker',
                          'mustEats.onbStarterTitle',
                          'mustEats.onbStarterBody'
                        )}
                      </div>
                    </>
                  ) : (
                    copy(SLIDES[step].kicker, SLIDES[step].title, SLIDES[step].body)
                  )}
                </div>
              </div>

              <footer className={tour.footer}>
                <div
                  className={tour.progress}
                  aria-label={de ? `Schritt ${step + 1} von 3` : `Step ${step + 1} of 3`}
                >
                  <span>{step + 1} / 3</span>
                  <div className={tour.segments} aria-hidden="true">
                    {SLIDES.map((s, i) => (
                      <span key={s.title} className={i <= step ? tour.active : undefined} />
                    ))}
                  </div>
                </div>
                {/* Der gelbe Knopf steht auf jeder Seite an derselben Stelle.
                    Am Ende nimmt die zweite Aktion den Platz von Zurück ein. */}
                {!last ? (
                  <div className={tour.actions}>
                    <button
                      type="button"
                      className={tour.quiet}
                      disabled={step === 0}
                      onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    >
                      {de ? 'Zurück' : 'Back'}
                    </button>
                    <button
                      type="button"
                      className={tour.action}
                      onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                    >
                      {t('mustEats.onbNext')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={tour.actions} data-testid="onb-actions-auth" data-auth-only="">
                      <a className={tour.quiet} href={packsHref} onClick={close}>
                        {t('mustEats.onbPacksCta')}
                      </a>
                      <button type="button" className={tour.action} onClick={close}>
                        {t('mustEats.onbStart')}
                      </button>
                    </div>
                    {/* Für einen Gast zählt das Gratis-Pack mehr als das
                        Schließen — es nimmt den gelben Platz. */}
                    <div
                      className={tour.actions}
                      data-testid="onb-actions-guest"
                      data-guest-only=""
                    >
                      <button type="button" className={tour.quiet} onClick={close}>
                        {t('mustEats.onbStart')}
                      </button>
                      <a className={tour.action} href={starterHref} onClick={close}>
                        {t('mustEats.onbStarterCta')}
                      </a>
                    </div>
                  </>
                )}
              </footer>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
