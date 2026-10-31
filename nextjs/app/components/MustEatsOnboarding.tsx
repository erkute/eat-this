'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { useTranslation } from '@/lib/i18n';
import { useLoginModal } from '@/lib/auth';
import { resolveUnlockedMustEatIds } from '@/lib/map';
import { pickOnboardingDemoCard } from '@/lib/home/mustEatsGallery';
import type { InitialMustEatsData } from '@/lib/map/initial-surface-data';
import styles from './MustEatsOnboarding.module.css';
import tour from './Tour.module.css';
import StarterPack3D from './StarterPack3D';
import CardTapCue, { CARD_TAP_CUE_MS } from './CardTapCue';
import { mustEatCardSrc, mustEatCardSrcSet } from '@/lib/must-eat/cardImage';

const CARD_BACK = '/pics/card-back.webp?v=20261028';
// Slide 3 replaces the demo card with the pack art — the thing that brings new
// spots. Which pack depends on whether the visitor has an account: the free
// Starter Pack for guests, the paid Booster Packs once they're in.
const BOOSTER_ART = '/pics/booster/booster.webp?v=20261030';
const STARTER_ART = '/pics/home/starter-pack-front.webp?v=20261030';

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
  /** `ink`: der Auslöser steht auf einer Ink-Tafel (Kopf der Must-Eats-Seite)
   *  und wird zur hellen Fläche — Ink auf Ink verschwände. `sheet`: dieselbe
   *  Fläche in Chip-Größe, für das Must-Eat-Detail der Karte, wo er im
   *  knappen Text-Slot unter der verdeckten Karte steht. Default: Ink-Knopf
   *  auf Weiß. */
  tone?: 'paper' | 'ink' | 'sheet' | 'plain';
  /** Die verdeckte Karte, von der aus ein Gast die Erklärung sieht (Must-Eat-
   *  Detail der Karte). „Anmelden" auf der letzten Folie nimmt sie dann als
   *  Absicht mit ins Starter Pack — wie der Tipp auf die Karte selbst. */
  starterMustEatId?: string;
  /** Eigene Beschriftung des Auslösers; sonst „Wie funktioniert's?“. Die
   *  Must-Eats-Seite sagt „So funktioniert’s“ (Betreiber, 28.10.2026). */
  triggerLabel?: string;
}

// The Must Eats explainer: 3 steps around a demo card that flips like the
// on-site reveal. It opens only from the "how does it work?" trigger this
// component renders inline — never by itself (Ersan, 31.10.2026). SSR renders
// only the trigger, so there is no portal on the server.
export default function MustEatsOnboarding({
  initialMapData,
  tone = 'paper',
  starterMustEatId,
  triggerLabel,
}: Props) {
  const { lang, t } = useTranslation();
  const { open: openLogin } = useLoginModal();
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

  const close = useCallback(() => {
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
  const [showTapCue, setShowTapCue] = useState(false);
  const flipTimer = useRef<number | null>(null);

  const clearFlipTimer = () => {
    if (flipTimer.current === null) return;
    window.clearTimeout(flipTimer.current);
    flipTimer.current = null;
  };

  useEffect(() => {
    setShowTapCue(false);
    if (!open || step !== 1) {
      setShowBack(false);
      return;
    }
    setShowBack(true);
    flipTimer.current = window.setTimeout(() => {
      setShowTapCue(true);
      flipTimer.current = window.setTimeout(() => {
        flipTimer.current = null;
        setShowTapCue(false);
        setShowBack(false);
      }, CARD_TAP_CUE_MS);
    }, STEP2_FLIP_DELAY_MS);
    return clearFlipTimer;
  }, [open, step]);

  // Tapping the card is the mechanic itself, so on slide 2 the demo card is
  // the control rather than a picture of one — watching an animation teaches
  // less than doing the thing once. A tap also cancels the pending auto-flip,
  // which would otherwise fight the visitor for the card's state.
  const handleFlipTap = () => {
    clearFlipTimer();
    setShowTapCue(false);
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
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
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
  const de = lang === 'de';

  const flipper = (
    <div
      data-testid="onb-flipper"
      className={showBack ? `${tour.flipper} ${tour.flipped}` : tour.flipper}
    >
      {/* 242 px breit — am Retina-Bildschirm dieselbe 720er, die das Raster
          darunter schon geladen hat, statt eines zweiten Originals. Eigener
          `key` je Motiv: sonst schreibt React das vorhandene <img> um, und
          Safari laedt dabei zwei Varianten (siehe ProfileAlbum.tsx). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={demo?.image ?? 'back'}
        className={tour.face}
        sizes="242px"
        srcSet={mustEatCardSrcSet(demo?.image)}
        src={mustEatCardSrc(demo?.image, 360) ?? CARD_BACK}
        alt={demo?.dish ?? ''}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={`${tour.face} ${tour.back}`} src={CARD_BACK} alt="" aria-hidden="true" />
    </div>
  );

  const copy = (kicker: string, title: string, body: string) => (
    <>
      <p className={`et-label ${tour.kicker}`}>{t(kicker)}</p>
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
        className={
          tone === 'ink'
            ? `et-btn et-btn-text ${styles.how} ${styles.howInk}`
            : tone === 'sheet'
              ? `et-btn et-btn-text et-btn-sm ${styles.howSheet}`
              : tone === 'plain'
                ? `et-btn et-btn-text ${styles.how} ${styles.howPlain}`
                : `et-btn et-btn-text ${styles.how}`
        }
        onClick={reopen}
      >
        {triggerLabel ?? t('mustEats.howItWorks')}
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
              data-must-eats-onboarding=""
              role="dialog"
              aria-modal="true"
              aria-label={t('mustEats.howItWorks')}
            >
              <header className={tour.header}>
                <span>{t('mustEats.howItWorks')}</span>
                <button type="button" className={`et-btn et-btn-text et-btn-sm ${tour.quiet}`} onClick={close}>
                  {last ? t('mustEats.onbClose') : de ? 'Überspringen' : 'Skip'}
                </button>
              </header>

              <div className={tour.content}>
                <div className={tour.art}>
                  {/* Prepare WebGL while the earlier slides are visible. */}
                      <div
                        data-testid="onb-starter-pack"
                        data-guest-only=""
                        className={tour.packPreview}
                        style={last ? undefined : { opacity: 0, pointerEvents: 'none' }}
                        aria-hidden={!last}
                        role="img"
                        aria-label="Eat This Starter Pack"
                      >
                        <StarterPack3D fit />
                      </div>
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

                    </>
                  ) : (
                    <div className={tour.cardBox}>
                      {step === 1 ? (
                        <button
                          type="button"
                          className={tour.flipTap}
                          data-tapping={showTapCue ? '' : undefined}
                          onClick={handleFlipTap}
                          aria-label={t('mustEats.onbFlipAria')}
                        >
                          {flipper}
                          {showTapCue && <CardTapCue />}
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
                  role="group"
                  aria-label={de ? `Schritt ${step + 1} von 3` : `Step ${step + 1} of 3`}
                >
                  <div className={tour.segments} aria-hidden="true">
                    {SLIDES.map((s, i) => (
                      <span key={s.title} className={i === step ? tour.active : undefined} />
                    ))}
                  </div>
                </div>
                {/* Der gelbe Knopf steht auf jeder Seite an derselben Stelle.
                    Am Ende nimmt die zweite Aktion den Platz von Zurück ein. */}
                {!last ? (
                  <div className={tour.actions}>
                    <button
                      type="button"
                      className={`et-btn et-btn-text et-btn-sm ${tour.quiet}`}
                      disabled={step === 0}
                      onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    >
                      {de ? 'Zurück' : 'Back'}
                    </button>
                    <button
                      type="button"
                      className={`et-btn ${tour.action}`}
                      onClick={() => setStep((s) => Math.min(s + 1, SLIDES.length - 1))}
                    >
                      {t('mustEats.onbNext')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={tour.actions} data-testid="onb-actions-auth" data-auth-only="">
                      <a className={`et-btn et-btn-text et-btn-sm ${tour.quiet}`} href={packsHref} onClick={close}>
                        {t('mustEats.onbPacksCta')}
                      </a>
                      <button type="button" className={`et-btn ${tour.action}`} onClick={close}>
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
                      <button type="button" className={`et-btn et-btn-text et-btn-sm ${tour.quiet}`} onClick={close}>
                        {t('mustEats.onbStart')}
                      </button>
                      {/* Öffnet das Anmelde-Fenster direkt (Starter-Modus), statt
                          erst zur Startseite zu springen. */}
                      <button
                        type="button"
                        className={`et-btn ${tour.action}`}
                        onClick={() => {
                          close();
                          if (starterMustEatId) {
                            openLogin({ kind: 'card', mustEatId: starterMustEatId });
                          } else {
                            openLogin();
                          }
                        }}
                      >
                        {t('mustEats.onbStarterCta')}
                      </button>
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
