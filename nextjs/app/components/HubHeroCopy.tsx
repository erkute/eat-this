'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';
import { BRAND_LOGO_SRC } from '@/lib/constants';

interface Props {
  locale: 'de' | 'en';
}

type Variant = 'guest' | 'auth';

// The one-line explainer a first-time visitor needs: what this is, which city,
// and the Must-Eat hook.
// Zwei Sätze statt Gedankenstrich: gestapelt fiel der Strich auf den Anfang
// der zweiten Zeile und stand dort wie ein Spiegelstrich.
const LEAD = {
  de: 'Die besten Spots und unsere passenden Must Eats auf einer Map.',
  en: "The best spots and our matching Must Eats on one map.",
} as const;

// Die Wortmarke steht im Aufmacher, nicht im Header: der Header hält seinen
// Logoplatz frei, bis sie beim Scrollen dort ankommt (HeroMarkFlight). Die
// Maße sind die des Assets, damit der Platz vor dem Laden reserviert ist.
const MARK = { src: BRAND_LOGO_SRC, width: 1660, height: 667 } as const;

/* Nur der Name, kein Verb. Der Knopf daneben heißt „Dein Profil" — auch ein
   Nomen —, und ein Linkziel zu benennen ist die bessere Beschriftung, als eine
   Handlung anzukündigen, die aus dem Kontext ohnehin klar ist. Nebenbei ist der
   Ankertext damit exakt der Begriff, für den /map ranken soll.

   In beiden Sprachen identisch: „Berlin Food Map" ist ein Eigenname, kein
   übersetzbarer Satz — deshalb eine Konstante statt dreier Ternaries an den
   drei Stellen, an denen der Hero sie rendert (Gast, geladen, FOUC-Variante). */
const HERO_MAP_LABEL = 'Berlin Food Map';

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

/** Der Lead Wort für Wort in eigenen Spans: beim Auftritt tippt er sich hin
 *  (lib/home/leadEntrance.ts). Die Leerzeichen bleiben echter Text
 *  dazwischen, damit die Zeile normal umbricht und vorgelesen wird. */
function LeadWords({ text }: { text: string }) {
  return text.split(' ').map((word, index) => (
    <span key={index}>
      {index > 0 ? ' ' : null}
      <span className={styles.heroLeadWord} data-lead-word="">
        {word}
      </span>
    </span>
  ));
}

interface HeroCopyProps extends Props {
  firstName: string | null;
  variant: Variant;
}

function HeroCopy({ firstName, locale, variant }: HeroCopyProps) {
  const signedIn = variant === 'auth';
  const de = locale === 'de';
  const headline = signedIn
    ? de
      ? ['Deine Map', 'wartet.']
      : ['Your map', 'is ready.']
    : ['We tell you', 'what to eat'];
  const headlineLabel = signedIn
    ? de
      ? 'Deine Map wartet.'
      : 'Your map is ready.'
    : 'We tell you what to eat';

  return (
    <>
      {/* Der Gruß bleibt, die Gästezeile nicht: „Was du essen solltest." sagte
          dasselbe wie die Headline darunter, und über der Wortmarke wurde die
          Spalte damit dreistöckig. */}
      {signedIn ? (
        <span className={`hv-kicker ${styles.heroKicker}`}>
          {firstName ? `Hey ${firstName}` : 'Hey'}
        </span>
      ) : null}
      <h1 className={styles.heroHeadline} aria-label={headlineLabel}>
        <span>{headline[0]}</span>
        <span>{headline[1]}</span>
      </h1>
      <p className={styles.heroLead} data-hero-lead="">
        <LeadWords text={signedIn ? LEAD_AUTH[locale] : LEAD[locale]} />
      </p>
      <div className={styles.heroActions} data-hero-actions="">
        <MapIntentLink href="/map" className="hv-btn" data-magnetic="">
          {HERO_MAP_LABEL}
        </MapIntentLink>
        {signedIn ? (
          <Link
            href="/profile"
            rel="nofollow"
            prefetch={false}
            className={`hv-btn ${styles.heroSecondaryBtn}`}
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
      <span className={`hv-kicker ${styles.heroKicker}`} data-auth-only="">
        Hey
      </span>
      <h1 className={styles.heroHeadline}>
        <span data-guest-only="">
          <span>We tell you</span>
          <span>what to eat</span>
        </span>
        <span data-auth-only="">
          <span>{de ? 'Deine Map' : 'Your map'}</span>
          <span>{de ? 'wartet.' : 'is ready.'}</span>
        </span>
      </h1>
      <p className={styles.heroLead} data-hero-lead="" data-guest-only="">
        <LeadWords text={LEAD[locale]} />
      </p>
      <p className={styles.heroLead} data-hero-lead="" data-auth-only="">
        <LeadWords text={LEAD_AUTH[locale]} />
      </p>
      <div className={styles.heroActions} data-hero-actions="">
        <span className={styles.heroActionVariant} data-guest-only="">
          <MapIntentLink href="/map" className="hv-btn" data-magnetic="">
            {HERO_MAP_LABEL}
          </MapIntentLink>
        </span>
        <span className={styles.heroActionVariant} data-auth-only="">
          <MapIntentLink href="/map" className="hv-btn" data-magnetic="">
            {HERO_MAP_LABEL}
          </MapIntentLink>
          <Link
            href="/profile"
            rel="nofollow"
            prefetch={false}
            className={`hv-btn ${styles.heroSecondaryBtn}`}
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
      <HeroMark />
      {loading ? (
        <LoadingHeroCopy locale={locale} />
      ) : (
        <HeroCopy locale={locale} variant={user ? 'auth' : 'guest'} firstName={firstName} />
      )}
    </div>
  );
}
