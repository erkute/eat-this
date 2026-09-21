'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { OPEN_ONBOARDING_EVENT } from '@/lib/onboarding';
import { subscribeStarterPackGranted } from '@/lib/auth/signInArrival';
import { authScreenActive, subscribeAuthScreen } from './AuthScreen';
import styles from './SignInReward.module.css';

const copy = {
  de: {
    label: 'Dein Einstieg in Eat This', welcome: 'Willkommen bei Eat This',
    intro: 'So geht’s', skip: 'Überspringen', back: 'Zurück', next: 'Weiter',
    finish: 'Los geht’s', map: 'Zur Map', step: 'Schritt', of: 'von',
    reward: 'Dein Starter Pack ist da: 10 Karten offen, 10 weitere zum Aufdecken vor Ort.',
    replay: 'Du findest diese Einführung jederzeit im Menü unter „So geht’s“.',
    slides: [
      { tag: 'Die Map', title: 'Die Berlin Food Map.',
        body: 'Die besten Restaurants, Cafés und Bars. Entdecke, was um dich herum ist – und filtere nach Kategorie, Preis oder „Jetzt geöffnet“.',
        hint: '',
        image: '/pics/home-phones/phone-map-ink-480.webp', alt: 'Die Eat-This-Map mit Berliner Spots' },
      { tag: 'Must Eats', title: 'Wissen, was du bestellst.',
        body: 'Must Eats sind unsere Tipps für konkrete Gerichte. Jede Karte zeigt dir, was du bei einem Spot probieren solltest.',
        hint: 'Offene Karten kannst du direkt ansehen. Verdeckte Karten entdeckst du am Spot.',
        image: '/pics/card-front.webp?v=3', alt: 'Eine Must-Eat-Sammelkarte' },
      { tag: 'Deine Sammlung', title: 'Hingehen. Aufdecken. Sammeln.',
        body: 'Besuche die Spots und decke vor Ort neue Karten auf. Jede aufgedeckte Karte landet in deinem Deck.',
        hint: 'In deinem Deck siehst du auch, wo du die noch verdeckten Karten findest.',
        image: '/pics/booster/booster_free.webp', alt: 'Das kostenlose Starter Pack mit 20 Must Eats' },
      { tag: 'Dein Profil', title: 'Alles Gute bleibt bei dir.',
        body: 'Tippe bei einem Spot auf das Herz, um ihn zu speichern. Im Profil findest du deine gespeicherten Spots und dein Deck.',
        hint: 'Noch keine Idee? Frag Remy auf der Startseite nach einem passenden Food-Tipp.',
        image: '/pics/avatar/2.webp?v=4', alt: 'Deine Spielerfigur bei Eat This' },
    ],
  },
  en: {
    label: 'Your introduction to Eat This', welcome: 'Welcome to Eat This',
    intro: 'How it works', skip: 'Skip', back: 'Back', next: 'Next',
    finish: "Let’s go", map: 'Open map', step: 'Step', of: 'of',
    reward: 'Your Starter Pack is here: 10 cards revealed, 10 more to uncover at the spots.',
    replay: 'You can find this introduction in the menu under “How it works”.',
    slides: [
      { tag: 'The map', title: 'Find your next great spot.',
        body: 'The best restaurants, cafés and bars. Discover what’s around you – and filter by category, price or open now.',
        hint: '',
        image: '/pics/home-phones/phone-map-ink-480.webp', alt: 'The Eat This map with Berlin food spots' },
      { tag: 'Must Eats', title: 'Know what to order.',
        body: 'Must Eats are our picks for specific dishes. Each card shows you what to try at a spot.',
        hint: 'Open cards are ready to view. Discover covered cards at the spot.',
        image: '/pics/card-front.webp?v=3', alt: 'A Must Eat collectible card' },
      { tag: 'Your collection', title: 'Visit. Reveal. Collect.',
        body: 'Visit the spots and uncover new cards on location. Every card you reveal joins your deck.',
        hint: 'Your deck also shows you where to find the cards still waiting to be revealed.',
        image: '/pics/booster/booster_free.webp', alt: 'The free Starter Pack with 20 Must Eats' },
      { tag: 'Your profile', title: 'Keep the good stuff.',
        body: 'Tap the heart on a spot to save it. Your profile holds your saved spots and your deck.',
        hint: 'Need an idea? Ask Remy on the home page for a food recommendation.',
        image: '/pics/avatar/2.webp?v=4', alt: 'Your Eat This player avatar' },
    ],
  },
} as const;

/** The first pack grant starts the tour once per account, on every sign-in path.
 * Returning users can reopen it explicitly from the menu. */
export default function SignInReward() {
  const locale = useLocale();
  const t = copy[locale === 'en' ? 'en' : 'de'];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [welcome, setWelcome] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  useDialogFocus(open, panelRef, triggerRef);

  useEffect(() => {
    let stopWaiting: (() => void) | undefined;
    const show = (isWelcome: boolean) => {
      setStep(0);
      setWelcome(isWelcome);
      setOpen(true);
    };
    const unsubscribe = subscribeStarterPackGranted(() => {
      if (!authScreenActive()) return show(true);
      stopWaiting?.();
      stopWaiting = subscribeAuthScreen((active) => {
        if (active) return;
        stopWaiting?.();
        stopWaiting = undefined;
        show(true);
      });
    });
    if (process.env.NODE_ENV === 'development' && new URLSearchParams(window.location.search).get('preview') === 'intro') show(false);
    const replay = () => show(false);
    window.addEventListener(OPEN_ONBOARDING_EVENT, replay);
    return () => {
      unsubscribe();
      stopWaiting?.();
      window.removeEventListener(OPEN_ONBOARDING_EVENT, replay);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  if (!open) return null;
  const slide = t.slides[step];
  const last = step === t.slides.length - 1;

  return createPortal(
    <div className={styles.layer}>
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={t.label} tabIndex={-1}>
        <header className={styles.header}>
          <span>{welcome ? t.welcome : t.intro}</span>
          <button type="button" className={styles.quiet} onClick={() => setOpen(false)}>{t.skip}</button>
        </header>
        <div className={styles.content}>
          <div className={styles.art}>
            <Image key={slide.image} src={slide.image} alt={slide.alt} fill sizes="(max-width: 600px) 220px, 300px" className={styles.image} priority />
          </div>
          <div className={styles.copy}>
            <p className={styles.kicker}>{slide.tag}</p>
            <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>{slide.title}</h2>
            <p className={styles.body}>{slide.body}</p>
            {slide.hint && <p className={styles.hint}>{slide.hint}</p>}
            <p className={styles.note}>{last ? t.replay : welcome && step === 0 ? t.reward : '\u00a0'}</p>
          </div>
        </div>
        <footer className={styles.footer}>
          <div className={styles.progress} aria-label={`${t.step} ${step + 1} ${t.of} ${t.slides.length}`}>
            <span>{step + 1} / {t.slides.length}</span>
            <div className={styles.segments} aria-hidden="true">
              {t.slides.map((item, index) => <span key={item.tag} className={index <= step ? styles.active : undefined} />)}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.quiet} disabled={step === 0} onClick={() => setStep(step - 1)}>{t.back}</button>
            {last ? <button type="button" className={styles.action} onClick={() => setOpen(false)}>{t.finish}</button> : <button type="button" className={styles.action} onClick={() => setStep(step + 1)}>{t.next}</button>}
          </div>
          {last && <Link className={styles.mapLink} href="/map" onClick={() => setOpen(false)}>{t.map}</Link>}
        </footer>
      </div>
    </div>, document.body
  );
}
