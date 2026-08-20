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
const LEAD = {
  de: 'Die besten Orte Berlins auf einer Map — und für ausgewählte Spots sagen wir dir gleich, was du bestellen musst.',
  en: "The best places in Berlin on one map — and at selected spots we'll tell you exactly what to order.",
} as const;

// Signed-in visitors get a line of their own rather than a gap where the
// explainer sits — the hero should have the same shape either way.
const LEAD_AUTH = {
  de: 'Deine freigeschalteten Spots und Must Eats warten auf der Map.',
  en: 'Your unlocked spots and Must Eats are waiting on the map.',
} as const;


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
    <div className={styles.heroCopy}>
      <span className={`hv-kicker ${styles.heroKicker}`}>
        {signedIn
          ? firstName
            ? `Hey ${firstName}`
            : 'Hey'
          : de
            ? 'Was du essen solltest.'
            : 'What you should eat.'}
      </span>
      <h1 className={styles.heroHeadline} aria-label={headlineLabel}>
        <span>{headline[0]}</span>
        <span>{headline[1]}</span>
      </h1>
      <p className={styles.heroLead}>{signedIn ? LEAD_AUTH[locale] : LEAD[locale]}</p>
      <div className={styles.heroActions}>
        <MapIntentLink href="/map" rel="nofollow" className="hv-btn">
          {de ? 'Map öffnen' : 'Open map'}
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
    </div>
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
    <div className={styles.heroCopy}>
      <span className={`hv-kicker ${styles.heroKicker}`}>
        <span data-guest-only="">{de ? 'Was du essen solltest.' : 'What you should eat.'}</span>
        <span data-auth-only="">Hey</span>
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
      <p className={styles.heroLead} data-guest-only="">
        {LEAD[locale]}
      </p>
      <p className={styles.heroLead} data-auth-only="">
        {LEAD_AUTH[locale]}
      </p>
      <div className={styles.heroActions}>
        <span className={styles.heroActionVariant} data-guest-only="">
          <MapIntentLink href="/map" rel="nofollow" className="hv-btn">
            {de ? 'Map öffnen' : 'Open map'}
          </MapIntentLink>
        </span>
        <span className={styles.heroActionVariant} data-auth-only="">
          <MapIntentLink href="/map" rel="nofollow" className="hv-btn">
            {de ? 'Map öffnen' : 'Open map'}
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
    </div>
  );
}

export default function HubHeroCopy({ locale }: Props) {
  const { user, loading } = useAuth();
  const firstName = user
    ? (user.displayName ?? '').trim().split(/\s+/)[0] ||
      (user.email ?? '').trim().split('@')[0] ||
      null
    : null;

  if (loading) {
    return <LoadingHeroCopy locale={locale} />;
  }

  return <HeroCopy locale={locale} variant={user ? 'auth' : 'guest'} firstName={firstName} />;
}
