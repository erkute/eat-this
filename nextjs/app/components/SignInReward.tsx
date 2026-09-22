'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { subscribeStarterPackGranted } from '@/lib/auth/signInArrival';
import { identityStepPrefill, saveIdentity } from '@/lib/auth/identityStep';
import type { AvatarChoice } from '@/lib/firebase/useUserProfile';
import { AVATAR_CHOICES, avatarSrc } from './avatarChoices';
import { authScreenActive, subscribeAuthScreen } from './AuthScreen';
import styles from './Tour.module.css';

/** Muss zur Laenge der Keyframes in SignInReward.module.css passen. */
const PACK_OPEN_MS = 1900;

const copy = {
  de: {
    label: 'Dein Einstieg in Eat This',
    welcome: 'Willkommen bei Eat This',
    skip: 'Überspringen',
    close: 'Schließen',
    back: 'Zurück',
    next: 'Weiter',
    step: 'Schritt',
    of: 'von',
    identity: {
      tag: 'Dein Profil',
      title: 'Wer bist du?',
      lead: 'Wähle deinen Charakter.',
      name: 'Dein Name',
      placeholder: 'Dein Name oder Spitzname',
      avatars: 'Charakter auswählen',
      saving: 'Speichert …',
      error: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
    },
    pack: {
      tag: 'Starter Pack',
      sealed: 'Öffne dein Starter Pack.',
      opened: 'Deine ersten Karten.',
      lead: '20 Must-Eat-Karten für deinen Start.',
      open: 'Öffnen',
      opening: 'Öffnet …',
      packAlt: 'Eat This Starter Pack',
      frontAlt: 'Eine offene Must-Eat-Karte',
      backAlt: 'Eine noch verdeckte Must-Eat-Karte',
      facts: [
        { value: '10 offen', label: 'Direkt entdecken' },
        { value: '10 verdeckt', label: 'Vor Ort aufdecken' },
      ],
    },
    slides: [
      {
        tag: 'Die Map',
        title: 'Die Berlin Food Map.',
        body: 'Die besten Restaurants, Cafés und Bars. Entdecke, was um dich herum ist – und filtere nach Kategorie, Preis oder „Jetzt geöffnet“.',
        hint: '',
        image: '/pics/home-phones/phone-map-ink-480.webp',
        alt: 'Die Eat-This-Map mit Berliner Spots',
      },
      {
        tag: 'Must Eats',
        title: 'Wissen, was du bestellst.',
        body: 'Must Eats sind unsere Tipps für konkrete Gerichte. Jede Karte zeigt dir, was du bei einem Spot probieren solltest.',
        hint: 'Offene Karten kannst du direkt ansehen. Verdeckte Karten entdeckst du am Spot.',
        image: '/pics/card-front.webp?v=3',
        alt: 'Eine Must-Eat-Sammelkarte',
      },
      {
        tag: 'Deine Sammlung',
        title: 'Hingehen. Aufdecken. Sammeln.',
        body: 'Besuche die Spots und decke vor Ort neue Karten auf. Jede aufgedeckte Karte landet in deinem Deck.',
        hint: 'In deinem Deck siehst du auch, wo du die noch verdeckten Karten findest.',
        image: '/pics/card-front-sabich.webp',
        alt: 'Eine aufgedeckte Must-Eat-Karte',
        flip: 'Karte umdrehen',
      },
    ],
    go: {
      tag: 'Los',
      title: 'Wohin zuerst?',
      deck: 'Deck',
      map: 'Map',
    },
  },
  en: {
    label: 'Your introduction to Eat This',
    welcome: 'Welcome to Eat This',
    skip: 'Skip',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    step: 'Step',
    of: 'of',
    identity: {
      tag: 'Your profile',
      title: 'Who are you?',
      lead: 'Pick your character.',
      name: 'Your name',
      placeholder: 'Your name or nickname',
      avatars: 'Choose a character',
      saving: 'Saving …',
      error: 'Something went wrong. Please try again.',
    },
    pack: {
      tag: 'Starter Pack',
      sealed: 'Open your Starter Pack.',
      opened: 'Your first cards.',
      lead: '20 Must Eat cards to get you started.',
      open: 'Open',
      opening: 'Opening …',
      packAlt: 'Eat This Starter Pack',
      frontAlt: 'A revealed Must Eat card',
      backAlt: 'A Must Eat card still face down',
      facts: [
        { value: '10 revealed', label: 'Ready to explore' },
        { value: '10 face down', label: 'Reveal them at the spot' },
      ],
    },
    slides: [
      {
        tag: 'The map',
        title: 'Find your next great spot.',
        body: 'The best restaurants, cafés and bars. Discover what’s around you – and filter by category, price or open now.',
        hint: '',
        image: '/pics/home-phones/phone-map-ink-480.webp',
        alt: 'The Eat This map with Berlin food spots',
      },
      {
        tag: 'Must Eats',
        title: 'Know what to order.',
        body: 'Must Eats are our picks for specific dishes. Each card shows you what to try at a spot.',
        hint: 'Open cards are ready to view. Discover covered cards at the spot.',
        image: '/pics/card-front.webp?v=3',
        alt: 'A Must Eat collectible card',
      },
      {
        tag: 'Your collection',
        title: 'Visit. Reveal. Collect.',
        body: 'Visit the spots and uncover new cards on location. Every card you reveal joins your deck.',
        hint: 'Your deck also shows you where to find the cards still waiting to be revealed.',
        image: '/pics/card-front-sabich.webp',
        alt: 'A revealed Must Eat card',
        flip: 'Flip the card',
      },
    ],
    go: {
      tag: 'Go',
      title: 'Where to first?',
      deck: 'Deck',
      map: 'Map',
    },
  },
} as const;

type PackPhase = 'sealed' | 'opening' | 'open';

/** Die Identitaetsseite, solange sie gebraucht wird. `preview` speichert
 *  nichts — nur fuer die lokale Design-Durchsicht. */
type Identity = {
  name: string;
  avatar: AvatarChoice;
  busy: boolean;
  error: boolean;
  preview?: boolean;
};

const IDENTITY_FORM = 'tour-identity';

/** Die Seiten der Tour — mit Namensseite vorn, wenn das Konto noch keinen
 *  Charakter hat. */
function pages(identity: Identity | null) {
  return identity
    ? (['identity', 'pack', 0, 1, 2, 'go'] as const)
    : (['pack', 0, 1, 2, 'go'] as const);
}

/** So lange liegt die Karte auf der Sammel-Seite verdeckt, bevor sie sich von
 *  selbst umdreht — wie in der Must-Eats-Erklaerung. */
const FLIP_DELAY_MS = 800;

const CARD_BACK = '/pics/card-back.webp?v=7';
/* Die verdeckten liegen unten, die offenen obenauf — man soll Gerichte sehen. */
const DECK_CARDS = [
  CARD_BACK,
  CARD_BACK,
  '/pics/card-front.webp?v=3',
  '/pics/card-front-sabich.webp',
] as const;

/**
 * Die Tour nach der ersten Pack-Vergabe — auf JEDEM Anmeldeweg, weil sie an
 * `/api/starter-pack` hängt und nicht an einer Seite (siehe signInArrival).
 * Wer gerade sein Pack bekommen hat, öffnet es zuerst; danach drei Seiten,
 * was man damit macht, und am Ende die zwei Orte, an denen es weitergeht.
 *
 * Alles passt ohne Scrollen in den Viewport: die Bildfläche ist der einzige
 * Teil, der schrumpft, Texte und Knöpfe behalten ihre Größe.
 */
export default function SignInReward() {
  const locale = useLocale();
  const t = copy[locale === 'en' ? 'en' : 'de'];
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pack, setPack] = useState<PackPhase>('sealed');
  /* Gesetzt, wenn das Konto noch keinen Charakter hat (Google — der
     Magic-Link fragt auf /welcome). Dann ist sie die erste Seite. */
  const [identity, setIdentity] = useState<Identity | null>(null);
  /* Die Sammel-Seite fuehrt das Aufdecken vor: verdeckt rein, nach kurzem
     Moment dreht sich die Karte. Antippen dreht sie selbst — und nimmt der
     Automatik die Karte ab. */
  const [cardDown, setCardDown] = useState(false);
  const flipTimer = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  /* Die Tour öffnet sich von selbst, es gibt keinen Auslöser, an den der
     Fokus zurück könnte — useDialogFocus fällt dann auf das zuvor fokussierte
     Element zurück. */
  const triggerRef = useRef<HTMLElement | null>(null);
  useDialogFocus(open, panelRef, triggerRef);

  useEffect(() => {
    let stopWaiting: (() => void) | undefined;
    let alive = true;
    const reveal = (prefill: { name: string; preview?: boolean } | null) => {
      if (!alive) return;
      setIdentity(
        prefill
          ? { name: prefill.name, avatar: 2, busy: false, error: false, preview: prefill.preview }
          : null
      );
      setStep(0);
      setPack('sealed');
      setOpen(true);
    };
    /* Erst wissen, ob gefragt werden muss, dann aufgehen — sonst schoebe
       sich die Seite nachtraeglich vor das Pack. Scheitert die Abfrage,
       bleibt es beim Google-Namen und die Tour laeuft ohne sie. */
    const show = () => {
      identityStepPrefill().then(reveal, () => reveal(null));
    };
    const unsubscribe = subscribeStarterPackGranted(() => {
      if (!authScreenActive()) return show();
      stopWaiting?.();
      stopWaiting = subscribeAuthScreen((active) => {
        if (active) return;
        stopWaiting?.();
        stopWaiting = undefined;
        show();
      });
    });
    if (process.env.NODE_ENV === 'development') {
      const preview = new URLSearchParams(window.location.search).get('preview');
      if (preview === 'welcome') reveal(null);
      if (preview === 'welcome-google') reveal({ name: 'Alex', preview: true });
    }
    return () => {
      alive = false;
      unsubscribe();
      stopWaiting?.();
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

  const flipping = open && pages(identity)[step] === 2;
  useEffect(() => {
    if (!flipping) {
      setCardDown(false);
      return;
    }
    setCardDown(true);
    flipTimer.current = window.setTimeout(() => {
      flipTimer.current = null;
      setCardDown(false);
    }, FLIP_DELAY_MS);
    return () => {
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
      flipTimer.current = null;
    };
  }, [flipping]);

  useEffect(() => {
    if (pack !== 'opening') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPack('open'), reduced ? 0 : PACK_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [pack]);

  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, step, pack === 'open']); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const steps = pages(identity);
  const page = steps[step];
  const last = step === steps.length - 1;
  const close = () => setOpen(false);

  let content: React.ReactNode;
  let primary: React.ReactNode = (
    <button type="button" className={styles.action} onClick={() => setStep(step + 1)}>
      {t.next}
    </button>
  );

  if (page === 'identity') {
    /* Die Seite gibt es nur mit `identity` (siehe `pages`). */
    if (!identity) return null;
    const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      const name = identity.name.trim();
      if (!name || identity.busy) return;
      if (identity.preview) return setStep(step + 1);
      setIdentity({ ...identity, busy: true, error: false });
      try {
        await saveIdentity(name, identity.avatar);
        setIdentity((current) => current && { ...current, busy: false });
        setStep((current) => current + 1);
      } catch {
        setIdentity((current) => current && { ...current, busy: false, error: true });
      }
    };
    content = (
      <form id={IDENTITY_FORM} className={styles.content} onSubmit={submit}>
        <div className={styles.art}>
          <div className={styles.avatars} role="radiogroup" aria-label={t.identity.avatars}>
            {AVATAR_CHOICES.map((choice) => {
              const checked = choice.id === identity.avatar;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  className={checked ? `${styles.avatar} ${styles.avatarActive}` : styles.avatar}
                  onClick={() => setIdentity({ ...identity, avatar: choice.id })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.avatarImg} src={avatarSrc(choice.id)} alt="" />
                  <span className={styles.avatarName}>{choice[locale === 'en' ? 'en' : 'de']}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.identity.tag}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t.identity.title}
          </h2>
          <p className={styles.body}>{t.identity.lead}</p>
          <label className={styles.nameLabel} htmlFor="tour-name">
            {t.identity.name}
          </label>
          <input
            id="tour-name"
            className={styles.nameInput}
            type="text"
            autoComplete="given-name"
            placeholder={t.identity.placeholder}
            value={identity.name}
            onChange={(event) => setIdentity({ ...identity, name: event.target.value })}
            required
            maxLength={40}
          />
          {identity.error && (
            <p className={styles.nameError} role="alert">
              {t.identity.error}
            </p>
          )}
        </div>
      </form>
    );
    primary = (
      <button
        type="submit"
        form={IDENTITY_FORM}
        className={styles.action}
        disabled={identity.busy || !identity.name.trim()}
      >
        {identity.busy ? t.identity.saving : t.next}
      </button>
    );
  } else if (page === 'pack') {
    const opened = pack === 'open';
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <div className={styles.packStage} data-phase={pack}>
            {/* Alle Bilder liegen schon vor dem Klick im DOM — die Animation
                wartet nie auf ein Bild. */}
            {/* eslint-disable @next/next/no-img-element */}
            <img
              className={`${styles.revealCard} ${styles.revealFront}`}
              src="/pics/card-front.webp?v=3"
              alt={opened ? t.pack.frontAlt : ''}
              aria-hidden={!opened}
            />
            <img
              className={`${styles.revealCard} ${styles.revealBack}`}
              src={CARD_BACK}
              alt={opened ? t.pack.backAlt : ''}
              aria-hidden={!opened}
            />
            {!opened && (
              <div className={styles.packWrapper}>
                <img
                  className={styles.packBody}
                  src="/pics/booster/booster_free.webp"
                  alt={t.pack.packAlt}
                />
                <img
                  className={styles.packSeal}
                  src="/pics/booster/booster_free.webp"
                  alt=""
                  aria-hidden="true"
                />
              </div>
            )}
            {/* eslint-enable @next/next/no-img-element */}
          </div>
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.pack.tag}</p>
          {/* Beide Zustaende liegen uebereinander in derselben Zelle — die
              Spalte ist von Anfang an so hoch wie der groessere. Sonst wuchs
              sie beim Oeffnen (zweizeilige Ueberschrift, zwei Zahlen), und
              der Text rutschte nach oben (Nutzer, 22.09.2026). */}
          <div className={styles.copyStack}>
            <div className={opened ? styles.copyHidden : undefined} aria-hidden={opened}>
              <h2 ref={opened ? undefined : titleRef} tabIndex={-1} className={styles.headline}>
                {t.pack.sealed}
              </h2>
              <p className={styles.body}>{t.pack.lead}</p>
            </div>
            <div className={opened ? undefined : styles.copyHidden} aria-hidden={!opened}>
              <h2 ref={opened ? titleRef : undefined} tabIndex={-1} className={styles.headline}>
                {t.pack.opened}
              </h2>
              <div className={styles.facts}>
                {t.pack.facts.map((fact) => (
                  <p key={fact.value}>
                    <strong>{fact.value}</strong>
                    <span>{fact.label}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    if (!opened) {
      primary = (
        <button
          type="button"
          className={styles.action}
          disabled={pack === 'opening'}
          onClick={() => setPack('opening')}
        >
          {pack === 'opening' ? t.pack.opening : t.pack.open}
        </button>
      );
    }
  } else if (page === 'go') {
    /* Zwei Haelften, jede ist selbst der Weg: links die Map, rechts das Deck.
       Kein Knopf darunter — das Bild ist die Affordanz. */
    content = (
      <div className={styles.goContent}>
        <div className={styles.goHead}>
          <p className={styles.kicker}>{t.go.tag}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t.go.title}
          </h2>
        </div>
        <div className={styles.halves}>
          <Link href="/map" className={styles.half} onClick={close}>
            <span className={styles.halfArt}>
              <span className={styles.phone}>
                <Image
                  src="/pics/home-phones/phone-map-ink-480.webp"
                  alt=""
                  fill
                  sizes="(max-width: 600px) 30vw, 220px"
                  loading="eager"
                  className={styles.image}
                />
              </span>
            </span>
            <span className={styles.halfLabel}>{t.go.map}</span>
          </Link>
          <Link href="/profile" className={styles.half} onClick={close}>
            <span className={styles.halfArt}>
              {/* Zwei offen, zwei verdeckt — so sieht ein Deck nach dem Pack aus. */}
              {/* eslint-disable @next/next/no-img-element */}
              {DECK_CARDS.map((src, index) => (
                <img key={index} className={styles.deckCard} src={src} alt="" />
              ))}
              {/* eslint-enable @next/next/no-img-element */}
            </span>
            <span className={styles.halfLabel}>{t.go.deck}</span>
          </Link>
        </div>
      </div>
    );
  } else {
    const slide = t.slides[page];
    const flipTap = () => {
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
      flipTimer.current = null;
      setCardDown((down) => !down);
    };
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          {'flip' in slide ? (
            <div className={styles.cardBox}>
              <button
                type="button"
                className={styles.flipTap}
                onClick={flipTap}
                aria-label={slide.flip}
              >
                <div
                  data-testid="tour-flipper"
                  className={cardDown ? `${styles.flipper} ${styles.flipped}` : styles.flipper}
                >
                  {/* eslint-disable @next/next/no-img-element */}
                  <img className={styles.face} src={slide.image} alt={slide.alt} />
                  <img
                    className={`${styles.face} ${styles.back}`}
                    src={CARD_BACK}
                    alt=""
                    aria-hidden="true"
                  />
                  {/* eslint-enable @next/next/no-img-element */}
                </div>
              </button>
            </div>
          ) : (
            <Image
              key={slide.image}
              src={slide.image}
              alt={slide.alt}
              fill
              sizes="(max-width: 600px) 220px, 480px"
              className={styles.image}
              priority
            />
          )}
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{slide.tag}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {slide.title}
          </h2>
          <p className={styles.body}>{slide.body}</p>
          {slide.hint && <p className={styles.hint}>{slide.hint}</p>}
        </div>
      </div>
    );
  }

  return createPortal(
    <div className={styles.layer}>
      <div
        ref={panelRef}
        className={page === 'go' ? `${styles.panel} ${styles.panelGo}` : styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.label}
        tabIndex={-1}
      >
        <header className={styles.header}>
          <span>{t.welcome}</span>
          <button type="button" className={styles.quiet} onClick={close}>
            {last ? t.close : t.skip}
          </button>
        </header>
        {content}
        {page === 'go' ? (
          /* Am Ende keine Leiste mehr — die zwei Felder sind der Abschluss.
             Nur der Weg zurück bleibt, mittig und leise. */
          <footer className={`${styles.footer} ${styles.footerGo}`}>
            <button type="button" className={styles.quiet} onClick={() => setStep(step - 1)}>
              {t.back}
            </button>
          </footer>
        ) : (
          <footer className={styles.footer}>
            <div
              className={styles.progress}
              aria-label={`${t.step} ${step + 1} ${t.of} ${steps.length}`}
            >
              <span>
                {step + 1} / {steps.length}
              </span>
              <div className={styles.segments} aria-hidden="true">
                {steps.map((item, index) => (
                  <span key={item} className={index <= step ? styles.active : undefined} />
                ))}
              </div>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.quiet}
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                {t.back}
              </button>
              {primary}
            </div>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
