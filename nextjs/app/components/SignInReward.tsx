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
const PACK_OPEN_MS = 3600;

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
      opened: 'Deine ersten 20 Karten.',
      lead: '20 Must-Eat-Karten für deinen Start.',
      explain:
        'Auf jeder Karte steht ein Gericht. Die offenen siehst du schon in deinem Deck. Die verdeckten deckst du erst am Spot auf.',
      openStack: '10 offen',
      coveredStack: '10 verdeckt',
      open: 'Öffnen',
      opening: 'Öffnet …',
      packAlt: 'Eat This Starter Pack',
    },
    reveal: {
      tag: 'Am Spot',
      title: 'Antippen. Aufdecken.',
      body: 'Bist du am Spot, tippst du die verdeckte Karte an. Dann weißt du, was du bestellen musst, und die Karte landet in deinem Deck.',
      flip: 'Karte umdrehen',
      alt: 'Eine aufgedeckte Must-Eat-Karte',
    },
    map: {
      tag: 'Die Map',
      title: 'Die Berlin Food Map.',
      body: 'Die besten Restaurants, Cafés und Bars. Entdecke, was um dich herum ist – und filtere nach Kategorie, Preis oder „Jetzt geöffnet“.',
      image: '/pics/home-phones/phone-map-ink-480.webp',
      alt: 'Die Eat-This-Map mit Berliner Spots',
    },
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
      opened: 'Your first 20 cards.',
      lead: '20 Must Eat cards to get you started.',
      explain:
        'Every card is a dish. The open ones are already in your deck. You reveal the covered ones at the spot.',
      openStack: '10 open',
      coveredStack: '10 covered',
      open: 'Open',
      opening: 'Opening …',
      packAlt: 'Eat This Starter Pack',
    },
    reveal: {
      tag: 'At the spot',
      title: 'Tap. Reveal.',
      body: 'At the spot, tap the covered card. Now you know what to order, and the card joins your deck.',
      flip: 'Flip the card',
      alt: 'A revealed Must Eat card',
    },
    map: {
      tag: 'The map',
      title: 'Find your next great spot.',
      body: 'The best restaurants, cafés and bars. Discover what’s around you – and filter by category, price or open now.',
      image: '/pics/home-phones/phone-map-ink-480.webp',
      alt: 'The Eat This map with Berlin food spots',
    },
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
    ? (['identity', 'pack', 'cards', 'reveal', 'map', 'go'] as const)
    : (['pack', 'cards', 'reveal', 'map', 'go'] as const);
}

const CARD_BACK = '/pics/card-back.webp?v=7';
const CARD_FRONT = '/pics/card-front.webp?v=3';

/** Das Kartenbild eines Must Eats — die Bild-Route, die auch Deck und Map
 *  benutzen; 440 ist die Sprosse fuer eine Karte bis 220 px bei 2x. */
/** So lange liegt die Karte auf dem Aufdeck-Schritt verdeckt, bevor sie sich
 *  von selbst umdreht — wie in der Must-Eats-Erklaerung. */
const FLIP_DELAY_MS = 800;

const mustEatCard = (id: string) =>
  `/api/must-eat-image/${encodeURIComponent(id)}?w=440&auto=format&q=80`;

/* Die 20 Karten des Starter Packs, in der Reihenfolge, in der sie aus dem Pack
   kommen: abwechselnd auf den offenen (links) und den verdeckten Stapel
   (rechts), damit beide gleichzeitig wachsen. `level` ist die Hoehe im Stapel,
   `tilt` ein kleiner Versatz, damit der Stapel nach Karten aussieht. */
const TILTS = [-1.5, 0.8, -0.4, 1.2, -1, 0.3, 1.5, -0.7, 0.6, -1.2];
/* Jede Karte schiesst oben aus dem Pack und aus dem Bild — jede etwas anders
   gekippt — und kommt kurz darauf von einer anderen Seite zurueck auf ihren
   Stapel. Die Rueckkehr-Richtungen sind im goldenen Winkel verteilt: links,
   rechts, oben, unten, schraeg, nie zweimal gleich. */
const PACK_CARDS = Array.from({ length: 20 }, (_, order) => {
  const covered = order % 2 === 1;
  const level = Math.floor(order / 2);
  const angle = (order * 137.5 * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    order,
    covered,
    level,
    tilt: TILTS[level] ?? 0,
    outX: ((order * 7) % 11) * 6 - 30,
    outSpin: (order % 2 ? 1 : -1) * (20 + ((order * 13) % 50)),
    inX: round(Math.cos(angle)),
    inY: round(Math.sin(angle)),
    inSpin: (order % 3 === 0 ? 1 : -1) * (90 + ((order * 29) % 120)),
  };
});
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
 * Wer gerade sein Pack bekommen hat, öffnet es zuerst und sieht, was drin
 * ist; dann die Map, zu der die Karten fuehren, und am Ende die zwei Orte,
 * an denen es weitergeht. Bis 22.09.2026 kamen danach noch „Must Eats" und
 * „Hingehen. Aufdecken. Sammeln." — beide sagten, was der Stapel-Schritt
 * schon gesagt hatte (Nutzer, 22.09.2026).
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
  /* Die offenen Karten des Packs, wie /api/starter-pack sie gezogen hat —
     dieselben zehn, die danach im Deck offen liegen. */
  const [faceUpIds, setFaceUpIds] = useState<string[]>([]);
  /* Welche davon schon geladen sind. Die Bild-Route rechnet ein Bild beim
     ersten Mal (lokal um 1 s) — eine Karte, deren Bild noch fehlt, flog
     unsichtbar mit. Bis ihr Bild da ist, steht die Beispielkarte. */
  const [loadedFaces, setLoadedFaces] = useState<ReadonlySet<string>>(new Set());
  /* Der Aufdeck-Schritt fuehrt vor, was am Spot passiert: verdeckt rein,
     nach kurzem Moment dreht sich die Karte. Antippen dreht sie selbst —
     und nimmt der Automatik die Karte ab. */
  const [cardDown, setCardDown] = useState(false);
  const flipTimer = useRef<number | null>(null);
  const flipping = open && pages(identity)[step] === 'reveal';
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
    const reveal = (prefill: { name: string; preview?: boolean } | null, cards: string[] = []) => {
      if (!alive) return;
      setFaceUpIds(cards);
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
    const show = (cards: string[]) => {
      identityStepPrefill().then(
        (prefill) => reveal(prefill, cards),
        () => reveal(null, cards)
      );
    };
    const unsubscribe = subscribeStarterPackGranted((cards) => {
      if (!authScreenActive()) return show(cards);
      stopWaiting?.();
      stopWaiting = subscribeAuthScreen((active) => {
        if (active) return;
        stopWaiting?.();
        stopWaiting = undefined;
        show(cards);
      });
    });
    if (process.env.NODE_ENV === 'development') {
      const query = new URLSearchParams(window.location.search);
      const preview = query.get('preview');
      /* Ohne Konto zieht niemand ein Pack — die Vorschau legt deshalb die
         oeffentlichen Must Eats hinein (reihum, bis zehn Plaetze voll sind),
         sonst laege zehnmal dieselbe Beispielkarte offen. `&cards=<id>,<id>`
         gibt die Karten stattdessen vor. */
      const previewCards = async () => {
        const given = query.get('cards')?.split(',').filter(Boolean);
        if (given?.length) return given;
        const data = (await fetch('/api/map-data').then((res) => res.json())) as {
          revealedMustEatIds?: string[];
        };
        const ids = data.revealedMustEatIds ?? [];
        return ids.length ? Array.from({ length: 10 }, (_, i) => ids[i % ids.length]!) : [];
      };
      if (preview === 'welcome' || preview === 'welcome-google') {
        const prefill = preview === 'welcome-google' ? { name: 'Alex', preview: true } : null;
        previewCards().then(
          (cards) => reveal(prefill, cards),
          () => reveal(prefill)
        );
      }
    }
    return () => {
      alive = false;
      unsubscribe();
      stopWaiting?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadedFaces(new Set());
    for (const id of faceUpIds) {
      const image = new window.Image();
      image.onload = () => {
        if (alive) setLoadedFaces((done) => new Set(done).add(id));
      };
      image.src = mustEatCard(id);
    }
    return () => {
      alive = false;
    };
  }, [faceUpIds]);

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
    if (pack !== 'opening') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPack('open'), reduced ? 0 : PACK_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [pack]);

  useEffect(() => {
    if (open) titleRef.current?.focus({ preventScroll: true });
  }, [open, step]);

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
  } else if (page === 'pack' || page === 'cards') {
    /* Zwei Schritte auf einer Buehne: erst oeffnen (der Text bleibt, bis
       jemand weiterklickt), dann erklaeren, was die zwei Stapel sind. Die
       Buehne bleibt dabei stehen, nur die Stapel bekommen ihre Namen. */
    const explaining = page === 'cards';
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <div
            className={styles.packStage}
            data-phase={pack}
            data-labelled={explaining ? '' : undefined}
          >
            {/* Alle Bilder liegen schon vor dem Klick im DOM — die Animation
                wartet nie auf ein Bild. */}
            {/* eslint-disable @next/next/no-img-element */}
            {PACK_CARDS.map((card) => (
              <img
                key={card.order}
                className={styles.revealCard}
                src={
                  card.covered
                    ? CARD_BACK
                    : loadedFaces.has(faceUpIds[card.level] ?? '')
                      ? mustEatCard(faceUpIds[card.level]!)
                      : CARD_FRONT
                }
                alt=""
                aria-hidden="true"
                style={
                  {
                    '--side': card.covered ? 1 : -1,
                    '--order': card.order,
                    '--level': card.level,
                    '--tilt': `${card.tilt}deg`,
                    '--out-x': `${card.outX}cqw`,
                    '--out-spin': `${card.outSpin}deg`,
                    '--in-x': card.inX,
                    '--in-y': card.inY,
                    '--in-spin': `${card.inSpin}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
            {pack !== 'open' && (
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
            <p className={styles.stackLabel} data-side="open" aria-hidden={!explaining}>
              {t.pack.openStack}
            </p>
            <p className={styles.stackLabel} data-side="covered" aria-hidden={!explaining}>
              {t.pack.coveredStack}
            </p>
          </div>
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.pack.tag}</p>
          {/* Beide Texte liegen uebereinander in derselben Zelle — die Spalte
              ist auf beiden Schritten gleich hoch, und die Buehne darueber
              wird beim Weiterklicken nicht kleiner (Nutzer, 22.09.2026). */}
          <div className={styles.copyStack}>
            <div className={explaining ? styles.copyHidden : undefined} aria-hidden={explaining}>
              <h2 ref={explaining ? undefined : titleRef} tabIndex={-1} className={styles.headline}>
                {t.pack.sealed}
              </h2>
              <p className={styles.body}>{t.pack.lead}</p>
            </div>
            <div className={explaining ? undefined : styles.copyHidden} aria-hidden={!explaining}>
              <h2 ref={explaining ? titleRef : undefined} tabIndex={-1} className={styles.headline}>
                {t.pack.opened}
              </h2>
              <p className={styles.body}>{t.pack.explain}</p>
            </div>
          </div>
        </div>
      </div>
    );
    if (page === 'pack' && pack !== 'open') {
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
  } else if (page === 'reveal') {
    /* Vorne liegt eine der eigenen offenen Karten, sobald ihr Bild da ist —
       sonst die Beispielkarte. */
    const shown = faceUpIds.find((id) => loadedFaces.has(id));
    const flipTap = () => {
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
      flipTimer.current = null;
      setCardDown((down) => !down);
    };
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <div className={styles.cardBox}>
            <button
              type="button"
              className={styles.flipTap}
              onClick={flipTap}
              aria-label={t.reveal.flip}
            >
              <div
                data-testid="tour-flipper"
                className={cardDown ? `${styles.flipper} ${styles.flipped}` : styles.flipper}
              >
                {/* eslint-disable @next/next/no-img-element */}
                <img
                  className={styles.face}
                  src={shown ? mustEatCard(shown) : '/pics/card-front-sabich.webp'}
                  alt={t.reveal.alt}
                />
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
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.reveal.tag}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t.reveal.title}
          </h2>
          <p className={styles.body}>{t.reveal.body}</p>
        </div>
      </div>
    );
  } else {
    const slide = t.map;
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <Image
            src={slide.image}
            alt={slide.alt}
            fill
            sizes="(max-width: 600px) 220px, 480px"
            className={styles.image}
            priority
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{slide.tag}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {slide.title}
          </h2>
          <p className={styles.body}>{slide.body}</p>
        </div>
      </div>
    );
  }

  return createPortal(
    <div className={styles.layer}>
      <div
        ref={panelRef}
        className={page === 'go' ? `${styles.panel} ${styles.panelGo}` : styles.panel}
        data-flying={pack === 'opening' ? '' : undefined}
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
