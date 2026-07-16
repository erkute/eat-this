'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';

interface Props {
  locale: 'de' | 'en';
}

type Variant = 'guest' | 'auth';

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
      <div className={styles.heroActions}>
        <MapIntentLink href="/map" rel="nofollow" className="hv-btn">
          {de ? 'Map öffnen' : 'Open map'}
        </MapIntentLink>
        {signedIn ? (
          <Link
            href="/profile"
            rel="nofollow"
            prefetch={false}
            className={`hv-link-underline ${styles.heroNearbyLink}`}
          >
            {de ? 'Profil' : 'Profile'}
          </Link>
        ) : (
          <MapIntentLink
            href="/map"
            rel="nofollow"
            className={`hv-link-underline ${styles.heroNearbyLink}`}
          >
            {de ? 'Was ist um mich?' : "What's near me"}
          </MapIntentLink>
        )}
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
      <div className={styles.heroActions}>
        <span className={styles.heroActionVariant} data-guest-only="">
          <MapIntentLink href="/map" rel="nofollow" className="hv-btn">
            {de ? 'Map öffnen' : 'Open map'}
          </MapIntentLink>
          <MapIntentLink
            href="/map"
            rel="nofollow"
            className={`hv-link-underline ${styles.heroNearbyLink}`}
          >
            {de ? 'Was ist um mich?' : "What's near me"}
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
            className={`hv-link-underline ${styles.heroNearbyLink}`}
          >
            {de ? 'Profil' : 'Profile'}
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
