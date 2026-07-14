'use client';

import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import MapIntentLink from './MapIntentLink';
import styles from './HubSection.module.css';

interface Props {
  locale: 'de' | 'en';
}

type Variant = 'guest' | 'auth';
type VisibilityGate = Variant | null;

interface HeroCopyProps extends Props {
  firstName: string | null;
  variant: Variant;
  visibilityGate?: VisibilityGate;
}

function HeroCopy({ firstName, locale, variant, visibilityGate = null }: HeroCopyProps) {
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
    <div
      className={styles.heroCopy}
      data-auth-only={visibilityGate === 'auth' ? '' : undefined}
      data-guest-only={visibilityGate === 'guest' ? '' : undefined}
    >
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

export default function HubHeroCopy({ locale }: Props) {
  const { user, loading } = useAuth();
  const firstName = user
    ? (user.displayName ?? '').trim().split(/\s+/)[0] ||
      (user.email ?? '').trim().split('@')[0] ||
      null
    : null;

  if (loading) {
    return (
      <>
        <HeroCopy locale={locale} variant="guest" firstName={null} visibilityGate="guest" />
        <HeroCopy locale={locale} variant="auth" firstName={null} visibilityGate="auth" />
      </>
    );
  }

  return <HeroCopy locale={locale} variant={user ? 'auth' : 'guest'} firstName={firstName} />;
}
