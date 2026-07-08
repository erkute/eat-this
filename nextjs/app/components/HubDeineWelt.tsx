'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { normalizeName } from '@/lib/normalizeName';
import MapIntentLink from './MapIntentLink';
import styles from './HubDeineWelt.module.css';

interface Props {
  spotOfDay?: {
    image?: string | null;
    name: string;
    slug: string;
  } | null;
}

export default function HubDeineWelt({ spotOfDay }: Props) {
  const locale = useLocale();
  const de = locale === 'de';
  const { user, loading } = useAuth();
  const [authHint, setAuthHint] = useState<{ n?: string } | null>(null);
  useEffect(() => {
    try {
      const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null') as {
        n?: string;
      } | null;
      if (hint?.n) setAuthHint({ n: hint.n });
    } catch {}
  }, []);

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHint?.n ?? null;
  const greeting = firstName ? `Hey ${firstName}` : 'Hey';

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null;

  return (
    <section
      className={`homeV2 ${styles.hero}`}
      data-hub-deinewelt=""
      data-auth-only=""
      aria-label={de ? 'Deine Welt' : 'Your world'}
    >
      <div className={`hv-wrap ${styles.heroInner}`}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{greeting}</p>
          <h2 className={styles.headline}>{de ? 'Deine Map wartet.' : 'Your map is ready.'}</h2>
          <p className={styles.sub}>
            {de
              ? 'Direkt zu empfohlenen Spots um dich herum und empfohlenen Must Eats.'
              : 'Jump into recommended spots around you and recommended Must Eats.'}
          </p>

          <div className={styles.actions} aria-label={de ? 'Schnellzugriffe' : 'Quick actions'}>
            <MapIntentLink href="/map" rel="nofollow" className={`hv-btn ${styles.mapBtn}`}>
              {de ? 'Map öffnen' : 'Open map'}
            </MapIntentLink>
            <Link
              href="/profile"
              rel="nofollow"
              prefetch={false}
              className={`hv-link-underline ${styles.profileBtn}`}
            >
              <span>{de ? 'Profil' : 'Profile'}</span>
            </Link>
          </div>
        </div>

        {spotOfDay && (
          <MapIntentLink
            href={`/map?r=${spotOfDay.slug}`}
            rel="nofollow"
            className={styles.spotLink}
            aria-label={`${normalizeName(spotOfDay.name)} — ${de ? 'Spot des Tages' : 'Spot of the day'}`}
          >
            {spotOfDay.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.spotImg} src={spotOfDay.image} alt="" draggable={false} />
            )}
            <span className={styles.spotTag}>
              <span>{de ? 'Spot des Tages' : 'Spot of the day'}</span>
              <strong>{normalizeName(spotOfDay.name)}</strong>
            </span>
          </MapIntentLink>
        )}
      </div>
    </section>
  );
}
