'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';

interface Props {
  locale: 'de' | 'en';
}

type Variant = 'guest' | 'auth';

// The one-line explainer a first-time visitor needs: what this is, which city,
// and the Must-Eat hook.
// Zwei Sätze statt Gedankenstrich: gestapelt fiel der Strich auf den Anfang
// der zweiten Zeile und stand dort wie ein Spiegelstrich.
const LEAD = {
  de: 'Entdecke Berlins beste Restaurants, Cafés und Bars, probiere ihre Must\u00a0Eats und sammle sie in deinem Deck.\nAlles auf einer Map.',
  en: "Discover Berlin’s best restaurants, cafés and bars, try their Must\u00a0Eats and collect them in your deck.\nAll on one map.",
} as const;

// Die Wortmarke steht im Aufmacher, nicht im Header: der Header hält seinen
// Logoplatz frei, bis sie beim Scrollen dort ankommt (HeroMarkFlight). Die
// Maße sind die des Assets, damit der Platz vor dem Laden reserviert ist.
const MARK = { src: '/pics/home/wordmark.webp?v=1', width: 1124, height: 274 } as const;

const HERO_MAP_LABEL = { de: 'Map entdecken', en: 'Explore the map' } as const;

function HeroMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.heroMark}
      data-hero-mark=""
      src={MARK.src}
      width={MARK.width}
      height={MARK.height}
      alt="Eat This"
      decoding="async"
      fetchPriority="high"
    />
  );
}

// Signed-in visitors get a line of their own rather than a gap where the
// explainer sits — the hero should have the same shape either way.
//
// Keine „freigeschalteten Spots" mehr (bis 06.09.2026): die Spots liegen für
// jeden frei, ein Konto hat ein Deck — und in dem liegen Karten, die man sich
// noch draußen holt. Derselbe Ton wie im Starter Pack: das Sofortige und die
// Jagd.
const LEAD_AUTH = {
  de: 'Alle Spots auf deiner Map — und deine gesammelten Must Eats in deinem Deck.',
  en: 'Every spot on your map — and the Must Eats you have collected in your deck.',
} as const;

/** Die beiden Sätze behalten ihren eigenen Umbruch. */
function LeadLines({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <span key={index} className={styles.heroLeadLine}>
      {index > 0 ? ' ' : null}{line}
    </span>
  ));
}

interface HeroCopyProps extends Props {
  firstName: string | null;
  variant: Variant;
}

/* Wortmarke und Claim gehören zur Marke und stehen für alle gleich. Wer
   angemeldet ist, bekommt den Gruß als eigene Zeile über dem Lead — nicht als
   Untertitel unter der Wortmarke und nicht als zweiter Claim (Ansage
   22.10.2026: „da ist es ein bisschen broke"). */
function HeroHeadline() {
  return (
    <h1 className={styles.heroHeadline} aria-label="We tell you what to eat">
      <span>We tell you</span>
      {' '}
      <span>what to eat</span>
    </h1>
  );
}

function HeroCopy({ firstName, locale, variant }: HeroCopyProps) {
  const signedIn = variant === 'auth';
  const de = locale === 'de';

  return (
    <>
      <HeroHeadline />
      {signedIn ? (
        <p className={styles.heroGreeting}>{firstName ? `Hey ${firstName}.` : 'Hey.'}</p>
      ) : null}
      <p className={signedIn ? `${styles.heroLead} ${styles.heroLeadAuth}` : styles.heroLead}>
        <LeadLines text={signedIn ? LEAD_AUTH[locale] : LEAD[locale]} />
      </p>
      <div className={styles.heroActions} data-hero-actions="">
        <MapIntentLink href="/map" className="et-btn">
          {HERO_MAP_LABEL[locale]}
        </MapIntentLink>
        {signedIn ? (
          <Link
            href="/profile"
            rel="nofollow"
            prefetch={false}
            className="et-btn"
          >
            {de ? 'Dein Profil' : 'Your profile'}
          </Link>
        ) : null}
      </div>
    </>
  );
}

/**
 * The server cannot know the Firebase user yet. Keep both pre-paint copy
 * variants for the auth-hint FOUC guard, but place them inside one semantic
 * hero. That preserves the signed-in shell without emitting two <h1>s for
 * crawlers and assistive technology.
 */
function LoadingHeroCopy({ locale }: Props) {
  const de = locale === 'de';

  return (
    <>
      <HeroHeadline />
      <p className={styles.heroGreeting} data-auth-only="">
        Hey.
      </p>
      <p className={styles.heroLead} data-guest-only="">
        <LeadLines text={LEAD[locale]} />
      </p>
      <p className={`${styles.heroLead} ${styles.heroLeadAuth}`} data-auth-only="">
        <LeadLines text={LEAD_AUTH[locale]} />
      </p>
      <div className={styles.heroActions} data-hero-actions="">
        <span className={styles.heroActionVariant} data-guest-only="">
          <MapIntentLink href="/map" className="et-btn">
            {HERO_MAP_LABEL[locale]}
          </MapIntentLink>
        </span>
        <span className={styles.heroActionVariant} data-auth-only="">
          <MapIntentLink href="/map" className="et-btn">
            {HERO_MAP_LABEL[locale]}
          </MapIntentLink>
          <Link
            href="/profile"
            rel="nofollow"
            prefetch={false}
            className="et-btn"
          >
            {de ? 'Dein Profil' : 'Your profile'}
          </Link>
        </span>
      </div>
    </>
  );
}

export default function HubHeroCopy({ locale }: Props) {
  const { user, loading } = useAuth();
  const firstName = user
    ? (user.displayName ?? '').trim().split(/\s+/)[0] ||
      (user.email ?? '').trim().split('@')[0] ||
      null
    : null;

  // Die Wortmarke steht ausserhalb des Wechsels: sobald `useAuth` fertig ist,
  // baut React Headline und Knöpfe neu, die Marke bleibt dasselbe Element.
  // Nur so kann ihr Auftritt beim Laden eine echte CSS-Animation auf dem
  // Element sein (Compositor) — ein neuer Knoten finge sie von vorn an.
  return (
    <div className={styles.heroCopy}>
      <div className={styles.heroBrand}><HeroMark /></div>
      <MapIntentLink href="/map" className={styles.heroArt} aria-label={locale === 'de' ? 'Berlin Food Map öffnen' : 'Open the Berlin food map'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/home/hero-must-eat.webp?v=3" width={470} height={646} alt="Hamachi Head — Must Eat Card" fetchPriority="high" decoding="async" />
      </MapIntentLink>
      {loading ? (
        <LoadingHeroCopy locale={locale} />
      ) : (
        <HeroCopy locale={locale} variant={user ? 'auth' : 'guest'} firstName={firstName} />
      )}
    </div>
  );
}
